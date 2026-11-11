import pytest
from bluetti_bt_lib import FieldName
from fastapi.testclient import TestClient

from app import bluetti
from app.main import app

client = TestClient(app)


@pytest.mark.parametrize(
    ("path", "field"),
    [
        ("/ac-output", FieldName.AC_OUTPUT_POWER),
        ("/dc-output", FieldName.DC_OUTPUT_POWER),
        ("/ac-input", FieldName.AC_INPUT_POWER),
        ("/dc-input", FieldName.DC_INPUT_POWER),
    ],
)
def test_power(monkeypatch: pytest.MonkeyPatch, path: str, field: FieldName) -> None:
    async def fake_read_field(requested: FieldName) -> bluetti.Reading:
        assert requested == field
        return bluetti.Reading(value=120, unit="W", model="AC180")

    monkeypatch.setattr(bluetti, "read_field", fake_read_field)

    response = client.get(path)

    assert response.status_code == 200
    assert response.json() == {"power": 120, "unit": "W", "model": "AC180"}


def test_power_unavailable(monkeypatch: pytest.MonkeyPatch) -> None:
    async def fake_read_field(field: FieldName) -> bluetti.Reading:
        raise bluetti.BluettiUnavailableError("Could not read ac_output_power")

    monkeypatch.setattr(bluetti, "read_field", fake_read_field)

    response = client.get("/ac-output")

    assert response.status_code == 503
