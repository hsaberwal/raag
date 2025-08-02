# Raag Recording System - Guru Granth Sahib

A comprehensive track recording and management system for creating high-quality recordings of all shabads in the Guru Granth Sahib, organized by raag. This is the first attempt to create a complete recording of all shabads in the order they appear in the Guru Granth Sahib, with proper raag classification and multi-track recording capabilities.

## 🎵 Project Vision

This system enables the creation of a complete, high-quality recording collection of the Guru Granth Sahib with the following goals:

- **Complete Coverage**: Record every shabad in the Guru Granth Sahib in order
- **Raag Authenticity**: Maintain proper raag classification and musical integrity
- **High Quality**: Studio-quality multi-track recordings with professional mixing
- **Educational Value**: Include narrator explanations for each shabad
- **Collaborative Workflow**: Support multiple performers, approvers, and mixers

## 🏗️ System Architecture

### Core Components

1. **Multi-track Recording Management**: Track individual performers and instruments
2. **Approval Workflow**: Quality control process for all recordings
3. **Communication System**: Real-time messaging between team members
4. **S3 Storage**: Secure, scalable storage for all audio assets
5. **Mixing Pipeline**: Professional audio mixing and mastering workflow
6. **Narrator Integration**: Commentary tracks with synchronized mixing

### User Roles

- **Performers**: Record individual tracks (vocals, instruments)
- **Approvers**: Review and approve recording quality
- **Mixers**: Combine approved tracks into final compositions
- **Narrators**: Record explanatory content for shabads
- **Administrators**: Manage users and system oversight

## 🚀 Features

### Recording Management
- Create recording sessions for specific shabads
- Upload multi-track audio files (WAV, FLAC, AIFF)
- Track performer details, instruments, and recording quality
- Monitor session progress and completion status

### Approval Workflow
- Automated approval requests for all recordings
- Quality assessment with comments and revision requests
- Real-time notifications for approval status changes
- Comprehensive approval history tracking

### Communication Hub
- Direct messaging between approvers and mixers
- Project-specific discussion threads
- Real-time notifications via WebSocket
- Email integration for important updates

### Audio Processing
- S3-based storage with organized file structure
- Presigned URL generation for secure access
- Audio metadata tracking (duration, format, quality)
- Batch processing capabilities

### Progress Tracking
- Dashboard with overall project statistics
- Raag-wise progress monitoring
- Individual shabad completion status
- Performance analytics and reporting

## 🛠️ Technology Stack

### Backend
- **Node.js** with Express.js framework
- **PostgreSQL** database for structured data
- **AWS S3** for audio file storage
- **Socket.io** for real-time communication
- **Multer** for file upload handling

### Frontend
- **HTML5** with modern CSS (Tailwind CSS)
- **Vanilla JavaScript** (ES6+)
- **Font Awesome** icons
- **WebSocket** for real-time updates

### Audio Processing
- **FFmpeg** for audio format conversion
- **Fluent-FFmpeg** for Node.js integration
- Support for high-quality formats (24-bit/48kHz)

## 📋 Prerequisites

- Node.js (v16 or higher)
- PostgreSQL (v12 or higher)
- AWS Account with S3 bucket
- FFmpeg installed on system

## ⚙️ Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd raag-recording-system
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

4. **Configure database**
   ```bash
   # Create PostgreSQL database
   createdb raag_recording_system
   
   # Run database schema
   psql -d raag_recording_system -f database/schema.sql
   ```

5. **Set up AWS S3**
   - Create an S3 bucket for audio storage
   - Configure IAM user with appropriate permissions
   - Update .env with AWS credentials

6. **Start the application**
   ```bash
   # Development mode
   npm run dev
   
   # Production mode
   npm start
   ```

## 🔧 Configuration

### Environment Variables

```env
# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=raag_recording_system
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# AWS S3 Configuration
AWS_REGION=us-west-2
AWS_ACCESS_KEY_ID=your_access_key
AWS_SECRET_ACCESS_KEY=your_secret_key
S3_BUCKET=raag-recordings

# Application Configuration
PORT=3000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_key_here

# Audio Processing
MAX_FILE_SIZE_MB=500
SUPPORTED_FORMATS=wav,flac,aiff
DEFAULT_SAMPLE_RATE=48000
DEFAULT_BIT_DEPTH=24
```

### S3 Bucket Structure

