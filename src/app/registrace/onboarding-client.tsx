"use client";

import clsx from "clsx";
import { ArrowLeft, CheckCircle2, Copy, RotateCcw } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  errMsg,
  onboardingApi,
  playersApi,
  refereesApi,
  requestsApi,
  seasonsApi,
  teamsApi,
} from "@/lib/api";
import {
  collectErrors,
  validateAbbr,
  validateBirthdate,
  validateJersey,
  validateName,
  validatePhone,
  type Errors,
} from "@/lib/validation";
import type { Team } from "@/lib/types";
import { SEZONA, rocnikPopis } from "@/lib/sezona";
import { useAuthStore } from "@/store/auth";
import {
  adresaKarty,
  NevimCoVybrat,
  ObsahKarty,
  ROLES,
  TRIDY_KARTY,
  type Krok,
  type Role,
} from "./role-karty";
import { Page } from "@/components/layout/container";
import {
  Button,
  Card,
  Chip,
  Field,
  Input,
  LinkButton,
  PageTitle,
  Spinner,
  Textarea,
} from "@/components/ui/primitives";
import { BirthdatePicker } from "@/components/ui/birthdate";
import { TeamBadge } from "@/components/ui/data";
import { TerminyPasek } from "@/components/terminy-pasek";
import {
  chybiPovinne,
  PRAZDNE_SOUHLASY,
  vypisSouhlasu,
  zaznamSouhlasu,
  type KlicSouhlasu,
  type Souhlasy,
} from "@/lib/souhlasy";
import { SouhlasyPole } from "@/components/souhlasy";
import { metaUdalost } from "@/components/meta-pixel";
import { maSouhlas } from "@/lib/souhlas-mereni";
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

/**
 * Náhodné id jednoho průchodu přihláškou (jen pro měření, viz efekt níž).
 *
 * `crypto.randomUUID` chybí v nezabezpečeném kontextu (http bez TLS), kde by
 * jinak spadlo celé vykreslení kvůli měření — proto ta náhrada. Formát musí
 * projít kontrolou na backendu: šestnáct až šedesát čtyři znaků [0-9a-f-].
 */
