# Bluetti Powerstation API

FastAPI service that connects to a Bluetti power station over Bluetooth
(using [`bluetti-bt-lib`](https://pypi.org/project/bluetti-bt-lib/)) and exposes its stats.

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

## Database

Postgres runs in Docker. Connection settings live in `.env` (`POSTGRES_*` and `DATABASE_URL`).

```bash
docker compose up -d
uv run alembic upgrade head
```

To create a migration after adding or changing models:

```bash
uv run alembic revision --autogenerate -m "description"
```

## Run

```bash
uv run uvicorn app.main:app --reload
```

- Health check: http://localhost:8000/health
- Database health check: http://localhost:8000/health/db
- Battery: http://localhost:8000/battery → `{"battery_percent": 92, "model": "AC180"}`
- Power (W) → `{"power": 120, "unit": "W", "model": "AC180"}`:
  - http://localhost:8000/ac-output: power drawn from the AC outlets
  - http://localhost:8000/dc-output: power drawn from the DC/USB outlets
  - http://localhost:8000/ac-input: power coming in through the AC input (wall)
  - http://localhost:8000/dc-input: power coming in through the DC input (solar or car)
- Stored summary: http://localhost:8000/data/{id} → row from the `summary` table (404 if not found)
- Summary list: http://localhost:8000/data-summary → `{"items": [...], "total": 16, "page_size": 10, "offset": 0}`, newest first. All query params are optional:
  - `page_size`: how many records to return (default `10`, max `100`)
  - `offset`: how many records to skip (default `0`)
  - `ac` / `dc`: `true` or `false` to filter by whether AC/DC input was active
- Docs: http://localhost:8000/docs

Notes:
- The Bluetti only accepts one Bluetooth connection at a time: close the official app before using the API.
- The first Bluetti request takes longer because it searches for the device by name.
- macOS asks for Bluetooth permission for the terminal the first time.

## Tests

```bash
uv run pytest
```
