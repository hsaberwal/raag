# Raag Recording System Dockerfile
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Install system dependencies for audio processing
RUN apk add --no-cache \
    ffmpeg \
    curl \
    bash

# Copy package files
COPY package*.json ./

# Install Node.js dependencies
RUN npm ci --only=production

# Copy application code
COPY . .

# Create necessary directories
RUN mkdir -p local_storage temp_uploads sample_audio

# Set proper permissions
RUN chmod +x test-setup.js
RUN chmod -R 755 local_storage temp_uploads sample_audio

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S raag -u 1001
RUN chown -R raag:nodejs /app

# Switch to non-root user
USER raag

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Default command (can be overridden)
CMD ["npm", "start"]