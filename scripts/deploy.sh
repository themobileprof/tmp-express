#!/bin/bash

# Production deployment script for TheMobileProf Backend
# This script pulls the latest image from Docker Hub and deploys it

set -e

# Configuration - All configurable via environment variables
IMAGE_NAME=${DOCKERHUB_USERNAME:-your-username}/themobileprof-backend
CONTAINER_NAME=${CONTAINER_NAME:-themobileprof-backend}
NETWORK_NAME=${NETWORK_NAME:-themobileprof-network}
VOLUME_NAME=${VOLUME_NAME:-themobileprof-uploads}
DB_CONTAINER_NAME=${DB_CONTAINER_NAME:-themobileprof-db}
DB_VOLUME_NAME=${DB_VOLUME_NAME:-themobileprof-db-data}
DB_PORT=${DB_PORT:-5432}
APP_PORT=${APP_PORT:-3000}
POSTGRES_VERSION=${POSTGRES_VERSION:-15}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if .env file exists
if [ ! -f .env ]; then
    log_error ".env file not found. Please create one based on env.example"
    exit 1
fi

# Load environment variables
source .env

# Check required environment variables
required_vars=("JWT_SECRET" "EMAIL_HOST" "EMAIL_USER" "EMAIL_PASS" "DATABASE_URL")
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        log_error "Required environment variable $var is not set"
        exit 1
    fi
done

# Function to check if container exists
container_exists() {
    docker ps -a --format 'table {{.Names}}' | grep -q "^$1$"
}

# Function to check if container is running
container_running() {
    docker ps --format 'table {{.Names}}' | grep -q "^$1$"
}

# Function to stop and remove container
stop_and_remove_container() {
    local container_name=$1
    if container_exists "$container_name"; then
        log_info "Stopping container: $container_name"
        docker stop "$container_name" 2>/dev/null || true
        log_info "Removing container: $container_name"
        docker rm "$container_name" 2>/dev/null || true
    fi
}

# Function to create network if it doesn't exist
create_network() {
    if ! docker network ls --format 'table {{.Name}}' | grep -q "^$NETWORK_NAME$"; then
        log_info "Creating Docker network: $NETWORK_NAME"
        docker network create "$NETWORK_NAME"
    fi
}

# Function to create volume if it doesn't exist
create_volume() {
    local volume_name=$1
    if ! docker volume ls --format 'table {{.Name}}' | grep -q "^$volume_name$"; then
        log_info "Creating Docker volume: $volume_name"
        docker volume create "$volume_name"
    fi
}

