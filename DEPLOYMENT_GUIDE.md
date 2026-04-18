# Deployment Guide — Student Advising Portal

> **Architecture:** Cloudflare Pages (frontend) + Oracle Cloud Free Tier (backend + PostgreSQL)
>
> **Total cost:** $0/month | **Downtime:** None | **Cold starts:** None

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Phase 1 — Oracle Cloud VM Setup](#2-phase-1--oracle-cloud-vm-setup)
3. [Phase 2 — Install Backend Stack on VM](#3-phase-2--install-backend-stack-on-vm)
4. [Phase 3 — PostgreSQL Setup](#4-phase-3--postgresql-setup)
5. [Phase 4 — Deploy Backend](#5-phase-4--deploy-backend)
6. [Phase 5 — Nginx Reverse Proxy & SSL](#6-phase-5--nginx-reverse-proxy--ssl)
7. [Phase 6 — Deploy Frontend to Cloudflare Pages](#7-phase-6--deploy-frontend-to-cloudflare-pages)
8. [Phase 7 — DNS & Domain Setup](#8-phase-7--dns--domain-setup)
9. [Phase 8 — Google OAuth Update](#9-phase-8--google-oauth-update)
10. [Phase 9 — Seed Data & Migrate](#10-phase-9--seed-data--migrate)
11. [Phase 10 — Monitoring & Maintenance](#11-phase-10--monitoring--maintenance)
12. [Environment Variable Reference](#12-environment-variable-reference)
13. [Troubleshooting](#13-troubleshooting)

---

## 1. Prerequisites

Before starting, ensure you have:

- [ ] A GitHub account (your repo: `Student-Advising-Portal`)
- [ ] A Cloudflare account (free — [sign up](https://dash.cloudflare.com/sign-up))
- [ ] An Oracle Cloud account (free — [sign up](https://signup.oraclecloud.com/))
- [ ] A domain name (optional but recommended — free ones available at [Freenom](https://freenom.com) or use Cloudflare's free subdomain)
- [ ] SSH client (Windows Terminal / PowerShell has built-in `ssh`)
- [ ] Your existing `.env` values from local development

---

## 2. Phase 1 — Oracle Cloud VM Setup

### 2.1 Create an Oracle Cloud Account

1. Go to [https://signup.oraclecloud.com](https://signup.oraclecloud.com/)
2. Fill in your details and add a credit/debit card (you will **never be charged** for Always Free resources)
3. Choose your **Home Region** — pick the one closest to your users (e.g., `ap-seoul-1` for South Korea, `us-ashburn-1` for US East)
4. Wait for account activation (can take up to 30 minutes)

### 2.2 Create an ARM (A1.Flex) VM Instance

1. Go to **OCI Console** → **Compute** → **Instances** → **Create Instance**
2. Configure:

   | Setting | Value |
   |---------|-------|
   | **Name** | `student-advising-server` |
   | **Image** | Ubuntu 22.04 (Always Free Eligible) |
   | **Shape** | VM.Standard.A1.Flex |
   | **OCPUs** | 2 |
   | **Memory** | 12 GB |
   | **Boot Volume** | 100 GB (from your 200 GB allowance) |

3. Under **Networking**:
   - Create a new VCN or use default
   - Assign a **public IPv4 address**
   - Select **Create new subnet** (public)

4. Under **Add SSH keys**:
   - Choose **Generate a key pair** and **download both keys**, or
   - Paste your existing public key (`~/.ssh/id_rsa.pub`)

5. Click **Create** — wait for the instance to be **RUNNING**

### 2.3 Note Your Public IP

After creation, copy the **Public IP Address** from the instance details page (e.g., `129.154.xxx.xxx`). You'll need this throughout the guide.

### 2.4 Open Firewall Ports (Security List)

1. Go to **Networking** → **Virtual Cloud Networks** → your VCN → **Security Lists** → **Default Security List**
2. Add **Ingress Rules**:

   | Source CIDR | Protocol | Dest Port | Description |
   |-------------|----------|-----------|-------------|
   | `0.0.0.0/0` | TCP | 80 | HTTP |
   | `0.0.0.0/0` | TCP | 443 | HTTPS |
   | `0.0.0.0/0` | TCP | 22 | SSH (already exists) |

> **Do NOT open port 5000 or 5432** publicly — Nginx will proxy API traffic through port 443.

---

## 3. Phase 2 — Install Backend Stack on VM

### 3.1 SSH Into Your VM

```bash
ssh -i /path/to/your-private-key ubuntu@YOUR_PUBLIC_IP
```

On Windows PowerShell:
```powershell
ssh -i C:\Users\USER\.ssh\oracle_key ubuntu@YOUR_PUBLIC_IP
```

### 3.2 Update System

```bash
sudo apt update && sudo apt upgrade -y
```

### 3.3 Install Node.js 20

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v  # Should show v20.x
npm -v
```

### 3.4 Install PM2 (Process Manager)

PM2 keeps your Express.js backend running 24/7 and auto-restarts on crash.

```bash
sudo npm install -g pm2
```

### 3.5 Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

### 3.6 Install Certbot (Let's Encrypt SSL)

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 3.7 Open Ubuntu Firewall (iptables)

OCI Ubuntu images block ports by default at the OS level too:

```bash
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo netfilter-persistent save
```

---

## 4. Phase 3 — PostgreSQL Setup

### 4.1 Install PostgreSQL 16

```bash
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/media/keys/ACCC4CF8.asc | sudo apt-key add -
sudo apt update
sudo apt install -y postgresql-16
```

### 4.2 Create Database and User

```bash
sudo -u postgres psql
```

In the PostgreSQL shell:

```sql
CREATE USER student_advising WITH PASSWORD 'YOUR_STRONG_PASSWORD_HERE';
CREATE DATABASE student_advising OWNER student_advising;
GRANT ALL PRIVILEGES ON DATABASE student_advising TO student_advising;
\q
```

> **Important:** Replace `YOUR_STRONG_PASSWORD_HERE` with a strong, unique password (use `openssl rand -hex 32` to generate one).

### 4.3 Configure PostgreSQL for Local Access Only

Edit the config to only allow local connections (secure by default):

```bash
sudo nano /etc/postgresql/16/main/pg_hba.conf
```

Ensure this line exists (it should by default):
```
local   all   student_advising   md5
host    all   student_advising   127.0.0.1/32   md5
```

Restart PostgreSQL:
```bash
sudo systemctl restart postgresql
```

### 4.4 Your DATABASE_URL

Your connection string for the backend will be:
```
postgresql://student_advising:YOUR_STRONG_PASSWORD_HERE@localhost:5432/student_advising
```

---

## 5. Phase 4 — Deploy Backend

### 5.1 Clone the Repository

```bash
cd /home/ubuntu
git clone https://github.com/YOUR_USERNAME/Student-Advising-Portal.git
cd Student-Advising-Portal/backend
```

### 5.2 Install Dependencies

```bash
npm ci --omit=dev
```

### 5.3 Create Production `.env`

```bash
nano .env
```

Paste the following (update values accordingly):

```env
# Server
NODE_ENV=production
PORT=5000
CLIENT_URL=https://your-portal.pages.dev
ACTIVATION_URL_BASE=https://api.yourdomain.com/api/auth/activate
MOBILE_APP_SCHEME=studentadvising

# Database (local PostgreSQL — no SSL needed)
DATABASE_URL=postgresql://student_advising:YOUR_STRONG_PASSWORD_HERE@localhost:5432/student_advising
DB_SSL=false

# Supabase (for profile picture storage — keep existing)
SUPABASE_URL=https://uxnfpqxzbgtdboqcwjjw.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
SUPABASE_PROFILE_BUCKET=profile-pictures

# JWT
JWT_SECRET=your_jwt_secret_here
JWT_REFRESH_SECRET=your_jwt_refresh_secret_here
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# Email (SMTP)
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=noreply.studentadvisingportal@gmail.com
EMAIL_PASSWORD=your_app_password_here
EMAIL_FROM=Student Advising Portal <noreply.studentadvisingportal@gmail.com>

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id.apps.googleusercontent.com
GOOGLE_CLIENT_IDS=client_id_1,client_id_2,client_id_3

# Feature flags
DISABLE_ADMIN_FIRST_LOGIN_ENFORCEMENT=true
```

### 5.4 Run Database Migrations

```bash
npx sequelize-cli db:migrate
```

### 5.5 Seed Initial Data

```bash
npm run seed
```

### 5.6 Test the Backend

```bash
node server.js
```

You should see output indicating the server started on port 5000. Press `Ctrl+C` to stop.

### 5.7 Start with PM2

```bash
pm2 start server.js --name student-advising-api
pm2 save
pm2 startup
```

The last command outputs a system command — **copy and run it** to enable auto-start on reboot.

### 5.8 Verify PM2

```bash
pm2 status
pm2 logs student-advising-api --lines 20
```

---

## 6. Phase 5 — Nginx Reverse Proxy & SSL

### 6.1 Create Nginx Config

```bash
sudo nano /etc/nginx/sites-available/student-advising
```

Paste:

```nginx
server {
    listen 80;
    server_name api.yourdomain.com;

    # Redirect HTTP to HTTPS (Certbot will handle this later)
    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;

        # Timeouts for slow queries
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # File upload limit (match multer config)
    client_max_body_size 10M;
}
```

> **Replace** `api.yourdomain.com` with your actual domain/subdomain.

### 6.2 Enable the Site

```bash
sudo ln -s /etc/nginx/sites-available/student-advising /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 6.3 Get SSL Certificate (Let's Encrypt)

```bash
sudo certbot --nginx -d api.yourdomain.com
```

Follow the prompts:
- Enter your email
- Agree to terms
- Choose to redirect HTTP to HTTPS (recommended)

Certbot auto-renews. Verify with:
```bash
sudo certbot renew --dry-run
```

### 6.4 (Alternative) If You Don't Have a Domain Yet

Use the VM's public IP directly:

```nginx
server {
    listen 80;
    server_name YOUR_PUBLIC_IP;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    client_max_body_size 10M;
}
```

> Note: Without a domain, you can't get an SSL certificate from Let's Encrypt. For production, a domain is strongly advised.

---

## 7. Phase 6 — Deploy Frontend to Cloudflare Pages

### 7.1 Create a Cloudflare Account

1. Go to [https://dash.cloudflare.com/sign-up](https://dash.cloudflare.com/sign-up)
2. Verify your email

### 7.2 Connect Your GitHub Repository

1. In Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**
2. Sign in to GitHub and authorize Cloudflare
3. Select your `Student-Advising-Portal` repository

### 7.3 Configure Build Settings

| Setting | Value |
|---------|-------|
| **Project name** | `student-advising-portal` |
| **Production branch** | `main` (or your default branch) |
| **Framework preset** | Create React App |
| **Build command** | `cd frontend && npm ci && npm run build` |
| **Build output directory** | `frontend/build` |
| **Root directory** | `/` (leave default) |

### 7.4 Set Environment Variables

In the Cloudflare Pages project settings → **Environment variables**:

| Variable | Value |
|----------|-------|
| `REACT_APP_API_URL` | `https://api.yourdomain.com/api` |
| `REACT_APP_GOOGLE_CLIENT_ID` | `131713767896-89rer50ssss6p9emd116afanmclchahv.apps.googleusercontent.com` |
| `NODE_VERSION` | `20` |

> Use your Oracle VM's URL: `https://api.yourdomain.com/api` or `http://YOUR_PUBLIC_IP:5000/api` if no domain.

### 7.5 Deploy

Click **Save and Deploy**. Cloudflare will:
1. Clone your repo
2. Run `cd frontend && npm ci && npm run build`
3. Deploy the `frontend/build` folder to its global CDN

Your frontend will be live at: `https://student-advising-portal.pages.dev`

### 7.6 Verify

Open `https://student-advising-portal.pages.dev` — you should see the login page.

---

## 8. Phase 7 — DNS & Domain Setup

### Option A: Use Cloudflare Pages Default Domain (Simplest)

Your frontend is already at `https://student-advising-portal.pages.dev`. Just configure your backend `CLIENT_URL` in `.env` to match:

```env
CLIENT_URL=https://student-advising-portal.pages.dev
```

### Option B: Custom Domain (Recommended)

1. **Register a domain** or use an existing one
2. **Transfer DNS to Cloudflare** (Cloudflare dashboard → Add Site → follow instructions)
3. **Add DNS records:**

   | Type | Name | Content | Proxy |
   |------|------|---------|-------|
   | A | `api` | `YOUR_ORACLE_VM_IP` | DNS only (grey cloud) |
   | CNAME | `portal` | `student-advising-portal.pages.dev` | Proxied (orange cloud) |

4. In Cloudflare Pages → **Custom domains** → Add `portal.yourdomain.com`
5. Update backend `.env`:

   ```env
   CLIENT_URL=https://portal.yourdomain.com
   ACTIVATION_URL_BASE=https://api.yourdomain.com/api/auth/activate
   ```

6. Restart backend:
   ```bash
   pm2 restart student-advising-api
   ```

---

## 9. Phase 8 — Google OAuth Update

Your Google OAuth credentials need to know about the new URLs.

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → **APIs & Services** → **Credentials**
2. Click on your OAuth 2.0 Client ID
3. Update **Authorized JavaScript origins**:
   ```
   https://student-advising-portal.pages.dev
   https://portal.yourdomain.com        (if using custom domain)
   ```
4. Update **Authorized redirect URIs**:
   ```
   https://student-advising-portal.pages.dev
   https://student-advising-portal.pages.dev/login
   https://portal.yourdomain.com
   https://portal.yourdomain.com/login
   ```
5. Save and wait a few minutes for propagation

---

## 10. Phase 9 — Seed Data & Migrate

If migrating from Supabase-hosted PostgreSQL to the local Oracle VM PostgreSQL:

### 10.1 Export from Supabase (Optional)

If you want to carry over existing data:

```bash
# Run from your local machine (not the VM)
pg_dump "postgresql://postgres.uxnfpqxzbgtdboqcwjjw:YOUR_SUPABASE_PASSWORD@aws-1-ap-northeast-2.pooler.supabase.com:5432/postgres" \
  --no-owner --no-acl > supabase_backup.sql
```

Then copy to VM and import:
```bash
scp -i /path/to/key supabase_backup.sql ubuntu@YOUR_ORACLE_IP:/home/ubuntu/
ssh -i /path/to/key ubuntu@YOUR_ORACLE_IP
psql -U student_advising -d student_advising < /home/ubuntu/supabase_backup.sql
```

### 10.2 Fresh Start (Recommended)

If starting fresh, just run migrations and seed:

```bash
cd /home/ubuntu/Student-Advising-Portal/backend
npx sequelize-cli db:migrate
npm run seed
```

---

## 11. Phase 10 — Monitoring & Maintenance

### 11.1 Auto-Restart on Reboot

Already configured if you ran `pm2 startup` and `pm2 save` earlier. Verify:

```bash
sudo reboot
# Wait 2 minutes, then SSH back in
pm2 status  # Should show student-advising-api as "online"
```

### 11.2 View Logs

```bash
# Backend logs
pm2 logs student-advising-api

# Nginx access/error logs
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# PostgreSQL logs
sudo tail -f /var/log/postgresql/postgresql-16-main.log
```

### 11.3 Automated Database Backups

Create a daily backup script:

```bash
sudo nano /home/ubuntu/backup-db.sh
```

```bash
#!/bin/bash
BACKUP_DIR="/home/ubuntu/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
mkdir -p $BACKUP_DIR

pg_dump -U student_advising -d student_advising > "$BACKUP_DIR/backup_$TIMESTAMP.sql"

# Keep only the last 7 backups
ls -t $BACKUP_DIR/backup_*.sql | tail -n +8 | xargs -r rm
```

```bash
chmod +x /home/ubuntu/backup-db.sh
```

Add to cron (runs daily at 3 AM):
```bash
crontab -e
# Add this line:
0 3 * * * /home/ubuntu/backup-db.sh
```

### 11.4 Prevent Oracle VM Reclamation

Oracle reclaims VMs idle for 7 days (CPU < 20%, Network < 20%, Memory < 20%). Your backend + PostgreSQL should stay above thresholds naturally. As a safety net, add a lightweight keep-alive cron:

```bash
crontab -e
# Add this line (pings your own API every 10 minutes):
*/10 * * * * curl -s http://localhost:5000/api/health > /dev/null 2>&1
```

> Make sure you have a `/api/health` endpoint. If not, any GET route will do.

### 11.5 Update & Redeploy Backend

When you push new code:

```bash
cd /home/ubuntu/Student-Advising-Portal
git pull origin main
cd backend
npm ci --omit=dev
npx sequelize-cli db:migrate  # if there are new migrations
pm2 restart student-advising-api
```

### 11.6 Update Frontend

Just push to `main` on GitHub — Cloudflare Pages auto-deploys on every push.

---

## 12. Environment Variable Reference

### Backend `.env` (on Oracle VM)

| Variable | Example Value | Required |
|----------|---------------|----------|
| `NODE_ENV` | `production` | Yes |
| `PORT` | `5000` | Yes |
| `CLIENT_URL` | `https://student-advising-portal.pages.dev` | Yes |
| `AUTH_COOKIE_SAME_SITE` | `none` (cross-site) or `strict` (same-site) | Recommended |
| `AUTH_COOKIE_SECURE` | `true` | Recommended |
| `AUTH_COOKIE_DOMAIN` | `api.yourdomain.com` (optional) | Optional |
| `ACTIVATION_URL_BASE` | `https://api.yourdomain.com/api/auth/activate` | Yes |
| `DATABASE_URL` | `postgresql://student_advising:PASSWORD@localhost:5432/student_advising` | Yes |
| `DB_SSL` | `false` | Yes |
| `JWT_SECRET` | (64-char hex) | Yes |
| `JWT_REFRESH_SECRET` | (64-char hex) | Yes |
| `JWT_EXPIRE` | `7d` | Yes |
| `JWT_REFRESH_EXPIRE` | `30d` | Yes |
| `SUPABASE_URL` | `https://xxx.supabase.co` | For profile pics |
| `SUPABASE_SERVICE_ROLE_KEY` | `sb_secret_xxx` | For profile pics |
| `SUPABASE_PROFILE_BUCKET` | `profile-pictures` | For profile pics |
| `EMAIL_HOST` | `smtp.gmail.com` | For emails |
| `EMAIL_PORT` | `587` | For emails |
| `EMAIL_USER` | `noreply.xxx@gmail.com` | For emails |
| `EMAIL_PASSWORD` | Gmail App Password | For emails |
| `EMAIL_FROM` | `Portal <noreply@gmail.com>` | For emails |
| `GOOGLE_CLIENT_ID` | `xxx.apps.googleusercontent.com` | For Google login |
| `GOOGLE_CLIENT_IDS` | `id1,id2,id3` | For Google login |
| `MOBILE_APP_SCHEME` | `studentadvising` | For mobile |

### Frontend Environment Variables (on Cloudflare Pages)

| Variable | Example Value |
|----------|---------------|
| `REACT_APP_API_URL` | `https://api.yourdomain.com/api` |
| `REACT_APP_GOOGLE_CLIENT_ID` | `xxx.apps.googleusercontent.com` |
| `NODE_VERSION` | `20` |

---

## 13. Troubleshooting

### Backend won't start

```bash
pm2 logs student-advising-api --lines 50
# Check for missing env vars or database connection errors
```

### Can't connect to PostgreSQL

```bash
sudo systemctl status postgresql
sudo -u postgres psql -c "SELECT 1;"  # Test connection
# Ensure pg_hba.conf allows md5 auth for your user
```

### Frontend shows "Network Error" on API calls

- Check `REACT_APP_API_URL` matches your backend's actual URL
- Check backend `CLIENT_URL` includes your frontend URL (CORS)
- Verify Nginx is running: `sudo systemctl status nginx`
- Check Oracle Security List has ports 80/443 open
- Check OS firewall: `sudo iptables -L -n | grep -E '80|443'`

### SSL certificate issues

```bash
sudo certbot renew --dry-run
# If expired, re-run:
sudo certbot --nginx -d api.yourdomain.com
```

### Oracle VM reclaimed

Sign back in to OCI Console, go to Compute → Instances. If stopped, click **Start**. Add the keep-alive cron from section 11.4 to prevent recurrence.

### CORS errors

Ensure your backend's `CLIENT_URL` env var includes all frontend URLs (comma-separated):
```env
CLIENT_URL=https://student-advising-portal.pages.dev,https://portal.yourdomain.com
```

Then restart:
```bash
pm2 restart student-advising-api
```

### Login works but session cannot refresh (Pages + different backend domain)

When frontend and backend are on different sites (for example `*.pages.dev` and `*.onrender.com`), browsers block strict same-site cookies during cross-site refresh calls.

Set these backend env vars:
```env
AUTH_COOKIE_SAME_SITE=none
AUTH_COOKIE_SECURE=true
```

Then restart backend:
```bash
pm2 restart student-advising-api
```

---

## Quick Reference

| Component | URL | Management |
|-----------|-----|------------|
| **Frontend** | `https://student-advising-portal.pages.dev` | Auto-deploys from GitHub `main` |
| **Backend API** | `https://api.yourdomain.com/api` | SSH + PM2 on Oracle VM |
| **Database** | `localhost:5432` on Oracle VM | `psql` on the VM |
| **Cloudflare Dashboard** | [dash.cloudflare.com](https://dash.cloudflare.com) | Build logs, env vars, domains |
| **Oracle Console** | [cloud.oracle.com](https://cloud.oracle.com) | VM status, networking |
| **Google OAuth** | [console.cloud.google.com](https://console.cloud.google.com) | Authorized origins/redirects |
