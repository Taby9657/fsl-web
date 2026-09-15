import type { Metadata } from "next";
import { AdminPlayersClient } from "./players-client";

export const metadata: Metadata = { title: "Správa hráčů" };

export default function AdminHraciPage() {
  return <AdminPlayersClient />;
}
