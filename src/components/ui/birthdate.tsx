"use client";

/**
 * Datum narození jako tři rozbalovátka — den, měsíc, rok.
 *
 * Nativní `<input type="date">` otevře kalendář na aktuálním měsíci. U data
 * narození je to k ničemu: než se člověk prolistuje o třicet let zpátky,
 * odklikne dvě stě šipek. Rok se vybírá jako první, protože se od něj odvíjí
 * počet dní v únoru.
 *
 * Hodnota je `YYYY-MM-DD`, tedy přesně to, co čekal `type="date"` —
 * na volajícím se tím nic nemění. Nedokončený výběr (třeba jen rok) vrací
 * prázdný řetězec, aby se nikdy neodeslalo poloviční datum.
 */

import { useMemo } from "react";
import { Select } from "./primitives";

const MESICE = [
  "leden", "únor", "březen", "duben", "květen", "červen",
  "červenec", "srpen", "září", "říjen", "listopad", "prosinec",
];

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
  const [rok, mesic, den] = (value || "").split("-").map((c) => Number(c) || 0);

  const letos = new Date().getFullYear();
  const roky = useMemo(
    () => Array.from({ length: letos - odRoku + 1 }, (_, i) => letos - i),
    [letos, odRoku],
  );
  const dnu = dniVMesici(rok, mesic);

  function slozit(r: number, m: number, d: number) {
    // Únor 29. → po přepnutí na nepřestupný rok den neexistuje. Ořízneme ho
    // na poslední den měsíce, ať výběr nezůstane na neplatném datu.
    const maxDen = dniVMesici(r, m);
    const denOk = d > maxDen ? maxDen : d;
    if (!r || !m || !denOk) {
      onChange("");
      return;
    }
    onChange(`${r}-${String(m).padStart(2, "0")}-${String(denOk).padStart(2, "0")}`);
  }

  return (
    <div className="grid grid-cols-3 gap-2">
      <Select
        value={den || ""}
        aria-label="Den narození"
        onChange={(e) => slozit(rok, mesic, Number(e.target.value))}
      >
        <option value="">Den</option>
        {Array.from({ length: dnu }, (_, i) => i + 1).map((d) => (
          <option key={d} value={d}>
            {d}.
          </option>
        ))}
      </Select>

      <Select
        value={mesic || ""}
        aria-label="Měsíc narození"
        onChange={(e) => slozit(rok, Number(e.target.value), den)}
      >
        <option value="">Měsíc</option>
        {MESICE.map((nazev, i) => (
          <option key={nazev} value={i + 1}>
            {nazev}
          </option>
        ))}
      </Select>

      <Select
        value={rok || ""}
        aria-label="Rok narození"
        onChange={(e) => slozit(Number(e.target.value), mesic, den)}
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
