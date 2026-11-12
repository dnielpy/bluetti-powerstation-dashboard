from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SummaryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    date: datetime
    battery_percent: int
    ac_output: int
    ac_input: int
    dc_output: int
    dc_input: int
    ac: bool
    dc: bool


class SummaryPage(BaseModel):
    items: list[SummaryOut]
    total: int
    page_size: int
    offset: int


class BatteryStatusPoint(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    date: datetime
    battery_percent: int


class BlackoutOut(BaseModel):
    start: datetime
    end: datetime
    duration_hours: float
    ongoing: bool


class AcOutputPoint(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    date: datetime
    ac_output: int


class PeriodOut(BaseModel):
    start: datetime
    end: datetime
    duration_hours: float


class PowerStatusOut(BaseModel):
    receiving_ac: bool | None
    current_since: datetime | None
    last_with_power: datetime | None
    last_blackout: PeriodOut | None
    last_power_period: PeriodOut | None


class DrainModelOut(BaseModel):
    wh_per_percent: float
    idle_w: float
    steps_used: int
    from_history: bool


class BatteryEstimateOut(BaseModel):
    computed_at: datetime
    status: str
    soc: int | None
    soc_estimate: float | None
    load_w: float | None
    drain_pct_per_hour: float | None
    reserve_percent: float
    eta: datetime | None
    eta_earliest: datetime | None
    eta_latest: datetime | None
    hours_left: float | None
    model: DrainModelOut


class PowerPeriodOut(BaseModel):
    start: datetime
    end: datetime
    receiving_ac: bool
