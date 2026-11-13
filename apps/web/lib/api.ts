import { connection } from "next/server";

export type Summary = {
  id: number;
  date: string;
  battery_percent: number;
  ac_output: number;
  ac_input: number;
  dc_output: number;
  dc_input: number;
  ac: boolean;
  dc: boolean;
};

type SummaryPage = {
  items: Summary[];
  total: number;
  page_size: number;
  offset: number;
};

export class ApiUnavailableError extends Error {}

function apiUrl(path: string): string {
  const base = process.env.API_URL ?? "http://localhost:3001";
  return new URL(path, base).toString();
}

export async function getLatestSummary(): Promise<Summary | null> {
  let response: Response;
  try {
    response = await fetch(apiUrl("/data-summary?page_size=1"));
  } catch (error) {
    throw new ApiUnavailableError("Could not reach the API", { cause: error });
  }

  if (!response.ok) {
    throw new ApiUnavailableError(`API responded with ${response.status}`);
  }

  const page: SummaryPage = await response.json();
  return page.items[0] ?? null;
}

export type BatteryStatusPoint = {
  date: string;
  battery_percent: number;
};

export type BatteryStatus = {
  readings: BatteryStatusPoint[];
  fetchedAt: number;
};

export async function getBatteryStatus(hours: number): Promise<BatteryStatus> {
  await connection();
  const fetchedAt = Date.now();
  let response: Response;
  try {
    response = await fetch(apiUrl(`/battery-status?hours=${hours}`));
  } catch (error) {
    throw new ApiUnavailableError("Could not reach the API", { cause: error });
  }

  if (!response.ok) {
    throw new ApiUnavailableError(`API responded with ${response.status}`);
  }

  return { readings: await response.json(), fetchedAt };
}

export type Blackout = {
  start: string;
  end: string;
  duration_hours: number;
  ongoing: boolean;
};

export async function getBlackouts(hours: number): Promise<Blackout[]> {
  let response: Response;
  try {
    response = await fetch(apiUrl(`/blackouts?hours=${hours}`));
  } catch (error) {
    throw new ApiUnavailableError("Could not reach the API", { cause: error });
  }

  if (!response.ok) {
    throw new ApiUnavailableError(`API responded with ${response.status}`);
  }

  return response.json();
}

export type AcOutputPoint = {
  date: string;
  ac_output: number;
};

export type AcOutputHistory = {
  readings: AcOutputPoint[];
  fetchedAt: number;
};

export async function getAcOutputHistory(hours: number): Promise<AcOutputHistory> {
  await connection();
  const fetchedAt = Date.now();
  let response: Response;
  try {
    response = await fetch(apiUrl(`/ac-output-history?hours=${hours}`));
  } catch (error) {
    throw new ApiUnavailableError("Could not reach the API", { cause: error });
  }

  if (!response.ok) {
    throw new ApiUnavailableError(`API responded with ${response.status}`);
  }

  return { readings: await response.json(), fetchedAt };
}

export type Period = { start: string; end: string; duration_hours: number };

export type PowerStatus = {
  receiving_ac: boolean | null;
  current_since: string | null;
  last_with_power: string | null;
  last_blackout: Period | null;
  last_power_period: Period | null;
};

export type PowerStatusResult = {
  status: PowerStatus;
  fetchedAt: number;
};

export async function getPowerStatus(): Promise<PowerStatusResult> {
  await connection();
  const fetchedAt = Date.now();
  let response: Response;
  try {
    response = await fetch(apiUrl("/power-status"));
  } catch (error) {
    throw new ApiUnavailableError("Could not reach the API", { cause: error });
  }

  if (!response.ok) {
    throw new ApiUnavailableError(`API responded with ${response.status}`);
  }

  return { status: await response.json(), fetchedAt };
}

export type BatteryEstimateStatus = "discharging" | "charging" | "reserve" | "idle" | "stale" | "no_data";

export type BatteryEstimate = {
  computed_at: string;
  status: BatteryEstimateStatus;
  soc: number | null;
  soc_estimate: number | null;
  load_w: number | null;
  drain_pct_per_hour: number | null;
  reserve_percent: number;
  eta: string | null;
  eta_earliest: string | null;
  eta_latest: string | null;
  hours_left: number | null;
  full_eta: string | null;
  hours_to_full: number | null;
  model: { wh_per_percent: number; idle_w: number; steps_used: number; from_history: boolean };
};

export async function getBatteryEstimate(): Promise<BatteryEstimate> {
  let response: Response;
  try {
    response = await fetch(apiUrl("/battery-estimate"), { cache: "no-store" });
  } catch (error) {
    throw new ApiUnavailableError("Could not reach the API", { cause: error });
  }

  if (!response.ok) {
    throw new ApiUnavailableError(`API responded with ${response.status}`);
  }

  return response.json();
}

export type PowerPeriod = { start: string; end: string; receiving_ac: boolean };

export type PowerPeriodsResult = { periods: PowerPeriod[]; fetchedAt: number };

export async function getPowerPeriods(hours: number): Promise<PowerPeriodsResult> {
  await connection();
  const fetchedAt = Date.now();
  let response: Response;
  try {
    response = await fetch(apiUrl(`/power-periods?hours=${hours}`));
  } catch (error) {
    throw new ApiUnavailableError("Could not reach the API", { cause: error });
  }

  if (!response.ok) {
    throw new ApiUnavailableError(`API responded with ${response.status}`);
  }

  return { periods: await response.json(), fetchedAt };
}

export type PowerTotals = {
  since: string | null;
  with_power_hours: number;
  without_power_hours: number;
  receiving_ac: boolean | null;
  last_outage_start: string | null;
  outage_ongoing: boolean;
};

export async function getPowerTotals(hours?: number): Promise<PowerTotals> {
  await connection();
  let response: Response;
  try {
    response = await fetch(apiUrl(hours ? `/power-totals?hours=${hours}` : "/power-totals"));
  } catch (error) {
    throw new ApiUnavailableError("Could not reach the API", { cause: error });
  }

  if (!response.ok) {
    throw new ApiUnavailableError(`API responded with ${response.status}`);
  }

  return response.json();
}
