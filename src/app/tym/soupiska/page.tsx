import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth-guard";
import { RosterClient } from "./roster-client";

export const metadata: Metadata = {
  title: "Soupiska týmu",
  robots: { index: false, follow: false },
};

export default function SoupiskaPage() {
  return (
    <AuthGuard require="manager">
      <RosterClient />
    </AuthGuard>
  );
}
