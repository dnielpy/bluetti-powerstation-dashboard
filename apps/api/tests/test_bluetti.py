import asyncio

import pytest
from bluetti_bt_lib import FieldName

from app import bluetti


class HangingReader:
    def __init__(self, *args, **kwargs) -> None:
        pass

    async def read(self, only_registers=None):
        await asyncio.sleep(10)


def test_read_fields_times_out(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_get_address(name: str) -> str:
        return "F5:5E:78:5A:6B:57"

    monkeypatch.setenv("BLUETTI_NAME", "AC1802530010445974")
    monkeypatch.setattr(bluetti, "_get_address", fake_get_address)
    monkeypatch.setattr(bluetti, "DeviceReader", HangingReader)
    monkeypatch.setattr(bluetti, "READ_TIMEOUT_SECONDS", 0.05)

    with pytest.raises(bluetti.BluettiUnavailableError, match="timed out"):
        asyncio.run(bluetti.read_fields([FieldName.BATTERY_SOC]))
