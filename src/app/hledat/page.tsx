import type { Metadata } from "next";
import { Suspense } from "react";
import { Page } from "@/components/layout/container";
import { PageTitle } from "@/components/ui/primitives";
import { SearchClient } from "./search-client";

export const metadata: Metadata = {
  title: "Vyhledávání",
  description: "Najdi hráče, týmy a rozhodčí ve Floorball Stars Lize.",
};

export default function HledatPage() {
  return (
    <Page size="narrow">
      <PageTitle title="Vyhledávání" subtitle="Hráči, týmy a rozhodčí" />
      <Suspense fallback={null}>
        <SearchClient />
      </Suspense>
    </Page>
  );
}
