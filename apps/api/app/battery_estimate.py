"""Estimates when the battery reaches the reserve level (20 % by default) at the current load.

The battery percentage is an integer and the battery drains faster than the output power alone explains (inverter
losses, idle draw), so the drain rate is learned from past discharges: every 1 % step down tells how fast the battery
dropped at the load it had during that step. A line r = alpha * P + beta (%/h for P watts) is fitted to those steps,
pulled towards the nominal values while there is little history, and evaluated at the load of the last 10 seconds.
"""

import math
import os
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Literal, Protocol

from sqlalchemy.ext.asyncio import AsyncSession

from app import summaries

DEFAULT_CAPACITY_WH = 1152  # AC180
DEFAULT_RESERVE_PERCENT = 20

HISTORY = timedelta(hours=72)
RECENT = timedelta(hours=6)
LOAD_WINDOW = timedelta(seconds=10)
MAX_READING_AGE = timedelta(minutes=3)
MAX_READING_GAP = timedelta(minutes=5)
MAX_STEP = timedelta(hours=6)
MAX_STEP_PERCENT = 3
RECENCY_HALF_LIFE_HOURS = 24
MAX_HOURS = 48

# The prior counts as this many discharge steps, split between an idle point and a loaded point
PRIOR_STEPS = 2.0
PRIOR_IDLE_W = 10.0
PRIOR_LOAD_W = 60.0
MIN_SIGMA, MAX_SIGMA, DEFAULT_SIGMA = 0.05, 0.35, 0.15
MAX_BETA = 3.0
MIN_DRAIN = 0.05  # %/h; below this the battery is effectively not draining

Status = Literal["discharging", "charging", "reserve", "idle", "stale", "no_data"]


class Row(Protocol):
    date: datetime
    battery_percent: int
    ac_output: int
    dc_output: int
    ac_input: int
    dc_input: int


def get_capacity_wh() -> float:
    return float(os.environ.get("BATTERY_CAPACITY_WH", DEFAULT_CAPACITY_WH))


def get_reserve_percent() -> float:
    return float(os.environ.get("BATTERY_RESERVE_PERCENT", DEFAULT_RESERVE_PERCENT))


def _load(row: Row) -> float:
    return row.ac_output + row.dc_output


def _charging(row: Row) -> bool:
    return row.ac_input > 0 or row.dc_input > 0


@dataclass
class DischargeStep:
    start: datetime
    end: datetime
    percent: int
    energy_wh: float

    @property
    def hours(self) -> float:
        return (self.end - self.start).total_seconds() / 3600

    @property
    def load_w(self) -> float:
        return self.energy_wh / self.hours

    @property
    def drain(self) -> float:
        """Observed drain rate in %/h."""
        return self.percent / self.hours


def discharge_steps(rows: Sequence[Row]) -> list[DischargeStep]:
    """Runs between two consecutive drops of the battery percentage while discharging. The run that a charge, a
    rise of the percentage or a gap in the readings interrupts is dropped, and so is the first one after it, because
    its start is not a real drop."""
    steps: list[DischargeStep] = []
    start: Row | None = None
    energy = 0.0
    previous: Row | None = None

    for row in rows:
        if previous is not None and start is not None:
            gap = row.date - previous.date
            if gap > MAX_READING_GAP or _charging(row) or row.battery_percent > previous.battery_percent:
                start = None
            else:
                energy += (_load(previous) + _load(row)) / 2 * gap.total_seconds() / 3600

        if previous is not None and not _charging(row) and row.battery_percent < previous.battery_percent:
            if start is not None:
                step = DischargeStep(
                    start=start.date,
                    end=row.date,
                    percent=start.battery_percent - row.battery_percent,
                    energy_wh=energy,
                )
                if step.hours > 0 and step.end - step.start <= MAX_STEP and step.percent <= MAX_STEP_PERCENT:
                    steps.append(step)
            start, energy = row, 0.0

        previous = row

    return steps


@dataclass
class DrainModel:
    alpha: float  # %/h per watt
    beta: float  # %/h with no load
    sigma: float  # relative spread of the observed drain around the line
    steps_used: int

    def drain(self, load_w: float) -> float:
        return self.alpha * load_w + self.beta

    @property
    def wh_per_percent(self) -> float:
        return 1 / self.alpha

    @property
    def idle_w(self) -> float:
        return self.beta / self.alpha


def prior_model(capacity_wh: float) -> DrainModel:
    alpha = 100 / capacity_wh
    return DrainModel(alpha=alpha, beta=alpha * PRIOR_IDLE_W, sigma=DEFAULT_SIGMA, steps_used=0)


