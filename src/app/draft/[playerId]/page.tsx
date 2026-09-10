import type { Metadata } from "next";
import { DraftDetailClient } from "./draft-detail-client";

export const metadata: Metadata = {
  title: "Draft karta",
  robots: { index: false, follow: false },
};

export default async function DraftDetailPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  // Karta je veřejná stejně jako seznam, ale **neindexuje se** — je to
  // profil konkrétního člověka. Telefon dostane z API jen vedoucí týmu.
  return <DraftDetailClient playerId={playerId} />;
}
