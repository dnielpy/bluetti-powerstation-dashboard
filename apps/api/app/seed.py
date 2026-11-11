import argparse
import asyncio
import math
import random
from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv
from sqlalchemy import delete, func, insert, select

from app import db
from app.models import Summary

CAPACITY_WH = 1152
CHARGE_WATTS = 500
STEP = timedelta(seconds=7)
WINDOW = timedelta(hours=24)
BLACKOUTS = [
    (timedelta(hours=22), timedelta(hours=14)),
    (timedelta(hours=10), timedelta(hours=2)),
]
BATCH_SIZE = 2000


def _in_blackout(ago: timedelta) -> bool:
    return any(end < ago <= start for start, end in BLACKOUTS)


def _load_watts(moment: datetime, rng: random.Random) -> tuple[int, int]:
    hour = moment.hour + moment.minute / 60
    daily = 30 * math.sin((hour - 14) / 24 * 2 * math.pi)
    fridge = 45 if (moment.minute // 15) % 2 == 0 else 0
    ac_output = max(40, round(70 + daily + fridge + rng.gauss(0, 6)))
    dc_output = 10 if 19 <= moment.hour <= 23 else 0
    return ac_output, dc_output


def build_rows(now: datetime, seed: int = 42) -> list[dict]:
    rng = random.Random(seed)
    energy_wh = CAPACITY_WH
    rows = []
    moment = now - WINDOW
    while moment <= now:
        ac_output, dc_output = _load_watts(moment, rng)
        load = ac_output + dc_output
        hours = STEP.total_seconds() / 3600

        if _in_blackout(now - moment):
            ac_input = 0
            energy_wh = max(0.0, energy_wh - load * hours)
        elif energy_wh < CAPACITY_WH:
            charge = min(CHARGE_WATTS, (CAPACITY_WH - energy_wh) / hours)
            ac_input = round(load + charge + rng.gauss(0, 4))
            energy_wh = min(CAPACITY_WH, energy_wh + charge * hours)
        else:
            ac_input = round(load + rng.gauss(0, 2))

        rows.append(
            {
                "date": moment,
                "battery_percent": round(energy_wh / CAPACITY_WH * 100),
                "ac_output": ac_output,
                "ac_input": max(0, ac_input),
                "dc_output": dc_output,
                "dc_input": 0,
                "ac": ac_input > 0,
                "dc": False,
            }
        )
        moment += STEP
    return rows


async def seed(replace: bool) -> None:
    now = datetime.now(timezone.utc)
    since = now - WINDOW

    async with db.session_scope() as session:
        existing = await session.scalar(select(func.count()).select_from(Summary).where(Summary.date >= since))
        if existing and not replace:
            raise SystemExit(
                f"There are {existing} readings in the last 24 hours. Run with --replace to delete them and seed."
            )
        if existing:
            await session.execute(delete(Summary).where(Summary.date >= since))

        rows = build_rows(now)
        for start in range(0, len(rows), BATCH_SIZE):
            await session.execute(insert(Summary), rows[start : start + BATCH_SIZE])
        await session.commit()

    await db.dispose_engine()
    print(f"Deleted {existing or 0} readings and inserted {len(rows)} simulated readings from {since:%Y-%m-%d %H:%M} UTC.")


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed the summary table with 24 hours of simulated readings.")
    parser.add_argument("--replace", action="store_true", help="Delete existing readings in the last 24 hours first.")
    args = parser.parse_args()
    load_dotenv()
    asyncio.run(seed(args.replace))


if __name__ == "__main__":
    main()
