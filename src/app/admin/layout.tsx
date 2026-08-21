import type { Metadata } from "next";
import { AuthGuard } from "@/components/auth-guard";
import { AdminNav } from "./admin-nav";
import { Container } from "@/components/layout/container";

export const metadata: Metadata = {
  title: { default: "Administrace", template: "%s · Administrace FSL" },
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard require="supervisor">
      <Container size="wide" className="py-8">
        <div className="flex flex-col gap-6 lg:flex-row">
          <AdminNav />
          <div className="min-w-0 flex-1">{children}</div>
        </div>
      </Container>
    </AuthGuard>
  );
}
