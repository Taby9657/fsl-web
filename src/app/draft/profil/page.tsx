import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth-guard";
import { DraftProfileClient } from "./draft-profile-client";

export const metadata: Metadata = {
  title: "Draft profil",
  robots: { index: false, follow: false },
};

export default function DraftProfilPage() {
  return (
    <AuthGuard require="player">
      <DraftProfileClient />
    </AuthGuard>
  );
}
