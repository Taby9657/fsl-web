"use client";

import { Page } from "@/components/layout/container";
import { SupportForm } from "@/components/support-form";
import { Card, PageTitle } from "@/components/ui/primitives";

export function ZadostClient() {
  return (
    <Page size="narrow">
      <PageTitle
        title="Napsat nám"
        subtitle="Dotaz, platby, soupiska, registrace i chyba na webu — všechno sem"
      />

      <Card className="p-5">
        <SupportForm />
      </Card>

      <p className="mt-4 text-[12px] leading-6 text-di">
        Odpovídáme na info@fslleague.cz. Zpráva se supervisorovi zobrazí ve
        frontě i s historií.
      </p>
    </Page>
  );
}
