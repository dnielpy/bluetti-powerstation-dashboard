from bluetti_bt_lib import FieldName
from fastapi import APIRouter

from app.routers.common import read_field_or_http_error

router = APIRouter(tags=["battery"])


@router.get("/battery")
async def battery() -> dict[str, int | float | str]:
    reading = await read_field_or_http_error(FieldName.BATTERY_SOC)
    return {"battery_percent": reading.value, "model": reading.model}
