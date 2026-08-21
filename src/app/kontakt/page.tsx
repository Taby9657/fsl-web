import type { Metadata } from "next";
import { Mail, MessageSquare, Shield } from "lucide-react";
import { Page } from "@/components/layout/container";
import { Card, LinkButton, PageTitle } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Kontakt",
  description: "Kontakt na vedení Floorball Stars Ligy.",
};

export default function KontaktPage() {
  return (
    <Page size="narrow">
      <PageTitle
        title="Kontakt"
        subtitle="Máš dotaz k lize, registraci týmu nebo platbám? Ozvi se."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <Card className="p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-go-soft text-go">
            <Mail size={20} />
          </span>
          <h2 className="mt-4 text-[16px] font-bold text-wh">E-mail</h2>
          <p className="mt-1 text-[14px] text-mu">
            Obecné dotazy, registrace týmů, fakturace.
          </p>
          <a
            href="mailto:j.tabasek96@gmail.com"
            className="mt-3 inline-block text-[14px] font-semibold text-go hover:underline"
          >
            j.tabasek96@gmail.com
          </a>
        </Card>

        <Card className="p-5">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-pu/20 text-pu">
            <Shield size={20} />
          </span>
          <h2 className="mt-4 text-[16px] font-bold text-wh">Vedení ligy</h2>
          <p className="mt-1 text-[14px] text-mu">
            Jakub Tabášek — supervisor Floorball Stars Ligy.
          </p>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-go-soft text-go">
          <MessageSquare size={20} />
        </span>
        <h2 className="mt-4 text-[16px] font-bold text-wh">Žádost supervisorovi</h2>
        <p className="mt-1 max-w-lg text-[14px] leading-6 text-mu">
          Reklamace zápisu ze zápasu, hráčský spor nebo problém s licencí řeš přímo přes
          formulář v aplikaci — žádost se supervisorovi zobrazí ve frontě i s historií.
        </p>
        <LinkButton href="/zadost" className="mt-4" size="sm">
          Podat žádost
        </LinkButton>
      </Card>
    </Page>
  );
}
