#!/bin/sh
# Installs and starts the bluetti-watchdog systemd timer, which runs scripts/watchdog.sh every minute.
# Usage: sudo ./scripts/install-watchdog.sh    Logs: journalctl -u bluetti-watchdog -f
set -eu

cd "$(dirname "$0")/.."
REPO=$(pwd)

cat > /etc/systemd/system/bluetti-watchdog.service <<UNIT
[Unit]
Description=Restart the Bluetooth stack when the Bluetti API stops saving readings
After=docker.service bluetooth.service

[Service]
Type=oneshot
ExecStart=$REPO/scripts/watchdog.sh
UNIT

cat > /etc/systemd/system/bluetti-watchdog.timer <<UNIT
[Unit]
Description=Run bluetti-watchdog every minute

[Timer]
OnBootSec=3min
OnUnitActiveSec=1min
AccuracySec=5s

[Install]
WantedBy=timers.target
UNIT

systemctl daemon-reload
systemctl enable --now bluetti-watchdog.timer
systemctl list-timers bluetti-watchdog.timer --no-pager
