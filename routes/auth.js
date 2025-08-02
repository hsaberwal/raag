const express = require('express');
const router = express.Router();

// Get database instance from environment or use default
const useTestMode = process.env.USE_LOCAL_STORAGE === 'true' || !process.env.DB_HOST;
const db = useTestMode ? require('../config/test-database') : require('../config/database');

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

module.exports = router;