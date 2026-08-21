import type { Metadata } from "next";
import { AdminTeamsClient } from "./teams-client";

export const metadata: Metadata = { title: "Správa týmů" };

export default function AdminTymyPage() {
  return <AdminTeamsClient />;
}
