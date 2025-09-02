#!/bin/bash

set -e

echo "🚀 Starting deployment..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
  echo "❌ Docker is not installed on the server"
  exit 1
fi

# Check Docker permissions
if ! docker info &> /dev/null; then
  echo "❌ Docker permission denied. User may not be in docker group"
  exit 1
fi

echo "✅ Docker is available"

# Pull latest image
echo "📦 Pulling latest image..."
docker pull docker.io/themobileprof/tmp-express:latest

# Verify image was pulled
echo "🔍 Verifying image..."
if ! docker images | grep -q "themobileprof/tmp-express"; then
  echo "❌ Failed to pull image"
  echo "📋 Available images:"
  docker images || true
  exit 1
fi

echo "✅ Image pulled successfully"

# Stop and remove existing container
echo "🛑 Stopping existing container..."
docker stop themobileprof-backend || true
docker rm themobileprof-backend || true

# Check uploads directory
echo "📁 Checking uploads directory..."
UPLOADS_DIR="/var/www/api.themobileprof.com/uploads"

# Only create directory if it doesn't exist
if [ ! -d "$UPLOADS_DIR" ]; then
  echo "📁 Creating uploads directory..."
  if mkdir -p "$UPLOADS_DIR" 2>/dev/null; then
    echo "✅ Created uploads directory"
  else
    echo "⚠️  Cannot create /var/www/api.themobileprof.com/uploads, using home directory"
    UPLOADS_DIR="$HOME/themobileprof-uploads"
    mkdir -p "$UPLOADS_DIR"
    echo "✅ Created uploads directory in home: $UPLOADS_DIR"
  fi
else
  echo "✅ Uploads directory already exists: $UPLOADS_DIR"
fi

# Verify uploads directory is accessible (don't try to change permissions)
if [ ! -d "$UPLOADS_DIR" ]; then
  echo "❌ Uploads directory does not exist: $UPLOADS_DIR"
  exit 1
fi

echo "📁 Using uploads directory: $UPLOADS_DIR"

# Create .env file from GitHub secret
echo "📝 Creating .env file..."
cat > .env << 'EOF'
***
***

***
***
***

***
***
***

***
***
***

***
***
***
***
***
***
***

***
***
***

***
***
*** 

***
***
***
***
EOF

# Verify .env file was created
if [ ! -f .env ] || [ ! -s .env ]; then
  echo "❌ .env file was not created or is empty"
  echo "📋 Current directory contents:"
  ls -la || true
  exit 1
fi

echo "✅ .env file created successfully"
echo "📋 .env file size: $(wc -c < .env) bytes"

# Run new container with host networking
echo "🐳 Starting new container with host networking..."
echo "📋 Container command: docker run -d --name themobileprof-backend --restart unless-stopped --network host -v \"$UPLOADS_DIR:/app/uploads\" --env-file .env -e RUN_INIT_SETTINGS=true -e RUN_SEED=${RUN_SEED:-false} docker.io/themobileprof/tmp-express:latest"

# Start container and capture the container ID
echo "🐳 Starting container..."
CONTAINER_ID=$(docker run -d \
  --name themobileprof-backend \
  --restart unless-stopped \
  --network host \
  -v "$UPLOADS_DIR:/app/uploads" \
  --env-file .env \
  -e RUN_INIT_SETTINGS=true \
  -e RUN_SEED=${RUN_SEED:-false} \
  docker.io/themobileprof/tmp-express:latest)

if [ -z "$CONTAINER_ID" ]; then
  echo "❌ Failed to start container - no container ID returned"
  echo "📋 Trying to get more information..."
  echo "📋 Docker images:"
  docker images | grep themobileprof/tmp-express || true
  echo "📋 Recent containers:"
  docker ps -a --last 5 || true
  echo "📋 Docker system info:"
  docker system df || true
  exit 1
fi

echo "✅ Container started with ID: $CONTAINER_ID"

# Wait a moment and check container status
sleep 5

# Check if container is running
if ! docker ps | grep -q themobileprof-backend; then
  echo "❌ Container failed to start"
  echo "📋 Container logs:"
  docker logs themobileprof-backend || true
  echo "📋 Recent container status:"
  docker ps -a | grep themobileprof-backend || true
  echo "📋 Docker system info:"
  docker system df || true
  echo "📋 Available images:"
  docker images | grep themobileprof/tmp-express || true
  exit 1
fi

echo "✅ Container is running"

# Show container logs for debugging
echo "📋 Container logs:"
docker logs themobileprof-backend --tail 20 || true

# Clean up .env file
rm -f .env

# Wait a moment for container to fully start
echo "⏳ Waiting for container to start..."
sleep 10

# Check if container is running
echo "🔍 Checking container status..."
if ! docker ps | grep -q themobileprof-backend; then
  echo "❌ Container failed to start"
  echo "📋 Container logs:"
  docker logs themobileprof-backend --tail 50 || true
  echo "📋 Recent container status:"
  docker ps -a | grep themobileprof-backend || true
  echo "📋 Docker system info:"
  docker system df || true
  echo "📋 Available images:"
  docker images | grep themobileprof/tmp-express || true
  exit 1
fi

echo "✅ Container is running"

# Show container logs for debugging
echo "📋 Container logs:"
docker logs themobileprof-backend --tail 20 || true

# Perform health check with retries
echo "🏥 Performing health check..."
for i in {1..5}; do
  echo "Health check attempt $i/5"
  if curl -f -m 30 http://localhost:3000/health; then
    echo "✅ Health check passed"
    break
  else
    echo "❌ Health check failed, attempt $i"
    echo "📋 Container logs (last 10 lines):"
    docker logs themobileprof-backend --tail 10 || true
    if [ $i -lt 5 ]; then
      echo "⏳ Waiting 10 seconds before retry..."
      sleep 10
    else
      echo "❌ Health check failed after 5 attempts"
      echo "📋 Final container logs:"
      docker logs themobileprof-backend --tail 50 || true
      exit 1
    fi
  fi
done

echo "🎉 Deployment completed successfully!" 