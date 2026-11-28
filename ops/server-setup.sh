#!/usr/bin/env bash
# One-time setup of a fresh Ubuntu 24.04 server for gta6trim.com (run as root on the server).
# Installs Node 24, Caddy (automatic HTTPS), a firewall, and a systemd service that runs the Next.js site.
set -euo pipefail
export DEBIAN_FRONTEND=noninteractive

apt-get update -y && apt-get upgrade -y
apt-get install -y curl ca-certificates gnupg ufw rsync debian-keyring debian-archive-keyring apt-transport-https unattended-upgrades

# Node.js 24
curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
apt-get install -y nodejs

# Caddy (HTTPS certificates are issued and renewed automatically)
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' > /etc/apt/sources.list.d/caddy-stable.list
apt-get update -y && apt-get install -y caddy

# App user + folders
id -u gta6 >/dev/null 2>&1 || useradd --system --create-home --shell /usr/sbin/nologin gta6
mkdir -p /opt/gta6trim/web && chown -R gta6:gta6 /opt/gta6trim
touch /opt/gta6trim/.env && chown gta6:gta6 /opt/gta6trim/.env && chmod 600 /opt/gta6trim/.env

# 2 GB swap so builds never run out of memory
if ! swapon --show | grep -q /swapfile; then
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

cat > /etc/systemd/system/gta6trim.service <<'UNIT'
[Unit]
Description=GTA6 Trim website (Next.js)
After=network.target

[Service]
User=gta6
WorkingDirectory=/opt/gta6trim/web/.next/standalone
EnvironmentFile=/opt/gta6trim/.env
Environment=NODE_ENV=production PORT=3000 HOSTNAME=127.0.0.1
ExecStart=/usr/bin/node server.js
Restart=always
RestartSec=3

[Install]
WantedBy=multi-user.target
UNIT

cat > /etc/caddy/Caddyfile <<'CADDY'
gta6trim.com {
	encode zstd gzip
	reverse_proxy 127.0.0.1:3000
}
www.gta6trim.com {
	redir https://gta6trim.com{uri} permanent
}
CADDY

ufw allow OpenSSH && ufw allow 80 && ufw allow 443 && ufw --force enable
systemctl daemon-reload && systemctl enable gta6trim caddy
systemctl restart caddy
echo "setup done"
