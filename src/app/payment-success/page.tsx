import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";
import { Page } from "@/components/layout/container";
import { Card, LinkButton } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Platba přijata",
  robots: { index: false, follow: false },
};

const LABELS: Record<string, string> = {
  license: "Hráčská licence je zaplacená.",
  "super-license": "Super licence je zaplacená.",
  "home-fee": "Poplatek za domácí zápas je uhrazený.",
};

export default async function PaymentSuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;

  return (
    <Page size="narrow">
      <Card className="p-8 text-center">
        <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green/15 text-green">
          <CheckCircle2 size={40} />
        </span>
        <h1 className="mt-6 text-2xl font-bold text-wh">Platba proběhla</h1>
        <p className="mx-auto mt-2 max-w-sm text-[15px] leading-6 text-mu">
          {(type && LABELS[type]) ?? "Děkujeme, platba byla přijata."} Stav se aktualizuje
          během chvilky, jakmile ji potvrdí platební brána.
        </p>
        <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:justify-center">
          <LinkButton href="/platby">Přehled plateb</LinkButton>
          <LinkButton href="/muj-ucet" variant="ghost">
            Můj účet
          </LinkButton>
        </div>
      </Card>
    </Page>
  );
}
