import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth-guard";
import { DraftClient } from "./draft-client";

export const metadata: Metadata = {
  title: "Draft",
  description: "Volní hráči hledající tým ve Floorball Stars Lize.",
  robots: { index: false, follow: false },
};

export default function DraftPage() {
  return (
    <AuthGuard>
      <DraftClient />
    </AuthGuard>
  );
}
