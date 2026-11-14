#!/bin/sh
# Updates a production deployment: pulls the latest code and builds the images while the old containers keep
# running, then stops them and starts the new ones, so the downtime is only the restart (builds are slow).
# Usage, from anywhere: ./scripts/update.sh
set -eu

cd "$(dirname "$0")/.."

if [ ! -f .env.production ]; then
    echo "Missing .env.production (copy .env.production.example and fill it in)" >&2
    exit 1
fi

compose() {
    docker compose -f docker-compose.prod.yml --env-file .env.production "$@"
}

echo "==> Pulling latest code"
git pull --ff-only

echo "==> Building images"
compose build

echo "==> Stopping containers"
compose down

echo "==> Starting containers"
compose up -d --wait --remove-orphans

compose ps
