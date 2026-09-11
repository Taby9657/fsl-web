import type { Metadata } from "next";
import { LeagueClient } from "./league-client";

export const metadata: Metadata = { title: "Ligová struktura" };

export default function AdminLigaPage() {
  return <LeagueClient />;
}
