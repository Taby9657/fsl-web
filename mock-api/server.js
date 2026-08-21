/* Mock FSL API pro lokální vývoj webu. Port 4000. */
const express = require("express");
const cors = require("cors");
const D = require("./data");

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const PORT = process.env.PORT || 4000;
const api = express.Router();

/* ---------- fiktivní přihlášený uživatel ---------- */
const ME_PLAYER = D.PLAYERS.find((p) => p.teamId === "t1");
ME_PLAYER.isSupervisor = true;

function meUser() {
  return {
    id: "me",
    email: "j.tabasek96@gmail.com",
    player: { ...ME_PLAYER, team: D.teamLite("t1") },
    referee: D.REFEREES[0],
    manager: [{ id: "mg1", userId: "me", teamId: "t1", team: D.teamLite("t1") }],
  };
}

const authed = (req) => !!req.headers.authorization;
const needAuth = (req, res, next) =>
  authed(req) ? next() : res.status(401).json({ error: "Nejsi přihlášen." });

/* ---------- AUTH ---------- */
api.post("/auth/google", (req, res) =>
  res.json({ token: "mock-token", user: meUser() }),
);
api.post("/auth/apple", (req, res) =>
  res.json({ token: "mock-token", user: meUser() }),
);
api.post("/auth/dev-login", (req, res) =>
  res.json({ token: "mock-token", user: meUser() }),
);
api.get("/auth/me", needAuth, (req, res) => res.json({ user: meUser() }));
api.post("/auth/logout", needAuth, (req, res) => res.json({ message: "ok" }));
api.put("/auth/push-token", needAuth, (req, res) => res.json({ ok: true }));

/* ---------- TÝMY ---------- */
api.get("/teams", (req, res) => res.json(D.TEAMS.map((t) => D.teamLite(t.id))));
api.get("/teams/divisions", (req, res) => {
  const map = {};
  D.TEAMS.forEach((t) => {
    const k = `${t.division}|${t.conference ?? ""}`;
    map[k] ??= { division: t.division, conference: t.conference, _count: { _all: 0 } };
    map[k]._count._all++;
  });
  res.json(Object.values(map));
});
api.get("/teams/:id", (req, res) => {
  const t = D.TEAMS.find((x) => x.id === req.params.id);
  if (!t) return res.status(404).json({ error: "Tým nenalezen" });
  res.json({
    ...t,
    players: D.PLAYERS.filter((p) => p.teamId === t.id).sort((a, b) => a.jersey - b.jersey),
    managers: [{ id: "mg1", userId: "me", user: { id: "me", email: "vedouci@fsl.cz" } }],
    payments: { id: `tp${t.id}`, season: D.SEASON, amount: 10000, status: t.id === "t1" ? "PAID" : "PENDING", variableSymbol: `3000${t.id.slice(1)}` },
    _count: { players: D.PLAYERS.filter((p) => p.teamId === t.id).length },
  });
});
api.get("/teams/:id/invite", needAuth, (req, res) =>
  res.json({ code: "FSL-BE-7X2Q" }),
);
api.post("/teams/join/:code", needAuth, (req, res) => {
  if ((req.params.code || "").length < 6)
    return res.status(400).json({ error: "Neplatný pozvánkový kód" });
  res.json({ team: D.teamLite("t1") });
});
api.post("/teams", needAuth, (req, res) =>
  res.status(201).json({ team: { id: "tNew", ...req.body }, inviteCode: "FSL-NEW-1234" }),
);
api.put("/teams/:id/appeal", needAuth, (req, res) => {
  const t = D.TEAMS.find((x) => x.id === req.params.id);
  Object.assign(t, { regStatus: "APPEALING", regAppeal: req.body.appeal, regAppealAt: new Date().toISOString() });
  res.json(t);
});

