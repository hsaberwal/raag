const express = require('express');
const router = express.Router();
const db = require('../config/db');

// Get all users with filtering
router.get('/', async (req, res) => {
    try {
        const { role, active = 'true' } = req.query;

        let whereClause = 'WHERE 1=1';
        const params = [];
        let paramCount = 0;

        if (role) {
            whereClause += ` AND role = $${++paramCount}`;
            params.push(role);
        }

        if (active === 'true') {
            whereClause += ` AND is_active = true`;
        }

        const query = `
            SELECT id, username, email, full_name, role, phone, created_at, is_active
            FROM users
            ${whereClause}
            ORDER BY full_name
        `;

        const result = await db.query(query, params);

        res.json({
            success: true,
            users: result.rows
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get users by role
router.get('/role/:role', async (req, res) => {
    try {
        const { role } = req.params;

        const query = `
            SELECT id, username, email, full_name, role, phone, created_at, is_active
            FROM users
            WHERE role = $1 AND is_active = true
            ORDER BY full_name
        `;

        const result = await db.query(query, [role]);

        res.json({
            success: true,
            users: result.rows
        });
    } catch (error) {
        console.error('Error fetching users by role:', error);
        res.status(500).json({ error: error.message });
    }
});

// Create a new user
router.post('/', async (req, res) => {
    try {
        const {
            username,
            email,
            fullName,
            role,
            phone
        } = req.body;

        // Validate role
        const validRoles = ['performer', 'approver', 'mixer', 'narrator', 'administrator'];
        if (!validRoles.includes(role)) {
            return res.status(400).json({ error: 'Invalid role specified' });
        }

        const query = `
            INSERT INTO users (username, email, full_name, role, phone)
            VALUES ($1, $2, $3, $4, $5)
            RETURNING id, username, email, full_name, role, phone, created_at, is_active
        `;

        const result = await db.query(query, [username, email, fullName, role, phone]);

        res.status(201).json({
            success: true,
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Error creating user:', error);
        if (error.code === '23505') { // Unique constraint violation
            res.status(400).json({ error: 'Username or email already exists' });
        } else {
            res.status(500).json({ error: error.message });
        }
    }
});

// Update user
router.put('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;
        const {
            username,
            email,
            fullName,
            role,
            phone,
            isActive
        } = req.body;

        const query = `
            UPDATE users 
            SET username = $1, email = $2, full_name = $3, role = $4, 
                phone = $5, is_active = $6, updated_at = CURRENT_TIMESTAMP
            WHERE id = $7
            RETURNING id, username, email, full_name, role, phone, created_at, updated_at, is_active
        `;

        const result = await db.query(query, [
            username, email, fullName, role, phone, isActive, userId
        ]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Error updating user:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get user profile
router.get('/:userId', async (req, res) => {
    try {
        const { userId } = req.params;

        const query = `
            SELECT id, username, email, full_name, role, phone, created_at, updated_at, is_active
            FROM users
            WHERE id = $1
        `;

        const result = await db.query(query, [userId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching user profile:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;