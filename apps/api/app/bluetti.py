import asyncio
import os
from collections.abc import Sequence
from dataclasses import dataclass

from bleak import BleakScanner
from bluetti_bt_lib import (
    BluettiDevice,
    DeviceReader,
    DeviceReaderConfig,
    FieldName,
    build_device,
    get_unit,
)
from bluetti_bt_lib.registers import ReadableRegisters


class BluettiConfigError(Exception):
    pass


class BluettiUnavailableError(Exception):
    pass


@dataclass
class Reading:
    value: int | float
    unit: str | None
    model: str


_address: str | None = None


def _get_name() -> str:
    name = os.environ.get("BLUETTI_NAME")
    if not name:
        raise BluettiConfigError("BLUETTI_NAME environment variable is not set")
    return name


def _use_encryption() -> bool:
    return os.environ.get("BLUETTI_ENCRYPTED", "false").lower() in ("1", "true", "yes")


def _build_device(name: str) -> BluettiDevice:
    device = build_device(name)
    if device is None:
        raise BluettiConfigError(f"Unsupported model for BLUETTI_NAME={name}")
    return device


async def _get_address(name: str) -> str:
    global _address

    if _address is None:
        found = await BleakScanner.find_device_by_name(name, timeout=10)
        if found is None:
            raise BluettiUnavailableError(f"Bluetti {name} not found over Bluetooth")
        _address = found.address

    return _address


async def read_fields(fields: Sequence[FieldName]) -> dict[FieldName, Reading]:
    name = _get_name()
    device = _build_device(name)
    model = type(device).__name__

    device_fields = {f.name: f for f in device.fields}
    missing = [field.value for field in fields if field.value not in device_fields]
    if missing:
        raise BluettiConfigError(f"Model {model} does not expose {', '.join(missing)}")

    address = await _get_address(name)

    reader = DeviceReader(
        address,
        device,
        asyncio.Future,
        DeviceReaderConfig(use_encryption=_use_encryption()),
    )
    registers = [
        ReadableRegisters(device_fields[field.value].address, device_fields[field.value].size)
        for field in fields
    ]
    data = await reader.read(only_registers=registers) or {}

    unread = [field.value for field in fields if data.get(field.value) is None]
    if unread:
        raise BluettiUnavailableError(f"Could not read {', '.join(unread)}")

    return {
        field: Reading(value=data[field.value], unit=get_unit(field), model=model)
        for field in fields
    }


async def read_field(field: FieldName) -> Reading:
    readings = await read_fields([field])
    return readings[field]
