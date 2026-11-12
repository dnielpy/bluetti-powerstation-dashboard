import { redirect } from "next/navigation";

// Stats moved into Battery; old links land there
export default function StatsPage() {
  redirect("/battery");
}
