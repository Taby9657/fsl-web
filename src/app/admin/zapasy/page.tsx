import type { Metadata } from "next";
import { AdminMatchesClient } from "./matches-client";

export const metadata: Metadata = { title: "Správa zápasů" };

export default function AdminZapasyPage() {
  return <AdminMatchesClient />;
}
