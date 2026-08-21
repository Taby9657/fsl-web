import type { Metadata } from "next";
import { AdminHighlightsClient } from "./highlights-client";

export const metadata: Metadata = { title: "Aktuality" };

export default function AdminAktualityPage() {
  return <AdminHighlightsClient />;
}
