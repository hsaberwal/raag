const express = require('express');
const router = express.Router();
const db = require('../config/db');
const s3Config = require('../config/s3');

// Create a new recording session
router.post('/sessions', async (req, res) => {
    try {
        const {
            shabadId,
            sessionName,
            studioLocation,
            sessionDate,
            sessionStartTime,
            notes,
            createdBy
        } = req.body;

        const query = `
            INSERT INTO recording_sessions 
            (shabad_id, session_name, studio_location, session_date, session_start_time, notes, created_by)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const result = await db.query(query, [
            shabadId, sessionName, studioLocation, sessionDate, 
            sessionStartTime, notes, createdBy
        ]);

        res.status(201).json({
            success: true,
            session: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating recording session:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all recording sessions for a shabad
router.get('/sessions/shabad/:shabadId', async (req, res) => {
    try {
        const { shabadId } = req.params;
        
        const query = `
            SELECT rs.*, 
                   s.first_line as shabad_first_line,
                   r.name as raag_name,
                   u.full_name as created_by_name,
                   COUNT(t.id) as track_count
            FROM recording_sessions rs
            JOIN shabads s ON rs.shabad_id = s.id
            JOIN raags r ON s.raag_id = r.id
            LEFT JOIN users u ON rs.created_by = u.id
            LEFT JOIN tracks t ON rs.id = t.session_id
            WHERE rs.shabad_id = $1
            GROUP BY rs.id, s.first_line, r.name, u.full_name
            ORDER BY rs.created_at DESC
        `;

        const result = await db.query(query, [shabadId]);

        res.json({
            success: true,
            sessions: result.rows
        });
    } catch (error) {
        console.error('Error fetching recording sessions:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get a specific recording session with all tracks
router.get('/sessions/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        
        // Get session details
        const sessionQuery = `
            SELECT rs.*, 
                   s.first_line as shabad_first_line,
                   s.ang_number,
                   r.name as raag_name,
                   u.full_name as created_by_name
            FROM recording_sessions rs
            JOIN shabads s ON rs.shabad_id = s.id
            JOIN raags r ON s.raag_id = r.id
            LEFT JOIN users u ON rs.created_by = u.id
            WHERE rs.id = $1
        `;

        // Get all tracks for this session
        const tracksQuery = `
            SELECT t.*, 
                   u.full_name as performer_name,
                   u.role as performer_role,
                   a.status as approval_status,
                   a.comments as approval_comments,
                   a.decision_date as approval_date,
                   approver.full_name as approver_name
            FROM tracks t
            JOIN users u ON t.performer_id = u.id
            LEFT JOIN approvals a ON a.item_type = 'track' AND a.item_id = t.id
            LEFT JOIN users approver ON a.approver_id = approver.id
            WHERE t.session_id = $1
            ORDER BY t.track_number
        `;

        const [sessionResult, tracksResult] = await Promise.all([
            db.query(sessionQuery, [sessionId]),
            db.query(tracksQuery, [sessionId])
        ]);

        if (sessionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Recording session not found' });
        }

        res.json({
            success: true,
            session: sessionResult.rows[0],
            tracks: tracksResult.rows
        });
    } catch (error) {
        console.error('Error fetching recording session:', error);
        res.status(500).json({ error: error.message });
    }
});

// Add a track to a recording session
router.post('/tracks', async (req, res) => {
    try {
        const {
            sessionId,
            trackNumber,
            trackName,
            performerId,
            instrument,
            trackType,
            s3Key,
            s3Bucket,
            fileSizeMb,
            durationSeconds,
            sampleRate,
            bitDepth,
            fileFormat,
            recordingQuality,
            technicalNotes
        } = req.body;

        const query = `
            INSERT INTO tracks 
            (session_id, track_number, track_name, performer_id, instrument, track_type,
             s3_key, s3_bucket, file_size_mb, duration_seconds, sample_rate, bit_depth,
             file_format, recording_quality, technical_notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
            RETURNING *
        `;

        const result = await db.query(query, [
            sessionId, trackNumber, trackName, performerId, instrument, trackType,
            s3Key, s3Bucket, fileSizeMb, durationSeconds, sampleRate, bitDepth,
            fileFormat, recordingQuality, technicalNotes
        ]);

        // Create initial approval record
        const approvalQuery = `
            INSERT INTO approvals (item_type, item_id, status)
            VALUES ('track', $1, 'pending')
        `;
        await db.query(approvalQuery, [result.rows[0].id]);

        // Notify via socket if available
        const io = req.app.get('io');
        if (io) {
            // Get shabad ID for the session
            const sessionQuery = `SELECT shabad_id FROM recording_sessions WHERE id = $1`;
            const sessionResult = await db.query(sessionQuery, [sessionId]);
            
            if (sessionResult.rows.length > 0) {
                io.to(`shabad_${sessionResult.rows[0].shabad_id}`).emit('new_track_uploaded', {
                    trackId: result.rows[0].id,
                    sessionId,
                    trackName,
                    performer: performerId
                });
            }
        }

        res.status(201).json({
            success: true,
            track: result.rows[0]
        });
    } catch (error) {
        console.error('Error adding track:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update track metadata
router.put('/tracks/:trackId', async (req, res) => {
    try {
        const { trackId } = req.params;
        const {
            trackName,
            instrument,
            trackType,
            recordingQuality,
            technicalNotes
        } = req.body;

        const query = `
            UPDATE tracks 
            SET track_name = $1, instrument = $2, track_type = $3, 
                recording_quality = $4, technical_notes = $5, updated_at = CURRENT_TIMESTAMP
            WHERE id = $6
            RETURNING *
        `;

        const result = await db.query(query, [
            trackName, instrument, trackType, recordingQuality, technicalNotes, trackId
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Track not found' });
        }

        res.json({
            success: true,
            track: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating track:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete a track
router.delete('/tracks/:trackId', async (req, res) => {
    try {
        const { trackId } = req.params;

        // Get track details first to delete from S3
        const trackQuery = `SELECT s3_key, s3_bucket FROM tracks WHERE id = $1`;
        const trackResult = await db.query(trackQuery, [trackId]);

        if (trackResult.rows.length === 0) {
            return res.status(404).json({ error: 'Track not found' });
        }

        const track = trackResult.rows[0];

        // Delete from S3
        if (track.s3_key) {
            await s3Config.deleteFromS3(track.s3_key);
        }

        // Delete approvals first (foreign key constraint)
        await db.query(`DELETE FROM approvals WHERE item_type = 'track' AND item_id = $1`, [trackId]);

        // Delete track from database
        await db.query(`DELETE FROM tracks WHERE id = $1`, [trackId]);

        res.json({
            success: true,
            message: 'Track deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting track:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update recording session
router.put('/sessions/:sessionId', async (req, res) => {
    try {
        const { sessionId } = req.params;
        const {
            sessionName,
            studioLocation,
            sessionDate,
            sessionStartTime,
            sessionEndTime,
            notes,
            status
        } = req.body;

        const query = `
            UPDATE recording_sessions 
            SET session_name = $1, studio_location = $2, session_date = $3,
                session_start_time = $4, session_end_time = $5, notes = $6,
                status = $7, updated_at = CURRENT_TIMESTAMP
            WHERE id = $8
            RETURNING *
        `;

        const result = await db.query(query, [
            sessionName, studioLocation, sessionDate, sessionStartTime,
            sessionEndTime, notes, status, sessionId
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Recording session not found' });
        }

        res.json({
            success: true,
            session: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating recording session:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all tracks pending approval
router.get('/tracks/pending-approval', async (req, res) => {
    try {
        const query = `
            SELECT t.*, 
                   rs.session_name,
                   s.first_line as shabad_first_line,
                   s.ang_number,
                   r.name as raag_name,
                   u.full_name as performer_name,
                   a.status as approval_status,
                   a.created_at as submitted_for_approval
            FROM tracks t
            JOIN recording_sessions rs ON t.session_id = rs.id
            JOIN shabads s ON rs.shabad_id = s.id
            JOIN raags r ON s.raag_id = r.id
            JOIN users u ON t.performer_id = u.id
            JOIN approvals a ON a.item_type = 'track' AND a.item_id = t.id
            WHERE a.status = 'pending'
            ORDER BY a.created_at ASC
        `;

        const result = await db.query(query);

        res.json({
            success: true,
            pendingTracks: result.rows
        });
    } catch (error) {
        console.error('Error fetching pending tracks:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get recording statistics
router.get('/statistics', async (req, res) => {
    try {
        const queries = [
            // Total sessions
            `SELECT COUNT(*) as total_sessions FROM recording_sessions`,
            
            // Total tracks
            `SELECT COUNT(*) as total_tracks FROM tracks`,
            
            // Tracks by status
            `SELECT a.status, COUNT(*) as count 
             FROM approvals a 
             WHERE a.item_type = 'track' 
             GROUP BY a.status`,
            
            // Sessions by status
            `SELECT status, COUNT(*) as count 
             FROM recording_sessions 
             GROUP BY status`,
             
            // Recent activity (last 7 days)
            `SELECT DATE(created_at) as date, COUNT(*) as tracks_recorded
             FROM tracks 
             WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
             GROUP BY DATE(created_at)
             ORDER BY date`
        ];

        const results = await Promise.all(queries.map(query => db.query(query)));

        res.json({
            success: true,
            statistics: {
                totalSessions: parseInt(results[0].rows[0].total_sessions),
                totalTracks: parseInt(results[1].rows[0].total_tracks),
                tracksByStatus: results[2].rows,
                sessionsByStatus: results[3].rows,
                recentActivity: results[4].rows
            }
        });
    } catch (error) {
        console.error('Error fetching statistics:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;