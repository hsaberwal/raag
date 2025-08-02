const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all shabads with pagination and filtering
router.get('/', async (req, res) => {
    try {
        const { 
            page = 1, 
            limit = 50, 
            raagId, 
            guruAuthor, 
            angNumber,
            search 
        } = req.query;

        const offset = (page - 1) * limit;
        let whereClause = 'WHERE 1=1';
        let params = [];
        let paramCount = 0;

        if (raagId) {
            whereClause += ` AND s.raag_id = $${++paramCount}`;
            params.push(raagId);
        }

        if (guruAuthor) {
            whereClause += ` AND s.guru_author ILIKE $${++paramCount}`;
            params.push(`%${guruAuthor}%`);
        }

        if (angNumber) {
            whereClause += ` AND s.ang_number = $${++paramCount}`;
            params.push(angNumber);
        }

        if (search) {
            whereClause += ` AND (s.first_line ILIKE $${++paramCount} OR s.full_text ILIKE $${paramCount})`;
            params.push(`%${search}%`);
        }

        const query = `
            SELECT s.*, 
                   r.name as raag_name,
                   r.thaat,
                   (SELECT COUNT(*) FROM recording_sessions rs WHERE rs.shabad_id = s.id) as session_count,
                   (SELECT COUNT(*) FROM narrator_recordings nr WHERE nr.shabad_id = s.id) as narrator_recording_count,
                   (SELECT COUNT(*) FROM final_compositions fc WHERE fc.shabad_id = s.id AND fc.is_final_version = true) as completed_count
            FROM shabads s
            JOIN raags r ON s.raag_id = r.id
            ${whereClause}
            ORDER BY s.ang_number, s.shabad_number
            LIMIT $${++paramCount} OFFSET $${++paramCount}
        `;

        params.push(limit, offset);

        const countQuery = `
            SELECT COUNT(*) as total
            FROM shabads s
            JOIN raags r ON s.raag_id = r.id
            ${whereClause}
        `;

        const [shabadsResult, countResult] = await Promise.all([
            db.query(query, params),
            db.query(countQuery, params.slice(0, -2)) // Remove limit and offset for count
        ]);

        const totalCount = parseInt(countResult.rows[0].total);
        const totalPages = Math.ceil(totalCount / limit);

        res.json({
            success: true,
            shabads: shabadsResult.rows,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                totalCount,
                hasNextPage: page < totalPages,
                hasPreviousPage: page > 1
            }
        });
    } catch (error) {
        console.error('Error fetching shabads:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get a specific shabad by ID
router.get('/:shabadId', async (req, res) => {
    try {
        const { shabadId } = req.params;

        const query = `
            SELECT s.*, 
                   r.name as raag_name,
                   r.thaat,
                   r.description as raag_description
            FROM shabads s
            JOIN raags r ON s.raag_id = r.id
            WHERE s.id = $1
        `;

        const result = await db.query(query, [shabadId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Shabad not found' });
        }

        res.json({
            success: true,
            shabad: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching shabad:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create a new shabad
router.post('/', async (req, res) => {
    try {
        const {
            angNumber,
            shabadNumber,
            raagId,
            guruAuthor,
            firstLine,
            fullText,
            language = 'gurmukhi',
            translationEnglish,
            translationPunjabi
        } = req.body;

        const query = `
            INSERT INTO shabads 
            (ang_number, shabad_number, raag_id, guru_author, first_line, full_text, 
             language, translation_english, translation_punjabi)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;

        const result = await db.query(query, [
            angNumber, shabadNumber, raagId, guruAuthor, firstLine, fullText,
            language, translationEnglish, translationPunjabi
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

// Update a shabad
router.put('/:shabadId', async (req, res) => {
    try {
        const { shabadId } = req.params;
        const {
            angNumber,
            shabadNumber,
            raagId,
            guruAuthor,
            firstLine,
            fullText,
            language,
            translationEnglish,
            translationPunjabi
        } = req.body;

        const query = `
            UPDATE shabads 
            SET ang_number = $1, shabad_number = $2, raag_id = $3, guru_author = $4,
                first_line = $5, full_text = $6, language = $7, translation_english = $8,
                translation_punjabi = $9, updated_at = CURRENT_TIMESTAMP
            WHERE id = $10
            RETURNING *
        `;

        const result = await db.query(query, [
            angNumber, shabadNumber, raagId, guruAuthor, firstLine, fullText,
            language, translationEnglish, translationPunjabi, shabadId
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

// Get shabad progress (recording status)
router.get('/:shabadId/progress', async (req, res) => {
    try {
        const { shabadId } = req.params;

        const queries = [
            // Recording sessions
            `SELECT COUNT(*) as count, status FROM recording_sessions WHERE shabad_id = $1 GROUP BY status`,
            
            // Track counts by approval status
            `SELECT a.status, COUNT(*) as count
             FROM tracks t
             JOIN recording_sessions rs ON t.session_id = rs.id
             JOIN approvals a ON a.item_type = 'track' AND a.item_id = t.id
             WHERE rs.shabad_id = $1
             GROUP BY a.status`,
             
            // Narrator recordings
            `SELECT COUNT(*) as narrator_recordings FROM narrator_recordings WHERE shabad_id = $1`,
            
            // Mixed tracks
            `SELECT COUNT(*) as mixed_tracks 
             FROM mixed_tracks mt
             JOIN recording_sessions rs ON mt.session_id = rs.id
             WHERE rs.shabad_id = $1`,
             
            // Final compositions
            `SELECT COUNT(*) as final_compositions, 
                    COUNT(CASE WHEN is_final_version = true THEN 1 END) as completed_finals
             FROM final_compositions 
             WHERE shabad_id = $1`
        ];

        const results = await Promise.all(queries.map(query => db.query(query, [shabadId])));

        res.json({
            success: true,
            progress: {
                sessions: results[0].rows,
                trackApprovals: results[1].rows,
                narratorRecordings: parseInt(results[2].rows[0]?.narrator_recordings || 0),
                mixedTracks: parseInt(results[3].rows[0]?.mixed_tracks || 0),
                finalCompositions: parseInt(results[4].rows[0]?.final_compositions || 0),
                completedFinals: parseInt(results[4].rows[0]?.completed_finals || 0)
            }
        });
    } catch (error) {
        console.error('Error fetching shabad progress:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all raags
router.get('/raags/all', async (req, res) => {
    try {
        const query = `
            SELECT r.*, 
                   COUNT(s.id) as shabad_count
            FROM raags r
            LEFT JOIN shabads s ON r.id = s.raag_id
            GROUP BY r.id
            ORDER BY r.name
        `;

        const result = await db.query(query);

        res.json({
            success: true,
            raags: result.rows
        });
    } catch (error) {
        console.error('Error fetching raags:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get shabads by raag
router.get('/raag/:raagId', async (req, res) => {
    try {
        const { raagId } = req.params;

        const query = `
            SELECT s.*, 
                   r.name as raag_name,
                   (SELECT COUNT(*) FROM recording_sessions rs WHERE rs.shabad_id = s.id) as session_count
            FROM shabads s
            JOIN raags r ON s.raag_id = r.id
            WHERE s.raag_id = $1
            ORDER BY s.ang_number, s.shabad_number
        `;

        const result = await db.query(query, [raagId]);

        res.json({
            success: true,
            shabads: result.rows
        });
    } catch (error) {
        console.error('Error fetching shabads by raag:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;