# VoiceShield AI - Deployment Guide

**Version**: 1.0.0  
**Last Updated**: 2026-09-02  
**Status**: Production Ready ✅

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Pre-Deployment Checklist](#pre-deployment-checklist)
3. [Docker Deployment](#docker-deployment)
4. [Manual Deployment](#manual-deployment)
5. [Configuration](#configuration)
6. [Database Setup](#database-setup)
7. [Monitoring & Health Checks](#monitoring--health-checks)
8. [Troubleshooting](#troubleshooting)
9. [Security Considerations](#security-considerations)

---

## Prerequisites

### Minimum Requirements
- **Node.js**: v18.0.0 or higher
- **npm**: v9.0.0 or higher
- **PostgreSQL**: 12.0 or higher (for production)
- **Redis**: 6.0 or higher (optional, for caching)
- **Docker**: 20.10+ (for containerized deployment)

### System Requirements
- **CPU**: 2+ cores
- **RAM**: 4GB minimum (8GB recommended)
- **Disk**: 20GB free space
- **OS**: Linux (recommended), macOS, or Windows with WSL2

---

## Pre-Deployment Checklist

- [ ] All environment variables configured in `.env.production`
- [ ] Database credentials secure and managed
- [ ] JWT secrets generated and stored securely
- [ ] CORS origins configured correctly
- [ ] SSL/TLS certificates obtained
- [ ] Backend build successful (`dist/` folder exists)
- [ ] Frontend build successful (`dist/` folder exists)
- [ ] ML Service accessible or configured
- [ ] Backup strategy in place
- [ ] Monitoring and logging configured
- [ ] Security audit completed

---

## Docker Deployment

### Quick Start with Docker Compose

```bash
# 1. Navigate to project root
cd /path/to/voiceshield

# 2. Create .env.docker file with production values
cp .env.production .env.docker
# Edit .env.docker with your configuration:
# - DB_PASSWORD
# - JWT_SECRET, JWT_REFRESH_SECRET
# - VITE_API_URL (frontend API endpoint)
# - CORS_ORIGIN

# 3. Build and start all services
docker-compose -f docker-compose.prod.yml up -d

# 4. View logs
docker-compose -f docker-compose.prod.yml logs -f

# 5. Stop services
docker-compose -f docker-compose.prod.yml down
```

### Individual Service Deployment

#### Build Backend Image
```bash
cd backend
docker build -t voiceshield-api:1.0.0 .
docker run -d \
  --name voiceshield-api \
  -p 4000:4000 \
  -e DATABASE_URL="postgresql://user:pass@host:5432/voiceshield" \
  -e JWT_SECRET="your-secret" \
  voiceshield-api:1.0.0
```

#### Build Frontend Image
```bash
cd frontend
docker build \
  --build-arg VITE_API_URL="https://api.yourdomain.com/api/v1" \
  -t voiceshield-web:1.0.0 .
docker run -d \
  --name voiceshield-web \
  -p 80:80 \
  voiceshield-web:1.0.0
```

---

## Manual Deployment

### Backend Deployment (Node.js)

#### 1. Install Dependencies
```bash
cd backend
npm ci --only=production
```

#### 2. Compile TypeScript
```bash
npm run build
```

#### 3. Start Production Server
```bash
NODE_ENV=production node dist/server.js
```

#### 4. Using PM2 (Recommended for production)
```bash
npm install -g pm2

# Start with PM2
pm2 start dist/server.js --name "voiceshield-api" --env production

# Monitor
pm2 monit

# View logs
pm2 logs voiceshield-api

# Restart on reboot
pm2 startup
pm2 save
```

#### 5. Nginx Reverse Proxy Configuration
```nginx
upstream backend {
    server 127.0.0.1:4000;
}

server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    location / {
        proxy_pass http://backend;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Frontend Deployment (Static)

#### 1. Build Production Bundle
```bash
cd frontend
npm run build
```

#### 2. Serve with Nginx
```bash
# Copy dist folder to Nginx
sudo cp -r dist/* /var/www/voiceshield/

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/voiceshield
```

#### Nginx Configuration for Frontend
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    root /var/www/voiceshield;
    index index.html;

    # Cache configuration
    location ~* \.(?:css|js|jpg|jpeg|png|gif|ico|svg|woff|woff2|ttf|eot)$ {
        expires 7d;
        add_header Cache-Control "public, immutable";
    }

    # SPA routing - send all non-file requests to index.html
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/v1 {
        proxy_pass http://api.yourdomain.com/api/v1;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### 3. Enable and Restart Nginx
```bash
sudo ln -s /etc/nginx/sites-available/voiceshield /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

---

## Configuration

### Environment Variables

#### Backend (.env.production)
```ini
# Essential
NODE_ENV=production
PORT=4000
JWT_SECRET=<generate-secure-random-string>
JWT_REFRESH_SECRET=<generate-secure-random-string>

# Database
DATABASE_URL=postgresql://user:pass@host:5432/voiceshield

# Security
CORS_ORIGIN=https://yourdomain.com

# ML Service
ML_SERVICE_URL=http://ml-service:8000

# Upload
UPLOAD_DIR=/var/voiceshield/uploads
MAX_FILE_SIZE=52428800
```

#### Frontend (.env.production)
```ini
VITE_API_URL=https://api.yourdomain.com/api/v1
```

### Generate Secure Secrets

```bash
# Generate JWT secret
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate another for refresh token
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Database Setup

### PostgreSQL Migration

```bash
# 1. Create database
createdb -U postgres voiceshield

# 2. Run migrations
psql -U voiceshield -d voiceshield -f database/schema/001_init.sql
psql -U voiceshield -d voiceshield -f database/migrations/seed.sql

# 3. Verify
psql -U voiceshield -d voiceshield -c "\dt"
```

### Backup Strategy

```bash
# Daily backup script
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR=/backups/voiceshield

pg_dump -U voiceshield -d voiceshield | gzip > \
  $BACKUP_DIR/voiceshield_$DATE.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "*.sql.gz" -mtime +30 -delete
```

---

## Monitoring & Health Checks

### Health Endpoints

- **Backend Health**: `GET /health`
- **Frontend Health**: `GET /` (returns HTML)

### Monitoring Commands

```bash
# Check backend health
curl https://api.yourdomain.com/health

# Check frontend
curl https://yourdomain.com/

# Monitor with PM2
pm2 monit

# Docker logs
docker-compose -f docker-compose.prod.yml logs -f backend frontend
```

### Log Aggregation

Recommended tools:
- **Datadog**: Monitor all services in one place
- **ELK Stack**: Elasticsearch, Logstash, Kibana
- **CloudWatch**: AWS native monitoring
- **New Relic**: Performance monitoring

---

## Troubleshooting

### Backend Won't Start

```bash
# Check if port 4000 is in use
lsof -i :4000

# Check database connection
psql -U voiceshield -d voiceshield -c "SELECT version();"

# Check logs
pm2 logs voiceshield-api
docker logs voiceshield-api
```

### Frontend Not Loading

```bash
# Check Nginx status
sudo systemctl status nginx

# Verify Nginx configuration
sudo nginx -t

# Check logs
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Database Connection Issues

```bash
# Test connection string
psql postgresql://user:pass@host:5432/voiceshield

# Check PostgreSQL status
pg_isready -h hostname -p 5432
```

### API Connection Issues

```bash
# Test backend from frontend server
curl http://api-server:4000/health

# Check CORS configuration
curl -H "Origin: https://yourdomain.com" https://api.yourdomain.com/health -v
```

---

## Security Considerations

### Essential Security Measures

1. **SSL/TLS Certificates**
   - Use Let's Encrypt (free): `certbot certonly --nginx -d yourdomain.com`
   - Auto-renewal: `certbot renew --dry-run`

2. **Secrets Management**
   - Never commit .env files to git
   - Use environment-specific secret stores
   - Rotate secrets regularly

3. **Database Security**
   - Enable SSL connections: `sslmode=require`
   - Use strong passwords (32+ characters)
   - Restrict database user permissions
   - Regular backups with encryption

4. **API Security**
   - Enable CORS only for trusted origins
   - Rate limiting (already configured)
   - Request validation (Zod schemas in place)
   - Helmet.js headers (already configured)

5. **File Upload Security**
   - Validate file types and sizes
   - Scan with antivirus/malware detection
   - Store outside web root
   - Implement cleanup policies

6. **Monitoring & Alerts**
   - Monitor failed login attempts
   - Alert on unusual API activity
   - Track error rates
   - Monitor resource usage

### Recommended Additional Security

```bash
# Install Fail2Ban for brute-force protection
sudo apt install fail2ban

# Enable firewall
sudo ufw enable
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Keep system updated
sudo apt update && sudo apt upgrade
```

---

## Post-Deployment Verification

```bash
# 1. Test backend API
curl -X POST https://api.yourdomain.com/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "TestPass123",
    "full_name": "Test User"
  }'

# 2. Verify frontend loads
curl https://yourdomain.com/

# 3. Check HTTPS redirect
curl -i http://yourdomain.com/

# 4. Verify database connection
npm run seed-database

# 5. Monitor logs
pm2 logs
docker logs -f
```

---

## Rollback Procedure

If deployment fails:

```bash
# Docker Compose
docker-compose -f docker-compose.prod.yml down
docker-compose -f docker-compose.prod.yml pull
docker-compose -f docker-compose.prod.yml up -d

# Manual Deployment
# 1. Stop services
pm2 stop voiceshield-api
systemctl stop nginx

# 2. Restore previous version
git checkout previous-tag
npm run build
npm start

# 3. Restore database
psql -U voiceshield -d voiceshield -f backup_file.sql

# 4. Restart
pm2 start voiceshield-api
systemctl start nginx
```

---

## Support & Escalation

For issues:
1. Check logs first
2. Verify configuration
3. Run health checks
4. Consult troubleshooting section
5. Escalate to platform team if needed

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0.0 | 2026-09-02 | Initial production release |

---

**Last Updated**: 2026-09-02  
**Next Review**: 2026-12-02
