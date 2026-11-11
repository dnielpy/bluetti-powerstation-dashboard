import asyncio
import logging
import os
import time

from app import db, summaries
from app.models import Summary

logger = logging.getLogger(__name__)

DEFAULT_INTERVAL_SECONDS = 300


def get_interval_seconds() -> int:
    return int(os.environ.get("SUMMARY_JOB_INTERVAL_SECONDS", DEFAULT_INTERVAL_SECONDS))


async def collect_once() -> Summary | None:
    try:
        async with db.session_scope() as session:
            summary = await summaries.collect_summary(session)
    except Exception:
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