/* ---------- HRÁČI ---------- */
api.get("/players", (req, res) => {
  let list = D.PLAYERS;
  if (req.query.teamId) list = list.filter((p) => p.teamId === req.query.teamId);
  res.json(list.map(D.playerLite));
});
api.get("/players/my/stats", needAuth, (req, res) => {
  const stats = D.playerStats().find((s) => s.player.id === ME_PLAYER.id) ?? { goals: 4, assists: 6, votes: 1 };
  const done = D.MATCHES.filter((m) => m.status === "DONE").slice(0, 4);
  res.json({
    goals: stats.goals ?? 0,
    assists: stats.assists ?? 0,
    points: (stats.goals ?? 0) + (stats.assists ?? 0),
    penalties: 2,
    mvp: stats.votes ?? 0,
    recentGoals: done.slice(0, 3).map((m) => ({ matchId: m.id, minute: 14, homeTeam: m.homeTeam, awayTeam: m.awayTeam })),
    recentAssists: done.slice(1, 3).map((m) => ({ matchId: m.id, minute: 32, homeTeam: m.homeTeam, awayTeam: m.awayTeam })),
  });
});
api.get("/players/:id", (req, res) => {
  const p = D.PLAYERS.find((x) => x.id === req.params.id);
  if (!p) return res.status(404).json({ error: "Hráč nenalezen" });
  const goals = [], assists = [], mvpVotes = [];
  D.MATCHES.forEach((m) => {
    (m.events || []).forEach((e) => {
      if (e.type === "GOAL" && e.scorerId === p.id) goals.push({ ...e, match: m });
      if (e.type === "GOAL" && e.assistId === p.id) assists.push({ ...e, match: m });
    });
    (m.postmatches || []).forEach((pm) => {
      if (pm.opponentMvpId === p.id) mvpVotes.push(pm);
    });
  });
  res.json({ ...p, team: p.teamId ? D.teamLite(p.teamId) : null, goals, assists, mvpVotes });
});
api.post("/players", needAuth, (req, res) => res.status(201).json({ id: "pNew", ...req.body }));
api.put("/players/:id", needAuth, (req, res) => res.json({ id: req.params.id, ...req.body }));
api.post("/players/:id/leave-team", needAuth, (req, res) => res.json({ ok: true }));
api.delete("/players/:playerId/team/:teamId", needAuth, (req, res) => res.json({ ok: true }));

/* ---------- ZÁPASY ---------- */
api.get("/matches/bracket", (req, res) => {
  const out = {};
  D.MATCHES.filter((m) => m.round != null && (!req.query.division || m.division === req.query.division))
    .forEach((m) => {
      out[m.round] ??= [];
      out[m.round].push(m);
    });
  res.json(out);
});
api.get("/matches", (req, res) => {
  let list = [...D.MATCHES];
  const { status, division, teamId, homeTeamId, limit } = req.query;
  if (status) list = list.filter((m) => m.status === status);
  if (division) list = list.filter((m) => m.division === division);
  if (teamId) list = list.filter((m) => m.homeTeamId === teamId || m.awayTeamId === teamId);
  if (homeTeamId) list = list.filter((m) => m.homeTeamId === homeTeamId);
  list.sort((a, b) =>
    status === "UPCOMING" ? new Date(a.date) - new Date(b.date) : new Date(b.date) - new Date(a.date),
  );
  if (limit) list = list.slice(0, Number(limit));
  res.json(list);
});
api.get("/matches/:id", (req, res) => {
  const m = D.MATCHES.find((x) => x.id === req.params.id);
  if (!m) return res.status(404).json({ error: "Zápas nenalezen" });
  res.json(m);
});
api.post("/matches/:id/start", needAuth, (req, res) => {
  const m = D.MATCHES.find((x) => x.id === req.params.id);
  m.status = "LIVE";
  res.json(m);
});
api.post("/matches/:id/end", needAuth, (req, res) => {
  const m = D.MATCHES.find((x) => x.id === req.params.id);
  m.status = "DONE";
  res.json(m);
});
api.post("/matches/:id/events", needAuth, (req, res) => {
  const m = D.MATCHES.find((x) => x.id === req.params.id);
  const scorer = D.PLAYERS.find((p) => p.id === req.body.scorerId);
  const assist = D.PLAYERS.find((p) => p.id === req.body.assistId);
  const penalty = D.PLAYERS.find((p) => p.id === req.body.penaltyId);
  const ev = {
    id: `ev${Date.now()}`, matchId: m.id, ...req.body,
    scorer: D.playerLite(scorer), assist: D.playerLite(assist), penalty: D.playerLite(penalty),
  };
  m.events.push(ev);
  if (ev.type === "GOAL") {
    if (ev.teamId === m.homeTeamId) m.homeScore++;
    else m.awayScore++;
  }
  res.status(201).json(ev);
});
api.delete("/matches/:id/events/:eventId", needAuth, (req, res) => {
  const m = D.MATCHES.find((x) => x.id === req.params.id);
  const i = m.events.findIndex((e) => e.id === req.params.eventId);
  if (i >= 0) {
    const [ev] = m.events.splice(i, 1);
    if (ev.type === "GOAL") {
      if (ev.teamId === m.homeTeamId) m.homeScore = Math.max(0, m.homeScore - 1);
      else m.awayScore = Math.max(0, m.awayScore - 1);
    }
  }
  res.json({ ok: true });
});
api.put("/matches/:id/lineup/:teamId", needAuth, (req, res) => {
  const players = req.body.players ?? [];
  const unlicensed = players
    .map((x) => D.PLAYERS.find((p) => p.id === x.playerId))
    .filter((p) => p && !p.licensed);
  if (unlicensed.length && !req.body.force) {
    return res.status(422).json({
      error: "Někteří hráči nemají platnou licenci",
      code: "UNLICENSED_PLAYERS",
      unlicensed: unlicensed.map((p) => ({ id: p.id, firstName: p.firstName, lastName: p.lastName, jersey: p.jersey })),
    });
  }
  res.json({ ok: true, count: players.length });
});
api.put("/matches/:id/postmatch/:teamId", needAuth, (req, res) => res.json({ ok: true }));
api.post("/matches/:id/postmatch/:teamId/submit", needAuth, (req, res) => res.json({ ok: true }));
api.post("/matches", needAuth, (req, res) => res.status(201).json({ id: `mNew${Date.now()}`, ...req.body }));
api.put("/matches/:id", needAuth, (req, res) => res.json({ id: req.params.id, ...req.body }));