function noveIdNavstevy(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2, 14)}`;
}


/** Pořadí kroků v každé roli. „role" a „hotovo" se do postupu nepočítají. */
const POSTUP: Record<Role, Krok[]> = {
  player: ["kod", "jmeno", "dres", "doplnky"],
  manager: ["tym", "vzhled", "ja"],
  referee: ["osobni", "kontrola"],
};

/**
 * Hráč bez týmu má kratší cestu — viz `fsl-trychtyr-registrace-2026-09-16.md`.
 *
 * Do 16. 9. 2026 začínala role „hráč" vždycky krokem „kod". Kdo přišel
 * z reklamy, žádný pozvánkový kód neměl (jinak by ho zval vedoucí a reklamu
 * nepotřeboval) a první, co po něm web chtěl, bylo pole, které nemohl
 * vyplnit — úniková cesta „Chci do draftu" byla až pod ním. Ze 14 lidí,
 * kteří na přihlášku došli, ji dokončil jeden.
 *
 * Krok „dres" tady chybí schválně: číslo dresu se hlídá v rámci týmu, takže
 * bez týmu nemá co vyplňovat, a pozice se přesunula mezi doplňky. Zbývají
 * dva kroky — jméno s datem narození a nepovinné doplňky.
 */
const POSTUP_BEZ_TYMU: Krok[] = ["jmeno", "doplnky", "draft"];

/**
 * Krok z adresy ani z rozdělané registrace se nebere na slovo.
 *
 * `?krok=` se dřív jen přetypoval, takže neznámá hodnota vykreslila prázdnou
 * stránku. Od zrušení kroku „vyplata" (přihláška rozhodčího je jen základní
 * profil) na něj navíc míří staré odkazy i uložené rozdělané registrace.
 */
function platnaRole(r: string | null | undefined): Role | null {
  return r === "player" || r === "manager" || r === "referee" ? r : null;
}

function platnyKrok(k: string | null | undefined, r: Role | null): Krok | null {
  if (!k) return null;
  if (k === "role" || k === "hotovo") return k;
  if (!r) return null;
  // Krok „draft" je jen v cestě hráče bez týmu, takže v `POSTUP` schválně
  // není — jinak by ho dostal i hráč s pozvánkovým kódem, který do draftu
  // nejde. Proto se prohledávají obě cesty.
  const znamy = [
    ...((POSTUP[r] as string[] | undefined) ?? []),
    ...(r === "player" ? (POSTUP_BEZ_TYMU as string[]) : []),
  ];
  return znamy.includes(k) ? (k as Krok) : null;
}

const NADPISY: Record<Krok, { titul: string; popis?: string }> = {
  // „Přihláška do ligy", ne „registrace": účet se zakládá na /prihlaseni
  // a člověk si ta dvě slova plete. Tohle je krok do soutěže.
  role: {
    titul: "Přihláška do ligy",
    popis: "Účet už máš. Teď řekni, kdo jsi — a přihlásíme tě do soutěže.",
  },
  kod: { titul: "Pozvánkový kód", popis: "Dostaneš ho od vedoucího svého týmu." },
  jmeno: { titul: "Jak se jmenuješ?", popis: "Pod tímhle jménem tě uvidí liga. Hrát smí jen od 18 let." },
  dres: { titul: "Číslo a pozice", popis: "Číslo dresu musí být v týmu volné." },
  doplnky: {
    titul: "Ještě něco?",
    popis: "Fotka a telefon jsou volitelné. Souhlasy pod nimi ne.",
  },
  draft: {
    titul: "Čím zaujmeš",
    popis: "Nepovinné — ale vedoucí si vybírají právě podle tohohle.",
  },
  tym: { titul: "Nový tým", popis: "Začneme názvem. Zbytek za chvíli." },
  vzhled: { titul: "Jak má tým vypadat?", popis: "Volitelné. Doplnit se to dá kdykoli." },
  ja: { titul: "Ty jako hráč", popis: "Vedoucí je zároveň hráč týmu." },
  osobni: { titul: "Osobní údaje", popis: "Jméno, pod kterým budeš pískat." },
  kontrola: { titul: "Kontrola", popis: "Projdi si, co se odešle." },
  hotovo: { titul: "Hotovo", popis: undefined },
};

/**
 * Karty na výběru role. `klic` je unikátní (role „player" má dvě karty),
 * `start` říká, kterým krokem karta začíná, a `bezTymu` zkracuje postup.
 *
 * Pořadí není náhodné: „Nemám tým" je první, protože přesně ten člověk
 * chodí z propagace.
 */
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
  // draft (jen hráč bez týmu)
  bio: string;
  pubSkill: string;
  // tým
  name: string;
  abbr: string;
  color: string;
  // vedoucí jako hráč
  mFirstName: string;
  mLastName: string;
  mJersey: string;
  mBirthdate: string;
  // rozhodčí
  rFirstName: string;
  rLastName: string;
  rPhone: string;
  rBirthdate: string;
};

const PRAZDNA: Data = {
  firstName: "", lastName: "", jersey: "", position: "Útočník", phone: "", birthdate: "",
  bio: "", pubSkill: "",
  name: "", abbr: "", color: "#C9A140",
  mFirstName: "", mLastName: "", mJersey: "", mBirthdate: "",
  rFirstName: "", rLastName: "", rPhone: "", rBirthdate: "",
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
  /** Cesta bez týmu. Bez uložení by refresh vrátil člověka na krok s kódem,
      který nikdy neviděl, a ukazatel postupu by počítal do čtyř. */
  bezTymu?: boolean;
  /** Zaškrtnutá políčka souhlasů. Ukládají se ze stejného důvodu jako
      zbytek formuláře: cesta k účtu vede přes /prihlaseni a člověk se sem
      vrací. Není to předzaškrtnutí — je to jeho vlastní zaškrtnutí, které
      po návratu nezmizí. Znění se mezitím změnit nemůže, protože starší
      než den se rozdělaná přihláška neobnovuje vůbec. */
  souhlasy?: Souhlasy;
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
  // Dokud se nedopočítá přihlášení, nevykresluje se nic: jinak by člověk,
  // který roli už má, na okamžik uviděl výběr role. Bez tokenu je hotovo
  // hned a bez síťového volání, takže návštěvník z reklamy nečeká.
  const loadingAuth = useAuthStore((s) => s.loading);

  const next = params.get("next") || "/muj-ucet";
  const kodZOdkazu = (params.get("kod") ?? "").trim().toUpperCase();
  const krokZUrl = params.get("krok") as Krok | null;
  // Role z adresy se stejně jako krok **nebere na slovo**. Přetypování tu
  // dřív stačilo na to, aby `?role=cokoliv` shodilo celou komponentu na
  // `POSTUP[role].includes` — a od chvíle, kdy stránku vykresluje server,
  // by po tom pádu zůstala prázdná stránka, tedy přesně ten stav, kvůli
  // kterému se výběr role předělával.
  const roleZUrl = platnaRole(params.get("role"));

  const [role, setRole] = useState<Role | null>(roleZUrl ?? (kodZOdkazu ? "player" : null));
  const [krok, setKrokState] = useState<Krok>(
    platnyKrok(krokZUrl, roleZUrl) ?? (kodZOdkazu ? "kod" : "role"),
  );
  const [data, setData] = useState<Data>(PRAZDNA);
  const [errors, setErrors] = useState<Errors>({});
  const [team, setTeam] = useState<Team | null>(null);
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  // `bezTymu` umí přijít i z adresy: na tom stojí odkazy ze serverové verze
  // výběru role. Bez toho by hráč bez týmu spadl do čtyřkrokové cesty — přesně
  // ta netěsnost, kvůli které se přihláška 16. 9. předělávala.
  const [bezTymu, setBezTymu] = useState(params.get("bezTymu") === "1");
  const [souhlasy, setSouhlasy] = useState<Souhlasy>(PRAZDNE_SOUHLASY);
  /** Povinné souhlasy, které chyběly při posledním pokusu o odeslání. */
  const [chybiSouhlas, setChybiSouhlas] = useState<KlicSouhlasu[]>([]);
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
    (k: Krok, r: Role | null = role, bt: boolean = bezTymu) => {
      setKrokState(k);
      setErrors({});
      const q = new URLSearchParams(params.toString());
      q.set("krok", k);
      if (r) q.set("role", r);
      else q.delete("role");
      // `bezTymu` se z adresy při startu čte, takže v ní nesmí zůstat viset
      // po tom, co se cesta změní. Jinak refresh bez rozdělané registrace
      // obnoví zkrácenou cestu u kroku, který do ní nepatří. Bez role nemá
      // co dělat v adrese vůbec — na výběru role žádná cesta neběží.
      if (bt && r) q.set("bezTymu", "1");
      else q.delete("bezTymu");
      router.replace(`/registrace?${q.toString()}`, { scroll: false });
    },
    [params, role, bezTymu, router],
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
    setBezTymu(!!s.bezTymu);
    if (s.souhlasy) setSouhlasy({ ...PRAZDNE_SOUHLASY, ...s.souhlasy });
    if (s.role) setRole(s.role);
    setObnoveno(vek(s.ts));
    // Kód z odkazu má přednost — člověk zrovna klikl na pozvánku.
    if (!krokZUrl && !kodZOdkazu && s.krok !== "hotovo") {
      // Uložený krok, který už neexistuje, vrátí člověka na začátek jeho role
      // — ne na prázdnou stránku.
      naKrok(platnyKrok(s.krok, s.role) ?? (s.role ? POSTUP[s.role][0] : "role"), s.role);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* Uložení při každé změně. „hotovo" se neukládá — je dokončeno. */
  useEffect(() => {
    if (uzMaRoli || krok === "hotovo" || krok === "role") return;
    uloz({ role, krok, data, team, inviteCode, bezTymu, souhlasy });
  }, [role, krok, data, team, inviteCode, bezTymu, souhlasy, uzMaRoli]);

  /* Měření trychtýře: kam lidé v přihlášce došli.

     Vzniklo 16. 9. 2026. Za 24 hodin otevřelo `/registrace` 192 lidí a
     neodeslal ji nikdo — a ze síťových logů bylo vidět, že na registrační
     cesty nepřišel jediný POST, takže nešlo o chybu, ale o odchod někde
     uvnitř formuláře. Kde, nebylo jak zjistit.

     Posílá se krok, role a `bezTymu`. **Nic vyplněného.** `navsteva` je
     náhodné id, které vzniká tady v paměti, do prohlížeče se neukládá
     a zavřením karty zaniká — nejde ho spojit s člověkem ani s příští
     návštěvou, a proto to není osobní údaj a nepotřebuje souhlas.

     Kdo už roli má, do trychtýře nepatří — vidí `HotovaRoleStep`, ne
     formulář. */
  const navsteva = useRef<string>("");
  useEffect(() => {
    if (uzMaRoli) return;
    if (!navsteva.current) navsteva.current = noveIdNavstevy();
    onboardingApi.krok({ navsteva: navsteva.current, role, krok, bezTymu });
  }, [role, krok, bezTymu, uzMaRoli]);

  /* Meta: stejná místa jako vlastní trychtýř výš, ale **jen dvě události**.

     Víc jich schválně není. Optimalizovat se dá jen na to, čeho je dost —
     při čtyřech registracích denně by se mezikroky formuláře rozdrobily na
     signál, ze kterého se Meta nemá jak učit, a zároveň by zaplevelily
     publika. `Lead` = vybral roli (rozhodl se, že to zkusí), 
     `CompleteRegistration` = dokončil.

     `metaUdalost` sama nic nepošle, když člověk odmítl souhlas na liště —
     tady se to proto neřeší podruhé.

     Každá událost jen jednou za průchod: mezi kroky se chodí i zpět
     a bez téhle pojistky by `Lead` odešel při každém návratu na formulář.

     ⚠️ `CompleteRegistration` odsud je **nespolehlivý** — po dokončení se
     stránka překresluje a odchozí požadavek pixelu se může přerušit. Přesně
     kvůli tomu posílá tutéž událost i backend přes Conversions API; obě nesou
     stejné `eventID`, takže si je Meta spáruje a započítá jednou. */
  const metaOdeslano = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (uzMaRoli || !role || krok === "role") return;
    const hotovo = krok === "hotovo";
    const klic = hotovo ? "hotovo" : "lead";
    if (metaOdeslano.current.has(klic)) return;
    metaOdeslano.current.add(klic);
    if (hotovo) {
      const eventId = `reg-${navsteva.current}`;
      metaUdalost(
        "CompleteRegistration",
        { content_category: role, status: true },
        eventId,
      );
      // Druhá, spolehlivější cesta té samé události — viz `metaKonverze`.
      if (maSouhlas()) {
        onboardingApi.metaKonverze({
          eventId,
          nazev: "CompleteRegistration",
          souhlas: true,
          url: window.location.href,
          role,
        });
      }
    } else {
      metaUdalost("Lead", { content_category: role });
    }
  }, [role, krok, uzMaRoli]);

  /* Druhá polovina měření: jak dlouho na kroku byl a jak z něj odešel.

     Samotný počet průchodů na krok nerozliší dvě úplně různé věci. 16. 9.
     došlo na výběr role 167 lidí a roli si vybralo 21 — a tahle čísla vypadají
     stejně, ať už těch 146 odešlo do dvou sekund (nechtěný proklik z reklamy,
     problém je v cílení), nebo si obrazovku přečetli a nekliknuli (problém je
     v obrazovce). Rozliší to čas, scroll a to, kam klik mířil.

     Že to nebylo pomalým načítáním, se ověřilo zvlášť: ping v efektu výš
     odchází až ve chvíli, kdy je stránka živá, takže kdo odešel dřív, se do
     těch 167 nezapočítal — a po opravě prázdné obrazovky (16:37) se poměr
     nezlepšil.

     Pořád **nic vyplněného**: jen čas, procento scrollu, výška okna a jedno
     slovo o odchodu. Platí všechno, co je u efektu výš.

     Odesílá se jednou za krok a backend navíc bere **první zprávu** — návrat
     z bfcache tedy naměřené čtení nepřepíše. */
  useEffect(() => {
    if (uzMaRoli) return;
    const id = navsteva.current;
    if (!id) return;

    const zacatek = Date.now();
    let odchod: "klik" | "jinam" | null = null;
    let poslano = false;

    /** Kam až se člověk dostal, v procentech. Stránka na jednu obrazovku = 100. */
    const procenta = () => {
      const kam = document.documentElement.scrollHeight - window.innerHeight;
      if (kam <= 0) return 100;
      return Math.max(0, Math.min(100, Math.round((window.scrollY / kam) * 100)));
    };
    let maxScroll = procenta();

    const priScrollu = () => {
      const p = procenta();
      if (p > maxScroll) maxScroll = p;
    };

    /* Karta role je od 16. 9. skutečný odkaz, takže klik na ni je celé
       přenačtení stránky a další krok dostane nové id průchodu. Kam ten klik
       mířil, se proto pozná **jenom tady**; ze záznamu dalšího průchodu už to
       zpětně dohledat nejde. */
    const priKliku = (e: MouseEvent) => {
      const cil = e.target;
      if (!(cil instanceof Element)) return;
      const odkaz = cil.closest("a[href]");
      if (!(odkaz instanceof HTMLAnchorElement)) return;
      odchod = odkaz.pathname.startsWith("/registrace") ? "klik" : "jinam";
    };

    const posli = (jak: "klik" | "jinam" | "zavrel") => {
      if (poslano) return;
      poslano = true;
      onboardingApi.konec({
        navsteva: id,
        krok,
        sekundy: Math.round((Date.now() - zacatek) / 1000),
        odchod: jak,
        scroll: maxScroll,
        vyskaOkna: window.innerHeight,
      });
    };

    const priOdchodu = () => posli(odchod ?? "zavrel");

    window.addEventListener("scroll", priScrollu, { passive: true });
    // Zachytávací fáze schválně: kliky na kartách a tlačítkách zastavuje
    // React dřív, než by bublina došla na `document`.
    document.addEventListener("click", priKliku, true);
    // `pagehide`, ne `beforeunload`: na mobilu je to jediná událost, která
    // spolehlivě přijde i při přepnutí aplikace nebo zavření karty.
    window.addEventListener("pagehide", priOdchodu);

    return () => {
      window.removeEventListener("scroll", priScrollu);
      document.removeEventListener("click", priKliku, true);
      window.removeEventListener("pagehide", priOdchodu);
      // Úklid bez odchodu ze stránky znamená, že se krok změnil uvnitř
      // přihlášky — tedy že člověk šel dál.
      posli(odchod ?? "klik");
    };
  }, [krok, uzMaRoli]);

  /* URL je zdroj pravdy: zpětné tlačítko prohlížeče změní `?krok=`
     a tenhle efekt srovná stav komponenty. */
  useEffect(() => {
    const zUrl = platnyKrok(krokZUrl, roleZUrl ?? role);
    if (zUrl && zUrl !== krok) setKrokState(zUrl);
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

  const poradi = useMemo(() => {
    if (!role) return [];
    // Zkrácená cesta platí jen na krocích, které do ní patří. Dřív tu stál
    // výčet výjimek („kromě kroku dres"), takže každý další krok mimo ni
    // spadl na index -1 a ukazatel psal „Krok 0 ze 2".
    if (role === "player" && bezTymu && (POSTUP_BEZ_TYMU as string[]).includes(krok)) {
      return POSTUP_BEZ_TYMU;
    }
    return POSTUP[role] ?? [];
  }, [role, bezTymu, krok]);
  const index = poradi.indexOf(krok);
  const celkem = poradi.length;

  function zpet() {
    if (index > 0) naKrok(poradi[index - 1]);
    else naKrok("role", null);
  }

  function zacniZnovu() {
    setBezTymu(false);
    setSouhlasy(PRAZDNE_SOUHLASY);
    setChybiSouhlas([]);
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

  /* ---------- účet až na konci ---------- */

  /**
   * Přihlášku smí od 15. 9. 2026 vyplnit i odhlášený návštěvník — stránka
   * není za `AuthGuard` (proč, viz `page.tsx`). Účet je pořád potřeba, jen
   * se o něj řekne až tady, při odeslání.
   *
   * Vrací `true`, když se o účet muselo říct — volající v tu chvíli končí
   * a nic neodesílá. Rozdělaná přihláška se ukládá do `localStorage`, krok
   * a role jdou do `next`, takže se člověk po založení účtu vrátí přesně
   * sem a vyplněné zůstane vyplněné.
   */
  const vyzadujUcet = useCallback(() => {
    if (user) return false;
    // `bezTymu` musí do uložení stejně jako zbytek stavu. Bez něj se hráč
    // bez týmu vrátil od zakládání účtu do čtyřkrokové cesty: ukazatel psal
    // „Krok 4 ze 4" místo „2 ze 2" a Zpět vedlo na krok s dresem, který
    // nikdy neviděl. Tenhle zápis je poslední před odchodem na /prihlaseni,
    // takže přebije i ten z automatického ukládání.
    uloz({ role, krok, data, team, inviteCode, bezTymu, souhlasy });
    const q = new URLSearchParams();
    q.set("krok", krok);
    if (role) q.set("role", role);
    const cil = `/registrace?${q.toString()}`;
    // `ucet=novy` přepne přihlašovací stránku rovnou na zakládání účtu:
    // kdo přišel z reklamy, účet skoro jistě nemá.
    router.push(`/prihlaseni?ucet=novy&next=${encodeURIComponent(cil)}`);
    return true;
  }, [user, role, krok, data, team, inviteCode, bezTymu, souhlasy, router]);

  /** Vysvětlení u odesílacího tlačítka, dokud člověk účet nemá. */
  const poznamkaUcet = user ? null : (
    <p className="text-[12px] leading-5 text-di">
      Účet zatím nemáš — po odeslání si ho založíš a přihláška se dokončí.
      Vyplněné údaje zůstanou uložené.
    </p>
  );

  /* ---------- souhlasy ---------- */

  const nastavSouhlas = (k: KlicSouhlasu, v: boolean) => {
    setSouhlasy((p) => ({ ...p, [k]: v }));
    setChybiSouhlas((p) => (v ? p.filter((x) => x !== k) : p));
  };

  /**
   * Hlídá jen povinné položky. Fotky a novinky zůstat nezaškrtnuté smí —
   * podmiňovat účast souhlasem je podle čl. 7 odst. 4 GDPR neplatné.
   */
  function overSouhlasy() {
    const chybi = chybiPovinne(souhlasy);
    setChybiSouhlas(chybi);
    return chybi.length === 0;
  }

  /**
   * Doložení souhlasu (čl. 7 odst. 1 GDPR: správce musí umět souhlas
   * doložit). Backend zatím u hráče pole pro souhlasy nemá, takže záznam
   * jde do žádostí — typ `REGISTRATION` a tělo začínající „SOUHLASY", aby
   * se dal v přehledu odfiltrovat. Je to náhradní řešení do doby, než to
   * `fsl-backhand` bude umět u profilu; zápis proto nikdy neblokuje ani
   * neshazuje přihlášku, která už prošla.
   */
  async function zapisSouhlasy(r: Role) {
    try {
      await requestsApi.create({
        type: "REGISTRATION",
        body: `${zaznamSouhlasu(r)}\n${vypisSouhlasu(souhlasy)}`,
        page: "/registrace",
      });
    } catch {
      /* záznam se nepovedl — přihláška je hotová a člověka to nesmí zdržet */
    }
  }

  /* ---------- odeslání ---------- */

  async function odesliHrace(vynechatDraft = false) {
    // Souhlasy se kontrolují dřív než účet: jinak by člověka přihláška
    // poslala zakládat účet a teprve po návratu mu řekla o zaškrtávátku.
    if (!overSouhlasy()) return;
    if (vyzadujUcet()) return;
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
          : {
              bezTymu: true,
              // Prázdné pole se schválně neposílá jako prázdný řetězec:
              // `upsert` v `draftPool` nechává `undefined` být, takže se tím
              // nepřepíše text, který v profilu případně už je.
              ...(vynechatDraft
                ? {}
                : {
                    bio: data.bio.trim() || undefined,
                    pubSkill: data.pubSkill.trim() || undefined,
                  }),
            }),
      });
      if (photo) {
        try {
          await playersApi.uploadPhoto(res.data.id, photo);
        } catch {
          toast.error("Fotka se nenahrála", "Profil je hotový, fotku zkus přidat v Můj profil.");
        }
      }
      void zapisSouhlasy("player");
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
    // Souhlasy se kontrolují dřív než účet: jinak by člověka přihláška
    // poslala zakládat účet a teprve po návratu mu řekla o zaškrtávátku.
    if (!overSouhlasy()) return;
    if (vyzadujUcet()) return;
    setBusy(true);
    try {
      const dres = data.mJersey.trim() === "" ? undefined : Number(data.mJersey);
      const res = await teamsApi.create({
        name: data.name.trim(),
        abbr: data.abbr.trim().toUpperCase(),
        color: data.color,
        // Halu tým nevyplňuje — shání ji liga a supervisor ji doplní
        // při rozlosování. Do 11. 9. 2026 se na ni registrace ptala,
        // což vedoucímu tvrdilo, že je to jeho starost.
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
      void zapisSouhlasy("manager");
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
    // Souhlasy se kontrolují dřív než účet: jinak by člověka přihláška
    // poslala zakládat účet a teprve po návratu mu řekla o zaškrtávátku.
    if (!overSouhlasy()) return;
    if (vyzadujUcet()) return;
    setBusy(true);
    try {
      await refereesApi.register({
        firstName: data.rFirstName,
        lastName: data.rLastName,
        phone: data.rPhone,
        birthdate: new Date(data.rBirthdate).toISOString(),
      });
      void zapisSouhlasy("referee");
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

  /* ---------- načítání přihlášení ---------- */

  if (loadingAuth) {
    return (
      <Page>
        <div className="flex justify-center py-24 text-go">
          <Spinner size={32} />
        </div>
      </Page>
    );
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
          onVyberRole={(karta) => {
            setRole(karta.id);
            setBezTymu(!!karta.bezTymu);
            naKrok(karta.start ?? POSTUP[karta.id][0], karta.id, !!karta.bezTymu);
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
      <Page size="narrow" className="text-center">
        {/* Bez podnadpisu — viz `page.tsx`. `NADPISY.role.popis` zůstává
            v mapě nadpisů kvůli ostatním krokům, tenhle krok ho nebere.
            Eyebrow s ročníkem musí sedět se serverovou náhradou v `page.tsx`,
            jinak text při oživení stránky poskočí. */}
        <PageTitle
          eyebrow={`Přihlášení do ${rocnikPopis()} · sezóna ${SEZONA.nazev}`}
          title={NADPISY.role.titul}
          center
        />
        {obnoveno ? (
          <ObnovenoBanner vek={obnoveno} onZnovu={zacniZnovu} />
        ) : null}
        {/* Nápověda nad kartami — viz `page.tsx`. */}
        <NevimCoVybrat className="mb-5" />
        <div className="space-y-3">
          {/* Karta je odkaz, ne tlačítko. Serverová verze v `page.tsx` vykresluje
              tytéž karty se stejným `href`, takže klik funguje i v tom prvním
              okamžiku, než se stránka oživí JavaScriptem. Tady `onClick` přebírá
              řízení a `preventDefault()` zabrání celému přenačtení stránky. */}
          {ROLES.map((r) => (
            <a
              key={r.klic}
              href={adresaKarty(r, params.toString())}
              onClick={(e) => {
                if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                setRole(r.id);
                setBezTymu(!!r.bezTymu);
                naKrok(r.start ?? POSTUP[r.id][0], r.id, !!r.bezTymu);
              }}
              className={TRIDY_KARTY}
            >
              <ObsahKarty r={r} />
            </a>
          ))}
        </div>
        {/* Termíny a věta o penězích jsou **pod kartami schválně**.

            Do 16. 9. večer byly nad nimi a měření ukázalo, proč to byla chyba:
            lidé na obrazovce stáli v mediánu 14 sekund a **medián scrollu byl
            nula** — dívali se na nadpis a tabulku termínů a odešli, aniž by se
            k volbě vůbec dostali. Na 667px displeji začínala první karta až na
            445. pixelu a zbylé tři byly mimo obrazovku.

            Informace se nezahazují, jen ustupují volbě: kdo se rozhoduje, má
            mít nejdřív z čeho vybírat. Věta o penězích zůstává hned pod kartami,
            protože odpovídá na nevyslovenou otázku „musím platit hned" — platí
            pro všechny čtyři cesty a je to konstatování, ne pobídka.

            Kdo tenhle blok vrátí nad karty, vrátí i tu nulu ve scrollu. */}
        <TerminyPasek className="mx-auto mt-6 max-w-md text-left" />
        <p className="mt-3 text-[13px] leading-6 text-mu">
          <strong className="font-semibold text-wh">V přihlášce se neplatí.</strong>{" "}
          Platba přijde na řadu až potom, ve tvém účtu.
        </p>
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
            setBezTymu(true);
            naKrok("jmeno", role, true);
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
              Tým zatím nemáš — dokončením přihlášky se rovnou nabídneš v draftu.
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
                autoComplete="given-name"
                placeholder="Jan"
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
                autoComplete="family-name"
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
                naKrok(bezTymu ? "doplnky" : "dres");
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
          {/* Bez týmu se sem stěhuje pozice z kroku „dres". Číslo dresu se
              hlídá v rámci týmu, takže volnému hráči nemá co nastavit —
              vybere si ho, až ho někdo draftuje. */}
          {!team ? (
            <Field label="Pozice">
              <div className="flex flex-wrap gap-2">
                {POSITIONS.map((pz) => (
                  <Chip key={pz} active={data.position === pz} onClick={() => set("position", pz)}>
                    {pz}
                  </Chip>
                ))}
              </div>
            </Field>
          ) : null}
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
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+420 601 234 567"
            />
          </Field>
          {/* Hráč bez týmu tady nekončí — pokračuje na krok „draft".

              Souhlasy a odeslání proto musí zůstat na **posledním** kroku
              každé cesty: `overSouhlasy()` zvýrazňuje chybějící zaškrtávátka,
              a kdyby zůstala o krok zpátky, člověk by po kliknutí na
              „Dokončit" neviděl vůbec nic a nevěděl by proč. */}
          {bezTymu ? (
            <>
              <Button
                className="w-full"
                onClick={() => {
                  if (zkontroluj({ phone: validatePhone(data.phone) })) naKrok("draft");
                }}
              >
                Pokračovat
              </Button>
              <Button
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setPhoto(null);
                  set("phone", "");
                  naKrok("draft");
                }}
              >
                Přeskočit
              </Button>
            </>
          ) : (
            <>
              <SouhlasyPole
                hodnoty={souhlasy}
                onZmena={nastavSouhlas}
                chybi={chybiSouhlas}
              />
              {poznamkaUcet}
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
            </>
          )}
        </Card>
      ) : null}

      {/* ── hráč bez týmu: čím zaujme v draftu ── */}
      {krok === "draft" ? (
        <Card className="space-y-4 p-6">
          <Field label="O sobě">
            <Textarea
              value={data.bio}
              onChange={(e) => set("bio", e.target.value)}
              placeholder="Zkušenosti, styl hry, co hledáš…"
              className="min-h-[110px]"
            />
          </Field>
          <Field label="Pub skill / Selling point">
            <p className="mb-2 text-[12px] leading-5 text-di">
              Největší skill, trik nebo kontroverzní výrok. Čím víc osobitosti, tím líp.
            </p>
            <Textarea
              value={data.pubSkill}
              onChange={(e) => set("pubSkill", e.target.value)}
              placeholder="„Největší sekera v české florbalové historii“"
              className="min-h-[80px]"
            />
          </Field>
          {/* Video a další fotky až po dokončení, a není to kosmetika:
              nahrávají se na účet, který v tuhle chvíli ještě nemusí
              existovat, a kdyby se soubor vybral teď, přesměrování na
              přihlášení (u Googlu dokonce pryč z webu) by ho z paměti
              smazalo. Soubory se do rozdělané registrace neukládají. */}
          <p className="text-[12px] leading-5 text-di">
            Video a další fotky přidáš hned po dokončení, na svém profilu v draftu.
          </p>
          <SouhlasyPole
            hodnoty={souhlasy}
            onZmena={nastavSouhlas}
            chybi={chybiSouhlas}
          />
          {poznamkaUcet}
          <Button className="w-full" loading={busy} onClick={() => void odesliHrace()}>
            Dokončit
          </Button>
          <Button
            variant="ghost"
            className="w-full"
            disabled={busy}
            onClick={() => void odesliHrace(true)}
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
            Jako vedoucí jsi zároveň hráč týmu. Profil ti založíme rovnou,
            údaje si pak kdykoli upravíš.
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Jméno" error={errors.mFirstName}>
              <Input
                value={data.mFirstName}
                onChange={(e) => set("mFirstName", e.target.value)}
                autoComplete="given-name"
                placeholder="Jan"
                autoFocus
              />
            </Field>
            <Field label="Příjmení" error={errors.mLastName}>
              <Input
                value={data.mLastName}
                onChange={(e) => set("mLastName", e.target.value)}
                autoComplete="family-name"
                placeholder="Novák"
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
          <SouhlasyPole
            hodnoty={souhlasy}
            onZmena={nastavSouhlas}
            chybi={chybiSouhlas}
          />
          {poznamkaUcet}
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
                autoComplete="given-name"
                placeholder="Jan"
                autoFocus
              />
            </Field>
            <Field label="Příjmení" required error={errors.rLastName}>
              <Input
                value={data.rLastName}
                onChange={(e) => set("rLastName", e.target.value)}
                autoComplete="family-name"
                placeholder="Novák"
              />
            </Field>
          </div>
          <Field label="Telefon" error={errors.rPhone}>
            <Input
              value={data.rPhone}
              onChange={(e) => set("rPhone", e.target.value)}
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="+420 601 234 567"
            />
          </Field>
          <Field label="Datum narození" required error={errors.rBirthdate}>
            <BirthdatePicker value={data.rBirthdate} onChange={(v) => set("rBirthdate", v)} />
          </Field>
          <p className="text-[12px] leading-5 text-di">
            Pískat smí jen rozhodčí od 18 let. Rodné číslo, adresu ani účet tady
            nechceme — ty patří na smlouvu, kterou podepíšeš, až tě supervisor
            schválí.
          </p>
          <Button
            className="w-full"
            onClick={() => {
              if (
                zkontroluj({
                  rFirstName: validateName(data.rFirstName, "Jméno"),
                  rLastName: validateName(data.rLastName, "Příjmení"),
                  rPhone: validatePhone(data.rPhone),
                  rBirthdate: validateBirthdate(data.rBirthdate),
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
                [
                  "Datum narození",
                  data.rBirthdate ? data.rBirthdate.split("-").reverse().join(". ") : "",
                ],
              ] as [string, string][]
            ).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between gap-4 py-3">
                <dt className="text-[13px] text-mu">{k}</dt>
                <dd className="text-right text-[14px] text-wh">{v || "—"}</dd>
              </div>
            ))}
          </dl>
          <div className="rounded-xl border border-go/30 bg-go-soft p-4 text-[13px] leading-6 text-mu">
            Po odeslání musí registraci schválit supervisor FSL. Dostaneš oznámení,
            jakmile bude vyřízena. Rodné číslo, adresu a bankovní spojení pro
            výplatu odměn budeš vyplňovat až na smlouvě.
          </div>
          <SouhlasyPole
            hodnoty={souhlasy}
            onZmena={nastavSouhlas}
            chybi={chybiSouhlas}
          />
          {poznamkaUcet}
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
  onVyberRole: (karta: (typeof ROLES)[number]) => void;
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
        title="Přihlášku už máš za sebou"
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
              key={r.klic}
              onClick={() => onVyberRole(r)}
              className={TRIDY_KARTY}
            >
              <ObsahKarty r={r} />
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
          : "Jsi v draftu volných hráčů. Teď přidej video a fotky — vedoucí si vybírají hlavně podle nich.";

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
              // Nahrávání je až tady schválně: v přihlášce účet ještě nemusí
              // existovat a vybraný soubor by se ztratil při přesměrování na
              // přihlášení. Odkaz je proto první a pojmenovaný tím, co má
              // člověk udělat, ne kam ho to zavede.
              { label: "Přidat video a fotky", href: "/draft/profil" },
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
