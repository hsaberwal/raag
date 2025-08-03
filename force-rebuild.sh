#!/bin/bash
# Force complete Docker rebuild

echo "🧹 Cleaning all Docker artifacts..."
docker-compose down --volumes --remove-orphans
docker system prune -f --volumes
docker builder prune -f

echo "🔄 Force rebuilding with no cache..."
docker-compose build --no-cache --pull

echo "🚀 Starting fresh containers..."
docker-compose up -d

echo "⏳ Waiting for startup..."
sleep 15

echo "🩺 Testing endpoints..."
curl -s http://localhost:5200/api/health | jq
echo ""
curl -s http://localhost:5200/api/shabads | head -100
