import type { Metadata } from "next";
import { sdileni } from "@/lib/og";
import { AuthGuard } from "@/components/auth-guard";
import { OnboardingClient } from "./onboarding-client";

export const metadata: Metadata = {
  title: "Přihláška do ligy",
  description: "Přihlas do Floorball Stars Ligy tým, sebe jako hráče, nebo se přihlas jako rozhodčí.",
  robots: { index: false, follow: false },
  ...sdileni({
    title: "Přihláška do Floorball Stars Ligy",
    description:
      "Přihlas tým, sebe jako hráče, nebo se ozvi jako rozhodčí. Registrace do sezóny 2026/27 je otevřená.",
    path: "/registrace",
  }),
};

export default function RegistracePage() {
  return (
    <AuthGuard>
      <OnboardingClient />
    </AuthGuard>
  );
}
