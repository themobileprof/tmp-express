# Production Monitoring & Testing Guide

This guide helps you monitor and test your TheMobileProf API in production.

## 🚀 Quick Start

### 1. Test Production API
```bash
# Set your production API URL
export API_URL=https://your-domain.com/api

# Run comprehensive tests
npm run test:production
```

### 2. View Real-time Logs
```bash
# View all logs
npm run logs:view

# View only errors
npm run logs:errors

# View payment-related logs
npm run logs:payments

# View webhook logs
npm run logs:webhooks
```

## 📊 Monitoring Commands

### Docker Container Logs
```bash
# View container logs
docker logs themobileprof-backend

# Follow logs in real-time
docker logs -f themobileprof-backend

# View last 100 lines
docker logs --tail 100 themobileprof-backend

# View logs with timestamps
docker logs -t themobileprof-backend
```

### Database Connection Test
```bash
# Test database connectivity
docker exec themobileprof-backend node -e "
const { query } = require('./src/database/config');
query('SELECT NOW()').then(result => {
  console.log('✅ Database connected:', result.rows[0]);
}).catch(err => {
  console.error('❌ Database error:', err.message);
});
"
```

### Health Check
```bash
# Test health endpoint
curl -f https://your-domain.com/health

# Test with detailed response
curl -v https://your-domain.com/health
```

## 🔍 Error Investigation

### 1. Check Application Status
```bash
# Check if container is running
docker ps | grep themobileprof-backend

# Check container resource usage
docker stats themobileprof-backend

# Check container details
docker inspect themobileprof-backend
```

### 2. Check Environment Variables
```bash
# View all environment variables
docker exec themobileprof-backend env | grep -E "(DATABASE|JWT|FLUTTERWAVE)"

# Test specific environment variable
docker exec themobileprof-backend node -e "
console.log('DATABASE_URL:', process.env.DATABASE_URL ? '✅ Set' : '❌ Missing');
console.log('JWT_SECRET:', process.env.JWT_SECRET ? '✅ Set' : '❌ Missing');
console.log('FLUTTERWAVE_PUBLIC_KEY:', process.env.FLUTTERWAVE_PUBLIC_KEY ? '✅ Set' : '❌ Missing');
"
```

### 3. Check File Permissions
```bash
# Check uploads directory
ls -la /var/www/tmp-root/uploads

# Check application directory
docker exec themobileprof-backend ls -la /app
```

## 🧪 Testing Specific Features

### Authentication Testing
```bash
# Test user registration
curl -X POST https://your-domain.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123",
    "firstName": "Test",
    "lastName": "User",
    "role": "student"
  }'

# Test user login
curl -X POST https://your-domain.com/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "testpassword123"
  }'
```

### Payment Testing
```bash
# Test payment initialization (requires auth token)
curl -X POST https://your-domain.com/api/payments/initialize \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "paymentType": "course",
    "itemId": "course-uuid",
    "paymentMethod": "card"
  }'

# Test payment verification
curl -X GET https://your-domain.com/api/payments/verify/TMP_REFERENCE \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Database Testing
```bash
# Test database queries
docker exec themobileprof-backend node -e "
const { query, getRow } = require('./src/database/config');

async function testDB() {
  try {
    // Test basic query
    const result = await query('SELECT COUNT(*) as user_count FROM users');
    console.log('✅ Users count:', result.rows[0].user_count);
    
    // Test courses
    const courses = await query('SELECT COUNT(*) as course_count FROM courses');
    console.log('✅ Courses count:', courses.rows[0].course_count);
    
    // Test payments
    const payments = await query('SELECT COUNT(*) as payment_count FROM payments');
    console.log('✅ Payments count:', payments.rows[0].payment_count);
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  }
}

testDB();
"
```

## 📈 Performance Monitoring

### Check Response Times
```bash
# Test API response time
time curl -s https://your-domain.com/health

# Test with detailed timing
curl -w "@curl-format.txt" -o /dev/null -s https://your-domain.com/api/courses
```

### Monitor Resource Usage
```bash
# Check CPU and memory usage
docker stats themobileprof-backend --no-stream

# Check disk usage
docker exec themobileprof-backend df -h

# Check memory usage
docker exec themobileprof-backend free -h
```

## 🚨 Common Issues & Solutions

### 1. Container Won't Start
```bash
# Check container logs
docker logs themobileprof-backend

# Check if port is already in use
sudo netstat -tulpn | grep :3000

