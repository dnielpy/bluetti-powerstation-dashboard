# Bluetti Powerstation

Full stack app to monitor a Bluetti power station over Bluetooth.

## Structure

```
apps/
  api/   FastAPI backend: reads the Bluetti over Bluetooth and stores stats in Postgres
  web/   Next.js frontend
docker-compose.yml   Postgres for local development
turbo.json           Task runner config (Turborepo)
```

Tasks are orchestrated with [Turborepo](https://turborepo.com/). The API is a Python project, but it has a small `package.json` so Turborepo can run its tasks like any other workspace package.

Each app has its own README with details.

## Requirements

- [uv](https://docs.astral.sh/uv/) (Python 3.12 is downloaded automatically)
- Node.js 24 and [pnpm](https://pnpm.io/) 11
- Docker

## Setup

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
cp apps/web/.env.example apps/web/.env.local
pnpm install
cd apps/api && uv sync && cd ../..
pnpm db:up
pnpm db:migrate
```

Set `BLUETTI_NAME` (and `BLUETTI_ENCRYPTED` if needed) in `apps/api/.env`. The web app reads the API base URL from `API_URL` in `apps/web/.env.local` (default `http://localhost:3001`).

## Development

Start the API and the web app together:

```bash
pnpm dev
```

- API: http://localhost:3001 (Swagger at http://localhost:3001/docs)
- Web: http://localhost:3000

## Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Run the API and the web app with auto reload |
| `pnpm dev:api` | Run only the API |
| `pnpm dev:web` | Run only the web app |
| `pnpm build` | Build every app that has a build step |
| `pnpm lint` | Lint every app that has a lint step |
| `pnpm test` | Run every app's tests |
| `pnpm db:up` | Start Postgres |
| `pnpm db:down` | Stop Postgres |
| `pnpm db:migrate` | Apply database migrations |

## Production (Docker)

Production runs the API, the web app and Postgres with `docker-compose.prod.yml`. It targets a **Linux host with Bluetooth** (for example a Raspberry Pi) close to the Bluetti: the API container talks to the host's BlueZ daemon through its D-Bus socket. Docker Desktop on macOS cannot reach the Mac's Bluetooth, so the API can't read the Bluetti there.

On the host:

```bash
sudo apt install bluez
cp .env.production.example .env.production
getent group bluetooth | cut -d: -f3
id -u
```

Edit `.env.production`: set a strong `POSTGRES_PASSWORD`, your `BLUETTI_NAME`, `BLUETOOTH_GID` to the first number printed above and `APP_UID` to the second one. Then:

```bash
docker compose -f docker-compose.prod.yml --env-file .env.production up -d --build
```

To update a running deployment later, run `./scripts/update.sh`: it stops the containers, runs `git pull` and builds and starts them again, waiting until they are healthy. The database volume is kept.

- Web: http://HOST:3000 · API: http://HOST:3001 (ports set by `WEB_PORT` / `API_PORT`)
- Postgres is not published outside the Docker network.
- Dates rendered by the web server use `TZ` (default `America/Havana`); set it to your timezone.
- The API container runs as `APP_UID` (a user that exists on the host) and without Docker's default AppArmor profile: otherwise D-Bus rejects its connection to BlueZ.
- `GET /battery-estimate` tells when the battery reaches `BATTERY_RESERVE_PERCENT` (default 20 %) at the current load, the average of the last 10 seconds. It learns how fast the battery really drains from every 1 % step of the last 72 hours of discharge (a line drain = a × load + b, so inverter losses and idle draw are included), starting from `BATTERY_CAPACITY_WH` (default 1152, the AC180) while there is no history. The stats page shows it under the battery level and recalculates it every 30 seconds.
- The API applies migrations on startup and runs with a single worker, so the summary job runs once.
- Containers restart automatically, have health checks and rotate their logs (3 × 10 MB).
- Build the images on the host itself (or with `docker buildx --platform linux/arm64` for a Raspberry Pi).

### Bluetooth watchdog

The Bluetooth connection sometimes hangs: BlueZ stays connected to the Bluetti but no data arrives, so the API stops saving readings. `scripts/watchdog.sh` checks the latest reading every minute and, when it is older than 4 minutes, tries one step at a time, waiting 3 minutes between steps:

1. Drop the Bluetti's Bluetooth connection and restart the API. If the disconnect times out, the adapter itself is stuck and only a power cycle helps, so it goes straight to step 3.
2. Restart the Bluetooth service and the API.
3. Power cycle the Bluetooth adapter, then restart the Bluetooth service and the API. If readings still don't come back (for example the Bluetti is off), step 3 repeats every 15 minutes.

Install it once on the host, it starts on boot:

```bash
sudo ./scripts/install-watchdog.sh
journalctl -u bluetti-watchdog -f                 # what it did
sudo WATCHDOG_DRY_RUN=1 ./scripts/watchdog.sh     # what it would do now, without doing it
```

The limits can be changed with `WATCHDOG_STALE_SECONDS`, `WATCHDOG_COOLDOWN_SECONDS` and `WATCHDOG_GIVE_UP_COOLDOWN_SECONDS`.

### Slow or unstable connections

Dependency downloads retry instead of failing on a dropped connection:

- **pnpm** (locally and in the web image): settings in `pnpm-workspace.yaml` — 8 retries with backoff from 20 s up to 3 min, a 5 min request timeout and at most 4 parallel downloads.
- **uv** (API image): `UV_HTTP_RETRIES=8`, `UV_HTTP_TIMEOUT=300` and 4 parallel downloads.
- Both image builds keep their download cache between builds, so a build that fails halfway does not download everything again.

