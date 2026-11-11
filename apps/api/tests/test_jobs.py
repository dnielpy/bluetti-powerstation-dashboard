import asyncio
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


def test_interval_defaults_to_seven_seconds(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("SUMMARY_JOB_INTERVAL_SECONDS", raising=False)

    assert jobs.get_interval_seconds() == 7


def test_interval_from_env(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("SUMMARY_JOB_INTERVAL_SECONDS", "60")

    assert jobs.get_interval_seconds() == 60


@pytest.mark.anyio
async def test_job_stops_when_cancelled_during_a_read(fake_session_scope, monkeypatch: pytest.MonkeyPatch) -> None:
    reading = asyncio.Event()

    async def fake_collect_summary(session: object) -> Summary:
        reading.set()
        try:
            await asyncio.sleep(10)
        except BaseException:
            pass
        raise bluetti.BluettiUnavailableError("Could not read total_battery_percent")

    monkeypatch.setattr(summaries, "collect_summary", fake_collect_summary)

    task = asyncio.create_task(jobs.run_summary_job(300))
    await reading.wait()
    task.cancel()

    with pytest.raises(asyncio.CancelledError):
        await asyncio.wait_for(task, timeout=1)
