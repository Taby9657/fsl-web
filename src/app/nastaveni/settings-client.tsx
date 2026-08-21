"use client";

import { useQueryClient } from "@tanstack/react-query";
import { LogOut, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/auth";
import { Page } from "@/components/layout/container";
import {
  Button,
  Card,
  PageTitle,
  SectionTitle,
  Switch,
} from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";

const PREFS_KEY = "fsl_notif_prefs";

type Prefs = {
  matchStart: boolean;
  matchResult: boolean;
  drafts: boolean;
  refereeApproval: boolean;
};

const DEFAULTS: Prefs = {
  matchStart: true,
  matchResult: true,
  drafts: true,
  refereeApproval: true,
};

export function SettingsClient() {
  const router = useRouter();
  const qc = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const [prefs, setPrefs] = useState<Prefs>(DEFAULTS);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(PREFS_KEY);
      if (raw) setPrefs({ ...DEFAULTS, ...JSON.parse(raw) });
    } catch {
      /* ignore */
    }
  }, []);

  function update(k: keyof Prefs, v: boolean) {
    const next = { ...prefs, [k]: v };
    setPrefs(next);
    try {
      window.localStorage.setItem(PREFS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }

  return (
    <Page size="narrow">
      <PageTitle title="Nastavení" />

      <section className="mb-8">
        <SectionTitle>Účet</SectionTitle>
        <Card className="p-5">
          <p className="text-[13px] text-mu">Přihlášen jako</p>
          <p className="mt-0.5 text-[15px] font-medium text-wh">{user?.email}</p>
          <Link
            href="/muj-ucet"
            className="mt-3 inline-block text-[13px] font-semibold text-go hover:underline"
          >
            Můj účet →
          </Link>
        </Card>
      </section>

      <section className="mb-8">
        <SectionTitle>Oznámení</SectionTitle>
        <div className="space-y-2">
          <Switch
            checked={prefs.matchStart}
            onChange={(v) => update("matchStart", v)}
            label="Začátek zápasu"
            description="Upozornění při spuštění LIVE přenosu"
          />
          <Switch
            checked={prefs.matchResult}
            onChange={(v) => update("matchResult", v)}
            label="Výsledek zápasu"
            description="Po skončení zápasu"
          />
          <Switch
            checked={prefs.drafts}
            onChange={(v) => update("drafts", v)}
            label="Drafty"
            description="Nové draft nabídky"
          />
          <Switch
            checked={prefs.refereeApproval}
            onChange={(v) => update("refereeApproval", v)}
            label="Schválení rozhodčího"
            description="Změna stavu registrace"
          />
        </div>
        <p className="mt-2 text-[12px] text-di">
          Předvolby se ukládají v tomto prohlížeči. Push notifikace zasílá mobilní aplikace.
        </p>
      </section>

      <section className="mb-8">
        <SectionTitle>Data</SectionTitle>
        <Card className="p-5">
          <p className="text-[14px] text-wh">Vymazat mezipaměť</p>
          <p className="mt-0.5 text-[12px] text-mu">
            Vynutí opětovné načtení tabulky, zápasů a statistik ze serveru.
          </p>
          <Button
            variant="subtle"
            size="sm"
            className="mt-3"
            onClick={() => {
              qc.clear();
              toast.success("Hotovo", "Mezipaměť byla vymazána.");
            }}
          >
            <Trash2 size={14} />
            Vymazat
          </Button>
        </Card>
      </section>

      <section className="mb-8">
        <SectionTitle>Aplikace</SectionTitle>
        <Card className="divide-y divide-bd">
          <div className="flex items-center justify-between px-5 py-3.5">
            <span className="text-[14px] text-wh">Verze webu</span>
            <span className="text-[13px] text-mu">1.0.0</span>
          </div>
          <Link
            href="/ochrana-osobnich-udaju"
            className="flex items-center justify-between px-5 py-3.5 text-[14px] text-wh transition-colors hover:bg-c2/60"
          >
            Ochrana osobních údajů
            <span className="text-di">→</span>
          </Link>
          <Link
            href="/podminky"
            className="flex items-center justify-between px-5 py-3.5 text-[14px] text-wh transition-colors hover:bg-c2/60"
          >
            Podmínky použití
            <span className="text-di">→</span>
          </Link>
        </Card>
      </section>

      <Button
        variant="outline"
        className="w-full border-red/50 text-red hover:bg-red/10"
        onClick={async () => {
          await logout();
          router.push("/");
        }}
      >
        <LogOut size={16} />
        Odhlásit se
      </Button>
    </Page>
  );
}
