#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE_HOST="${REMOTE_HOST:-rack}"
REMOTE_DIR="${REMOTE_DIR:-/var/www/flashpoint}"

cd "$ROOT"
chmod +x deploy/deploy.sh deploy/remote-finish.sh deploy/setup-domain.sh

echo "Building Next.js standalone..."
DATABASE_URL="${DATABASE_URL:-postgresql://flashpoint:build@127.0.0.1:5434/flashpoint_rentals}" \
BETTER_AUTH_SECRET="${BETTER_AUTH_SECRET:-build-time-secret-min-32-characters-long}" \
npm run build

echo "Preparing remote dirs..."
ssh "$REMOTE_HOST" "mkdir -p ${REMOTE_DIR}/app ${REMOTE_DIR}/deploy ${REMOTE_DIR}/uploads/gallery ${REMOTE_DIR}/uploads/board"

rsync -az --delete .next/standalone/ "${REMOTE_HOST}:${REMOTE_DIR}/app/"
rsync -az .next/static/ "${REMOTE_HOST}:${REMOTE_DIR}/app/.next/static/"
if [[ -d public ]]; then
  rsync -az public/ "${REMOTE_HOST}:${REMOTE_DIR}/app/public/"
fi

rsync -az docker-compose.prod.yml "${REMOTE_HOST}:${REMOTE_DIR}/"
rsync -az drizzle/ "${REMOTE_HOST}:${REMOTE_DIR}/drizzle/"
rsync -az scripts/ "${REMOTE_HOST}:${REMOTE_DIR}/scripts/"
rsync -az deploy/ "${REMOTE_HOST}:${REMOTE_DIR}/deploy/"

ssh "$REMOTE_HOST" "chmod +x ${REMOTE_DIR}/deploy/remote-finish.sh && ${REMOTE_DIR}/deploy/remote-finish.sh"

echo "Deployed. App on 127.0.0.1:3012 behind nginx."
