import asyncio
import os
from dataclasses import dataclass

from bleak import BleakScanner
from bluetti_bt_lib import (
    BluettiDevice,
    DeviceReader,
    DeviceReaderConfig,
    FieldName,
    build_device,
)
from bluetti_bt_lib.registers import ReadableRegisters


class BluettiConfigError(Exception):
    """La configuración necesaria para conectarse no está definida o es inválida."""


class BluettiUnavailableError(Exception):
    """No se pudo leer de la Bluetti por Bluetooth."""


@dataclass
class BatteryReading:
    percent: int
    model: str


# Dirección Bluetooth encontrada a partir del nombre, se busca una sola vez por proceso
_address: str | None = None


def _get_name() -> str:
    name = os.environ.get("BLUETTI_NAME")
    if not name:
        raise BluettiConfigError("La variable de entorno BLUETTI_NAME no está definida")
    return name


def _use_encryption() -> bool:
    return os.environ.get("BLUETTI_ENCRYPTED", "false").lower() in ("1", "true", "yes")


def _build_device(name: str) -> BluettiDevice:
    device = build_device(name)
    if device is None:
        raise BluettiConfigError(f"Modelo no soportado para BLUETTI_NAME={name}")
    return device


async def _get_address(name: str) -> str:
    global _address

    if _address is None:
        found = await BleakScanner.find_device_by_name(name, timeout=10)
        if found is None:
            raise BluettiUnavailableError(f"No se encontró la Bluetti {name} por Bluetooth")
        _address = found.address

    return _address


async def read_battery() -> BatteryReading:
    name = _get_name()
    device = _build_device(name)
    address = await _get_address(name)

    soc_field = next(f for f in device.fields if f.name == FieldName.BATTERY_SOC.value)

    reader = DeviceReader(
        address,
        device,
        asyncio.Future,
        DeviceReaderConfig(use_encryption=_use_encryption()),
    )
    data = await reader.read(
        only_registers=[ReadableRegisters(soc_field.address, soc_field.size)]
    )

    percent = None if data is None else data.get(FieldName.BATTERY_SOC.value)
    if percent is None:
        raise BluettiUnavailableError("No se pudo leer el % de batería")

    return BatteryReading(percent=percent, model=type(device).__name__)
