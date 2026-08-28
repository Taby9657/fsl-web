import axios, { AxiosError } from "axios";
import { getToken, clearToken } from "./token";
import type {
  AppNotification,
  AuthUser,
  BankTransaction,
  DivisionRow,
  DraftProfile,
  FixturePreview,
  Highlight,
  Match,
  MyStats,
  Player,
  PlayerPayment,
  Referee,
  RefereeStatRow,
  ScorerRow,
  SearchResults,
  SupervisorDashboard,
  SupervisorRequest,
  TableRow,
  Team,
  TeamLite,
  TeamPayment,
} from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  "https://fsl-backhand-production.up.railway.app/api";

export const api = axios.create({
  baseURL: API_URL,
  timeout: 20_000,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/** Mapování HTTP kódů na česká hlášení – shodné s mobilní aplikací. */
const ERROR_MESSAGES: Record<number, string> = {
  400: "Neplatný požadavek – zkontroluj zadané údaje.",
  401: "Nejsi přihlášen nebo platnost relace vypršela.",
  403: "Nemáš oprávnění k této akci.",
  404: "Požadovaný záznam nebyl nalezen.",
  409: "Konflikt – záznam již existuje nebo byl změněn.",
  422: "Zadané údaje nejsou platné.",
  429: "Příliš mnoho požadavků – počkej chvíli a zkus to znovu.",
  500: "Chyba serveru – zkus to znovu za okamžik.",
  503: "Služba je dočasně nedostupná.",
};

/** Voláno při 401 – nastavuje se z auth storu, aby nevznikla cyklická závislost. */
let onUnauthorized: (() => void) | null = null;
export function setUnauthorizedHandler(fn: () => void) {
  onUnauthorized = fn;
}

api.interceptors.response.use(
  (res) => res,
  (err: AxiosError<{ error?: string }>) => {
    if (err.response?.status === 401) {
      clearToken();
      onUnauthorized?.();
    }
    if (err.response && !err.response.data?.error) {
      err.response.data = err.response.data ?? {};
      err.response.data.error =
        ERROR_MESSAGES[err.response.status] ?? "Neočekávaná chyba.";
    }
    if (err.code === "ECONNABORTED" || !err.response) {
      err.message =
        "Nepodařilo se připojit k serveru. Zkontroluj připojení k internetu.";
    }
    return Promise.reject(err);
  },
);

/** Vytáhne čitelnou chybovou hlášku z libovolné chyby. */
export function errMsg(e: unknown, fallback = "Něco se pokazilo."): string {
  const ax = e as AxiosError<{ error?: string }>;
  return ax?.response?.data?.error ?? ax?.message ?? fallback;
}

/* ==================== SERVER-SIDE FETCH (veřejná data, SSR) ==================== */

export async function publicFetch<T>(
  path: string,
  params?: Record<string, string | number | undefined>,
  revalidate = 60,
): Promise<T | null> {
  const qs = params
    ? "?" +
      new URLSearchParams(
        Object.entries(params)
          .filter(([, v]) => v !== undefined && v !== "")
          .map(([k, v]) => [k, String(v)]),
      ).toString()
    : "";
  try {
    const res = await fetch(`${API_URL}${path}${qs}`, {
      next: { revalidate },
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return null;
    return (await res.json()) as T;
  } catch {
    return null;
  }
}

/* ==================== AUTH ==================== */
export const authApi = {
  google: (idToken: string) =>
    api.post<{ token: string; user: AuthUser }>("/auth/google", { idToken }),
  apple: (identityToken: string, firstName?: string, lastName?: string, email?: string) =>
    api.post<{ token: string; user: AuthUser }>("/auth/apple", {
      identityToken,
      firstName,
      lastName,
      email,
    }),
  me: () => api.get<{ user: AuthUser }>("/auth/me"),
  logout: () => api.post("/auth/logout"),
};

/* ==================== TÝMY ==================== */
export const teamsApi = {
  list: () => api.get<Team[]>("/teams"),
  get: (id: string) => api.get<Team>(`/teams/${id}`),
  divisions: () => api.get<DivisionRow[]>("/teams/divisions"),
  create: (data: Record<string, unknown>) =>
    api.post<{ team: Team; inviteCode: string }>("/teams", data),
  update: (id: string, data: Record<string, unknown>) => api.put<Team>(`/teams/${id}`, data),
  uploadLogo: (id: string, file: File) => {
    const form = new FormData();
    form.append("logo", file);
    return api.post<Team>(`/teams/${id}/logo`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  invite: (id: string) => api.get<{ code: string }>(`/teams/${id}/invite`),
  join: (code: string) => api.post<{ team: TeamLite }>(`/teams/join/${code}`),
  appeal: (id: string, appeal: string) => api.put<Team>(`/teams/${id}/appeal`, { appeal }),
};

/* ==================== HRÁČI ==================== */
export const playersApi = {
  list: (params?: Record<string, unknown>) => api.get<Player[]>("/players", { params }),
  get: (id: string) => api.get<Player>(`/players/${id}`),
  create: (data: Record<string, unknown>) => api.post<Player>("/players", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<Player>(`/players/${id}`, data),
  leaveTeam: (id: string) => api.post(`/players/${id}/leave-team`),
  removeFromTeam: (playerId: string, teamId: string) =>
    api.delete(`/players/${playerId}/team/${teamId}`),
  myStats: (season?: string) =>
    api.get<MyStats>("/players/my/stats", { params: { season } }),
  uploadPhoto: (id: string, file: File) => {
    const form = new FormData();
    form.append("photo", file);
    return api.post<Player>(`/players/${id}/photo`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

/* ==================== ZÁPASY ==================== */
export const matchesApi = {
  list: (params?: Record<string, unknown>) => api.get<Match[]>("/matches", { params }),
  bracket: (division?: string, season?: string) =>
    api.get<Record<string, Match[]>>("/matches/bracket", { params: { division, season } }),
  get: (id: string) => api.get<Match>(`/matches/${id}`),
  create: (data: Record<string, unknown>) => api.post<Match>("/matches", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<Match>(`/matches/${id}`, data),
  addEvent: (id: string, data: Record<string, unknown>) =>
    api.post(`/matches/${id}/events`, data),
  deleteEvent: (id: string, eventId: string) =>
    api.delete(`/matches/${id}/events/${eventId}`),
  startMatch: (id: string) => api.post(`/matches/${id}/start`),
  endMatch: (id: string) => api.post(`/matches/${id}/end`),
  lineup: (
    matchId: string,
    teamId: string,
    players: { playerId: string; isGoalkeeper: boolean }[],
    force = false,
  ) => api.put(`/matches/${matchId}/lineup/${teamId}`, { players, force }),
  confirmLineup: (matchId: string, teamId: string) =>
    api.post(`/matches/${matchId}/lineup/${teamId}/confirm`),
  postmatch: (matchId: string, teamId: string, data: Record<string, unknown>) =>
    api.put(`/matches/${matchId}/postmatch/${teamId}`, data),
  submitPostmatch: (matchId: string, teamId: string) =>
    api.post(`/matches/${matchId}/postmatch/${teamId}/submit`),
};

/* ==================== ROZHODČÍ ==================== */
export const refereesApi = {
  list: (params?: Record<string, unknown>) => api.get<Referee[]>("/referees", { params }),
  get: (id: string) => api.get<Referee>(`/referees/${id}`),
  register: (data: Record<string, unknown>) => api.post<Referee>("/referees", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<Referee>(`/referees/${id}`, data),
  futureMatches: (id: string) => api.get<Match[]>(`/referees/${id}/future-matches`),
  rate: (id: string, matchId: string, rating: number) =>
    api.post(`/referees/${id}/rate`, { matchId, rating }),
  uploadPhoto: (id: string, file: File) => {
    const form = new FormData();
    form.append("photo", file);
    return api.post<Referee>(`/referees/${id}/photo`, form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
};

/* ==================== PLATBY ==================== */
export const paymentsApi = {
  me: () =>
    api.get<{
      playerPayment: PlayerPayment | null;
      teamPayment: TeamPayment | TeamPayment[] | null;
    }>("/payments/me"),
  playerLicense: () => api.post<{ url: string }>("/payments/player-license"),
  superLicense: () => api.post<{ url: string }>("/payments/super-license"),
  homeFee: (matchId: string) => api.post<{ url: string }>("/payments/home-fee", { matchId }),
  teamRegistration: (teamId: string) =>
    api.post<{ url: string }>("/payments/team-registration", { teamId }),
  /** type: player-license | super-license | team-reg | home-fee */
  qr: (type: string, id: string) =>
    api.get<{ spayd: string; vs: string; amount: number; iban: string; message: string }>(
      `/payments/qr/${type}/${id}`,
    ),
  vsPlayer: (id: string) => api.get<{ variableSymbol: string }>(`/payments/vs/player/${id}`),
  vsTeam: (id: string) => api.get<{ variableSymbol: string }>(`/payments/vs/team/${id}`),
};

/* ==================== STATISTIKY ==================== */
export const statsApi = {
  seasons: () => api.get<string[]>("/stats/seasons"),
  table: (division?: string, season?: string) =>
    api.get<TableRow[]>("/stats/table", { params: { division, season } }),
  scorers: (division?: string, season?: string) =>
    api.get<ScorerRow[]>("/stats/scorers", { params: { division, season } }),
  assisters: (division?: string, season?: string) =>
    api.get<ScorerRow[]>("/stats/assisters", { params: { division, season } }),
  points: (division?: string, season?: string) =>
    api.get<ScorerRow[]>("/stats/points", { params: { division, season } }),
  mvp: (division?: string, season?: string) =>
    api.get<ScorerRow[]>("/stats/mvp", { params: { division, season } }),
  referees: (season?: string) =>
    api.get<RefereeStatRow[]>("/stats/referees", { params: { season } }),
  exportCsv: (type: string, division?: string, season?: string) =>
    api.get<string>("/stats/export", {
      params: { type, division, season },
      responseType: "text",
      headers: { Accept: "text/csv" },
    }),
};

/* ==================== OZNÁMENÍ ==================== */
export const notificationsApi = {
  list: () => api.get<AppNotification[]>("/notifications"),
  readAll: () => api.put("/notifications/read-all"),
  read: (id: string) => api.put(`/notifications/${id}/read`),
};

/* ==================== HIGHLIGHTS ==================== */
export const highlightsApi = {
  list: () => api.get<Highlight[]>("/highlights"),
  create: (data: Record<string, unknown>) => api.post<Highlight>("/highlights", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.put<Highlight>(`/highlights/${id}`, data),
  delete: (id: string) => api.delete(`/highlights/${id}`),
  uploadVideo: (id: string, file: File) => {
    const form = new FormData();
    form.append("video", file);
    return api.post<Highlight>(`/highlights/${id}/video`, form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 300_000,
    });
  },
};

/* ==================== DRAFT ==================== */
export const draftApi = {
  list: () => api.get<DraftProfile[]>("/draft"),
  me: () => api.get<DraftProfile | null>("/draft/me"),
  getProfile: (playerId: string) => api.get<DraftProfile>(`/draft/${playerId}`),
  createProfile: (data: Record<string, unknown>) =>
    api.post<DraftProfile>("/draft/profile", data),
  updateProfile: (data: Record<string, unknown>) =>
    api.put<DraftProfile>("/draft/profile", data),
  deleteProfile: () => api.delete("/draft/profile"),
  uploadVideo: (file: File) => {
    const form = new FormData();
    form.append("video", file);
    return api.post<{ id: string; url: string }>("/draft/profile/video", form, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 300_000,
    });
  },
  deleteVideo: (videoId: string) => api.delete(`/draft/video/${videoId}`),
  makeOffer: (playerId: string, data: { message?: string }) =>
    api.post<{ offer: import("./types").DraftOffer; windowExpiresAt: string; isFirst: boolean }>(
      `/draft/${playerId}/offer`,
      data,
    ),
  acceptOffer: (playerId: string, offerId: string) =>
    api.post<{ ok: boolean; teamId: string; teamName: string }>(
      `/draft/${playerId}/offer/${offerId}/accept`,
    ),
  rejectOffer: (playerId: string, offerId: string) =>
    api.post(`/draft/${playerId}/offer/${offerId}/reject`),
};

/* ==================== VYHLEDÁVÁNÍ ==================== */
export const searchApi = {
  search: (q: string) => api.get<SearchResults>("/search", { params: { q } }),
};

/* ==================== SUPERVISOR ==================== */
export const supervisorApi = {
  dashboard: () => api.get<SupervisorDashboard>("/supervisor/dashboard"),
  referees: (status = "PENDING") =>
    api.get<Referee[]>("/supervisor/referees", { params: { status } }),
  approveRef: (id: string, level: string) => api.put(`/referees/${id}/approve`, { level }),
  rejectRef: (id: string, reason?: string) => api.put(`/referees/${id}/reject`, { reason }),
  matches: (params?: Record<string, unknown>) =>
    api.get<Match[]>("/supervisor/matches", { params }),
  assignReferee: (matchId: string, refereeId: string) =>
    api.post<Match>(`/supervisor/matches/${matchId}/assign-referee`, { refereeId }),
  deleteMatch: (matchId: string) => api.delete(`/supervisor/matches/${matchId}`),
  payments: (params?: Record<string, unknown>) =>
    api.get<{ players: PlayerPayment[]; teams: TeamPayment[] }>("/supervisor/payments", {
      params,
    }),
  updatePayment: (playerId: string, data: Record<string, unknown>) =>
    api.put(`/payments/player/${playerId}`, data),
  updateTeamPayment: (teamId: string, data: Record<string, unknown>) =>
    api.put(`/payments/team/${teamId}`, data),
  bankSync: (days = 30) =>
    api.post<{
      matched: { txId: string; vs?: string; amount?: number }[];
      skipped: { txId: string; reason: string; vs?: string }[];
      errors: { txId: string; error: string }[];
    }>("/payments/bank-sync", { days }),
  bankTransactions: (params?: Record<string, unknown>) =>
    api.get<BankTransaction[]>("/payments/bank-transactions", { params }),

  teams: (params?: Record<string, unknown>) => api.get<Team[]>("/supervisor/teams", { params }),
  createTeam: (data: Record<string, unknown>) => api.post<Team>("/supervisor/teams", data),
  updateTeam: (id: string, data: Record<string, unknown>) =>
    api.put<Team>(`/supervisor/teams/${id}`, data),
  deleteTeam: (id: string) => api.delete(`/supervisor/teams/${id}`),
  approveTeam: (id: string, note?: string) =>
    api.put<Team>(`/supervisor/teams/${id}/approve`, { note }),
  rejectTeam: (id: string, reason: string) =>
    api.put<Team>(`/supervisor/teams/${id}/reject`, { reason }),
  divisions: () => api.get<DivisionRow[]>("/teams/divisions"),
  conferences: () => api.get<TeamLite[]>("/supervisor/conferences"),

  previewFixtures: (data: Record<string, unknown>) =>
    api.post<FixturePreview>("/supervisor/fixtures/preview", data),
  generateFixtures: (data: Record<string, unknown>) =>
    api.post<{ created: number; rounds: number; division?: string; conference?: string }>(
      "/supervisor/fixtures/generate",
      data,
    ),

  newSeason: (newSeason: string, cancelPending?: boolean) =>
    api.post<{
      oldSeason: string;
      newSeason: string;
      cancelledMatches: number;
      resetLicenses: number;
      resetTeams: number;
      message: string;
    }>("/supervisor/new-season", { newSeason, cancelPending }),

  requests: (status?: string) =>
    api.get<SupervisorRequest[]>("/supervisor/requests", {
      params: status ? { status } : {},
    }),
  updateRequest: (id: string, data: Record<string, unknown>) =>
    api.put<SupervisorRequest>(`/supervisor/requests/${id}`, data),
  notify: (userIds: string[], title: string, body: string, screen?: string) =>
    api.post<{ sent: number }>("/supervisor/notify", { userIds, title, body, screen }),
};

/* ==================== ŽÁDOSTI (běžní uživatelé) ==================== */
export const requestsApi = {
  create: (data: { type: string; body: string; teamId?: string; matchId?: string }) =>
    api.post<SupervisorRequest>("/requests", data),
};
