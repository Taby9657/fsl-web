/**
 * Termíny sezóny na jednom místě.
 *
 * Do 16. 9. 2026 nebyly nikde — stránky jen mlčky ukazovaly prázdné seznamy
 * („Tabulka zatím prázdná", „Zatím žádné týmy") a návštěvník z reklamy z toho
 * vyčetl, že liga je mrtvá. Přitom mu chyběly přesně tři údaje, podle kterých
 * se rozhoduje: dokdy se stihne přihlásit, kdy se to rozlosuje a kdy se začne
 * hrát. Komponenta `PredSezonou` je bere odsud.
 *
 * Časy jsou v pásmu Prahy. 1. 11. 2026 už je po konci letního času (končí
 * 25. 10.), takže platí +01:00.
 */

export const SEZONA = {
  nazev: "2026/27",
  /** Poslední okamžik, kdy jde odeslat přihlášku. */
  konecPrihlasek: new Date("2026-11-01T23:59:59+01:00"),
  /** Rozlosování — po něm vzniká rozpis, tabulka a soupisky. */
  los: new Date("2026-11-02T00:00:00+01:00"),
  /** První zápasy základní části. */
  start: new Date("2026-11-09T00:00:00+01:00"),
  /**
   * Kdy se otevře veřejný výpis volných hráčů (draft pool).
   *
   * Do té doby se hráči bez týmu **normálně přihlašují** a profil v draftu
   * si založí — jen ho nikdo zvenčí nevidí. Vedoucí si tak nemůžou
   * rozebrat hráče dřív, než se ví, kdo vlastně v soutěži je: přihlášky
   * končí 1. 11. a hned nato je los.
   */
  otevreniDraftu: new Date("2026-11-01T00:00:00+01:00"),
  hraciDny: "pondělí až čtvrtek",
  hraciCas: "18:00–22:00",
  mesto: "Praha",
} as const;

/**
 * Datum bez roku: „2. 11."
 *
 * Formátuje se **natvrdo v pražském pásmu**, ne lokálními gettery. Vercel
 * i buildy běží v UTC, takže `new Date("2026-11-02T00:00:00+01:00").getDate()`
 * tam vrátí 1 — půlnoc v Praze je 23:00 předchozího dne v UTC. Na tohle se
 * 16. 9. 2026 povedlo naletět hned napoprvé: los se na webu ukazoval jako
 * 1. 11. a start sezóny jako 8. 11.
 */
const FORMAT_DNE = new Intl.DateTimeFormat("cs-CZ", {
  timeZone: "Europe/Prague",
  day: "numeric",
  month: "numeric",
});

export function den(d: Date) {
  // cs-CZ dává „2. 11." — mezera je nezlomitelná, sjednotíme ji na obyčejnou.
  return FORMAT_DNE.format(d).replace(/\u00a0/g, " ").trim();
}

/** Před startem sezóny se místo prázdných seznamů ukazuje `PredSezonou`. */
export function predSezonou(ted: Date = new Date()) {
  return ted.getTime() < SEZONA.start.getTime();
}

/** Přihlášky jsou otevřené do konce 1. 11. */
export function prihlaskyOtevrene(ted: Date = new Date()) {
  return ted.getTime() <= SEZONA.konecPrihlasek.getTime();
}

/** Kolik celých dní zbývá do konce přihlášek. Záporné číslo = po termínu. */
export function dnuDoKoncePrihlasek(ted: Date = new Date()) {
  return Math.ceil((SEZONA.konecPrihlasek.getTime() - ted.getTime()) / 86_400_000);
}

/**
 * Veřejný výpis volných hráčů je do 1. 11. 2026 zavřený.
 *
 * Pozor: je to **zámek ve webu, ne v API**. Endpoint `/draft` zůstává
 * veřejný, takže kdo ho zná, seznam si vytáhne. Na rozebírání hráčů
 * dopředu to stačí, na utajení ne — to by musel umět backend.
 */
export function draftOtevren(ted: Date = new Date()) {
  return ted.getTime() >= SEZONA.otevreniDraftu.getTime();
}
