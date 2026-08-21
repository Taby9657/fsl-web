import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth-guard";
import { SettingsClient } from "./settings-client";

export const metadata: Metadata = {
  title: "Nastavení",
  robots: { index: false, follow: false },
};

export default function NastaveniPage() {
  return (
    <AuthGuard>
      <SettingsClient />
    </AuthGuard>
  );
}
