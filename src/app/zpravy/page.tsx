import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth-guard";
import { ZpravyClient } from "./zpravy-client";

export const metadata: Metadata = {
  title: "Zprávy",
  robots: { index: false, follow: false },
};

export default function ZpravyPage() {
  return (
    <AuthGuard require="user">
      <ZpravyClient />
    </AuthGuard>
  );
}
