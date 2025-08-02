const express = require('express');
const router = express.Router();
const db = require('../config/database');

// Send a new message
router.post('/send', async (req, res) => {
    try {
        const {
            fromUserId,
            toUserId,
            relatedItemType,
            relatedItemId,
            subject,
            message,
            repliedTo
        } = req.body;

        const query = `
            INSERT INTO communications 
            (from_user_id, to_user_id, related_item_type, related_item_id, subject, message, replied_to)
            VALUES ($1, $2, $3, $4, $5, $6, $7)
            RETURNING *
        `;

        const result = await db.query(query, [
            fromUserId, toUserId, relatedItemType, relatedItemId, subject, message, repliedTo
        ]);

        // Notify via socket
        const io = req.app.get('io');
        if (io) {
            io.to(`user_${toUserId}`).emit('new_message', result.rows[0]);
        }

        res.status(201).json({
            success: true,
            communication: result.rows[0]
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get messages for a user
router.get('/user/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const { unreadOnly = false } = req.query;

        let whereClause = 'WHERE to_user_id = $1';
        const params = [userId];

        if (unreadOnly === 'true') {
            whereClause += ' AND read_at IS NULL';
        }

        const query = `
            SELECT c.*, 
                   from_user.full_name as from_user_name,
                   from_user.role as from_user_role,
                   to_user.full_name as to_user_name,
                   to_user.role as to_user_role
            FROM communications c
            JOIN users from_user ON c.from_user_id = from_user.id
            JOIN users to_user ON c.to_user_id = to_user.id
            ${whereClause}
            ORDER BY c.sent_at DESC
        `;

        const result = await db.query(query, params);

        res.json({
            success: true,
            messages: result.rows
        });
    } catch (error) {
        console.error('Error fetching messages:', error);
        res.status(500).json({ error: error.message });
    }
});

// Mark message as read
router.put('/read/:communicationId', async (req, res) => {
    try {
        const { communicationId } = req.params;

        const query = `
            UPDATE communications 
            SET read_at = CURRENT_TIMESTAMP
            WHERE id = $1 AND read_at IS NULL
            RETURNING *
        `;

        const result = await db.query(query, [communicationId]);

        res.json({
            success: true,
            communication: result.rows[0]
        });
    } catch (error) {
        console.error('Error marking message as read:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get conversation thread
router.get('/thread/:itemType/:itemId', async (req, res) => {
    try {
        const { itemType, itemId } = req.params;

        const query = `
            SELECT c.*, 
                   from_user.full_name as from_user_name,
                   from_user.role as from_user_role,
                   to_user.full_name as to_user_name,
                   to_user.role as to_user_role
            FROM communications c
            JOIN users from_user ON c.from_user_id = from_user.id
            JOIN users to_user ON c.to_user_id = to_user.id
            WHERE c.related_item_type = $1 AND c.related_item_id = $2
            ORDER BY c.sent_at ASC
        `;

        const result = await db.query(query, [itemType, itemId]);

        res.json({
            success: true,
            thread: result.rows
        });
    } catch (error) {
        console.error('Error fetching conversation thread:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;