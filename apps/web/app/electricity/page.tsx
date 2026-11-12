import { redirect } from "next/navigation";

// Electricity moved into Battery; old links land there
export default function ElectricityPage() {
  redirect("/battery");
}
