// Typy odpovídající Prisma schématu backendu (fsl-backhand)

export type MatchStatus = "UPCOMING" | "LIVE" | "DONE" | "CANCELLED";
export type PaymentStatus = "PENDING" | "PAID" | "OVERDUE" | "WAIVED" | "REFUNDED";

/** Pokuta za kontumaci. Dokud visí nezaplacená, tým další zápas nerozehraje. */
export interface Fine {
  id: string;
  teamId: string;
  matchId: string;
  season: string;
  amount: number;
  paidAmount: number;
  reason: string;
  status: PaymentStatus;
  variableSymbol: string | null;
  team?: { id: string; name: string; abbr: string };
}
export type RefereeLevel = "A" | "B" | "C";
export type RefereeStatus = "PENDING" | "APPROVED" | "REJECTED";
export type RegStatus = "PENDING" | "APPROVED" | "REJECTED" | "APPEALING";
export type DraftOfferStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";
export type RequestType =
  | "WEB_BUG"
  | "REGISTRATION"
  | "PAYMENT"
  | "ROSTER"
  | "MATCH_TRANSCRIPT"
  | "LICENSE_ISSUE"
  | "PLAYER_DISPUTE"
  | "OTHER";
export type RequestStatus = "PENDING" | "IN_PROGRESS" | "APPROVED" | "REJECTED";
export type MatchEventType =
  | "GOAL"
  | "PENALTY"
  | "SHOOTOUT_GOAL"
  | "SHOOTOUT_MISS"
  | "PERIOD_END"
  | "MATCH_END";

export interface TeamLite {
  id: string;
  name: string;
  abbr: string;
  color?: string | null;
  logoUrl?: string | null;
  division?: string | null;
  conference?: string | null;
}

export interface Team extends TeamLite {
  venue?: string | null;
  /**
   * Otevřený tým — skládá se z jednotlivců a nemá živého vedoucího.
   *
   * **Chodí jen ze supervisorských rout.** Ve veřejných datech
   * (`VEREJNY_TYM` v backendu) schválně není: do 2. 11. 2026 se nikde venku
   * nesmí objevit, že je tým poskládaný z jednotlivců. Kdo ho bude
   * vykreslovat, ať to dělá výhradně v `/admin`.
   */
  isOpen?: boolean;
  regStatus?: RegStatus;
  regNote?: string | null;
  regAppeal?: string | null;
  regAppealAt?: string | null;
  createdAt?: string;
  players?: Player[];
  managers?: { id: string; userId: string; user?: { id: string; email: string } }[];
  payments?: TeamPayment | TeamPayment[] | null;
  _count?: { players?: number; matches?: number };
}

export type RosterSlot = "GOALKEEPER" | "FIELD";

/** Koupený balíček zápasů. Kredit se vede v startech, ne v korunách. */
export interface MatchPack {
  id: string;
  season: string;
  size: number;
  remaining: number;
  price: number;
  isReward: boolean;
  status: PaymentStatus;
  paidAt?: string | null;
  method?: string | null;
  createdAt: string;
}

/** Zápas, na který je hráč přihlášený. */
export interface UpcomingEntry {
  matchId: string;
  teamId: string;
  status: "RESERVED" | "SPENT";
  /** Po uzávěrce odhlášení start nevrátí. */
  locked: boolean;
  hoursLeft: number;
  match: {
    id: string;
    date: string;
    venue?: string | null;
    status: string;
    homeTeam: TeamLite;
    awayTeam: TeamLite;
  };
}

/** Proč hráče nejde postavit do sestavy. Server je počítá stejně jako brána. */
export interface RosterBlocker {
  code: "NO_LICENSE" | "NO_CREDIT" | "NOT_ON_ROSTER";
  text: string;
}

