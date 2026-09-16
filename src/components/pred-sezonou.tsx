import { CalendarDays, ClipboardList, MapPin, Shuffle } from "lucide-react";
import { LinkButton } from "@/components/ui/primitives";
import { SEZONA, den, prihlaskyOtevrene } from "@/lib/sezona";

/**
 * Co se ukazuje místo prázdného seznamu, dokud sezóna nezačala.
 *
 * Tabulka, statistiky, týmy, rozpis i pavouk jsou před losem prázdné z
 * definice — není to chyba, ale `EmptyState` to říkal jako by byla
 * („Tabulka zatím prázdná", „Zatím žádná data"). Návštěvník z reklamy tím
 * dostal na pěti stránkách po sobě signál, že liga nefunguje.
 *
 * Tohle místo toho odpovídá na otázku, kvůli které tam ten člověk přišel:
 * kdy to začne a co má udělat teď. Po `SEZONA.start` se nepoužívá — od té
 * chvíle je prázdná tabulka zase normální prázdná tabulka.
 */
export function PredSezonou({
  titul,
  popis,
}: {
  /** Co konkrétně na téhle stránce chybí, např. „Tabulka se zaplní prvním kolem". */
  titul: string;
  popis?: string;
}) {
  const otevrene = prihlaskyOtevrene();

  const kroky = [
    {
      icon: <ClipboardList size={18} />,
      titul: "Přihlášky",
      hodnota: `do ${den(SEZONA.konecPrihlasek)}`,
      detail: "23:59",
      zvyraznit: otevrene,
    },
    {
      icon: <Shuffle size={18} />,
      titul: "Rozlosování",
      hodnota: den(SEZONA.los),
      detail: "vznikne rozpis",
      zvyraznit: false,
    },
    {
      icon: <CalendarDays size={18} />,
      titul: "Start sezóny",
      hodnota: den(SEZONA.start),
      detail: `sezóna ${SEZONA.nazev}`,
      zvyraznit: false,
    },
  ];

  return (
    <div className="rounded-xl border border-dashed border-bd px-5 py-10 text-center sm:px-8">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-go">
        {otevrene ? "Probíhá registrace" : "Čeká se na rozlosování"}
      </p>
      <p className="mx-auto mt-2 max-w-md text-[17px] font-bold text-wh">{titul}</p>
      <p className="mx-auto mt-2 max-w-md text-[13px] leading-6 text-mu">
        {popis ??
          `Rozpis, tabulka i statistiky vzniknou po rozlosování ${den(SEZONA.los)} — do té doby je tahle stránka prázdná z podstaty věci, ne kvůli chybě.`}
      </p>

      <div className="mx-auto mt-7 grid max-w-2xl gap-3 sm:grid-cols-3">
        {kroky.map((k) => (
          <div
            key={k.titul}
            className={
              k.zvyraznit
                ? "rounded-xl border border-go/40 bg-go-soft px-4 py-4"
                : "rounded-xl border border-bd bg-c1 px-4 py-4"
            }
          >
            <span
              className={
                k.zvyraznit
                  ? "mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-go/15 text-go"
                  : "mx-auto flex h-9 w-9 items-center justify-center rounded-lg bg-c2 text-mu"
              }
            >
              {k.icon}
            </span>
            <p className="mt-2.5 text-[11px] font-semibold uppercase tracking-wide text-di">
              {k.titul}
            </p>
            <p className="mt-0.5 text-[18px] font-black text-wh">{k.hodnota}</p>
            <p className="mt-0.5 text-[12px] text-mu">{k.detail}</p>
          </div>
        ))}
      </div>

      <p className="mx-auto mt-6 inline-flex items-center gap-2 text-[13px] text-mu">
        <MapPin size={15} className="shrink-0 text-di" />
        Hraje se {SEZONA.hraciDny} {SEZONA.hraciCas}, {SEZONA.mesto}
      </p>

      {otevrene ? (
        <div className="mt-6">
          <LinkButton href="/registrace">Přihlásit tým nebo sebe</LinkButton>
        </div>
      ) : null}
    </div>
  );
}
