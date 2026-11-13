#!/bin/sh
# Restarts the Bluetooth stack when the API stops saving readings, escalating step by step.
# Runs as root every minute from the bluetti-watchdog systemd timer (see scripts/install-watchdog.sh).
# Usage: sudo ./scripts/watchdog.sh       (WATCHDOG_DRY_RUN=1 prints the plan without running it)
set -eu

cd "$(dirname "$0")/.."

STALE_SECONDS=${WATCHDOG_STALE_SECONDS:-240}
COOLDOWN_SECONDS=${WATCHDOG_COOLDOWN_SECONDS:-180}
# Once every step has been tried (for example the Bluetti is off or out of range), retry less often
GIVE_UP_COOLDOWN_SECONDS=${WATCHDOG_GIVE_UP_COOLDOWN_SECONDS:-900}
STATE_DIR=${WATCHDOG_STATE_DIR:-/var/lib/bluetti-watchdog}
DRY_RUN=${WATCHDOG_DRY_RUN:-0}
MAX_LEVEL=3

env_value() {
    sed -n "s/^$1=//p" .env.production | tail -n 1
}

API_PORT=$(env_value API_PORT)
API_PORT=${API_PORT:-3001}
BLUETTI_NAME=$(env_value BLUETTI_NAME)

log() {
    echo "watchdog: $*"
}

# Runs a command without stopping on errors, leaving its exit code in last_status
run() {
    log "  \$ $*"
    last_status=0
    if [ "$DRY_RUN" != 1 ]; then
        "$@" || last_status=$?
        if [ "$last_status" != 0 ]; then
            log "  (failed with exit code $last_status, continuing)"
        fi
    fi
}

compose() {
    docker compose -f docker-compose.prod.yml --env-file .env.production "$@"
}

latest_reading_age() {
    last=$(curl -fsS -m 10 "http://127.0.0.1:$API_PORT/data-summary?page_size=1" | jq -r '.items[0].date // empty') || true
    if [ -z "$last" ]; then
        echo unknown
        return
    fi
    echo $(( $(date +%s) - $(date -d "$last" +%s) ))
}

bluetti_address() {
    timeout 10 bluetoothctl devices | awk -v name="$BLUETTI_NAME" '$3 == name { print $2; exit }'
}

restart_api() {
    run compose restart api
}

# Returns 1 without restarting the API when the adapter does not answer the disconnect, since then only step 3 helps
step_1() {
    log "step 1: drop the Bluetti's Bluetooth connection and restart the API"
    address=$(bluetti_address || true)
    if [ -n "$address" ]; then
        run timeout 15 bluetoothctl disconnect "$address"
        if [ "$last_status" = 124 ]; then
            log "the adapter did not answer the disconnect, it is stuck: skipping to step 3"
            return 1
        fi
    fi
    restart_api
}

step_2() {
    log "step 2: restart the Bluetooth service and the API"
    run timeout 30 systemctl restart bluetooth
    restart_api
}

step_3() {
    log "step 3: power cycle the Bluetooth adapter, restart the Bluetooth service and the API"
    run rfkill block bluetooth
    run sleep 5
    run rfkill unblock bluetooth
    run timeout 30 systemctl restart bluetooth
    run sleep 3
    run timeout 10 bluetoothctl power on
    restart_api
}

mkdir -p "$STATE_DIR"
level=$(cat "$STATE_DIR/level" 2>/dev/null || echo 0)
last_action=$(cat "$STATE_DIR/last_action" 2>/dev/null || echo 0)
now=$(date +%s)

age=$(latest_reading_age)

# An unreachable API (for example during a deployment) only counts once it has been down for as long as the limit
if [ "$age" = unknown ]; then
    if [ ! -f "$STATE_DIR/unreachable_since" ] && [ "$DRY_RUN" != 1 ]; then
        echo "$now" > "$STATE_DIR/unreachable_since"
    fi
    unreachable_since=$(cat "$STATE_DIR/unreachable_since" 2>/dev/null || echo "$now")
    age=$(( now - unreachable_since ))
    log "API not answering for ${age}s"
    reachable=0
else
    rm -f "$STATE_DIR/unreachable_since"
    reachable=1
fi

if [ "$age" -le "$STALE_SECONDS" ]; then
    if [ "$reachable" = 1 ] && [ "$level" -gt 0 ]; then
        log "readings are back (last one ${age}s ago) after step $level"
        echo 0 > "$STATE_DIR/level"
    fi
    exit 0
fi

cooldown=$COOLDOWN_SECONDS
if [ "$level" -ge "$MAX_LEVEL" ]; then
    cooldown=$GIVE_UP_COOLDOWN_SECONDS
fi
since_action=$(( now - last_action ))
if [ "$since_action" -lt "$cooldown" ]; then
    log "no readings for ${age}s, waiting for step $level to take effect ($since_action/${cooldown}s)"
    exit 0
fi

next=$(( level < MAX_LEVEL ? level + 1 : MAX_LEVEL ))
log "no readings for ${age}s (limit ${STALE_SECONDS}s)"
if ! "step_$next"; then
    next=$MAX_LEVEL
    "step_$next"
fi

if [ "$DRY_RUN" != 1 ]; then
    echo "$next" > "$STATE_DIR/level"
    echo "$now" > "$STATE_DIR/last_action"
fi
