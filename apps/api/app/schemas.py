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
