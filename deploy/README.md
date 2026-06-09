# LDS Deploy

| | Mac | Server |
|---|-----|--------|
| Env | `cp .env.local.example .env` | `cp .env.production.example .env` |
| Script | `./deploy/local.sh` | `./deploy/production.sh` |

## Local

```bash
chmod +x deploy/local.sh deploy/production.sh
./deploy/local.sh up
```

**http://localhost** — `admin@lds.gov.pk` / `Admin@123`

| Command | Does |
|---------|------|
| `up` | Build + start + migrate + seed |
| `down` | Stop stack |
| `migrate` | `prisma migrate deploy` |
| `seed` | `prisma db seed` (`--reset` to repair admin) |
| `db` | PostgreSQL shell (`psql`) |
| `logs` | Tail logs |
| `backup` | DB + uploads snapshot |

## Production

**Prerequisite on VM:** Node.js 22 (host builds app; Docker only packages artifacts)

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt-get install -y nodejs
```

```bash
./deploy/production.sh init    # once: creates .env
# edit .env — JWT_SECRET, POSTGRES_*, SEED_ADMIN_PASSWORD
# Production VM: POSTGRES_PORT=3306 (host) → Postgres in Docker on 5432
./deploy/production.sh deploy
```

| Command | Does |
|---------|------|
| `deploy` | Host npm build + Docker start + migrate + seed + verify |
| `migrate` | Apply migrations |
| `seed` | Seed admin (`--reset` repairs password) |
| `backup` | Snapshot to `./backups/` |
| `verify` | Health check |
| `logs` | Tail logs |

## Backend dev (PostgreSQL in Docker, API on host)

```bash
docker compose up postgres -d
cd backend && cp .env.example .env   # POSTGRES_PASSWORD must match root .env
npm install
npm run migrate:dev
npm run seed
npm run start:dev
```

API: **http://localhost:3000**

## Backup VM database to your Mac

**Option A — one command (from project root on Mac):**

Add to your Mac `.env`:

```env
LDS_SERVER_HOST=101.50.85.111
LDS_SSH_USER=root
LDS_SSH_KEY=/path/to/your-ssh-key
LDS_REMOTE_DIR=/opt/lds
LDS_MAC_BACKUP_DIR=./backups-from-server
```

```bash
./deploy/local.sh pull-backup
```

This runs `production.sh backup` on the server, then `rsync`s `backups/` to `./backups-from-server/`. Each folder contains `postgres.sql.gz` and `uploads.tar.gz`.

**Option B — manual:**

```bash
# 1. On the VM
./deploy/production.sh backup

# 2. On your Mac
scp -i /path/to/key -r root@101.50.85.111:/opt/lds/backups/20260609_120000 ./backups-from-server/
```

**Restore locally (optional):**

```bash
gunzip -c backups-from-server/20260609_120000/postgres.sql.gz | \
  docker compose exec -T postgres psql -U lds_user -d lds_db
```

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Login fails | `./deploy/local.sh seed --reset` |
| `backend/.env` denied | Match `POSTGRES_PASSWORD` with root `.env` |
| Fresh DB after MySQL migration | Remove old `mysql_data` volume; use new `postgres_data` |
| `npm ci` ECONNRESET in Docker on VM | Use `./deploy/production.sh deploy` (host build). Install Node 22 on VM. Do not run raw `docker compose up --build` |
| `verify` says API unhealthy but backend healthy | Old `verify` required `curl` on the VM. `git pull` and re-run verify. Or test: `curl http://127.0.0.1/api/health` |
| Stale `lds-mysql` container after migration | `docker stop lds-mysql && docker rm lds-mysql` (data is in Postgres now) |
| `502 Bad Gateway` on `/api/health` but backend healthy | Stale nginx upstream IP — `docker compose -f docker-compose.yml -f docker-compose.production.yml up -d --force-recreate nginx` then `curl http://127.0.0.1/api/health` |
