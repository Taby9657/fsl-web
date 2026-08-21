import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth-guard";
import { OnboardingClient } from "./onboarding-client";

export const metadata: Metadata = {
  title: "Registrace",
  description: "Dokonči registraci do Floorball Stars Ligy.",
  robots: { index: false, follow: false },
};

export default function RegistracePage() {
  return (
    <AuthGuard>
      <OnboardingClient />
    </AuthGuard>
  );
}
