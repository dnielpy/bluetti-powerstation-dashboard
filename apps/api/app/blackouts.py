from collections.abc import Iterable
from dataclasses import dataclass
from datetime import datetime, timedelta

MAX_READING_GAP = timedelta(minutes=5)


@dataclass
class Blackout:
    start: datetime
    end: datetime
    ongoing: bool

    @property
    def duration_hours(self) -> float:
        return round((self.end - self.start).total_seconds() / 3600, 3)


def find_blackouts(
    readings: Iterable[tuple[datetime, bool]],
    max_gap: timedelta = MAX_READING_GAP,
) -> list[Blackout]:
    blackouts: list[Blackout] = []
    start: datetime | None = None
    last_seen: datetime | None = None

    for date, receiving_ac in readings:
        if start is not None and last_seen is not None and date - last_seen > max_gap:
            blackouts.append(Blackout(start=start, end=last_seen, ongoing=False))
            start = None

        if receiving_ac:
            if start is not None:
                blackouts.append(Blackout(start=start, end=date, ongoing=False))
                start = None
        elif start is None:
            start = date

        last_seen = date

    if start is not None and last_seen is not None:
        blackouts.append(Blackout(start=start, end=last_seen, ongoing=True))

    return blackouts
