from datetime import datetime

from sqlalchemy import Boolean, DateTime, Integer, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db import Base


class Summary(Base):
    __tablename__ = "summary"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    date: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
    )
    battery_percent: Mapped[int] = mapped_column(Integer, nullable=False)
    ac_output: Mapped[int] = mapped_column(Integer, nullable=False)
    ac_input: Mapped[int] = mapped_column(Integer, nullable=False)
    dc_output: Mapped[int] = mapped_column(Integer, nullable=False)
    dc_input: Mapped[int] = mapped_column(Integer, nullable=False)
    ac: Mapped[bool] = mapped_column(Boolean, nullable=False)
    dc: Mapped[bool] = mapped_column(Boolean, nullable=False)
