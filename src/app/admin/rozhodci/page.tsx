import type { Metadata } from "next";
import { AdminRefereesClient } from "./referees-client";

export const metadata: Metadata = { title: "Rozhodčí" };

export default function AdminRozhodciPage() {
  return <AdminRefereesClient />;
}