export interface PacksOverview {
  catalog: { size: number; price: number }[];
  season: string;
  packs: MatchPack[];
  remaining: number;
  spent: number;
  withdrawalHours: number;
  upcoming: UpcomingEntry[];
  /** false = účet ještě není hráč, balíček si koupit nemůže. */
  hasProfile?: boolean;
  /** Odehrané zápasy bez kontumací. */
  played?: number;
  /** Doporučovací kód se odemyká po prvním odehraném zápase. */
  canRefer?: boolean;
}

/** Co všechno jde dát do košíku. Pokuta za kontumaci ne — blokuje zápas. */
export type CartItemKind =
  | "PLAYER_LICENSE"
  | "SUPER_LICENSE"
  | "MATCH_PACK"
  | "TEAM_REG"
  /** Balík „Virtuální vedoucí" — vstup jednotlivce do otevřeného týmu. */
  | "OPEN_ENTRY";

/**
 * Balík „Virtuální vedoucí": startovné 500 + hráčská licence 300.
 * `licFee` je nula u toho, kdo licenci na sezónu už zaplatil — ten platí 500.
 */
export interface OpenEntry {
  id: string;
  playerId: string;
  season: string;
  slot: RosterSlot;
  entryFee: number;
  licFee: number;
  status: PaymentStatus;
  paidAmount: number;
  paidAt?: string | null;
  method?: string | null;
}

export interface CartItem {
  id: string;
  kind: CartItemKind;
  /** Hotový popisek ze serveru, ať se skloňování neřeší na dvou místech. */
  label: string;
  amount: number;
  packSize?: number | null;
  season?: string | null;
  player?: { id: string; firstName: string; lastName: string; jersey: number } | null;
  team?: { id: string; name: string } | null;
  /** Platím to za někoho jiného (vedoucí za svého hráče). */
  zaJineho?: boolean;
}

export interface Cart {
  id: string | null;
  season: string;
  status: string;
  total: number;
  items: CartItem[];
}

export interface CartAdd {
  kind: CartItemKind;
  playerId?: string;
  teamId?: string;
  size?: number;
}

export interface ReferralOverview {
  code: string;
  invited: number;
  rewarded: number;
  uses: { player: { id: string; firstName: string; lastName: string }; joinedAt: string; rewarded: boolean }[];
  rule: string;
}

export interface Player {
  id: string;
  userId?: string;
  teamId?: string | null;
  firstName: string;
  lastName: string;
  jersey: number;
  position: string;
  birthdate?: string | null;
  phone?: string | null;
  photoUrl?: string | null;
  licensed: boolean;
  isSupervisor?: boolean;
  /** Místo na soupisce — brankář, nebo hráč do pole. Drží se na soupisce
   *  sezóny (TeamRoster.slot), ne na hráči: tentýž člověk může být jinde
   *  hráč do pole. `position` je jen volný text a nedá se na něj spolehnout. */
  slot?: RosterSlot;
  /** Kolik startů hráči zbývá v balíčku. Posílá soupiska týmu. */
  credits?: number;
  /** Proč ho nejde postavit do sestavy. Prázdné pole = jde. */
  blockers?: RosterBlocker[];
  team?: TeamLite | null;
  payment?: PlayerPayment | null;
  goals?: MatchEvent[];
  assists?: MatchEvent[];
  mvpVotes?: unknown[];
  draftProfile?: DraftProfile | null;
}

export interface Referee {
  id: string;
  userId?: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  photoUrl?: string | null;
  level: RefereeLevel;
  status: RefereeStatus;
  birthNo?: string | null;
  address?: string | null;
  city?: string | null;
  zip?: string | null;
  bankAccount?: string | null;
  bankCode?: string | null;
  user?: { id: string; email: string };
  matches?: Match[];
  ratings?: RefRating[];
}

export interface RefRating {
  id: string;
  matchId: string;
  refereeId: string;
  teamId: string;
  rating: number;
  createdAt: string;
}

