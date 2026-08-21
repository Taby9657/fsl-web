import type { Metadata } from "next";
import { Suspense } from "react";
import { Page } from "@/components/layout/container";
import { PageTitle } from "@/components/ui/primitives";
import { SkeletonCards } from "@/components/ui/feedback";
import { BracketClient } from "./bracket-client";

export const metadata: Metadata = {
  title: "Play-off pavouk",
  description: "Play-off pavouk Floorball Stars Ligy — cesta týmů za titulem.",
};

export default function PavoukPage() {
  return (
    <Page size="wide">
      <PageTitle title="Play-off pavouk" subtitle="Vyřazovací část podle kol" />
      <Suspense fallback={<SkeletonCards count={4} />}>
        <BracketClient />
      </Suspense>
    </Page>
  );
}
