import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth-guard";
import { InviteClient } from "./invite-client";

export const metadata: Metadata = {
  title: "Pozvánkový kód",
  robots: { index: false, follow: false },
};

export default function PozvankaPage() {
  return (
    <AuthGuard require="manager">
      <InviteClient />
    </AuthGuard>
  );
}
