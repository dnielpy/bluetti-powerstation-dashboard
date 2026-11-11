from collections.abc import Sequence
from datetime import datetime

from bluetti_bt_lib import FieldName
from sqlalchemy import Row, Select, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app import bluetti, repository
from app.models import Summary

SUMMARY_FIELDS = [
    FieldName.BATTERY_SOC,
    FieldName.AC_OUTPUT_POWER,
    FieldName.AC_INPUT_POWER,
    FieldName.DC_OUTPUT_POWER,
    FieldName.DC_INPUT_POWER,
]


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


async def list_battery_status(session: AsyncSession, since: datetime) -> Sequence[Row]:
    query = (
        select(Summary.date, Summary.battery_percent)
        .where(Summary.date >= since)
        .order_by(Summary.date.asc(), Summary.id.asc())
    )
    return (await session.execute(query)).all()


async def list_ac_output(session: AsyncSession, since: datetime) -> Sequence[Row]:
    query = (
        select(Summary.date, Summary.ac_output)
        .where(Summary.date >= since)
        .order_by(Summary.date.asc(), Summary.id.asc())
    )
    return (await session.execute(query)).all()


async def list_ac_states(session: AsyncSession, since: datetime) -> Sequence[Row]:
    query = (
        select(Summary.date, Summary.ac)
        .where(Summary.date >= since)
        .order_by(Summary.date.asc(), Summary.id.asc())
    )
    return (await session.execute(query)).all()


def build_summary(readings: dict[FieldName, bluetti.Reading]) -> Summary:
    ac_input = int(readings[FieldName.AC_INPUT_POWER].value)
    dc_input = int(readings[FieldName.DC_INPUT_POWER].value)
    return Summary(
        battery_percent=int(readings[FieldName.BATTERY_SOC].value),
        ac_output=int(readings[FieldName.AC_OUTPUT_POWER].value),
        ac_input=ac_input,
        dc_output=int(readings[FieldName.DC_OUTPUT_POWER].value),
        dc_input=dc_input,
        ac=ac_input > 0,
        dc=dc_input > 0,
    )


async def collect_summary(session: AsyncSession) -> Summary:
    readings = await bluetti.read_fields(SUMMARY_FIELDS)
    return await repository.save(session, build_summary(readings))
