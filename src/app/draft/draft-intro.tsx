"use client";

import {
  ClipboardList,
  Send,
  Timer,
  UserPlus,
  Users,
  Video,
} from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { Page } from "@/components/layout/container";
import { Card, CardBody, LinkButton, PageTitle, Spinner } from "@/components/ui/primitives";
import { DraftClient } from "./draft-client";

/**
 * Draft potřebuje přihlášení — v poolu jsou jména a u vedoucích i telefony,
 * takže seznam veřejný být nemůže. Do 10. 9. tu ale místo vysvětlení stála
 * jen `AuthGuard`, která nepřihlášeného mlčky přesměrovala na formulář:
 * kdo o draftu nikdy neslyšel, dostal přihlašovací obrazovku a odešel.
 *
 * Proto tahle mezistránka. Nepřihlášenému vysvětlí, co draft je a proč se
 * mu vyplatí založit účet; přihlášeného pustí rovnou na seznam.
 */

const KROKY = [
  {
    icon: <UserPlus size={20} />,
    title: "Nabídneš se",
    desc: "Založíš si účet a draft profil — pozice, pár řádků o sobě a klidně i sestřih. Pozvánkový kód od vedoucího k tomu nepotřebuješ.",
  },
  {
    icon: <Send size={20} />,
    title: "Přijde nabídka",
    desc: "Vedoucí týmů vidí, kdo je volný, a posílají nabídky. U každé je zpráva od vedoucího a tým, který ji poslal.",
  },
  {
    icon: <Timer size={20} />,
    title: "Máš čas rozhodnout",
    desc: "Na odpověď je 72 hodin. Když se o tebe přihlásí druhý tým, okno se zkrátí na 24 — a když do konce neodpovíš, přijme se za tebe ta první nabídka.",
  },
  {
    icon: <ClipboardList size={20} />,
    title: "Jsi v týmu",
    desc: "Přijetím se dostaneš na soupisku a ostatní nabídky se zruší. Pak už jen zaplatíš licenci a balíček startů a můžeš nastoupit.",
  },
];

export function DraftGate() {
  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);

  if (loading) {
    return (
      <Page>
        <div className="flex justify-center py-24 text-go">
          <Spinner size={32} />
        </div>
      </Page>
    );
  }

  if (user) return <DraftClient />;

  return (
    <Page size="narrow">
      <PageTitle
        title="Draft"
        subtitle="Cesta do ligy pro hráče, kteří nemají tým"
      />

      <Card className="border-bd-strong">
        <CardBody className="sm:p-6">
          <p className="text-[15px] leading-7 text-wh">
            <strong className="font-semibold">
              Do FSL se nemusíš hlásit s celým týmem.
            </strong>{" "}
            Když hráče na deset lidí nedáš, nabídneš se v draftu — vedoucí, kterým
            chybí do soupisky, si tam volné hráče hledají sami.
          </p>
        </CardBody>
      </Card>

      <div className="mt-6 space-y-3">
        {KROKY.map((k, i) => (
          <Card key={k.title}>
            <CardBody className="flex gap-4">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-bd bg-go-soft text-go">
                {k.icon}
              </div>
              <div className="min-w-0">
                <h3 className="text-[15px] font-semibold text-wh">
                  <span className="mr-2 text-di tabular-nums">{i + 1}.</span>
                  {k.title}
                </h3>
                <p className="mt-1 text-sm leading-6 text-mu">{k.desc}</p>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>

      <Card className="mt-6">
        <CardBody className="sm:p-6">
          <div className="flex items-center gap-2 text-go">
            <Video size={17} />
            <h3 className="text-[15px] font-semibold text-wh">
              Sestřih pomůže, ale není povinný
            </h3>
          </div>
          <p className="mt-2 text-sm leading-6 text-mu">
            K profilu jde přidat až pět videí. Vedoucí se rozhoduje podle toho,
            co vidí — ale i profil s pozicí a pár větami o sobě je pořád víc než
            žádný.
          </p>
        </CardBody>
      </Card>

      <div className="mt-8 rounded-xl border border-bd bg-c1/80 p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <Users size={17} className="text-go" />
          <h3 className="text-[15px] font-semibold text-wh">
            Seznam volných hráčů je za přihlášením
          </h3>
        </div>
        <p className="mt-2 text-sm leading-6 text-mu">
          Jsou v něm jména a kontakty na konkrétní lidi, takže ho veřejně
          neukazujeme. Účet stačí založit přes Google nebo Apple, zabere to
          půl minuty.
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <LinkButton href="/prihlaseni?next=%2Fdraft" size="md">
            Přihlásit se
          </LinkButton>
          <LinkButton href="/registrace?next=%2Fdraft" size="md" variant="outline">
            Nemám účet
          </LinkButton>
        </div>
      </div>

      <p className="mt-6 text-[13px] leading-6 text-di">
        Kolik stojí licence a balíčky startů, je v{" "}
        <a href="/cenik" className="text-go hover:underline">
          ceníku
        </a>
        . Do draftu se nabídnout nic nestojí — platí se až ve chvíli, kdy máš
        tým a chystáš se hrát.
      </p>
    </Page>
  );
}
