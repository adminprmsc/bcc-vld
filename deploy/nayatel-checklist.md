# Nayatel IaaS — Go-Live Checklist

> **Full step-by-step guide:** see [NAYATEL-SETUP.md](./NAYATEL-SETUP.md)

Your account: **adminprms98** · Public IP: **101.50.85.252** · Network: **192.168.2.0/24**  
Plan: **2 vCPU · 4 GB RAM · 20 GB disk · 1 Floating IP**

## Step 1 — Get these from Nayatel portal (click **Manage** on your IAAS card)

| # | Item | Where to find | Example |
|---|------|---------------|---------|
| 1 | **Floating IP** (public IP) | Instance / Networking | `203.x.x.x` |
| 2 | **OS** | Instance details | Ubuntu 22.04 |
| 3 | **SSH username** | Instance access | `root` or `ubuntu` |
| 4 | **SSH password or key** | Credentials / key pair | (keep private — do not share in chat) |
| 5 | **Firewall / security group** | Networking / firewall | Open **22**, **80**, **443** |

## Step 2 — Optional but recommended

| # | Item | Notes |
|---|------|-------|
| 6 | **Domain name** | e.g. `lds.yourorg.pk` — A record → Floating IP |
| 7 | **Git repo URL** | GitHub/GitLab so the server can `git clone` |
| 8 | **Admin email** | For Let's Encrypt HTTPS certificate |

## Step 3 — You run on the server (we can guide step-by-step)

```bash
# 1. SSH in
ssh root@YOUR_FLOATING_IP

# 2. Install Docker (Ubuntu)
curl -fsSL https://get.docker.com | sh

# 3. Clone app
git clone <repo-url> /opt/lds && cd /opt/lds

# 4. Create secrets
cp .env.example .env
nano .env

# 5. Deploy
chmod +x deploy/deploy.sh && ./deploy/deploy.sh
```

## Step 4 — Verify

```bash
curl http://YOUR_FLOATING_IP/health
curl http://YOUR_FLOATING_IP/api/health
```

Then open `http://YOUR_FLOATING_IP` in a browser.

## What to send us (safe to share)

- Floating IP
- OS name/version
- SSH username (not password)
- Domain name (if any)
- Whether ports 80/443 are open
- Any error output from deploy commands

## What NOT to send in chat

- MySQL passwords
- JWT_SECRET
- SSH private keys or passwords

Set those only in `.env` on the server.
