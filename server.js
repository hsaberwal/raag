const express = require('express');
const multer = require('multer');
const cors = require('cors');
const path = require('path');
const http = require('http');
const socketIo = require('socket.io');
require('dotenv').config();

// Import configurations and utilities
const db = require('./config/database');
const s3Config = require('./config/s3');

// Import routes
const authRoutes = require('./routes/auth');
const shabadRoutes = require('./routes/shabads');
const recordingRoutes = require('./routes/recordings');
const approvalRoutes = require('./routes/approvals');
const communicationRoutes = require('./routes/communications');
const userRoutes = require('./routes/users');

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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Configure multer for file uploads (temporary storage before S3)
const upload = multer({
    dest: 'temp_uploads/',
    limits: {
        fileSize: (process.env.MAX_FILE_SIZE_MB || 500) * 1024 * 1024 // MB to bytes
    },
    fileFilter: (req, file, cb) => {
        const allowedFormats = (process.env.SUPPORTED_FORMATS || 'wav,flac,aiff').split(',');
        const fileExtension = path.extname(file.originalname).substring(1).toLowerCase();
        
        if (allowedFormats.includes(fileExtension)) {
            cb(null, true);
        } else {
            cb(new Error(`Unsupported file format. Allowed formats: ${allowedFormats.join(', ')}`));
        }
    }
});

// Serve static files
app.use(express.static('public'));

// Socket.io for real-time communications
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // Join user to their role-based room
    socket.on('join_role_room', (role) => {
        socket.join(role);
        console.log(`User joined ${role} room`);
    });

    // Join specific project/shabad room
    socket.on('join_shabad_room', (shabadId) => {
        socket.join(`shabad_${shabadId}`);
        console.log(`User joined shabad ${shabadId} room`);
    });

    // Handle new messages
    socket.on('new_message', async (messageData) => {
        try {
            // Save message to database
            const query = `
                INSERT INTO communications 
                (from_user_id, to_user_id, related_item_type, related_item_id, subject, message)
                VALUES ($1, $2, $3, $4, $5, $6)
                RETURNING *
            `;
            
            const result = await db.query(query, [
                messageData.fromUserId,
                messageData.toUserId,
                messageData.relatedItemType,
                messageData.relatedItemId,
                messageData.subject,
                messageData.message
            ]);

            // Emit to relevant rooms
            io.to(`user_${messageData.toUserId}`).emit('message_received', result.rows[0]);
            if (messageData.relatedItemId) {
                io.to(`shabad_${messageData.shabadId}`).emit('new_communication', result.rows[0]);
            }
        } catch (error) {
            console.error('Error saving message:', error);
            socket.emit('error', { message: 'Failed to send message' });
        }
    });

    // Handle approval status updates
    socket.on('approval_update', (approvalData) => {
        io.to(`shabad_${approvalData.shabadId}`).emit('approval_status_changed', approvalData);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
    });
});

// Make io available to routes
app.set('io', io);

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/shabads', shabadRoutes);
app.use('/api/recordings', recordingRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/communications', communicationRoutes);
app.use('/api/users', userRoutes);

// Health check endpoint
app.get('/api/health', async (req, res) => {
    try {
        // Test database connection
        await db.query('SELECT 1');
        
        // Test S3 connection
        const s3Test = await s3Config.s3.headBucket({ Bucket: s3Config.S3_CONFIG.bucket }).promise();
        
        res.json({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            database: 'connected',
            s3: 'connected',
            version: require('./package.json').version
        });
    } catch (error) {
        res.status(500).json({
            status: 'unhealthy',
            error: error.message,
            timestamp: new Date().toISOString()
        });
    }
});

// File upload endpoint (handles both tracks and narrator recordings)
app.post('/api/upload', upload.single('audioFile'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No file uploaded' });
        }

        const { fileType, metadata } = req.body;
        const parsedMetadata = JSON.parse(metadata);
        
        // Read file buffer
        const fs = require('fs');
        const fileBuffer = fs.readFileSync(req.file.path);
        
        // Generate S3 key
        const s3Key = s3Config.generateS3Key(fileType, {
            ...parsedMetadata,
            extension: path.extname(req.file.originalname).substring(1),
            filename: req.file.originalname
        });
        
        // Upload to S3
        const uploadResult = await s3Config.uploadToS3(
            fileBuffer, 
            s3Key, 
            req.file.mimetype,
            parsedMetadata
        );
        
        if (!uploadResult.success) {
            throw new Error(uploadResult.error);
        }
        
        // Clean up temporary file
        fs.unlinkSync(req.file.path);
        
        res.json({
            success: true,
            s3Key: uploadResult.key,
            location: uploadResult.location,
            fileSize: req.file.size,
            originalName: req.file.originalname
        });
        
    } catch (error) {
        console.error('Upload error:', error);
        
        // Clean up temporary file if it exists
        if (req.file && req.file.path) {
            const fs = require('fs');
            try {
                fs.unlinkSync(req.file.path);
            } catch (cleanupError) {
                console.error('Error cleaning up temp file:', cleanupError);
            }
        }
        
        res.status(500).json({ error: error.message });
    }
});

// Get file download URL endpoint
app.get('/api/download/:fileType/:fileId', async (req, res) => {
    try {
        const { fileType, fileId } = req.params;
        
        // Get file path from database based on type and ID
        let query, tableName;
        switch (fileType) {
            case 'track':
                tableName = 'tracks';
                break;
            case 'narrator':
                tableName = 'narrator_recordings';
                break;
            case 'mixed':
                tableName = 'mixed_tracks';
                break;
            case 'final':
                tableName = 'final_compositions';
                break;
            default:
                return res.status(400).json({ error: 'Invalid file type' });
        }
        
        query = `SELECT s3_key FROM ${tableName} WHERE id = $1`;
        const result = await db.query(query, [fileId]);
        
        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'File not found' });
        }
        
        const s3Key = result.rows[0].s3_key;
        
        // Generate presigned URL
        const urlResult = await s3Config.getPresignedUrl(s3Key, 3600); // 1 hour expiry
        
        if (!urlResult.success) {
            throw new Error(urlResult.error);
        }
        
        res.json({
            downloadUrl: urlResult.url,
            expiresIn: 3600
        });
        
    } catch (error) {
        console.error('Download URL error:', error);
        res.status(500).json({ error: error.message });
    }
});

// Error handling middleware
app.use((error, req, res, next) => {
    console.error('Global error handler:', error);
    
    if (error instanceof multer.MulterError) {
        if (error.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ 
                error: `File too large. Maximum size is ${process.env.MAX_FILE_SIZE_MB || 500}MB` 
            });
        }
        return res.status(400).json({ error: error.message });
    }
    
    res.status(500).json({ 
        error: process.env.NODE_ENV === 'production' ? 'Internal server error' : error.message 
    });
});

// Serve the frontend app for any non-API routes
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
    console.log(`Raag Recording System server running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
    console.log(`Database: ${process.env.DB_NAME}@${process.env.DB_HOST}`);
    console.log(`S3 Bucket: ${process.env.S3_BUCKET}`);
});