export interface MatchEvent {
  id: string;
  matchId: string;
  type: MatchEventType;
  minute: number;
  period: number;
  teamId?: string | null;
  scorerId?: string | null;
  assistId?: string | null;
  penaltyId?: string | null;
  penaltyType?: string | null;
  createdAt?: string;
  scorer?: Player | null;
  assist?: Player | null;
  penalty?: Player | null;
  match?: Match | null;
}

export interface LineupPlayer {
  id: string;
  lineupId: string;
  playerId: string;
  isGoalkeeper: boolean;
  isCaptain: boolean;
  jerseyOverride?: number | null;
  player: Player;
}

export interface LineupSubmission {
  id: string;
  matchId: string;
  teamId: string;
  confirmed: boolean;
  players: LineupPlayer[];
}

export interface PostmatchData {
  id: string;
  matchId: string;
  teamId: string;
  refRating?: number | null;
  refNote?: string | null;
  opponentMvpId?: string | null;
  actionVideoUrl?: string | null;
  actionDesc?: string | null;
  submitted: boolean;
  submittedAt?: string | null;
  opponentMvp?: Player | null;
}

export interface Match {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  refereeId?: string | null;
  competition: string;
  division: string;
  season: string;
  round?: number | null;
  date: string;
  venue?: string | null;
  homeScore: number;
  awayScore: number;
  status: MatchStatus;
  homeTeam: TeamLite;
  awayTeam: TeamLite;
  referee?: Referee | null;
  events?: MatchEvent[];
  lineups?: LineupSubmission[];
  postmatches?: PostmatchData[];
  _count?: { events?: number };
}

export interface TableRow {
  teamId: string;
  team: TeamLite;
  p: number;
  w: number;
  d: number;
  l: number;
  gf: number;
  ga: number;
  pts: number;
  form?: string[];
}

export interface ScorerRow {
  player: Player;
  goals?: number;
  assists?: number;
  points?: number;
  votes?: number;
}

export interface RefereeStatRow {
  referee: Referee;
  avg: number;
  count: number;
}

export interface MyStats {
  goals: number;
  assists: number;
  points: number;
  penalties: number;
  mvp: number;
  recentGoals?: { matchId: string; minute: number; homeTeam: TeamLite; awayTeam: TeamLite }[];
  recentAssists?: { matchId: string; minute: number; homeTeam: TeamLite; awayTeam: TeamLite }[];
}

export interface PlayerPayment {
  id: string;
  playerId?: string;
  season: string;
  licFee: number;
  licStatus: PaymentStatus;
  licPaidAt?: string | null;
  licMethod?: string | null;
  superLic: boolean;
  superFee: number;
  superStatus: PaymentStatus;
  superPaidAt?: string | null;
  variableSymbol?: string | null;
  superVariableSymbol?: string | null;
  player?: Player;
}

export interface TeamPayment {
  id: string;
  teamId?: string;
  season: string;
  amount: number;
  status: PaymentStatus;
  paidAt?: string | null;
  method?: string | null;
  variableSymbol?: string | null;
  team?: TeamLite;
}

export interface BankTransaction {
  id: string;
  transactionId: string;
  amount: number;
  variableSymbol?: string | null;
  senderName?: string | null;
  senderAccount?: string | null;
  date: string;
  matched: boolean;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  body: string;
  screen?: string | null;
  read: boolean;
  createdAt: string;
}

