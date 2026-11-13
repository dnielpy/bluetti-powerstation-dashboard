import math
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from app import battery_estimate
from app.battery_estimate import (
    DrainModel,
    current_load,
    discharge_steps,
    estimate,
    fit_drain_model,
    prior_model,
)
from app.main import app
from tests.test_data import use_rows  # noqa: F401

client = TestClient(app)

T0 = datetime(2026, 11, 11, 12, 0, tzinfo=timezone.utc)
STEP = timedelta(seconds=7)
CAPACITY = 1152


@dataclass
class R:
    date: datetime
    battery_percent: int
    ac_output: int = 0
    dc_output: int = 0
    ac_input: int = 0
    dc_input: int = 0


def simulate(loads: list[tuple[timedelta, int]], alpha: float, beta: float, soc: float = 80.0, start: datetime = T0):
    """Readings every 7 s of a battery that drains alpha * load + beta %/h; the reported percentage is an integer."""
    rows, t = [], start
    for duration, load in loads:
        end = t + duration
        while t < end:
            rows.append(R(date=t, battery_percent=math.ceil(soc), ac_output=load))
            soc -= (alpha * load + beta) * STEP.total_seconds() / 3600
            t += STEP
    return rows


def test_steps_measure_the_load_and_the_time_between_drops() -> None:
    rows = simulate([(timedelta(hours=2), 50)], alpha=100 / CAPACITY, beta=0)

    steps = discharge_steps(rows)

    # 50 W on 1152 Wh drains a percent every ~23 minutes
    assert len(steps) >= 4
    for step in steps:
        assert step.percent == 1
        assert step.load_w == pytest.approx(50, rel=0.01)
        assert step.hours == pytest.approx(1152 / 100 / 50, rel=0.05)


def test_first_drop_only_starts_a_step() -> None:
    rows = [R(T0, 50), R(T0 + STEP, 49), R(T0 + 2 * STEP, 49)]

    assert discharge_steps(rows) == []


def test_charging_and_gaps_break_steps() -> None:
    rows = [
        R(T0, 50, ac_output=40),
        R(T0 + timedelta(minutes=10), 49, ac_output=40),
        R(T0 + timedelta(minutes=12), 49, ac_output=40, ac_input=300),
        R(T0 + timedelta(minutes=20), 48, ac_output=40),
        # a gap of more than 5 minutes
        R(T0 + timedelta(minutes=40), 47, ac_output=40),
        R(T0 + timedelta(minutes=44), 47, ac_output=40),
        R(T0 + timedelta(minutes=48), 46, ac_output=40),
    ]

    [step] = discharge_steps(rows)

    assert (step.start, step.end) == (T0 + timedelta(minutes=40), T0 + timedelta(minutes=48))


def test_fit_learns_losses_from_history() -> None:
    # The battery really drains as if it had 1000 Wh and an inverter that draws 15 W idle
    alpha, beta = 100 / 1000, 15 * 100 / 1000
    rows = simulate([(timedelta(hours=4), 30), (timedelta(hours=4), 90), (timedelta(hours=4), 50)], alpha, beta, 95)
    now = rows[-1].date

    model = fit_drain_model(discharge_steps(rows), now, CAPACITY)

    assert model.steps_used > 20
    assert model.drain(30) == pytest.approx(alpha * 30 + beta, rel=0.1)
    assert model.drain(90) == pytest.approx(alpha * 90 + beta, rel=0.1)
    assert model.wh_per_percent == pytest.approx(10, rel=0.15)


def test_without_history_the_nominal_capacity_is_used() -> None:
    model = fit_drain_model([], T0, CAPACITY)
    prior = prior_model(CAPACITY)

    assert (model.alpha, model.beta) == (pytest.approx(prior.alpha), pytest.approx(prior.beta))
    assert model.steps_used == 0
    assert model.wh_per_percent == pytest.approx(11.52)


