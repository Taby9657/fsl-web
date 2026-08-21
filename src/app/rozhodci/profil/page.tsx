import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth-guard";
import { RefereeProfileClient } from "./referee-profile-client";

export const metadata: Metadata = {
  title: "Profil rozhodčího",
  robots: { index: false, follow: false },
};

export default function RefereeProfilPage() {
  return (
    <AuthGuard require="referee">
      <RefereeProfileClient />
    </AuthGuard>
  );
}
