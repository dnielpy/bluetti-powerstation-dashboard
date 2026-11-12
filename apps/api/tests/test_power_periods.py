from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app import summaries
from app.main import app
from app.models import Summary
from app.power_periods import find_power_periods
from tests.test_data import use_rows  # noqa: F401

client = TestClient(app)

T0 = datetime(2026, 11, 11, 0, 0, tzinfo=timezone.utc)


def _at(minutes: float, receiving_ac: bool) -> tuple[datetime, bool]:
    return (T0 + timedelta(minutes=minutes), receiving_ac)


def _spans(periods) -> list[tuple[float, float, bool]]:
    return [((p.start - T0).total_seconds() / 60, (p.end - T0).total_seconds() / 60, p.receiving_ac) for p in periods]


def test_state_lasts_until_the_first_reading_of_the_other() -> None:
    readings = [_at(0, True), _at(1, True), _at(2, False), _at(3, False), _at(4, True), _at(5, True)]

    assert _spans(find_power_periods(readings)) == [(0, 2, True), (2, 4, False), (4, 5, True)]


def test_reconnection_gap_keeps_the_period() -> None:
    readings = [_at(0, False), _at(13, False), _at(20, True), _at(21, True)]

    assert _spans(find_power_periods(readings)) == [(0, 20, False), (20, 21, True)]


def test_long_gap_is_filled_by_the_state_on_both_sides() -> None:
    readings = [_at(0, True), _at(5, True), _at(60, True), _at(61, True)]

    assert _spans(find_power_periods(readings)) == [(0, 61, True)]


def test_long_gap_between_states_changes_halfway() -> None:
    readings = [_at(0, True), _at(5, True), _at(65, False), _at(70, False)]

    assert _spans(find_power_periods(readings)) == [(0, 35, True), (35, 70, False)]


def test_power_periods_endpoint(use_rows, monkeypatch: pytest.MonkeyPatch) -> None:  # noqa: F811
    use_rows({})

    async def fake_list_ac_states(session, since):
        return [
            Summary(date=T0, ac=True),
            Summary(date=T0 + timedelta(minutes=10), ac=False),
            Summary(date=T0 + timedelta(minutes=20), ac=False),
        ]

    monkeypatch.setattr(summaries, "list_ac_states", fake_list_ac_states)

    response = client.get("/power-periods?hours=24")

    assert response.status_code == 200
    assert response.json() == [
        {"start": "2026-11-11T00:00:00Z", "end": "2026-11-11T00:10:00Z", "receiving_ac": True},
        {"start": "2026-11-11T00:10:00Z", "end": "2026-11-11T00:20:00Z", "receiving_ac": False},
    ]
