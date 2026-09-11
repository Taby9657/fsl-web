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

/* ---------------- Věk ----------------
   Do FSL smí jen dospělí — 18 let **ke dni registrace**. Hranice je tvrdá
   a skutečnou pojistkou je backend (`src/utils/vek.js`); tohle je jen
   ohleduplnost k uživateli, ať se to dozví u pole a ne až po odeslání.
   Kdyby se počítalo k začátku sezóny místo ke dni registrace, mění se to
   tady a v backendu — jinde ne. */

export const VEKOVA_HRANICE = 18;

/** Dovršený věk v letech, nebo `null`, když datum nedává smysl. */
export function vekVLetech(v: string, kDatu = new Date()): number | null {
  const shoda = /^(\d{4})-(\d{2})-(\d{2})$/.exec((v ?? "").trim());
  if (!shoda) return null;
  const [, r, m, d] = shoda.map(Number);
  const datum = new Date(r, m - 1, d);
  // `new Date(2007, 1, 31)` nespadne, jen tiše posune na 3. března.
  if (datum.getFullYear() !== r || datum.getMonth() !== m - 1 || datum.getDate() !== d) {
    return null;
  }
  let let_ = kDatu.getFullYear() - r;
  const mesic = kDatu.getMonth() - (m - 1);
  if (mesic < 0 || (mesic === 0 && kDatu.getDate() < d)) let_ -= 1;
  return let_;
}

/**
 * Datum narození je **povinné** — bez něj se nedá ověřit věk. Do 11. 9. 2026
 * bylo volitelné a prázdná hodnota procházela.
 */
export function validateBirthdate(v: string) {
  if (!v?.trim()) return "Datum narození je povinné.";
  const let_ = vekVLetech(v);
  if (let_ === null) return "Datum narození není platné.";
  const rok = Number(v.slice(0, 4));
  if (rok < 1920 || let_ < 0) return "Datum narození není platné.";
  if (let_ < VEKOVA_HRANICE) return `Do FSL smí jen hráči od ${VEKOVA_HRANICE} let.`;
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
