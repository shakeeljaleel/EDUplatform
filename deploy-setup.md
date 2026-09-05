# Linode + CentminMod CI/CD Deployment Setup Guide

This guide details how to configure your **Linode CentminMod server** and **GitHub Repository Secrets** to enable automatic deployment for your **Development** and **Production** domains.

---

## 1. Required GitHub Repository Secrets

Go to your repository on GitHub: **Settings → Secrets and variables → Actions → New repository secret**.

Add the following secrets:

| Secret Name | Value | Description |
| :--- | :--- | :--- |
| `LINODE_SERVER_IP` | `123.45.67.89` | Your Linode server's public IP address |
| `LINODE_SERVER_USER` | `root` (or sudo user) | SSH user name for deployment |
| `LINODE_SSH_PRIVATE_KEY` | `-----BEGIN OPENSSH PRIVATE KEY-----...` | Private key matching authorized SSH key on Linode |
| `DEV_PATH` | `/home/nginx/domains/dev.yourdomain.com/public` | Absolute path to development app on server |
| `PROD_PATH` | `/home/nginx/domains/yourdomain.com/public` | Absolute path to production app on server |

---

## 2. Linode Server Setup (One-Time Configuration)

### A. Create Application Directories
Log in to your Linode server via SSH:

```bash
# Create directories for Dev and Production environments
mkdir -p /home/nginx/domains/dev.yourdomain.com/public
mkdir -p /home/nginx/domains/yourdomain.com/public
```

### B. Clone the Repository on Server
```bash
# Dev Domain directory
cd /home/nginx/domains/dev.yourdomain.com/public
git clone <YOUR_GITHUB_REPO_URL> .
git checkout develop
cp .env.example .env # Set your dev variables (PORT=3001)

# Production Domain directory
cd /home/nginx/domains/yourdomain.com/public
git clone <YOUR_GITHUB_REPO_URL> .
git checkout main
cp .env.example .env # Set your prod variables (PORT=3000)
```

---

## 3. CentminMod Nginx Virtual Host Setup

In CentminMod, create vhosts for both domains using `centmin` option 2 (or add Nginx config files).

### Development Vhost Configuration (`/usr/local/nginx/conf/conf.d/dev.yourdomain.com.ssl.conf`):
```nginx
server {
    listen 443 ssl http2;
    server_name dev.yourdomain.com;

    ssl_certificate /usr/local/nginx/conf/ssl/dev.yourdomain.com/dev.yourdomain.com.crt;
    ssl_certificate_key /usr/local/nginx/conf/ssl/dev.yourdomain.com/dev.yourdomain.com.key;

    location / {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### Production Vhost Configuration (`/usr/local/nginx/conf/conf.d/yourdomain.com.ssl.conf`):
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com www.yourdomain.com;

    ssl_certificate /usr/local/nginx/conf/ssl/yourdomain.com/yourdomain.com.crt;
    ssl_certificate_key /usr/local/nginx/conf/ssl/yourdomain.com/yourdomain.com.key;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Reload Nginx:
```bash
ngxrestart
```

---

## 4. PM2 Process Initialization

On your Linode server:

```bash
# Start Dev App (Port 3001)
cd /home/nginx/domains/dev.yourdomain.com/public
npm ci && npm run build
pm2 start npm --name "eduplatform-dev" -- start -- -p 3001

# Start Production App (Port 3000)
cd /home/nginx/domains/yourdomain.com/public
npm ci && npm run build
pm2 start npm --name "eduplatform-prod" -- start -- -p 3000

# Save PM2 state to auto-restart on server reboot
pm2 save
pm2 startup
```

---

## 5. Daily Git Workflow from Antigravity

### Development Work:
```bash
# Switch to develop branch
git checkout develop

# Make changes in Antigravity, then commit & push
git add .
git commit -m "Add new feature"
git push origin develop
# -> GitHub Actions deploys automatically to dev.yourdomain.com!
```

### Production Release:
1. Open GitHub and create a **Pull Request** from `develop` → `main`.
2. Review and merge the Pull Request.
3. -> GitHub Actions deploys automatically to `yourdomain.com`!
