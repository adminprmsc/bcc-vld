# LDS Production Deployment Guide

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Server Requirements](#server-requirements)
3. [Quick Start with Docker](#quick-start-with-docker)
4. [Manual Deployment](#manual-deployment)
5. [Environment Configuration](#environment-configuration)
6. [SSL/TLS Setup](#ssltls-setup)
7. [Database Management](#database-management)
8. [Monitoring & Logging](#monitoring--logging)
9. [Backup Strategy](#backup-strategy)
10. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software
- **Docker** 24.0+ and **Docker Compose** 2.20+
- **Node.js** 22.x LTS (for local development/testing)
- **Git** for version control

### Recommended
- **nginx** or reverse proxy for SSL termination
- **Certbot** for Let's Encrypt SSL certificates
- **PM2** (if running without Docker)

---

## Server Requirements

### Minimum Specifications
| Resource | Minimum | Recommended |
|----------|---------|-------------|
| CPU | 2 cores | 4 cores |
| RAM | 4 GB | 8 GB |
| Storage | 20 GB SSD | 50 GB SSD |
| Network | 100 Mbps | 1 Gbps |

### Ports Required
| Port | Service | Notes |
|------|---------|-------|
| 80 | HTTP | Redirects to HTTPS |
| 443 | HTTPS | Primary frontend |
| 3000 | Backend API | Internal only (Docker) |
| 27017 | MongoDB | Internal only |

---

## Quick Start with Docker

### 1. Clone and Configure

```bash
# Clone repository
git clone <repository-url> /opt/lds
cd /opt/lds

# Copy environment template
cp .env.example .env

# Generate secure secrets
echo "JWT_SECRET=$(openssl rand -hex 64)" >> .env
echo "MONGO_ROOT_PASSWORD=$(openssl rand -base64 32)" >> .env
echo "MONGO_PASSWORD=$(openssl rand -base64 32)" >> .env
```

### 2. Edit Environment File

```bash
nano .env
```

Update these critical values:
- `JWT_SECRET` - 64-character hex string
- `MONGO_ROOT_PASSWORD` - Strong password
- `MONGO_PASSWORD` - Application database password
- `ALLOWED_ORIGINS` - Your domain(s)

### 3. Build and Start

```bash
# Build images
docker compose build

# Start services
docker compose up -d

# Check status
docker compose ps

# View logs
docker compose logs -f
```

### 4. Verify Deployment

```bash
# Check health endpoints
curl http://localhost/health
curl http://localhost:3000/health

# Check MongoDB
docker compose exec mongo mongosh --eval "db.adminCommand('ping')"
```

---

## Manual Deployment (Without Docker)

### Backend Setup

```bash
cd /opt/lds/backend

# Install dependencies
npm ci --omit=dev

# Set environment variables
export NODE_ENV=production
export JWT_SECRET="your-secure-secret"
export MONGO_URI="mongodb://user:pass@localhost:27017/landdonation"
export PORT=3000

# Start with PM2
pm2 start ./bin/www --name "lds-backend"
pm2 save
pm2 startup
```

### Frontend Setup

```bash
cd /opt/lds

# Install dependencies
npm ci

# Build for production
npm run build -- --configuration=production

# Copy to web server directory
cp -r dist/lds-web/browser/* /var/www/lds/
```

### Nginx Configuration

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;

    root /var/www/lds;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location /uploads/ {
        proxy_pass http://127.0.0.1:3000/uploads/;
    }
}
```

---

## Environment Configuration

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `NODE_ENV` | Environment mode | `production` |
| `JWT_SECRET` | Token signing key | 64-char hex |
| `MONGO_URI` | MongoDB connection | `mongodb://...` |
| `ALLOWED_ORIGINS` | CORS origins | `https://domain.com` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Backend port | `3000` |
| `JWT_EXPIRES_IN` | Token lifetime | `24h` |
| `MAX_FILE_SIZE_MB` | Upload limit | `10` |

---

## SSL/TLS Setup

### Using Let's Encrypt (Certbot)

```bash
# Install certbot
apt install certbot python3-certbot-nginx

# Obtain certificate
certbot --nginx -d your-domain.com -d www.your-domain.com

# Auto-renewal (already configured by certbot)
certbot renew --dry-run
```

### Using Custom Certificates

Place your certificates in `/etc/ssl/`:
- `your-domain.crt` - Certificate
- `your-domain.key` - Private key
- `ca-bundle.crt` - CA chain (optional)

---

## Database Management

### Creating Admin User

```bash
# Connect to MongoDB
docker compose exec mongo mongosh -u admin -p <password> landdonation

# Create super admin
db.users.insertOne({
  name: "Super Admin",
  email: "admin@example.com",
  password: "<bcrypt-hashed-password>",
  role: "Super Admin",
  isActive: true,
  createdAt: new Date()
});
```

### Database Backup

```bash
# Backup
docker compose exec mongo mongodump \
  --db landdonation \
  --out /data/backups/$(date +%Y%m%d)

# Restore
docker compose exec mongo mongorestore \
  --db landdonation \
  /data/backups/20240101/landdonation
```

### Automated Backups (Cron)

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /opt/lds/scripts/backup.sh >> /var/log/lds-backup.log 2>&1
```

---

## Monitoring & Logging

### Docker Logs

```bash
# All services
docker compose logs -f

# Specific service
docker compose logs -f backend

# Last 100 lines
docker compose logs --tail=100 backend
```

### Health Checks

```bash
# Frontend health
curl -s http://localhost/health | jq .

# Backend health
curl -s http://localhost:3000/health | jq .

# MongoDB status
docker compose exec mongo mongosh --eval "db.serverStatus()"
```

### Recommended Monitoring Tools

- **Prometheus + Grafana** - Metrics and dashboards
- **Sentry** - Error tracking
- **ELK Stack** - Log aggregation

---

## Backup Strategy

### Recommended Schedule

| Type | Frequency | Retention |
|------|-----------|-----------|
| Full database | Daily | 30 days |
| Incremental | Hourly | 7 days |
| Uploads | Daily | 90 days |

### Backup Script

```bash
#!/bin/bash
# /opt/lds/scripts/backup.sh

BACKUP_DIR="/opt/backups/lds"
DATE=$(date +%Y%m%d_%H%M%S)

# Create backup directory
mkdir -p $BACKUP_DIR

# MongoDB backup
docker compose exec -T mongo mongodump \
  --db landdonation \
  --archive > $BACKUP_DIR/mongo_$DATE.archive

# Uploads backup
tar -czf $BACKUP_DIR/uploads_$DATE.tar.gz \
  -C /opt/lds/backend uploads/

# Cleanup old backups (30 days)
find $BACKUP_DIR -name "*.archive" -mtime +30 -delete
find $BACKUP_DIR -name "*.tar.gz" -mtime +30 -delete

echo "Backup completed: $DATE"
```

---

## Troubleshooting

### Common Issues

#### 1. MongoDB Connection Failed

```bash
# Check MongoDB container
docker compose ps mongo
docker compose logs mongo

# Verify connection string
docker compose exec backend node -e "
  const mongoose = require('mongoose');
  mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('Connected'))
    .catch(err => console.error(err));
"
```

#### 2. CORS Errors

Check `ALLOWED_ORIGINS` in `.env` includes your domain:
```
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

#### 3. JWT Authentication Failed

```bash
# Verify JWT_SECRET is set
docker compose exec backend node -e "console.log(process.env.JWT_SECRET ? 'Set' : 'Not set')"

# Regenerate if needed
echo "JWT_SECRET=$(openssl rand -hex 64)" >> .env
docker compose restart backend
```

#### 4. File Upload Issues

```bash
# Check upload directory permissions
docker compose exec backend ls -la /app/uploads

# Fix permissions
docker compose exec backend chown -R nodejs:nodejs /app/uploads
```

### Getting Help

1. Check container logs: `docker compose logs -f <service>`
2. Review error responses from API
3. Check MongoDB indexes: `db.collection.getIndexes()`
4. Verify network connectivity between containers

---

## Security Checklist

- [ ] JWT_SECRET is unique and secure (64+ characters)
- [ ] MongoDB passwords are strong and unique
- [ ] ALLOWED_ORIGINS is restricted to production domains
- [ ] SSL/TLS is enabled (HTTPS only)
- [ ] Firewall blocks direct access to ports 3000 and 27017
- [ ] Regular backups are configured and tested
- [ ] Log rotation is configured
- [ ] Security updates are applied regularly

---

## Support

For issues and questions:
1. Check this deployment guide
2. Review [SYSTEM_DOCUMENTATION.md](./Documentation/SYSTEM_DOCUMENTATION.md)
3. Check application logs
4. Contact the development team
