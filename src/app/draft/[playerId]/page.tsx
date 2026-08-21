import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth-guard";
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
  return (
    <AuthGuard>
      <DraftDetailClient playerId={playerId} />
    </AuthGuard>
  );
}
