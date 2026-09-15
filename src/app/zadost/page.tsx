import type { Metadata } from "next";
import { ZadostClient } from "./request-client";

export const metadata: Metadata = {
  title: "Napsat nám",
  description:
    "Dotaz k lize, platbám, soupisce nebo registraci — a hlášení chyb na webu.",
  robots: { index: false, follow: false },
};

// Schválně bez AuthGuard: kdo se nemůže přihlásit, musí mít jak to nahlásit.
export default function ZadostPage() {
  return <ZadostClient />;
}
