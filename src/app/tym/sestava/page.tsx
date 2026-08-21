import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth-guard";
import { LineupClient } from "./lineup-client";

export const metadata: Metadata = {
  title: "Sestava před zápasem",
  robots: { index: false, follow: false },
};

export default function SestavaPage() {
  return (
    <AuthGuard require="manager">
      <LineupClient />
    </AuthGuard>
  );
}
