# LDS Deploy

## Setup

| | Mac | Server |
|---|-----|--------|
| Env | `cp .env.local.example .env` | `cp .env.production.example .env` |
| Script | `./deploy/local.sh` | `./deploy/production.sh` |

---

## Local (Mac)

```bash
chmod +x deploy/local.sh
./deploy/local.sh up
```

Opens **http://localhost** — `admin@lds.gov.pk` / `Admin@123`

| Command | Does |
|---------|------|
| `up` | Build + start + migrate + seed |
| `down` | Stop containers |
| `db` | MySQL shell |
| `logs` | Tail logs |
| `backup` | Snapshot local DB → `./backups/` |
| `sync-backup` | Backup server + download → `./backups-from-server/` |
| `pull-backup` | Download server backups only |

**DB GUI:** `127.0.0.1:3306` / `lds_db` / `lds_user` / password from `.env`

**After code changes:** `./deploy/local.sh up`

---

## Local backend dev (no full Docker stack)

Use this when you only want to test **API / backend code** with fast reload. MySQL runs in Docker; backend runs on your Mac with `npm start`.

**Terminal 1 — MySQL only**

```bash
cp .env.local.example .env          # if you don't have .env yet
docker compose up mysql -d          # starts DB on 127.0.0.1:3306
```

**Terminal 2 — Backend**

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` — **MYSQL_PASSWORD must match root `.env`** (not production passwords):

```env
NODE_ENV=development
PORT=3000
MYSQL_HOST=127.0.0.1
MYSQL_PORT=3306
MYSQL_DATABASE=lds_db
MYSQL_USER=lds_user
MYSQL_PASSWORD=LocalDbPass123!       # same as MYSQL_PASSWORD in root .env
JWT_SECRET=local_dev_change_me_openssl_rand_hex_64
ALLOWED_ORIGINS=http://localhost:4200,http://localhost:3000
```

If you see `Access denied for user 'lds_user'@'172.22.0.1'` → wrong password in `backend/.env`.

```bash
npm install
npm run db:migrate
npm run seed:admin
npm start
```

API: **http://localhost:3000** — test with `curl http://localhost:3000/api/health`

**Terminal 3 — Frontend (optional)**

```bash
cd frontend
npm install
npm start
```

App: **http://localhost:4200** (calls API at port 3000)

| What | URL |
|------|-----|
| API | http://localhost:3000 |
| Angular dev | http://localhost:4200 |
| Full Docker stack | http://localhost (use `./deploy/local.sh up` instead) |

**Useful backend commands**

```bash
npm run db:migrate          # apply schema changes
npm run db:migrate:status   # see migration state
npm run seed:admin          # reset admin user
./deploy/local.sh db        # MySQL shell (from project root)
```

Stop MySQL when done: `docker compose stop mysql`

---

## Production (server)

**First time:**
```bash
cp .env.production.example .env && nano .env   # set passwords + JWT
./deploy/production.sh setup                   # once
./deploy/production.sh deploy
docker compose exec backend node scripts/seed-admin.js
```

JWT: `openssl rand -hex 64`

**Every update:**
```bash
./deploy/production.sh pre-deploy   # backup first
git pull
./deploy/production.sh deploy
./deploy/production.sh verify
```

| Command | Does |
|---------|------|
| `pre-deploy` | Full DB backup before changes |
| `deploy` | Build + migrate + verify |
| `backup` | Full DB snapshot → `./backups/` |
| `restore backups/YYYYMMDD_HHMMSS` | Restore from backup |
| `verify` | Health check |
| `logs backend` | Debug API |

`./deploy/lds.sh` = same as `production.sh`

---

## Backup

Each backup = **complete database** (all tables, all data).

| Where | How |
|-------|-----|
| Server (weekly) | Cron Sunday 2 AM — installed by `setup` |
| Server (manual) | `./deploy/production.sh backup` |
| Mac (safe copy) | `./deploy/local.sh sync-backup` |

### Backup production DB to your Mac

**Step 1** — Add to your Mac `.env` (project root):

```env
LDS_SERVER_HOST=101.50.85.111
LDS_SSH_USER=root
LDS_SSH_KEY=/Users/aubairakif/Codebases/PRMSC-HO/BCC-VLD/bcc-vld
LDS_REMOTE_DIR=/opt/lds
LDS_MAC_BACKUP_DIR=./backups-from-server
```

**Step 2** — Run from project root:

```bash
./deploy/local.sh sync-backup
```

This will:
1. SSH to server → run full DB backup (`mysql.sql.gz` + `uploads.tar.gz`)
2. Download to `./backups-from-server/` on your Mac

**Download only** (if server already has backups):

```bash
./deploy/local.sh pull-backup
```

**Check files on Mac:**

```bash
ls -lh backups-from-server/
```

Run weekly or before every production deploy. VM deletion won't lose data if copies are on your Mac.

Server-only backup (stays on VM): `./deploy/production.sh backup`

Old server backup folders auto-deleted after 90 days (`BACKUP_RETENTION_DAYS`).

---

## Deploy checklist

```
BEFORE:  pre-deploy (or sync-backup from Mac)
         git pull
DEPLOY:  deploy
AFTER:   verify + browser test
```

---

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Mac build fails (SSL) | Use `./deploy/local.sh up` not raw `docker compose build` |
| 502 on server | `./deploy/production.sh logs backend` |
| Login fails | `docker compose exec backend node scripts/seed-admin.js` |
