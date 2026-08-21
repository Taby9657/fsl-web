import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth-guard";
import { PostmatchClient } from "./postmatch-client";

export const metadata: Metadata = {
  title: "Po-zápasový formulář",
  robots: { index: false, follow: false },
};

export default function PoZapasePage() {
  return (
    <AuthGuard require="manager">
      <PostmatchClient />
    </AuthGuard>
  );
}
