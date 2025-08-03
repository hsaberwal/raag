const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all recording sessions with filtering
router.get('/sessions', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            shabad_id, 
            status, 
            artist_id,
            location 
        } = req.query;
        
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE 1=1';
        let params = [];
        let paramCount = 0;
        
        if (shabad_id) {
            paramCount++;
            whereClause += ` AND rs.shabad_id = $${paramCount}`;
            params.push(shabad_id);
        }
        
        if (status) {
            paramCount++;
            whereClause += ` AND rs.approval_status = $${paramCount}`;
            params.push(status);
        }
        
        if (artist_id) {
            paramCount++;
            whereClause += ` AND (rs.primary_artist_id = $${paramCount} OR rs.recording_engineer_id = $${paramCount})`;
            params.push(artist_id);
            paramCount++; // Since we used the parameter twice
        }
        
        if (location) {
            paramCount++;
            whereClause += ` AND rs.location ILIKE $${paramCount}`;
            params.push(`%${location}%`);
        }
        
        const query = `
            SELECT 
                rs.*,
                s.title as shabad_title,
                r.name as raag_name,
                pa.name as primary_artist_name,
                re.name as recording_engineer_name,
                (SELECT COUNT(*) FROM track_files tf WHERE tf.session_id = rs.session_id) as track_count,
                (SELECT COUNT(*) FROM track_files tf WHERE tf.session_id = rs.session_id AND tf.approval_status = 'approved') as approved_tracks
            FROM recording_sessions rs
            LEFT JOIN shabads s ON rs.shabad_id = s.shabad_id
            LEFT JOIN raags r ON s.raag_id = r.raag_id
            LEFT JOIN artists pa ON rs.primary_artist_id = pa.artist_id
            LEFT JOIN artists re ON rs.recording_engineer_id = re.artist_id
            ${whereClause}
            ORDER BY rs.start_time DESC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;
        
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await db.query(query, params);
        
        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM recording_sessions rs
            LEFT JOIN shabads s ON rs.shabad_id = s.shabad_id
            ${whereClause}
        `;
        
        const countResult = await db.query(countQuery, params.slice(0, paramCount));
        const total = parseInt(countResult.rows[0].total);
        
        res.json({
            sessions: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('Error fetching recording sessions:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create new recording session
router.post('/sessions', async (req, res) => {
    try {
        const {
            session_id,
            shabad_id,
            start_time,
            end_time,
            location,
            primary_artist_id,
            recording_engineer_id,
            equipment_used,
            take_number = 1,
            file_format_quality,
            duration,
            notes
        } = req.body;
        
        const query = `
            INSERT INTO recording_sessions (
                session_id, shabad_id, start_time, end_time, location,
                primary_artist_id, recording_engineer_id, equipment_used,
                take_number, file_format_quality, duration, notes, approval_status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending')
            RETURNING *
        `;
        
        const result = await db.query(query, [
            session_id, shabad_id, start_time, end_time, location,
            primary_artist_id, recording_engineer_id, equipment_used,
            take_number, file_format_quality, duration, notes
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

// Get specific recording session with tracks
router.get('/sessions/:session_id', async (req, res) => {
    try {
        const { session_id } = req.params;
        
        // Get session details
        const sessionQuery = `
            SELECT 
                rs.*,
                s.title as shabad_title,
                s.author as shabad_author,
                r.name as raag_name,
                pa.name as primary_artist_name,
                pa.specialization as primary_artist_specialization,
                re.name as recording_engineer_name
            FROM recording_sessions rs
            LEFT JOIN shabads s ON rs.shabad_id = s.shabad_id
            LEFT JOIN raags r ON s.raag_id = r.raag_id
            LEFT JOIN artists pa ON rs.primary_artist_id = pa.artist_id
            LEFT JOIN artists re ON rs.recording_engineer_id = re.artist_id
            WHERE rs.session_id = $1
        `;
        
        const sessionResult = await db.query(sessionQuery, [session_id]);
        
        if (sessionResult.rows.length === 0) {
            return res.status(404).json({ error: 'Recording session not found' });
        }
        
        // Get track files for this session
        const tracksQuery = `
            SELECT 
                tf.*,
                p.name as performer_name,
                p.specialization as performer_specialization,
                i.name as instrument_name,
                i.category as instrument_category
            FROM track_files tf
            LEFT JOIN artists p ON tf.performer_id = p.artist_id
            LEFT JOIN instruments i ON tf.instrument_id = i.instrument_id
            WHERE tf.session_id = $1
            ORDER BY tf.created_at ASC
        `;
        
        const tracksResult = await db.query(tracksQuery, [session_id]);
        
        res.json({
            session: sessionResult.rows[0],
            tracks: tracksResult.rows
        });
        
    } catch (error) {
        console.error('Error fetching recording session:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update recording session
router.put('/sessions/:session_id', async (req, res) => {
    try {
        const { session_id } = req.params;
        const {
            end_time,
            equipment_used,
            file_format_quality,
            duration,
            approval_status,
            notes
        } = req.body;
        
        const query = `
            UPDATE recording_sessions
            SET end_time = $1, equipment_used = $2, file_format_quality = $3,
                duration = $4, approval_status = $5, notes = $6,
                updated_at = CURRENT_TIMESTAMP
            WHERE session_id = $7
            RETURNING *
        `;
        
        const result = await db.query(query, [
            end_time, equipment_used, file_format_quality,
            duration, approval_status, notes, session_id
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

// Add track file to recording session
router.post('/sessions/:session_id/tracks', async (req, res) => {
    try {
        const { session_id } = req.params;
        const {
            track_id,
            performer_id,
            instrument_id,
            mic_label,
            file_path,
            track_duration,
            channel_type,
            file_size,
            take_number = 1,
            notes,
            punch_in_points
        } = req.body;
        
        const query = `
            INSERT INTO track_files (
                track_id, session_id, performer_id, instrument_id, mic_label,
                file_path, track_duration, channel_type, file_size, take_number,
                notes, punch_in_points, approval_status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending')
            RETURNING *
        `;
        
        const result = await db.query(query, [
            track_id, session_id, performer_id, instrument_id, mic_label,
            file_path, track_duration, channel_type, file_size, take_number,
            notes, punch_in_points
        ]);
        
        res.status(201).json({
            success: true,
            track: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error adding track file:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all track files with filtering
router.get('/tracks', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            session_id, 
            performer_id, 
            instrument_id,
            approval_status,
            shabad_id 
        } = req.query;
        
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE 1=1';
        let params = [];
        let paramCount = 0;
        
        if (session_id) {
            paramCount++;
            whereClause += ` AND tf.session_id = $${paramCount}`;
            params.push(session_id);
        }
        
        if (performer_id) {
            paramCount++;
            whereClause += ` AND tf.performer_id = $${paramCount}`;
            params.push(performer_id);
        }
        
        if (instrument_id) {
            paramCount++;
            whereClause += ` AND tf.instrument_id = $${paramCount}`;
            params.push(instrument_id);
        }
        
        if (approval_status) {
            paramCount++;
            whereClause += ` AND tf.approval_status = $${paramCount}`;
            params.push(approval_status);
        }
        
        if (shabad_id) {
            paramCount++;
            whereClause += ` AND rs.shabad_id = $${paramCount}`;
            params.push(shabad_id);
        }
        
        const query = `
            SELECT 
                tf.*,
                rs.shabad_id,
                s.title as shabad_title,
                p.name as performer_name,
                p.specialization as performer_specialization,
                i.name as instrument_name,
                i.category as instrument_category
            FROM track_files tf
            LEFT JOIN recording_sessions rs ON tf.session_id = rs.session_id
            LEFT JOIN shabads s ON rs.shabad_id = s.shabad_id
            LEFT JOIN artists p ON tf.performer_id = p.artist_id
            LEFT JOIN instruments i ON tf.instrument_id = i.instrument_id
            ${whereClause}
            ORDER BY tf.created_at DESC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;
        
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await db.query(query, params);
        
        // Get total count
        const countQuery = `
            SELECT COUNT(*) as total
            FROM track_files tf
            LEFT JOIN recording_sessions rs ON tf.session_id = rs.session_id
            ${whereClause}
        `;
        
        const countResult = await db.query(countQuery, params.slice(0, paramCount));
        const total = parseInt(countResult.rows[0].total);
        
        res.json({
            tracks: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('Error fetching track files:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update track file
router.put('/tracks/:track_id', async (req, res) => {
    try {
        const { track_id } = req.params;
        const {
            mic_label,
            track_duration,
            channel_type,
            file_size,
            take_number,
            notes,
            approval_status,
            punch_in_points
        } = req.body;
        
        const query = `
            UPDATE track_files
            SET mic_label = $1, track_duration = $2, channel_type = $3,
                file_size = $4, take_number = $5, notes = $6,
                approval_status = $7, punch_in_points = $8,
                updated_at = CURRENT_TIMESTAMP
            WHERE track_id = $9
            RETURNING *
        `;
        
        const result = await db.query(query, [
            mic_label, track_duration, channel_type, file_size,
            take_number, notes, approval_status, punch_in_points, track_id
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Track file not found' });
        }
        
        res.json({
            success: true,
            track: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error updating track file:', error);
        res.status(500).json({ error: error.message });
    }
});

// Delete track file
router.delete('/tracks/:track_id', async (req, res) => {
    try {
        const { track_id } = req.params;
        
        const result = await db.query('DELETE FROM track_files WHERE track_id = $1 RETURNING *', [track_id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Track file not found' });
        }
        
        res.json({
            success: true,
            message: 'Track file deleted successfully'
        });
        
    } catch (error) {
        console.error('Error deleting track file:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get recording statistics
router.get('/stats', async (req, res) => {
    try {
        const query = `
            SELECT 
                COUNT(DISTINCT rs.session_id) as total_sessions,
                COUNT(DISTINCT CASE WHEN rs.approval_status = 'approved' THEN rs.session_id END) as approved_sessions,
                COUNT(DISTINCT rs.shabad_id) as shabads_recorded,
                COUNT(DISTINCT tf.track_id) as total_tracks,
                COUNT(DISTINCT CASE WHEN tf.approval_status = 'approved' THEN tf.track_id END) as approved_tracks,
                COUNT(DISTINCT rs.primary_artist_id) as unique_artists,
                SUM(EXTRACT(EPOCH FROM rs.duration))/3600 as total_hours_recorded,
                AVG(EXTRACT(EPOCH FROM rs.duration))/60 as avg_session_minutes
            FROM recording_sessions rs
            LEFT JOIN track_files tf ON rs.session_id = tf.session_id
        `;
        
        const result = await db.query(query);
        const stats = result.rows[0];
        
        // Get stats by instrument
        const instrumentQuery = `
            SELECT 
                i.name as instrument,
                i.category,
                COUNT(tf.track_id) as track_count,
                COUNT(CASE WHEN tf.approval_status = 'approved' THEN 1 END) as approved_count
            FROM track_files tf
            LEFT JOIN instruments i ON tf.instrument_id = i.instrument_id
            GROUP BY i.instrument_id, i.name, i.category
            ORDER BY track_count DESC
        `;
        
        const instrumentResult = await db.query(instrumentQuery);
        
        // Get stats by location
        const locationQuery = `
            SELECT 
                location,
                COUNT(*) as session_count,
                COUNT(CASE WHEN approval_status = 'approved' THEN 1 END) as approved_count
            FROM recording_sessions
            WHERE location IS NOT NULL
            GROUP BY location
            ORDER BY session_count DESC
        `;
        
        const locationResult = await db.query(locationQuery);
        
        res.json({
            overall: {
                ...stats,
                total_hours_recorded: parseFloat(stats.total_hours_recorded || 0).toFixed(2),
                avg_session_minutes: parseFloat(stats.avg_session_minutes || 0).toFixed(1)
            },
            by_instrument: instrumentResult.rows,
            by_location: locationResult.rows
        });
        
    } catch (error) {
        console.error('Error fetching recording statistics:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get pending approvals for tracks
router.get('/pending-approvals', async (req, res) => {
    try {
        const { type = 'tracks' } = req.query;
        
        let query;
        
        if (type === 'tracks') {
            query = `
                SELECT 
                    tf.*,
                    rs.shabad_id,
                    s.title as shabad_title,
                    p.name as performer_name,
                    i.name as instrument_name,
                    rs.start_time as session_start
                FROM track_files tf
                LEFT JOIN recording_sessions rs ON tf.session_id = rs.session_id
                LEFT JOIN shabads s ON rs.shabad_id = s.shabad_id
                LEFT JOIN artists p ON tf.performer_id = p.artist_id
                LEFT JOIN instruments i ON tf.instrument_id = i.instrument_id
                WHERE tf.approval_status = 'pending'
                ORDER BY tf.created_at ASC
            `;
        } else if (type === 'sessions') {
            query = `
                SELECT 
                    rs.*,
                    s.title as shabad_title,
                    pa.name as primary_artist_name
                FROM recording_sessions rs
                LEFT JOIN shabads s ON rs.shabad_id = s.shabad_id
                LEFT JOIN artists pa ON rs.primary_artist_id = pa.artist_id
                WHERE rs.approval_status = 'pending'
                ORDER BY rs.start_time ASC
            `;
        }
        
        const result = await db.query(query);
        
        res.json({
            pending_items: result.rows,
            count: result.rows.length
        });
        
    } catch (error) {
        console.error('Error fetching pending approvals:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;