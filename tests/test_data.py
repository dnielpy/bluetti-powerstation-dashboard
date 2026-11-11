from collections.abc import AsyncIterator
from datetime import datetime, timezone

import pytest
from fastapi.testclient import TestClient

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
