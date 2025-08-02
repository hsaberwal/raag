# 🔌 Port Configuration Update Summary

## ✅ **All Ports Changed from 3000 → 5200**

To avoid conflicts with existing services on port 3000, all configurations have been updated to use port 5200 as the base port.

## 🎯 **New Port Assignments:**

### **Test Mode (Default)**
- **External Port**: `5200` 
- **Internal Port**: `3000` (inside container)
- **Access URL**: `http://localhost:5200`

### **Production Mode**
- **External Port**: `5201`
- **Internal Port**: `3000` (inside container)  
- **Access URL**: `http://localhost:5201`

### **PostgreSQL** (Production only)
- **Port**: `5432` (unchanged)

## 📝 **Files Updated:**

### **Docker Configuration**
- ✅ `docker-compose.yml` - Updated port mappings
- ✅ `docker-scripts.sh` - Updated all URL references
- ✅ `Dockerfile` - No changes needed (internal port stays 3000)

### **Documentation**
- ✅ `DOCKER.md` - Updated all examples and URLs
- ✅ `QUICKSTART.md` - Updated all port references
- ✅ `README.md` - No changes needed (generic instructions)

### **Configuration**
- ✅ `.env.test` - Updated PORT variable to 5200
- ✅ Server code automatically detects the PORT environment variable

## 🚀 **Quick Start Commands (Updated):**

```bash
# Docker method (recommended)
./docker-scripts.sh start
# → Opens at http://localhost:5200

# NPM method
npm run test-server
# → Also opens at http://localhost:5200 

# Manual Docker
docker-compose up -d raag-app
# → Available at http://localhost:5200
```

## 🔧 **Port Mapping Details:**

```yaml
# Test Mode
ports:
  - "5200:3000"  # host:container

# Production Mode  
ports:
  - "5201:3000"  # host:container
```

## ✅ **Verification:**

After starting the system, you can verify the new ports:

```bash
# Check if ports are available
lsof -i :5200
lsof -i :5201

# Health check on new port
curl http://localhost:5200/api/health

# Docker status
./docker-scripts.sh status
```

## 🎵 **Test Credentials (Unchanged):**

- Username: `performer1`, Role: `performer`
- Username: `approver1`, Role: `approver`
- Username: `mixer1`, Role: `mixer`  
- Username: `narrator1`, Role: `narrator`

## 🔗 **Access URLs:**

### **Test Mode**
```
🌐 Main Application: http://localhost:5200
🏥 Health Check: http://localhost:5200/api/health
📊 API Base: http://localhost:5200/api/
```

### **Production Mode**
```
🌐 Main Application: http://localhost:5201
🏥 Health Check: http://localhost:5201/api/health
📊 API Base: http://localhost:5201/api/
💾 PostgreSQL: localhost:5432
```

## 🎯 **No Breaking Changes:**

- All internal functionality remains the same
- Same Docker commands work
- Same login credentials
- Same features and workflow
- Only the external access port changed

Your existing service on port 3000 will continue running without any conflicts! 🎵