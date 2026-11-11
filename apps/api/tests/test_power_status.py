from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app import power_status
from app.main import app
from app.power_status import Period, PowerStatus
from tests.test_data import use_rows  # noqa: F401

client = TestClient(app)

T0 = datetime(2026, 11, 11, 10, 0, tzinfo=timezone.utc)
T1 = datetime(2026, 11, 11, 18, 0, tzinfo=timezone.utc)


def test_power_status_while_powered(use_rows, monkeypatch: pytest.MonkeyPatch) -> None:  # noqa: F811
    use_rows({})

    async def fake_get_power_status(session):
        return PowerStatus(
            receiving_ac=True,
            current_since=T1,
            last_with_power=T1,
            last_blackout=Period(start=T0, end=T1),
            last_power_period=None,
        )

    monkeypatch.setattr(power_status, "get_power_status", fake_get_power_status)

    response = client.get("/power-status")

    assert response.status_code == 200
    assert response.json() == {
        "receiving_ac": True,
        "current_since": "2026-11-11T18:00:00Z",
        "last_with_power": "2026-11-11T18:00:00Z",
        "last_blackout": {"start": "2026-11-11T10:00:00Z", "end": "2026-11-11T18:00:00Z", "duration_hours": 8.0},
        "last_power_period": None,
    }


def test_power_status_during_blackout(use_rows, monkeypatch: pytest.MonkeyPatch) -> None:  # noqa: F811
    use_rows({})

    async def fake_get_power_status(session):
        return PowerStatus(
            receiving_ac=False,
            current_since=T1,
            last_with_power=T0,
            last_blackout=None,
            last_power_period=Period(start=T0, end=T1),
        )

    monkeypatch.setattr(power_status, "get_power_status", fake_get_power_status)

    body = client.get("/power-status").json()

    assert body["receiving_ac"] is False
    assert body["current_since"] == "2026-11-11T18:00:00Z"
    assert body["last_with_power"] == "2026-11-11T10:00:00Z"
    assert body["last_blackout"] is None
    assert body["last_power_period"] == {
        "start": "2026-11-11T10:00:00Z",
        "end": "2026-11-11T18:00:00Z",
        "duration_hours": 8.0,
    }
