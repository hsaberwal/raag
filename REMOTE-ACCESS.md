# 🌐 Remote Access Guide - Raag Recording System

## ✅ **FIXED! Remote Access Now Enabled**

The application now binds to `0.0.0.0` instead of `localhost`, enabling remote access from other machines.

## 🚀 **Get the Fix:**

```bash
cd raag
git pull origin main  # Get the remote access fix
./docker-scripts.sh stop  # Stop current container
./docker-scripts.sh start  # Restart with new configuration
```

## 🌐 **Access URLs:**

- **Local Access**: http://localhost:5200
- **Remote Access**: http://YOUR_SERVER_IP:5200

Replace `YOUR_SERVER_IP` with your actual server's IP address.

## 🔧 **What Was Fixed:**

### **1. Server Binding**
- **Before**: `server.listen(PORT)` → Only localhost access
- **After**: `server.listen(PORT, '0.0.0.0')` → All network interfaces

### **2. Environment Variables**
- Added `HOST=0.0.0.0` to `.env.test`
- Added `HOST=0.0.0.0` to `docker-compose.yml`
- Server now logs both local and remote URLs

### **3. Docker Configuration**
- Port mapping: `5200:3000` (external:internal)
- Host binding: `0.0.0.0` for all interfaces
- Health check updated for container networking

## 📋 **Quick Test:**

### **From Local Machine:**
```bash
curl http://localhost:5200/api/health
```

### **From Remote Machine:**
```bash
curl http://YOUR_SERVER_IP:5200/api/health
```

Both should return:
```json
{
  "status": "healthy",
  "mode": "TEST",
  "storage": "local",
  "database": "file-based"
}
```

## 🌍 **Finding Your Server IP:**

### **On Linux/Mac:**
```bash
# Public IP
curl ifconfig.me

# Local network IP
ip addr show | grep inet
```

### **On Docker Host:**
```bash
# Docker container IP
docker inspect raag-recording-system | grep IPAddress
```

## 🔥 **Firewall Configuration:**

Make sure port 5200 is open on your server:

### **UFW (Ubuntu):**
```bash
sudo ufw allow 5200
sudo ufw reload
```

### **iptables:**
```bash
sudo iptables -A INPUT -p tcp --dport 5200 -j ACCEPT
```

### **Cloud Providers:**
- **AWS**: Add port 5200 to Security Group
- **GCP**: Create firewall rule for port 5200
- **Azure**: Add port 5200 to Network Security Group

## 🎯 **Troubleshooting:**

### **Issue**: Can't access remotely
**Solution**: 
1. Check firewall: `sudo ufw status`
2. Verify container is running: `docker ps`
3. Check server binding: `docker logs raag-recording-system`
4. Test locally first: `curl localhost:5200/api/health`

### **Issue**: Connection refused
**Solution**:
1. Restart Docker service: `sudo systemctl restart docker`
2. Rebuild container: `./docker-scripts.sh stop && ./docker-scripts.sh start`
3. Check port conflicts: `netstat -tulpn | grep 5200`

### **Issue**: Slow loading from remote
**Solution**:
1. Check network latency: `ping YOUR_SERVER_IP`
2. Consider using nginx proxy for better performance
3. Optimize client-side caching

## 🎵 **Production Deployment:**

For production with proper domain and SSL:

```bash
# Use production mode with nginx
./docker-scripts.sh start_production

# Or manual setup with reverse proxy
sudo apt install nginx
sudo nano /etc/nginx/sites-available/raag
```

Example nginx config:
```nginx
server {
    listen 80;
    server_name your-domain.com;
    
    location / {
        proxy_pass http://localhost:5200;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## ✅ **Success Indicators:**

When working correctly, you'll see:
- ✅ Docker logs show: `server running on 0.0.0.0:3000`
- ✅ Health check responds from remote IP
- ✅ Web interface loads from remote browser
- ✅ Real-time features work (WebSocket connections)
- ✅ File uploads work from remote clients

## 🎉 **You're Ready!**

The Raag Recording System is now accessible from anywhere on your network or the internet (depending on your firewall configuration).

**Test it**: Open http://YOUR_SERVER_IP:5200 in a browser from another machine!