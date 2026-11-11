# Bluetti Powerstation API

FastAPI service that connects to a Bluetti power station over Bluetooth
(using [`bluetti-bt-lib`](https://pypi.org/project/bluetti-bt-lib/)) and exposes its stats.

All commands below run from `apps/api` unless noted otherwise.

## Requirements

- [uv](https://docs.astral.sh/uv/)
- Python 3.12 (uv downloads it if missing)

## Installation

```bash
uv sync
```

## Configuration

Copy `.env.example` to `.env` and set your Bluetti's Bluetooth name (model + serial number, e.g. `AC1802530010445974`):

```bash
cp .env.example .env
```

| Variable | Description |
|---|---|
| `BLUETTI_NAME` | Bluetooth name of the Bluetti. Used to get the model and to find the device. |
| `BLUETTI_ENCRYPTED` | `true` if your model uses an encrypted connection (default `false`). |
| `DATABASE_URL` | Postgres connection URL (async driver), e.g. `postgresql+asyncpg://bluetti:bluetti@localhost:5432/bluetti`. |
| `SUMMARY_JOB_INTERVAL_SECONDS` | How often the background job stores a new summary (default `300`, `0` disables it). |

## Database

Postgres runs in Docker from the repository root (see the root README). Its credentials live in the root `.env` (`POSTGRES_*`); `DATABASE_URL` here must match them.

```bash
uv run alembic upgrade head
```

To create a migration after adding or changing models:

```bash
uv run alembic revision --autogenerate -m "description"
```

## Run

```bash
uv run uvicorn app.main:app --reload --port 3001
```

- Health check: http://localhost:3001/health
- Database health check: http://localhost:3001/health/db
- Battery: http://localhost:3001/battery → `{"battery_percent": 92, "model": "AC180"}`
- Power (W) → `{"power": 120, "unit": "W", "model": "AC180"}`:
  - http://localhost:3001/ac-output: power drawn from the AC outlets
  - http://localhost:3001/dc-output: power drawn from the DC/USB outlets
  - http://localhost:3001/ac-input: power coming in through the AC input (wall)
  - http://localhost:3001/dc-input: power coming in through the DC input (solar or car)
- Stored summary: http://localhost:3001/data/{id} → row from the `summary` table (404 if not found)
- Summary list: http://localhost:3001/data-summary → `{"items": [...], "total": 16, "page_size": 10, "offset": 0}`, newest first. All query params are optional:
  - `page_size`: how many records to return (default `10`, max `100`)
  - `offset`: how many records to skip (default `0`)
  - `ac` / `dc`: `true` or `false` to filter by whether AC/DC input was active
- Update: `POST http://localhost:3001/update` → reads battery and AC/DC power from the Bluetti in one connection, stores a new `summary` row and returns it. `ac`/`dc` are `true` when the AC/DC input power is above 0.
- Docs: http://localhost:3001/docs

Notes:
- The Bluetti only accepts one Bluetooth connection at a time: close the official app before using the API.
- The first Bluetti request takes longer because it searches for the device by name.
- macOS asks for Bluetooth permission for the terminal the first time.

## Summary job

While the API is running, a background job reads the Bluetti and stores a new `summary` row every `SUMMARY_JOB_INTERVAL_SECONDS` (5 minutes by default). It runs once at startup, then on every interval. If a reading fails, the error is logged and the job tries again on the next interval.

Run the API with a single worker: each worker starts its own job.

## Tests

```bash
uv run pytest
```
