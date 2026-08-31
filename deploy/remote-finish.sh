#!/usr/bin/env bash
set -euo pipefail

cd /var/www/flashpoint

docker compose -f docker-compose.prod.yml up -d --remove-orphans --force-recreate
sleep 2
curl -s -o /dev/null -w "local:%{http_code}\n" http://127.0.0.1:3012/ || true
echo "Flashpoint site running on 127.0.0.1:3012"
