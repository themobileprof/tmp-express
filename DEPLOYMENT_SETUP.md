# Deployment Setup Guide

This guide helps you set up the required GitHub secrets for automated deployment.

## Required GitHub Secrets

Go to your GitHub repository → Settings → Secrets and variables → Actions, then add these secrets:

### Server Connection
- `SERVER_HOST`: Your server's IP address or domain
- `SERVER_USER`: SSH username (usually `root` or `ubuntu`)
- `SERVER_PORT`: SSH port (usually `22`)
- `SERVER_SSH_KEY`: Your private SSH key for server access

### Docker Hub
- `DOCKERHUB_USERNAME`: Your Docker Hub username
- `DOCKERHUB_TOKEN`: Docker Hub access token

### Environment Variables
- `ENV_FILE`: Complete contents of your `.env` file (all environment variables in one secret)

## Environment Variables Format

Your `ENV_FILE` secret should contain all your environment variables in the standard `.env` format:

```
NODE_ENV=production
DATABASE_URL=postgresql://user:password@host:port/database
JWT_SECRET=your-super-secure-jwt-secret
JWT_EXPIRES_IN=24h
BCRYPT_ROUNDS=12
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-app-password
EMAIL_FROM_ADDRESS=noreply@yourdomain.com
EMAIL_SERVICE_API_KEY=your-email-service-key
SPONSORSHIP_CODE_LENGTH=8
MAX_SPONSORSHIP_DURATION_MONTHS=12
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=100
MAX_FILE_SIZE=10485760
UPLOAD_PATH=/app/uploads
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
FLUTTERWAVE_PUBLIC_KEY=FLWPUBK_TEST-b045d13e857debaf08f2d69daf60c15a-X
FLUTTERWAVE_SECRET_KEY=FLWSECK_TEST-95b57f452a1bfa95e6fa7ac5e81560d6-X
FLUTTERWAVE_SECRET_HASH=FLWSECK_TESTe6a38c0c9ba4
FRONTEND_URL=https://your-frontend-domain.com
LOGO_URL=https://your-domain.com/logo.png
```

## Server Setup

### 1. Install Docker
```bash
# Ubuntu/Debian
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
sudo usermod -aG docker $USER

# CentOS/RHEL
sudo yum install -y docker
sudo systemctl start docker
sudo systemctl enable docker
sudo usermod -aG docker $USER
```

### 2. Configure SSH Access
```bash
# Generate SSH key pair (if you don't have one)
ssh-keygen -t rsa -b 4096 -C "your-email@example.com"

# Copy public key to server
ssh-copy-id username@your-server-ip

# Test connection
ssh username@your-server-ip
```

### 3. Test Docker
```bash
# Test Docker installation
docker --version
docker run hello-world
```

## Troubleshooting

### Common Issues

1. **SSH Connection Failed**
   - Verify server IP and SSH port
   - Check SSH key format (should be private key)
   - Ensure user has SSH access

2. **Docker Permission Denied**
   - Add user to docker group: `sudo usermod -aG docker $USER`
   - Log out and back in, or restart SSH session

3. **Container Fails to Start**
   - Check environment variables in ENV_FILE secret
   - Verify database connection string
   - Check container logs: `docker logs themobileprof-backend`

4. **Health Check Fails**
   - Ensure port 3000 is open on server
   - Check firewall settings
   - Verify application is starting correctly

### Debugging Commands

```bash
# Check if container is running
docker ps

# View container logs
docker logs themobileprof-backend

# Check container status
docker inspect themobileprof-backend

# Test health endpoint manually
curl http://localhost:3000/health

# Check uploads directory
ls -la /var/www/tmp-root/uploads

# Check environment variables in container
docker exec themobileprof-backend env
```

## Manual Deployment (Fallback)

If automated deployment fails, you can deploy manually:

```bash
# SSH to your server
ssh username@your-server-ip

# Pull latest image
docker pull your-username/themobileprof-backend:latest

# Stop existing container
docker stop themobileprof-backend || true
docker rm themobileprof-backend || true

# Create uploads directory
sudo mkdir -p /var/www/tmp-root/uploads
sudo chown $USER:$USER /var/www/tmp-root/uploads
sudo chmod 755 /var/www/tmp-root/uploads

# Create .env file (copy your environment variables here)
cat > .env << 'EOF'
NODE_ENV=production
DATABASE_URL=your-database-url
JWT_SECRET=your-jwt-secret
# ... add all other environment variables
EOF

# Run container
docker run -d \
  --name themobileprof-backend \
  --restart unless-stopped \
  -p 3000:3000 \
  -v /var/www/tmp-root/uploads:/app/uploads \
  --env-file .env \
  your-username/themobileprof-backend:latest

# Clean up .env file
rm -f .env
```

## Security Notes

- Use strong, unique secrets for production
- Rotate secrets regularly
- Keep SSH keys secure
- Use HTTPS in production
- Consider using a reverse proxy (Nginx) for SSL termination
- The .env file is created temporarily on the server and cleaned up after deployment 