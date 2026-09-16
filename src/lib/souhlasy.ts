/**
 * Souhlasy v přihlášce — jedno místo pro znění, verzi a vyhodnocení.
 *
 * Do 16. 9. 2026 přihláška nesbírala žádný souhlas. Přitom liga o hráčích
 * zveřejňuje jméno a příjmení a chystá se používat fotky a videa ze zápasů
 * k propagaci — a to jsou dvě různé věci s různým právním základem:
 *
 *  - Zveřejnění jména, čísla dresu, pozice, týmu a statistik je **plnění
 *    smlouvy** o účasti v soutěži (čl. 6 odst. 1 písm. b GDPR). Nedává se
 *    na to souhlas, protože bez toho liga neexistuje — dává se na vědomí.
 *  - Fotky a videa k propagaci jsou **souhlas** (čl. 6 odst. 1 písm. a)
 *    a k tomu ještě svolení s užitím podobizny podle § 84 a násl.
 *    občanského zákoníku. Souhlas musí být dobrovolný: podle čl. 7 odst. 4
 *    ho nesmí liga podmiňovat účastí, takže tahle položka **nikdy neblokuje
 *    odeslání přihlášky** a je zásadně nezaškrtnutá (Planet49, C-673/17).
 *
 * Proto jsou souhlasy rozdělené po položkách a ne jedno zaškrtávátko na
 * všechno: sloučený souhlas není granulární a v praxi neplatí.
 *
 * Tohle není právní posudek — znění by měl vidět právník.
 */

/**
 * Verze znění. Mění se **při každé úpravě textů níž** — u záznamu souhlasu
 * musí být dohledatelné, s čím přesně člověk souhlasil, ne jen že souhlasil.
 */
export const VERZE_SOUHLASU = "2026-09-16";

export type KlicSouhlasu =
  | "podminky"
  | "pravdivost"
  | "zverejneni"
  | "foto"
  | "novinky";

export type Souhlasy = Record<KlicSouhlasu, boolean>;

export const PRAZDNE_SOUHLASY: Souhlasy = {
  podminky: false,
  pravdivost: false,
  zverejneni: false,
  foto: false,
  novinky: false,
};

/** Bez těchhle tří se přihláška neodešle. */
export const POVINNE: KlicSouhlasu[] = ["podminky", "pravdivost", "zverejneni"];

/** Dobrovolné — účast v lize na nich nesmí záviset. */
export const VOLITELNE: KlicSouhlasu[] = ["foto", "novinky"];

/**
 * Krátký popis do záznamu. Plné znění je v komponentě `SouhlasyPole`
 * a na `/podminky`; tohle je jen klíč k němu, aby se záznam dal přečíst.
 */
export const POPIS: Record<KlicSouhlasu, string> = {
  podminky: "Podmínky použití a pravidla soutěže",
  pravdivost: "18+ a pravdivost údajů",
  zverejneni: "Na vědomí: veřejné jméno a údaje o účasti v soutěži",
  foto: "Fotky a videa ze zápasů k propagaci ligy",
  novinky: "E-maily o dění v lize",
};

/** Vrací klíče povinných souhlasů, které chybí. Prázdné pole = může se odeslat. */
export function chybiPovinne(s: Souhlasy): KlicSouhlasu[] {
  return POVINNE.filter((k) => !s[k]);
}

export function vsePovinneZaskrtnuto(s: Souhlasy): boolean {
  return chybiPovinne(s).length === 0;
}

/**
 * Záznam pro doložení souhlasu (čl. 7 odst. 1 GDPR — správce musí být
 * schopen souhlas doložit). Text, ne JSON: čte ho člověk v přehledu
 * žádostí.
 */
export function zaznamSouhlasu(role: string): string {
  return `SOUHLASY · role ${role} · verze znění ${VERZE_SOUHLASU}`;
}

export function vypisSouhlasu(s: Souhlasy): string {
  return [...POVINNE, ...VOLITELNE]
    .map((k) => `${s[k] ? "ANO" : "NE"} — ${POPIS[k]}`)
    .join("\n");
}
