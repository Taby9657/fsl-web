import type { Metadata } from "next";
import { Page } from "@/components/layout/container";
import { PageTitle } from "@/components/ui/primitives";
import { PredSezonou } from "@/components/pred-sezonou";
import { predSezonou } from "@/lib/sezona";
import { CompareClient } from "./compare-client";

export const metadata: Metadata = {
  title: "Porovnání hráčů",
  description: "Porovnej góly, asistence, body a MVP hlasy dvou hráčů Floorball Stars Ligy.",
};

export default function PorovnaniPage() {
  return (
    <Page size="narrow">
      <PageTitle
        title="Porovnání hráčů"
        subtitle="Vyber dva hráče a porovnej jejich sezónní čísla"
      />
      {/* Před startem sezóny nejsou čísla, ze kterých by šlo porovnávat, a od
          18. 9. 2026 API nepřihlášenému hráče ani nevrátí — vyhledávání by
          tu tedy jen mlčky nic nenašlo. */}
      {predSezonou() ? (
        <PredSezonou titul="Porovnání vznikne z odehraných zápasů" />
      ) : (
        <CompareClient />
      )}
    </Page>
  );
}
