# 🐳 Docker Setup - Raag Recording System

Run the complete Raag Recording System in Docker containers with zero configuration needed!

## 🚀 Super Quick Start (1 Command!)

```bash
# Just need Docker installed? Run this:
./docker-scripts.sh start
```

That's it! The system will be running at **http://localhost:5200**

## 📋 Prerequisites

Only **Docker** and **Docker Compose** are required:

```bash
# Check if you have Docker
docker --version
docker-compose --version

# If not installed, get Docker Desktop:
# https://www.docker.com/products/docker-desktop
```

## 🎯 Three Ways to Run

### 1. 🧪 Test Mode (Recommended for Testing)
**No external dependencies required!**

```bash
# Option A: Use the convenience script
./docker-scripts.sh start

# Option B: Use Docker Compose directly  
docker-compose up -d raag-app
```

**Features:**
- ✅ Local file storage (no S3 needed)
- ✅ JSON database (no PostgreSQL needed)
- ✅ Sample data pre-loaded
- ✅ Ready in 30 seconds
- ✅ Access at: http://localhost:5200

### 2. 🚀 Production Mode (With PostgreSQL)
**Full production setup with database:**

```bash
# Start production mode with PostgreSQL
./docker-scripts.sh start-prod
```

**Features:**
- ✅ PostgreSQL database
- ✅ Production-ready configuration
- ✅ Persistent data storage
- ✅ Access at: http://localhost:5201
- ⚠️ Requires AWS S3 configuration

### 3. 🏗️ Custom Build
**Build and run manually:**

```bash
# Build the image
docker build -t raag-recording-system .

# Run test mode
docker run -p 5200:3000 -e USE_LOCAL_STORAGE=true raag-recording-system
```

## 📜 Docker Management Commands

The `docker-scripts.sh` provides easy management:

```bash
# Start/Stop
./docker-scripts.sh start          # Start test mode
./docker-scripts.sh start-prod     # Start production mode  
./docker-scripts.sh stop           # Stop all services

# Monitoring
./docker-scripts.sh status         # Check system health
./docker-scripts.sh logs           # View application logs
./docker-scripts.sh logs-prod      # View production logs

# Maintenance
./docker-scripts.sh shell          # Open shell in container
./docker-scripts.sh cleanup        # Remove everything
./docker-scripts.sh help           # Show all commands
```

## 🎵 Test Credentials

When running in test mode, use these credentials:

| Username | Role | Purpose |
|----------|------|---------|
| `performer1` | Performer | Upload tracks, create recordings |
| `approver1` | Approver | Review and approve recordings |
| `mixer1` | Mixer | Mix approved tracks |
| `narrator1` | Narrator | Record explanations |

## 📁 Docker File Structure

```
raag-recording-system/
├── Dockerfile              # Main application container
├── docker-compose.yml      # Multi-service orchestration
├── docker-scripts.sh       # Management convenience script
├── .dockerignore           # Files to exclude from build
└── local_storage/          # Persistent storage (created automatically)
```

## 🔧 Configuration Options

### Environment Variables

The Docker setup supports these configurations:

```yaml
# Test Mode (default)
USE_LOCAL_STORAGE: "true"
MAX_FILE_SIZE_MB: "100"
SUPPORTED_FORMATS: "wav,flac,aiff,mp3"

# Production Mode
USE_LOCAL_STORAGE: "false"
DB_HOST: "postgres"
AWS_ACCESS_KEY_ID: "your_key"
AWS_SECRET_ACCESS_KEY: "your_secret"
S3_BUCKET: "your_bucket"
```

### Volume Mounts

Data persistence through Docker volumes:

```yaml
volumes:
  - ./local_storage:/app/local_storage    # Audio files
  - ./test_data.json:/app/test_data.json  # Database
  - postgres_data:/var/lib/postgresql/data # PostgreSQL data
```

## 🏥 Health Monitoring

Built-in health checks:

```bash
# Check container health
docker ps

# Check application health
curl http://localhost:5200/api/health

# View health status
./docker-scripts.sh status
```

