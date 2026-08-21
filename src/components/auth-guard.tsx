"use client";

import { Lock } from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useAuthStore, useIsSupervisor } from "@/store/auth";
import { Page } from "@/components/layout/container";
import { EmptyState, LinkButton, Spinner } from "@/components/ui/primitives";

/**
 * Klientská ochrana rout. Backend role vynucuje sám, tohle je jen UX vrstva.
 */
export function AuthGuard({
  children,
  require: requirement,
}: {
  children: ReactNode;
  require?: "user" | "player" | "manager" | "referee" | "supervisor";
}) {
  const router = useRouter();
  const pathname = usePathname();
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const isSupervisor = useIsSupervisor();

  useEffect(() => {
    if (!loading && !user) {
      router.replace(`/prihlaseni?next=${encodeURIComponent(pathname)}`);
    }
  }, [loading, user, router, pathname]);

  if (loading) {
    return (
      <Page>
        <div className="flex justify-center py-24 text-go">
          <Spinner size={32} />
        </div>
      </Page>
    );
  }

  if (!user) return null;

  const need = requirement ?? "user";
  const ok =
    need === "user" ||
    (need === "player" && !!user.player) ||
    (need === "manager" && (user.manager?.length ?? 0) > 0) ||
    (need === "referee" && !!user.referee) ||
    (need === "supervisor" && isSupervisor);

  if (!ok) {
    const LABEL: Record<string, string> = {
      player: "Tato sekce je dostupná jen registrovaným hráčům.",
      manager: "Tato sekce je dostupná jen vedoucím týmů.",
      referee: "Tato sekce je dostupná jen rozhodčím.",
      supervisor: "Tato sekce je dostupná jen supervisorovi ligy.",
    };
    return (
      <Page size="narrow">
        <EmptyState
          icon={<Lock size={44} />}
          title="Nemáš oprávnění"
          description={LABEL[need]}
          action={
            <LinkButton href="/muj-ucet" size="sm">
              Zpět na můj účet
            </LinkButton>
          }
        />
      </Page>
    );
  }

  return <>{children}</>;
}