def fit_drain_model(steps: Sequence[DischargeStep], now: datetime, capacity_wh: float) -> DrainModel:
    """Weighted least squares of the observed drain against the load. Every 1 % step is one observation, weighing
    less the older it is, so recent discharges count more. Two prior points on the nominal line, worth a few steps,
    keep the fit sensible until there is history; the slope is then kept within half and twice the nominal one."""
    prior = prior_model(capacity_wh)
    half = PRIOR_STEPS / 2
    points = [(0.0, prior.drain(0), half), (PRIOR_LOAD_W, prior.drain(PRIOR_LOAD_W), half)]
    for step in steps:
        age_hours = (now - step.end).total_seconds() / 3600
        weight = 0.5 ** (age_hours / RECENCY_HALF_LIFE_HOURS)
        points.append((step.load_w, step.drain, weight))

    total = sum(w for _, _, w in points)
    mean_p = sum(p * w for p, _, w in points) / total
    mean_r = sum(r * w for _, r, w in points) / total
    spread = sum(w * (p - mean_p) ** 2 for p, _, w in points)
    alpha = sum(w * (p - mean_p) * (r - mean_r) for p, r, w in points) / spread if spread > 0 else prior.alpha
    alpha = min(max(alpha, prior.alpha / 2), prior.alpha * 2)
    beta = min(max(mean_r - alpha * mean_p, 0.0), MAX_BETA)
    model = DrainModel(alpha=alpha, beta=beta, sigma=DEFAULT_SIGMA, steps_used=len(steps))

    if len(steps) >= 3:
        weights = [w for _, _, w in points[2:]]
        relative = [((r - model.drain(p)) / model.drain(p)) ** 2 for p, r, _ in points[2:] if model.drain(p) > 0]
        if relative and sum(weights) > 0:
            variance = sum(w * e for w, e in zip(weights, relative)) / sum(weights)
            model.sigma = min(max(math.sqrt(variance), MIN_SIGMA), MAX_SIGMA)
    return model


def current_load(rows: Sequence[Row], now: datetime) -> float | None:
    """Average load of the last 10 seconds, so a single spike does not move the estimate, or the latest reading if
    there is none that recent. None when the latest reading is too old to describe the current load."""
    recent = [row for row in rows if now - row.date <= LOAD_WINDOW]
    if recent:
        return sum(_load(row) for row in recent) / len(recent)
    if rows and now - rows[-1].date <= MAX_READING_AGE:
        return float(_load(rows[-1]))
    return None


def _since_last_change(rows: Sequence[Row]) -> timedelta:
    """How long the battery has reported its current percentage: since the first reading of the trailing run with
    that value, or 0 if there is no earlier reading with another value to tell when it started."""
    latest = rows[-1]
    since = latest.date
    for row in reversed(rows):
        if row.battery_percent != latest.battery_percent:
            return latest.date - since
        since = row.date
    return timedelta(0)


@dataclass
class BatteryEstimate:
    computed_at: datetime
    status: Status
    reserve_percent: float
    model: DrainModel
    soc: int | None = None
    soc_estimate: float | None = None
    load_w: float | None = None
    drain_pct_per_hour: float | None = None
    eta: datetime | None = None
    eta_earliest: datetime | None = None
    eta_latest: datetime | None = None

    @property
    def hours_left(self) -> float | None:
        if self.eta is None:
            return None
        return round((self.eta - self.computed_at).total_seconds() / 3600, 3)


def estimate(rows: Sequence[Row], model: DrainModel, now: datetime, reserve_percent: float) -> BatteryEstimate:
    """`rows` are the recent readings, oldest first."""
    result = BatteryEstimate(computed_at=now, status="no_data", reserve_percent=reserve_percent, model=model)
    if not rows:
        return result

    latest = rows[-1]
    result.soc = latest.battery_percent
    load = current_load(rows, now)
    if load is None:
        result.status = "stale"
        return result
    result.load_w = round(load, 1)

    if _charging(latest):
        result.status = "charging"
        return result

    drain = model.drain(load)
    result.drain_pct_per_hour = round(drain, 3)
    # The percentage is an integer: the time it has stayed the same tells how far into it the battery is
    progress = min(0.95, drain * _since_last_change(rows).total_seconds() / 3600)
    soc = latest.battery_percent - progress
    result.soc_estimate = round(soc, 2)

    if soc <= reserve_percent:
        result.status = "reserve"
        return result
    if drain < MIN_DRAIN or (soc - reserve_percent) / drain > MAX_HOURS:
        result.status = "idle"
        return result

    def reaches_reserve(rate: float) -> datetime:
        return now + timedelta(hours=(soc - reserve_percent) / rate)

    result.status = "discharging"
    result.eta = reaches_reserve(drain)
    result.eta_earliest = reaches_reserve(drain * (1 + model.sigma))
    result.eta_latest = reaches_reserve(max(drain * (1 - model.sigma), MIN_DRAIN))
    return result


MODEL_TTL = timedelta(minutes=5)

_cached: tuple[datetime, DrainModel] | None = None


async def get_estimate(session: AsyncSession, now: datetime) -> BatteryEstimate:
    """Refits the drain model from the last 72 hours at most every 5 minutes; the load and the battery level come
    from the latest readings on every call."""
    global _cached

    capacity = get_capacity_wh()
    if _cached is None or now - _cached[0] >= MODEL_TTL:
        history = await summaries.list_estimate_rows(session, now - HISTORY)
        _cached = (now, fit_drain_model(discharge_steps(history), now, capacity))

    recent = await summaries.list_estimate_rows(session, now - RECENT)
    return estimate(recent, _cached[1], now, get_reserve_percent())
