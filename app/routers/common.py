from collections.abc import Iterator
from contextlib import contextmanager

from bluetti_bt_lib import FieldName
from fastapi import HTTPException

from app import bluetti


@contextmanager
def bluetti_errors_as_http() -> Iterator[None]:
    try:
        yield
    except bluetti.BluettiConfigError as err:
        raise HTTPException(status_code=500, detail=str(err))
    except bluetti.BluettiUnavailableError as err:
        raise HTTPException(status_code=503, detail=str(err))


async def read_field_or_http_error(field: FieldName) -> bluetti.Reading:
    with bluetti_errors_as_http():
        return await bluetti.read_field(field)
