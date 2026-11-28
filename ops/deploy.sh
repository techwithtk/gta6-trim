#!/usr/bin/env bash
# Deploy the website to the Hetzner server: copy the code, build it there, restart. Usage: ops/deploy.sh <server-ip>
set -euo pipefail
cd "$(dirname "$0")/.."
HOST="root@${1:?server IP}"
SSH="ssh -i $HOME/.ssh/gta6trim_hetzner -o StrictHostKeyChecking=accept-new"
rsync -az --delete -e "$SSH" --exclude node_modules --exclude .next --exclude '.env*' --exclude .vercel --exclude ops ./ "$HOST:/opt/gta6trim/web/"
$SSH "$HOST" 'set -e
  cd /opt/gta6trim/web && chown -R gta6:gta6 /opt/gta6trim/web
  sudo -u gta6 npm ci --no-audit --no-fund
  sudo -u gta6 bash -c "set -a; . /opt/gta6trim/.env; set +a; npm run build"
  cp -r .next/static .next/standalone/.next/ && { [ -d public ] && cp -r public .next/standalone/ || true; }
  chown -R gta6:gta6 .next
  systemctl restart gta6trim && sleep 3 && systemctl is-active gta6trim
  curl -s -o /dev/null -w "local check: %{http_code}\n" http://127.0.0.1:3000/'
