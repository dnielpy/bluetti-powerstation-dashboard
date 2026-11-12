from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime

from app.blackouts import MAX_READING_GAP


@dataclass
class PowerPeriod:
    start: datetime
    end: datetime
    receiving_ac: bool


def find_power_periods(readings: Iterable[tuple[datetime, bool]], max_gap=MAX_READING_GAP) -> list[PowerPeriod]:
    """Runs of readings with and without AC power. A state lasts until the first reading of the other one; a gap
    without readings longer than `max_gap` ends it at the last reading, so the gap counts as neither."""
    periods: list[PowerPeriod] = []
    current: PowerPeriod | None = None
    last_seen: datetime | None = None

    for date, receiving_ac in readings:
        if current is not None and last_seen is not None and date - last_seen > max_gap:
            current.end = last_seen
            periods.append(current)
            current = None

        if current is None:
            current = PowerPeriod(start=date, end=date, receiving_ac=receiving_ac)
        elif current.receiving_ac != receiving_ac:
            current.end = date
            periods.append(current)
            current = PowerPeriod(start=date, end=date, receiving_ac=receiving_ac)

        last_seen = date

    if current is not None and last_seen is not None:
        current.end = last_seen
        periods.append(current)

    # A single reading between gaps has no length and tells nothing about how long the state lasted
    return [period for period in periods if period.end > period.start]
