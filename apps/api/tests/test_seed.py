from datetime import datetime, timedelta, timezone

from app.seed import build_rows

NOW = datetime(2026, 11, 11, 18, 0, tzinfo=timezone.utc)


def _at(rows: list[dict], hours_ago: float) -> dict:
    target = NOW - timedelta(hours=hours_ago)
    return min(rows, key=lambda row: abs(row["date"] - target))


def test_seed_covers_24_hours_every_7_seconds() -> None:
    rows = build_rows(NOW)

    assert rows[0]["date"] == NOW - timedelta(hours=24)
    assert rows[1]["date"] - rows[0]["date"] == timedelta(seconds=7)
    assert len(rows) == 24 * 3600 // 7 + 1


def test_seed_discharges_during_blackouts_and_charges_after() -> None:
    rows = build_rows(NOW)

    for start, end in [(22, 14), (10, 2)]:
        before, after = _at(rows, start - 0.1), _at(rows, end + 0.1)
        assert before["ac"] is False and after["ac"] is False
        assert after["battery_percent"] < before["battery_percent"] - 25

    assert _at(rows, 12)["battery_percent"] == 100
    assert _at(rows, 0)["battery_percent"] == 100
    assert _at(rows, 1)["ac_input"] > _at(rows, 1)["ac_output"]