```
raag-recordings/
├── raw-tracks/
│   └── {shabadId}/
│       └── {sessionId}/
│           └── track-{trackNumber}-{performer}-{timestamp}.wav
├── mixed-tracks/
│   └── {shabadId}/
│       └── session-{sessionId}-v{version}-{timestamp}.wav
├── narrator-recordings/
│   └── {shabadId}/
│       └── narrator-{narratorId}-{timestamp}.wav
└── final-compositions/
    └── {shabadId}/
        └── final-v{version}-{timestamp}.wav
```

## 📖 Usage Guide

### For Performers

1. **Login** with performer role
2. **Browse Shabads** to find the one you want to record
3. **Start Recording Session** for selected shabad
4. **Upload Tracks** with proper metadata (instrument, type, quality notes)
5. **Monitor Approval Status** of your submissions

### For Approvers

1. **Login** with approver role
2. **Review Pending Approvals** in the Approvals tab
3. **Listen to Recordings** using the built-in audio player
4. **Make Approval Decisions** (Approve, Reject, or Request Revision)
5. **Communicate with Team** through the messaging system

### For Mixers

1. **Login** with mixer role
2. **Receive Notifications** when tracks are approved for mixing
3. **Download Approved Tracks** for mixing in your DAW
4. **Upload Mixed Versions** back to the system
5. **Collaborate with Approvers** on mixing decisions

### For Narrators

1. **Login** with narrator role
2. **Record Explanatory Content** for assigned shabads
3. **Upload Narrator Tracks** with script text
4. **Coordinate with Mixers** for final composition timing

## 🏛️ Database Schema

### Key Tables

- **shabads**: Core shabad content with raag classification
- **recording_sessions**: Multi-track recording sessions
- **tracks**: Individual audio tracks with metadata
- **narrator_recordings**: Explanatory recordings
- **approvals**: Workflow management for all audio content
- **mixed_tracks**: Professional mixes of approved tracks
- **final_compositions**: Complete shabads with narrator integration
- **communications**: Team messaging and collaboration

## 🔐 Security Features

- JWT-based authentication (demo implementation)
- S3 server-side encryption (AES256)
- Presigned URLs for secure file access
- Role-based access control
- Input validation and sanitization

## 🎯 API Endpoints

### Authentication
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Current user profile

### Shabads
- `GET /api/shabads` - List shabads with filtering
- `GET /api/shabads/:id` - Get specific shabad
- `GET /api/shabads/:id/progress` - Get recording progress

### Recordings
- `POST /api/recordings/sessions` - Create recording session
- `GET /api/recordings/sessions/:id` - Get session details
- `POST /api/recordings/tracks` - Add track to session
- `GET /api/recordings/statistics` - Get recording statistics

### Approvals
- `GET /api/approvals/pending/:userId` - Get pending approvals
- `POST /api/approvals/decision` - Submit approval decision
- `GET /api/approvals/history/:type/:id` - Get approval history

### Communications
- `POST /api/communications/send` - Send message
- `GET /api/communications/user/:userId` - Get user messages
- `GET /api/communications/thread/:type/:id` - Get conversation thread

### File Management
- `POST /api/upload` - Upload audio files
- `GET /api/download/:type/:id` - Get download URL

## 🚀 Deployment

### Production Setup

1. **Environment Configuration**
   ```bash
   NODE_ENV=production
   ```

2. **Database Migration**
   ```bash
   # Run in production database
   psql -d production_db -f database/schema.sql
   ```

3. **S3 Configuration**
   - Set up production S3 bucket
   - Configure CloudFront for CDN (optional)
   - Set up proper IAM policies

4. **Process Management**
   ```bash
   # Using PM2
   npm install -g pm2
   pm2 start server.js --name raag-recording
   pm2 startup
   pm2 save
   ```

### Docker Deployment

```dockerfile
FROM node:16-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
EXPOSE 3000
CMD ["npm", "start"]
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by the sacred tradition of Guru Granth Sahib
- Built with respect for Sikh musical heritage
- Dedicated to preserving raag authenticity in recordings

## 📞 Support

For technical support or questions about the recording process:

- Create an issue in this repository
- Contact the development team
- Refer to the API documentation

---

**Note**: This system is designed to handle the sacred responsibility of recording the Guru Granth Sahib with the highest standards of quality and authenticity. Please ensure all recordings maintain the spiritual and musical integrity of the original compositions.
