const express = require('express');
const router = express.Router();
const db = require('../config/db');

// ==================== MIXING SESSIONS ====================

// Get all mixing sessions
router.get('/sessions', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            shabad_id, 
            engineer_id, 
            status 
        } = req.query;
        
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE 1=1';
        let params = [];
        let paramCount = 0;
        
        if (shabad_id) {
            paramCount++;
            whereClause += ` AND ms.shabad_id = $${paramCount}`;
            params.push(shabad_id);
        }
        
        if (engineer_id) {
            paramCount++;
            whereClause += ` AND ms.audio_engineer_id = $${paramCount}`;
            params.push(engineer_id);
        }
        
        if (status) {
            paramCount++;
            whereClause += ` AND ms.approval_status = $${paramCount}`;
            params.push(status);
        }
        
        const query = `
            SELECT 
                ms.*,
                s.title as shabad_title,
                r.name as raag_name,
                e.name as engineer_name,
                e.specialization as engineer_specialization
            FROM mixing_sessions ms
            LEFT JOIN shabads s ON ms.shabad_id = s.shabad_id
            LEFT JOIN raags r ON s.raag_id = r.raag_id
            LEFT JOIN artists e ON ms.audio_engineer_id = e.artist_id
            ${whereClause}
            ORDER BY ms.start_date DESC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;
        
        params.push(parseInt(limit), parseInt(offset));
        const result = await db.query(query, params);
        
        res.json({
            mixing_sessions: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: result.rows.length
            }
        });
        
    } catch (error) {
        console.error('Error fetching mixing sessions:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create new mixing session
router.post('/sessions', async (req, res) => {
    try {
        const {
            mix_id,
            shabad_id,
            audio_engineer_id,
            start_date,
            end_date,
            daw_project_path,
            mix_version,
            mixing_notes
        } = req.body;
        
        const query = `
            INSERT INTO mixing_sessions (
                mix_id, shabad_id, audio_engineer_id, start_date, end_date,
                daw_project_path, mix_version, mixing_notes, approval_status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending')
            RETURNING *
        `;
        
        const result = await db.query(query, [
            mix_id, shabad_id, audio_engineer_id, start_date, end_date,
            daw_project_path, mix_version, mixing_notes
        ]);
        
        res.status(201).json({
            success: true,
            mixing_session: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error creating mixing session:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update mixing session
router.put('/sessions/:mix_id', async (req, res) => {
    try {
        const { mix_id } = req.params;
        const {
            end_date,
            daw_project_path,
            mix_version,
            final_mix_path,
            mp3_preview_path,
            approval_status,
            mixing_notes
        } = req.body;
        
        const query = `
            UPDATE mixing_sessions
            SET end_date = $1, daw_project_path = $2, mix_version = $3,
                final_mix_path = $4, mp3_preview_path = $5, approval_status = $6,
                mixing_notes = $7, updated_at = CURRENT_TIMESTAMP
            WHERE mix_id = $8
            RETURNING *
        `;
        
        const result = await db.query(query, [
            end_date, daw_project_path, mix_version, final_mix_path,
            mp3_preview_path, approval_status, mixing_notes, mix_id
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Mixing session not found' });
        }
        
        res.json({
            success: true,
            mixing_session: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error updating mixing session:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== KATHA SESSIONS ====================

// Get all katha sessions
router.get('/katha', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            shabad_id, 
            speaker_id, 
            language,
            status 
        } = req.query;
        
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE 1=1';
        let params = [];
        let paramCount = 0;
        
        if (shabad_id) {
            paramCount++;
            whereClause += ` AND ks.shabad_id = $${paramCount}`;
            params.push(shabad_id);
        }
        
        if (speaker_id) {
            paramCount++;
            whereClause += ` AND ks.speaker_id = $${paramCount}`;
            params.push(speaker_id);
        }
        
        if (language) {
            paramCount++;
            whereClause += ` AND ks.language = $${paramCount}`;
            params.push(language);
        }
        
        if (status) {
            paramCount++;
            whereClause += ` AND ks.approval_status = $${paramCount}`;
            params.push(status);
        }
        
        const query = `
            SELECT 
                ks.*,
                s.title as shabad_title,
                speaker.name as speaker_name,
                translator.name as translator_name
            FROM katha_sessions ks
            LEFT JOIN shabads s ON ks.shabad_id = s.shabad_id
            LEFT JOIN artists speaker ON ks.speaker_id = speaker.artist_id
            LEFT JOIN artists translator ON ks.translator_id = translator.artist_id
            ${whereClause}
            ORDER BY ks.created_at DESC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;
        
        params.push(parseInt(limit), parseInt(offset));
        const result = await db.query(query, params);
        
        res.json({
            katha_sessions: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: result.rows.length
            }
        });
        
    } catch (error) {
        console.error('Error fetching katha sessions:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create new katha session
router.post('/katha', async (req, res) => {
    try {
        const {
            katha_id,
            shabad_id,
            speaker_id,
            language = 'Punjabi',
            duration,
            raw_audio_path,
            take_number = 1,
            translator_id,
            background_music = false,
            mic_used,
            script
        } = req.body;
        
        const query = `
            INSERT INTO katha_sessions (
                katha_id, shabad_id, speaker_id, language, duration,
                raw_audio_path, take_number, translator_id, background_music,
                mic_used, script, approval_status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending')
            RETURNING *
        `;
        
        const result = await db.query(query, [
            katha_id, shabad_id, speaker_id, language, duration,
            raw_audio_path, take_number, translator_id, background_music,
            mic_used, script
        ]);
        
        res.status(201).json({
            success: true,
            katha_session: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error creating katha session:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== STITCHING SESSIONS ====================

// Get all stitching sessions
router.get('/stitching', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            shabad_id, 
            editor_id,
            qc_flag 
        } = req.query;
        
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE 1=1';
        let params = [];
        let paramCount = 0;
        
        if (shabad_id) {
            paramCount++;
            whereClause += ` AND ss.shabad_id = $${paramCount}`;
            params.push(shabad_id);
        }
        
        if (editor_id) {
            paramCount++;
            whereClause += ` AND ss.editor_id = $${paramCount}`;
            params.push(editor_id);
        }
        
        if (qc_flag !== undefined) {
            paramCount++;
            whereClause += ` AND ss.qc_flag = $${paramCount}`;
            params.push(qc_flag === 'true');
        }
        
        const query = `
            SELECT 
                ss.*,
                s.title as shabad_title,
                e.name as editor_name,
                ks.duration as katha_duration
            FROM stitching_sessions ss
            LEFT JOIN shabads s ON ss.shabad_id = s.shabad_id
            LEFT JOIN artists e ON ss.editor_id = e.artist_id
            LEFT JOIN katha_sessions ks ON ss.katha_version_used = ks.katha_id
            ${whereClause}
            ORDER BY ss.created_at DESC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;
        
        params.push(parseInt(limit), parseInt(offset));
        const result = await db.query(query, params);
        
        res.json({
            stitching_sessions: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: result.rows.length
            }
        });
        
    } catch (error) {
        console.error('Error fetching stitching sessions:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create new stitching session
router.post('/stitching', async (req, res) => {
    try {
        const {
            stitch_id,
            shabad_id,
            editor_id,
            mix_version_used,
            katha_version_used,
            crossfade_duration,
            volume_notes,
            final_file_path,
            timestamp_marks,
            approval_signature
        } = req.body;
        
        const query = `
            INSERT INTO stitching_sessions (
                stitch_id, shabad_id, editor_id, mix_version_used, katha_version_used,
                crossfade_duration, volume_notes, final_file_path, timestamp_marks,
                approval_signature, qc_flag
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false)
            RETURNING *
        `;
        
        const result = await db.query(query, [
            stitch_id, shabad_id, editor_id, mix_version_used, katha_version_used,
            crossfade_duration, volume_notes, final_file_path, timestamp_marks,
            approval_signature
        ]);
        
        res.status(201).json({
            success: true,
            stitching_session: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error creating stitching session:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update stitching session QC status
router.put('/stitching/:stitch_id/qc', async (req, res) => {
    try {
        const { stitch_id } = req.params;
        const { qc_flag, approval_signature } = req.body;
        
        const query = `
            UPDATE stitching_sessions
            SET qc_flag = $1, approval_signature = $2, updated_at = CURRENT_TIMESTAMP
            WHERE stitch_id = $3
            RETURNING *
        `;
        
        const result = await db.query(query, [qc_flag, approval_signature, stitch_id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Stitching session not found' });
        }
        
        res.json({
            success: true,
            stitching_session: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error updating stitching QC:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== QC REPORTS ====================

// Get all QC reports
router.get('/qc', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            shabad_id, 
            qc_user_id,
            final_approval 
        } = req.query;
        
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE 1=1';
        let params = [];
        let paramCount = 0;
        
        if (shabad_id) {
            paramCount++;
            whereClause += ` AND qc.shabad_id = $${paramCount}`;
            params.push(shabad_id);
        }
        
        if (qc_user_id) {
            paramCount++;
            whereClause += ` AND qc.qc_user_id = $${paramCount}`;
            params.push(qc_user_id);
        }
        
        if (final_approval !== undefined) {
            paramCount++;
            whereClause += ` AND qc.final_approval = $${paramCount}`;
            params.push(final_approval === 'true');
        }
        
        const query = `
            SELECT 
                qc.*,
                s.title as shabad_title,
                u.name as qc_user_name
            FROM qc_reports qc
            LEFT JOIN shabads s ON qc.shabad_id = s.shabad_id
            LEFT JOIN artists u ON qc.qc_user_id = u.artist_id
            ${whereClause}
            ORDER BY qc.qc_date DESC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;
        
        params.push(parseInt(limit), parseInt(offset));
        const result = await db.query(query, params);
        
        res.json({
            qc_reports: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: result.rows.length
            }
        });
        
    } catch (error) {
        console.error('Error fetching QC reports:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create new QC report
router.post('/qc', async (req, res) => {
    try {
        const {
            qc_id,
            shabad_id,
            qc_user_id,
            audio_quality_rating,
            sync_accuracy,
            metadata_accuracy,
            defects_found,
            corrections_applied,
            re_qc_required = false,
            legal_clearance = false
        } = req.body;
        
        const query = `
            INSERT INTO qc_reports (
                qc_id, shabad_id, qc_user_id, audio_quality_rating,
                sync_accuracy, metadata_accuracy, defects_found, corrections_applied,
                re_qc_required, legal_clearance, final_approval
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, false)
            RETURNING *
        `;
        
        const result = await db.query(query, [
            qc_id, shabad_id, qc_user_id, audio_quality_rating,
            sync_accuracy, metadata_accuracy, defects_found, corrections_applied,
            re_qc_required, legal_clearance
        ]);
        
        res.status(201).json({
            success: true,
            qc_report: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error creating QC report:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update QC report final approval
router.put('/qc/:qc_id/approve', async (req, res) => {
    try {
        const { qc_id } = req.params;
        const { final_approval, approval_timestamp } = req.body;
        
        const query = `
            UPDATE qc_reports
            SET final_approval = $1, approval_timestamp = $2
            WHERE qc_id = $3
            RETURNING *
        `;
        
        const result = await db.query(query, [
            final_approval, 
            approval_timestamp || new Date().toISOString(), 
            qc_id
        ]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'QC report not found' });
        }
        
        res.json({
            success: true,
            qc_report: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error updating QC approval:', error);
        res.status(500).json({ error: error.message });
    }
});

// ==================== RELEASES ====================

// Get all releases
router.get('/releases', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 20, 
            shabad_id, 
            release_type,
            platform 
        } = req.query;
        
        const offset = (page - 1) * limit;
        let whereClause = 'WHERE 1=1';
        let params = [];
        let paramCount = 0;
        
        if (shabad_id) {
            paramCount++;
            whereClause += ` AND r.shabad_id = $${paramCount}`;
            params.push(shabad_id);
        }
        
        if (release_type) {
            paramCount++;
            whereClause += ` AND r.release_type = $${paramCount}`;
            params.push(release_type);
        }
        
        if (platform) {
            paramCount++;
            whereClause += ` AND $${paramCount} = ANY(r.platforms)`;
            params.push(platform);
        }
        
        const query = `
            SELECT 
                r.*,
                s.title as shabad_title,
                s.author as shabad_author
            FROM releases r
            LEFT JOIN shabads s ON r.shabad_id = s.shabad_id
            ${whereClause}
            ORDER BY r.live_datetime DESC
            LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}
        `;
        
        params.push(parseInt(limit), parseInt(offset));
        const result = await db.query(query, params);
        
        res.json({
            releases: result.rows,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total: result.rows.length
            }
        });
        
    } catch (error) {
        console.error('Error fetching releases:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create new release
router.post('/releases', async (req, res) => {
    try {
        const {
            release_id,
            shabad_id,
            live_datetime,
            platforms,
            release_type,
            geo_restrictions,
            download_options,
            license_type,
            archival_path
        } = req.body;
        
        const query = `
            INSERT INTO releases (
                release_id, shabad_id, live_datetime, platforms, release_type,
                geo_restrictions, download_options, license_type, archival_path
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;
        
        const result = await db.query(query, [
            release_id, shabad_id, live_datetime, platforms, release_type,
            geo_restrictions, download_options, license_type, archival_path
        ]);
        
        res.status(201).json({
            success: true,
            release: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error creating release:', error);
        res.status(500).json({ error: error.message });
    }
});

// Update release statistics
router.put('/releases/:release_id/stats', async (req, res) => {
    try {
        const { release_id } = req.params;
        const { first_24hr_stats } = req.body;
        
        const query = `
            UPDATE releases
            SET first_24hr_stats = $1, updated_at = CURRENT_TIMESTAMP
            WHERE release_id = $2
            RETURNING *
        `;
        
        const result = await db.query(query, [first_24hr_stats, release_id]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Release not found' });
        }
        
        res.json({
            success: true,
            release: result.rows[0]
        });
        
    } catch (error) {
        console.error('Error updating release stats:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;