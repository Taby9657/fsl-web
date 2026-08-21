import type { Metadata } from "next";
import { Page } from "@/components/layout/container";
import { PageTitle } from "@/components/ui/primitives";
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
      <CompareClient />
    </Page>
  );
}
