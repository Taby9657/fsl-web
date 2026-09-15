import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth-guard";
import { OnboardingClient } from "./onboarding-client";

export const metadata: Metadata = {
  title: "Přihláška do ligy",
  description: "Přihlas do Floorball Stars Ligy tým, sebe jako hráče, nebo se přihlas jako rozhodčí.",
  robots: { index: false, follow: false },
};

export default function RegistracePage() {
  return (
    <AuthGuard>
      <OnboardingClient />
    </AuthGuard>
  );
}
