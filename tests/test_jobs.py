from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

import pytest

from app import bluetti, db, jobs, summaries
from app.models import Summary


@pytest.fixture
def anyio_backend() -> str:
    return "asyncio"


@pytest.fixture
def fake_session_scope(monkeypatch: pytest.MonkeyPatch) -> None:
    @asynccontextmanager
    async def _scope() -> AsyncIterator[object]:
        yield object()

    monkeypatch.setattr(db, "session_scope", _scope)


@pytest.mark.anyio
async def test_collect_once_saves_summary(fake_session_scope, monkeypatch: pytest.MonkeyPatch) -> None:
    saved = Summary(id=1, battery_percent=91, ac_output=54, ac_input=359, dc_output=0, dc_input=0, ac=True, dc=False)

    async def fake_collect_summary(session: object) -> Summary:
        return saved

    monkeypatch.setattr(summaries, "collect_summary", fake_collect_summary)

    assert await jobs.collect_once() is saved


@pytest.mark.anyio
async def test_collect_once_survives_errors(fake_session_scope, monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_collect_summary(session: object) -> Summary:
        raise bluetti.BluettiUnavailableError("Bluetti AC180 not found over Bluetooth")

    monkeypatch.setattr(summaries, "collect_summary", fake_collect_summary)

    assert await jobs.collect_once() is None


def test_interval_defaults_to_five_minutes(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("SUMMARY_JOB_INTERVAL_SECONDS", raising=False)

    assert jobs.get_interval_seconds() == 300


def test_interval_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SUMMARY_JOB_INTERVAL_SECONDS", "60")

    assert jobs.get_interval_seconds() == 60
