import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth-guard";
import { RequestClient } from "./request-client";

export const metadata: Metadata = {
  title: "Žádost supervisorovi",
  robots: { index: false, follow: false },
};

export default function ZadostPage() {
  return (
    <AuthGuard>
      <RequestClient />
    </AuthGuard>
  );
}
