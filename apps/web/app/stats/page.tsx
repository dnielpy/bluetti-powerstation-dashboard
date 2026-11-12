import { redirect } from "next/navigation";

// Stats was split into Electricity, Blackouts and Consumption; old links land on the first one
export default function StatsPage() {
  redirect("/electricity");
}
