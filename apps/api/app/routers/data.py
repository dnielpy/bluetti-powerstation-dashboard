from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app import battery_estimate, blackouts, power_periods, power_status, summaries
from app.db import get_session
from app.models import Summary
from app.schemas import (
    AcOutputPoint,
    BatteryEstimateOut,
    BatteryStatusPoint,
    BlackoutOut,
    DrainModelOut,
    PeriodOut,
    PowerPeriodOut,
    PowerTotalsOut,
    PowerStatusOut,
    SummaryOut,
    SummaryPage,
)

router = APIRouter(tags=["data"])


@router.get("/data/{id}", response_model=SummaryOut)
async def get_data(id: int, session: AsyncSession = Depends(get_session)) -> Summary:
    summary = await session.get(Summary, id)
    if summary is None:
        raise HTTPException(status_code=404, detail=f"Summary with id {id} not found")
    return summary


@router.get(
    "/data-summary",
    response_model=SummaryPage,
    description="List stored summaries, newest first.",
)
async def list_data(
    page_size: int = Query(10, ge=1, le=100, description="How many records to return."),
    offset: int = Query(0, ge=0, description="How many records to skip before starting."),
    ac: bool | None = Query(None, description="Only records where AC input was active (or inactive)."),
    dc: bool | None = Query(None, description="Only records where DC input was active (or inactive)."),
    session: AsyncSession = Depends(get_session),
) -> SummaryPage:
    items, total = await summaries.list_summaries(session, page_size, offset, ac, dc)
    return SummaryPage(
        items=[SummaryOut.model_validate(item) for item in items],
        total=total,
        page_size=page_size,
        offset=offset,
    )


@router.get(
    "/battery-status",
    response_model=list[BatteryStatusPoint],
    description="Battery percentage of every stored reading in the last `hours`, oldest first.",
)
async def battery_status(
    hours: float = Query(24, gt=0, le=168, description="How many hours back to include."),
    session: AsyncSession = Depends(get_session),
) -> list[BatteryStatusPoint]:
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    rows = await summaries.list_battery_status(session, since)
    return [BatteryStatusPoint.model_validate(row) for row in rows]


@router.get(
    "/power-periods",
    response_model=list[PowerPeriodOut],
    description=(
        "Periods with (`receiving_ac: true`) and without AC power in the last `hours`, oldest first, back to back. A "
        "period lasts until the first reading of the other state; across a gap of more than 15 minutes without "
        "readings the change is placed halfway through the gap, and a gap with the same state on both sides belongs "
        "to that period."
    ),
)
async def list_power_periods(
    hours: float = Query(24, gt=0, le=168, description="How many hours back to include."),
    session: AsyncSession = Depends(get_session),
) -> list[PowerPeriodOut]:
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    rows = await summaries.list_ac_states(session, since)
    return [
        PowerPeriodOut(start=period.start, end=period.end, receiving_ac=period.receiving_ac)
        for period in power_periods.find_power_periods((row.date, row.ac) for row in rows)
    ]


@router.get(
    "/power-totals",
    response_model=PowerTotalsOut,
    description=(
        "Hours with and without AC power in the last `hours`, or since the first reading when it is left out "
        "(`since` is where the counted time starts), filling gaps without readings like `/power-periods`; whether AC "
        "power is on now, and when the power last went out (`outage_ongoing` while it is still out)."
    ),
)
async def get_power_totals(
    hours: float | None = Query(None, gt=0, le=168, description="How many hours back to count; all time if left out."),
    session: AsyncSession = Depends(get_session),
) -> PowerTotalsOut:
    # Every reading is read so an outage that started before the window still has its real start
    rows = await summaries.list_ac_states(session, None)
    since = datetime.now(timezone.utc) - timedelta(hours=hours) if hours else None
    totals = power_periods.power_totals(power_periods.find_power_periods((row.date, row.ac) for row in rows), since)
    return PowerTotalsOut(**vars(totals))


