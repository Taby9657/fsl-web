/** Validace shodná s mobilní aplikací (utils/validation.ts). */

export const validateRequired = (v: string, label: string) =>
  v.trim() ? null : `${label} je povinné pole.`;

export const validateMinLength = (v: string, min: number, label: string) =>
  v.trim().length >= min ? null : `${label} musí mít alespoň ${min} znaky.`;

export function validateName(v: string, label: string) {
  if (!v.trim()) return `${label} je povinné pole.`;
  if (v.trim().length < 2) return `${label} musí mít alespoň 2 znaky.`;
  return null;
}

export function validatePhone(v: string) {
  if (!v?.trim()) return null;
  const clean = v.replace(/\s/g, "");
  return /^\+?\d{9,15}$/.test(clean) ? null : "Telefonní číslo není platné.";
}

export function validateJersey(v: string) {
  if (!v?.trim()) return null;
  const n = Number(v);
  // Nula je platné číslo dresu a backend ji bere — dřív ji web odmítal
  return Number.isInteger(n) && n >= 0 && n <= 99 ? null : "Číslo dresu musí být 0–99.";
}

export function validateBirthdate(v: string) {
  if (!v?.trim()) return null;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return "Datum narození není platné.";
  const y = d.getFullYear();
  if (y < 1920 || d.getTime() > Date.now()) return "Datum narození není platné.";
  return null;
}

export function validateAbbr(v: string) {
  if (!v.trim()) return "Zkratka je povinná.";
  if (v.trim().length > 3) return "Zkratka týmu může mít maximálně 3 znaky.";
  return null;
}

export function validateSeason(v: string) {
  return /^\d{4}\/\d{2}$/.test(v.trim())
    ? null
    : 'Zadej sezónu ve formátu "2026/27".';
}

/* ---------------- Údaje rozhodčího ----------------
   Rozhodčí dostává za zápas odměnu převodem, takže překlep v čísle účtu
   se projeví až tím, že peníze nepřijdou. Do 10. 9. 2026 se tyhle údaje
   nevalidovaly vůbec — ani formát. Kontroly jsou schválně mírné: prázdné
   pole projde (údaje jde doplnit později), ale zjevný nesmysl ne. */

export function validateZip(v: string) {
  if (!v?.trim()) return null;
  const clean = v.replace(/\s/g, "");
  return /^\d{5}$/.test(clean) ? null : "PSČ má pět číslic, například 130 00.";
}

export function validateBankAccount(v: string) {
  if (!v?.trim()) return null;
  // Tuzemský formát: [předčíslí-]číslo. Předčíslí max 6, číslo 2–10 číslic.
  const clean = v.replace(/\s/g, "");
  return /^(\d{1,6}-)?\d{2,10}$/.test(clean)
    ? null
    : "Číslo účtu zadej bez kódu banky, například 192000145399.";
}

export function validateBankCode(v: string) {
  if (!v?.trim()) return null;
  return /^\d{4}$/.test(v.trim())
    ? null
    : "Kód banky má čtyři číslice, například 0800.";
}

export function validateBirthNo(v: string) {
  if (!v?.trim()) return null;
  // Jen formát, ne kontrolní číslice — na tu se nedá spoléhat u starších
  // rodných čísel a odmítnout platné RČ by bylo horší než překlep pustit.
  const clean = v.replace(/\s/g, "");
  return /^\d{6}\/?\d{3,4}$/.test(clean)
    ? null
    : "Rodné číslo zadej ve formátu 950615/1234.";
}

export function firstError(checks: (string | null)[]) {
  return checks.find((c) => c !== null) ?? null;
}

/* ---------------- Chyby po polích ----------------
   `firstError` vrátí první chybu a ostatní zahodí, takže se člověk
   s třemi prázdnými poli dozví jednu — a jako toast, který za pět sekund
   zmizí. `Field` i `Input` přitom `error` prop mají. Tohle vrátí mapu
   pole → chyba, kterou jde předat přímo do formuláře. */

export type Errors = Record<string, string>;

export function collectErrors(
  checks: Record<string, string | null | undefined>,
): Errors {
  const out: Errors = {};
  for (const [pole, chyba] of Object.entries(checks)) {
    if (chyba) out[pole] = chyba;
  }
  return out;
}

/** Kolik chyb formulář má — pro hlášku „Zkontroluj 3 pole". */
export function pocetChyb(e: Errors) {
  return Object.keys(e).length;
}
