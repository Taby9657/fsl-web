/**
 * Mock data pro lokální vývoj webu FSL.
 * Struktura přesně kopíruje odpovědi fsl-backhand (Prisma include tvary).
 */

const SEASON = "2025/26";
const SEASONS = ["2025/26", "2024/25"];

const TEAMS = [
  { id: "t1", name: "Benavidez Eagles", abbr: "BE", color: "#C9A140", venue: "Hala Sparta, Praha 7", division: "Divize A", conference: "Západ", regStatus: "APPROVED" },
  { id: "t2", name: "Vinohrady Vipers", abbr: "VIP", color: "#8B5CF6", venue: "SH Vinohrady", division: "Divize A", conference: "Západ", regStatus: "APPROVED" },
  { id: "t3", name: "Karlín Kings", abbr: "KAR", color: "#3B82F6", venue: "Hala Karlín", division: "Divize A", conference: "Východ", regStatus: "APPROVED" },
  { id: "t4", name: "Smíchov Sharks", abbr: "SMI", color: "#EF4444", venue: "SH Smíchov", division: "Divize A", conference: "Východ", regStatus: "APPROVED" },
  { id: "t5", name: "Žižkov Wolves", abbr: "ZIZ", color: "#22C55E", venue: "Hala Žižkov", division: "Divize A", conference: "Západ", regStatus: "APPROVED" },
  { id: "t6", name: "Dejvice Dragons", abbr: "DEJ", color: "#F59E0B", venue: "SH Dejvice", division: "Divize A", conference: "Východ", regStatus: "APPROVED" },
  { id: "t7", name: "Nusle Nightmares", abbr: "NUS", color: "#EC4899", venue: "Hala Nusle", division: "Divize B", conference: "Západ", regStatus: "APPROVED" },
  { id: "t8", name: "Holešovice Hawks", abbr: "HOL", color: "#0891B2", venue: "SH Holešovice", division: "Divize B", conference: "Východ", regStatus: "APPROVED" },
  { id: "t9", name: "Braník Bears", abbr: "BRA", color: "#65A30D", venue: "SH Braník", division: "Divize B", conference: "Západ", regStatus: "PENDING" },
  { id: "t10", name: "Modřany Mustangs", abbr: "MOD", color: "#9333EA", venue: "Hala Modřany", division: "Divize B", conference: "Východ", regStatus: "APPEALING", regAppeal: "Doložili jsme chybějící soupisku i doklad o zaplacení, prosíme o přehodnocení.", regAppealAt: iso(-2) },
];

const FIRST = ["Tomáš", "Jakub", "Martin", "Petr", "Lukáš", "Ondřej", "David", "Filip", "Adam", "Vojtěch", "Matěj", "Daniel", "Jan", "Michal", "Štěpán", "Marek", "Radek", "Patrik", "Dominik", "Šimon"];
const LAST = ["Novák", "Svoboda", "Novotný", "Dvořák", "Černý", "Procházka", "Kučera", "Veselý", "Horák", "Němec", "Marek", "Pospíšil", "Pokorný", "Hájek", "Král", "Jelínek", "Růžička", "Beneš", "Fiala", "Sedláček"];
const POSITIONS = ["Útočník", "Útočník", "Útočník", "Obránce", "Obránce", "Brankář"];

