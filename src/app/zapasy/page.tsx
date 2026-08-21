import type { Metadata } from "next";
import { Suspense } from "react";
import { Page } from "@/components/layout/container";
import { PageTitle } from "@/components/ui/primitives";
import { SkeletonCards } from "@/components/ui/feedback";
import { MatchesClient } from "./matches-client";

export const metadata: Metadata = {
  title: "Zápasy a výsledky",
  description:
    "Rozpis zápasů, živé výsledky a archiv odehraných utkání Floorball Stars Ligy.",
};

export default function ZapasyPage() {
  return (
    <Page>
      <PageTitle
        title="Zápasy"
        subtitle="Živé výsledky, nadcházející rozpis a archiv odehraných zápasů"
      />
      <Suspense fallback={<SkeletonCards count={6} />}>
        <MatchesClient />
      </Suspense>
    </Page>
  );
}
