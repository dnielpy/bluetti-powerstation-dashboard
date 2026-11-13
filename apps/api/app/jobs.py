import asyncio
import logging
import os
import time

from app import bluetti, db, summaries
from app.models import Summary

logger = logging.getLogger(__name__)

DEFAULT_INTERVAL_SECONDS = 60


def get_interval_seconds() -> int:
    return int(os.environ.get("SUMMARY_JOB_INTERVAL_SECONDS", DEFAULT_INTERVAL_SECONDS))


async def collect_once() -> Summary | None:
    try:
        async with db.session_scope() as session:
            summary = await summaries.collect_summary(session)
    except Exception as err:
        task = asyncio.current_task()
        if task is not None and task.cancelling():
            raise asyncio.CancelledError
        if isinstance(err, bluetti.BluettiUnavailableError):
            logger.warning("Summary job skipped: %s", err)
        else:
            logger.exception("Summary job failed")
        return None

    logger.info(
        "Summary job saved id=%s battery=%s%% ac_input=%sW dc_input=%sW",
        summary.id,
        summary.battery_percent,
        summary.ac_input,
        summary.dc_input,
    )
    return summary


async def run_summary_job(interval_seconds: int) -> None:
    logger.info("Summary job started, every %s seconds", interval_seconds)
    while True:
        started = time.monotonic()
        await collect_once()
        elapsed = time.monotonic() - started
        await asyncio.sleep(max(0.0, interval_seconds - elapsed))
