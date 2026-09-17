import type { Metadata } from "next";
import { sdileni } from "@/lib/og";
import { Newspaper } from "lucide-react";
import { publicFetch } from "@/lib/api";
import type { Highlight } from "@/lib/types";
import { Page } from "@/components/layout/container";
import { EmptyState, PageTitle } from "@/components/ui/primitives";
import { AktualitySeznam } from "./aktuality-seznam";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Aktuality",
  description: "Highlighty kola, novinky a zajímavosti z Floorball Stars Ligy.",
  ...sdileni({
    title: "Aktuality z Floorball Stars Ligy",
    description:
      "Highlighty kola, novinky a zajímavosti z Floorball Stars Ligy.",
    path: "/aktuality",
  }),
};

export default async function AktualityPage() {
  const highlights = (await publicFetch<Highlight[]>("/highlights")) ?? [];

  return (
    <Page size="narrow">
      <PageTitle
        title="Aktuality"
        subtitle="Ťukni na článek, rozbalí se celý"
      />

      {highlights.length === 0 ? (
        <EmptyState icon={<Newspaper size={44} />} title="Zatím žádné aktuality" />
      ) : (
        <AktualitySeznam highlights={highlights} />
      )}
    </Page>
  );
}