Response example:
```json
{
  "status": "healthy",
  "database": "file-based (test)",
  "storage": "local-storage (test)",
  "mode": "TEST",
  "version": "1.0.0"
}
```

## 🐛 Troubleshooting

### Port Already in Use
```bash
# Check what's using port 5200
lsof -i :5200

# Kill the process
./docker-scripts.sh stop

# Or use different port
docker run -p 5202:3000 raag-recording-system
```

### Container Won't Start
```bash
# Check logs
./docker-scripts.sh logs

# Rebuild if needed
docker-compose down
docker-compose build --no-cache
./docker-scripts.sh start
```

### Permission Issues
```bash
# Fix file permissions
sudo chown -R $USER:$USER local_storage/
chmod -R 755 local_storage/
```

### Out of Space
```bash
# Clean up Docker
docker system prune -a
./docker-scripts.sh cleanup
```

## 🔄 Development Workflow

### Hot Reload Development
```bash
# Run with live code updates
docker-compose -f docker-compose.dev.yml up
```

### Database Reset
```bash
# Reset test database
./docker-scripts.sh stop
rm test_data.json
./docker-scripts.sh start
```

### Production Migration
```bash
# Switch from test to production
./docker-scripts.sh stop
./docker-scripts.sh start-prod
```

## 🎯 Testing Scenarios

### 1. Quick Functionality Test
```bash
./docker-scripts.sh start
# Open http://localhost:5200
# Login as performer1
# Upload a file from sample_audio/
# Switch to approver1 and approve it
```

### 2. Multi-User Testing
```bash
# Terminal 1
./docker-scripts.sh start

# Terminal 2 
./docker-scripts.sh logs

# Open multiple browser tabs as different users
# Test real-time messaging and updates
```

### 3. File Upload Testing
```bash
# Create test audio file
ffmpeg -f lavfi -i "sine=frequency=440:duration=5" test.wav

# Upload through the UI or API
curl -X POST http://localhost:5200/api/upload \
  -F "audioFile=@test.wav" \
  -F "fileType=raw_track"
```

## 🚀 Production Deployment

### AWS S3 Setup
1. Create S3 bucket
2. Set CORS policy for uploads
3. Create IAM user with S3 permissions
4. Add credentials to `.env.production`

### SSL/HTTPS Setup
```bash
# Generate SSL certificates
mkdir ssl
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout ssl/key.pem -out ssl/cert.pem

# Update nginx.conf for HTTPS
```

### Scaling
```bash
# Run multiple app instances
docker-compose up --scale raag-app-prod=3

# Add load balancer
# Update nginx.conf for upstream servers
```

## 📊 Monitoring & Logs

### Log Locations
```bash
# Application logs
docker-compose logs raag-app

# Database logs  
docker-compose logs postgres

# All logs
docker-compose logs -f
```

### Metrics
```bash
# Container stats
docker stats

# Disk usage
du -sh local_storage/

# Database size
docker exec raag-postgres psql -U raag_user -d raag_recording_system -c "SELECT pg_size_pretty(pg_database_size('raag_recording_system'));"
```

## 🎵 What's Included

✅ **Complete Application** - All features working  
✅ **Sample Data** - Raags, shabads, users pre-loaded  
✅ **Test Files** - Sample audio files for uploads  
✅ **Health Checks** - Automatic monitoring  
✅ **Persistent Storage** - Data survives container restarts  
✅ **Real-time Features** - WebSocket communication  
✅ **Production Ready** - PostgreSQL + S3 support  
✅ **Security** - Non-root user, proper permissions  
✅ **Monitoring** - Logs, health checks, metrics  

## 🎯 Next Steps

1. **Start Testing**: `./docker-scripts.sh start` → http://localhost:5200
2. **Explore Features**: Try different user roles
3. **Upload Files**: Test the complete workflow
4. **Scale Up**: Move to production mode when ready

The Docker setup makes it incredibly easy to test, develop, and deploy the Raag Recording System! 🎵