export interface Highlight {
  id: string;
  round?: number | null;
  title: string;
  body: string;
  imageUrl?: string | null;
  videoUrl?: string | null;
  pinned: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface DraftVideo {
  id: string;
  profileId: string;
  url: string;
  createdAt: string;
}

export interface DraftOffer {
  id: string;
  profileId: string;
  teamId: string;
  message?: string | null;
  status: DraftOfferStatus;
  isFirst: boolean;
  expiresAt: string;
  createdAt: string;
  team?: TeamLite;
}

export interface DraftProfile {
  id: string;
  playerId: string;
  bio?: string | null;
  pubSkill?: string | null;
  position?: string | null;
  isActive: boolean;
  player: Player;
  videos: DraftVideo[];
  offers?: DraftOffer[];
  offerCount?: number;
  windowExpiresAt?: string | null;
  myTeamOffer?: DraftOffer | null;
}

/** Řádek soupisky, jak ho Správa hráčů potřebuje — bez vnořeného týmu. */
export interface AdminPlayerRoster {
  playerId: string;
  teamId: string;
  slot: RosterSlot;
  isHome: boolean;
}

/**
 * Hráč ve Správě hráčů. Proti veřejnému `Player` nese osobní údaje
 * a hlavně `rosters` — bez nich nejde poznat, jestli je hráč doopravdy
 * na soupisce sezóny, nebo jen má vyplněný `teamId`.
 */
export interface AdminPlayer {
  id: string;
  firstName: string;
  lastName: string;
  jersey: number;
  position: string;
  photoUrl?: string | null;
  phone?: string | null;
  birthdate?: string | null;
  teamId?: string | null;
  createdAt?: string;
  /** Účet, na kterém hráč visí. Hráč založený vedoucím přes pozvánku ho mít nemusí. */
  user?: { email: string } | null;
  team?: {
    id: string;
    name: string;
    abbr: string;
    isOpen?: boolean;
    regStatus?: RegStatus;
  } | null;
  payment?: {
    season: string;
    licStatus: PaymentStatus;
    superStatus: PaymentStatus;
    superLic: boolean;
  } | null;
  draftProfile?: { isActive: boolean; position?: string | null } | null;
  rosters: AdminPlayerRoster[];
}

export interface SupervisorRequest {
  id: string;
  type: RequestType;
  userId?: string | null;
  teamId?: string | null;
  matchId?: string | null;
  /** Kontakt na odesílatele — u nepřihlášeného jediná cesta, jak odpovědět. */
  email?: string | null;
  /** Stránka, ze které zpráva odešla. U hlášení chyby to nejdůležitější. */
  page?: string | null;
  body: string;
  note?: string | null;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
  user?: { id: string; email: string } | null;
}

export interface SupervisorDashboard {
  pendingReferees: number;
  pendingRequests: number;
  upcomingMatches: number;
  totalTeams: number;
  totalPlayers: number;
  unpaidLicenses: number;
  pendingTeams: number;
  appealingTeams: number;
  /** Zdraví párování bankovních převodů. Chybí na starším backendu. */
  bankSync?: {
    zdrave: boolean;
    lastOkAt: string | null;
    lastErrorAt: string | null;
    lastError: string | null;
    failStreak: number;
    tokenSet: boolean;
  };
}

export interface Manager {
  id: string;
  userId: string;
  teamId: string;
  team?: TeamLite;
}

export interface AuthUser {
  id: string;
  email: string;
  /**
   * Backend ho posílá v kořeni uživatele (`sanitizeUser`), protože supervisora
   * lze určit i přes SUPERVISOR_USER_IDS — tedy u účtu bez hráčského profilu.
   */
  isSupervisor?: boolean;
  /**
   * Má účet nastavené heslo? Účty založené přes Google nebo Apple ho nemají —
   * pak se v nastavení neptáme na současné heslo, jen nabídneme jeho vytvoření.
   */
  hasPassword?: boolean;
  player?: Player | null;
  referee?: Referee | null;
  manager?: Manager[];
}

export interface SearchResults {
  players: Player[];
  teams: TeamLite[];
  referees: Referee[];
}

export interface DivisionRow {
  division: string;
  conference?: string | null;
  _count?: { _all?: number };
}

export interface FixturePreview {
  teams: number;
  matches: number;
  rounds: number;
  fixtures: { round: number; homeTeam: TeamLite; awayTeam: TeamLite }[];
}

/* ---------------- Soutěžní struktura: liga → konference → divize ---------------- */

export interface LeagueDivision {
  id: string;
  conferenceId: string;
  name: string;
  /** Jen pro supervisora — počty týmů nejsou veřejný údaj. */
  teamCount?: number;
}

export interface LeagueConference {
  id: string;
  leagueId: string;
  name: string;
  divisions: LeagueDivision[];
  teamCount?: number;
}

export interface LeagueNode {
  id: string;
  season: string;
  name: string;
  level: number;
  conferences: LeagueConference[];
  teamCount?: number;
}

export interface LeagueTree {
  season: string;
  leagues: LeagueNode[];
}

export interface TeamPlacement {
  leagueId: string;
  conferenceId?: string | null;
  divisionId?: string | null;
  league?: { id: string; name: string } | null;
  conference?: { id: string; name: string } | null;
  division?: { id: string; name: string } | null;
}

/** Tým přihlášený do sezóny; `placement: null` = přihlášený, ale nezařazený. */
export interface PlacedTeam extends TeamLite {
  regStatus?: RegStatus;
  _count?: { players?: number };
  placement: TeamPlacement | null;
}

export interface LeagueTeams {
  season: string;
  teams: PlacedTeam[];
}


/* ==================== CHAT A PANDA ==================== */

/**
 * Jak se autor ukáže v chatu.
 *
 * **Fotka se drží u hráče, ne u zprávy** — backend ji proto posílá u autora
 * a ne uvnitř zprávy. Změna profilovky se tím projeví i u starých zpráv.
 * `iniciely` a `barva` počítá backend z id, aby web i pozdější appka
 * ukazovaly totéž.
 */
export interface ChatAuthor {
  id: string | null;
  jmeno: string;
  /** Panda nemá hráčský profil a má vlastní pevný avatar. */
  panda: boolean;
  photoUrl: string | null;
  iniciely?: string;
  barva?: string;
  barvaTextu?: string;
}

export type ChatKind = "TEAM" | "DIRECT" | "PANDA" | "SUPPORT";

export interface ChatMessage {
  id: string;
  conversationId: string;
  kind: "TEXT" | "SYSTEM" | "CARD";
  /** PROVOZNI se vypnout nedá — sestava, platba, uzávěrka. */
  class: "PROVOZNI" | "SPOLECENSKA";
  body: string | null;
  smazano: boolean;
  upraveno: boolean;
  payload?: unknown;
  replyToId?: string | null;
  createdAt: string;
  odSupervisora: boolean;
  autor: ChatAuthor;
  prilohy: { id: string; url: string; thumbUrl: string; width: number; height: number }[];
  reakce: { emoji: string; playerId: string }[];
}

export interface ChatConversation {
  id: string;
  kind: ChatKind;
  teamId: string | null;
  /** Název skládá backend — vlákno s ligou se jmenuje jinak hráči a jinak supervisorovi. */
  nazev: string;
  protejsek: ChatAuthor | null;
  /** Čeká na odpověď ligy. Shodí to až odpověď supervisora. */
  cekaNaLigu: boolean;
  dueAt: string | null;
  lastMessageAt: string;
  neprectene: number;
  nahled: string | null;
}

export interface TeamConversation {
  id: string;
  kind: ChatKind;
  clenove: ChatAuthor[];
  spravujeClenstvi: boolean;
}

export type UcastStav = "HRAJU" | "NEMUZU" | "MLCI";

/** Stav sestavy jednoho týmu na zápas — „7/9 a chybí brankář". */
export interface MatchSignups {
  matchId: string;
  teamId: string;
  datum: string;
  uzaverka: string;
  uzavreno: boolean;
  pocet: number;
  potreba: number;
  stav: string;
  brankari: number;
  chybiBrankar: boolean;
  sejdeSe: boolean;
  seznam: (ChatAuthor & { slot: "GOALKEEPER" | "FIELD"; stav: UcastStav })[];
}
