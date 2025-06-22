# Use official Node.js LTS image
FROM node:18-alpine

# Install system dependencies and PostgreSQL client
RUN apk add --no-cache \
    postgresql-client \
    curl \
    && rm -rf /var/cache/apk/*

# Create non-root user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# Set working directory
WORKDIR /app

# Copy package files first for better caching
COPY package*.json ./

# Install dependencies with production optimizations
# Using npm install with explicit flags for better CI compatibility
RUN npm install --omit=dev --no-audit --no-fund --production --prefer-offline && \
    npm cache clean --force

# Copy application code
COPY . .

# Create necessary directories and set permissions
RUN mkdir -p uploads data && \
    chown -R nodejs:nodejs /app && \
    chmod +x scripts/start.sh

# Switch to non-root user
USER nodejs

# Expose the port
EXPOSE 3000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=5 \
    CMD curl -f http://localhost:3000/health || exit 1

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3000

# Start the application with migration
CMD ["scripts/start.sh"] 