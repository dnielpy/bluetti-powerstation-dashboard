from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app import summaries
from app.db import get_session
from app.models import Summary
from app.routers.common import bluetti_errors_as_http
from app.schemas import SummaryOut

router = APIRouter(tags=["data"])


@router.post(
    "/update",
    response_model=SummaryOut,
    description="Read the current stats from the Bluetti, store them and return the saved record.",
)
async def update(session: AsyncSession = Depends(get_session)) -> Summary:
    with bluetti_errors_as_http():
        return await summaries.collect_summary(session)