# Main deployment function
deploy() {
    log_info "🚀 Starting production deployment..."
    log_info "Configuration:"
    log_info "  Image: $IMAGE_NAME:latest"
    log_info "  Container: $CONTAINER_NAME"
    log_info "  Network: $NETWORK_NAME"
    log_info "  App Port: $APP_PORT"
    log_info "  DB Port: $DB_PORT"
    echo ""

    # Create network and volumes
    create_network
    create_volume "$VOLUME_NAME"
    create_volume "$DB_VOLUME_NAME"

    # Pull latest image
    log_info "📦 Pulling latest image from Docker Hub..."
    docker pull "$IMAGE_NAME:latest"

    # Check if we should deploy database
    if [ "$DEPLOY_DB" = "true" ] || [ -z "$DEPLOY_DB" ]; then
        log_info "🗄️  Deploying PostgreSQL database..."
        
        # Stop and remove existing database container
        stop_and_remove_container "$DB_CONTAINER_NAME"
        
        # Run PostgreSQL container
        docker run -d \
            --name "$DB_CONTAINER_NAME" \
            --network "$NETWORK_NAME" \
            --restart unless-stopped \
            -e POSTGRES_DB=${POSTGRES_DB:-themobileprof} \
            -e POSTGRES_USER=${POSTGRES_USER:-themobileprof} \
            -e POSTGRES_PASSWORD=${POSTGRES_PASSWORD:-your-secure-password} \
            -v "$DB_VOLUME_NAME:/var/lib/postgresql/data" \
            -p $DB_PORT:5432 \
            --health-cmd="pg_isready -U ${POSTGRES_USER:-themobileprof}" \
            --health-interval=10s \
            --health-timeout=5s \
            --health-retries=5 \
            postgres:$POSTGRES_VERSION

        # Wait for database to be healthy
        log_info "⏳ Waiting for database to be ready..."
        until docker inspect --format='{{.State.Health.Status}}' "$DB_CONTAINER_NAME" | grep -q "healthy"; do
            log_info "Database not ready yet, waiting..."
            sleep 5
        done
        log_success "Database is ready!"
    else
        log_info "Skipping database deployment (DEPLOY_DB=false)"
    fi

    # Stop and remove existing application container
    log_info "🔄 Updating application container..."
    stop_and_remove_container "$CONTAINER_NAME"

    # Run the new application container
    log_info "🚀 Starting new application container..."
    docker run -d \
        --name "$CONTAINER_NAME" \
        --network "$NETWORK_NAME" \
        --restart unless-stopped \
        -e NODE_ENV=production \
        -e PORT=${PORT:-3000} \
        -e DATABASE_URL=${DATABASE_URL} \
        -e JWT_SECRET=${JWT_SECRET} \
        -e JWT_EXPIRES_IN=${JWT_EXPIRES_IN:-24h} \
        -e BCRYPT_ROUNDS=${BCRYPT_ROUNDS:-12} \
        -e EMAIL_SERVICE_API_KEY=${EMAIL_SERVICE_API_KEY} \
        -e EMAIL_FROM_ADDRESS=${EMAIL_FROM_ADDRESS} \
        -e EMAIL_HOST=${EMAIL_HOST} \
        -e EMAIL_PORT=${EMAIL_PORT} \
        -e EMAIL_USER=${EMAIL_USER} \
        -e EMAIL_PASS=${EMAIL_PASS} \
        -e SPONSORSHIP_CODE_LENGTH=${SPONSORSHIP_CODE_LENGTH:-10} \
        -e MAX_SPONSORSHIP_DURATION_MONTHS=${MAX_SPONSORSHIP_DURATION_MONTHS:-12} \
        -e RATE_LIMIT_WINDOW_MS=${RATE_LIMIT_WINDOW_MS:-900000} \
        -e RATE_LIMIT_MAX_REQUESTS=${RATE_LIMIT_MAX_REQUESTS:-100} \
        -e MAX_FILE_SIZE=${MAX_FILE_SIZE:-5242880} \
        -e UPLOAD_PATH=${UPLOAD_PATH:-./uploads} \
        -v "$VOLUME_NAME:/app/uploads" \
        -p $APP_PORT:3000 \
        --health-cmd="curl -f http://localhost:3000/health || exit 1" \
        --health-interval=30s \
        --health-timeout=10s \
        --health-retries=3 \
        "$IMAGE_NAME:latest"

    # Wait for application to be healthy
    log_info "⏳ Waiting for application to be ready..."
    until docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME" | grep -q "healthy"; do
        log_info "Application not ready yet, waiting..."
        sleep 10
    done

    log_success "✅ Deployment completed successfully!"
    log_info "🌐 Application is running on http://localhost:$APP_PORT"
    log_info "🗄️  Database is running on localhost:$DB_PORT"
}

# Function to show deployment status
status() {
    log_info "📊 Deployment Status:"
    echo ""
    
    # Application container status
    if container_running "$CONTAINER_NAME"; then
        log_success "Application: Running"
        echo "  Container: $CONTAINER_NAME"
        echo "  Image: $(docker inspect --format='{{.Config.Image}}' "$CONTAINER_NAME")"
        echo "  Port: $(docker port "$CONTAINER_NAME" | head -1)"
        echo "  Health: $(docker inspect --format='{{.State.Health.Status}}' "$CONTAINER_NAME")"
    else
        log_error "Application: Not running"
    fi
    
    echo ""
    
    # Database container status
    if container_running "$DB_CONTAINER_NAME"; then
        log_success "Database: Running"
        echo "  Container: $DB_CONTAINER_NAME"
        echo "  Port: $(docker port "$DB_CONTAINER_NAME" | head -1)"
        echo "  Health: $(docker inspect --format='{{.State.Health.Status}}' "$DB_CONTAINER_NAME")"
    else
        log_warning "Database: Not running"
    fi
}

# Function to show logs
logs() {
    local container=${1:-$CONTAINER_NAME}
    log_info "📋 Showing logs for: $container"
    docker logs -f "$container"
}