/* ---------- ROZHODČÍ ---------- */
api.get("/referees", (req, res) => {
  let list = D.REFEREES;
  if (req.query.status) list = list.filter((r) => r.status === req.query.status);
  res.json(list);
});
api.get("/referees/:id/future-matches", (req, res) =>
  res.json(D.MATCHES.filter((m) => m.refereeId === req.params.id && ["UPCOMING", "LIVE"].includes(m.status))),
);
api.get("/referees/:id", needAuth, (req, res) => {
  const r = D.REFEREES.find((x) => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: "Rozhodčí nenalezen" });
  res.json({
    ...r,
    matches: D.MATCHES.filter((m) => m.refereeId === r.id),
    ratings: [
      { id: "rr1", matchId: "m1", refereeId: r.id, teamId: "t1", rating: 5, createdAt: D.iso(-5) },
      { id: "rr2", matchId: "m2", refereeId: r.id, teamId: "t2", rating: 4, createdAt: D.iso(-12) },
    ],
  });
});
api.post("/referees", needAuth, (req, res) => res.status(201).json({ id: "rNew", ...req.body, status: "PENDING", level: "C" }));
api.put("/referees/:id", needAuth, (req, res) => {
  const r = D.REFEREES.find((x) => x.id === req.params.id);
  Object.assign(r, req.body);
  res.json(r);
});
api.post("/referees/:id/rate", needAuth, (req, res) => res.json({ ok: true }));
api.put("/referees/:id/approve", needAuth, (req, res) => {
  const r = D.REFEREES.find((x) => x.id === req.params.id);
  Object.assign(r, { status: "APPROVED", level: req.body.level ?? "C" });
  res.json(r);
});
api.put("/referees/:id/reject", needAuth, (req, res) => {
  const r = D.REFEREES.find((x) => x.id === req.params.id);
  r.status = "REJECTED";
  res.json(r);
});

