#!/usr/bin/env bash
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run this with sudo: sudo bash setup-notebook-domain.sh" >&2
  exit 1
fi

LAN_IP="10.0.0.131"

echo "=== Installing dnsmasq and caddy ==="
apt-get update -qq
apt-get install -y dnsmasq caddy

echo "=== Configuring dnsmasq (notebook.com -> $LAN_IP for the LAN) ==="
# The default dnsmasq install may also start systemd-resolved's stub off
# loopback; our config only binds LAN_IP so it won't conflict.
mkdir -p /etc/dnsmasq.d
cat > /etc/dnsmasq.d/notebook.conf <<EOF
listen-address=$LAN_IP
bind-interfaces
address=/notebook.com/$LAN_IP
server=1.1.1.1
server=8.8.8.8
EOF
systemctl enable dnsmasq
systemctl restart dnsmasq

echo "=== Configuring caddy (http://notebook.com -> frontend :8080, /api/* -> backend :3001) ==="
cat > /etc/caddy/Caddyfile <<'EOF'
http://notebook.com {
    reverse_proxy /api/* localhost:3001
    reverse_proxy localhost:8080
}
EOF
systemctl enable caddy
systemctl restart caddy

echo
echo "=== Status ==="
systemctl is-active dnsmasq && echo "dnsmasq: active"
systemctl is-active caddy && echo "caddy: active"
echo
echo "Done. Next steps:"
echo "1. On your router's admin page, set LAN/DHCP DNS to $LAN_IP so all home devices use it."
echo "   (Or manually set DNS to $LAN_IP in each device's Wi-Fi settings.)"
echo "2. Make sure the app is running: cd $(dirname "$0") && npm run all"
echo "3. Visit http://notebook.com from a device using that DNS."
