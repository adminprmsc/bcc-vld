# LDS Application - Production Deployment (Server 203.175.74.168)

## Server Configuration
- **Server IP:** 203.175.74.168
- **Frontend Port:** 8080
- **Backend Port:** 8083
- **Database:** MySQL 8.0
- **Process Manager:** PM2
- **Web Server:** Nginx

---

## Prerequisites

### 1. Install Required Software

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install MySQL 8.0
sudo apt install -y mysql-server

# Install Nginx
sudo apt install -y nginx

# Install PM2 globally
sudo npm install -g pm2

# Install Git
sudo apt install -y git
```

### 2. Configure MySQL

```bash
# Secure MySQL installation
sudo mysql_secure_installation

# Login to MySQL
sudo mysql -u root -p

# Create database and user
CREATE DATABASE lds_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'lds_user'@'localhost' IDENTIFIED BY 'LDS_Secure_Password_2026!';
GRANT ALL PRIVILEGES ON lds_db.* TO 'lds_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

---

## Deployment Steps

### 1. Create Application Directory

```bash
sudo mkdir -p /var/www/lds
sudo chown -R $USER:$USER /var/www/lds
cd /var/www/lds
```

### 2. Upload Application Files

```bash
# From your local machine, upload files:
scp -r ./backend ./src ./package.json ./angular.json user@203.175.74.168:/var/www/lds/
scp -r ./ecosystem.config.js ./nginx user@203.175.74.168:/var/www/lds/
```

### 3. Backend Setup

```bash
cd /var/www/lds/backend

# Install dependencies
npm install --production

# Copy production environment file
cp .env.production .env

# Edit .env with correct MySQL password
nano .env

# Sync database tables
npm run sync:db

# Seed admin user (creates admin@lds.gov.pk / Admin@123)
node scripts/seed-admin.js

# Create uploads directory
mkdir -p /var/www/lds/uploads
chmod 755 /var/www/lds/uploads
```

### 4. Frontend Build

```bash
cd /var/www/lds

# Install dependencies
npm install

# Build for production
npm run build -- --configuration=production

# Create deployment directory
mkdir -p /var/www/lds/frontend
cp -r dist /var/www/lds/frontend/
```

### 5. Configure Nginx

```bash
# Copy nginx configuration
sudo cp nginx/lds.conf /etc/nginx/sites-available/lds

# Enable site
sudo ln -s /etc/nginx/sites-available/lds /etc/nginx/sites-enabled/

# Test configuration
sudo nginx -t

# Reload nginx
sudo systemctl reload nginx
sudo systemctl enable nginx
```

### 6. Start Backend with PM2

```bash
cd /var/www/lds

# Start application
pm2 start ecosystem.config.js --env production

# Save PM2 process list
pm2 save

# Setup PM2 to start on boot
pm2 startup systemd
# Run the command it outputs

# Check status
pm2 status
```

---

## Verification

```bash
# Test backend
curl http://localhost:8083/health

# Test frontend
curl http://203.175.74.168:8080

# Check PM2
pm2 status

# View logs
pm2 logs lds-backend
```

---

## Access Application

**URL:** http://203.175.74.168:8080

**Admin Login:**
- Email: admin@lds.gov.pk
- Password: Admin@123

⚠️ **Change the admin password after first login!**

---

## Firewall

```bash
sudo ufw allow 8080/tcp
sudo ufw allow 8083/tcp
sudo ufw allow 22/tcp
sudo ufw enable
```

---

## Useful Commands

```bash
# Restart backend
pm2 restart lds-backend

# View logs
pm2 logs lds-backend --lines 100

# Reload nginx
sudo systemctl reload nginx

# Database backup
mysqldump -u lds_user -p lds_db > backup.sql
```

---

## Quick Reference

| Service | Port | URL |
|---------|------|-----|
| Frontend | 8080 | http://203.175.74.168:8080 |
| Backend API | 8083 | http://203.175.74.168:8083 |
| API via Proxy | 8080 | http://203.175.74.168:8080/api |
