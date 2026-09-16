import { CalendarDays, ClipboardList, Clock3, MapPin, Shuffle } from "lucide-react";
import { SEZONA, den, prihlaskyOtevrene } from "@/lib/sezona";

/**
 * Termíny sezóny nad výběrem role v přihlášce.
 *
 * Do 16. 9. 2026 to byl jeden odstavec oddělený tečkami:
 * „Přihlášky do 1. 11. 23:59 · los 2. 11. · start 9. 11. · hraje se pondělí
 * až čtvrtek 18:00–22:00, Praha“. Na mobilu se zalomil doprostřed a čtyři
 * různě důležité údaje v něm vypadaly stejně — datum, do kdy se to stihne,
 * splývalo s místem konání.
 *
 * Tady má každý termín svůj řádek, datum je vpravo v jednom sloupci pod
 * sebou a uzávěrka přihlášek je zlatá, protože jen podle ní se návštěvník
 * rozhoduje **teď**. Herní dny a město jsou v patičce menším písmem: je to
 * podmínka účasti, ne termín.
 *
 * Pořád je to konstatování, ne pobídka — žádný odpočet a žádné „zbývá už jen“
 * (viz `fsl-mereni-trychtyre-2026-09-16.md`).
 *
 * Vykresluje se i serverovou náhradou v `registrace/page.tsx`, takže žádný
 * stav ani efekty — jen `prihlaskyOtevrene()`, stejně jako `PredSezonou`.
 */
export function TerminyPasek({ className = "" }: { className?: string }) {
  const otevrene = prihlaskyOtevrene();

  const radky = [
    {
      Ikona: ClipboardList,
      titul: "Přihlášky do",
      hodnota: `${den(SEZONA.konecPrihlasek)} 23:59`,
      zvyraznit: otevrene,
    },
    {
      Ikona: Shuffle,
      titul: "Rozlosování",
      hodnota: den(SEZONA.los),
      zvyraznit: false,
    },
    {
      Ikona: CalendarDays,
      titul: "Start sezóny",
      hodnota: den(SEZONA.start),
      zvyraznit: false,
    },
  ];

  return (
    <div className={`overflow-hidden rounded-xl border border-bd bg-c1 ${className}`}>
      <ul className="divide-y divide-bd">
        {radky.map(({ Ikona, titul, hodnota, zvyraznit }) => (
          <li
            key={titul}
            className={`flex items-center gap-3 px-4 py-2.5 ${zvyraznit ? "bg-go-soft" : ""}`}
          >
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg ${
                zvyraznit ? "bg-go/15 text-go" : "bg-c2 text-mu"
              }`}
            >
              <Ikona size={15} />
            </span>
            <span className="text-[13px] leading-5 text-mu">{titul}</span>
            <span
              className={`ml-auto text-[15px] font-black tabular-nums ${
                zvyraznit ? "text-go" : "text-wh"
              }`}
            >
              {hodnota}
            </span>
          </li>
        ))}
      </ul>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-bd px-4 py-2.5 text-[12px] leading-5 text-mu">
        <span className="inline-flex items-center gap-1.5">
          <Clock3 size={14} className="shrink-0 text-di" />
          {SEZONA.hraciDny} {SEZONA.hraciCas}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MapPin size={14} className="shrink-0 text-di" />
          {SEZONA.mesto}
        </span>
      </div>
    </div>
  );
}
