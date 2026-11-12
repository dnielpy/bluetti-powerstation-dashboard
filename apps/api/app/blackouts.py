from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime, timedelta

# Readings come every few seconds; past this gap we don't know when the state changed, so it changed halfway
MAX_READING_GAP = timedelta(minutes=15)


@dataclass
class Blackout:
    start: datetime
    end: datetime
    ongoing: bool

    @property
    def duration_hours(self) -> float:
        return round((self.end - self.start).total_seconds() / 3600, 3)


def change_time(last_seen: datetime | None, date: datetime, max_gap: timedelta = MAX_READING_GAP) -> datetime:
    """When the state changed between two readings: at the new one, or halfway through a gap without readings."""
    if last_seen is None or date - last_seen <= max_gap:
        return date
    return last_seen + (date - last_seen) / 2


def find_blackouts(
    readings: Iterable[tuple[datetime, bool]],
    max_gap: timedelta = MAX_READING_GAP,
) -> list[Blackout]:
    """Runs without AC power. A gap without readings never splits one: if the state is the same on both sides the
    gap belongs to it, otherwise the change is placed halfway through the gap."""
    blackouts: list[Blackout] = []
    start: datetime | None = None
    last_seen: datetime | None = None

    for date, receiving_ac in readings:
        if receiving_ac:
            if start is not None:
                blackouts.append(Blackout(start=start, end=change_time(last_seen, date, max_gap), ongoing=False))
                start = None
        elif start is None:
            start = change_time(last_seen, date, max_gap)

        last_seen = date

    if start is not None and last_seen is not None:
        blackouts.append(Blackout(start=start, end=last_seen, ongoing=True))

    return blackouts
