# LDS Production Deployment on Nayatel Cloud

This guide deploys the **Land Donation System (LDS)** — Angular frontend, Express backend, and MySQL database — on a Nayatel Cloud VM using Docker Compose and nginx.

## Architecture

```
Internet
   │
   ▼
┌─────────────────────────────────────────┐
│  nginx (edge)  :80 / :443               │
│  Single origin — no browser CORS issues │
├─────────────────────────────────────────┤
│  /          → frontend (Angular SPA)  │
│  /api/*     → backend (Express API)     │
│  /uploads/* → backend (file storage)    │
└─────────────────────────────────────────┘
         │                    │
         ▼                    ▼
   frontend:80           backend:3000
                              │
                              ▼
                         mysql:3306
```

The Angular app calls `/api/...` on the **same domain** as the UI. nginx proxies those requests to the backend internally, so the browser never makes cross-origin API calls.

| Service  | Image / build      | Internal port | Public port |
|----------|--------------------|---------------|-------------|
| mysql    | mysql:8.0          | 3306          | — (private) |
| backend  | `./backend`        | 3000          | — (private) |
| frontend | `./frontend`       | 80            | — (private) |
| nginx    | nginx:alpine       | 80, 443       | 80, 443     |

Persistent data:
- `mysql_data` — database files
- `uploads_data` — user-uploaded documents and photos

---

## 1. Provision a Nayatel Cloud VM

