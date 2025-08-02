const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
require('dotenv').config();

console.log('🧪 TEST-ONLY SERVER - NO POSTGRESQL');

// Force test mode
const db = require('./config/test-database');
const storageConfig = require('./config/local-storage');

console.log('✅ Test database loaded');
console.log('✅ Local storage loaded');

// Initialize local storage
storageConfig.initializeLocalStorage();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));
app.use('/local-files', express.static(path.join(__dirname, 'local_storage')));

// Simple auth route (test only)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { username, role } = req.body;
        console.log('🔐 Login attempt:', username, role);

        // Simple test users
        const testUsers = [
            { id: 1, username: 'performer1', role: 'performer', full_name: 'Test Performer' },
            { id: 2, username: 'approver1', role: 'approver', full_name: 'Test Approver' },
            { id: 3, username: 'mixer1', role: 'mixer', full_name: 'Test Mixer' },
            { id: 4, username: 'narrator1', role: 'narrator', full_name: 'Test Narrator' },
            { id: 5, username: 'admin', role: 'admin', full_name: 'Test Admin' }
        ];

        const user = testUsers.find(u => u.username === username);
        if (!user) {
            return res.status(401).json({ error: 'User not found' });
        }

        console.log('✅ Login successful:', user.username);
        
        res.json({
            success: true,
            user: user,
            token: 'test-token-' + user.id
        });
    } catch (error) {
        console.error('❌ Login error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// Current user endpoint
app.get('/api/auth/me', (req, res) => {
    res.json({
        success: true,
        user: { id: 1, username: 'test-user', role: 'performer', full_name: 'Test User' }
    });
});

// Health check endpoint
app.get('/api/health', async (req, res) => {
    res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        mode: 'TEST-ONLY',
        database: 'file-based (test)',
        storage: 'local',
        environment: process.env.NODE_ENV || 'development'
    });
});

// Basic API endpoints for testing
app.get('/api/shabads', (req, res) => {
    res.json({ shabads: [], total: 0 });
});

app.get('/api/raags', (req, res) => {
    res.json({ raags: [] });
});

app.get('/api/recordings/sessions', (req, res) => {
    res.json({ sessions: [] });
});

// Socket.io for real-time features
io.on('connection', (socket) => {
    console.log('📡 Client connected:', socket.id);
    
    socket.on('disconnect', () => {
        console.log('📡 Client disconnected:', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

server.listen(PORT, HOST, () => {
    console.log(`🎵 TEST-ONLY Raag Recording System running on ${HOST}:${PORT}`);
    console.log(`🔗 Local: http://localhost:${PORT}`);
    console.log(`🌐 Remote: http://YOUR_SERVER_IP:${PORT}`);
    console.log('✅ Ready for testing - No PostgreSQL required!');
});

process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down gracefully');
    server.close(() => {
        console.log('Process terminated');
    });
});