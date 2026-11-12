import { ApiUnavailableError, getBatteryEstimate } from "@/lib/api";

// The browser cannot reach the API directly (in Docker it lives at http://api:3001), so the estimate goes through here
export async function GET() {
  try {
    return Response.json(await getBatteryEstimate());
  } catch (error) {
    if (error instanceof ApiUnavailableError) {
      return Response.json({ detail: error.message }, { status: 503 });
    }
    throw error;
  }
}
