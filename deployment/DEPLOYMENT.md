# Asterlogic HRMS – EC2 Deployment Guide

## Prerequisites
- Ubuntu 22.04+ EC2 instance, security group open for 80 (HTTP) and SSH
- Domain (optional)

## Install Node.js, PM2, Nginx
```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs git nginx
sudo npm i -g pm2
```

## Clone repository
```bash
cd /var/www
sudo mkdir -p asterlogic-hrms && sudo chown -R $USER:$USER asterlogic-hrms
cd asterlogic-hrms
git clone <your-repo-url> .
```

## Backend setup
```bash
cd backend
cp .env.example .env
# edit .env to set JWT_SECRET and FRONTEND_ORIGIN (e.g. http://your-domain)
npm install
node seed.js
cd ..
```

## Frontend build
```bash
cd frontend
echo "VITE_API_URL=/api" > .env.production
npm install
npm run build
cd ..
```

Move the built frontend to a public directory:
```bash
sudo mkdir -p /var/www/asterlogic-hrms/frontend
sudo cp -r frontend/dist/* /var/www/asterlogic-hrms/frontend/
```

## PM2
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u $USER --hp $HOME
```

## Nginx
```bash
sudo cp deployment/nginx-site.conf /etc/nginx/sites-available/asterlogic-hrms
sudo ln -sf /etc/nginx/sites-available/asterlogic-hrms /etc/nginx/sites-enabled/asterlogic-hrms
sudo nginx -t
sudo systemctl reload nginx
```

Visit http://your-server/ to access the app.

## Environment variables
- PORT: Backend port (default 5000)
- JWT_SECRET: Secret for signing JWT
- FRONTEND_ORIGIN: Origin allowed by CORS (e.g., http://your-domain)

## Updating
```bash
git pull
(cd backend && npm install && pm2 restart asterlogic-hrms-api)
(cd frontend && npm install && npm run build && sudo cp -r dist/* /var/www/asterlogic-hrms/frontend/)
sudo systemctl reload nginx
```
