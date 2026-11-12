from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime

from app.blackouts import MAX_READING_GAP, change_time


@dataclass
class PowerPeriod:
    start: datetime
    end: datetime
    receiving_ac: bool


def find_power_periods(readings: Iterable[tuple[datetime, bool]], max_gap=MAX_READING_GAP) -> list[PowerPeriod]:
    """Runs of readings with and without AC power, back to back. A state lasts until the first reading of the other
    one; across a gap without readings the change is placed halfway through it, so gaps are always filled."""
    periods: list[PowerPeriod] = []
    current: PowerPeriod | None = None
    last_seen: datetime | None = None

    for date, receiving_ac in readings:
        if current is None:
            current = PowerPeriod(start=date, end=date, receiving_ac=receiving_ac)
        elif current.receiving_ac != receiving_ac:
            changed = change_time(last_seen, date, max_gap)
            current.end = changed
            periods.append(current)
            current = PowerPeriod(start=changed, end=date, receiving_ac=receiving_ac)
        last_seen = date

    if current is not None and last_seen is not None:
        current.end = last_seen
        periods.append(current)

    return [period for period in periods if period.end > period.start]


@dataclass
class PowerTotals:
    since: datetime | None
    with_power_hours: float
    without_power_hours: float
    receiving_ac: bool | None
    last_outage_start: datetime | None
    outage_ongoing: bool


def power_totals(periods: list[PowerPeriod]) -> PowerTotals:
    """Hours with and without AC power over all the periods, the current state and when the power last went out."""
    with_power = sum(((p.end - p.start).total_seconds() for p in periods if p.receiving_ac), 0.0)
    without_power = sum(((p.end - p.start).total_seconds() for p in periods if not p.receiving_ac), 0.0)
    outages = [p for p in periods if not p.receiving_ac]
    return PowerTotals(
        since=periods[0].start if periods else None,
        with_power_hours=round(with_power / 3600, 3),
        without_power_hours=round(without_power / 3600, 3),
        receiving_ac=periods[-1].receiving_ac if periods else None,
        last_outage_start=outages[-1].start if outages else None,
        outage_ongoing=bool(periods) and not periods[-1].receiving_ac,
    )
