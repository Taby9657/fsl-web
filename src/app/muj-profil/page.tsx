import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth-guard";
import { ProfileClient } from "./profile-client";

export const metadata: Metadata = {
  title: "Upravit profil",
  robots: { index: false, follow: false },
};

export default function MujProfilPage() {
  return (
    <AuthGuard require="player">
      <ProfileClient />
    </AuthGuard>
  );
}
