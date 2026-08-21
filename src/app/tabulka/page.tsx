import type { Metadata } from "next";
import { Suspense } from "react";
import { Page } from "@/components/layout/container";
import { PageTitle } from "@/components/ui/primitives";
import { SkeletonList } from "@/components/ui/feedback";
import { TableClient } from "./table-client";

export const metadata: Metadata = {
  title: "Tabulka",
  description:
    "Aktuální tabulka Floorball Stars Ligy — body, skóre, forma a pořadí všech týmů.",
};

export default function TabulkaPage() {
  return (
    <Page>
      <PageTitle
        title="Tabulka"
        subtitle="Pořadí týmů podle bodů, skóre a formy z posledních zápasů"
      />
      <Suspense fallback={<SkeletonList rows={10} />}>
        <TableClient />
      </Suspense>
    </Page>
  );
}
