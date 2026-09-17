"use client";

import { useState } from "react";
import Image from "next/image";
import clsx from "clsx";
import { ChevronDown, ChevronUp, Pin, PlayCircle } from "lucide-react";
import type { Highlight } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { Card } from "@/components/ui/primitives";

/**
 * Seznam aktualit, ve kterém je článek zavřený a rozklikne se.
 *
 * Proč: stránka vykreslovala všechny články v plném znění pod sebou, takže
 * měla několik obrazovek a nešlo z ní poznat, co v ní vlastně je. Zavřený
 * článek ukazuje tři řádky, otevřený celý text — a **jde zase zavřít**,
 * což u rozbalených bloků bývá to, co chybí.
 *
 * Celý text zůstává v DOM i zavřený (`line-clamp` jen ořízne vykreslení),
 * takže se tím nic neztratí pro vyhledávače.
 *
 * Ovládací prvek musí být vidět: šipka u nadpisu a zlaté „Číst celé“.
 * Skládací prvek, o kterém nikdo neví, že se dá rozložit, nikdo neotevře —
 * to už nás jednou stálo karty rolí v přihlášce.
 */
export function AktualitySeznam({ highlights }: { highlights: Highlight[] }) {
  const [otevrene, setOtevrene] = useState<Set<string>>(new Set());

  function prepni(id: string) {
    setOtevrene((stav) => {
      const novy = new Set(stav);
      if (novy.has(id)) novy.delete(id);
      else novy.add(id);
      return novy;
    });
  }

  function zavri(id: string) {
    setOtevrene((stav) => {
      const novy = new Set(stav);
      novy.delete(id);
      return novy;
    });
    // Po zavření dlouhého článku zůstane člověk v místě, které už odscrolloval
    // pryč — karta by mu utekla nad obrazovku. Vrátíme ji zpátky do zorného pole.
    requestAnimationFrame(() => {
      const el = document.getElementById(`aktualita-${id}`);
      if (el && el.getBoundingClientRect().top < 0) {
        el.scrollIntoView({ block: "start" });
      }
    });
  }

  return (
    <div className="space-y-4">
      {highlights.map((h) => {
        const otevreno = otevrene.has(h.id);

        return (
          <Card
            key={h.id}
            id={`aktualita-${h.id}`}
            className={clsx(
              "scroll-mt-20 overflow-hidden",
              h.pinned && "border-go/50",
            )}
          >
            {h.imageUrl ? (
              <button
                type="button"
                onClick={() => prepni(h.id)}
                aria-label={otevreno ? "Zavřít článek" : "Otevřít článek"}
                className="relative block h-52 w-full cursor-pointer"
              >
                <Image
                  src={h.imageUrl}
                  alt=""
                  fill
                  className="object-cover"
                  sizes="768px"
                />
              </button>
            ) : null}

            <div className="p-5">
              <div className="mb-2.5 flex flex-wrap items-center gap-2">
                {h.pinned ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-go px-2 py-0.5 text-[10px] font-bold uppercase text-bg">
                    <Pin size={10} /> Připnuto
                  </span>
                ) : null}
                {h.round != null ? (
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-di">
                    Kolo {h.round}
                  </span>
                ) : null}
                <span className="ml-auto text-[11px] text-di">
                  {fmtDate(h.createdAt)}
                </span>
              </div>

              <h2>
                <button
                  type="button"
                  onClick={() => prepni(h.id)}
                  aria-expanded={otevreno}
                  aria-controls={`telo-${h.id}`}
                  className="flex min-h-11 w-full cursor-pointer items-center justify-between gap-3 text-left"
                >
                  <span className="text-[17px] font-bold text-wh">
                    {h.title}
                  </span>
                  <ChevronDown
                    size={18}
                    aria-hidden
                    className={clsx(
                      "shrink-0 text-go transition-transform",
                      otevreno && "rotate-180",
                    )}
                  />
                </button>
              </h2>

              <div id={`telo-${h.id}`}>
                <p
                  className={clsx(
                    "mt-1 whitespace-pre-line text-[14px] leading-6 text-mu",
                    !otevreno && "line-clamp-3",
                  )}
                >
                  {h.body}
                </p>

                {otevreno && h.videoUrl ? (
                  <a
                    href={h.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-blue/40 bg-blue/15 px-3.5 py-2 text-[13px] font-semibold text-blue transition-colors hover:bg-blue/25"
                  >
                    <PlayCircle size={16} />
                    Přehrát video
                  </a>
                ) : null}

                {otevreno ? (
                  <div className="mt-4 border-t border-bd pt-3">
                    <button
                      type="button"
                      onClick={() => zavri(h.id)}
                      className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-go transition-colors hover:text-wh"
                    >
                      <ChevronUp size={16} aria-hidden />
                      Zavřít článek
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => prepni(h.id)}
                    className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 text-[13px] font-semibold text-go transition-colors hover:text-wh"
                  >
                    Číst celé
                    <ChevronDown size={16} aria-hidden />
                  </button>
                )}
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
