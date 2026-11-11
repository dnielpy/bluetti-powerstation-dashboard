from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app import summaries
from app.db import get_session
from app.models import Summary
from app.schemas import BatteryStatusPoint, SummaryOut, SummaryPage

router = APIRouter(tags=["data"])


@router.get("/data/{id}", response_model=SummaryOut)
async def get_data(id: int, session: AsyncSession = Depends(get_session)) -> Summary:
    summary = await session.get(Summary, id)
    if summary is None:
        raise HTTPException(status_code=404, detail=f"Summary with id {id} not found")
    return summary


@router.get(
    "/data-summary",
    response_model=SummaryPage,
    description="List stored summaries, newest first.",
)
async def list_data(
    page_size: int = Query(10, ge=1, le=100, description="How many records to return."),
    offset: int = Query(0, ge=0, description="How many records to skip before starting."),
    ac: bool | None = Query(None, description="Only records where AC input was active (or inactive)."),
    dc: bool | None = Query(None, description="Only records where DC input was active (or inactive)."),
    session: AsyncSession = Depends(get_session),
) -> SummaryPage:
    items, total = await summaries.list_summaries(session, page_size, offset, ac, dc)
    return SummaryPage(
        items=[SummaryOut.model_validate(item) for item in items],
        total=total,
        page_size=page_size,
        offset=offset,
    )


@router.get(
    "/battery-status",
    response_model=list[BatteryStatusPoint],
    description="Battery percentage of every stored reading in the last `hours`, oldest first.",
)
async def battery_status(
    hours: float = Query(24, gt=0, le=168, description="How many hours back to include."),
    session: AsyncSession = Depends(get_session),
) -> list[BatteryStatusPoint]:
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    rows = await summaries.list_battery_status(session, since)
    return [BatteryStatusPoint.model_validate(row) for row in rows]
