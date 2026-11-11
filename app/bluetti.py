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
    get_unit,
)
from bluetti_bt_lib.registers import ReadableRegisters


class BluettiConfigError(Exception):
    """La configuración necesaria para conectarse no está definida o es inválida."""


class BluettiUnavailableError(Exception):
    """No se pudo leer de la Bluetti por Bluetooth."""


@dataclass
class Reading:
    value: int | float
    unit: str | None
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


async def read_field(field: FieldName) -> Reading:
    name = _get_name()
    device = _build_device(name)
    model = type(device).__name__

    device_field = next((f for f in device.fields if f.name == field.value), None)
    if device_field is None:
        raise BluettiConfigError(f"El modelo {model} no expone el dato {field.value}")

    address = await _get_address(name)

    reader = DeviceReader(
        address,
        device,
        asyncio.Future,
        DeviceReaderConfig(use_encryption=_use_encryption()),
    )
    data = await reader.read(
        only_registers=[ReadableRegisters(device_field.address, device_field.size)]
    )

    value = None if data is None else data.get(field.value)
    if value is None:
        raise BluettiUnavailableError(f"No se pudo leer {field.value}")

    return Reading(value=value, unit=get_unit(field), model=model)
