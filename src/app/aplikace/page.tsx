import type { Metadata } from "next";
import {
  Bell,
  ClipboardList,
  CreditCard,
  QrCode,
  Radio,
  Shield,
  Smartphone,
  Users,
} from "lucide-react";
import { Container } from "@/components/layout/container";
import { Card, LinkButton } from "@/components/ui/primitives";

export const metadata: Metadata = {
  title: "Mobilní aplikace FSL",
  description:
    "Aplikace Floorball Stars Ligy pro iOS a Android — živé skóre, soupisky, platby licencí a draft přímo v telefonu.",
};

const FEATURES = [
  {
    icon: <Radio size={22} />,
    title: "Živé skóre",
    desc: "Rozhodčí zapisuje góly a tresty v reálném čase, ostatní vidí průběh okamžitě.",
  },
  {
    icon: <ClipboardList size={22} />,
    title: "Soupisky před zápasem",
    desc: "Vedoucí odešle sestavu, systém pohlídá minimální počet hráčů, brankáře i licence.",
  },
  {
    icon: <CreditCard size={22} />,
    title: "Platby licencí",
    desc: "Kartou přes Stripe nebo převodem — QR kód pro bankovní aplikaci a automatické párování plateb.",
  },
  {
    icon: <Users size={22} />,
    title: "Draft volných hráčů",
    desc: "Hráč bez týmu si udělá profil se sestřihem, vedoucí posílají nabídky v časovém okně.",
  },
  {
    icon: <Bell size={22} />,
    title: "Notifikace",
    desc: "Začátek zápasu, výsledek, nová draft nabídka nebo schválení registrace.",
  },
  {
    icon: <QrCode size={22} />,
    title: "Pozvánkové kódy",
    desc: "Hráč naskenuje QR kód vedoucího a je okamžitě na soupisce.",
  },
  {
    icon: <Shield size={22} />,
    title: "Správa ligy",
    desc: "Supervisor generuje rozlosování, schvaluje týmy a rozhodčí, hlídá platby.",
  },
];

export default function AplikacePage() {
  return (
    <>
      <section className="relative overflow-hidden border-b border-bd">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(38rem 22rem at 50% 0%, rgba(201,161,64,0.16), transparent 65%)",
          }}
        />
        <Container className="relative py-16 text-center sm:py-24">
          <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl border border-go/40 bg-go-soft text-go">
            <Smartphone size={30} />
          </span>
          <h1 className="mt-6 text-4xl font-black tracking-tight text-wh sm:text-5xl">
            FSL v mobilu
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-[16px] leading-7 text-mu">
            Celá liga v kapse — živé výsledky s notifikacemi, soupisky, platby licencí
            a draft. Aplikace pro iOS a Android.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <LinkButton href="/zapasy" size="lg" variant="outline">
              Prohlédnout ligu na webu
            </LinkButton>
          </div>
          <p className="mt-6 text-[13px] text-di">
            Aplikace míří do App Store — odkaz ke stažení doplníme po schválení.
          </p>
        </Container>
      </section>

      <Container className="py-14">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <Card key={f.title} className="p-5">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-go-soft text-go">
                {f.icon}
              </span>
              <h2 className="mt-4 text-[16px] font-bold text-wh">{f.title}</h2>
              <p className="mt-1.5 text-[14px] leading-6 text-mu">{f.desc}</p>
            </Card>
          ))}
        </div>

        <Card className="mt-10 p-6 sm:p-8">
          <h2 className="text-[18px] font-bold text-wh">Web i aplikace, stejná data</h2>
          <p className="mt-2 max-w-2xl text-[15px] leading-7 text-mu">
            Web fslleague.cz a mobilní aplikace sdílejí stejný systém — co zapíše rozhodčí v
            aplikaci, uvidíš okamžitě na webu. Všechny funkce aplikace jsou dostupné i tady:
            přihlášení, správa týmu, sestavy, platby, draft i kompletní administrace ligy.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <LinkButton href="/prihlaseni" size="md">
              Přihlásit se na webu
            </LinkButton>
            <LinkButton href="/tabulka" variant="ghost" size="md">
              Tabulka
            </LinkButton>
          </div>
        </Card>
      </Container>
    </>
  );
}
