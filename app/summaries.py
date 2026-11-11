from collections.abc import Sequence

from sqlalchemy import Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Summary


def _apply_filters(query: Select, ac: bool | None, dc: bool | None) -> Select:
    if ac is not None:
        query = query.where(Summary.ac == ac)
    if dc is not None:
        query = query.where(Summary.dc == dc)
    return query


async def list_summaries(
    session: AsyncSession,
    page_size: int,
    offset: int,
    ac: bool | None = None,
    dc: bool | None = None,
) -> tuple[Sequence[Summary], int]:
    items_query = (
        _apply_filters(select(Summary), ac, dc)
        .order_by(Summary.date.desc(), Summary.id.desc())
        .limit(page_size)
        .offset(offset)
    )
    total_query = _apply_filters(select(func.count()).select_from(Summary), ac, dc)

    items = (await session.scalars(items_query)).all()
    total = await session.scalar(total_query) or 0

    return items, total
