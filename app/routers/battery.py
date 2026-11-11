from fastapi import APIRouter, HTTPException

from app import bluetti

router = APIRouter(tags=["battery"])


@router.get("/battery")
async def battery() -> dict[str, int | str]:
    try:
        reading = await bluetti.read_battery()
    except bluetti.BluettiConfigError as err:
        raise HTTPException(status_code=500, detail=str(err))
    except bluetti.BluettiUnavailableError as err:
        raise HTTPException(status_code=503, detail=str(err))

    return {"battery_percent": reading.percent, "model": reading.model}
