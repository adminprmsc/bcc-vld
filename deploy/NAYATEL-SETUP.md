# Nayatel IaaS — Complete Production Setup Guide

**Your account:** `adminprms98`  
**Public IP:** `101.50.85.252`  
**Private network:** `192.168.2.0/24`  
**Plan:** 2 vCPU · 4 GB RAM · 20 GB disk · 1 Floating IP

---

## Recommended architecture (professional, single-server)

You have **one VM worth of resources**. The professional approach is **one server running Docker Compose** — not three separate VMs.

```
Internet
    │
    ▼
101.50.85.252  (Floating IP)
    │
    ▼
┌──────────────────────────────────────────────┐
│  Ubuntu VM (single instance)                 │
│                                              │
│  ┌─────────┐  ┌──────────┐  ┌─────────────┐ │
│  │  nginx  │→ │ frontend │  │   backend   │ │
│  │  :80    │  │ Angular  │  │  Express    │ │
│  └────┬────┘  └──────────┘  └──────┬──────┘ │
│       │         /api proxy ─────────┘        │
│       │                            │         │
│       │                     ┌──────▼──────┐  │
│       │                     │   MySQL 8   │  │
│       │                     │  (Docker)   │  │
│       │                     └─────────────┘  │
│       │                     uploads volume   │
└──────────────────────────────────────────────┘
```

**Why this is best for you:**
- Frontend calls `/api/...` on the **same domain** → no CORS issues
- MySQL is **not exposed** to the internet (internal Docker network only)
- One floating IP, one firewall ruleset, easy backups
- Matches how the repo's `docker-compose.yml` is built

---

## PHASE 1 — Nayatel portal (create infrastructure)

### Step 1: Create a Security Group

Go to **IAAS → Security → Create Security Group**

| Field | Value |
|-------|-------|
| Name | `lds-production` |
| Description | `LDS app - HTTP HTTPS SSH` |

After creating, **add these inbound rules**:

| Rule | Protocol | Port | Source | Purpose |
|------|----------|------|--------|---------|
| SSH | TCP | 22 | Your office IP (or `0.0.0.0/0` temporarily) | Server access |
| HTTP | TCP | 80 | `0.0.0.0/0` | Web app |
| HTTPS | TCP | 443 | `0.0.0.0/0` | SSL (later) |

**Do NOT open** ports 3000 (backend) or 3306 (MySQL) to the public.

---

### Step 2: Create SSH key on your Mac (do this BEFORE creating the VM)

Nayatel **Security** tab may only show Security Groups — that is normal.  
Create the key on your Mac, then paste the **public key** when launching the VM.

**On your Mac — open Terminal** (`Cmd + Space` → type `Terminal`):

```bash
# 1. Generate key pair
ssh-keygen -t ed25519 -C "lds-nayatel" -f ~/.ssh/lds-deploy-key

# Press Enter for no passphrase (or set one for extra security)

# 2. Lock down private key permissions
chmod 400 ~/.ssh/lds-deploy-key

# 3. Copy public key to clipboard (paste this in Nayatel later)
cat ~/.ssh/lds-deploy-key.pub | pbcopy
echo "Public key copied to clipboard"
```

Keep `~/.ssh/lds-deploy-key` private — never share it or commit it to git.

**Alternative:** If Nayatel offers **Create Key Pair** during instance launch and downloads a `.pem` file:

```bash
chmod 400 ~/Downloads/lds-deploy-key.pem
ssh -i ~/Downloads/lds-deploy-key.pem ubuntu@101.50.85.252
```

---

### Step 3: Create the VM (Launch Instance)

Go to **My Services → IAAS → Machines → Create New Instance**

Work through each wizard screen:

#### Screen A — Details / Name
| Field | Value |
|-------|-------|
| Instance name | `lds-production` |

#### Screen B — Image (OS)
| Field | Value |
|-------|-------|
| Operating system | **Ubuntu 22.04 LTS** (64-bit) |

Do **not** pick Windows. Ubuntu is required for Docker deployment.

#### Screen C — Flavor (size)
| Field | Value |
|-------|-------|
| CPU | 2 |
| RAM | 4 GB |
| Disk | 20 GB |

Use your purchased plan specs exactly.

#### Screen D — Network
| Field | Value |
|-------|-------|
| Network | `25/250 for adminprms98` |
| Subnet | `192.168.2.0/24` |

#### Screen E — Security Group
| Field | Value |
|-------|-------|
| Security group | `lds-production` |

If only `default` is available, select it **only if** you added ports 22/80/443 to `default`.  
Otherwise go back to Step 1 and create `lds-production`.

#### Screen F — Key Pair / SSH Key
| Field | Value |
|-------|-------|
| Key pair name | `lds-deploy-key` |
| Public key | Paste from clipboard (`cat ~/.ssh/lds-deploy-key.pub`) |

Look for **Import Key Pair**, **Upload SSH Key**, or **Key Pair** dropdown.

#### Screen G — Review & Launch
Click **Create** / **Launch Instance**.

Wait 2–5 minutes until status shows **Active**, **Running**, or a green indicator.

> **Note:** Port Limit `1` on your network is fine — one VM uses one private port.

---

### Step 4: Attach Floating IP to the VM

Go to **IAAS → Networking** or **Machines → your instance → Associate Floating IP**

| Setting | Value |
|---------|-------|
| Floating IP | `101.50.85.252` |
| Instance | `lds-production` |

After this, `101.50.85.252` should route to your VM.

---

### Step 5: Verify SSH access

From your Mac terminal:

