import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginClient } from "./login-client";

export const metadata: Metadata = {
  title: "Přihlášení",
  description: "Přihlas se do Floorball Stars Ligy e-mailem nebo přes Google.",
  robots: { index: false, follow: false },
};

export default function PrihlaseniPage() {
  return (
    <Suspense fallback={null}>
      <LoginClient />
    </Suspense>
  );
}