function iso(daysFromNow, hour = 19, minute = 0) {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

/* ---------- hráči ---------- */
const PLAYERS = [];
let pIdx = 0;
TEAMS.forEach((t, ti) => {
  const count = 12;
  for (let i = 0; i < count; i++) {
    const first = FIRST[(ti * 7 + i * 3) % FIRST.length];
    const last = LAST[(ti * 5 + i * 7) % LAST.length];
    const position = POSITIONS[i % POSITIONS.length];
    const licensed = (ti + i) % 9 !== 0;
    pIdx++;
    PLAYERS.push({
      id: `p${pIdx}`,
      userId: `u${pIdx}`,
      teamId: t.id,
      firstName: first,
      lastName: last,
      jersey: i + 2,
      position,
      birthdate: `199${(i % 9) + 1}-0${(i % 9) + 1}-1${i % 9}T00:00:00.000Z`,
      phone: `+4206${String(10000000 + pIdx).slice(0, 8)}`,
      photoUrl: null,
      licensed,
      isSupervisor: false,
      payment: {
        id: `pp${pIdx}`,
        season: SEASON,
        licFee: 300,
        licStatus: licensed ? "PAID" : "PENDING",
        licPaidAt: licensed ? iso(-30) : null,
        licMethod: licensed ? "stripe" : null,
        superLic: i % 4 === 0,
        superFee: 300,
        superStatus: i % 4 === 0 ? "PAID" : "PENDING",
        superPaidAt: i % 4 === 0 ? iso(-25) : null,
        variableSymbol: `1${String(1000000 + pIdx)}`,
      },
    });
  }
});

// volní hráči pro draft
const FREE_AGENTS = [];
for (let i = 0; i < 6; i++) {
  pIdx++;
  FREE_AGENTS.push({
    id: `p${pIdx}`,
    userId: `u${pIdx}`,
    teamId: null,
    firstName: FIRST[(i * 5 + 2) % FIRST.length],
    lastName: LAST[(i * 3 + 11) % LAST.length],
    jersey: 70 + i,
    position: POSITIONS[i % POSITIONS.length],
    phone: `+42060012345${i}`,
    photoUrl: null,
    licensed: i % 2 === 0,
    isSupervisor: false,
    payment: null,
  });
}
PLAYERS.push(...FREE_AGENTS);

const playerLite = (p) => p && ({
  id: p.id, firstName: p.firstName, lastName: p.lastName, jersey: p.jersey,
  position: p.position, photoUrl: p.photoUrl, licensed: p.licensed,
  team: p.teamId ? teamLite(p.teamId) : null,
});

const teamLite = (id) => {
  const t = TEAMS.find((x) => x.id === id);
  return t ? { id: t.id, name: t.name, abbr: t.abbr, color: t.color, division: t.division, conference: t.conference } : null;
};

/* ---------- rozhodčí ---------- */
const REFEREES = [
  { id: "r1", userId: "ru1", firstName: "Jan", lastName: "Procházka", level: "A", status: "APPROVED", phone: "+420601111222", city: "Praha", bankAccount: "192000145399", bankCode: "0800" },
  { id: "r2", userId: "ru2", firstName: "Petr", lastName: "Malý", level: "B", status: "APPROVED", phone: "+420602333444", city: "Praha", bankAccount: "192000145400", bankCode: "0800" },
  { id: "r3", userId: "ru3", firstName: "Eva", lastName: "Kratochvílová", level: "C", status: "APPROVED", phone: "+420603555666", city: "Kladno", bankAccount: "192000145401", bankCode: "0300" },
  { id: "r4", userId: "ru4", firstName: "Michal", lastName: "Bureš", level: "C", status: "PENDING", phone: "+420604777888", city: "Beroun", birthNo: "950615/1234", address: "Vinohradská 12", zip: "12000", bankAccount: "2900123456", bankCode: "2010" },
  { id: "r5", userId: "ru5", firstName: "Tereza", lastName: "Hrubá", level: "C", status: "PENDING", phone: "+420605999000", city: "Praha", birthNo: "980210/5678", address: "Korunní 88", zip: "13000", bankAccount: "1234567890", bankCode: "0100" },
];
REFEREES.forEach((r) => { r.user = { id: r.userId, email: `${r.lastName.toLowerCase()}@fsl.cz` }; });

/* ---------- zápasy ---------- */
const PENALTY_TYPES = ["2 min", "2 min", "5 min", "10 min"];
const MATCHES = [];
let mIdx = 0;

function makeMatch({ home, away, date, status, round, division, homeScore = 0, awayScore = 0, refereeId }) {
  mIdx++;
  const id = `m${mIdx}`;
  const homeTeam = teamLite(home);
  const awayTeam = teamLite(away);
  const events = [];
  const homePlayers = PLAYERS.filter((p) => p.teamId === home);
  const awayPlayers = PLAYERS.filter((p) => p.teamId === away);

  if (status === "DONE" || status === "LIVE") {
    let minute = 3;
    for (let i = 0; i < homeScore; i++) {
      const sc = homePlayers[(i * 3) % homePlayers.length];
      const as = homePlayers[(i * 5 + 2) % homePlayers.length];
      events.push({
        id: `${id}e${events.length + 1}`, matchId: id, type: "GOAL",
        minute: (minute += 4 + i), period: Math.min(3, Math.ceil((minute || 1) / 20)),
        teamId: home, scorerId: sc.id, assistId: as.id !== sc.id ? as.id : null,
        scorer: playerLite(sc), assist: as.id !== sc.id ? playerLite(as) : null, penalty: null,
      });
    }
    for (let i = 0; i < awayScore; i++) {
      const sc = awayPlayers[(i * 4 + 1) % awayPlayers.length];
      events.push({
        id: `${id}e${events.length + 1}`, matchId: id, type: "GOAL",
        minute: 6 + i * 7, period: Math.min(3, Math.ceil((6 + i * 7) / 20)),
        teamId: away, scorerId: sc.id, assistId: null,
        scorer: playerLite(sc), assist: null, penalty: null,
      });
    }
    const pen = homePlayers[4];
    events.push({
      id: `${id}e${events.length + 1}`, matchId: id, type: "PENALTY",
      minute: 27, period: 2, teamId: home, penaltyId: pen.id,
      penaltyType: PENALTY_TYPES[mIdx % PENALTY_TYPES.length],
      scorer: null, assist: null, penalty: playerLite(pen),
    });
  }

  const lineups = status === "UPCOMING" && mIdx % 3 === 0 ? [] : [home, away].map((tid) => ({
    id: `${id}l${tid}`, matchId: id, teamId: tid, confirmed: true,
    players: PLAYERS.filter((p) => p.teamId === tid).slice(0, 11).map((p, i) => ({
      id: `${id}lp${p.id}`, lineupId: `${id}l${tid}`, playerId: p.id,
      isGoalkeeper: i === 0, isCaptain: i === 1, jerseyOverride: null,
      player: { ...playerLite(p), payment: p.payment ? { licStatus: p.payment.licStatus } : null },
    })),
  }));

  const match = {
    id, homeTeamId: home, awayTeamId: away, refereeId: refereeId ?? null,
    competition: "FSL Liga", division, season: SEASON, round, date,
    venue: TEAMS.find((t) => t.id === home)?.venue ?? null,
    homeScore, awayScore, status, homeFeePaid: mIdx % 2 === 0,
    homeTeam, awayTeam,
    referee: refereeId ? REFEREES.find((r) => r.id === refereeId) : null,
    events, lineups,
    postmatches: status === "DONE" ? [{
      id: `${id}pm`, matchId: id, teamId: home, refRating: 4, refNote: null,
      opponentMvpId: awayPlayers[2]?.id ?? null, submitted: true, submittedAt: date,
      opponentMvp: playerLite(awayPlayers[2]),
    }] : [],
    _count: { events: events.length },
  };
  MATCHES.push(match);
  return match;
}

// odehrané zápasy divize A
const A = ["t1", "t2", "t3", "t4", "t5", "t6"];
const scores = [[5, 2], [3, 3], [1, 4], [6, 2], [2, 1], [4, 4], [7, 3], [2, 5], [3, 1], [4, 2], [1, 1], [5, 3]];
let s = 0;
for (let round = 1; round <= 4; round++) {
  for (let i = 0; i < 3; i++) {
    const home = A[(round + i) % A.length];
    const away = A[(round + i + 3) % A.length];
    if (home === away) continue;
    const [hs, as_] = scores[s % scores.length];
    s++;
    makeMatch({
      home, away, date: iso(-30 + round * 7 + i, 19, 30), status: "DONE",
      round, division: "Divize A", homeScore: hs, awayScore: as_,
      refereeId: REFEREES[s % 3].id,
    });
  }
}
// live
makeMatch({ home: "t1", away: "t3", date: iso(0, new Date().getHours(), 0), status: "LIVE", round: 5, division: "Divize A", homeScore: 3, awayScore: 2, refereeId: "r1" });
makeMatch({ home: "t5", away: "t4", date: iso(0, new Date().getHours(), 15), status: "LIVE", round: 5, division: "Divize A", homeScore: 1, awayScore: 1, refereeId: "r2" });
// nadcházející
for (let i = 0; i < 8; i++) {
  makeMatch({
    home: A[i % A.length], away: A[(i + 2) % A.length], date: iso(2 + i * 3, 18 + (i % 3), 30),
    status: "UPCOMING", round: 6 + Math.floor(i / 3), division: "Divize A",
    refereeId: i % 3 === 0 ? null : REFEREES[i % 3].id,
  });
}
// divize B
const B = ["t7", "t8", "t9", "t10"];
for (let i = 0; i < 6; i++) {
  makeMatch({
    home: B[i % B.length], away: B[(i + 1) % B.length],
    date: iso(-12 + i * 4, 20, 0), status: i < 3 ? "DONE" : "UPCOMING",
    round: 1 + Math.floor(i / 2), division: "Divize B",
    homeScore: i < 3 ? 3 + i : 0, awayScore: i < 3 ? 2 : 0,
    refereeId: REFEREES[i % 3].id,
  });
}

/* ---------- tabulka ---------- */
function buildTable(division, season = SEASON) {
  const rows = {};
  TEAMS.filter((t) => !division || t.division === division).forEach((t) => {
    rows[t.id] = { teamId: t.id, team: teamLite(t.id), p: 0, w: 0, d: 0, l: 0, gf: 0, ga: 0, pts: 0, form: [] };
  });
  MATCHES.filter((m) => m.status === "DONE" && m.season === season && (!division || m.division === division))
    .sort((a, b) => new Date(a.date) - new Date(b.date))
    .forEach((m) => {
      const h = rows[m.homeTeamId], a = rows[m.awayTeamId];
      if (!h || !a) return;
      h.p++; a.p++;
      h.gf += m.homeScore; h.ga += m.awayScore;
      a.gf += m.awayScore; a.ga += m.homeScore;
      if (m.homeScore > m.awayScore) { h.w++; h.pts += 3; a.l++; h.form.push("W"); a.form.push("L"); }
      else if (m.homeScore < m.awayScore) { a.w++; a.pts += 3; h.l++; h.form.push("L"); a.form.push("W"); }
      else { h.d++; a.d++; h.pts++; a.pts++; h.form.push("D"); a.form.push("D"); }
    });
  return Object.values(rows)
    .map((r) => ({ ...r, form: r.form.slice(-5) }))
    .sort((x, y) => y.pts - x.pts || (y.gf - y.ga) - (x.gf - x.ga) || y.gf - x.gf);
}

/* ---------- statistiky hráčů ---------- */
function playerStats(division) {
  const map = {};
  MATCHES.filter((m) => m.status === "DONE" && (!division || m.division === division)).forEach((m) => {
    (m.events || []).forEach((e) => {
      if (e.type !== "GOAL") return;
      if (e.scorerId) {
        map[e.scorerId] ??= { goals: 0, assists: 0, votes: 0 };
        map[e.scorerId].goals++;
      }
      if (e.assistId) {
        map[e.assistId] ??= { goals: 0, assists: 0, votes: 0 };
        map[e.assistId].assists++;
      }
    });
    (m.postmatches || []).forEach((pm) => {
      if (pm.opponentMvpId) {
        map[pm.opponentMvpId] ??= { goals: 0, assists: 0, votes: 0 };
        map[pm.opponentMvpId].votes++;
      }
    });
  });
  return Object.entries(map).map(([id, v]) => ({
    player: playerLite(PLAYERS.find((p) => p.id === id)),
    goals: v.goals, assists: v.assists, points: v.goals + v.assists, votes: v.votes,
  })).filter((x) => x.player);
}

/* ---------- highlights ---------- */
const HIGHLIGHTS = [
  { id: "h1", round: 5, title: "Derby rozhodl hattrick v poslední třetině", body: "Benavidez Eagles porazili Karlín Kings 5:2 po famózním výkonu Tomáše Nováka, který zaznamenal tři branky a jednu asistenci. Zápas rozhodla čtyřminutová pasáž ve 47. minutě.", imageUrl: null, videoUrl: null, pinned: true, createdAt: iso(-1) },
  { id: "h2", round: 5, title: "Vipers stále bez porážky", body: "Vinohrady Vipers pokračují v neporazitelnosti — sedmý zápas v řadě bez ztráty bodu. Brankář týmu drží úspěšnost zákroků na 92 %.", imageUrl: null, videoUrl: null, pinned: false, createdAt: iso(-3) },
  { id: "h3", round: 4, title: "Nováčci z Divize B překvapili", body: "Holešovice Hawks v poháru vyřadili favorita ze skupiny A a postoupili do čtvrtfinále. Rozhodla efektivita v přesilových hrách.", imageUrl: null, videoUrl: null, pinned: false, createdAt: iso(-6) },
];

/* ---------- draft ---------- */
const DRAFT_PROFILES = FREE_AGENTS.slice(0, 5).map((p, i) => ({
  id: `dp${i + 1}`,
  playerId: p.id,
  bio: i % 2 === 0
    ? "Hraju florbal 12 let, poslední tři sezóny v regionálním přeboru. Hledám tým, kde se hraje rychlý kombinační florbal."
    : "Univerzál se zkušenostmi z obrany i útoku. Trénuji 3× týdně, spolehlivá docházka.",
  pubSkill: i % 2 === 0
    ? "Největší sekera v české florbalové historii"
    : "Dám gól každý zápas, garantuju.",
  position: p.position,
  isActive: true,
  player: playerLite(p),
  videos: i < 2 ? [{ id: `dv${i}`, profileId: `dp${i + 1}`, url: "https://example.com/video.mp4", createdAt: iso(-5) }] : [],
  offers: [],
  offerCount: i === 0 ? 2 : i === 1 ? 1 : 0,
  windowExpiresAt: i === 0 ? iso(1, 12, 0) : i === 1 ? iso(2, 8, 0) : null,
  myTeamOffer: null,
}));

/* ---------- žádosti ---------- */
const REQUESTS = [
  { id: "req1", type: "MATCH_TRANSCRIPT", userId: "u1", teamId: "t1", matchId: "m1", body: "Prosím o opravu zápisu — ve 34. minutě byl gól připsán špatnému hráči.", note: null, status: "PENDING", createdAt: iso(-1), updatedAt: iso(-1), user: { id: "u1", email: "vedouci@be.cz" } },
  { id: "req2", type: "LICENSE_ISSUE", userId: "u5", teamId: "t2", matchId: null, body: "Zaplatili jsme licenci převodem 12. 8., ale stále je vedena jako nezaplacená.", note: "Ověřuji v bankovním výpisu.", status: "IN_PROGRESS", createdAt: iso(-3), updatedAt: iso(-2), user: { id: "u5", email: "hrac@vipers.cz" } },
  { id: "req3", type: "PLAYER_DISPUTE", userId: "u9", teamId: "t3", matchId: "m4", body: "Nesouhlasíme s udělením 10minutového trestu ve druhé třetině.", note: "Po přezkoumání videa trest potvrzen.", status: "REJECTED", createdAt: iso(-9), updatedAt: iso(-7), user: { id: "u9", email: "kings@fsl.cz" } },
];

/* ---------- oznámení ---------- */
const NOTIFICATIONS = [
  { id: "n1", userId: "me", title: "Zápas začal", body: "Benavidez Eagles vs Karlín Kings právě začal.", screen: "zapasy/m13", read: false, createdAt: iso(0, new Date().getHours(), 0) },
  { id: "n2", userId: "me", title: "Nová draft nabídka", body: "Tým Vinohrady Vipers ti poslal nabídku. Máš 72 hodin na rozhodnutí.", screen: "draft", read: false, createdAt: iso(-1, 10, 30) },
  { id: "n3", userId: "me", title: "Platba přijata", body: "Hráčská licence pro sezónu 2025/26 byla uhrazena.", screen: "platby", read: true, createdAt: iso(-4, 9, 0) },
  { id: "n4", userId: "me", title: "Zápas ukončen", body: "Vyplňte prosím po-zápasový formulář.", screen: "tym/po-zapase", read: true, createdAt: iso(-8, 21, 15) },
];

module.exports = {
  SEASON, SEASONS, TEAMS, PLAYERS, REFEREES, MATCHES, HIGHLIGHTS,
  DRAFT_PROFILES, REQUESTS, NOTIFICATIONS,
  teamLite, playerLite, buildTable, playerStats, iso,
};
