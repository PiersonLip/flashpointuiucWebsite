#!/usr/bin/env bash
# Runs on the VPS after rsync. Keep free of nested stdin-heredocs.
set -euo pipefail

cd /var/www/flashpoint

python3 - <<'PY'
from pathlib import Path

def parse(path: Path) -> dict[str, str]:
    out: dict[str, str] = {}
    if not path.exists():
        return out
    for line in path.read_text().splitlines():
        s = line.strip()
        if not s or s.startswith("#") or "=" not in s:
            continue
        k, v = s.split("=", 1)
        out[k] = v
    return out

incoming = parse(Path(".env.incoming"))
existing = parse(Path(".env"))
merged = dict(existing)
for k, v in incoming.items():
    if v.strip() != "" or k not in existing:
        merged[k] = v
keys = list(incoming.keys()) + [k for k in existing if k not in incoming]
lines = [f"{k}={merged[k]}" for k in keys if k in merged]
Path(".env").write_text("\n".join(lines) + "\n")
Path(".env.incoming").unlink(missing_ok=True)
print("Merged .env (%d keys)" % len(merged))
PY

docker compose -f docker-compose.prod.yml --env-file .env up -d --force-recreate web
echo "Waiting for postgres..."
for i in $(seq 1 40); do
  if docker compose -f docker-compose.prod.yml exec -T db pg_isready -U flashpoint -d flashpoint_rentals >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

echo "CREATE TABLE IF NOT EXISTS schema_migrations (filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());" | \
  docker compose -f docker-compose.prod.yml exec -T db psql -U flashpoint -d flashpoint_rentals -v ON_ERROR_STOP=1

for f in $(ls drizzle/*.sql 2>/dev/null | sort); do
  base=$(basename "$f")
  has=$(docker compose -f docker-compose.prod.yml exec -T db psql -U flashpoint -d flashpoint_rentals -tAc \
    "SELECT 1 FROM schema_migrations WHERE filename='${base}'" || true)
  if [[ "${has// /}" == "1" ]]; then
    echo "Skip migration $base (already applied)"
    continue
  fi
  echo "Applying migration $base..."
  set +e
  sed 's/--> statement-breakpoint//g' "$f" | \
    docker compose -f docker-compose.prod.yml exec -T db psql -U flashpoint -d flashpoint_rentals -v ON_ERROR_STOP=1
  rc=$?
  set -e
  if [[ $rc -eq 0 ]]; then
    docker compose -f docker-compose.prod.yml exec -T db psql -U flashpoint -d flashpoint_rentals -v ON_ERROR_STOP=1 \
      -c "INSERT INTO schema_migrations(filename) VALUES ('${base}')"
  else
    echo "Migration $base failed (exit $rc)" >&2
    exit 1
  fi
done

set +e
docker run --rm --network host \
  -e DATABASE_URL="$(grep '^DATABASE_URL=' .env | cut -d= -f2-)" \
  -e BOOTSTRAP_MANAGER_EMAIL="$(grep '^BOOTSTRAP_MANAGER_EMAIL=' .env | cut -d= -f2-)" \
  -e BOOTSTRAP_MANAGER_NAME="$(grep '^BOOTSTRAP_MANAGER_NAME=' .env | cut -d= -f2-)" \
  -e BOOTSTRAP_MANAGER_NETID="$(grep '^BOOTSTRAP_MANAGER_NETID=' .env | cut -d= -f2-)" \
  -e BOOTSTRAP_MANAGER_PASSWORD="$(grep '^BOOTSTRAP_MANAGER_PASSWORD=' .env | cut -d= -f2-)" \
  -v /var/www/flashpoint/scripts:/scripts \
  -w /scripts \
  node:22-bookworm-slim \
  bash -lc 'npm init -y >/dev/null && npm install better-auth postgres tsx bcryptjs >/dev/null 2>&1 && npx tsx seed-manager.ts' || echo "Manager seed skipped/failed"

docker run --rm --network host \
  -e DATABASE_URL="$(grep '^DATABASE_URL=' .env | cut -d= -f2-)" \
  -v /var/www/flashpoint/scripts:/scripts \
  -w /scripts \
  node:22-bookworm-slim \
  bash -lc 'npm init -y >/dev/null && npm install postgres tsx >/dev/null 2>&1 && npx tsx seed-equipment.ts' || echo "Equipment seed skipped/failed"
set -e

chmod +x deploy/run-overdue-cron.sh
printf '%s\n' \
  'SHELL=/bin/bash' \
  'PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin' \
  '*/15 * * * * root /var/www/flashpoint/deploy/run-overdue-cron.sh >> /var/log/flashpoint-overdue-cron.log 2>&1' \
  | sudo tee /etc/cron.d/flashpoint-rentals >/dev/null
sudo chmod 644 /etc/cron.d/flashpoint-rentals

sleep 2
curl -s -o /dev/null -w "main:%{http_code}\n" http://127.0.0.1:3012/ || true
echo "Flashpoint site + rentals running on 127.0.0.1:3012"
/var/www/flashpoint/deploy/run-overdue-cron.sh || echo "Cron smoke test failed"
