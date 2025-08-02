#!/bin/bash

echo "🎵 Raag Recording System - Setup Verification"
echo "=============================================="

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found. Are you in the raag directory?"
    exit 1
fi

echo "✅ Repository cloned correctly"

# Check Docker
if command -v docker &> /dev/null; then
    echo "✅ Docker is installed"
    
    if command -v docker-compose &> /dev/null; then
        echo "✅ Docker Compose is installed"
        echo ""
        echo "🚀 Ready to run with Docker!"
        echo "   Command: ./docker-scripts.sh start"
        echo "   URL: http://localhost:5200"
    else
        echo "⚠️  Docker Compose not found"
    fi
else
    echo "⚠️  Docker not found"
fi

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo "✅ Node.js is installed: $NODE_VERSION"
    
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        echo "✅ npm is installed: $NPM_VERSION"
        echo ""
        echo "🚀 Ready to run manually!"
        echo "   Commands:"
        echo "   1. npm install"
        echo "   2. npm run test-setup"
        echo "   3. npm start"
        echo "   URL: http://localhost:5200"
    else
        echo "❌ npm not found"
    fi
else
    echo "❌ Node.js not found"
fi

echo ""
echo "📚 Documentation:"
echo "   - README.md (complete overview)"
echo "   - QUICKSTART.md (5-minute setup)"
echo "   - DOCKER.md (container deployment)"

echo ""
echo "🎯 Test Credentials:"
echo "   - performer1, approver1, mixer1, narrator1, admin"

echo ""
echo "✅ Verification complete! Choose your preferred setup method above."