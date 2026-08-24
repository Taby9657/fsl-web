// Typy odpovídající Prisma schématu backendu (fsl-backhand)

export type MatchStatus = "UPCOMING" | "LIVE" | "DONE" | "CANCELLED";
export type PaymentStatus = "PENDING" | "PAID" | "OVERDUE" | "WAIVED";
export type RefereeLevel = "A" | "B" | "C";
export type RefereeStatus = "PENDING" | "APPROVED" | "REJECTED";
export type RegStatus = "PENDING" | "APPROVED" | "REJECTED" | "APPEALING";
export type DraftOfferStatus = "PENDING" | "ACCEPTED" | "REJECTED" | "EXPIRED";
export type RequestType =
  | "MATCH_TRANSCRIPT"
  | "PLAYER_DISPUTE"
  | "LICENSE_ISSUE"
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
  homeFeePaid?: boolean;
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

export interface SupervisorRequest {
  id: string;
  type: RequestType;
  userId?: string | null;
  teamId?: string | null;
  matchId?: string | null;
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
