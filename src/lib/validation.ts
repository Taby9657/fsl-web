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

export function firstError(checks: (string | null)[]) {
  return checks.find((c) => c !== null) ?? null;
}
