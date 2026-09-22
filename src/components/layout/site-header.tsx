"use client";

import clsx from "clsx";
import {
  Users,
  MessageSquare,
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  Settings,
  Shield,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/api";
import { useAuthStore, useHasAnyRole, useIsSupervisor } from "@/store/auth";
import { Button, LinkButton } from "@/components/ui/primitives";

/* Vodorovné menu se ukazuje až od `xl`, ne od `lg`. Mezi 1024 a 1279 px se
   vedle sebe nevešlo logo, sedm odkazů a obě tlačítka: hlavička potřebovala
   1080 px a stránka šla na iPadu na šířku táhnout do strany. Do `xl` je
   místo odkazů tlačítko menu, které má stejné položky.
   Měřeno 15. 9. 2026: `document.documentElement.scrollWidth` se teď rovná
   šířce okna na 360, 375, 414, 640, 768, 1024, 1279, 1280 i 1440 px. */
const NAV = [
  { href: "/zapasy", label: "Zápasy" },
  { href: "/tabulka", label: "Tabulka" },
  { href: "/statistiky", label: "Statistiky" },
  { href: "/tymy", label: "Týmy" },
  { href: "/draft", label: "Draft" },
  { href: "/aktuality", label: "Aktuality" },
  { href: "/cenik", label: "Ceník" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const logout = useAuthStore((s) => s.logout);
  const isSupervisor = useIsSupervisor();
  // Přihláška je jediná cesta do ligy, ale do 11. 9. 2026 na ni ze žádné
  // veřejné stránky kromě draftu a pozvánky nevedl odkaz — vedoucí týmu,
  // na kterého míří celý nábor, neměl kam kliknout. Komu už nějaká role
  // patří, tomu by tlačítko jen překáželo.
  const maRoli = useHasAnyRole();

  const { data: unread = 0 } = useQuery({
    queryKey: ["notifications", "unread"],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async () => {
      const res = await notificationsApi.list();
      return res.data.filter((n) => !n.read).length;
    },
  });

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  /* Na přihlašovací stránce se skrývá jen „Přihlásit se" — vede na stránku,
     na které člověk stojí, takže klik = nic.

     „Přihláška do ligy" se tu naopak ukazuje schválně. Do 15. 9. 2026 mířila
     na /registrace za AuthGuardem, který odhlášeného vrátil rovnou sem, takže
     se skrývala taky. AuthGuard je od té doby pryč, přihláška jde vyplnit i
     bez účtu — a pro toho, kdo se na přihlašovací stránku dostal omylem, je
     tohle jediná cesta zpátky do náboru, která po něm nechce účet. */
  const naPrihlaseni = pathname === "/prihlaseni";

  const displayName =
    user?.player?.firstName ??
    user?.referee?.firstName ??
    user?.email?.split("@")[0] ??
    "Účet";

  return (
    <header className="sticky top-0 z-50 border-b border-bd bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        {/* Značka je **jen slovní název**, bez znaku vedle.

            18. 9. 2026 tu chvíli stálo FSL z loga (zlaté F a L, fialové S)
            místo staršího zlatého kolečka. V hlavičce vysoké 32 px z toho
            byla široká, tmavá a nevýrazná skvrna vedle bílého textu —
            zadavatel to shrnul „nevypadá to moc dobře, radši bez toho".
            Kdo bude znak vracet, ať ho nejdřív porovná na telefonu proti
            samotnému textu; logo samo o sobě je v pořádku, na 32 px se ale
            ztrácí.

            Text je proto viditelný **vždycky**, i na telefonu — dokud tu byl
            znak, mobil ukazoval jen jeho a název byl schovaný (`sm:block`).
            Bez znaku by tak odkaz na titulku zůstal prázdný. Na úzkém
            displeji se zkracuje na „FSL": plný název je ~155 px a hlavička
            se na 360px displeji už jednou přetáhla mimo obrazovku (viz
            komentář u tlačítka Přihláška níž).

            **Dvoubarevně, ne celé bíle.** Bílý název stál vedle bílých
            odkazů Zápasy / Tabulka / Statistiky a četl se jako osmá položka
            navigace — nic neříkalo, že je to značka. Zlaté „Stars Liga" ho
            oddělí a je to tentýž lom jako v nadpisu na titulce, takže se to
            čte jako záměr. Kdo to bude sjednocovat, ať to sjednotí s hero
            v `app/page.tsx`, ne naopak. */}
        <Link
          href="/"
          className="flex shrink-0 items-center text-[15px] font-bold tracking-tight text-wh"
        >
          <span className="sm:hidden">FSL</span>
          <span className="hidden sm:inline">
            Floorball <span className="text-go">Stars Liga</span>
          </span>
        </Link>

        <nav className="hidden flex-1 items-center gap-1 xl:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={clsx(
                "rounded-lg px-3 py-2 text-[14px] font-medium transition-colors",
                isActive(n.href)
                  ? "bg-go-soft text-go"
                  : "text-mu hover:bg-c1 hover:text-wh",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <Link
            href="/hledat"
            aria-label="Hledat"
            className="rounded-lg p-2 text-mu transition-colors hover:bg-c1 hover:text-wh"
          >
            <Search size={19} />
          </Link>

          {user ? (
            <Link
              href="/oznameni"
              aria-label="Oznámení"
              className="relative rounded-lg p-2 text-mu transition-colors hover:bg-c1 hover:text-wh"
            >
              <Bell size={19} className={unread > 0 ? "text-go" : undefined} />
              {unread > 0 ? (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red px-1 text-[9px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </Link>
          ) : null}

          {/* Odhlášenému nemá smysl nabízet přihlášku do ligy: /registrace je
              za AuthGuardem a stejně ho to pošle nejdřív založit účet. Vidí
              proto jen Registrace + Přihlásit se; kdo účet založí a nemá
              profil, do přihlášky ho pustí `goAfterAuth` sám. Zlaté tlačítko
              tak zůstává jen pro přihlášeného bez role — pro toho je to
              jediná cesta do náboru viditelná bez otevření menu.

              Na `hidden` se u Buttonu ani LinkButtonu nedá spolehnout: obě
              komponenty mají v základu `inline-flex`, clsx třídy jen slepí
              (nemerguje je) a v CSS pak vyhraje ta základní. Do 15. 9. 2026
              tu stálo `hidden sm:inline-flex`, tlačítko se ale neschovalo
              nikdy — hlavička byla 438 px široká na displeji, který má 360,
              stránka šla táhnout do strany a tlačítko menu bylo mimo
              obrazovku. Kdo tu bude něco schovávat, obalí to divem. Na
              úzkých displejích se zkracuje popisek, ne tlačítko. */}
          {!loading && user && !maRoli ? (
            <LinkButton href="/registrace" size="sm">
              <span className="sm:hidden">Přihláška</span>
              <span className="hidden sm:inline">Přihláška do ligy</span>
            </LinkButton>
          ) : null}

          {loading ? (
            <div className="h-9 w-20 animate-fsl-skeleton rounded-xl bg-c2" />
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenu((v) => !v)}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-bd bg-c1 px-2.5 py-1.5 text-[13px] font-medium text-wh transition-colors hover:border-bd-strong"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-go text-[11px] font-bold text-bg">
                  {displayName[0]?.toUpperCase()}
                </span>
                <span className="hidden max-w-24 truncate sm:block">{displayName}</span>
                <ChevronDown size={14} className="text-mu" />
              </button>

              {menu ? (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 animate-fsl-fade-in overflow-hidden rounded-xl border border-bd bg-c1 shadow-2xl">
                  <div className="border-b border-bd px-4 py-3">
                    <p className="truncate text-[13px] font-semibold text-wh">
                      {displayName}
                    </p>
                    <p className="truncate text-[11px] text-mu">{user.email}</p>
                  </div>
                  {user.player?.teamId ? (
                    <MenuLink
                      href="/muj-tym"
                      icon={<Users size={16} />}
                      onClick={() => setMenu(false)}
                    >
                      Můj tým
                    </MenuLink>
                  ) : null}
                  <MenuLink
                    href="/zpravy"
                    icon={<MessageSquare size={16} />}
                    onClick={() => setMenu(false)}
                  >
                    Zprávy
                  </MenuLink>
                  <MenuLink href="/muj-ucet" icon={<User size={16} />} onClick={() => setMenu(false)}>
                    Můj účet
                  </MenuLink>
                  {isSupervisor ? (
                    <MenuLink
                      href="/admin"
                      icon={<Shield size={16} />}
                      onClick={() => setMenu(false)}
                    >
                      Administrace
                    </MenuLink>
                  ) : null}
                  <MenuLink
                    href="/nastaveni"
                    icon={<Settings size={16} />}
                    onClick={() => setMenu(false)}
                  >
                    Nastavení
                  </MenuLink>
                  <button
                    onClick={async () => {
                      setMenu(false);
                      await logout();
                      router.replace("/");
                    }}
                    className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-left text-[14px] text-red transition-colors hover:bg-c2"
                  >
                    <LogOut size={16} />
                    Odhlásit se
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            /* Napřed role v lize, teprve pak účet.

               Do 16. 9. 2026 tu stálo zlaté „Registrace" mířící na
               `/prihlaseni?ucet=novy`, tedy na zakládání účtu. Dávalo to smysl,
               dokud byla `/registrace` za AuthGuardem — účet byl stejně
               podmínka. Jenže ten 15. 9. padl a přihláška se od té doby dá
               vyplnit bez účtu (`registrace/page.tsx` říká proč), takže
               hlavička jako jediná posílala nováčky pořád do zdi: klik na
               nejnápadnější tlačítko na stránce = „založ si účet", dřív než se
               člověk dozvěděl cenu, formát a kdy se hraje.

               Zlaté tlačítko proto vede na přihlášku. Účet se zakládá až při
               jejím odeslání, kdy už má člověk důvod ho chtít, a `goAfterAuth`
               ho pak vrátí zpátky do vyplněné přihlášky. Kdo chce jen účet,
               dojde si pro něj přes „Přihlásit se" a záložku Vytvořit účet. */
            <>
              <LinkButton href="/registrace" size="sm">
                <span className="sm:hidden">Přihláška</span>
                <span className="hidden sm:inline">Přihláška do ligy</span>
              </LinkButton>
              {naPrihlaseni ? null : (
                <LinkButton href="/prihlaseni" size="sm" variant="outline">
                  Přihlásit se
                </LinkButton>
              )}
            </>
          )}

          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            className="rounded-lg p-2 text-mu transition-colors hover:bg-c1 hover:text-wh xl:hidden"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-bd bg-c1 xl:hidden">
          <nav className="mx-auto grid max-w-7xl gap-1 px-4 py-3 sm:px-6">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={clsx(
                  "rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors",
                  isActive(n.href) ? "bg-go-soft text-go" : "text-mu hover:text-wh",
                )}
              >
                {n.label}
              </Link>
            ))}
            <Link
              href="/pavouk"
              className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-mu hover:text-wh"
            >
              Play-off pavouk
            </Link>
            <Link
              href="/aplikace"
              className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-mu hover:text-wh"
            >
              Mobilní aplikace
            </Link>
            {user && !maRoli ? (
              <Button
                variant="gold"
                className="mt-2"
                onClick={() => router.push("/registrace")}
              >
                Přihláška do ligy — tým nebo sebe
              </Button>
            ) : null}
            {!user ? (
              <>
                <Button
                  variant="gold"
                  className="mt-2"
                  onClick={() => router.push("/registrace")}
                >
                  Přihláška do ligy — tým nebo sebe
                </Button>
                {naPrihlaseni ? null : (
                  <Button
                    variant="outline"
                    className="mt-2"
                    onClick={() => router.push("/prihlaseni")}
                  >
                    Přihlásit se
                  </Button>
                )}
              </>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}

function MenuLink({
  href,
  icon,
  children,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2.5 text-[14px] text-wh transition-colors hover:bg-c2"
    >
      <span className="text-mu">{icon}</span>
      {children}
    </Link>
  );
}
