import pytest
from bluetti_bt_lib import FieldName
from fastapi.testclient import TestClient

from app import bluetti
from app.main import app

client = TestClient(app)


def test_battery(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_read_field(field: FieldName) -> bluetti.Reading:
        assert field == FieldName.BATTERY_SOC
        return bluetti.Reading(value=92, unit="%", model="AC180")

    monkeypatch.setattr(bluetti, "read_field", fake_read_field)

    response = client.get("/battery")

    assert response.status_code == 200
    assert response.json() == {"battery_percent": 92, "model": "AC180"}


def test_battery_unavailable(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_read_field(field: FieldName) -> bluetti.Reading:
        raise bluetti.BluettiUnavailableError("No se pudo leer total_battery_percent")

    monkeypatch.setattr(bluetti, "read_field", fake_read_field)

    response = client.get("/battery")

    assert response.status_code == 503


def test_battery_missing_name(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("BLUETTI_NAME", raising=False)

    response = client.get("/battery")

    assert response.status_code == 500
    assert "BLUETTI_NAME" in response.json()["detail"]


def test_battery_unsupported_model(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("BLUETTI_NAME", "XYZ123")

    response = client.get("/battery")

    assert response.status_code == 500
    assert "no soportado" in response.json()["detail"]
