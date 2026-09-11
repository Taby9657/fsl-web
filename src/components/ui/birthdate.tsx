"use client";

/**
 * Datum narození jako tři rozbalovátka — den, měsíc, rok.
 *
 * Nativní `<input type="date">` otevře kalendář na aktuálním měsíci. U data
 * narození je to k ničemu: než se člověk prolistuje o třicet let zpátky,
 * odklikne dvě stě šipek.
 *
 * Hodnota je `YYYY-MM-DD`, tedy přesně to, co čekal `type="date"` —
 * na volajícím se tím nic nemění. Nedokončený výběr vrací nahoru prázdný
 * řetězec, aby se nikdy neodeslalo poloviční datum.
 *
 * ⚠️ **Rozdělaný výběr si komponenta drží sama.** Do 11. 9. 2026 se
 * odvozoval jen z `value`, a protože neúplné datum posílalo nahoru prázdný
 * řetězec, každé rozbalovátko se hned po výběru vynulovalo — datum narození
 * nešlo vyplnit vůbec. Kdo bude tenhle stav „zjednodušovat" zpátky na jediný
 * `value`, tu chybu vrátí.
 */

import { useEffect, useState } from "react";
import { Select } from "./primitives";

const MESICE = [
  "leden", "únor", "březen", "duben", "květen", "červen",
  "červenec", "srpen", "září", "říjen", "listopad", "prosinec",
];

type Casti = { rok: number; mesic: number; den: number };

const PRAZDNO: Casti = { rok: 0, mesic: 0, den: 0 };

function rozlozit(value: string): Casti {
  const [rok, mesic, den] = (value || "").split("-").map((c) => Number(c) || 0);
  return { rok: rok || 0, mesic: mesic || 0, den: den || 0 };
}

function slozit({ rok, mesic, den }: Casti): string {
  if (!rok || !mesic || !den) return "";
  return `${rok}-${String(mesic).padStart(2, "0")}-${String(den).padStart(2, "0")}`;
}

/** Kolik dní má měsíc — únor podle přestupného roku. */
function dniVMesici(rok: number, mesic: number) {
  if (!rok || !mesic) return 31;
  return new Date(rok, mesic, 0).getDate();
}

export function BirthdatePicker({
  value,
  onChange,
  /** Nejstarší nabízený ročník. Starší hráče liga nemá a `validateBirthdate` je stejně odmítne. */
  odRoku = 1920,
}: {
  value: string;
  onChange: (v: string) => void;
  odRoku?: number;
}) {
  const [casti, setCasti] = useState<Casti>(() => rozlozit(value));

  // Změna zvenčí (načtený profil, obnovená rozdělaná registrace) přebije
  // rozdělaný výběr. Vlastní změny sem nedojdou — po nich `value` odpovídá
  // tomu, co je ve stavu, a prázdné `value` u rozdělaného výběru se ignoruje.
  useEffect(() => {
    if (value && value !== slozit(casti)) setCasti(rozlozit(value));
    if (!value && slozit(casti)) setCasti(PRAZDNO);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const letos = new Date().getFullYear();
  const roky = Array.from({ length: letos - odRoku + 1 }, (_, i) => letos - i);
  const dnu = dniVMesici(casti.rok, casti.mesic);

  function uprav(zmena: Partial<Casti>) {
    const dalsi = { ...casti, ...zmena };
    // Únor 29. → po přepnutí na nepřestupný rok den neexistuje. Ořízneme ho
    // na poslední den měsíce, ať výběr nezůstane na neplatném datu.
    const maxDen = dniVMesici(dalsi.rok, dalsi.mesic);
    if (dalsi.den > maxDen) dalsi.den = maxDen;

    setCasti(dalsi);
    onChange(slozit(dalsi));
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <Select
        value={casti.den || ""}
        aria-label="Den narození"
        onChange={(e) => uprav({ den: Number(e.target.value) })}
      >
        <option value="">Den</option>
        {Array.from({ length: dnu }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            {d}.
          </option>
        ))}
      </Select>

      <Select
        value={casti.mesic || ""}
        aria-label="Měsíc narození"
        onChange={(e) => uprav({ mesic: Number(e.target.value) })}
      >
        <option value="">Měsíc</option>
        {MESICE.map((nazev, i) => (
          <option key={nazev} value={i + 1}>
            {nazev}
          </option>
        ))}
      </Select>

      <Select
        value={casti.rok || ""}
        aria-label="Rok narození"
        onChange={(e) => uprav({ rok: Number(e.target.value) })}
      >
        <option value="">Rok</option>
        {roky.map((r) => (
          <option key={r} value={r}>
            {r}
          </option>
        ))}
      </Select>
    </div>
  );
}