```bash
# If you created key on Mac (recommended):
ssh -i ~/.ssh/lds-deploy-key ubuntu@101.50.85.252

# If Nayatel gave you a .pem file instead:
ssh -i ~/Downloads/lds-deploy-key.pem ubuntu@101.50.85.252
```

If `ubuntu` does not work, try `root`:

```bash
ssh -i ~/.ssh/lds-deploy-key root@101.50.85.252
```

First connection will ask: `Are you sure you want to continue connecting?` → type `yes`.

You should get a shell prompt. If connection times out:
- Confirm floating IP is attached
- Confirm security group allows port 22
- Confirm instance is **Running**

---

## PHASE 2 — Server setup (one-time)

Run these commands **on the VM** after SSH login.

### Step 6: Update system & install Docker

```bash
sudo apt-get update && sudo apt-get upgrade -y
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker
docker --version
docker compose version
```

### Step 7: Install Git

```bash
sudo apt-get install -y git
```

### Step 8: Clone the application

```bash
sudo mkdir -p /opt/lds
sudo chown $USER:$USER /opt/lds
git clone <YOUR_REPO_URL> /opt/lds
cd /opt/lds
```

Replace `<YOUR_REPO_URL>` with your GitHub/GitLab URL.

---

## PHASE 3 — Production configuration

### Step 9: Create `.env` with secrets

```bash
cd /opt/lds
cp .env.example .env
nano .env
```

Set these values:

```env
ALLOWED_ORIGINS=http://101.50.85.252,https://101.50.85.252

MYSQL_ROOT_PASSWORD=<strong-password-1>
MYSQL_DATABASE=lds_db
MYSQL_USER=lds_user
MYSQL_PASSWORD=<strong-password-2>

JWT_SECRET=<64-char-hex>
HTTP_PORT=80
HTTPS_PORT=443
```

Generate JWT secret:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

If `node` is not installed yet:

```bash
openssl rand -hex 64
```

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X` in nano).

---

### Step 10: Deploy the full stack

```bash
chmod +x deploy/deploy.sh
./deploy/deploy.sh
```

This builds and starts:
- **mysql** — database (internal only)
- **backend** — Express API (internal only)
- **frontend** — Angular SPA (internal only)
- **nginx** — public entry on port 80

First build takes 5–15 minutes on 2 vCPU.

Monitor progress:

```bash
docker compose ps
docker compose logs -f
```

---

### Step 11: Verify production is live

On the server:

```bash
curl http://localhost/health
curl http://localhost/api/health
```

From your browser:

```
http://101.50.85.252
```

Expected API health response:

```json
{"status":"ok","mysql":"connected",...}
```

---

## PHASE 4 — How frontend talks to backend (already configured)

| Layer | Config |
|-------|--------|
| **Angular prod build** | `apiBaseUrl: '/api'` in `environment.prod.ts` |
| **nginx edge** | `/api/*` → `backend:3000` |
| **CORS** | Not needed for browser — same origin |
| **Uploads** | `/api/uploads` → backend file storage |

No code changes needed if you deploy with Docker Compose as provided.

---

## PHASE 5 — Production hardening (recommended)

### Step 12: Enable automatic restarts

Already set via `restart: unless-stopped` in `docker-compose.yml`.  
Ensure Docker starts on boot:

```bash
sudo systemctl enable docker
```

### Step 13: Set up backups (cron)

```bash
chmod +x /opt/lds/deploy/backup.sh
crontab -e
```

Add daily backup at 2 AM:

```
0 2 * * * cd /opt/lds && ./deploy/backup.sh >> /var/log/lds-backup.log 2>&1
```

### Step 14: HTTPS (when you have a domain)

1. Point domain A record → `101.50.85.252`
2. Follow `DEPLOYMENT.md` section 5 (Let's Encrypt)
3. Update `.env`:

```env
ALLOWED_ORIGINS=https://yourdomain.pk
```

### Step 15: Restrict SSH (optional)

In Nayatel security group, change SSH source from `0.0.0.0/0` to your office IP only.

---

## What you do NOT need to create separately

| Resource | Needed? | Why |
|----------|---------|-----|
| Second VM for backend | No | Docker runs backend on same server |
| Third VM for database | No | MySQL runs in Docker, not exposed publicly |
| Extra volume (optional) | No for now | 20 GB boot disk is enough to start |
| Extra network | No | `192.168.2.0/24` is sufficient |
| Extra router | No | `101.50.85.252` router already exists |

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| SSH timeout | Attach floating IP; open port 22 in security group |
| `No instances found` | Complete Step 3 — create the VM |
| Port 80 blocked | Add HTTP rule in `lds-production` security group |
| `502 Bad Gateway` | `docker compose logs backend` — wait for MySQL healthy |
| Out of memory | `free -h` — ensure only LDS containers run |
| Disk full | `df -h` — clean old images: `docker system prune -a` |

---

## Quick command reference

```bash
# Status
docker compose ps

# Logs
docker compose logs -f backend
docker compose logs -f nginx

# Restart after code update
cd /opt/lds && git pull && docker compose up -d --build

# Backup
./deploy/backup.sh

# Stop everything
docker compose down
```

---

## Checklist summary

- [ ] Create security group `lds-production` (ports 22, 80, 443)
- [ ] Create/download SSH key pair
- [ ] Launch Ubuntu 22.04 VM `lds-production`
- [ ] Attach floating IP `101.50.85.252`
- [ ] SSH into server
- [ ] Install Docker
- [ ] Clone repo to `/opt/lds`
- [ ] Create `.env` with secrets
- [ ] Run `./deploy/deploy.sh`
- [ ] Open `http://101.50.85.252` in browser
- [ ] Set up daily backups
- [ ] Add HTTPS when domain is ready
