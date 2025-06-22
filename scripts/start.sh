#!/bin/sh

set -e  # Exit on any error

echo "🚀 Starting TheMobileProf Backend..."

# Check if DATABASE_URL is set
if [ -z "$DATABASE_URL" ]; then
    echo "❌ DATABASE_URL environment variable is not set"
    exit 1
fi

# Run database migration
echo "📋 Running database migration..."
node src/database/migrate.js

if [ $? -ne 0 ]; then
    echo "❌ Database migration failed"
    exit 1
fi

echo "✅ Database migration completed"

# Start the server
echo "🌐 Starting server..."
exec node src/server.js 