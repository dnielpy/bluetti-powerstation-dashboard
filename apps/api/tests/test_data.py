from collections.abc import AsyncIterator
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

from app import summaries
from app.db import get_session
from app.main import app
from app.models import Summary

client = TestClient(app)


class FakeSession:
    def __init__(self, rows: dict[int, Summary]):
        self.rows = rows

    async def get(self, model: type, id: int) -> Summary | None:
        return self.rows.get(id)


@pytest.fixture
def use_rows():
    def _use(rows: dict[int, Summary]) -> None:
        async def fake_get_session() -> AsyncIterator[FakeSession]:
            yield FakeSession(rows)

        app.dependency_overrides[get_session] = fake_get_session

    yield _use
    app.dependency_overrides.clear()


def test_get_data(use_rows) -> None:
    use_rows(
        {
            1: Summary(
                id=1,
                date=datetime(2026, 11, 11, 12, 0, tzinfo=timezone.utc),
                battery_percent=91,
                ac_output=54,
                ac_input=359,
                dc_output=0,
                dc_input=0,
                ac=True,
                dc=False,
            )
        }
    )

    response = client.get("/data/1")

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


def test_get_data_not_found(use_rows) -> None:
    use_rows({})

    response = client.get("/data/999")

    assert response.status_code == 404


def _summary(id: int, ac: bool, dc: bool) -> Summary:
    return Summary(
        id=id,
        date=datetime(2026, 11, 11, 12, id, tzinfo=timezone.utc),
        battery_percent=90,
        ac_output=50,
        ac_input=300,
        dc_output=0,
        dc_input=0,
        ac=ac,
        dc=dc,
    )


def test_list_data_defaults(use_rows, monkeypatch: pytest.MonkeyPatch) -> None:
    use_rows({})
    calls = []

    async def fake_list_summaries(session, page_size, offset, ac, dc):
        calls.append((page_size, offset, ac, dc))
        return [_summary(2, True, False), _summary(1, True, False)], 2

    monkeypatch.setattr(summaries, "list_summaries", fake_list_summaries)

    response = client.get("/data-summary")

    assert response.status_code == 200
    body = response.json()
    assert calls == [(10, 0, None, None)]
    assert [item["id"] for item in body["items"]] == [2, 1]
    assert body["total"] == 2
    assert body["page_size"] == 10
    assert body["offset"] == 0


def test_list_data_filters(use_rows, monkeypatch: pytest.MonkeyPatch) -> None:
    use_rows({})
    calls = []

    async def fake_list_summaries(session, page_size, offset, ac, dc):
        calls.append((page_size, offset, ac, dc))
        return [], 0

    monkeypatch.setattr(summaries, "list_summaries", fake_list_summaries)

    response = client.get("/data-summary?page_size=5&offset=20&ac=true&dc=false")

    assert response.status_code == 200
    assert calls == [(5, 20, True, False)]


@pytest.mark.parametrize("query", ["page_size=0", "page_size=101", "offset=-1"])
def test_list_data_invalid_params(use_rows, query: str) -> None:
    use_rows({})

    response = client.get(f"/data-summary?{query}")

    assert response.status_code == 422


def test_battery_status_defaults_to_last_24_hours(use_rows, monkeypatch: pytest.MonkeyPatch) -> None:
    use_rows({})
    calls = []

    async def fake_list_battery_status(session, since):
        calls.append(since)
        return [
            Summary(date=datetime(2026, 11, 11, 12, 0, tzinfo=timezone.utc), battery_percent=90),
            Summary(date=datetime(2026, 11, 11, 12, 0, 7, tzinfo=timezone.utc), battery_percent=89),
        ]

    monkeypatch.setattr(summaries, "list_battery_status", fake_list_battery_status)

    before = datetime.now(timezone.utc)
    response = client.get("/battery-status")

    assert response.status_code == 200
    assert response.json() == [
        {"date": "2026-11-11T12:00:00Z", "battery_percent": 90},
        {"date": "2026-11-11T12:00:07Z", "battery_percent": 89},
    ]
    elapsed = before - calls[0]
    assert abs(elapsed.total_seconds() - 24 * 3600) < 5


def test_battery_status_custom_hours(use_rows, monkeypatch: pytest.MonkeyPatch) -> None:
    use_rows({})
    calls = []

    async def fake_list_battery_status(session, since):
        calls.append(since)
        return []

    monkeypatch.setattr(summaries, "list_battery_status", fake_list_battery_status)

    before = datetime.now(timezone.utc)
    response = client.get("/battery-status?hours=6")

    assert response.status_code == 200
    assert response.json() == []
    assert abs((before - calls[0]).total_seconds() - 6 * 3600) < 5


@pytest.mark.parametrize("query", ["hours=0", "hours=-1", "hours=169"])
def test_battery_status_invalid_hours(use_rows, query: str) -> None:
    use_rows({})

    response = client.get(f"/battery-status?{query}")

    assert response.status_code == 422


def test_ac_output_history(use_rows, monkeypatch: pytest.MonkeyPatch) -> None:
    use_rows({})
    calls = []

    async def fake_list_ac_output(session, since):
        calls.append(since)
        return [
            Summary(date=datetime(2026, 11, 11, 12, 0, tzinfo=timezone.utc), ac_output=54),
            Summary(date=datetime(2026, 11, 11, 12, 0, 7, tzinfo=timezone.utc), ac_output=61),
        ]

    monkeypatch.setattr(summaries, "list_ac_output", fake_list_ac_output)

    before = datetime.now(timezone.utc)
    response = client.get("/ac-output-history?hours=6")

    assert response.status_code == 200
    assert response.json() == [
        {"date": "2026-11-11T12:00:00Z", "ac_output": 54},
        {"date": "2026-11-11T12:00:07Z", "ac_output": 61},
    ]
    assert abs((before - calls[0]).total_seconds() - 6 * 3600) < 5


@pytest.mark.parametrize("query", ["hours=0", "hours=169"])
def test_ac_output_history_invalid_hours(use_rows, query: str) -> None:
    use_rows({})

    assert client.get(f"/ac-output-history?{query}").status_code == 422
