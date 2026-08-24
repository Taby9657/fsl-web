"use client";

import clsx from "clsx";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Copy,
  Flag,
  Shield,
  User,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { errMsg, playersApi, refereesApi, teamsApi } from "@/lib/api";
import { firstError, validateAbbr, validateName, validatePhone, validateJersey } from "@/lib/validation";
import type { TeamLite } from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { Page } from "@/components/layout/container";
import {
  Button,
  Card,
  Chip,
  Field,
  Input,
  LinkButton,
  PageTitle,
} from "@/components/ui/primitives";
import { TeamBadge } from "@/components/ui/data";
import { toast } from "@/components/ui/toast";

type Role = "player" | "manager" | "referee";
type Step = "role" | "player-code" | "player-info" | "manager" | "referee" | "done";

const ROLES: {
  id: Role;
  icon: React.ReactNode;
  title: string;
  desc: string;
  badge: string;
  color: string;
}[] = [
  {
    id: "player",
    icon: <User size={22} />,
    title: "Jsem hráč",
    desc: "Vedoucí týmu ti pošle pozvánkový kód. Zadáš ho tady a okamžitě jsi na soupisce.",
    badge: "Potřebuješ kód od vedoucího",
    color: "#C9A140",
  },
  {
    id: "manager",
    icon: <Shield size={22} />,
    title: "Jsem vedoucí týmu",
    desc: "Vytvoříš tým, spravuješ soupisku, odesíláš sestavy před zápasem a platíš licence.",
    badge: "Plná správa týmu",
    color: "#8B5CF6",
  },
  {
    id: "referee",
    icon: <Flag size={22} />,
    title: "Chci být rozhodčí",
    desc: "Vyplníš osobní údaje a bankovní spojení pro výplatu odměn. Supervisor tě do 48 h schválí.",
    badge: "Čeká na schválení supervisorem",
    color: "#3B82F6",
  },
];

const POSITIONS = ["Útočník", "Obránce", "Brankář"];

export function OnboardingClient() {
  const router = useRouter();
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const [step, setStep] = useState<Step>("role");
  const [role, setRole] = useState<Role | null>(null);
  const [team, setTeam] = useState<TeamLite | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  return (
    <Page size="narrow">
      {step !== "role" && step !== "done" ? (
        <button
          onClick={() => setStep("role")}
          className="mb-4 inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-mu transition-colors hover:text-wh"
        >
          <ArrowLeft size={16} /> Zpět na výběr role
        </button>
      ) : null}

      {step === "role" ? (
        <>
          <PageTitle title="Vítej v FSL" subtitle="Kdo jsi?" />
          <div className="space-y-3">
            {ROLES.map((r) => (
              <button
                key={r.id}
                onClick={() => {
                  setRole(r.id);
                  setStep(
                    r.id === "player" ? "player-code" : r.id === "manager" ? "manager" : "referee",
                  );
                }}
                className="w-full cursor-pointer rounded-xl border border-bd bg-c1 p-5 text-left transition-colors hover:border-bd-strong hover:bg-c2/60"
                style={{ borderLeft: `4px solid ${r.color}` }}
              >
                <div className="flex items-start gap-4">
                  <span
                    className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                    style={{ backgroundColor: `${r.color}22`, color: r.color }}
                  >
                    {r.icon}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[17px] font-bold text-wh">{r.title}</span>
                    <span className="mt-1 block text-[13px] leading-6 text-mu">{r.desc}</span>
                    <span
                      className="mt-2 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold"
                      style={{ backgroundColor: `${r.color}20`, color: r.color }}
                    >
                      {r.badge}
                    </span>
                  </span>
                  <ChevronRight size={18} className="mt-1 shrink-0 text-di" />
                </div>
              </button>
            ))}
          </div>
        </>
      ) : null}

      {step === "player-code" ? (
        <PlayerCodeStep
          onJoined={(t) => {
            setTeam(t);
            setStep("player-info");
          }}
        />
      ) : null}

      {step === "player-info" && team ? (
        <PlayerInfoStep
          team={team}
          onDone={async () => {
            await refreshUser();
            setStep("done");
          }}
        />
      ) : null}

      {step === "manager" ? (
        <ManagerStep
          onDone={async (code) => {
            setInviteCode(code);
            await refreshUser();
            setStep("done");
          }}
        />
      ) : null}

      {step === "referee" ? (
        <RefereeStep
          onDone={async () => {
            await refreshUser();
            setStep("done");
          }}
        />
      ) : null}

      {step === "done" ? (
        <DoneStep role={role} inviteCode={inviteCode} onFinish={() => router.push("/muj-ucet")} />
      ) : null}
    </Page>
  );
}

