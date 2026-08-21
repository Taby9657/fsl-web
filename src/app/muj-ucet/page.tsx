import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth-guard";
import { AccountClient } from "./account-client";

export const metadata: Metadata = {
  title: "Můj účet",
  robots: { index: false, follow: false },
};

export default function MujUcetPage() {
  return (
    <AuthGuard>
      <AccountClient />
    </AuthGuard>
  );
}
