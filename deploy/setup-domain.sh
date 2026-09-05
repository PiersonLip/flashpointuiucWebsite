#!/usr/bin/env bash
# Install / refresh nginx + Let's Encrypt for flashpointuiuc.com
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE_HOST="${REMOTE_HOST:-rack}"
SITE_NAME="flashpointuiuc.com"

chmod +x "$ROOT/deploy/setup-domain.sh"

echo "Checking DNS for ${SITE_NAME} and rentals.flashpointuiuc.com → VPS..."
ssh "$REMOTE_HOST" "bash -c '
set -euo pipefail
VPS_IP=\$(hostname -I | awk \"{print \\\$1}\")
RESOLVED=\$(getent ahostsv4 ${SITE_NAME} | awk \"{print \\\$1; exit}\" || true)
RENTALS=\$(getent ahostsv4 rentals.flashpointuiuc.com | awk \"{print \\\$1; exit}\" || true)
echo \"VPS IP: \$VPS_IP\"
echo \"DNS  : \${RESOLVED:-<unresolved>}\"
echo \"Rentals: \${RENTALS:-<unresolved>}\"
if [[ -z \"\${RESOLVED:-}\" || \"\$RESOLVED\" != \"\$VPS_IP\" ]]; then
  echo \"ERROR: Point an A record for ${SITE_NAME} (and www) to \$VPS_IP, wait for DNS, then re-run.\"
  exit 1
fi
if [[ -z \"\${RENTALS:-}\" || \"\$RENTALS\" != \"\$VPS_IP\" ]]; then
  echo \"ERROR: Point an A record for rentals.flashpointuiuc.com to \$VPS_IP, wait for DNS, then re-run.\"
  exit 1
fi
'"

scp "$ROOT/deploy/nginx-flashpoint.http-bootstrap.conf" \
  "${REMOTE_HOST}:/tmp/nginx-flashpoint.http-bootstrap.conf"
scp "$ROOT/deploy/nginx-flashpoint.conf" \
  "${REMOTE_HOST}:/tmp/nginx-flashpoint.conf"

ssh "$REMOTE_HOST" "bash -c '
set -euo pipefail
sudo cp /tmp/nginx-flashpoint.http-bootstrap.conf /etc/nginx/sites-available/${SITE_NAME}
sudo ln -sfn /etc/nginx/sites-available/${SITE_NAME} /etc/nginx/sites-enabled/${SITE_NAME}
sudo mkdir -p /var/www/html
sudo nginx -t
sudo systemctl reload nginx

if ! sudo certbot certonly --webroot -w /var/www/html \
  -d flashpointuiuc.com -d www.flashpointuiuc.com -d rentals.flashpointuiuc.com \
  --non-interactive --agree-tos --keep-until-expiring \
  -m piersonlipschultz@gmail.com; then
  sudo certbot --nginx -d flashpointuiuc.com -d www.flashpointuiuc.com -d rentals.flashpointuiuc.com \
    --non-interactive --agree-tos --redirect \
    -m piersonlipschultz@gmail.com
fi

sudo cp /tmp/nginx-flashpoint.conf /etc/nginx/sites-available/${SITE_NAME}
sudo ln -sfn /etc/nginx/sites-available/${SITE_NAME} /etc/nginx/sites-enabled/${SITE_NAME}
sudo nginx -t
sudo systemctl reload nginx
echo \"nginx OK for ${SITE_NAME}\"
curl -sI https://flashpointuiuc.com/ | head -8 || true
'"

echo "Domain TLS ready. Deploy the app next with ./deploy/deploy.sh"
