#!/bin/bash

# Setup script for uploads directory on production server
# This script creates the necessary directories and sets proper permissions

set -e

echo "🚀 Setting up uploads directory for TheMobileProf LMS..."

# Configuration
UPLOADS_DIR="/var/www/api.themobileprof.com/uploads"
SUBDIRS=("screenshots" "course-images" "lesson-materials" "user-avatars" "certificates" "question-images")

# Check if running as root
if [[ $EUID -eq 0 ]]; then
   echo "❌ This script should not be run as root"
   echo "   Please run as a regular user with sudo privileges"
   exit 1
fi

# Create main uploads directory
echo "📁 Creating main uploads directory..."
sudo mkdir -p "$UPLOADS_DIR"

# Create subdirectories
echo "📁 Creating subdirectories..."
for dir in "${SUBDIRS[@]}"; do
    sudo mkdir -p "$UPLOADS_DIR/$dir"
    echo "   Created: $UPLOADS_DIR/$dir"
done

# Set ownership to current user
echo "👤 Setting ownership..."
sudo chown -R "$USER:$USER" "$UPLOADS_DIR"

# Set permissions
echo "🔐 Setting permissions..."
sudo chmod -R 755 "$UPLOADS_DIR"

# Verify setup
echo "✅ Verifying setup..."
if [ -d "$UPLOADS_DIR" ]; then
    echo "   Main directory exists: $UPLOADS_DIR"
    for dir in "${SUBDIRS[@]}"; do
        if [ -d "$UPLOADS_DIR/$dir" ]; then
            echo "   Subdirectory exists: $UPLOADS_DIR/$dir"
        else
            echo "   ❌ Subdirectory missing: $UPLOADS_DIR/$dir"
            exit 1
        fi
    done
else
    echo "   ❌ Main directory missing: $UPLOADS_DIR"
    exit 1
fi

# Check permissions
echo "🔍 Checking permissions..."
ls -la "$UPLOADS_DIR"

echo ""
echo "🎉 Uploads directory setup complete!"
echo ""
echo "📋 Next steps:"
echo "   1. Deploy your application via GitHub Actions"
echo "   2. The uploads directory will be automatically mapped"
echo "   3. Files will persist across deployments"
echo ""
echo "📁 Directory structure:"
echo "   $UPLOADS_DIR/"
for dir in "${SUBDIRS[@]}"; do
    echo "   ├── $dir/"
done
echo ""
echo "🔗 Files will be accessible at:"
echo "   https://api.themobileprof.com/uploads/[type]/[filename]" 