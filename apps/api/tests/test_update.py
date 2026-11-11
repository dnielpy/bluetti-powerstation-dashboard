from collections.abc import AsyncIterator, Sequence
from datetime import datetime, timezone

import pytest
from bluetti_bt_lib import FieldName
from fastapi.testclient import TestClient

from app import bluetti, summaries
from app.db import get_session
from app.main import app
from app.models import Summary

client = TestClient(app)


class FakeSession:
    def __init__(self) -> None:
        self.saved: list[Summary] = []

    def add(self, instance: Summary) -> None:
        self.saved.append(instance)

    async def commit(self) -> None:
        pass

    async def refresh(self, instance: Summary) -> None:
        instance.id = len(self.saved)
        instance.date = datetime(2026, 11, 11, 12, 0, tzinfo=timezone.utc)


@pytest.fixture
def session():
    fake = FakeSession()

    async def fake_get_session() -> AsyncIterator[FakeSession]:
        yield fake

    app.dependency_overrides[get_session] = fake_get_session
    yield fake
    app.dependency_overrides.clear()


def _readings(values: dict[FieldName, int]) -> dict[FieldName, bluetti.Reading]:
    return {field: bluetti.Reading(value=value, unit=None, model="AC180") for field, value in values.items()}


def test_update(session: FakeSession, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_read_fields(fields: Sequence[FieldName]) -> dict[FieldName, bluetti.Reading]:
        assert list(fields) == summaries.SUMMARY_FIELDS
        return _readings(
            {
                FieldName.BATTERY_SOC: 91,
                FieldName.AC_OUTPUT_POWER: 54,
                FieldName.AC_INPUT_POWER: 359,
                FieldName.DC_OUTPUT_POWER: 0,
                FieldName.DC_INPUT_POWER: 0,
            }
        )

    monkeypatch.setattr(bluetti, "read_fields", fake_read_fields)

    response = client.post("/update")

    assert response.status_code == 200
    assert response.json() == {
        "id": 1,
        "date": "2026-11-11T12:00:00Z",
        "battery_percent": 91,
        "ac_output": 54,
        "ac_input": 359,
        "dc_output": 0,
        "dc_input": 0,
        "ac": True,
        "dc": False,
    }
    assert len(session.saved) == 1


def test_update_unavailable(session: FakeSession, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_read_fields(fields: Sequence[FieldName]) -> dict[FieldName, bluetti.Reading]:
        raise bluetti.BluettiUnavailableError("Could not read total_battery_percent")

    monkeypatch.setattr(bluetti, "read_fields", fake_read_fields)

    response = client.post("/update")

    assert response.status_code == 503
    assert session.saved == []


@pytest.mark.parametrize(
    ("ac_input", "dc_input", "ac", "dc"),
    [(0, 0, False, False), (300, 0, True, False), (0, 120, False, True), (300, 120, True, True)],
)
def test_build_summary_active_inputs(ac_input: int, dc_input: int, ac: bool, dc: bool) -> None:
    summary = summaries.build_summary(
        _readings(
            {
                FieldName.BATTERY_SOC: 80,
                FieldName.AC_OUTPUT_POWER: 0,
                FieldName.AC_INPUT_POWER: ac_input,
                FieldName.DC_OUTPUT_POWER: 0,
                FieldName.DC_INPUT_POWER: dc_input,
            }
        )
    )

    assert summary.ac is ac
    assert summary.dc is dc