def test_fit_stays_within_bounds_on_absurd_steps() -> None:
    steps = [battery_estimate.DischargeStep(T0, T0 + timedelta(minutes=1), 3, energy_wh=0.1) for _ in range(30)]

    model = fit_drain_model(steps, T0, CAPACITY)

    nominal = prior_model(CAPACITY).alpha
    assert nominal / 2 <= model.alpha <= nominal * 2
    assert 0 <= model.beta <= battery_estimate.MAX_BETA


def test_current_load_averages_the_last_ten_seconds() -> None:
    rows = [
        R(T0, 60, ac_output=500),
        R(T0 + timedelta(seconds=20), 60, ac_output=40),
        R(T0 + timedelta(seconds=27), 60, ac_output=60),
    ]

    assert current_load(rows, T0 + timedelta(seconds=28)) == 50


def test_current_load_is_none_when_readings_are_old() -> None:
    assert current_load([R(T0, 60, ac_output=40)], T0 + timedelta(minutes=5)) is None


NOMINAL = DrainModel(alpha=0.1, beta=0.5, sigma=0.2, steps_used=10)


def test_estimate_at_constant_load() -> None:
    now = T0 + timedelta(seconds=1)
    rows = [R(T0 - timedelta(minutes=5), 61, ac_output=45), R(T0, 60, ac_output=45)]

    result = estimate(rows, NOMINAL, now, reserve_percent=20)

    # 45 W -> 0.1 * 45 + 0.5 = 5 %/h, 40 % above the reserve -> 8 h
    assert result.status == "discharging"
    assert result.drain_pct_per_hour == pytest.approx(5)
    assert result.hours_left == pytest.approx(8, abs=0.01)
    assert result.eta_earliest < result.eta < result.eta_latest


def test_estimate_accounts_for_time_spent_at_the_current_percent() -> None:
    rows = [R(T0, 61, ac_output=45), R(T0 + timedelta(minutes=1), 60, ac_output=45)]
    rows += [R(T0 + timedelta(minutes=1) + i * STEP, 60, ac_output=45) for i in range(1, 70)]
    now = rows[-1].date

    result = estimate(rows, NOMINAL, now, reserve_percent=20)

    # About 8 minutes at 5 %/h is two thirds of a percent already used
    assert result.soc_estimate == pytest.approx(60 - 5 * (69 * 7) / 3600, abs=0.01)


@pytest.mark.parametrize(
    ("row", "status"),
    [
        (R(T0, 60, ac_output=40, ac_input=300), "charging"),
        (R(T0, 20, ac_output=40), "reserve"),
        (R(T0, 60), "idle"),
    ],
)
def test_estimate_states(row: R, status: str) -> None:
    model = DrainModel(alpha=0.1, beta=0.0, sigma=0.2, steps_used=0)

    result = estimate([row], model, T0, reserve_percent=20)

    assert result.status == status
    assert result.eta is None


def test_estimate_with_old_readings_is_stale() -> None:
    assert estimate([R(T0, 60, ac_output=40)], NOMINAL, T0 + timedelta(minutes=4), 20).status == "stale"


def test_estimate_without_readings() -> None:
    assert estimate([], NOMINAL, T0, 20).status == "no_data"


def test_battery_estimate_endpoint(use_rows, monkeypatch: pytest.MonkeyPatch) -> None:  # noqa: F811
    use_rows({})

    async def fake_get_estimate(session, now):
        return estimate([R(now - timedelta(seconds=2), 60, ac_output=45)], NOMINAL, now, 20)

    monkeypatch.setattr(battery_estimate, "get_estimate", fake_get_estimate)

    body = client.get("/battery-estimate").json()

    assert body["status"] == "discharging"
    assert body["load_w"] == 45
    assert body["hours_left"] == pytest.approx(8, abs=0.01)
    assert body["model"] == {"wh_per_percent": 10.0, "idle_w": 5.0, "steps_used": 10, "from_history": True}