/* ---------- STATISTIKY ---------- */
api.get("/stats/seasons", (req, res) => res.json(D.SEASONS));
api.get("/stats/table", (req, res) => res.json(D.buildTable(req.query.division, req.query.season ?? D.SEASON)));
api.get("/stats/scorers", (req, res) =>
  res.json(D.playerStats(req.query.division).filter((x) => x.goals > 0).sort((a, b) => b.goals - a.goals).slice(0, 30)),
);
api.get("/stats/assisters", (req, res) =>
  res.json(D.playerStats(req.query.division).filter((x) => x.assists > 0).sort((a, b) => b.assists - a.assists).slice(0, 30)),
);
api.get("/stats/points", (req, res) =>
  res.json(D.playerStats(req.query.division).sort((a, b) => b.points - a.points).slice(0, 30)),
);
api.get("/stats/mvp", (req, res) =>
  res.json(D.playerStats(req.query.division).filter((x) => x.votes > 0).sort((a, b) => b.votes - a.votes).slice(0, 30)),
);
api.get("/stats/referees", (req, res) =>
  res.json(D.REFEREES.filter((r) => r.status === "APPROVED").map((r, i) => ({ referee: r, avg: 4.6 - i * 0.35, count: 12 - i * 3 }))),
);
api.get("/stats/export", needAuth, (req, res) => {
  res.type("text/csv").send("id;jmeno;prijmeni;tym\np1;Tomáš;Novák;BE\n");
});

/* ---------- VYHLEDÁVÁNÍ ---------- */
api.get("/search", (req, res) => {
  const q = String(req.query.q ?? "").trim().toLowerCase();
  if (q.length < 2) return res.json({ players: [], teams: [], referees: [] });
  const words = q.split(/\s+/);
  const match = (s) => words.every((w) => (s ?? "").toLowerCase().includes(w));
  res.json({
    players: D.PLAYERS.filter((p) => match(`${p.firstName} ${p.lastName}`)).slice(0, 10).map(D.playerLite),
    teams: D.TEAMS.filter((t) => match(t.name) || match(t.abbr)).slice(0, 10).map((t) => D.teamLite(t.id)),
    referees: D.REFEREES.filter((r) => match(`${r.firstName} ${r.lastName}`)).slice(0, 10),
  });
});

/* ---------- HIGHLIGHTS ---------- */
api.get("/highlights", (req, res) =>
  res.json([...D.HIGHLIGHTS].sort((a, b) => (b.pinned ? 1 : 0) - (a.pinned ? 1 : 0) || new Date(b.createdAt) - new Date(a.createdAt))),
);
api.post("/highlights", needAuth, (req, res) => {
  const h = { id: `h${Date.now()}`, createdAt: new Date().toISOString(), pinned: false, ...req.body };
  D.HIGHLIGHTS.unshift(h);
  res.status(201).json(h);
});
api.put("/highlights/:id", needAuth, (req, res) => {
  const h = D.HIGHLIGHTS.find((x) => x.id === req.params.id);
  Object.assign(h, req.body);
  res.json(h);
});
api.delete("/highlights/:id", needAuth, (req, res) => {
  const i = D.HIGHLIGHTS.findIndex((x) => x.id === req.params.id);
  if (i >= 0) D.HIGHLIGHTS.splice(i, 1);
  res.json({ ok: true });
});

/* ---------- DRAFT ---------- */
api.get("/draft", needAuth, (req, res) => res.json(D.DRAFT_PROFILES));
api.get("/draft/me", needAuth, (req, res) => res.json(null));
api.get("/draft/:playerId", needAuth, (req, res) => {
  const p = D.DRAFT_PROFILES.find((x) => x.playerId === req.params.playerId);
  if (!p) return res.status(404).json({ error: "Profil nenalezen" });
  res.json(p);
});
api.post("/draft/profile", needAuth, (req, res) => res.status(201).json({ id: "dpNew", isActive: true, videos: [], ...req.body }));
api.put("/draft/profile", needAuth, (req, res) => res.json({ id: "dpNew", isActive: true, videos: [], ...req.body }));
api.delete("/draft/profile", needAuth, (req, res) => res.json({ ok: true }));
api.post("/draft/:playerId/offer", needAuth, (req, res) => {
  const p = D.DRAFT_PROFILES.find((x) => x.playerId === req.params.playerId);
  const isFirst = (p?.offerCount ?? 0) === 0;
  const windowExpiresAt = D.iso(isFirst ? 3 : 1);
  if (p) {
    p.offerCount = (p.offerCount ?? 0) + 1;
    p.windowExpiresAt = windowExpiresAt;
    p.myTeamOffer = { id: `off${Date.now()}`, teamId: "t1", status: "PENDING", message: req.body.message, expiresAt: windowExpiresAt, isFirst, profileId: p.id, createdAt: new Date().toISOString(), team: D.teamLite("t1") };
  }
  res.json({ offer: p?.myTeamOffer, windowExpiresAt, isFirst });
});
api.post("/draft/:playerId/offer/:offerId/accept", needAuth, (req, res) =>
  res.json({ ok: true, teamId: "t1", teamName: "Benavidez Eagles" }),
);
api.post("/draft/:playerId/offer/:offerId/reject", needAuth, (req, res) => res.json({ ok: true }));

