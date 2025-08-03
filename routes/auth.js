const express = require('express');
const router = express.Router();

// Use shared database module that auto-detects test vs production mode
const db = require('../config/db');

// Simple login (for demo purposes - in production, use proper authentication)
router.post('/login', async (req, res) => {
    try {
        const { username, role } = req.body;

        // Find or create user
        let query = `SELECT * FROM users WHERE username = $1`;
        let result = await db.query(query, [username]);

        if (result.rows.length === 0) {
            // Create user if doesn't exist (for demo)
            query = `
                INSERT INTO users (username, email, full_name, role)
                VALUES ($1, $2, $3, $4)
                RETURNING *
            `;
            result = await db.query(query, [
                username,
                `${username}@raagrecording.com`,
                username,
                role || 'performer'
            ]);
        }

        const user = result.rows[0];

        res.json({
            success: true,
            user: {
                id: user.id,
                username: user.username,
                fullName: user.full_name,
                role: user.role,
                email: user.email
            },
            token: `demo_token_${user.id}` // In production, use proper JWT
        });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get current user (demo)
router.get('/me', async (req, res) => {
    try {
        // In production, verify JWT token
        const token = req.headers.authorization?.replace('Bearer ', '');
        
        if (!token || !token.startsWith('demo_token_')) {
            return res.status(401).json({ error: 'Invalid token' });
        }

        const userId = token.replace('demo_token_', '');
        
        const query = `
            SELECT id, username, email, full_name, role, phone, created_at, is_active
            FROM users WHERE id = $1
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
        console.error('Error fetching current user:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get current user info (for frontend authentication check)
router.get('/me', async (req, res) => {
    try {
        // In a real app, this would use session/token authentication
        // For demo, we'll return a default user or handle based on headers
        const authHeader = req.headers.authorization;
        if (!authHeader) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        // Simple demo: extract username from auth header or use default
        const username = req.headers['x-username'] || 'performer1';
        
        const query = `SELECT user_id, username, role, full_name, active FROM users WHERE username = $1`;
        const result = await db.query(query, [username]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'User not found' });
        }

        res.json({
            success: true,
            user: result.rows[0]
        });
    } catch (error) {
        console.error('Error fetching current user:', error);
        res.status(500).json({ error: error.message });
    }
});

// Get all users (for testing/admin purposes)
router.get('/users', async (req, res) => {
    try {
        const query = `
            SELECT user_id, username, role, full_name, active, created_at
            FROM users 
            ORDER BY created_at DESC
        `;
        const result = await db.query(query);
        
        res.json({
            users: result.rows,
            total: result.rows.length
        });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;