/* ---------------- Hráč: pozvánkový kód ---------------- */

function PlayerCodeStep({ onJoined }: { onJoined: (t: TeamLite) => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [team, setTeam] = useState<TeamLite | null>(null);

  async function verify() {
    const clean = code.trim().toUpperCase();
    if (clean.length < 6) {
      toast.error("Zadej platný kód", "Kód má formát FSL-TM-XXXX.");
      return;
    }
    setBusy(true);
    try {
      const res = await teamsApi.join(clean);
      setTeam(res.data.team);
    } catch (e) {
      toast.error("Neplatný kód", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  if (team) {
    return (
      <>
        <PageTitle title="Připojuješ se k tomuto týmu?" />
        <Card
          className="mb-5 flex items-center gap-4 p-5"
          style={{ borderColor: team.color ?? undefined }}
        >
          <TeamBadge abbr={team.abbr} color={team.color} size={56} />
          <div>
            <p className="text-[17px] font-bold text-wh">{team.name}</p>
            <p className="text-[13px] text-mu">{team.division}</p>
          </div>
        </Card>
        <div className="flex flex-col gap-2">
          <Button onClick={() => onJoined(team)}>Ano, pokračovat</Button>
          <Button variant="ghost" onClick={() => setTeam(null)}>
            Zadat jiný kód
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <PageTitle
        title="Pozvánkový kód"
        subtitle="Dostaneš ho od vedoucího svého týmu."
      />
      <Card className="p-6">
        <Field label="Kód" required>
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && verify()}
            placeholder="FSL-TM-XXXX"
            maxLength={12}
            autoCapitalize="characters"
            className="text-center text-[20px] font-bold tracking-[0.3em]"
          />
        </Field>
        <Button className="mt-5 w-full" onClick={verify} loading={busy} disabled={!code.trim()}>
          Ověřit kód
        </Button>
      </Card>
    </>
  );
}

/* ---------------- Hráč: profil ---------------- */

function PlayerInfoStep({ team, onDone }: { team: TeamLite; onDone: () => void }) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    jersey: "",
    position: "Útočník",
    phone: "",
    birthdate: "",
  });
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    const err = firstError([
      validateName(form.firstName, "Jméno"),
      validateName(form.lastName, "Příjmení"),
      form.jersey.trim() ? validateJersey(form.jersey) : "Číslo dresu je povinné.",
      validatePhone(form.phone),
    ]);
    if (err) {
      toast.error("Vyplň povinné údaje", err);
      return;
    }
    setBusy(true);
    try {
      const res = await playersApi.create({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        jersey: Number(form.jersey),
        position: form.position,
        phone: form.phone.trim() || undefined,
        birthdate: form.birthdate ? new Date(form.birthdate).toISOString() : undefined,
        teamId: team.id,
      });
      if (photo) {
        await playersApi.uploadPhoto(res.data.id, photo).catch(() => {});
      }
      onDone();
    } catch (e) {
      toast.error("Chyba", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle
        title="Tvůj profil"
        subtitle={
          <>
            Tým: <span className="font-semibold text-go">{team.name}</span>
          </>
        }
      />
      <Card className="space-y-4 p-6">
        <Field label="Profilová fotka">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
            className="block w-full text-[13px] text-mu file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-c2 file:px-3 file:py-2 file:text-[13px] file:text-wh"
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Jméno" required>
            <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="Tomáš" />
          </Field>
          <Field label="Příjmení" required>
            <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Novák" />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Číslo dresu" required>
            <Input
              value={form.jersey}
              onChange={(e) => set("jersey", e.target.value.replace(/\D/g, "").slice(0, 2))}
              inputMode="numeric"
              placeholder="10"
            />
          </Field>
          <Field label="Telefon">
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+420 601 234 567" />
          </Field>
        </div>
        <Field label="Pozice">
          <div className="flex flex-wrap gap-2">
            {POSITIONS.map((p) => (
              <Chip key={p} active={form.position === p} onClick={() => set("position", p)}>
                {p}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Datum narození">
          <Input type="date" value={form.birthdate} onChange={(e) => set("birthdate", e.target.value)} max={new Date().toISOString().slice(0, 10)} />
        </Field>
        <Button className="w-full" onClick={submit} loading={busy}>
          Dokončit registraci
        </Button>
      </Card>
    </>
  );
}

/* ---------------- Vedoucí: nový tým ---------------- */

const TEAM_COLORS = [
  "#C9A140", "#8B5CF6", "#EF4444", "#3B82F6",
  "#10B981", "#F59E0B", "#EC4899", "#FFFFFF",
];
const DIVISIONS = ["Divize A", "Divize B", "Divize C"];

function ManagerStep({ onDone }: { onDone: (code: string) => void }) {
  const [form, setForm] = useState({
    name: "",
    abbr: "",
    color: "#C9A140",
    division: "Divize A",
    venue: "",
  });
  const [logo, setLogo] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    const err = firstError([
      form.name.trim() ? null : "Název týmu je povinný.",
      validateAbbr(form.abbr),
    ]);
    if (err) {
      toast.error("Vyplň povinné údaje", err);
      return;
    }
    setBusy(true);
    try {
      const res = await teamsApi.create({
        name: form.name.trim(),
        abbr: form.abbr.trim().toUpperCase(),
        color: form.color,
        division: form.division,
        venue: form.venue.trim() || undefined,
      });
      if (logo && res.data.team?.id) {
        await teamsApi.uploadLogo(res.data.team.id, logo).catch(() => {});
      }
      onDone(res.data.inviteCode);
    } catch (e) {
      toast.error("Chyba", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle title="Nový tým" subtitle="Vyplň základní informace o tvém týmu." />
      <Card className="space-y-4 p-6">
        <div className="flex items-center gap-4">
          <TeamBadge abbr={form.abbr || "TM"} color={form.color} size={56} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[16px] font-bold text-wh">
              {form.name || "Název týmu"}
            </p>
            <p className="text-[12px] text-mu">{form.division}</p>
          </div>
        </div>

        <Field label="Logo týmu">
          <input
            type="file"
            accept="image/*"
            onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
            className="block w-full text-[13px] text-mu file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-c2 file:px-3 file:py-2 file:text-[13px] file:text-wh"
          />
        </Field>

        <Field label="Název týmu" required>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Benavidez Eagles" />
        </Field>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Zkratka (max 3 znaky)" required>
            <Input
              value={form.abbr}
              onChange={(e) => set("abbr", e.target.value.toUpperCase().slice(0, 3))}
              maxLength={3}
              placeholder="BE"
            />
          </Field>
          <Field label="Domácí hřiště">
            <Input value={form.venue} onChange={(e) => set("venue", e.target.value)} placeholder="Hala Sparta" />
          </Field>
        </div>

        <Field label="Divize">
          <div className="flex flex-wrap gap-2">
            {DIVISIONS.map((d) => (
              <Chip key={d} active={form.division === d} onClick={() => set("division", d)}>
                {d}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="Barva týmu">
          <div className="flex flex-wrap gap-2.5">
            {TEAM_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set("color", c)}
                aria-label={c}
                className={clsx(
                  "h-9 w-9 cursor-pointer rounded-full transition-transform",
                  form.color === c && "ring-2 ring-white ring-offset-2 ring-offset-c1",
                )}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </Field>

        <Button className="w-full" onClick={submit} loading={busy}>
          Vytvořit tým
        </Button>
      </Card>
    </>
  );
}

/* ---------------- Rozhodčí ---------------- */

function RefereeStep({ onDone }: { onDone: () => void }) {
  const [sub, setSub] = useState(1);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    birthNo: "",
    address: "",
    city: "",
    zip: "",
    bankAccount: "",
    bankCode: "",
  });
  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit() {
    setBusy(true);
    try {
      await refereesApi.register(form);
      onDone();
    } catch (e) {
      toast.error("Chyba", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle
        title="Registrace rozhodčího"
        subtitle={`Krok ${sub} ze 3 — ${sub === 1 ? "osobní údaje" : sub === 2 ? "údaje pro výplatu" : "kontrola"}`}
      />

      <div className="mb-6 flex items-center gap-2">
        {[1, 2, 3].map((i) => (
          <span
            key={i}
            className={clsx(
              "h-1.5 flex-1 rounded-full transition-colors",
              i <= sub ? "bg-go" : "bg-c2",
            )}
          />
        ))}
      </div>

      <Card className="space-y-4 p-6">
        {sub === 1 ? (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Jméno" required>
                <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} placeholder="Jan" />
              </Field>
              <Field label="Příjmení" required>
                <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} placeholder="Procházka" />
              </Field>
            </div>
            <Field label="Telefon">
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+420 601 234 567" />
            </Field>
            <Button
              className="w-full"
              onClick={() => {
                const err = firstError([
                  validateName(form.firstName, "Jméno"),
                  validateName(form.lastName, "Příjmení"),
                  validatePhone(form.phone),
                ]);
                if (err) return toast.error("Vyplň jméno a příjmení", err);
                setSub(2);
              }}
            >
              Pokračovat
            </Button>
          </>
        ) : sub === 2 ? (
          <>
            <div className="rounded-xl border border-blue/30 bg-blue/10 p-4 text-[13px] leading-6 text-mu">
              <strong className="text-wh">Proč potřebujeme bankovní účet?</strong> Za každý
              odřízený zápas dostaneš odměnu, kterou posíláme převodem. Údaje vidí pouze
              supervisor ligy.
            </div>
            <Field label="Rodné číslo">
              <Input value={form.birthNo} onChange={(e) => set("birthNo", e.target.value)} placeholder="950615/1234" />
            </Field>
            <Field label="Ulice a číslo popisné">
              <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Vinohradská 12" />
            </Field>
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <Field label="Město">
                <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Praha" />
              </Field>
              <Field label="PSČ">
                <Input value={form.zip} onChange={(e) => set("zip", e.target.value)} placeholder="12000" inputMode="numeric" />
              </Field>
            </div>
            <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
              <Field label="Číslo účtu">
                <Input value={form.bankAccount} onChange={(e) => set("bankAccount", e.target.value)} placeholder="192000145399" inputMode="numeric" />
              </Field>
              <Field label="Kód banky">
                <Input value={form.bankCode} onChange={(e) => set("bankCode", e.target.value)} placeholder="0800" inputMode="numeric" />
              </Field>
            </div>
            <p className="text-[12px] text-di">
              Kód banky: ČS 0800 · KB 0100 · ČSOB 0300 · Fio 2010 · mBank 6210 · Air 3030
            </p>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setSub(1)}>
                Zpět
              </Button>
              <Button className="flex-1" onClick={() => setSub(3)}>
                Pokračovat
              </Button>
            </div>
          </>
        ) : (
          <>
            <dl className="divide-y divide-bd">
              {(
                [
                  ["Jméno", `${form.firstName} ${form.lastName}`.trim()],
                  ["Telefon", form.phone],
                  ["Rodné číslo", form.birthNo],
                  ["Adresa", [form.address, form.city, form.zip].filter(Boolean).join(", ")],
                  ["Účet", form.bankAccount ? `${form.bankAccount}/${form.bankCode}` : ""],
                ] as [string, string][]
              ).map(([k, v]) => (
                <div key={k} className="flex items-center justify-between gap-4 py-3">
                  <dt className="text-[13px] text-mu">{k}</dt>
                  <dd className="text-right text-[14px] text-wh">{v || "—"}</dd>
                </div>
              ))}
            </dl>
            <div className="rounded-xl border border-go/30 bg-go-soft p-4 text-[13px] leading-6 text-mu">
              Po odeslání musí registraci schválit supervisor FSL. Dostaneš oznámení, jakmile
              bude vyřízena.
            </div>
            <div className="flex gap-2">
              <Button variant="ghost" className="flex-1" onClick={() => setSub(2)} disabled={busy}>
                Zpět
              </Button>
              <Button className="flex-1" onClick={submit} loading={busy}>
                Odeslat registraci
              </Button>
            </div>
          </>
        )}
      </Card>
    </>
  );
}

/* ---------------- Hotovo ---------------- */

function DoneStep({
  role,
  inviteCode,
  onFinish,
}: {
  role: Role | null;
  inviteCode: string | null;
  onFinish: () => void;
}) {
  const subtitle =
    role === "manager"
      ? "Tvůj tým je zaregistrovaný ve FSL."
      : role === "referee"
        ? "Tvoje registrace rozhodčího čeká na schválení supervisorem."
        : "Jsi teď součástí týmu.";

  const next =
    role === "manager"
      ? [
          { label: "Pozvánkový kód", href: "/tym/pozvanka" },
          { label: "Soupiska týmu", href: "/tym/soupiska" },
          { label: "Zaplatit registraci", href: "/platby" },
        ]
      : role === "referee"
        ? [{ label: "Můj profil rozhodčího", href: "/rozhodci/profil" }]
        : [
            { label: "Zaplatit licenci", href: "/platby" },
            { label: "Můj účet", href: "/muj-ucet" },
          ];

  return (
    <div className="py-6 text-center">
      <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green/15 text-green">
        <CheckCircle2 size={40} />
      </span>
      <h1 className="mt-6 text-2xl font-bold text-wh">Registrace dokončena!</h1>
      <p className="mt-2 text-[15px] text-mu">{subtitle}</p>

      {inviteCode ? (
        <Card className="mx-auto mt-6 max-w-sm p-6">
          <p className="text-[11px] font-semibold label-caps uppercase text-mu">
            Pozvánkový kód
          </p>
          <p className="mt-2 select-all text-2xl font-black tracking-[0.2em] text-go">
            {inviteCode}
          </p>
          <p className="mt-2 text-[12px] leading-5 text-di">
            Sdílej ho s hráči — zadají ho při registraci a připojí se k tvému týmu.
          </p>
          <Button
            variant="subtle"
            size="sm"
            className="mt-4"
            onClick={() => {
              void navigator.clipboard.writeText(inviteCode);
              toast.success("Kód zkopírován");
            }}
          >
            <Copy size={14} />
            Zkopírovat
          </Button>
        </Card>
      ) : null}

      <div className="mx-auto mt-6 flex max-w-sm flex-col gap-2">
        {next.map((n) => (
          <LinkButton key={n.href} href={n.href} variant="subtle">
            {n.label}
          </LinkButton>
        ))}
        <Button className="mt-2" onClick={onFinish}>
          Přejít do aplikace
        </Button>
      </div>
    </div>
  );
}