/* ---------- OZNÁMENÍ ---------- */
api.get("/notifications", needAuth, (req, res) => res.json(D.NOTIFICATIONS));
api.put("/notifications/read-all", needAuth, (req, res) => {
  D.NOTIFICATIONS.forEach((n) => (n.read = true));
  res.json({ ok: true });
});
api.put("/notifications/:id/read", needAuth, (req, res) => {
  const n = D.NOTIFICATIONS.find((x) => x.id === req.params.id);
  if (n) n.read = true;
  res.json({ ok: true });
});

/* ---------- PLATBY ---------- */
api.get("/payments/me", needAuth, (req, res) =>
  res.json({
    playerPayment: {
      id: "pp-me", season: D.SEASON, licFee: 300, licStatus: "PENDING", licPaidAt: null, licMethod: null,
      superLic: false, superFee: 300, superStatus: "PENDING", superPaidAt: null, variableSymbol: "1000042",
    },
    teamPayment: [{ id: "tp-t1", season: D.SEASON, amount: 10000, status: "PENDING", paidAt: null, variableSymbol: "3000001", team: D.teamLite("t1") }],
  }),
);
api.post("/payments/player-license", needAuth, (req, res) => res.json({ url: "https://checkout.stripe.com/mock" }));
api.post("/payments/super-license", needAuth, (req, res) => res.json({ url: "https://checkout.stripe.com/mock" }));
api.post("/payments/home-fee", needAuth, (req, res) => res.json({ url: "https://checkout.stripe.com/mock" }));
api.put("/payments/player/:playerId", needAuth, (req, res) => res.json({ ok: true }));
api.put("/payments/team/:teamId", needAuth, (req, res) => res.json({ ok: true }));
api.post("/payments/bank-sync", needAuth, (req, res) =>
  res.json({ matched: [{ txId: "tx1", vs: "1000042", amount: 300 }], skipped: [{ txId: "tx2", reason: "Neznámý variabilní symbol", vs: "999" }], errors: [] }),
);
api.get("/payments/bank-transactions", needAuth, (req, res) =>
  res.json([
    { id: "bt1", transactionId: "tx1", amount: 300, variableSymbol: "1000042", senderName: "Tomáš Novák", senderAccount: "123456789/0800", date: D.iso(-2), matched: true },
    { id: "bt2", transactionId: "tx2", amount: 10000, variableSymbol: "3000001", senderName: "Benavidez Eagles z.s.", senderAccount: "987654321/0100", date: D.iso(-5), matched: false },
  ]),
);

