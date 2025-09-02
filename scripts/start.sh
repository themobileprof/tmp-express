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

# Initialize system settings (idempotent)
if [ "${RUN_INIT_SETTINGS:-true}" = "true" ]; then
  echo "🔧 Initializing system settings..."
  node scripts/init-system-settings.js || {
    echo "⚠️  System settings initialization failed (continuing)";
  }
fi

# Optional seed data (idempotent)
if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "🌱 Seeding database..."
  node src/database/seed.js || {
    echo "⚠️  Database seeding failed (continuing)";
  }
fi

# Start the server
echo "🌐 Starting server..."
exec node src/server.js 