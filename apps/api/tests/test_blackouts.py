from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app import summaries
from app.blackouts import find_blackouts
from app.main import app
from app.models import Summary
from tests.test_data import use_rows  # noqa: F401

client = TestClient(app)

T0 = datetime(2026, 11, 11, 0, 0, tzinfo=timezone.utc)


def _readings(*states: bool, step: timedelta = timedelta(seconds=7)) -> list[tuple[datetime, bool]]:
    return [(T0 + step * index, state) for index, state in enumerate(states)]


def test_no_blackouts_when_always_receiving_ac() -> None:
    assert find_blackouts(_readings(True, True, True)) == []


def test_blackout_ends_with_first_reading_with_ac() -> None:
    [blackout] = find_blackouts(_readings(True, False, False, True, True))

    assert blackout.start == T0 + timedelta(seconds=7)
    assert blackout.end == T0 + timedelta(seconds=21)
    assert blackout.ongoing is False


def test_two_separate_blackouts() -> None:
    result = find_blackouts(_readings(False, True, False, False, True))

    assert [(b.start, b.end) for b in result] == [
        (T0, T0 + timedelta(seconds=7)),
        (T0 + timedelta(seconds=14), T0 + timedelta(seconds=28)),
    ]


def test_blackout_still_running_is_ongoing() -> None:
    [blackout] = find_blackouts(_readings(True, False, False))

    assert blackout.ongoing is True
    assert blackout.end == T0 + timedelta(seconds=14)


def test_gap_without_readings_closes_the_blackout_at_the_last_reading() -> None:
    readings = [(T0, False), (T0 + timedelta(minutes=1), False), (T0 + timedelta(hours=2), False)]

    result = find_blackouts(readings)

    assert [(b.start, b.end, b.ongoing) for b in result] == [
        (T0, T0 + timedelta(minutes=1), False),
        (T0 + timedelta(hours=2), T0 + timedelta(hours=2), True),
    ]


def test_duration_hours() -> None:
    [blackout] = find_blackouts(_readings(False, False, True, step=timedelta(minutes=45)), max_gap=timedelta(hours=1))

    assert blackout.duration_hours == 1.5


def test_blackouts_endpoint(use_rows, monkeypatch: pytest.MonkeyPatch) -> None:  # noqa: F811
    use_rows({})
    calls = []

    async def fake_list_ac_states(session, since):
        calls.append(since)
        return [
            Summary(date=T0, ac=True),
            Summary(date=T0 + timedelta(hours=1), ac=False),
            Summary(date=T0 + timedelta(hours=1, minutes=4), ac=False),
            Summary(date=T0 + timedelta(hours=1, minutes=6), ac=True),
        ]

    monkeypatch.setattr(summaries, "list_ac_states", fake_list_ac_states)

    before = datetime.now(timezone.utc)
    response = client.get("/blackouts?hours=12")

    assert response.status_code == 200
    assert response.json() == [
        {
            "start": "2026-11-11T01:00:00Z",
            "end": "2026-11-11T01:06:00Z",
            "duration_hours": 0.1,
            "ongoing": False,
        }
    ]
    assert abs((before - calls[0]).total_seconds() - 12 * 3600) < 5


@pytest.mark.parametrize("query", ["hours=0", "hours=200"])
def test_blackouts_endpoint_invalid_hours(use_rows, query: str) -> None:  # noqa: F811
    use_rows({})

    assert client.get(f"/blackouts?{query}").status_code == 422
