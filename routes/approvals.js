const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all pending approvals for an approver
router.get('/pending/:approverId', async (req, res) => {
    try {
        const { approverId } = req.params;
        
        const query = `
            SELECT a.*, 
                   CASE 
                       WHEN a.item_type = 'track' THEN 
                           (SELECT jsonb_build_object(
                               'id', t.id,
                               'track_name', t.track_name,
                               'performer_name', u.full_name,
                               'instrument', t.instrument,
                               'track_type', t.track_type,
                               'recording_quality', t.recording_quality,
                               'session_name', rs.session_name,
                               'shabad_first_line', s.first_line,
                               'raag_name', r.name,
                               's3_key', t.s3_key,
                               'duration_seconds', t.duration_seconds
                           )
                           FROM tracks t 
                           JOIN users u ON t.performer_id = u.id
                           JOIN recording_sessions rs ON t.session_id = rs.id
                           JOIN shabads s ON rs.shabad_id = s.id
                           JOIN raags r ON s.raag_id = r.id
                           WHERE t.id = a.item_id)
                       WHEN a.item_type = 'narrator_recording' THEN
                           (SELECT jsonb_build_object(
                               'id', nr.id,
                               'narrator_name', u.full_name,
                               'language', nr.language,
                               'recording_quality', nr.recording_quality,
                               'shabad_first_line', s.first_line,
                               'raag_name', r.name,
                               's3_key', nr.s3_key,
                               'duration_seconds', nr.duration_seconds,
                               'script_text', nr.script_text
                           )
                           FROM narrator_recordings nr
                           JOIN users u ON nr.narrator_id = u.id
                           JOIN shabads s ON nr.shabad_id = s.id
                           JOIN raags r ON s.raag_id = r.id
                           WHERE nr.id = a.item_id)
                       WHEN a.item_type = 'mixed_track' THEN
                           (SELECT jsonb_build_object(
                               'id', mt.id,
                               'mixer_name', u.full_name,
                               'mix_version', mt.mix_version,
                               'session_name', rs.session_name,
                               'shabad_first_line', s.first_line,
                               'raag_name', r.name,
                               's3_key', mt.s3_key,
                               'duration_seconds', mt.duration_seconds,
                               'mix_notes', mt.mix_notes
                           )
                           FROM mixed_tracks mt
                           JOIN users u ON mt.mixer_id = u.id
                           JOIN recording_sessions rs ON mt.session_id = rs.id
                           JOIN shabads s ON rs.shabad_id = s.id
                           JOIN raags r ON s.raag_id = r.id
                           WHERE mt.id = a.item_id)
                       WHEN a.item_type = 'final_mix' THEN
                           (SELECT jsonb_build_object(
                               'id', fc.id,
                               'final_mixer_name', u.full_name,
                               'version_number', fc.version_number,
                               'shabad_first_line', s.first_line,
                               'raag_name', r.name,
                               's3_key', fc.s3_key,
                               'duration_seconds', fc.duration_seconds,
                               'composition_notes', fc.composition_notes
                           )
                           FROM final_compositions fc
                           JOIN users u ON fc.final_mixer_id = u.id
                           JOIN shabads s ON fc.shabad_id = s.id
                           JOIN raags r ON s.raag_id = r.id
                           WHERE fc.id = a.item_id)
                   END as item_details
            FROM approvals a
            WHERE a.status = 'pending' 
            AND (a.approver_id = $1 OR a.approver_id IS NULL)
            ORDER BY a.created_at ASC
        `;

        const result = await db.query(query, [approverId]);

        res.json({
            success: true,
            pendingApprovals: result.rows
        });
    } catch (error) {
        console.error('Error fetching pending approvals:', error);
        res.status(500).json({ error: error.message });
    }
});

