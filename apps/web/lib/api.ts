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
