import Link from "next/link";

// Instagram a Facebook. Znackove ikony lucide-react od verze 1 uz neveze,
// takze jsou nakreslene rucne — obrysovym stylem, aby sedely ke zbytku webu.
function InstagramIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <rect x="2" y="2" width="20" height="20" rx="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37Z" />
      <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
    </svg>
  );
}

function FacebookIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      <path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z" />
    </svg>
  );
}

const SOCIAL = [
  {
    href: "https://www.instagram.com/floorballstarsleague/",
    label: "Instagram",
    handle: "@floorballstarsleague",
    Icon: InstagramIcon,
  },
  {
    href: "https://www.facebook.com/profile.php?id=61593672352257",
    label: "Facebook",
    handle: "Floorball Stars League",
    Icon: FacebookIcon,
  },
];

const COLS = [
  {
    title: "Liga",
    links: [
      { href: "/zapasy", label: "Zápasy" },
      { href: "/tabulka", label: "Tabulka" },
      { href: "/statistiky", label: "Statistiky" },
      { href: "/pavouk", label: "Play-off pavouk" },
    ],
  },
  {
    title: "Účastníci",
    links: [
      { href: "/tymy", label: "Týmy" },
      { href: "/rozhodci", label: "Rozhodčí" },
      { href: "/draft", label: "Draft" },
      { href: "/porovnani", label: "Porovnání hráčů" },
    ],
  },
  {
    title: "FSL",
    links: [
      // Odkaz na registraci patří i sem: kdo doroluje na konec stránky,
      // většinou hledá právě „jak se přihlásit".
      { href: "/registrace", label: "Přihlásit tým nebo sebe" },
      { href: "/cenik", label: "Ceník" },
      { href: "/aktuality", label: "Aktuality" },
      { href: "/aplikace", label: "Mobilní aplikace" },
      { href: "/kontakt", label: "Kontakt" },
      { href: "/zadost", label: "Napsat nám" },
    ],
  },
  {
    title: "Právní",
    links: [
      { href: "/ochrana-osobnich-udaju", label: "Ochrana osobních údajů" },
      { href: "/podminky", label: "Podmínky použití" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="relative z-10 mt-20 border-t border-bd bg-c1/50">
      {/* Spodni rezerva kvuli plovoucimu „Napsat nam" — na telefonu jinak
          sedelo na posledni radce tirazi. Viz layout.tsx, kde ma <main>
          stejny duvod. */}
      <div className="mx-auto max-w-7xl px-4 pb-28 pt-12 sm:px-6 sm:pb-12">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            {/* Bez znaku a dvoubarevně, stejně jako hlavička — viz
                `site-header.tsx`. */}
            <div className="text-[15px] font-bold text-wh">
              Floorball <span className="text-go">Stars Liga</span>
            </div>
            <p className="mt-3 max-w-xs text-[13px] leading-5 text-mu">
              Česká florbalová liga s vlastním systémem pro správu zápasů, soupisek,
              rozhodčích a plateb.
            </p>

            {/* Sociální sítě jsou jediné místo, kde se novinky a změny pravidel
                objeví dřív než na webu — proto patří do patičky každé stránky,
                ne jen na Kontakt. */}
            <div className="mt-6">
              <h3 className="mb-2 text-[11px] font-semibold label-caps uppercase text-go">
                Sledujte nás
              </h3>
              <p className="mb-3 max-w-xs text-[13px] leading-5 text-mu">
                Všechna nová pravidla a novinky z ligy dáváme nejdřív sem.
              </p>
              <div className="flex flex-wrap gap-2">
                {SOCIAL.map((s) => (
                  <a
                    key={s.href}
                    href={s.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={`FSL na ${s.label} — ${s.handle}`}
                    title={s.handle}
                    className="inline-flex items-center gap-2 rounded-lg border border-bd px-3 py-2 text-[13px] text-mu transition-colors hover:border-go hover:text-wh"
                  >
                    <s.Icon className="h-4 w-4 shrink-0" />
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
          </div>

          {COLS.map((col) => (
            <div key={col.title}>
              <h3 className="mb-3 text-[11px] font-semibold label-caps uppercase text-go">
                {col.title}
              </h3>
              <ul className="space-y-2">
                {col.links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      className="text-[13px] text-mu transition-colors hover:text-wh"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-3 border-t border-bd pt-6 sm:flex-row sm:items-center">
          <p className="text-[12px] leading-5 text-di">
            © {new Date().getFullYear()} Floorball Stars Liga · fslleague.cz
            <br />
            Provozovatel: Ninety Three Group s.r.o., IČO 29933455, Roháčova 145/14, Žižkov, 130 00 Praha 3
          </p>
          {/* Appka je od 10. 9. 2026 stažená z prodeje, dokud neproběhne
              převod Apple účtu na společnost. Footer proto nesmí slibovat
              stažení — odkaz by nikam nevedl a je to první, co cizí člověk
              na webu vidí. */}
          <p className="text-[12px] text-di">
            Mobilní aplikace FSL pro iOS a Android se připravuje
          </p>
        </div>
      </div>
    </footer>
  );
}
