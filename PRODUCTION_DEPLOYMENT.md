# Production Deployment Guide

This guide explains how to deploy TheMobileProf Backend to production using GitHub Actions, Docker Hub, and the enhanced Dockerfile.

## Overview

The deployment process uses:
1. **GitHub Actions** - Builds and pushes Docker images to Docker Hub on push to main
2. **Docker Hub** - Stores the containerized application
3. **Production Server** - Pulls and runs the latest image

## GitHub Actions Setup

### Required Repository Secrets

Add these secrets to your GitHub repository (`Settings > Secrets and variables > Actions`):

| Secret Name | Description | Example |
|-------------|-------------|---------|
| `DOCKERHUB_USERNAME` | Your Docker Hub username | `your-username` |
| `DOCKERHUB_TOKEN` | Docker Hub access token | `dckr_pat_...` |

### Creating Docker Hub Token

1. Go to [Docker Hub](https://hub.docker.com/)
2. Navigate to `Account Settings > Security`
3. Click `New Access Token`
4. Give it a name (e.g., "GitHub Actions")
5. Copy the token and add it as `DOCKERHUB_TOKEN` secret

### Workflow Features

The GitHub Actions workflow (`/.github/workflows/deploy.yml`) includes:

- ✅ **Multi-platform builds** (linux/amd64, linux/arm64)
- ✅ **Automatic tagging** (latest, branch, commit, semantic versioning)
- ✅ **Build caching** for faster builds
- ✅ **Security scanning** with Trivy
- ✅ **Pull request testing** with temporary PostgreSQL service
- ✅ **Vulnerability reporting** to GitHub Security tab

## Production Deployment

### 1. Server Setup

Ensure your production server has:
- Docker installed
- Access to Docker Hub
- Environment variables configured

### 2. Environment Configuration

Create a `.env` file on your production server:

```bash
# Copy the example
cp env.example .env

# Edit with production values
nano .env
```

Required environment variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Security
JWT_SECRET=your-super-secure-jwt-secret
BCRYPT_ROUNDS=12

# Email
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM_ADDRESS=noreply@yourdomain.com

# Application
NODE_ENV=production
PORT=3000

# Docker Hub (optional, for custom image names)
DOCKERHUB_USERNAME=your-username
```

### 3. Automated Deployment

Use the deployment script to automatically pull and deploy the latest image:

```bash
# Make script executable
chmod +x scripts/deploy.sh

# Deploy latest version
./scripts/deploy.sh deploy

# Check status
./scripts/deploy.sh status

# View logs
./scripts/deploy.sh logs
```

### 4. Manual Deployment

If you prefer manual deployment:

```bash
# Pull latest image
docker pull your-username/themobileprof-backend:latest

# Run with external database
docker run -d \
  --name themobileprof-backend \
  --restart unless-stopped \
  -p 3000:3000 \
  -v themobileprof-uploads:/app/uploads \
  --env-file .env \
  your-username/themobileprof-backend:latest
```

## Deployment Script Commands

The deployment script (`scripts/deploy.sh`) provides several commands:

### Deploy Latest Version
```bash
./scripts/deploy.sh deploy
```

### Check Status
```bash
./scripts/deploy.sh status
```

### View Logs
```bash
# Application logs
./scripts/deploy.sh logs

# Database logs
./scripts/deploy.sh logs db
```

### Rollback
```bash
./scripts/deploy.sh rollback
```

### Help
```bash
./scripts/deploy.sh help
```

## CI/CD Pipeline

### Development Workflow

1. **Create feature branch**
   ```bash
   git checkout -b feature/new-feature
   ```

2. **Make changes and commit**
   ```bash
   git add .
   git commit -m "Add new feature"
   ```

3. **Push to GitHub**
   ```bash
   git push origin feature/new-feature
   ```

4. **Create Pull Request**
   - GitHub Actions will run tests with temporary PostgreSQL
   - Build Docker image (not pushed to Hub)
   - Run security scans

### Production Deployment

1. **Merge to main**
   - GitHub Actions builds and pushes to Docker Hub
   - Security scan runs
   - Image tagged as `latest`

2. **Deploy to production**
   ```bash
   ./scripts/deploy.sh deploy
   ```

## Image Tags

The workflow creates multiple tags:

- `latest` - Latest main branch build
- `main` - Main branch builds
- `main-<sha>` - Specific commit builds
- `v1.0.0` - Semantic version tags
- `v1.0` - Major.minor version tags

## Security Features

### Vulnerability Scanning
- **Trivy** scans every image for vulnerabilities
- Results uploaded to GitHub Security tab
- Scans run on main branch pushes

### Image Security
- Non-root user execution
- Minimal base image (Alpine Linux)
- No unnecessary packages
- Regular security updates

## Monitoring & Health Checks

### Health Endpoints
- Application: `GET /health`
- Docker health checks configured
- Automatic restart on failure

### Logging
```bash
# View application logs
docker logs themobileprof-backend

# Follow logs
docker logs -f themobileprof-backend

# View last 100 lines
docker logs --tail 100 themobileprof-backend
```

### Status Monitoring
```bash
# Check container status
docker ps

# Check resource usage
docker stats themobileprof-backend

# Check health status
docker inspect themobileprof-backend | grep Health -A 10
```

## Scaling

### Horizontal Scaling
Run multiple instances behind a load balancer:

```bash
# Instance 1
docker run -d --name themobileprof-backend-1 -p 3001:3000 --env-file .env your-username/themobileprof-backend:latest

# Instance 2
docker run -d --name themobileprof-backend-2 -p 3002:3000 --env-file .env your-username/themobileprof-backend:latest
```

### Load Balancer Configuration
Use nginx or traefik:

```nginx
upstream backend {
    server localhost:3001;
    server localhost:3002;
}

server {
    listen 80;
    location / {
        proxy_pass http://backend;
    }
}
```

## Backup & Recovery

### Database Backup
```bash
# For self-hosted PostgreSQL
docker exec themobileprof-db pg_dump -U themobileprof themobileprof > backup.sql

# For managed databases, use your provider's backup tools
```

### Application Data Backup
```bash
# Backup uploads
docker run --rm -v themobileprof-uploads:/data -v $(pwd):/backup alpine tar czf /backup/uploads-backup.tar.gz -C /data .
```

### Disaster Recovery
```bash
# Restore from backup
./scripts/deploy.sh rollback

# Or restore specific version
docker run -d --name themobileprof-backend --env-file .env your-username/themobileprof-backend:v1.0.0
```

## Troubleshooting

### Build Failures
1. Check GitHub Actions logs
2. Verify Docker Hub credentials
3. Check Dockerfile syntax
4. Review dependency issues

### Deployment Issues
```bash
# Check container logs
./scripts/deploy.sh logs

# Check container status
./scripts/deploy.sh status

# Check environment variables
docker exec themobileprof-backend env

# Check database connectivity
docker exec themobileprof-backend psql $DATABASE_URL -c "SELECT 1"
```

### Performance Issues
```bash
# Check resource usage
docker stats themobileprof-backend

# Check database performance
docker exec themobileprof-db psql -U themobileprof -c "SELECT * FROM pg_stat_activity;"
```

## Best Practices

### Security
- [ ] Use strong JWT secrets
- [ ] Enable HTTPS (use reverse proxy)
- [ ] Regular security updates
- [ ] Monitor vulnerability reports
- [ ] Use managed database services

### Performance
- [ ] Monitor resource usage
- [ ] Set up proper logging
- [ ] Use CDN for static assets
- [ ] Implement caching strategies
- [ ] Regular database maintenance

### Reliability
- [ ] Automated backups
- [ ] Health monitoring
- [ ] Graceful shutdown handling
- [ ] Circuit breakers for external services
- [ ] Proper error handling

### Monitoring
- [ ] Application metrics
- [ ] Database performance
- [ ] Error tracking
- [ ] Uptime monitoring
- [ ] Alert notifications 