/* ---------- SUPERVISOR ---------- */
api.get("/supervisor/dashboard", needAuth, (req, res) =>
  res.json({
    pendingReferees: D.REFEREES.filter((r) => r.status === "PENDING").length,
    pendingRequests: D.REQUESTS.filter((r) => r.status === "PENDING").length,
    upcomingMatches: D.MATCHES.filter((m) => m.status === "UPCOMING").length,
    totalTeams: D.TEAMS.length,
    totalPlayers: D.PLAYERS.length,
    unpaidLicenses: D.PLAYERS.filter((p) => p.payment && p.payment.licStatus !== "PAID").length,
    pendingTeams: D.TEAMS.filter((t) => t.regStatus === "PENDING").length,
    appealingTeams: D.TEAMS.filter((t) => t.regStatus === "APPEALING").length,
  }),
);
api.get("/supervisor/referees", needAuth, (req, res) =>
  res.json(D.REFEREES.filter((r) => r.status === (req.query.status ?? "PENDING"))),
);
api.get("/supervisor/matches", needAuth, (req, res) => {
  let list = [...D.MATCHES];
  if (req.query.status) list = list.filter((m) => m.status === req.query.status);
  if (req.query.division) list = list.filter((m) => m.division === req.query.division);
  res.json(list.sort((a, b) => (a.round ?? 0) - (b.round ?? 0) || new Date(a.date) - new Date(b.date)));
});
api.post("/supervisor/matches/:id/assign-referee", needAuth, (req, res) => {
  const m = D.MATCHES.find((x) => x.id === req.params.id);
  m.refereeId = req.body.refereeId;
  m.referee = D.REFEREES.find((r) => r.id === req.body.refereeId);
  res.json(m);
});
api.delete("/supervisor/matches/:id", needAuth, (req, res) => {
  const i = D.MATCHES.findIndex((x) => x.id === req.params.id);
  if (i >= 0 && D.MATCHES[i].status !== "UPCOMING")
    return res.status(400).json({ error: "Lze smazat pouze naplánované zápasy" });
  if (i >= 0) D.MATCHES.splice(i, 1);
  res.json({ ok: true });
});
api.get("/supervisor/teams", needAuth, (req, res) => {
  let list = D.TEAMS.map((t) => ({
    ...t,
    _count: { players: D.PLAYERS.filter((p) => p.teamId === t.id).length },
    payments: { status: t.id === "t1" ? "PAID" : t.id === "t3" ? "OVERDUE" : "PENDING", season: D.SEASON, paidAt: null },
  }));
  if (req.query.regStatus) list = list.filter((t) => t.regStatus === req.query.regStatus);
  res.json(list);
});
api.post("/supervisor/teams", needAuth, (req, res) => {
  const t = { id: `t${D.TEAMS.length + 1}`, regStatus: "APPROVED", ...req.body, abbr: (req.body.abbr ?? "").toUpperCase() };
  D.TEAMS.push(t);
  res.status(201).json({ ...t, _count: { players: 0 } });
});
api.put("/supervisor/teams/:id", needAuth, (req, res) => {
  const t = D.TEAMS.find((x) => x.id === req.params.id);
  Object.assign(t, req.body);
  res.json({ ...t, _count: { players: D.PLAYERS.filter((p) => p.teamId === t.id).length } });
});
api.delete("/supervisor/teams/:id", needAuth, (req, res) => {
  const t = D.TEAMS.find((x) => x.id === req.params.id);
  const n = D.PLAYERS.filter((p) => p.teamId === t.id).length;
  if (n) return res.status(400).json({ error: `Tým má ${n} hráčů – nejdříve je přesuň nebo odstraň` });
  D.TEAMS.splice(D.TEAMS.indexOf(t), 1);
  res.json({ ok: true });
});
api.put("/supervisor/teams/:id/approve", needAuth, (req, res) => {
  const t = D.TEAMS.find((x) => x.id === req.params.id);
  Object.assign(t, { regStatus: "APPROVED", regNote: req.body.note ?? null, regAppeal: null, regAppealAt: null });
  res.json({ ...t, _count: { players: D.PLAYERS.filter((p) => p.teamId === t.id).length } });
});
api.put("/supervisor/teams/:id/reject", needAuth, (req, res) => {
  if (!req.body.reason) return res.status(400).json({ error: "Důvod zamítnutí je povinný" });
  const t = D.TEAMS.find((x) => x.id === req.params.id);
  Object.assign(t, { regStatus: "REJECTED", regNote: req.body.reason });
  res.json({ ...t, _count: { players: D.PLAYERS.filter((p) => p.teamId === t.id).length } });
});
api.get("/supervisor/conferences", needAuth, (req, res) =>
  res.json(D.TEAMS.map((t) => ({ id: t.id, name: t.name, abbr: t.abbr, color: t.color, division: t.division, conference: t.conference, venue: t.venue }))),
);
api.get("/supervisor/payments", needAuth, (req, res) =>
  res.json({
    players: D.PLAYERS.filter((p) => p.payment).slice(0, 40).map((p) => ({ ...p.payment, player: D.playerLite(p) })),
    teams: D.TEAMS.map((t) => ({ id: `tp${t.id}`, season: D.SEASON, amount: 10000, status: t.id === "t1" ? "PAID" : "PENDING", variableSymbol: `3000${t.id.slice(1)}`, team: D.teamLite(t.id) })),
  }),
);
api.get("/supervisor/requests", needAuth, (req, res) =>
  res.json(D.REQUESTS.filter((r) => !req.query.status || r.status === req.query.status)),
);
api.put("/supervisor/requests/:id", needAuth, (req, res) => {
  const r = D.REQUESTS.find((x) => x.id === req.params.id);
  Object.assign(r, req.body, { updatedAt: new Date().toISOString() });
  res.json(r);
});
api.post("/supervisor/notify", needAuth, (req, res) => res.json({ sent: (req.body.userIds ?? []).length }));
api.post("/supervisor/new-season", needAuth, (req, res) => {
  if (!/^\d{4}\/\d{2}$/.test(req.body.newSeason ?? ""))
    return res.status(400).json({ error: "Neplatný formát sezóny" });
  res.json({
    oldSeason: D.SEASON, newSeason: req.body.newSeason, cancelledMatches: req.body.cancelPending ? 8 : 0,
    resetLicenses: 96, resetTeams: 10,
    message: `Sezóna přepnuta na ${req.body.newSeason}. Resetováno 96 licencí a 10 týmových plateb.`,
  });
});