@router.get(
    "/blackouts",
    response_model=list[BlackoutOut],
    description=(
        "Blackouts in the last `hours`, oldest first. A blackout is a run of readings where the Bluetti "
        "is not receiving AC power. It ends with the first reading that has AC power again. Gaps without readings "
        "never split a blackout; when power is back after a gap of more than 15 minutes, the blackout ends halfway "
        "through the gap (and one that starts after such a gap starts halfway through it)."
    ),
)
async def list_blackouts(
    hours: float = Query(24, gt=0, le=168, description="How many hours back to include."),
    session: AsyncSession = Depends(get_session),
) -> list[BlackoutOut]:
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    rows = await summaries.list_ac_states(session, since)
    return [
        BlackoutOut(
            start=blackout.start,
            end=blackout.end,
            duration_hours=blackout.duration_hours,
            ongoing=blackout.ongoing,
        )
        for blackout in blackouts.find_blackouts((row.date, row.ac) for row in rows)
    ]


@router.get(
    "/ac-output-history",
    response_model=list[AcOutputPoint],
    description="AC output power (W) of every stored reading in the last `hours`, oldest first.",
)
async def ac_output_history(
    hours: float = Query(24, gt=0, le=168, description="How many hours back to include."),
    session: AsyncSession = Depends(get_session),
) -> list[AcOutputPoint]:
    since = datetime.now(timezone.utc) - timedelta(hours=hours)
    rows = await summaries.list_ac_output(session, since)
    return [AcOutputPoint.model_validate(row) for row in rows]


def _period_out(period: power_status.Period | None) -> PeriodOut | None:
    if period is None:
        return None
    return PeriodOut(start=period.start, end=period.end, duration_hours=period.duration_hours)


@router.get(
    "/power-status",
    response_model=PowerStatusOut,
    description=(
        "Whether the Bluetti is receiving AC power according to the latest reading, since when it is in that state, "
        "the last reading with AC power, the last finished blackout (while powered) and the last period with power "
        "(during a blackout)."
    ),
)
async def get_power_status(session: AsyncSession = Depends(get_session)) -> PowerStatusOut:
    status = await power_status.get_power_status(session)
    return PowerStatusOut(
        receiving_ac=status.receiving_ac,
        current_since=status.current_since,
        last_with_power=status.last_with_power,
        last_blackout=_period_out(status.last_blackout),
        last_power_period=_period_out(status.last_power_period),
    )


@router.get(
    "/battery-estimate",
    response_model=BatteryEstimateOut,
    description=(
        "When the battery reaches the reserve level (BATTERY_RESERVE_PERCENT, 20 % by default) at the current load. "
        "The load is the average of the last 10 seconds. The drain rate comes from a line fitted to the 1 % steps "
        "of the last 72 hours of discharge (drain = alpha * load + beta), pulled towards the nominal capacity while "
        "there is little history. `eta_earliest` and `eta_latest` spread the drain by how much past steps varied. "
        "`status` is discharging, charging, reserve, idle (more than 48 h or no drain), stale or no_data. While "
        "charging, `full_eta` is when the battery reaches 100 % at the rate the current charge has risen so far."
    ),
)
async def get_battery_estimate(session: AsyncSession = Depends(get_session)) -> BatteryEstimateOut:
    result = await battery_estimate.get_estimate(session, datetime.now(timezone.utc))
    model = result.model
    return BatteryEstimateOut(
        computed_at=result.computed_at,
        status=result.status,
        soc=result.soc,
        soc_estimate=result.soc_estimate,
        load_w=result.load_w,
        drain_pct_per_hour=result.drain_pct_per_hour,
        reserve_percent=result.reserve_percent,
        eta=result.eta,
        eta_earliest=result.eta_earliest,
        eta_latest=result.eta_latest,
        hours_left=result.hours_left,
        full_eta=result.full_eta,
        hours_to_full=result.hours_to_full,
        model=DrainModelOut(
            wh_per_percent=round(model.wh_per_percent, 2),
            idle_w=round(model.idle_w, 1),
            steps_used=model.steps_used,
            from_history=model.steps_used > 0,
        ),
    )
