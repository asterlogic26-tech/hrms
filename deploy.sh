#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_DIR"

echo "==> Updating repo"
# Backup the live DB from whichever path it lives at (old: backend/hrms.db,
# new default: backend/data/hrms.db).  Always restore to the canonical path.
if [[ -f backend/data/hrms.db ]]; then
  cp backend/data/hrms.db /tmp/hrms.db.bak
elif [[ -f backend/hrms.db ]]; then
  cp backend/hrms.db /tmp/hrms.db.bak
fi
git checkout -- backend/hrms.db 2>/dev/null || true
git pull --ff-only
mkdir -p backend/data
if [[ -f /tmp/hrms.db.bak ]]; then
  mv /tmp/hrms.db.bak backend/data/hrms.db
fi
# Fix permissions so the app process (PM2) can write to the DB
chmod 666 backend/data/hrms.db 2>/dev/null || true
# Remove the old duplicate DB at the legacy path
rm -f backend/hrms.db

echo "==> Backend install"
cd backend
if [[ -f package-lock.json ]]; then
  npm ci --omit=dev
else
  npm install --omit=dev
fi

if [[ -f .env.example && ! -f .env ]]; then
  echo "==> Creating backend/.env from .env.example (please update secrets)"
  cp .env.example .env
fi
# Always keep DB_PATH pointing to the canonical location
grep -v '^DB_PATH=' .env > .env.tmp && mv .env.tmp .env
echo 'DB_PATH=./data/hrms.db' >> .env

if [[ "${SKIP_SEED:-}" != "1" ]]; then
  echo "==> Seeding (idempotent)"
  node seed.js || true
fi

echo "==> Running one-time migrations"
node scripts/one_time_purge.js || true
cd ..

echo "==> Frontend build"
cd frontend
if [[ -f package-lock.json ]]; then
  npm ci
else
  npm install
fi

if [[ ! -f .env.production ]]; then
  echo "VITE_API_URL=/api" > .env.production
fi

npm run build
cd ..

echo "==> Publishing frontend"
sudo mkdir -p /var/www/asterlogic-hrms/frontend
sudo cp -r frontend/dist/* /var/www/asterlogic-hrms/frontend/

echo "==> Restarting services"
pm2 start ecosystem.config.js --update-env
pm2 save
sudo systemctl reload nginx

echo "==> Done"

