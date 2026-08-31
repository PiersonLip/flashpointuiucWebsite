#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE_HOST="${REMOTE_HOST:-rack}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/flashpoint}"

cd "$ROOT"
chmod +x deploy/deploy.sh deploy/remote-finish.sh deploy/setup-domain.sh

echo "Building Next.js standalone..."
npm run build

echo "Preparing remote dirs..."
ssh "$REMOTE_HOST" "mkdir -p ${REMOTE_DIR}/app ${REMOTE_DIR}/deploy"

rsync -az --delete .next/standalone/ "${REMOTE_HOST}:${REMOTE_DIR}/app/"
rsync -az .next/static/ "${REMOTE_HOST}:${REMOTE_DIR}/app/.next/static/"
if [[ -d public ]]; then
  rsync -az public/ "${REMOTE_HOST}:${REMOTE_DIR}/app/public/"
fi

rsync -az docker-compose.prod.yml "${REMOTE_HOST}:${REMOTE_DIR}/"
rsync -az deploy/ "${REMOTE_HOST}:${REMOTE_DIR}/deploy/"

ssh "$REMOTE_HOST" "chmod +x ${REMOTE_DIR}/deploy/remote-finish.sh && ${REMOTE_DIR}/deploy/remote-finish.sh"

echo "Deployed. App on 127.0.0.1:3012 behind nginx."