// Submit approval decision
router.post('/decision', async (req, res) => {
    try {
        const {
            approvalId,
            approverId,
            status, // 'approved', 'rejected', 'needs_revision'
            comments,
            revisionNotes
        } = req.body;

        if (!['approved', 'rejected', 'needs_revision'].includes(status)) {
            return res.status(400).json({ error: 'Invalid approval status' });
        }

        const query = `
            UPDATE approvals 
            SET approver_id = $1, status = $2, decision_date = CURRENT_TIMESTAMP,
                comments = $3, revision_notes = $4, updated_at = CURRENT_TIMESTAMP
            WHERE id = $5
            RETURNING *
        `;

        const result = await db.query(query, [
            approverId, status, comments, revisionNotes, approvalId
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Approval record not found' });
        }

        const approval = result.rows[0];

        // If approved and it's a track, create a mixed_track record for mixing stage
        if (status === 'approved' && approval.item_type === 'track') {
            // Get track details to create mixed track entry
            const trackQuery = `
                SELECT t.*, rs.shabad_id 
                FROM tracks t 
                JOIN recording_sessions rs ON t.session_id = rs.id 
                WHERE t.id = $1
            `;
            const trackResult = await db.query(trackQuery, [approval.item_id]);
            
            if (trackResult.rows.length > 0) {
                // Notify mixers that track is ready for mixing
                const io = req.app.get('io');
                if (io) {
                    io.to('mixer').emit('track_approved_for_mixing', {
                        trackId: approval.item_id,
                        sessionId: trackResult.rows[0].session_id,
                        shabadId: trackResult.rows[0].shabad_id
                    });
                }
            }
        }

        // Notify relevant parties via socket
        const io = req.app.get('io');
        if (io) {
            io.emit('approval_decision_made', {
                approvalId: approval.id,
                itemType: approval.item_type,
                itemId: approval.item_id,
                status: approval.status,
                approverId: approval.approver_id
            });
        }

        res.json({
            success: true,
            approval: approval
        });
    } catch (error) {
        console.error('Error submitting approval decision:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get approval history for an item
router.get('/history/:itemType/:itemId', async (req, res) => {
    try {
        const { itemType, itemId } = req.params;

        const query = `
            SELECT a.*, 
                   u.full_name as approver_name,
                   u.role as approver_role
            FROM approvals a
            LEFT JOIN users u ON a.approver_id = u.id
            WHERE a.item_type = $1 AND a.item_id = $2
            ORDER BY a.created_at DESC
        `;

        const result = await db.query(query, [itemType, itemId]);

        res.json({
            success: true,
            approvalHistory: result.rows
        });
    } catch (error) {
        console.error('Error fetching approval history:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create approval request for mixed track
router.post('/mixed-track', async (req, res) => {
    try {
        const {
            sessionId,
            mixerId,
            s3Key,
            s3Bucket,
            fileSizeMb,
            durationSeconds,
            mixNotes,
            technicalSpecs,
            mixVersion = 1
        } = req.body;

        // Create mixed track record
        const mixedTrackQuery = `
            INSERT INTO mixed_tracks 
            (session_id, mixer_id, mix_version, s3_key, s3_bucket, file_size_mb, 
             duration_seconds, mix_notes, technical_specs)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
            RETURNING *
        `;

        const mixedTrackResult = await db.query(mixedTrackQuery, [
            sessionId, mixerId, mixVersion, s3Key, s3Bucket, fileSizeMb,
            durationSeconds, mixNotes, JSON.stringify(technicalSpecs)
        ]);

        // Create approval request for the mixed track
        const approvalQuery = `
            INSERT INTO approvals (item_type, item_id, status)
            VALUES ('mixed_track', $1, 'pending')
            RETURNING *
        `;

        const approvalResult = await db.query(approvalQuery, [mixedTrackResult.rows[0].id]);

        // Notify approvers
        const io = req.app.get('io');
        if (io) {
            io.to('approver').emit('new_mixed_track_for_approval', {
                mixedTrackId: mixedTrackResult.rows[0].id,
                sessionId,
                mixerId
            });
        }

        res.status(201).json({
            success: true,
            mixedTrack: mixedTrackResult.rows[0],
            approval: approvalResult.rows[0]
        });
    } catch (error) {
        console.error('Error creating mixed track approval:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create approval request for narrator recording
router.post('/narrator-recording', async (req, res) => {
    try {
        const {
            shabadId,
            narratorId,
            recordingDate,
            s3Key,
            s3Bucket,
            fileSizeMb,
            durationSeconds,
            language,
            scriptText,
            recordingQuality,
            notes
        } = req.body;

        // Create narrator recording
        const narratorQuery = `
            INSERT INTO narrator_recordings 
            (shabad_id, narrator_id, recording_date, s3_key, s3_bucket, file_size_mb,
             duration_seconds, language, script_text, recording_quality, notes)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
            RETURNING *
        `;

        const narratorResult = await db.query(narratorQuery, [
            shabadId, narratorId, recordingDate, s3Key, s3Bucket, fileSizeMb,
            durationSeconds, language, scriptText, recordingQuality, notes
        ]);

        // Create approval request
        const approvalQuery = `
            INSERT INTO approvals (item_type, item_id, status)
            VALUES ('narrator_recording', $1, 'pending')
            RETURNING *
        `;

        const approvalResult = await db.query(approvalQuery, [narratorResult.rows[0].id]);

        // Notify approvers
        const io = req.app.get('io');
        if (io) {
            io.to('approver').emit('new_narrator_recording_for_approval', {
                narratorRecordingId: narratorResult.rows[0].id,
                shabadId,
                narratorId
            });
        }

        res.status(201).json({
            success: true,
            narratorRecording: narratorResult.rows[0],
            approval: approvalResult.rows[0]
        });
    } catch (error) {
        console.error('Error creating narrator recording approval:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create approval request for final composition
router.post('/final-composition', async (req, res) => {
    try {
        const {
            shabadId,
            mixedTrackId,
            narratorRecordingId,
            finalMixerId,
            s3Key,
            s3Bucket,
            fileSizeMb,
            durationSeconds,
            compositionNotes,
            versionNumber = 1
        } = req.body;

        // Create final composition
        const finalQuery = `
            INSERT INTO final_compositions 
            (shabad_id, mixed_track_id, narrator_recording_id, final_mixer_id,
             s3_key, s3_bucket, file_size_mb, duration_seconds, composition_notes, version_number)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
            RETURNING *
        `;

        const finalResult = await db.query(finalQuery, [
            shabadId, mixedTrackId, narratorRecordingId, finalMixerId,
            s3Key, s3Bucket, fileSizeMb, durationSeconds, compositionNotes, versionNumber
        ]);

        // Create approval request
        const approvalQuery = `
            INSERT INTO approvals (item_type, item_id, status)
            VALUES ('final_mix', $1, 'pending')
            RETURNING *
        `;

        const approvalResult = await db.query(approvalQuery, [finalResult.rows[0].id]);

        // Notify approvers
        const io = req.app.get('io');
        if (io) {
            io.to('approver').emit('new_final_composition_for_approval', {
                finalCompositionId: finalResult.rows[0].id,
                shabadId,
                finalMixerId
            });
        }

        res.status(201).json({
            success: true,
            finalComposition: finalResult.rows[0],
            approval: approvalResult.rows[0]
        });
    } catch (error) {
        console.error('Error creating final composition approval:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get approval statistics
router.get('/statistics', async (req, res) => {
    try {
        const queries = [
            // Total approvals by status
            `SELECT status, COUNT(*) as count FROM approvals GROUP BY status`,
            
            // Approvals by item type and status
            `SELECT item_type, status, COUNT(*) as count 
             FROM approvals 
             GROUP BY item_type, status 
             ORDER BY item_type, status`,
             
            // Average approval time (for completed approvals)
            `SELECT item_type, 
                    AVG(EXTRACT(EPOCH FROM (decision_date - created_at))/3600) as avg_hours_to_approval
             FROM approvals 
             WHERE status IN ('approved', 'rejected') AND decision_date IS NOT NULL
             GROUP BY item_type`,
             
            // Pending approvals by age
            `SELECT 
                CASE 
                    WHEN created_at >= CURRENT_DATE - INTERVAL '1 day' THEN '< 1 day'
                    WHEN created_at >= CURRENT_DATE - INTERVAL '3 days' THEN '1-3 days'
                    WHEN created_at >= CURRENT_DATE - INTERVAL '7 days' THEN '3-7 days'
                    ELSE '> 7 days'
                END as age_group,
                COUNT(*) as count
             FROM approvals 
             WHERE status = 'pending'
             GROUP BY age_group`
        ];

        const results = await Promise.all(queries.map(query => db.query(query)));

        res.json({
            success: true,
            statistics: {
                approvalsByStatus: results[0].rows,
                approvalsByTypeAndStatus: results[1].rows,
                averageApprovalTime: results[2].rows,
                pendingApprovalsByAge: results[3].rows
            }
        });
    } catch (error) {
        console.error('Error fetching approval statistics:', error);
        res.status(500).json({ error: error.message });
    }
});

// Assign approver to pending approval
router.put('/assign/:approvalId', async (req, res) => {
    try {
        const { approvalId } = req.params;
        const { approverId } = req.body;

        const query = `
            UPDATE approvals 
            SET approver_id = $1, updated_at = CURRENT_TIMESTAMP
            WHERE id = $2 AND status = 'pending'
            RETURNING *
        `;

        const result = await db.query(query, [approverId, approvalId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Approval record not found or already processed' });
        }

        res.json({
            success: true,
            approval: result.rows[0]
        });
    } catch (error) {
        console.error('Error assigning approver:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;