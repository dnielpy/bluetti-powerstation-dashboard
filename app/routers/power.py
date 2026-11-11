from bluetti_bt_lib import FieldName
from fastapi import APIRouter

from app.routers.common import read_field_or_http_error

router = APIRouter(tags=["power"])


async def _power(field: FieldName) -> dict[str, int | float | str | None]:
    reading = await read_field_or_http_error(field)
    return {"power": reading.value, "unit": reading.unit, "model": reading.model}


@router.get("/ac-output")
async def ac_output() -> dict[str, int | float | str | None]:
    """Potencia que se está consumiendo por las salidas AC."""
    return await _power(FieldName.AC_OUTPUT_POWER)


@router.get("/dc-output")
async def dc_output() -> dict[str, int | float | str | None]:
    """Potencia que se está consumiendo por las salidas DC/USB."""
    return await _power(FieldName.DC_OUTPUT_POWER)


@router.get("/ac-input")
async def ac_input() -> dict[str, int | float | str | None]:
    """Potencia que está entrando por la toma AC (pared)."""
    return await _power(FieldName.AC_INPUT_POWER)


@router.get("/dc-input")
async def dc_input() -> dict[str, int | float | str | None]:
    """Potencia que está entrando por DC (solar o coche)."""
    return await _power(FieldName.DC_INPUT_POWER)
