"use client";

import clsx from "clsx";
import {
  ArrowLeft,
  CheckCircle2,
  ChevronRight,
  Copy,
  Flag,
  RotateCcw,
  Shield,
  User,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { errMsg, playersApi, refereesApi, seasonsApi, teamsApi } from "@/lib/api";
import {
  collectErrors,
  validateAbbr,
  validateBankAccount,
  validateBankCode,
  validateBirthNo,
  validateBirthdate,
  validateJersey,
  validateName,
  validatePhone,
  validateZip,
  type Errors,
} from "@/lib/validation";
import type { Team } from "@/lib/types";
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
import { BirthdatePicker } from "@/components/ui/birthdate";
import { TeamBadge } from "@/components/ui/data";
import { toast } from "@/components/ui/toast";

/**
 * Registrace po krocích.
 *
 * Přepsáno 10. 9. 2026 podle `fsl-onboarding-audit-2026-09-10.md`. Tři věci
 * z toho auditu určují, jak je tenhle soubor postavený — kdo je zruší,
 * vrátí přesně ty problémy, které testování našlo:
 *
 *  1. **Data drží tahle komponenta, ne kroky.** Dřív měl každý krok vlastní
 *     `useState`, takže návrat zpět komponentu odmontoval a vyplněné údaje
 *     zmizely. Krok zpět proto neexistoval — bylo jen „zpět na výběr role".
 *     Kroky dnes dostávají `data` a `set` a nic si nedrží.
 *  2. **Krok je v URL (`?krok=`).** Bez toho neexistuje pro prohlížeč:
 *     tlačítko Zpět odnavigovalo z registrace a refresh začínal od nuly.
 *  3. **Rozdělaná registrace se ukládá do `localStorage`.** Mobil to má
 *     (`utils/draftRegistration.ts`), web to neměl vůbec.
 *
 * Chyby se hlásí **u polí**, ne toastem: `firstError` vracel jen první
 * chybu a toast po 5,2 s zmizel, takže se člověk se třemi prázdnými poli
 * dozvěděl jednu a nevěděl kde. `collectErrors` vrací mapu pole → chyba.
 */

type Role = "player" | "manager" | "referee";

/** Slug kroku. Je součástí URL, takže se nepřejmenovává bezdůvodně. */
type Krok =
  | "role"
  | "kod"
  | "jmeno"
  | "dres"
  | "doplnky"
  | "tym"
  | "vzhled"
  | "ja"
  | "osobni"
  | "vyplata"
  | "kontrola"
  | "hotovo";

/** Pořadí kroků v každé roli. „role" a „hotovo" se do postupu nepočítají. */
const POSTUP: Record<Role, Krok[]> = {
  player: ["kod", "jmeno", "dres", "doplnky"],
  manager: ["tym", "vzhled", "ja"],
  referee: ["osobni", "vyplata", "kontrola"],
};

const NADPISY: Record<Krok, { titul: string; popis?: string }> = {
  role: { titul: "Vítej v FSL", popis: "Kdo jsi?" },
  kod: { titul: "Pozvánkový kód", popis: "Dostaneš ho od vedoucího svého týmu." },
  jmeno: { titul: "Jak se jmenuješ?", popis: "Pod tímhle jménem tě uvidí liga. Hrát smí jen od 18 let." },
  dres: { titul: "Číslo a pozice", popis: "Číslo dresu musí být v týmu volné." },
  doplnky: { titul: "Ještě něco?", popis: "Všechno tady je volitelné — jde to doplnit později." },
  tym: { titul: "Nový tým", popis: "Začneme názvem. Zbytek za chvíli." },
  vzhled: { titul: "Jak má tým vypadat?", popis: "Volitelné. Doplnit se to dá kdykoli." },
  ja: { titul: "Ty jako hráč", popis: "Vedoucí je zároveň hráč týmu." },
  osobni: { titul: "Osobní údaje", popis: "Jméno, pod kterým budeš pískat." },
  vyplata: { titul: "Údaje pro výplatu", popis: "Za odpískaný zápas chodí odměna převodem." },
  kontrola: { titul: "Kontrola", popis: "Projdi si, co se odešle." },
  hotovo: { titul: "Hotovo", popis: undefined },
};

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
    desc: "Máš kód od vedoucího? Zadáš ho a jsi na soupisce. Tým zatím nemáš? Založíš si profil a nabídneš se v draftu.",
    badge: "S kódem i bez kódu",
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

const TEAM_COLORS = [
  "#C9A140", "#8B5CF6", "#EF4444", "#3B82F6",
  "#10B981", "#F59E0B", "#EC4899", "#FFFFFF",
];

/** Všechna textová pole registrace na jednom místě. */
type Data = {
  // hráč
  firstName: string;
  lastName: string;
  jersey: string;
  position: string;
  phone: string;
  birthdate: string;
  // tým
  name: string;
  abbr: string;
  color: string;
  venue: string;
  // vedoucí jako hráč
  mFirstName: string;
  mLastName: string;
  mJersey: string;
  mBirthdate: string;
  // rozhodčí
  rFirstName: string;
  rLastName: string;
  rPhone: string;
  birthNo: string;
  address: string;
  city: string;
  zip: string;
  bankAccount: string;
  bankCode: string;
};

const PRAZDNA: Data = {
  firstName: "", lastName: "", jersey: "", position: "Útočník", phone: "", birthdate: "",
  name: "", abbr: "", color: "#C9A140", venue: "",
  mFirstName: "", mLastName: "", mJersey: "", mBirthdate: "",
  rFirstName: "", rLastName: "", rPhone: "",
  birthNo: "", address: "", city: "", zip: "", bankAccount: "", bankCode: "",
};

/* ---------------- Rozdělaná registrace ---------------- */

const ULOZISTE = "fsl_registrace_v1";
/** Starší než den se neobnovuje — ceník i pravidla se mezitím mohly změnit. */
const PLATNOST_MS = 24 * 60 * 60 * 1000;

type Ulozene = {
  role: Role | null;
  krok: Krok;
  data: Data;
  team: Team | null;
  inviteCode: string | null;
  ts: number;
};

/** Soubory (fotka, logo) se neukládají — `File` do `localStorage` nepatří. */
function uloz(s: Omit<Ulozene, "ts">) {
  try {
    localStorage.setItem(ULOZISTE, JSON.stringify({ ...s, ts: Date.now() }));
  } catch {
    /* privátní okno nebo zakázané úložiště — registrace funguje dál, jen se
       neobnoví po refreshi */
  }
}

function precti(): Ulozene | null {
  try {
    const raw = localStorage.getItem(ULOZISTE);
    if (!raw) return null;
    const s = JSON.parse(raw) as Ulozene;
    if (!s?.ts || Date.now() - s.ts > PLATNOST_MS) return null;
    return { ...s, data: { ...PRAZDNA, ...s.data } };
  } catch {
    return null;
  }
}

function zapomen() {
  try {
    localStorage.removeItem(ULOZISTE);
  } catch {
    /* nic */
  }
}

function vek(ts: number) {
  const min = Math.round((Date.now() - ts) / 60000);
  if (min < 2) return "právě teď";
  if (min < 60) return `před ${min} min`;
  const h = Math.round(min / 60);
  return h === 1 ? "před hodinou" : `před ${h} h`;
}

/* ================================================================== */

export function OnboardingClient() {
  const router = useRouter();
  const params = useSearchParams();
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const user = useAuthStore((s) => s.user);

  const next = params.get("next") || "/muj-ucet";
  const kodZOdkazu = (params.get("kod") ?? "").trim().toUpperCase();
  const krokZUrl = params.get("krok") as Krok | null;
  const roleZUrl = params.get("role") as Role | null;

  const [role, setRole] = useState<Role | null>(roleZUrl ?? (kodZOdkazu ? "player" : null));
  const [krok, setKrokState] = useState<Krok>(
    krokZUrl ?? (kodZOdkazu ? "kod" : "role"),
  );
  const [data, setData] = useState<Data>(PRAZDNA);
  const [errors, setErrors] = useState<Errors>({});
  const [team, setTeam] = useState<Team | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [logo, setLogo] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [obnoveno, setObnoveno] = useState<string | null>(null);

  const maHrace = !!user?.player;
  const maTym = !!user?.player?.teamId;
  const jeVedouci = (user?.manager?.length ?? 0) > 0;
  const jeRozhodci = !!user?.referee;
  const uzMaRoli = maHrace || jeVedouci || jeRozhodci;

  const dostupneRole = ROLES.filter((r) =>
    r.id === "player" ? !maHrace : r.id === "manager" ? !jeVedouci : !jeRozhodci,
  );

  /** Krok mění i adresu, aby fungovalo zpětné tlačítko prohlížeče a refresh. */
  const naKrok = useCallback(
    (k: Krok, r: Role | null = role) => {
      setKrokState(k);
      setErrors({});
      const q = new URLSearchParams(params.toString());
      q.set("krok", k);
      if (r) q.set("role", r);
      else q.delete("role");
      router.replace(`/registrace?${q.toString()}`, { scroll: false });
    },
    [params, role, router],
  );

  /* Obnovení rozdělané registrace. Jen jednou, při prvním vykreslení —
     kdo už roli má, nic neobnovuje (dostane HotovaRoleStep). */
  const obnovaProbehla = useRef(false);
  useEffect(() => {
    if (obnovaProbehla.current) return;
    obnovaProbehla.current = true;
    if (uzMaRoli) return;
    const s = precti();
    if (!s) return;
    setData(s.data);
    setTeam(s.team);
    setInviteCode(s.inviteCode);
    if (s.role) setRole(s.role);
    setObnoveno(vek(s.ts));
    // Kód z odkazu má přednost — člověk zrovna klikl na pozvánku.
    if (!krokZUrl && !kodZOdkazu && s.krok !== "hotovo") {
      naKrok(s.krok, s.role);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Uložení při každé změně. „hotovo" se neukládá — je dokončeno. */
  useEffect(() => {
    if (uzMaRoli || krok === "hotovo" || krok === "role") return;
    uloz({ role, krok, data, team, inviteCode });
  }, [role, krok, data, team, inviteCode, uzMaRoli]);

  /* URL je zdroj pravdy: zpětné tlačítko prohlížeče změní `?krok=`
     a tenhle efekt srovná stav komponenty. */
  useEffect(() => {
    if (krokZUrl && krokZUrl !== krok) setKrokState(krokZUrl);
    if (roleZUrl && roleZUrl !== role) setRole(roleZUrl);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [krokZUrl, roleZUrl]);

  const set = <K extends keyof Data>(k: K, v: Data[K]) => {
    setData((d) => ({ ...d, [k]: v }));
    // Chyba u pole zmizí, jakmile do něj člověk začne psát.
    setErrors((e) => (e[k] ? { ...e, [k]: "" } : e));
  };

  /** Ověří pole kroku; při chybě je vypíše u polí a vrátí `false`. */
  const zkontroluj = (checks: Record<string, string | null>) => {
    const e = collectErrors(checks);
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const poradi = useMemo(() => (role ? POSTUP[role] : []), [role]);
  const index = poradi.indexOf(krok);
  const celkem = poradi.length;

  function zpet() {
    if (index > 0) naKrok(poradi[index - 1]);
    else naKrok("role", null);
  }

  function zacniZnovu() {
    zapomen();
    setData(PRAZDNA);
    setTeam(null);
    setInviteCode(null);
    setPhoto(null);
    setLogo(null);
    setObnoveno(null);
    setRole(null);
    naKrok("role", null);
  }

  /* ---------- odeslání ---------- */

  async function odesliHrace() {
    setBusy(true);
    try {
      const res = await playersApi.create({
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        ...(data.jersey.trim() ? { jersey: Number(data.jersey) } : {}),
        position: data.position,
        phone: data.phone.trim() || undefined,
        birthdate: data.birthdate ? new Date(data.birthdate).toISOString() : undefined,
        ...(team
          ? { teamId: team.id, ...(inviteCode ? { inviteCode } : {}) }
          : { bezTymu: true }),
      });
      if (photo) {
        try {
          await playersApi.uploadPhoto(res.data.id, photo);
        } catch {
          toast.error("Fotka se nenahrála", "Profil je hotový, fotku zkus přidat v Můj profil.");
        }
      }
      zapomen();
      await refreshUser();
      naKrok("hotovo");
    } catch (e) {
      serverovaChyba(e, { jersey: ["JERSEY_TAKEN", "obsazen"] });
    } finally {
      setBusy(false);
    }
  }

  async function odesliTym() {
    setBusy(true);
    try {
      const dres = data.mJersey.trim() === "" ? undefined : Number(data.mJersey);
      const res = await teamsApi.create({
        name: data.name.trim(),
        abbr: data.abbr.trim().toUpperCase(),
        color: data.color,
        venue: data.venue.trim() || undefined,
        manager: {
          firstName: data.mFirstName.trim() || undefined,
          lastName: data.mLastName.trim() || undefined,
          jersey: dres,
          birthdate: new Date(data.mBirthdate).toISOString(),
        },
      });
      if (logo && res.data.team?.id) {
        try {
          await teamsApi.uploadLogo(res.data.team.id, logo);
        } catch {
          toast.error("Logo se nenahrálo", "Tým je založený, logo přidáš v nastavení týmu.");
        }
      }
      setInviteCode(res.data.inviteCode);
      zapomen();
      await refreshUser();
      naKrok("hotovo");
    } catch (e) {
      serverovaChyba(e, { abbr: ["abbr", "Zkratka"], name: ["název", "name"] });
    } finally {
      setBusy(false);
    }
  }

  async function odesliRozhodciho() {
    setBusy(true);
    try {
      await refereesApi.register({
        firstName: data.rFirstName,
        lastName: data.rLastName,
        phone: data.rPhone,
        birthNo: data.birthNo,
        address: data.address,
        city: data.city,
        zip: data.zip,
        bankAccount: data.bankAccount,
        bankCode: data.bankCode,
      });
      zapomen();
      await refreshUser();
      naKrok("hotovo");
    } catch (e) {
      serverovaChyba(e, {});
    } finally {
      setBusy(false);
    }
  }

  /**
   * Serverovou chybu ukáže u pole, kterého se týká. Dřív šlo všechno jako
   * `toast.error("Chyba", …)`, takže „Číslo dresu 10 je již obsazeno"
   * nesměrovalo nikam.
   */
  function serverovaChyba(e: unknown, mapa: Record<string, string[]>) {
    const zprava = errMsg(e);
    for (const [pole, klice] of Object.entries(mapa)) {
      if (klice.some((k) => zprava.toLowerCase().includes(k.toLowerCase()))) {
        setErrors({ [pole]: zprava });
        return;
      }
    }
    toast.error("Nepovedlo se", zprava);
  }

  /* ---------- už má roli ---------- */

  // Ochrana „tuhle roli už máš" musí platit na každém kroku, ne jen na
  // výběru role. Dřív ji vstup `?kod=` obcházel: startovní krok byl „kod",
  // takže člověk s hotovým profilem prošel celým formulářem znovu a teprve
  // `POST /players` vrátil 409.
  const rolUzMam =
    role === "player" ? maHrace : role === "manager" ? jeVedouci : role === "referee" ? jeRozhodci : false;

  if (uzMaRoli && (krok === "role" || rolUzMam)) {
    return (
      <Page size="narrow">
        <HotovaRoleStep
          maHrace={maHrace}
          maTym={maTym}
          jeVedouci={jeVedouci}
          jeRozhodci={jeRozhodci}
          kod={kodZOdkazu}
          dostupneRole={dostupneRole}
          onVyberRole={(id) => {
            setRole(id);
            naKrok(POSTUP[id][0], id);
          }}
          onPripojen={async () => {
            await refreshUser();
            router.push(next);
          }}
        />
      </Page>
    );
  }

  /* ---------- výběr role ---------- */

  if (krok === "role") {
    return (
      <Page size="narrow">
        <PageTitle title={NADPISY.role.titul} subtitle={NADPISY.role.popis} />
        {obnoveno ? (
          <ObnovenoBanner vek={obnoveno} onZnovu={zacniZnovu} />
        ) : null}
        <div className="space-y-3">
          {ROLES.map((r) => (
            <button
              key={r.id}
              onClick={() => {
                setRole(r.id);
                naKrok(POSTUP[r.id][0], r.id);
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
      </Page>
    );
  }

  /* ---------- hotovo ---------- */

  if (krok === "hotovo") {
    return (
      <Page size="narrow">
        <DoneStep role={role} inviteCode={inviteCode} maTym={!!team} onFinish={() => router.push(next)} />
      </Page>
    );
  }

  /* ---------- krok formuláře ---------- */

  const nadpis = NADPISY[krok];

  return (
    <Page size="narrow">
      <button
        onClick={zpet}
        className="mb-4 inline-flex cursor-pointer items-center gap-1.5 text-[13px] text-mu transition-colors hover:text-wh"
      >
        <ArrowLeft size={16} />
        {index > 0 ? "Zpět" : "Zpět na výběr role"}
      </button>

      <PageTitle
        title={nadpis.titul}
        subtitle={
          celkem ? (
            <>
              Krok {index + 1} ze {celkem}
              {nadpis.popis ? ` — ${nadpis.popis}` : ""}
            </>
          ) : (
            nadpis.popis
          )
        }
      />

      <Postup index={index} celkem={celkem} />

      {obnoveno ? <ObnovenoBanner vek={obnoveno} onZnovu={zacniZnovu} /> : null}

      {/* ── hráč: kód ── */}
      {krok === "kod" ? (
        <KodStep
          vychoziKod={kodZOdkazu}
          team={team}
          onTeam={setTeam}
          onDal={(t, kod) => {
            setTeam(t);
            setInviteCode(kod);
            naKrok("jmeno");
          }}
          onBezTymu={() => {
            setTeam(null);
            setInviteCode(null);
            naKrok("jmeno");
          }}
        />
      ) : null}

      {/* ── hráč: jméno ── */}
      {krok === "jmeno" ? (
        <Card className="space-y-4 p-6">
          {team ? (
            <p className="text-[13px] leading-6 text-mu">
              Tým: <span className="font-semibold text-go">{team.name}</span>
            </p>
          ) : (
            <p className="text-[13px] leading-6 text-mu">
              Tým zatím nemáš — po dokončení se nabídneš v draftu.
            </p>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Jméno" required error={errors.firstName}>
              <Input
                value={data.firstName}
                onChange={(e) => set("firstName", e.target.value)}
                onBlur={() =>
                  setErrors((p) => ({
                    ...p,
                    firstName: validateName(data.firstName, "Jméno") ?? "",
                  }))
                }
                placeholder="Tomáš"
                autoFocus
              />
            </Field>
            <Field label="Příjmení" required error={errors.lastName}>
              <Input
                value={data.lastName}
                onChange={(e) => set("lastName", e.target.value)}
                onBlur={() =>
                  setErrors((p) => ({
                    ...p,
                    lastName: validateName(data.lastName, "Příjmení") ?? "",
                  }))
                }
                placeholder="Novák"
              />
            </Field>
          </div>
          {/* Datum narození stojí tady, ne mezi volitelnými doplňky: bez něj
              se nedá ověřit věk a do soutěže smí jen dospělí. */}
          <Field label="Datum narození" required error={errors.birthdate}>
            <BirthdatePicker value={data.birthdate} onChange={(v) => set("birthdate", v)} />
          </Field>
          <p className="text-[12px] leading-5 text-di">
            Do FSL smí jen hráči od 18 let.
          </p>
          <Button
            className="w-full"
            onClick={() => {
              if (
                zkontroluj({
                  firstName: validateName(data.firstName, "Jméno"),
                  lastName: validateName(data.lastName, "Příjmení"),
                  birthdate: validateBirthdate(data.birthdate),
                })
              ) {
                naKrok("dres");
              }
            }}
          >
            Pokračovat
          </Button>
        </Card>
      ) : null}

      {/* ── hráč: dres a pozice ── */}
      {krok === "dres" ? (
        <Card className="space-y-4 p-6">
          <Field
            label="Číslo dresu"
            required={!!team}
            error={errors.jersey}
          >
            <Input
              value={data.jersey}
              onChange={(e) => set("jersey", e.target.value.replace(/\D/g, "").slice(0, 2))}
              inputMode="numeric"
              placeholder="10"
              autoFocus
            />
          </Field>
          {!team ? (
            <p className="text-[12px] leading-5 text-di">
              Bez týmu je číslo volitelné — čísla se hlídají v rámci týmu. Až
              tě někdo draftuje, doplníš si ho v profilu.
            </p>
          ) : null}
          <Field label="Pozice">
            <div className="flex flex-wrap gap-2">
              {POSITIONS.map((p) => (
                <Chip key={p} active={data.position === p} onClick={() => set("position", p)}>
                  {p}
                </Chip>
              ))}
            </div>
          </Field>
          <Button
            className="w-full"
            onClick={() => {
              if (
                zkontroluj({
                  jersey: data.jersey.trim()
                    ? validateJersey(data.jersey)
                    : team
                      ? "Číslo dresu je povinné, když vstupuješ do týmu."
                      : null,
                })
              ) {
                naKrok("doplnky");
              }
            }}
          >
            Pokračovat
          </Button>
        </Card>
      ) : null}

      {/* ── hráč: volitelné doplňky ── */}
      {krok === "doplnky" ? (
        <Card className="space-y-4 p-6">
          <Field label="Profilová fotka">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              className="block w-full text-[13px] text-mu file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-c2 file:px-3 file:py-2 file:text-[13px] file:text-wh"
            />
          </Field>
          <Field label="Telefon" error={errors.phone}>
            <Input
              value={data.phone}
              onChange={(e) => set("phone", e.target.value)}
              onBlur={() =>
                setErrors((p) => ({ ...p, phone: validatePhone(data.phone) ?? "" }))
              }
              placeholder="+420 601 234 567"
            />
          </Field>
          <Button
            className="w-full"
            loading={busy}
            onClick={() => {
              if (zkontroluj({ phone: validatePhone(data.phone) })) {
                void odesliHrace();
              }
            }}
          >
            Dokončit
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            disabled={busy}
            onClick={() => {
              // Datum narození se schválně nemaže — je povinné a vyplňuje
              // se o krok dřív. Přeskakují se jen fotka a telefon.
              setPhoto(null);
              set("phone", "");
              void odesliHrace();
            }}
          >
            Přeskočit a dokončit
          </Button>
        </Card>
      ) : null}

      {/* ── vedoucí: tým ── */}
      {krok === "tym" ? (
        <Card className="space-y-4 p-6">
          <div className="flex items-center gap-4">
            <TeamBadge abbr={data.abbr || "TM"} color={data.color} size={56} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-[16px] font-bold text-wh">
                {data.name || "Název týmu"}
              </p>
              <SezonaRadek />
            </div>
          </div>
          <Field label="Název týmu" required error={errors.name}>
            <Input
              value={data.name}
              onChange={(e) => set("name", e.target.value)}
              onBlur={() =>
                setErrors((p) => ({
                  ...p,
                  name: data.name.trim() ? "" : "Název týmu je povinný.",
                }))
              }
              placeholder="Benavidez Eagles"
              autoFocus
            />
          </Field>
          <Field label="Zkratka (max 3 znaky)" required error={errors.abbr}>
            <Input
              value={data.abbr}
              onChange={(e) => set("abbr", e.target.value.toUpperCase().slice(0, 3))}
              onBlur={() => setErrors((p) => ({ ...p, abbr: validateAbbr(data.abbr) ?? "" }))}
              maxLength={3}
              placeholder="BE"
            />
          </Field>
          <p className="rounded-lg border border-bd bg-c2/40 px-3 py-2 text-[12px] leading-5 text-mu">
            Divizi a konferenci přiděluje supervisor při rozlosování — proto si ji
            tady nevybíráš.
          </p>
          <Button
            className="w-full"
            onClick={() => {
              if (
                zkontroluj({
                  name: data.name.trim() ? null : "Název týmu je povinný.",
                  abbr: validateAbbr(data.abbr),
                })
              ) {
                naKrok("vzhled");
              }
            }}
          >
            Pokračovat
          </Button>
        </Card>
      ) : null}

      {/* ── vedoucí: vzhled ── */}
      {krok === "vzhled" ? (
        <Card className="space-y-4 p-6">
          <div className="flex items-center gap-4">
            <TeamBadge abbr={data.abbr || "TM"} color={data.color} size={56} />
            <p className="truncate text-[16px] font-bold text-wh">{data.name}</p>
          </div>
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
                    data.color === c && "ring-2 ring-white ring-offset-2 ring-offset-c1",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </Field>
          <Field label="Logo týmu">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLogo(e.target.files?.[0] ?? null)}
              className="block w-full text-[13px] text-mu file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-c2 file:px-3 file:py-2 file:text-[13px] file:text-wh"
            />
          </Field>
          <Field label="Domácí hřiště">
            <Input
              value={data.venue}
              onChange={(e) => set("venue", e.target.value)}
              placeholder="Hala Sparta"
            />
          </Field>
          <Button className="w-full" onClick={() => naKrok("ja")}>
            Pokračovat
          </Button>
        </Card>
      ) : null}

      {/* ── vedoucí: já jako hráč ── */}
      {krok === "ja" ? (
        <Card className="space-y-4 p-6">
          {/* Profil vzniká s týmem, protože licence i balíčky startů visí na
              hráči, ne na týmu — bez profilu by vedoucí po zaplacení
              registrace nezaplatil nic dalšího. */}
          <p className="text-[13px] leading-6 text-mu">
            Jako vedoucí jsi zároveň hráč týmu. Profil ti založíme rovnou, ať
            můžeš zaplatit registraci i balíček startů najednou. Údaje si pak
            kdykoli upravíš.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Jméno" error={errors.mFirstName}>
              <Input
                value={data.mFirstName}
                onChange={(e) => set("mFirstName", e.target.value)}
                placeholder="Jakub"
                autoFocus
              />
            </Field>
            <Field label="Příjmení" error={errors.mLastName}>
              <Input
                value={data.mLastName}
                onChange={(e) => set("mLastName", e.target.value)}
                placeholder="Tabášek"
              />
            </Field>
          </div>
          <Field label="Číslo dresu" error={errors.mJersey}>
            <Input
              value={data.mJersey}
              onChange={(e) => set("mJersey", e.target.value.replace(/\D/g, "").slice(0, 2))}
              inputMode="numeric"
              placeholder="volitelné"
            />
          </Field>
          {/* Vedoucí je zároveň hráč, takže pro něj platí stejná věková
              hranice. Jméno se dá odvodit z e-mailu, datum narození ne. */}
          <Field label="Datum narození" required error={errors.mBirthdate}>
            <BirthdatePicker value={data.mBirthdate} onChange={(v) => set("mBirthdate", v)} />
          </Field>
          <p className="text-[12px] leading-5 text-di">
            Jméno nechat prázdné jde — doplníme ho z tvého e-mailu a upravíš si
            ho v profilu. Datum narození je povinné: do FSL smí jen od 18 let.
          </p>
          <Button
            className="w-full"
            loading={busy}
            onClick={() => {
              if (
                zkontroluj({
                  mJersey: validateJersey(data.mJersey),
                  mBirthdate: validateBirthdate(data.mBirthdate),
                })
              ) {
                void odesliTym();
              }
            }}
          >
            Vytvořit tým
          </Button>
        </Card>
      ) : null}

      {/* ── rozhodčí: osobní údaje ── */}
      {krok === "osobni" ? (
        <Card className="space-y-4 p-6">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Jméno" required error={errors.rFirstName}>
              <Input
                value={data.rFirstName}
                onChange={(e) => set("rFirstName", e.target.value)}
                placeholder="Jan"
                autoFocus
              />
            </Field>
            <Field label="Příjmení" required error={errors.rLastName}>
              <Input
                value={data.rLastName}
                onChange={(e) => set("rLastName", e.target.value)}
                placeholder="Procházka"
              />
            </Field>
          </div>
          <Field label="Telefon" error={errors.rPhone}>
            <Input
              value={data.rPhone}
              onChange={(e) => set("rPhone", e.target.value)}
              placeholder="+420 601 234 567"
            />
          </Field>
          <Button
            className="w-full"
            onClick={() => {
              if (
                zkontroluj({
                  rFirstName: validateName(data.rFirstName, "Jméno"),
                  rLastName: validateName(data.rLastName, "Příjmení"),
                  rPhone: validatePhone(data.rPhone),
                })
              ) {
                naKrok("vyplata");
              }
            }}
          >
            Pokračovat
          </Button>
        </Card>
      ) : null}

      {/* ── rozhodčí: výplata ── */}
      {krok === "vyplata" ? (
        <Card className="space-y-4 p-6">
          <div className="rounded-xl border border-blue/30 bg-blue/10 p-4 text-[13px] leading-6 text-mu">
            <strong className="text-wh">Proč potřebujeme bankovní účet?</strong> Za každý
            odpískaný zápas dostaneš odměnu, kterou posíláme převodem. Údaje vidí
            pouze supervisor ligy.
          </div>
          <Field label="Rodné číslo" required error={errors.birthNo}>
            <Input
              value={data.birthNo}
              onChange={(e) => set("birthNo", e.target.value)}
              placeholder="950615/1234"
            />
          </Field>
          <Field label="Ulice a číslo popisné" error={errors.address}>
            <Input
              value={data.address}
              onChange={(e) => set("address", e.target.value)}
              placeholder="Vinohradská 12"
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <Field label="Město" error={errors.city}>
              <Input value={data.city} onChange={(e) => set("city", e.target.value)} placeholder="Praha" />
            </Field>
            <Field label="PSČ" error={errors.zip}>
              <Input
                value={data.zip}
                onChange={(e) => set("zip", e.target.value)}
                placeholder="13000"
                inputMode="numeric"
              />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <Field label="Číslo účtu" error={errors.bankAccount}>
              <Input
                value={data.bankAccount}
                onChange={(e) => set("bankAccount", e.target.value)}
                placeholder="192000145399"
                inputMode="numeric"
              />
            </Field>
            <Field label="Kód banky" error={errors.bankCode}>
              <Input
                value={data.bankCode}
                onChange={(e) => set("bankCode", e.target.value)}
                placeholder="0800"
                inputMode="numeric"
              />
            </Field>
          </div>
          <p className="text-[12px] text-di">
            Kód banky: ČS 0800 · KB 0100 · ČSOB 0300 · Fio 2010 · mBank 6210 · Air 3030
          </p>
          <Button
            className="w-full"
            onClick={() => {
              // Prázdné projde, zjevný překlep ne. Do 10. 9. 2026 se tyhle
              // údaje nevalidovaly vůbec, takže špatné číslo účtu se poznalo
              // teprve tím, že nepřišla odměna.
              //
              // Výjimkou je rodné číslo: od 11. 9. 2026 je povinné, protože
              // z něj plyne datum narození a pískat smí jen od 18 let.
              if (
                zkontroluj({
                  birthNo: validateBirthNo(data.birthNo),
                  zip: validateZip(data.zip),
                  bankAccount: validateBankAccount(data.bankAccount),
                  bankCode: validateBankCode(data.bankCode),
                })
              ) {
                naKrok("kontrola");
              }
            }}
          >
            Pokračovat
          </Button>
        </Card>
      ) : null}

      {/* ── rozhodčí: kontrola ── */}
      {krok === "kontrola" ? (
        <Card className="space-y-4 p-6">
          <dl className="divide-y divide-bd">
            {(
              [
                ["Jméno", `${data.rFirstName} ${data.rLastName}`.trim()],
                ["Telefon", data.rPhone],
                ["Rodné číslo", data.birthNo],
                ["Adresa", [data.address, data.city, data.zip].filter(Boolean).join(", ")],
                ["Účet", data.bankAccount ? `${data.bankAccount}/${data.bankCode}` : ""],
              ] as [string, string][]
            ).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-4 py-3">
                <dt className="text-[13px] text-mu">{k}</dt>
                <dd className="text-right text-[14px] text-wh">{v || "—"}</dd>
              </div>
            ))}
          </dl>
          {!data.bankAccount.trim() ? (
            <div className="rounded-xl border border-red/40 bg-red/10 p-4 text-[13px] leading-6 text-wh">
              Chybí číslo účtu. Registraci to nezastaví, ale bez něj ti supervisor
              nepošle odměnu za odpískané zápasy — doplnit si ho můžeš kdykoli
              v profilu rozhodčího.
            </div>
          ) : null}
          <div className="rounded-xl border border-go/30 bg-go-soft p-4 text-[13px] leading-6 text-mu">
            Po odeslání musí registraci schválit supervisor FSL. Dostaneš oznámení,
            jakmile bude vyřízena.
          </div>
          <Button className="w-full" loading={busy} onClick={() => void odesliRozhodciho()}>
            Odeslat registraci
          </Button>
        </Card>
      ) : null}
    </Page>
  );
}

/* ---------------- Ukazatel průběhu ---------------- */

function Postup({ index, celkem }: { index: number; celkem: number }) {
  if (celkem < 2) return null;
  return (
    <div className="mb-6 flex items-center gap-2">
      {Array.from({ length: celkem }, (_, i) => (
        <span
          key={i}
          className={clsx(
            "h-1.5 flex-1 rounded-full transition-colors",
            i <= index ? "bg-go" : "bg-c2",
          )}
        />
      ))}
    </div>
  );
}

/* ---------------- Obnovená rozdělaná registrace ---------------- */

function ObnovenoBanner({ vek, onZnovu }: { vek: string; onZnovu: () => void }) {
  return (
    <Card className="mb-5 flex flex-wrap items-center justify-between gap-3 border-go/40 bg-go-soft p-4">
      <p className="text-[13px] leading-6 text-wh">
        Pokračuješ v registraci, kterou jsi rozdělal <strong>{vek}</strong>.
      </p>
      <Button variant="ghost" size="sm" onClick={onZnovu}>
        <RotateCcw size={14} /> Začít znovu
      </Button>
    </Card>
  );
}

/* ---------------- Sezóna, do které se tým hlásí ---------------- */

function SezonaRadek() {
  const [sezona, setSezona] = useState<string | null>(null);
  const [selhalo, setSelhalo] = useState(false);

  // Tým se hlásí vždycky do sezóny, která zrovna běží — vybírat nejde nic.
  // Dřív se při selhání dotazu blok mlčky nevykreslil a vedoucí nevěděl,
  // do jaké sezóny tým hlásí.
  useEffect(() => {
    seasonsApi
      .list()
      .then((res) => setSezona(res.data.current ?? null))
      .catch(() => setSelhalo(true));
  }, []);

  if (sezona) return <p className="text-[12px] text-mu">Sezóna {sezona}</p>;
  if (selhalo)
    return (
      <p className="text-[12px] text-amber">
        Sezónu se nepovedlo zjistit — tým se založí do té, která běží.
      </p>
    );
  return <p className="text-[12px] text-di">Nový tým</p>;
}

/* ---------------- Uživatel, který roli už má ---------------- */

function HotovaRoleStep({
  maHrace,
  maTym,
  jeVedouci,
  jeRozhodci,
  kod,
  dostupneRole,
  onVyberRole,
  onPripojen,
}: {
  maHrace: boolean;
  maTym: boolean;
  jeVedouci: boolean;
  jeRozhodci: boolean;
  kod: string;
  dostupneRole: typeof ROLES;
  onVyberRole: (id: Role) => void;
  onPripojen: () => void;
}) {
  const [code, setCode] = useState(kod);
  const [jersey, setJersey] = useState("");
  const [chybaKod, setChybaKod] = useState("");
  const [chybaDres, setChybaDres] = useState("");
  const [busy, setBusy] = useState(false);

  async function pripoj() {
    const clean = code.trim().toUpperCase();
    if (!clean) return setChybaKod("Zadej pozvánkový kód.");
    const chyba = validateJersey(jersey);
    if (chyba) return setChybaDres(chyba);
    setChybaKod("");
    setChybaDres("");
    setBusy(true);
    try {
      // Dřív se `jersey` neposílal vůbec, takže backend vzal číslo
      // z profilu — a když bylo v cílovém týmu obsazené, vrátil „vyber si
      // jiné" na obrazovce, kde žádné pole pro dres nebylo. Hráč z draftu
      // má navíc číslo 0, které je obsazené v každém týmu s brankářem
      // s nulou, takže to nebyl okrajový případ.
      const res = await playersApi.join(
        clean,
        jersey.trim() === "" ? undefined : Number(jersey),
      );
      toast.success("Jsi v týmu", `Vítej v týmu ${res.data.team.name}.`);
      onPripojen();
    } catch (e) {
      const zprava = errMsg(e);
      if (/dres|obsazen/i.test(zprava)) setChybaDres(zprava);
      else setChybaKod(zprava);
    } finally {
      setBusy(false);
    }
  }

  const role = [
    maHrace ? "hráč" : null,
    jeVedouci ? "vedoucí týmu" : null,
    jeRozhodci ? "rozhodčí" : null,
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <PageTitle
        title="Registraci už máš za sebou"
        subtitle={`V lize jsi vedený jako ${role}.`}
      />

      {maHrace && !maTym ? (
        <Card className="mb-4 space-y-4 p-6">
          <div>
            <p className="text-[16px] font-bold text-wh">Nejsi v žádném týmu</p>
            <p className="mt-1 text-[13px] leading-6 text-mu">
              Máš pozvánkový kód od vedoucího? Zadej ho tady a naskočíš na
              soupisku. Profil ani statistiky o nic nepřijdou. Kód nemáš?{" "}
              <a href="/draft" className="text-go hover:underline">
                Nabídni se v draftu
              </a>
              .
            </p>
          </div>
          <Field label="Pozvánkový kód" error={chybaKod}>
            <Input
              value={code}
              onChange={(e) => {
                setCode(e.target.value.toUpperCase());
                setChybaKod("");
              }}
              onKeyDown={(e) => e.key === "Enter" && pripoj()}
              placeholder="FSL-TM-XXXX"
              className="text-center text-[18px] font-bold tracking-[0.25em]"
            />
          </Field>
          <Field label="Číslo dresu v novém týmu" error={chybaDres}>
            <Input
              value={jersey}
              onChange={(e) => {
                setJersey(e.target.value.replace(/\D/g, "").slice(0, 2));
                setChybaDres("");
              }}
              inputMode="numeric"
              placeholder="nechat svoje"
            />
          </Field>
          <p className="text-[12px] leading-5 text-di">
            Nech prázdné, pokud chceš zůstat u svého čísla. Když je v novém týmu
            obsazené, vyber si tady jiné.
          </p>
          <Button className="w-full" onClick={pripoj} loading={busy} disabled={!code.trim()}>
            Připojit se k týmu
          </Button>
        </Card>
      ) : null}

      {dostupneRole.length ? (
        <div className="mb-4 space-y-3">
          <p className="text-[13px] font-semibold uppercase tracking-wide text-di">
            Můžeš si přidat další roli
          </p>
          {dostupneRole.map((r) => (
            <button
              key={r.id}
              onClick={() => onVyberRole(r.id)}
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
                </span>
                <ChevronRight size={18} className="mt-1 shrink-0 text-di" />
              </div>
            </button>
          ))}
        </div>
      ) : null}

      <Card className="space-y-3 p-6">
        <p className="text-[13px] leading-6 text-mu">
          {maTym
            ? "Soupisku, platby i statistiky najdeš ve svém účtu."
            : "Ve svém účtu najdeš platby, profil a nastavení."}
        </p>
        <div className="flex flex-col gap-2">
          <LinkButton href="/muj-ucet">Můj účet</LinkButton>
          <LinkButton href="/platby" variant="outline">
            Platby a licence
          </LinkButton>
        </div>
      </Card>
    </>
  );
}

/* ---------------- Hráč: pozvánkový kód ---------------- */

function KodStep({
  vychoziKod,
  team,
  onTeam,
  onDal,
  onBezTymu,
}: {
  vychoziKod?: string;
  team: Team | null;
  onTeam: (t: Team | null) => void;
  onDal: (t: Team, kod: string) => void;
  /** Hráč, který kód nemá a nemůže mít — jde rovnou do draft poolu. */
  onBezTymu: () => void;
}) {
  const [code, setCode] = useState(vychoziKod ?? "");
  const [chyba, setChyba] = useState("");
  const [busy, setBusy] = useState(false);

  const verify = useCallback(
    async (rawKod?: string) => {
      // Skutečný kód je FSL-ZKRATKA-XXXX, tedy 10+ znaků.
      const clean = (rawKod ?? code).trim().toUpperCase();
      if (clean.length < 10 || !clean.startsWith("FSL-")) {
        setChyba("Kód má formát FSL-TM-XXXX.");
        return;
      }
      setChyba("");
      setBusy(true);
      try {
        const res = await teamsApi.join(clean);
        onTeam(res.data.team);
      } catch (e) {
        setChyba(errMsg(e));
      } finally {
        setBusy(false);
      }
    },
    [code, onTeam],
  );

  // Kód z pozvánkového odkazu ověříme rovnou, ať uživatel nic nepřepisuje
  useEffect(() => {
    if (vychoziKod && vychoziKod.length >= 10) void verify(vychoziKod);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vychoziKod]);

  if (team) {
    return (
      <>
        <Card
          className="mb-5 flex items-center gap-4 p-5"
          style={{ borderColor: team.color ?? undefined }}
        >
          <TeamBadge abbr={team.abbr} color={team.color} size={56} />
          <div>
            <p className="text-[17px] font-bold text-wh">{team.name}</p>
            {/* Nový tým divizi nemá — dostane ji od supervisora při rozlosování */}
            <p className="text-[13px] text-mu">{team.division ?? "Divizi přidělí supervisor"}</p>
          </div>
        </Card>
        {team.regStatus === "PENDING" || team.regStatus === "APPEALING" ? (
          <Card className="mb-5 border-go/40 bg-go-soft p-4">
            <p className="text-[13px] leading-6 text-wh">
              Tenhle tým ještě čeká na schválení supervisorem. Na soupisku se zapsat
              můžeš, zápasy se ale rozlosují až po schválení.
            </p>
          </Card>
        ) : null}
        <div className="flex flex-col gap-2">
          <Button onClick={() => onDal(team, code.trim().toUpperCase())}>
            Ano, pokračovat
          </Button>
          <Button variant="ghost" onClick={() => onTeam(null)}>
            Zadat jiný kód
          </Button>
        </div>
      </>
    );
  }

  return (
    <>
      <Card className="p-6">
        <Field label="Kód" required error={chyba}>
          <Input
            value={code}
            onChange={(e) => {
              setCode(e.target.value.toUpperCase());
              setChyba("");
            }}
            onKeyDown={(e) => e.key === "Enter" && verify()}
            placeholder="FSL-TM-XXXX"
            maxLength={12}
            autoCapitalize="characters"
            autoFocus
            className="text-center text-[20px] font-bold tracking-[0.3em]"
          />
        </Field>
        <Button
          className="mt-5 w-full"
          onClick={() => verify()}
          loading={busy}
          disabled={!code.trim()}
        >
          Ověřit kód
        </Button>
      </Card>

      {/* Bez tohohle východu byla obrazovka slepá ulička: kdo do ligy přichází
          sám a žádný tým nezná, kód nemá odkud vzít — a přitom je pro něj draft
          jediná cesta dovnitř. */}
      <Card className="mt-4 p-5">
        <p className="text-[15px] font-bold text-wh">Kód nemáš?</p>
        <p className="mt-1 text-[13px] leading-6 text-mu">
          Založ si profil bez týmu a nabídni se v draftu. Vedoucí tě uvidí mezi
          volnými hráči a můžou ti poslat nabídku. Číslo dresu si vybereš, až
          budeš v týmu.
        </p>
        <Button variant="outline" className="mt-4 w-full" onClick={onBezTymu}>
          Chci do draftu
        </Button>
      </Card>
    </>
  );
}

/* ---------------- Hotovo ---------------- */

function DoneStep({
  role,
  inviteCode,
  maTym,
  onFinish,
}: {
  role: Role | null;
  inviteCode: string | null;
  /** Hráč bez týmu jde do draftu, ne na soupisku. */
  maTym: boolean;
  onFinish: () => void;
}) {
  const subtitle =
    role === "manager"
      ? "Tvůj tým je zaregistrovaný ve FSL."
      : role === "referee"
        ? "Tvoje registrace rozhodčího čeká na schválení supervisorem."
        : maTym
          ? "Jsi teď součástí týmu."
          : "Profil máš hotový. Ještě se nabídni v draftu, ať tě vedoucí uvidí.";

  // Hráč bez týmu dřív skončil `router.push("/draft")` bez jakéhokoli
  // potvrzení — obrazovku „Registrace dokončena" nikdy neviděl, kdežto
  // hráč s týmem ano.
  const next =
    role === "manager"
      ? [
          { label: "Pozvánkový kód", href: "/tym/pozvanka" },
          { label: "Soupiska týmu", href: "/tym/soupiska" },
          { label: "Zaplatit registraci", href: "/platby" },
        ]
      : role === "referee"
        ? [{ label: "Můj profil rozhodčího", href: "/rozhodci/profil" }]
        : maTym
          ? [
              { label: "Zaplatit licenci", href: "/platby" },
              { label: "Můj účet", href: "/muj-ucet" },
            ]
          : [
              { label: "Nabídnout se v draftu", href: "/draft/profil" },
              { label: "Zaplatit licenci", href: "/platby" },
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
              // Bez optional chaining to v HTTP kontextu a starších in-app
              // prohlížečích spadlo ještě před hláškou, takže klik neudělal nic.
              if (!navigator.clipboard) {
                toast.error("Nejde zkopírovat", "Kód označ a zkopíruj ručně.");
                return;
              }
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