1. Log in to [Nayatel Cloud Portal](https://cloud.nayatel.com/).
2. Create a **Linux VM** (Ubuntu 22.04 LTS recommended):
   - **CPU:** 2+ vCPUs
   - **RAM:** 4 GB minimum (8 GB recommended)
   - **Disk:** 40 GB+ SSD
3. Note the **public IP address**.
4. Open firewall / security group ports:
   - **80** (HTTP)
   - **443** (HTTPS)
   - **22** (SSH, restrict to your office IP if possible)
5. Point your domain **A record** to the VM public IP (e.g. `lds.yourdomain.pk`).

---

## 2. Prepare the server

SSH into the VM:

```bash
ssh deploy@YOUR_SERVER_IP
```

Install Docker (Ubuntu):

```bash
sudo apt-get update
sudo apt-get install -y ca-certificates curl gnupg
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
sudo chmod a+r /etc/apt/keyrings/docker.gpg

echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] \
  https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo $VERSION_CODENAME) stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker $USER
newgrp docker
```

Clone the repository:

```bash
git clone <your-repo-url> /opt/lds
cd /opt/lds
```

---

## 3. Configure environment

```bash
cp .env.example .env
nano .env
```

Set these values:

| Variable | Example | Notes |
|----------|---------|-------|
| `ALLOWED_ORIGINS` | `https://lds.yourdomain.pk` | For mobile/direct API access |
| `MYSQL_ROOT_PASSWORD` | strong random password | MySQL admin |
| `MYSQL_PASSWORD` | strong random password | App database user |
| `JWT_SECRET` | 64-char hex string | `node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"` |
| `HTTP_PORT` | `80` | Leave default unless port conflict |
| `HTTPS_PORT` | `443` | Leave default |

**Never commit `.env` to git.**

---

## 4. Deploy

```bash
chmod +x deploy/deploy.sh deploy/backup.sh
./deploy/deploy.sh
```

Or manually:

```bash
docker compose up -d --build
docker compose ps
```

Verify:

```bash
curl http://localhost/health
curl http://localhost/api/health
```

Open `http://YOUR_SERVER_IP` or `http://YOUR_DOMAIN` in a browser.

---

## 5. Enable HTTPS (recommended)

### Option A — Let's Encrypt with Certbot

Install certbot on the host:

```bash
sudo apt-get install -y certbot
```

Stop nginx temporarily and obtain a certificate:

```bash
docker compose stop nginx
sudo certbot certonly --standalone -d YOUR_DOMAIN --agree-tos -m admin@yourdomain.pk
```

Copy the HTTPS config:

```bash
cp deploy/nginx/lds-https.conf.example deploy/nginx/lds.conf
sed -i 's/YOUR_DOMAIN/lds.yourdomain.pk/g' deploy/nginx/lds.conf
```

Update `.env`:

```
ALLOWED_ORIGINS=https://lds.yourdomain.pk
```

Restart:

```bash
docker compose up -d nginx
```

Set up auto-renewal (cron):

```bash
echo "0 3 * * * certbot renew --quiet --pre-hook 'cd /opt/lds && docker compose stop nginx' --post-hook 'cd /opt/lds && docker compose start nginx'" | sudo crontab -
```

### Option B — Nayatel-provided SSL certificate

Place your certificate files in `deploy/nginx/ssl/`:

```
deploy/nginx/ssl/fullchain.pem
deploy/nginx/ssl/privkey.pem
```

Update `deploy/nginx/lds.conf` to reference `/etc/nginx/ssl/` paths (mounted in docker-compose), then:

```bash
docker compose up -d nginx
```

---

## 6. CORS — how it is resolved

| Access pattern | CORS needed? | How it works |
|----------------|--------------|--------------|
| Browser → SPA → `/api/users` | **No** | Same origin via nginx proxy |
| Mobile app → `https://domain/api/...` | Yes | Set `ALLOWED_ORIGINS` in `.env` |
| Direct API testing with curl | No | No `Origin` header |

The backend reads `ALLOWED_ORIGINS` (comma-separated). The SPA production build uses relative URLs (`/api`, `/api/uploads`) configured in `frontend/src/environments/environment.prod.ts`.

---

## 7. Database

MySQL 8.0 runs in Docker with:
- Database: `lds_db` (configurable via `MYSQL_DATABASE`)
- User: `lds_user` (configurable via `MYSQL_USER`)
- Timezone: `+05:00` (Pakistan)
- Charset: `utf8mb4`

On first start, Sequelize auto-creates tables (`syncDatabase` in `backend/app.js`).

**Import existing data** (if migrating from another server):

```bash
gunzip < backup/mysql.sql.gz | docker compose exec -T mysql mysql -u lds_user -p lds_db
```

---

## 8. File uploads

Uploads are stored in the Docker volume `uploads_data`, served at `/uploads/` (and `/api/uploads/` through the API proxy).

Max upload size: **20 MB** (nginx `client_max_body_size`).

---

## 9. Operations

### View logs

```bash
docker compose logs -f backend
docker compose logs -f nginx
docker compose logs -f mysql
```

### Restart a service

```bash
docker compose restart backend
```

### Update after code changes

```bash
git pull
docker compose up -d --build
```

### Backup

```bash
./deploy/backup.sh
```

Backups are saved to `./backups/YYYYMMDD_HHMMSS/`.

### Health monitoring

| Endpoint | Expected |
|----------|----------|
| `GET /health` | `{"status":"ok"}` (nginx) |
| `GET /api/health` | `{"status":"ok","mysql":"connected"}` |

---

## 10. Firewall checklist (Nayatel / OS)

```bash
# UFW example (Ubuntu)
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable
```

Do **not** expose ports 3000 or 3306 publicly — only nginx should be reachable from the internet.

---

## 11. Troubleshooting

| Symptom | Fix |
|---------|-----|
| `CORS policy violation` | Set `ALLOWED_ORIGINS` to your exact frontend URL (scheme + domain + port) |
| `502 Bad Gateway` on `/api` | `docker compose logs backend` — usually MySQL not ready or JWT_SECRET missing |
| MySQL connection refused | Wait for health check: `docker compose ps` — mysql should be `healthy` |
| Upload fails with 413 | Increase `client_max_body_size` in `deploy/nginx/lds.conf` |
| Blank page after deploy | Check `docker compose logs frontend` — rebuild: `docker compose build frontend` |

---

## 12. Non-Docker deployment (PM2)

If you prefer running Node directly on the host (without Docker), use `backend/ecosystem.config.js` with PM2 and host nginx separately. Docker Compose is the recommended production path for Nayatel Cloud.

---

## Quick reference

```bash
# First deploy
cp .env.example .env && nano .env
./deploy/deploy.sh

# Status
docker compose ps

# Stop everything
docker compose down

# Stop and remove volumes (DESTRUCTIVE)
docker compose down -v
```
