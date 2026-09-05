#!/usr/bin/env bash
# Hits the overdue / due-soon / waitlist-offer cron endpoint.
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="${ROOT}/.env"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Missing $ENV_FILE" >&2
  exit 1
fi

# shellcheck disable=SC1090
set -a
# shellcheck source=/dev/null
source <(grep -E '^(CRON_SECRET)=' "$ENV_FILE")
set +a

if [[ -z "${CRON_SECRET:-}" ]]; then
  echo "CRON_SECRET not set" >&2
  exit 1
fi

curl -fsS -X POST \
  -H "Authorization: Bearer ${CRON_SECRET}" \
  "http://127.0.0.1:3012/api/cron/overdue"
echo
