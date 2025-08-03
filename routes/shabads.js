const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all shabads with pagination and filtering
router.get('/', async (req, res) => {
    try {
        const { page = 1, limit = 20, raag, status, search } = req.query;
        const offset = (page - 1) * limit;
        
        let whereClause = 'WHERE 1=1';
        let params = [];
        let paramCount = 0;
        
        if (raag) {
            paramCount++;
            whereClause += ` AND r.name = $${paramCount}`;
            params.push(raag);
        }
        
        if (status) {
            paramCount++;
            whereClause += ` AND s.status_flag = $${paramCount}`;
            params.push(parseInt(status));
        }
        
        if (search) {
            paramCount++;
            whereClause += ` AND (s.title ILIKE $${paramCount} OR s.author ILIKE $${paramCount} OR s.verses ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }
        
        const query = `
            SELECT 
                s.shabad_id,
                s.title,
                s.author,
                s.page,
                s.status_flag,
                s.verses,
                s.translation,
                s.transliteration,
                s.created_at,
                s.updated_at,
                r.name as raag_name,
                r.thaat,
                r.time_of_day,
                r.mood,
                -- Recording progress stats
                (SELECT COUNT(*) FROM recording_sessions rs WHERE rs.shabad_id = s.shabad_id) as recording_sessions_count,
                (SELECT COUNT(*) FROM mixing_sessions ms WHERE ms.shabad_id = s.shabad_id) as mixing_sessions_count,
                (SELECT COUNT(*) FROM katha_sessions ks WHERE ks.shabad_id = s.shabad_id) as katha_sessions_count,
                (SELECT COUNT(*) FROM releases rel WHERE rel.shabad_id = s.shabad_id) as releases_count
            FROM shabads s
            LEFT JOIN raags r ON s.raag_id = r.raag_id
            ${whereClause}
            ORDER BY s.page ASC, s.created_at DESC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;
        
        params.push(parseInt(limit), parseInt(offset));
        
        const result = await db.query(query, params);
        
        // Get total count for pagination
        const countQuery = `
            SELECT COUNT(*) as total
            FROM shabads s
            LEFT JOIN raags r ON s.raag_id = r.raag_id
            ${whereClause}
        `;
        
        const countResult = await db.query(countQuery, params.slice(0, paramCount));
        const total = parseInt(countResult.rows[0].total);
        
        res.json({
            shabads: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
        
    } catch (error) {
        console.error('Error fetching shabads:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get specific shabad with complete details
router.get('/:shabad_id', async (req, res) => {
    try {
        const { shabad_id } = req.params;
        
        // Get shabad details
        const shabadQuery = `
            SELECT 
                s.*,
                r.name as raag_name,
                r.thaat,
                r.time_of_day,
                r.mood,
                r.notes as raag_notes
            FROM shabads s
            LEFT JOIN raags r ON s.raag_id = r.raag_id
            WHERE s.shabad_id = $1
        `;
        
        const shabadResult = await db.query(shabadQuery, [shabad_id]);
        
        if (shabadResult.rows.length === 0) {
            return res.status(404).json({ error: 'Shabad not found' });
        }
        
        const shabad = shabadResult.rows[0];
        
        // Get recording sessions
        const recordingQuery = `
            SELECT 
                rs.*,
                pa.name as primary_artist_name,
                re.name as recording_engineer_name,
                (SELECT COUNT(*) FROM track_files tf WHERE tf.session_id = rs.session_id) as track_count
            FROM recording_sessions rs
            LEFT JOIN artists pa ON rs.primary_artist_id = pa.artist_id
            LEFT JOIN artists re ON rs.recording_engineer_id = re.artist_id
            WHERE rs.shabad_id = $1
            ORDER BY rs.created_at DESC
        `;
        
        const recordingResult = await db.query(recordingQuery, [shabad_id]);
        
        // Get mixing sessions
        const mixingQuery = `
            SELECT 
                ms.*,
                a.name as engineer_name
            FROM mixing_sessions ms
            LEFT JOIN artists a ON ms.audio_engineer_id = a.artist_id
            WHERE ms.shabad_id = $1
            ORDER BY ms.created_at DESC
        `;
        
        const mixingResult = await db.query(mixingQuery, [shabad_id]);
        
        // Get katha sessions
        const kathaQuery = `
            SELECT 
                ks.*,
                s.name as speaker_name,
                t.name as translator_name
            FROM katha_sessions ks
            LEFT JOIN artists s ON ks.speaker_id = s.artist_id
            LEFT JOIN artists t ON ks.translator_id = t.artist_id
            WHERE ks.shabad_id = $1
            ORDER BY ks.created_at DESC
        `;
        
        const kathaResult = await db.query(kathaQuery, [shabad_id]);
        
        // Get releases
        const releaseQuery = `
            SELECT * FROM releases
            WHERE shabad_id = $1
            ORDER BY live_datetime DESC
        `;
        
        const releaseResult = await db.query(releaseQuery, [shabad_id]);
        
        res.json({
            shabad,
            recording_sessions: recordingResult.rows,
            mixing_sessions: mixingResult.rows,
            katha_sessions: kathaResult.rows,
            releases: releaseResult.rows
        });
        
    } catch (error) {
        console.error('Error fetching shabad details:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create new shabad
router.post('/', async (req, res) => {
    try {
        const {
            shabad_id,
            title,
            raag_id,
            author,
            page,
            verses,
            translation,
            transliteration
        } = req.body;
        
        const query = `
            INSERT INTO shabads (
                shabad_id, title, raag_id, author, page, 
                verses, translation, transliteration, status_flag
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 1)
            RETURNING *
        `;
        
        const result = await db.query(query, [
            shabad_id, title, raag_id, author, page,
            verses, translation, transliteration
        ]);
        
        res.status(201).json({
            success: true,
            shabad: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error creating shabad:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update shabad
router.put('/:shabad_id', async (req, res) => {
    try {
        const { shabad_id } = req.params;
        const {
            title,
            raag_id,
            author,
            page,
            status_flag,
            verses,
            translation,
            transliteration
        } = req.body;
        
        const query = `
            UPDATE shabads
            SET title = $1, raag_id = $2, author = $3, page = $4,
                status_flag = $5, verses = $6, translation = $7,
                transliteration = $8, updated_at = CURRENT_TIMESTAMP
            WHERE shabad_id = $9
            RETURNING *
        `;
        
        const result = await db.query(query, [
            title, raag_id, author, page, status_flag,
            verses, translation, transliteration, shabad_id
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Shabad not found' });
        }
        
        res.json({
            success: true,
            shabad: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error updating shabad:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get shabad progress/statistics
router.get('/:shabad_id/progress', async (req, res) => {
    try {
        const { shabad_id } = req.params;
        
        const query = `
            SELECT 
                s.shabad_id,
                s.title,
                s.status_flag,
                -- Recording progress
                COUNT(DISTINCT rs.session_id) as recording_sessions,
                COUNT(DISTINCT CASE WHEN rs.approval_status = 'approved' THEN rs.session_id END) as approved_recordings,
                COUNT(DISTINCT tf.track_id) as total_tracks,
                COUNT(DISTINCT CASE WHEN tf.approval_status = 'approved' THEN tf.track_id END) as approved_tracks,
                -- Mixing progress
                COUNT(DISTINCT ms.mix_id) as mixing_sessions,
                COUNT(DISTINCT CASE WHEN ms.approval_status = 'approved' THEN ms.mix_id END) as approved_mixes,
                -- Katha progress
                COUNT(DISTINCT ks.katha_id) as katha_sessions,
                COUNT(DISTINCT CASE WHEN ks.approval_status = 'approved' THEN ks.katha_id END) as approved_katha,
                -- Stitching progress
                COUNT(DISTINCT ss.stitch_id) as stitching_sessions,
                COUNT(DISTINCT CASE WHEN ss.qc_flag = true THEN ss.stitch_id END) as qc_passed_stitches,
                -- QC progress
                COUNT(DISTINCT qc.qc_id) as qc_reports,
                COUNT(DISTINCT CASE WHEN qc.final_approval = true THEN qc.qc_id END) as final_approvals,
                -- Release progress
                COUNT(DISTINCT rel.release_id) as releases,
                COUNT(DISTINCT up.upload_id) as uploads
            FROM shabads s
            LEFT JOIN recording_sessions rs ON s.shabad_id = rs.shabad_id
            LEFT JOIN track_files tf ON rs.session_id = tf.session_id
            LEFT JOIN mixing_sessions ms ON s.shabad_id = ms.shabad_id
            LEFT JOIN katha_sessions ks ON s.shabad_id = ks.shabad_id
            LEFT JOIN stitching_sessions ss ON s.shabad_id = ss.shabad_id
            LEFT JOIN qc_reports qc ON s.shabad_id = qc.shabad_id
            LEFT JOIN releases rel ON s.shabad_id = rel.shabad_id
            LEFT JOIN uploads up ON s.shabad_id = up.shabad_id
            WHERE s.shabad_id = $1
            GROUP BY s.shabad_id, s.title, s.status_flag
        `;
        
        const result = await db.query(query, [shabad_id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Shabad not found' });
        }
        
        const progress = result.rows[0];
        
        // Calculate completion percentages
        const completion = {
            recording: progress.total_tracks > 0 ? Math.round((progress.approved_tracks / progress.total_tracks) * 100) : 0,
            mixing: progress.mixing_sessions > 0 ? Math.round((progress.approved_mixes / progress.mixing_sessions) * 100) : 0,
            katha: progress.katha_sessions > 0 ? Math.round((progress.approved_katha / progress.katha_sessions) * 100) : 0,
            qc: progress.qc_reports > 0 ? Math.round((progress.final_approvals / progress.qc_reports) * 100) : 0,
            overall: 0
        };
        
        // Calculate overall completion based on status_flag
        switch (progress.status_flag) {
            case 1: completion.overall = 0; break;   // planned
            case 2: completion.overall = 20; break;  // recording
            case 3: completion.overall = 50; break;  // mixing
            case 4: completion.overall = 80; break;  // stitching
            case 5: completion.overall = 100; break; // complete
            default: completion.overall = 0;
        }
        
        res.json({
            ...progress,
            completion
        });
        
    } catch (error) {
        console.error('Error fetching shabad progress:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all raags
router.get('/meta/raags', async (req, res) => {
    try {
        const query = `
            SELECT 
                r.*,
                COUNT(s.shabad_id) as shabad_count
            FROM raags r
            LEFT JOIN shabads s ON r.raag_id = s.raag_id
            GROUP BY r.raag_id, r.name, r.thaat, r.time_of_day, r.mood, r.notes, r.created_at
            ORDER BY r.name
        `;
        
        const result = await db.query(query);
        
        res.json({
            raags: result.rows
        });
        
    } catch (error) {
        console.error('Error fetching raags:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all raags (legacy endpoint for frontend compatibility)
router.get('/raags/all', async (req, res) => {
    try {
        const query = `
            SELECT 
                r.raag_id,
                r.name,
                r.thaat,
                r.time_of_day,
                r.mood,
                r.notes,
                COUNT(s.shabad_id) as shabad_count
            FROM raags r
            LEFT JOIN shabads s ON r.raag_id = s.raag_id
            GROUP BY r.raag_id, r.name, r.thaat, r.time_of_day, r.mood, r.notes
            ORDER BY r.name ASC
        `;
        
        const result = await db.query(query);
        
        res.json({
            raags: result.rows,
            total: result.rows.length
        });
    } catch (error) {
        console.error('Error fetching all raags:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;