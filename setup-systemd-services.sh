#!/usr/bin/env bash
set -euo pipefail

if [[ $EUID -ne 0 ]]; then
  echo "Run this with sudo: sudo bash setup-systemd-services.sh" >&2
  exit 1
fi

APP_DIR="/home/online/Notebook"
RUN_USER="online"

echo "=== Stopping the temporary nohup-launched app, if running ==="
pkill -f "npm run all" 2>/dev/null || true
pkill -f "vite --host" 2>/dev/null || true
pkill -f "node server.js" 2>/dev/null || true
sleep 1

echo "=== Writing notebook-backend.service ==="
cat > /etc/systemd/system/notebook-backend.service <<EOF
[Unit]
Description=Notebook backend (Express, port 3001)
After=network.target

[Service]
Type=simple
User=$RUN_USER
WorkingDirectory=$APP_DIR/backend
ExecStart=/usr/bin/node server.js
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

echo "=== Writing notebook-frontend.service ==="
cat > /etc/systemd/system/notebook-frontend.service <<EOF
[Unit]
Description=Notebook frontend (Vite dev server, port 8080)
After=network.target notebook-backend.service

[Service]
Type=simple
User=$RUN_USER
WorkingDirectory=$APP_DIR/frontend
ExecStart=/usr/bin/npx vite --host
Restart=on-failure
RestartSec=3

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable notebook-backend notebook-frontend
systemctl restart notebook-backend notebook-frontend

sleep 2
echo
echo "=== Status ==="
systemctl is-active notebook-backend && echo "notebook-backend: active"
systemctl is-active notebook-frontend && echo "notebook-frontend: active"
echo
echo "Done. Both services will now auto-start on boot and restart on crash."
