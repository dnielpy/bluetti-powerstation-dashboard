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

## Ejecutar

```bash
uv run uvicorn app.main:app --reload
```

- Health check: http://localhost:8000/health
- Docs: http://localhost:8000/docs

## Tests

```bash
uv run pytest
```