# Restart container
docker restart themobileprof-backend
```

### 2. Database Connection Issues
```bash
# Test database connection
docker exec themobileprof-backend node -e "
const { Client } = require('pg');
const client = new Client(process.env.DATABASE_URL);

client.connect()
  .then(() => console.log('✅ Database connected'))
  .catch(err => console.error('❌ Database error:', err.message))
  .finally(() => client.end());
"
```

### 3. Payment Issues
```bash
# Check Flutterwave configuration
docker exec themobileprof-backend node -e "
console.log('Flutterwave Config:');
console.log('Public Key:', process.env.FLUTTERWAVE_PUBLIC_KEY ? '✅ Set' : '❌ Missing');
console.log('Secret Key:', process.env.FLUTTERWAVE_SECRET_KEY ? '✅ Set' : '❌ Missing');
console.log('Secret Hash:', process.env.FLUTTERWAVE_SECRET_HASH ? '✅ Set' : '❌ Missing');
"
```

### 4. File Upload Issues
```bash
# Check uploads directory permissions
ls -la /var/www/tmp-root/uploads

# Fix permissions if needed
sudo chown -R $USER:$USER /var/www/tmp-root/uploads
sudo chmod -R 755 /var/www/tmp-root/uploads
```

## 📋 Monitoring Checklist

### Daily Checks
- [ ] Container is running: `docker ps | grep themobileprof-backend`
- [ ] Health endpoint responds: `curl https://your-domain.com/health`
- [ ] No critical errors in logs: `npm run logs:errors`
- [ ] Database is accessible
- [ ] Payment webhooks are working

### Weekly Checks
- [ ] Run full production test: `npm run test:production`
- [ ] Check resource usage: `docker stats themobileprof-backend`
- [ ] Review error logs for patterns
- [ ] Test payment flow end-to-end
- [ ] Verify backup processes

### Monthly Checks
- [ ] Review performance metrics
- [ ] Check security updates
- [ ] Verify SSL certificates
- [ ] Test disaster recovery procedures
- [ ] Review and rotate secrets

## 🔧 Debugging Tools

### Create curl-format.txt for timing
```bash
cat > curl-format.txt << 'EOF'
     time_namelookup:  %{time_namelookup}\n
        time_connect:  %{time_connect}\n
     time_appconnect:  %{time_appconnect}\n
    time_pretransfer:  %{time_pretransfer}\n
       time_redirect:  %{time_redirect}\n
  time_starttransfer:  %{time_starttransfer}\n
                     ----------\n
          time_total:  %{time_total}\n
EOF
```

### Create monitoring script
```bash
cat > scripts/monitor.sh << 'EOF'
#!/bin/bash

echo "🔍 TheMobileProf Production Monitor"
echo "=================================="

# Check container status
echo "📦 Container Status:"
if docker ps | grep -q themobileprof-backend; then
    echo "✅ Container is running"
else
    echo "❌ Container is not running"
fi

# Check health endpoint
echo "🏥 Health Check:"
if curl -s -f https://your-domain.com/health > /dev/null; then
    echo "✅ Health endpoint responding"
else
    echo "❌ Health endpoint failed"
fi

# Check recent errors
echo "🚨 Recent Errors:"
docker logs --tail 20 themobileprof-backend 2>&1 | grep -i error | tail -5

# Check resource usage
echo "📊 Resource Usage:"
docker stats themobileprof-backend --no-stream --format "table {{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}"

echo "✅ Monitoring complete"
EOF

chmod +x scripts/monitor.sh
```

## 📞 Emergency Contacts

- **Server Issues**: Check server provider dashboard
- **Database Issues**: Check database provider status
- **Flutterwave Issues**: [Flutterwave Status Page](https://status.flutterwave.com)
- **SSL Issues**: Check certificate expiration

## 📝 Log Analysis

### Common Error Patterns
```bash
# Find authentication errors
grep -i "auth\|jwt\|token" logs/app.log

# Find payment errors
grep -i "payment\|flutterwave" logs/app.log

# Find database errors
grep -i "database\|postgres\|connection" logs/app.log

# Find validation errors
grep -i "validation\|invalid" logs/app.log
```

### Performance Analysis
```bash
# Find slow requests
grep "time_total" logs/app.log | sort -k2 -n | tail -10

# Find high memory usage
grep -i "memory\|heap" logs/app.log

# Find connection timeouts
grep -i "timeout\|connection" logs/app.log
``` 