function roundRobin(teamIds, double) {
  const list = [...teamIds];
  if (list.length % 2) list.push(null);
  const n = list.length;
  const rounds = n - 1;
  const fixtures = [];
  let rotation = [...list];
  for (let r = 1; r <= rounds; r++) {
    for (let i = 0; i < n / 2; i++) {
      const a = rotation[i], b = rotation[n - 1 - i];
      if (a && b) fixtures.push({ round: r, home: a, away: b });
    }
    const last = rotation.pop();
    rotation.splice(1, 0, last);
  }
  if (double) {
    fixtures.slice().forEach((f) => fixtures.push({ round: f.round + rounds, home: f.away, away: f.home }));
  }
  return { fixtures, rounds: double ? rounds * 2 : rounds };
}

api.post("/supervisor/fixtures/preview", needAuth, (req, res) => {
  let ids = req.body.teamIds;
  if (!ids?.length && req.body.division) ids = D.TEAMS.filter((t) => t.division === req.body.division).map((t) => t.id);
  if (!ids?.length && req.body.conference) ids = D.TEAMS.filter((t) => t.conference === req.body.conference).map((t) => t.id);
  if (!ids?.length || ids.length < 2) return res.status(400).json({ error: "Potřeba alespoň 2 týmy" });
  const { fixtures, rounds } = roundRobin(ids, req.body.doubleRoundRobin);
  res.json({
    teams: ids.length, rounds, matches: fixtures.length,
    fixtures: fixtures.map((f) => ({ round: f.round, homeTeam: D.teamLite(f.home), awayTeam: D.teamLite(f.away) })),
  });
});
api.post("/supervisor/fixtures/generate", needAuth, (req, res) => {
  if (!req.body.startDate) return res.status(400).json({ error: "Zadej datum 1. kola" });
  let ids = req.body.teamIds;
  if (!ids?.length && req.body.division) ids = D.TEAMS.filter((t) => t.division === req.body.division).map((t) => t.id);
  if (!ids?.length && req.body.conference) ids = D.TEAMS.filter((t) => t.conference === req.body.conference).map((t) => t.id);
  const { fixtures, rounds } = roundRobin(ids ?? [], req.body.doubleRoundRobin);
  res.json({ created: fixtures.length, rounds, division: req.body.division, conference: req.body.conference });
});

/* ---------- ŽÁDOSTI ---------- */
app.post("/api/requests", (req, res) => {
  const r = {
    id: `req${Date.now()}`, status: "PENDING", createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(), user: { id: "me", email: "j.tabasek96@gmail.com" }, ...req.body,
  };
  D.REQUESTS.unshift(r);
  res.status(201).json(r);
});

app.get("/health", (req, res) => res.json({ status: "ok" }));
app.use("/api", api);
app.use((req, res) => res.status(404).json({ error: "Endpoint nenalezen" }));

app.listen(PORT, () => console.log(`Mock FSL API na http://localhost:${PORT}/api`));
