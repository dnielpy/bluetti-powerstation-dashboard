import { redirect } from "next/navigation";

// Consumption moved into Battery; old links land there
export default function ConsumptionPage() {
  redirect("/battery");
}
