"use client";

import { ClipboardList, Send, Timer, UserPlus } from "lucide-react";
import { useAuthStore } from "@/store/auth";
import { Page } from "@/components/layout/container";
import { Card, CardBody, LinkButton, Spinner } from "@/components/ui/primitives";
import { DraftClient } from "./draft-client";

/**
 * Draft pool je **veřejný** — pro hráče bez týmu je to jediná vstupní brána
 * do ligy, takže se o něm musí dozvědět i ten, kdo tu nemá účet. Veřejná
 * je jen soupiska volných hráčů; **kontaktní údaje ne** — telefon se do
 * odpovědi API vůbec nedostane, pokud volající není vedoucí týmu.
 *
 * Do 10. 9. tu místo vysvětlení stála `AuthGuard`, která nepřihlášeného
 * mlčky přesměrovala na přihlašovací formulář: kdo o draftu nikdy neslyšel,
 * dostal login a odešel.
 *
 * Nepřihlášenému proto nad seznam přidáme vysvětlení a výzvu k registraci,
 * přihlášený vidí seznam samotný.
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

function DraftUvod() {
  return (
    <div className="mb-8">
      <Card className="border-bd-strong">
        <CardBody className="sm:p-6">
          <p className="text-[15px] leading-7 text-wh">
            <strong className="font-semibold">
              Do FSL se nemusíš hlásit s celým týmem.
            </strong>{" "}
            Když hráče na celou soupisku nedáš, nabídneš se tady — vedoucí,
            kterým chybí lidi, si volné hráče hledají sami.
          </p>
        </CardBody>
      </Card>

      <div className="mt-4 space-y-3">
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

      <div className="mt-5 rounded-xl border border-bd bg-c1/80 p-5 sm:p-6">
        <h3 className="text-[15px] font-semibold text-wh">
          Chceš se nabídnout taky?
        </h3>
        <p className="mt-2 text-sm leading-6 text-mu">
          Profil si založíš přes Google nebo Apple, zabere to půl minuty.
          Nabídnout se nic nestojí — platí se až ve chvíli, kdy máš tým
          a chystáš se hrát. Kolik, je v{" "}
          <a href="/cenik" className="text-go hover:underline">
            ceníku
          </a>
          .
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <LinkButton href="/registrace?next=%2Fdraft" size="md">
            Nabídnout se v draftu
          </LinkButton>
          <LinkButton
            href="/prihlaseni?next=%2Fdraft"
            size="md"
            variant="outline"
          >
            Už mám účet
          </LinkButton>
        </div>
      </div>

      <p className="mt-5 text-[13px] leading-6 text-di">
        U hráčů níž vidíš pozici, popis a sestřihy. Telefon a další kontakty
        veřejné nejsou — dostane je jen vedoucí týmu, který hráče hledá.
      </p>
    </div>
  );
}

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

  return <DraftClient uvod={user ? undefined : <DraftUvod />} />;
}
