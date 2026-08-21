import type { Metadata } from "next";
import { Suspense } from "react";
import { Page } from "@/components/layout/container";
import { LinkButton, PageTitle } from "@/components/ui/primitives";
import { SkeletonList } from "@/components/ui/feedback";
import { StatsClient } from "./stats-client";

export const metadata: Metadata = {
  title: "Statistiky",
  description:
    "Nejlepší střelci, nahrávači, kanadské bodování, MVP hlasování a hodnocení rozhodčích ve Floorball Stars Lize.",
};

export default function StatistikyPage() {
  return (
    <Page>
      <PageTitle
        title="Statistiky"
        subtitle="Střelci, nahrávači, kanadské bodování, MVP a rozhodčí"
        action={
          <LinkButton href="/porovnani" variant="outline" size="sm">
            Porovnat hráče
          </LinkButton>
        }
      />
      <Suspense fallback={<SkeletonList rows={10} />}>
        <StatsClient />
      </Suspense>
    </Page>
  );
}
