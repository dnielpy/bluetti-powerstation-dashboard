from dataclasses import dataclass
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Summary


@dataclass
class Period:
    start: datetime
    end: datetime

    @property
    def duration_hours(self) -> float:
        return round((self.end - self.start).total_seconds() / 3600, 3)


@dataclass
class PowerStatus:
    receiving_ac: bool | None
    current_since: datetime | None
    last_with_power: datetime | None
    last_blackout: Period | None
    last_power_period: Period | None


async def _latest_date(session: AsyncSession, ac: bool, before: datetime | None = None) -> datetime | None:
    query = select(func.max(Summary.date)).where(Summary.ac == ac)
    if before is not None:
        query = query.where(Summary.date < before)
    return await session.scalar(query)


async def _first_date(session: AsyncSession, ac: bool, after: datetime | None) -> datetime | None:
    query = select(func.min(Summary.date)).where(Summary.ac == ac)
    if after is not None:
        query = query.where(Summary.date > after)
    return await session.scalar(query)


async def get_power_status(session: AsyncSession) -> PowerStatus:
    latest = (await session.execute(select(Summary.ac).order_by(Summary.date.desc()).limit(1))).scalar_one_or_none()
    if latest is None:
        return PowerStatus(
            receiving_ac=None, current_since=None, last_with_power=None, last_blackout=None, last_power_period=None
        )

    last_with_power = await _latest_date(session, ac=True)
    last_without_power = await _latest_date(session, ac=False)

    if not latest:
        blackout_since = await _first_date(session, ac=False, after=last_with_power)
        last_power_period = None
        if last_with_power is not None and blackout_since is not None:
            blackout_before = await _latest_date(session, ac=False, before=last_with_power)
            power_start = await _first_date(session, ac=True, after=blackout_before)
            if power_start is not None:
                last_power_period = Period(start=power_start, end=blackout_since)
        return PowerStatus(
            receiving_ac=False,
            current_since=blackout_since,
            last_with_power=last_with_power,
            last_blackout=None,
            last_power_period=last_power_period,
        )

    current_since = await _first_date(session, ac=True, after=last_without_power)
    last_blackout = None
    if last_without_power is not None and current_since is not None:
        power_before = await _latest_date(session, ac=True, before=last_without_power)
        start = await _first_date(session, ac=False, after=power_before)
        if start is not None:
            last_blackout = Period(start=start, end=current_since)

    return PowerStatus(
        receiving_ac=True,
        current_since=current_since,
        last_with_power=last_with_power,
        last_blackout=last_blackout,
        last_power_period=None,
    )
