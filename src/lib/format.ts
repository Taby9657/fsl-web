import { format } from "date-fns";
import { cs } from "date-fns/locale";
import type { MatchStatus, PaymentStatus, RegStatus, RequestType } from "./types";

/* ---------- datum a čas ---------- */

export const fmt = (d: string | Date | null | undefined, pattern: string) => {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  if (Number.isNaN(date.getTime())) return "—";
  return format(date, pattern, { locale: cs });
};

/** „út 4. 3. · 19:30" – formát používaný v aplikaci */
export const fmtMatch = (d: string | Date) => fmt(d, "EEE d. M. · HH:mm");
/** „4. 3. 2026" */
export const fmtDate = (d: string | Date | null | undefined) => fmt(d, "d. M. yyyy");
/** „4. 3. 2026 19:30" */
export const fmtDateTime = (d: string | Date | null | undefined) => fmt(d, "d. M. yyyy HH:mm");
/** „19:30" */
export const fmtTime = (d: string | Date | null | undefined) => fmt(d, "HH:mm");
/** „4. 3." */
export const fmtShort = (d: string | Date | null | undefined) => fmt(d, "d. M.");

/** „před 5 min" / „před 3 h" / „před 2 d" */
export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "Právě teď";
  if (min < 60) return `před ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `před ${h} h`;
  const d = Math.floor(h / 24);
  return `před ${d} d`;
}

/** Zbývající čas draft okna: „2d 4h" / „5h 12m" / „Vyprší brzy" */
export function timeLeft(iso?: string | null): string {
  if (!iso) return "—";
  const diff = new Date(iso).getTime() - Date.now();
  if (diff <= 0) return "Vyprší brzy";
  const h = Math.floor(diff / 3_600_000);
  const m = Math.floor((diff % 3_600_000) / 60_000);
  if (h >= 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
  return `${h}h ${m}m`;
}

/* ---------- čeština ---------- */

/** 1 nabídka / 2–4 nabídky / 5+ nabídek */
export function pluralOffer(n: number): string {
  if (n === 1) return "1 nabídka";
  if (n >= 2 && n <= 4) return `${n} nabídky`;
  return `${n} nabídek`;
}

export function pluralTeam(n: number): string {
  if (n === 1) return "1 tým";
  if (n >= 2 && n <= 4) return `${n} týmy`;
  return `${n} týmů`;
}

export function pluralPlayer(n: number): string {
  if (n === 1) return "1 hráč";
  if (n >= 2 && n <= 4) return `${n} hráči`;
  return `${n} hráčů`;
}

export function pluralMatch(n: number): string {
  if (n === 1) return "1 zápas";
  if (n >= 2 && n <= 4) return `${n} zápasy`;
  return `${n} zápasů`;
}

/* ---------- pozice ---------- */

/** DB může obsahovat jak zkratky (F/D/GK), tak plné české názvy. */
export const POSITION_FULL: Record<string, string> = {
  F: "Útočník",
  D: "Obránce",
  GK: "Brankář",
  Útočník: "Útočník",
  Obránce: "Obránce",
  Brankář: "Brankář",
  Univerzál: "Univerzál",
};

export const POSITION_SHORT: Record<string, string> = {
  F: "Ú",
  D: "O",
  GK: "Br",
  Útočník: "Ú",
  Obránce: "O",
  Brankář: "Br",
  Univerzál: "U",
};

export const positionLabel = (p?: string | null) =>
  (p && POSITION_FULL[p]) || p || "—";
export const positionShort = (p?: string | null) => (p && POSITION_SHORT[p]) || p || "—";

/* ---------- stavy ---------- */

export const MATCH_STATUS_LABEL: Record<MatchStatus, string> = {
  UPCOMING: "Nadcházející",
  LIVE: "LIVE",
  DONE: "Odehráno",
  CANCELLED: "Zrušeno",
};

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  PENDING: "Čeká na platbu",
  PAID: "Zaplaceno",
  OVERDUE: "Po splatnosti",
  WAIVED: "Odpuštěno",
};

export const PAYMENT_STATUS_COLOR: Record<PaymentStatus, string> = {
  PENDING: "#F59E0B",
  PAID: "#22C55E",
  OVERDUE: "#EF4444",
  WAIVED: "#9B8BC8",
};

export const REG_STATUS_LABEL: Record<RegStatus, string> = {
  PENDING: "Čeká",
  APPROVED: "Schváleno",
  REJECTED: "Zamítnuto",
  APPEALING: "Odvolání",
};

export const REG_STATUS_COLOR: Record<RegStatus, string> = {
  PENDING: "#9B8BC8",
  APPROVED: "#C9A140",
  REJECTED: "#EF4444",
  APPEALING: "#F59E0B",
};

export const REQUEST_TYPE_LABEL: Record<RequestType, string> = {
  MATCH_TRANSCRIPT: "Zápis ze zápasu",
  PLAYER_DISPUTE: "Hráčský spor",
  LICENSE_ISSUE: "Problém s licencí",
  OTHER: "Ostatní",
};

export const REFEREE_LEVEL_LABEL: Record<string, string> = {
  A: "Úroveň A (senior)",
  B: "Úroveň B",
  C: "Úroveň C (junior)",
};

/* ---------- ostatní ---------- */

export const czk = (n: number) =>
  new Intl.NumberFormat("cs-CZ", { maximumFractionDigits: 0 }).format(n) + " Kč";

export const initials = (first?: string | null, last?: string | null) =>
  `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "?";

export const fullName = (p?: { firstName?: string; lastName?: string } | null) =>
  p ? `${p.firstName ?? ""} ${p.lastName ?? ""}`.trim() : "—";

export const isLicensed = (status?: string | null) =>
  status === "PAID" || status === "WAIVED";

/** Zkrátí hex barvu na bezpečnou hodnotu s alfa kanálem, např. alpha('#C9A140', 0.2) */
export function alpha(hex: string | null | undefined, a: number): string {
  const h = hex && /^#[0-9a-fA-F]{6}$/.test(hex) ? hex : "#C9A140";
  const r = parseInt(h.slice(1, 3), 16);
  const g = parseInt(h.slice(3, 5), 16);
  const b = parseInt(h.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}