# Function to rollback to previous version
rollback() {
    log_warning "🔄 Rolling back to previous version..."
    
    # Get the previous image tag
    local previous_tag=$(docker images "$IMAGE_NAME" --format "table {{.Tag}}" | grep -v "latest" | head -1)
    
    if [ -z "$previous_tag" ]; then
        log_error "No previous version found to rollback to"
        exit 1
    fi
    
    log_info "Rolling back to: $IMAGE_NAME:$previous_tag"
    
    # Stop and remove current container
    stop_and_remove_container "$CONTAINER_NAME"
    
    # Run the previous version
    docker run -d \
        --name "$CONTAINER_NAME" \
        --network "$NETWORK_NAME" \
        --restart unless-stopped \
        -e NODE_ENV=production \
        -e PORT=${PORT:-3000} \
        -e DATABASE_URL=${DATABASE_URL} \
        -e JWT_SECRET=${JWT_SECRET} \
        -e JWT_EXPIRES_IN=${JWT_EXPIRES_IN:-24h} \
        -e BCRYPT_ROUNDS=${BCRYPT_ROUNDS:-12} \
        -e EMAIL_SERVICE_API_KEY=${EMAIL_SERVICE_API_KEY} \
        -e EMAIL_FROM_ADDRESS=${EMAIL_FROM_ADDRESS} \
        -e EMAIL_HOST=${EMAIL_HOST} \
        -e EMAIL_PORT=${EMAIL_PORT} \
        -e EMAIL_USER=${EMAIL_USER} \
        -e EMAIL_PASS=${EMAIL_PASS} \
        -e SPONSORSHIP_CODE_LENGTH=${SPONSORSHIP_CODE_LENGTH:-10} \
        -e MAX_SPONSORSHIP_DURATION_MONTHS=${MAX_SPONSORSHIP_DURATION_MONTHS:-12} \
        -e RATE_LIMIT_WINDOW_MS=${RATE_LIMIT_WINDOW_MS:-900000} \
        -e RATE_LIMIT_MAX_REQUESTS=${RATE_LIMIT_MAX_REQUESTS:-100} \
        -e MAX_FILE_SIZE=${MAX_FILE_SIZE:-5242880} \
        -e UPLOAD_PATH=${UPLOAD_PATH:-./uploads} \
        -v "$VOLUME_NAME:/app/uploads" \
        -p $APP_PORT:3000 \
        "$IMAGE_NAME:$previous_tag"
    
    log_success "✅ Rollback completed!"
}

# Function to show help
show_help() {
    echo "Usage: $0 [COMMAND]"
    echo ""
    echo "Commands:"
    echo "  deploy     Deploy the latest version from Docker Hub"
    echo "  status     Show deployment status"
    echo "  logs       Show application logs"
    echo "  logs db    Show database logs"
    echo "  rollback   Rollback to previous version"
    echo "  help       Show this help message"
    echo ""
    echo "Environment variables:"
    echo "  DOCKERHUB_USERNAME        Your Docker Hub username (default: your-username)"
    echo "  DEPLOY_DB                 Set to 'false' to skip database deployment"
    echo "  CONTAINER_NAME            Application container name (default: themobileprof-backend)"
    echo "  DB_CONTAINER_NAME         Database container name (default: themobileprof-db)"
    echo "  NETWORK_NAME              Docker network name (default: themobileprof-network)"
    echo "  VOLUME_NAME               Uploads volume name (default: themobileprof-uploads)"
    echo "  DB_VOLUME_NAME            Database volume name (default: themobileprof-db-data)"
    echo "  APP_PORT                  Application port (default: 3000)"
    echo "  DB_PORT                   Database port (default: 5432)"
    echo "  POSTGRES_VERSION          PostgreSQL version (default: 15)"
    echo ""
    echo "Examples:"
    echo "  $0 deploy"
    echo "  $0 status"
    echo "  $0 logs"
    echo "  DEPLOY_DB=false $0 deploy"
    echo "  APP_PORT=8080 DB_PORT=5433 $0 deploy"
    echo "  CONTAINER_NAME=myapp-backend $0 deploy"
}

# Main script logic
case "${1:-deploy}" in
    deploy)
        deploy
        ;;
    status)
        status
        ;;
    logs)
        logs "$2"
        ;;
    rollback)
        rollback
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac