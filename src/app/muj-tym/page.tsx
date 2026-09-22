import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth-guard";
import { MujTymClient } from "./muj-tym-client";

export const metadata: Metadata = {
  title: "Můj tým",
  robots: { index: false, follow: false },
};

export default function MujTymPage() {
  return (
    <AuthGuard require="player">
      <MujTymClient />
    </AuthGuard>
  );
}
