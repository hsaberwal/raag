# 🚀 Quick Start Guide - Test the Raag Recording System

This guide will get you running the Raag Recording System in **TEST MODE** without needing AWS or PostgreSQL!

## ⚡ 5-Minute Setup (No AWS Required!)

### Step 1: Install Node.js
Make sure you have Node.js installed (version 16 or higher):
```bash
node --version  # Should show v16+ 
npm --version   # Should show npm version
```

### Step 2: Clone and Setup
```bash
# If you don't have the code yet, create the project folder
mkdir raag-recording-system
cd raag-recording-system

# Install dependencies
npm install

# Run the test setup (creates test data and folders)
npm run test-setup
```

### Step 3: Start the Server
```bash
npm start
```

You should see:
```
🧪 Running in TEST MODE (Local Storage + File Database)
🎵 Raag Recording System server running on port 3000
💾 Database: File-based (test_data.json)
📁 Storage: Local Storage (./local_storage/)
🔗 Open: http://localhost:5200

🧪 TEST MODE ACTIVE
📋 Test Login Credentials:
   - Username: performer1, Role: performer
   - Username: approver1, Role: approver
   - Username: mixer1, Role: mixer
   - Username: narrator1, Role: narrator
```

### Step 4: Open and Test
1. Open your browser to: **http://localhost:5200**
2. Login with test credentials (e.g., username: `performer1`, role: `performer`)
3. Explore the different features!

## 🎯 What You Can Test

### As a Performer:
- ✅ View shabads collection
- ✅ Upload audio tracks (use sample files in `./sample_audio/`)
- ✅ Monitor approval status
- ✅ Send messages to team

### As an Approver:
- ✅ Review pending recordings
- ✅ Listen to uploaded tracks
- ✅ Approve/reject recordings
- ✅ Communicate with mixers

### As a Mixer:
- ✅ Access approved tracks
- ✅ Upload mixed versions
- ✅ Collaborate with approvers

### As a Narrator:
- ✅ Upload narrator recordings
- ✅ Coordinate with mixers

## 📁 Test Files Structure

After setup, you'll have:
```
raag-recording-system/
├── sample_audio/          # Sample WAV files for testing
├── local_storage/         # Where uploads are saved
├── test_data.json        # Simple file-based database
├── temp_uploads/         # Temporary upload folder
└── .env                  # Test configuration
```

## 🎵 Testing File Uploads

1. **Login as performer1**
2. **Go to Recordings tab**
3. **Click "Upload Track"**
4. **Select a file from `sample_audio/` folder**
5. **Fill in track details and upload**
6. **Check `local_storage/` to see your uploaded file!**

## 🔄 Testing the Approval Workflow

1. **Upload a track as performer1**
2. **Logout and login as approver1**
3. **Go to Approvals tab**
4. **Listen to and approve the track**
5. **Logout and login as mixer1**
6. **See the approved track ready for mixing**

## 💬 Testing Real-time Communication

1. **Open two browser windows/tabs**
2. **Login as different users in each**
3. **Send messages between them**
4. **See real-time notifications!**

## 🛠️ Troubleshooting

### Port Already in Use
```bash
# Kill process on port 5200  
npx kill-port 5200

# Or use a different port
PORT=5201 npm start
```

### Permission Errors
```bash
# Make sure you have write permissions
chmod -R 755 .
```

### Missing Dependencies
```bash
# Reinstall everything
rm -rf node_modules package-lock.json
npm install
```

## 🎯 Testing Different Features

### Dashboard
- View overall statistics
- Monitor recent activity
- Track raag progress

### Shabads Collection
- Browse all shabads
- Search and filter by raag
- View recording progress

### File Management
- Upload audio files
- Organized storage structure
- Audio playback

### User Roles
- Role-based access control
- Different interfaces per role
- Permission management

### Real-time Updates
- WebSocket communication
- Live notifications
- Status updates

## 🚀 Moving to Production

When ready for production with AWS and PostgreSQL:

1. **Set up PostgreSQL database**
2. **Configure AWS S3 bucket**  
3. **Update `.env` file with production settings**
4. **Run database schema**: `psql -d your_db -f database/schema.sql`
5. **Set `USE_LOCAL_STORAGE=false`**

The system will automatically switch to production mode!

## 🎵 Sample Data Included

- **3 Raags**: Asa, Gujari, Sorath
- **2 Sample Shabads** with Gurmukhi text
- **4 Test Users** (one for each role)
- **Sample Audio Files** for upload testing

## 🔧 Advanced Testing

### API Testing
```bash
# Health check
curl http://localhost:5200/api/health

# Get shabads
curl http://localhost:5200/api/shabads

# Get raags
curl http://localhost:5200/api/shabads/raags/all
```

### File Upload Testing
```bash
# Upload via API (with authentication)
curl -X POST http://localhost:5200/api/upload \
  -H "Authorization: Bearer demo_token_1" \
  -F "audioFile=@sample_audio/sample_vocal.wav" \
  -F "fileType=raw_track" \
  -F "metadata={\"shabadId\":1,\"sessionId\":1,\"trackNumber\":1,\"performer\":\"test\"}"
```

## 💡 Tips for Testing

1. **Try different user roles** to see different interfaces
2. **Upload multiple file types** (WAV, FLAC, MP3)
3. **Test the approval workflow** end-to-end
4. **Use browser dev tools** to see WebSocket communication
5. **Check the `local_storage/` folder** to see organized file structure
6. **Explore the JSON database** in `test_data.json`

## 🎯 What's Working

✅ Complete user authentication  
✅ Role-based access control  
✅ File upload and storage  
✅ Real-time WebSocket communication  
✅ Approval workflow  
✅ Audio playback  
✅ Modern responsive UI  
✅ Multi-track recording management  
✅ Communication system  

Happy testing! 🎵

---

**Need help?** Check the logs in your terminal for detailed information about what's happening.