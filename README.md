# Bluetti Powerstation API

API en FastAPI para conectarse por Bluetooth a una estación de energía Bluetti
(con [`bluetti-bt-lib`](https://pypi.org/project/bluetti-bt-lib/)) y exponer sus estadísticas.

## Requisitos

- [uv](https://docs.astral.sh/uv/)
- Python 3.12 (uv lo descarga si no está)

## Instalación

```bash
uv sync
```

## Configuración

Copia `.env.example` a `.env` y pon el nombre Bluetooth de tu Bluetti (modelo + número de serie, por ejemplo `AC1802530010445974`):

```bash
cp .env.example .env
```

| Variable | Descripción |
|---|---|
| `BLUETTI_NAME` | Nombre Bluetooth de la Bluetti. De aquí se saca el modelo y se usa para encontrarla. |
| `BLUETTI_ENCRYPTED` | `true` si tu modelo usa conexión cifrada (por defecto `false`). |

## Base de datos

Postgres corre en Docker. Los datos de conexión están en `.env` (`POSTGRES_*` y `DATABASE_URL`).

```bash
docker compose up -d            # levanta Postgres
uv run alembic upgrade head     # aplica las migraciones
```

Para crear una migración después de agregar o cambiar modelos:

```bash
uv run alembic revision --autogenerate -m "descripcion"
```

## Ejecutar

```bash
uv run uvicorn app.main:app --reload
```

- Health check: http://localhost:8000/health
- Health check de la base de datos: http://localhost:8000/health/db
- Batería: http://localhost:8000/battery → `{"battery_percent": 92, "model": "AC180"}`
- Potencia (W) → `{"power": 120, "unit": "W", "model": "AC180"}`:
  - http://localhost:8000/ac-output: consumo en las salidas AC
  - http://localhost:8000/dc-output: consumo en las salidas DC/USB
  - http://localhost:8000/ac-input: entrada por la toma AC (pared)
  - http://localhost:8000/dc-input: entrada por DC (solar o coche)
- Docs: http://localhost:8000/docs

Notas:
- La Bluetti solo acepta una conexión Bluetooth a la vez: cierra la app oficial antes de usar la API.
- La primera petición a `/battery` tarda más porque busca la Bluetti por su nombre.
- macOS pedirá permiso de Bluetooth para la terminal la primera vez.

## Tests

```bash
uv run pytest
```
