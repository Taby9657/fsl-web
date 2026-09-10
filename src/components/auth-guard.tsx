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
      // `usePathname()` je bez query stringu. Dokud se `next` stavěl jen
      // z něj, ztrácel se pozvánkový kód: `/registrace?kod=FSL-XX-1234`
      // skončilo jako `next=%2Fregistrace` a člověk, který přišel
      // z pozvánkového odkazu, musel kód opsat ručně. Stejně se ztrácelo
      // `?next=` u vstupu z draftu.
      //
      // Query se schválně čte z `window.location`, ne z `useSearchParams()`:
      // ten hook je v komponentě, kterou používají i staticky
      // prerenderované stránky (`/admin`), a Next kvůli němu vyžaduje
      // `<Suspense>` — jinak build spadne na
      // „useSearchParams() should be wrapped in a suspense boundary".
      // Tady se hodnota potřebuje jen v prohlížeči, takže `window` stačí
      // a prerender zůstane nedotčený.
      const cil = `${pathname}${window.location.search}`;
      router.replace(`/prihlaseni?next=${encodeURIComponent(cil)}`);
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
