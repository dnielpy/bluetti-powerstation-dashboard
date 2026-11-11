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
pnpm install
cd apps/api && uv sync && cd ../..
pnpm db:up
pnpm db:migrate
```

Set `BLUETTI_NAME` (and `BLUETTI_ENCRYPTED` if needed) in `apps/api/.env`.

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
