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

## Ejecutar

```bash
uv run uvicorn app.main:app --reload
```

- Health check: http://localhost:8000/health
- Batería: http://localhost:8000/battery → `{"battery_percent": 92, "model": "AC180"}`
- Docs: http://localhost:8000/docs

Notas:
- La Bluetti solo acepta una conexión Bluetooth a la vez: cierra la app oficial antes de usar la API.
- La primera petición a `/battery` tarda más porque busca la Bluetti por su nombre.
- macOS pedirá permiso de Bluetooth para la terminal la primera vez.

## Tests

```bash
uv run pytest
```
