#!/bin/bash

# Raag Recording System - Docker Management Scripts

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Helper function for colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "\n${BLUE}🎵 Raag Recording System - Docker Manager${NC}\n"
}

# Check if Docker is installed
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install Docker first."
        exit 1
    fi

    if ! command -v docker-compose &> /dev/null; then
        print_error "Docker Compose is not installed. Please install Docker Compose first."
        exit 1
    fi
}

# Build the Docker image
build() {
    print_status "Building Raag Recording System Docker image..."
    docker build -t raag-recording-system .
    print_status "Build complete!"
}

# Start in test mode (default)
start_test() {
    print_header
    print_status "Starting Raag Recording System in TEST mode..."
    print_status "This mode uses local file storage and a simple JSON database."
    print_status "No external dependencies required!"
    
    docker-compose up -d raag-app
    
    print_status "Waiting for application to start..."
    sleep 10
    
    print_status "System is starting up!"
    print_status "🌐 Local Access:  http://localhost:5200"
print_status "🌍 Remote Access: http://YOUR_SERVER_IP:5200"
    print_status "📋 Test credentials:"
    print_status "   - Username: performer1, Role: performer"
    print_status "   - Username: approver1, Role: approver"
    print_status "   - Username: mixer1, Role: mixer"
    print_status "   - Username: narrator1, Role: narrator"
    
    echo -e "\n${GREEN}✅ System is ready for testing!${NC}\n"
}

# Start in production mode
start_production() {
    print_header
    print_status "Starting Raag Recording System in PRODUCTION mode..."
    print_warning "This mode requires PostgreSQL and AWS S3 configuration."
    
    # Check if .env file exists with AWS credentials
    if [ ! -f ".env.production" ]; then
        print_warning "Creating .env.production template..."
        cat > .env.production << EOF
# Production Environment Variables
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
S3_BUCKET=your-s3-bucket-name
JWT_SECRET=your_secure_jwt_secret
SESSION_SECRET=your_secure_session_secret
EOF
        print_warning "Please edit .env.production with your AWS credentials before starting."
        return 1
    fi
    
    # Load production environment
    export $(cat .env.production | grep -v '^#' | xargs)
    
    docker-compose --profile production up -d
    
    print_status "Production system starting..."
    print_status "🌐 Access the application at: http://localhost:5201"
    
    echo -e "\n${GREEN}✅ Production system is ready!${NC}\n"
}

# Stop all services
stop() {
    print_status "Stopping all Raag Recording System services..."
    docker-compose down
    docker-compose --profile production down
    print_status "All services stopped."
}

# View logs
logs() {
    print_status "Showing application logs..."
    docker-compose logs -f raag-app
}

# View logs for production
logs_prod() {
    print_status "Showing production application logs..."
    docker-compose --profile production logs -f raag-app-prod
}

# Clean up everything
cleanup() {
    print_warning "This will remove all containers, images, and volumes!"
    read -p "Are you sure? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
        print_status "Cleaning up..."
        docker-compose down -v
        docker-compose --profile production down -v
        docker rmi raag-recording-system 2>/dev/null || true
        docker volume prune -f
        print_status "Cleanup complete!"
    else
        print_status "Cleanup cancelled."
    fi
}

# Check system status
status() {
    print_header
    print_status "Checking system status..."
    
    echo -e "\n${BLUE}Docker Services:${NC}"
    docker-compose ps
    
    echo -e "\n${BLUE}Health Check:${NC}"
    if curl -f http://localhost:5200/api/health 2>/dev/null; then
        echo -e "${GREEN}✅ Test mode application is healthy${NC}"
    else
        echo -e "${RED}❌ Test mode application is not responding${NC}"
    fi
    
    if curl -f http://localhost:5201/api/health 2>/dev/null; then
        echo -e "${GREEN}✅ Production mode application is healthy${NC}"
    else
        echo -e "${YELLOW}⚠️  Production mode application is not running${NC}"
    fi
}

# Shell into container
shell() {
    print_status "Opening shell in raag-app container..."
    docker-compose exec raag-app sh
}

# Show help
help() {
    print_header
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  build          Build the Docker image"
    echo "  start          Start in test mode (default, no external deps)"
    echo "  start-prod     Start in production mode (requires PostgreSQL & AWS)"
    echo "  stop           Stop all services"
    echo "  logs           View application logs (test mode)"
    echo "  logs-prod      View application logs (production mode)"
    echo "  status         Check system status"
    echo "  shell          Open shell in container"
    echo "  cleanup        Remove all containers, images, and volumes"
    echo "  help           Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 start       # Quick start in test mode"
    echo "  $0 status      # Check if system is running"
    echo "  $0 logs        # View what's happening"
    echo ""
    echo "Test Mode (default):"
    echo "  🌐 Local:  http://localhost:5200"
  echo "  🌍 Remote: http://YOUR_SERVER_IP:5200"
    echo "  💾 Uses local file storage + JSON database"
    echo "  🧪 No AWS or PostgreSQL required"
    echo ""
    echo "Production Mode:"
    echo "  🌐 http://localhost:5201"
    echo "  💾 Uses PostgreSQL + AWS S3"
    echo "  🔐 Requires .env.production configuration"
}

# Main script logic
main() {
    check_docker
    
    case "${1:-start}" in
        "build")
            build
            ;;
        "start"|"test")
            start_test
            ;;
        "start-prod"|"production")
            start_production
            ;;
        "stop")
            stop
            ;;
        "logs")
            logs
            ;;
        "logs-prod")
            logs_prod
            ;;
        "status")
            status
            ;;
        "shell")
            shell
            ;;
        "cleanup")
            cleanup
            ;;
        "help"|"--help"|"-h")
            help
            ;;
        *)
            print_error "Unknown command: $1"
            help
            exit 1
            ;;
    esac
}

# Run main function with all arguments
main "$@"