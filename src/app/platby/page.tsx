import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth-guard";
import { PaymentsClient } from "./payments-client";

export const metadata: Metadata = {
  title: "Platby",
  robots: { index: false, follow: false },
};

export default function PlatbyPage() {
  return (
    <AuthGuard>
      <PaymentsClient />
    </AuthGuard>
  );
}
