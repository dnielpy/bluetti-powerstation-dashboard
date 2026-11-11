from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.db import get_session
from app.models import Summary
from app.schemas import SummaryOut

router = APIRouter(tags=["data"])


@router.get("/data/{id}", response_model=SummaryOut)
async def get_data(id: int, session: AsyncSession = Depends(get_session)) -> Summary:
    summary = await session.get(Summary, id)
    if summary is None:
        raise HTTPException(status_code=404, detail=f"Summary with id {id} not found")
    return summary
