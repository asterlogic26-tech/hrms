#!/usr/bin/env bash
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$REPO_DIR"

echo "==> Updating repo"
# When run manually: preserve the production DB, pull latest, then restore.
# (The CI workflow handles this same dance before calling this script, so the
# git pull here will typically be a fast no-op in that case.)
if [[ -f backend/hrms.db ]]; then
  cp backend/hrms.db /tmp/hrms.db.bak
fi
git checkout -- backend/hrms.db 2>/dev/null || true
git pull --ff-only
if [[ -f /tmp/hrms.db.bak ]]; then
  mv /tmp/hrms.db.bak backend/hrms.db
fi

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

if [[ "${SKIP_SEED:-}" != "1" ]]; then
  echo "==> Seeding (idempotent)"
  node seed.js || true
fi
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

