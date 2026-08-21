import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth-guard";
import { NotificationsClient } from "./notifications-client";

export const metadata: Metadata = {
  title: "Oznámení",
  robots: { index: false, follow: false },
};

export default function OznameniPage() {
  return (
    <AuthGuard>
      <NotificationsClient />
    </AuthGuard>
  );
}
