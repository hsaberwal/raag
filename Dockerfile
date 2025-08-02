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
RUN npm install --omit=dev

# Copy application code
COPY . .

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S raag -u 1001

# Create necessary directories and set permissions
RUN mkdir -p local_storage temp_uploads sample_audio
RUN chmod +x test-setup.js
RUN chown -R raag:nodejs /app
RUN chmod -R 775 /app

# Switch to non-root user
USER raag

# Expose port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:3000/api/health || exit 1

# Default command (can be overridden)
CMD ["npm", "start"]