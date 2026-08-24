import Link from "next/link";

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
      { href: "/aktuality", label: "Aktuality" },
      { href: "/aplikace", label: "Mobilní aplikace" },
      { href: "/kontakt", label: "Kontakt" },
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
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-5">
          <div className="lg:col-span-1">
            <div className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-go text-[13px] font-black text-go">
                FSL
              </span>
              <span className="text-[15px] font-bold text-wh">Floorball Stars Liga</span>
            </div>
            <p className="mt-3 max-w-xs text-[13px] leading-5 text-mu">
              Česká florbalová liga s vlastním systémem pro správu zápasů, soupisek,
              rozhodčích a plateb.
            </p>
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
          <p className="text-[12px] text-di">
            © {new Date().getFullYear()} Floorball Stars Liga · fslleague.cz
          </p>
          <p className="text-[12px] text-di">
            Stáhni si aplikaci FSL pro iOS a Android
          </p>
        </div>
      </div>
    </footer>
  );
}
