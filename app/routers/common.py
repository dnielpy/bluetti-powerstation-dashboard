from bluetti_bt_lib import FieldName
from fastapi import HTTPException

from app import bluetti


async def read_field_or_http_error(field: FieldName) -> bluetti.Reading:
    try:
        return await bluetti.read_field(field)
    except bluetti.BluettiConfigError as err:
        raise HTTPException(status_code=500, detail=str(err))
    except bluetti.BluettiUnavailableError as err:
        raise HTTPException(status_code=503, detail=str(err))
