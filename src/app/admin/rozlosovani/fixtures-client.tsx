"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { ArrowRight, CheckCircle2, Circle, Layers, Network, Repeat } from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { errMsg, leaguesApi, supervisorApi } from "@/lib/api";
import { pluralTeam } from "@/lib/format";
import type { FixturePreview, LeagueNode, PlacedTeam, TeamLite } from "@/lib/types";
import { useSeasons } from "@/hooks/use-league";
import {
  Button,
  Card,
  Chip,
  ChipRow,
  EmptyState,
  Field,
  Input,
  LinkButton,
  PageTitle,
  SectionTitle,
  Switch,
} from "@/components/ui/primitives";
import { Modal, SkeletonList } from "@/components/ui/feedback";
import { TeamDot } from "@/components/ui/data";
import { toast } from "@/components/ui/toast";

type Step = "struktura" | "rozsah" | "konfig" | "nahled" | "hotovo";
/**
 * `struktura` = liga → konference → divize ze Správy ligy. Zápasy pak nesou
 * leagueId/conferenceId/divisionId, takže je tabulka i pavouk najdou podle
 * struktury, ne podle textové divize.
 *
 * `division` a `conference` jsou stará textová pole na týmu. Zůstávají kvůli
 * sezónám, které strukturu nemají — zápasy z nich mají jen text a tabulka
 * na ně padá na záložní cestu.
 */
type Scope = "struktura" | "division" | "conference" | "custom";

const STEPS: { id: Step; label: string }[] = [
  { id: "struktura", label: "Struktura" },
  { id: "rozsah", label: "Rozsah" },
  { id: "konfig", label: "Konfigurace" },
  { id: "nahled", label: "Náhled" },
];

export function FixturesClient() {
  const [step, setStep] = useState<Step>("struktura");
  const [scopeVolba, setScopeVolba] = useState<Scope | null>(null);
  const [division, setDivision] = useState("");
  const [conference, setConference] = useState("");
  const [teamIds, setTeamIds] = useState<string[]>([]);
  const [moving, setMoving] = useState<TeamLite | null>(null);

  // výběr ze struktury
  const [leagueId, setLeagueId] = useState("");
  const [conferenceId, setConferenceId] = useState("");
  const [divisionId, setDivisionId] = useState("");

  const [startDate, setStartDate] = useState("");
  const [season, setSeason] = useState("");
  const [time, setTime] = useState("18:00");
  const [interval, setInterval] = useState("7");
  const [venue, setVenue] = useState("");
  const [double, setDouble] = useState(false);
  const [deleteExisting, setDeleteExisting] = useState(false);

  const [preview, setPreview] = useState<FixturePreview | null>(null);
  const [result, setResult] = useState<{ created: number; rounds: number } | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: seasons = [] } = useSeasons();

  const tree = useQuery({
    queryKey: ["leagues", "tree", ""],
    queryFn: async () => (await leaguesApi.tree()).data,
  });

  const placed = useQuery({
    queryKey: ["leagues", "teams", ""],
    queryFn: async () => (await leaguesApi.teams()).data,
  });

  const teams = useQuery({
    queryKey: ["supervisor", "conferences"],
    queryFn: async () => (await supervisorApi.conferences()).data,
  });

  const leagues = tree.data?.leagues ?? [];
  const strukturaSezony = tree.data?.season ?? "";
  const placedList = placed.data?.teams ?? [];
  const maStrukturu = leagues.length > 0;
  const list = teams.data ?? [];

  /** Dokud se struktura nenačte, nevybírá se nic — jinak by první render určil rozsah. */
  const scope: Scope = scopeVolba ?? (maStrukturu ? "struktura" : "division");

  const divisions = useMemo(
    () => [...new Set(list.map((t) => t.division).filter(Boolean))].sort() as string[],
    [list],
  );
  const conferences = useMemo(
    () => [...new Set(list.map((t) => t.conference).filter(Boolean))].sort() as string[],
    [list],
  );

  /** Textová struktura — záloha pro sezóny, které ligu → konferenci → divizi nemají. */
  const textovyStrom = useMemo(() => {
    const map = new Map<string, Map<string, TeamLite[]>>();
    list.forEach((t) => {
      const conf = t.conference ?? "⚠ Nepřiřazené týmy";
      const div = t.division ?? "Bez divize";
      if (!map.has(conf)) map.set(conf, new Map());
      const inner = map.get(conf)!;
      if (!inner.has(div)) inner.set(div, []);
      inner.get(div)!.push(t);
    });
    return [...map.entries()].sort((a, b) =>
      a[0].startsWith("⚠") ? 1 : b[0].startsWith("⚠") ? -1 : a[0].localeCompare(b[0], "cs"),
    );
  }, [list]);

  const vybranaLiga = leagues.find((l) => l.id === leagueId) ?? null;
  const vybranaKonference = vybranaLiga?.conferences.find((k) => k.id === conferenceId) ?? null;

  /** Týmy v nejužším zvoleném rozsahu struktury. */
  const tymyVeStrukture = useMemo(() => {
    if (!leagueId) return [];
    return placedList.filter((t) => {
      const p = t.placement;
      if (!p) return false;
      if (divisionId) return p.divisionId === divisionId;
      if (conferenceId) return p.conferenceId === conferenceId;
      return p.leagueId === leagueId;
    });
  }, [placedList, leagueId, conferenceId, divisionId]);

  const nezarazene = useMemo(() => placedList.filter((t) => !t.placement), [placedList]);

  const selectedCount =
    scope === "custom"
      ? teamIds.length
      : scope === "struktura"
        ? tymyVeStrukture.length
        : scope === "division"
          ? list.filter((t) => t.division === division).length
          : list.filter((t) => t.conference === conference).length;

  /** Sezóna posílaná na server: ručně zadaná má přednost, jinak ta ze struktury. */
  const sezonaPayload = season.trim() || (scope === "struktura" ? strukturaSezony : "");

  const scopePayload = () =>
    scope === "custom"
      ? { teamIds }
      : scope === "struktura"
        ? {
            leagueId,
            conferenceId: conferenceId || undefined,
            divisionId: divisionId || undefined,
            season: sezonaPayload || undefined,
          }
        : scope === "division"
          ? { division }
          : { conference };

  async function loadPreview() {
    if (selectedCount < 2) {
      toast.error("Málo týmů", "Vyber alespoň 2 týmy.");
      return;
    }
    if (!startDate) {
      toast.error("Chybné datum", "Vyber datum 1. kola.");
      return;
    }
    setBusy(true);
    try {
      const res = await supervisorApi.previewFixtures({
        ...scopePayload(),
        doubleRoundRobin: double,
      });
      setPreview(res.data);
      setStep("nahled");
    } catch (e) {
      toast.error("Chyba", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function generate() {
    setBusy(true);
    try {
      const d = new Date(startDate);
      const [h, m] = time.split(":").map(Number);
      d.setHours(h || 18, m || 0, 0, 0);
      const res = await supervisorApi.generateFixtures({
        ...scopePayload(),
        startDate: d.toISOString(),
        season: sezonaPayload || null,
        roundIntervalDays: parseInt(interval, 10) || 7,
        defaultTime: time,
        defaultVenue: venue.trim() || null,
        doubleRoundRobin: double,
        deleteExisting,
        competition: "FSL Liga",
      });
      setResult(res.data);
      setStep("hotovo");
    } catch (e) {
      toast.error("Chyba", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function moveTeam(newDivision: string, newConference: string) {
    if (!moving || !newDivision.trim()) return;
    setBusy(true);
    try {
      await supervisorApi.updateTeam(moving.id, {
        division: newDivision.trim(),
        conference: newConference.trim() || null,
      });
      await teams.refetch();
      setMoving(null);
      toast.success("Tým přesunut");
    } catch (e) {
      toast.error("Chyba", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const stepIndex = STEPS.findIndex((s) => s.id === step);
  const nacitaStrukturu = tree.isLoading || placed.isLoading;

  return (
    <>
      <PageTitle
        title="Rozlosování"
        subtitle="Struktura ligy a automatické generování rozpisu zápasů"
      />

      {step !== "hotovo" ? (
        <div className="mb-6 flex items-center gap-2">
          {STEPS.map((s, i) => (
            <div key={s.id} className="flex flex-1 items-center gap-2">
              <span
                className={clsx(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[12px] font-bold",
                  i < stepIndex
                    ? "bg-go text-bg"
                    : i === stepIndex
                      ? "border-2 border-go text-go"
                      : "border border-bd text-di",
                )}
              >
                {i < stepIndex ? "✓" : i + 1}
              </span>
              <span
                className={clsx(
                  "hidden text-[12px] font-medium sm:block",
                  i <= stepIndex ? "text-wh" : "text-di",
                )}
              >
                {s.label}
              </span>
              {i < STEPS.length - 1 ? (
                <span className={clsx("h-px flex-1", i < stepIndex ? "bg-go" : "bg-bd")} />
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      {/* ---------- 1. struktura ---------- */}
      {step === "struktura" ? (
        nacitaStrukturu || teams.isLoading ? (
          <SkeletonList rows={6} />
        ) : maStrukturu ? (
          <>
            <SectionTitle
              action={
                <LinkButton href="/admin/liga" size="sm" variant="subtle">
                  Upravit strukturu
                </LinkButton>
              }
            >
              Sezóna {strukturaSezony}
            </SectionTitle>

            <div className="space-y-4">
              {leagues.map((liga) => (
                <StrukturaLiga key={liga.id} liga={liga} teams={placedList} />
              ))}

              {nezarazene.length ? (
                <Card className="overflow-hidden border-red/40">
                  <div className="bg-red/10 px-4 py-2.5 text-[13px] font-semibold text-red">
                    Nezařazené týmy ({nezarazene.length})
                  </div>
                  <div className="divide-y divide-bd">
                    {nezarazene.map((t) => (
                      <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                        <TeamDot color={t.color} />
                        <span className="min-w-0 flex-1 truncate text-[14px] text-wh">
                          {t.name}
                        </span>
                        <span className="text-[12px] font-bold text-di">{t.abbr}</span>
                      </div>
                    ))}
                  </div>
                  <p className="border-t border-bd px-4 py-2.5 text-[12px] text-mu">
                    Do rozlosování se nedostanou, dokud je nezařadíš ve Správě ligy.
                  </p>
                </Card>
              ) : null}
            </div>

            <Button className="mt-6 w-full" onClick={() => setStep("rozsah")}>
              Generovat rozlosování <ArrowRight size={16} />
            </Button>
          </>
        ) : !list.length ? (
          <EmptyState
            icon={<Network size={44} />}
            title="Žádné týmy"
            description="Nejdřív přidej týmy ve správě týmů."
            action={
              <LinkButton href="/admin/tymy" size="sm">
                Správa týmů
              </LinkButton>
            }
          />
        ) : (
          <>
            <Card className="mb-4 border-go/30 bg-go/5 p-4">
              <p className="text-[13px] leading-6 text-mu">
                Pro tuhle sezónu není založená <strong className="text-wh">ligová struktura</strong>,
                takže se níž pracuje se starou textovou divizí u týmu. Zápasy z ní nenesou
                vazbu na ligu ani divizi a tabulka si je pak dohledává podle textu.
              </p>
              <LinkButton href="/admin/liga" size="sm" className="mt-3">
                <Layers size={15} /> Založit strukturu
              </LinkButton>
            </Card>

            <div className="space-y-6">
              {textovyStrom.map(([conf, divs]) => (
                <section key={conf}>
                  <h2 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-go">
                    {conf}
                    <span className="text-[12px] font-normal text-mu">
                      ({pluralTeam([...divs.values()].flat().length)})
                    </span>
                  </h2>
                  <div className="space-y-3">
                    {[...divs.entries()].map(([div, ts]) => (
                      <Card key={div} className="overflow-hidden">
                        <div className="flex items-center justify-between bg-c2/60 px-4 py-2.5">
                          <span className="text-[13px] font-semibold text-wh">{div}</span>
                          <span className="text-[12px] text-mu">{ts.length}</span>
                        </div>
                        <div className="divide-y divide-bd">
                          {ts.map((t) => (
                            <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                              <TeamDot color={t.color} />
                              <span className="min-w-0 flex-1 truncate text-[14px] text-wh">
                                {t.name}
                              </span>
                              <span className="text-[12px] font-bold text-di">{t.abbr}</span>
                              <button
                                onClick={() => setMoving(t)}
                                className="cursor-pointer rounded-lg p-1.5 text-mu transition-colors hover:bg-c2 hover:text-wh"
                                aria-label="Přesunout"
                              >
                                <Repeat size={15} />
                              </button>
                            </div>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                </section>
              ))}
            </div>
            <Button className="mt-6 w-full" onClick={() => setStep("rozsah")}>
              Generovat rozlosování <ArrowRight size={16} />
            </Button>
          </>
        )
      ) : null}

      {/* ---------- 2. rozsah ---------- */}
      {step === "rozsah" ? (
        <>
          <SectionTitle>Rozsah rozlosování</SectionTitle>
          <div className="space-y-3">
            {maStrukturu ? (
              <ScopeCard
                active={scope === "struktura"}
                title="Ze struktury sezóny"
                desc="Liga, konference nebo divize podle Správy ligy"
                onClick={() => setScopeVolba("struktura")}
              >
                <div className="space-y-3">
                  <Field label="Liga" required>
                    <ChipRow>
                      {leagues.map((l) => (
                        <Chip
                          key={l.id}
                          active={leagueId === l.id}
                          onClick={() => {
                            setLeagueId(l.id);
                            setConferenceId("");
                            setDivisionId("");
                          }}
                        >
                          {l.name}
                        </Chip>
                      ))}
                    </ChipRow>
                  </Field>

                  {vybranaLiga?.conferences.length ? (
                    <Field label="Konference">
                      <ChipRow>
                        <Chip
                          active={conferenceId === ""}
                          onClick={() => {
                            setConferenceId("");
                            setDivisionId("");
                          }}
                        >
                          Celá liga
                        </Chip>
                        {vybranaLiga.conferences.map((k) => (
                          <Chip
                            key={k.id}
                            active={conferenceId === k.id}
                            onClick={() => {
                              setConferenceId(k.id);
                              setDivisionId("");
                            }}
                          >
                            {k.name}
                          </Chip>
                        ))}
                      </ChipRow>
                    </Field>
                  ) : null}

                  {vybranaKonference?.divisions.length ? (
                    <Field label="Divize">
                      <ChipRow>
                        <Chip active={divisionId === ""} onClick={() => setDivisionId("")}>
                          Celá konference
                        </Chip>
                        {vybranaKonference.divisions.map((d) => (
                          <Chip
                            key={d.id}
                            active={divisionId === d.id}
                            onClick={() => setDivisionId(d.id)}
                          >
                            {d.name}
                          </Chip>
                        ))}
                      </ChipRow>
                    </Field>
                  ) : null}

                  {leagueId ? (
                    <p className="text-[12px] text-mu">
                      {tymyVeStrukture.length
                        ? `${pluralTeam(tymyVeStrukture.length)} v tomhle rozsahu`
                        : "V tomhle rozsahu není žádný zařazený tým."}
                    </p>
                  ) : null}
                </div>
              </ScopeCard>
            ) : null}

            {!maStrukturu ? (
              <>
                <ScopeCard
                  active={scope === "division"}
                  title="Divize (textová)"
                  desc="Zápasy jen v rámci jedné divize"
                  onClick={() => setScopeVolba("division")}
                >
                  <ChipRow>
                    {divisions.map((d) => (
                      <Chip key={d} active={division === d} onClick={() => setDivision(d)}>
                        {d} ({list.filter((t) => t.division === d).length})
                      </Chip>
                    ))}
                  </ChipRow>
                </ScopeCard>

                <ScopeCard
                  active={scope === "conference"}
                  title="Konference (textová)"
                  desc="Všechny týmy konference hrají křížově"
                  onClick={() => setScopeVolba("conference")}
                >
                  {conferences.length ? (
                    <ChipRow>
                      {conferences.map((c) => (
                        <Chip key={c} active={conference === c} onClick={() => setConference(c)}>
                          {c} ({list.filter((t) => t.conference === c).length})
                        </Chip>
                      ))}
                    </ChipRow>
                  ) : (
                    <p className="text-[13px] text-mu">
                      Žádné konference — přiřaď je týmům ve správě týmů.
                    </p>
                  )}
                </ScopeCard>
              </>
            ) : null}

            <ScopeCard
              active={scope === "custom"}
              title="Vlastní výběr"
              desc="Vyber konkrétní týmy napříč strukturou"
              onClick={() => setScopeVolba("custom")}
            >
              <div className="max-h-64 divide-y divide-bd overflow-y-auto rounded-xl border border-bd">
                {list.map((t) => {
                  const sel = teamIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() =>
                        setTeamIds((ids) =>
                          sel ? ids.filter((x) => x !== t.id) : [...ids, t.id],
                        )
                      }
                      className="flex w-full cursor-pointer items-center gap-3 px-3 py-2.5 text-left transition-colors hover:bg-c2"
                    >
                      <TeamDot color={t.color} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] text-wh">{t.name}</span>
                        <span className="block text-[11px] text-mu">
                          {[t.conference, t.division].filter(Boolean).join(" · ")}
                        </span>
                      </span>
                      {sel ? (
                        <CheckCircle2 size={18} className="text-go" />
                      ) : (
                        <Circle size={18} className="text-di" />
                      )}
                    </button>
                  );
                })}
              </div>
              <p className="mt-2 text-[12px] text-mu">
                Zápasy z vlastního výběru nenesou vazbu na ligu ani divizi — tabulka si je
                dohledá podle textové divize týmů.
              </p>
            </ScopeCard>
          </div>

          {selectedCount >= 2 ? (
            <p className="mt-4 rounded-xl border border-go/30 bg-go/10 px-4 py-3 text-[13px] text-go">
              {pluralTeam(selectedCount)} vybráno
            </p>
          ) : null}

          <div className="mt-6 flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setStep("struktura")}>
              Zpět
            </Button>
            <Button
              className="flex-1"
              disabled={selectedCount < 2}
              onClick={() => setStep("konfig")}
            >
              Pokračovat <ArrowRight size={16} />
            </Button>
          </div>
        </>
      ) : null}

      {/* ---------- 3. konfigurace ---------- */}
      {step === "konfig" ? (
        <>
          <SectionTitle>Nastavení rozpisu</SectionTitle>
          <Card className="space-y-4 p-5">
            <Field label="Datum 1. kola" required>
              <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
            </Field>
            <Field label="Sezóna">
              <Input
                value={season}
                onChange={(e) => setSeason(e.target.value)}
                placeholder={strukturaSezony || seasons[0] || "2026/27"}
              />
            </Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Čas zápasů">
                <Input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </Field>
              <Field label="Interval mezi koly (dní)">
                <Input
                  value={interval}
                  inputMode="numeric"
                  onChange={(e) => setInterval(e.target.value.replace(/\D/g, ""))}
                />
              </Field>
            </div>
            <Field label="Výchozí hřiště">
              <Input value={venue} onChange={(e) => setVenue(e.target.value)} />
            </Field>
            <Switch
              checked={double}
              onChange={setDouble}
              label="Dvojité rozlosování"
              description="Každý tým hraje s každým doma i venku"
            />
            <Switch
              checked={deleteExisting}
              onChange={setDeleteExisting}
              accent="red"
              label="Smazat stávající zápasy"
              description="Odstraní naplánované zápasy před generováním"
            />
            <div className="rounded-xl border border-bd bg-c2/60 px-4 py-3 text-[13px] text-mu">
              {pluralTeam(selectedCount)} ·{" "}
              {double ? (selectedCount - 1) * 2 : selectedCount - 1} kol ·{" "}
              {double
                ? selectedCount * (selectedCount - 1)
                : Math.floor((selectedCount * (selectedCount - 1)) / 2)}{" "}
              zápasů
            </div>
          </Card>

          <div className="mt-6 flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setStep("rozsah")}>
              Zpět
            </Button>
            <Button className="flex-1" loading={busy} onClick={loadPreview}>
              Zobrazit náhled <ArrowRight size={16} />
            </Button>
          </div>
        </>
      ) : null}

      {/* ---------- 4. náhled ---------- */}
      {step === "nahled" && preview ? (
        <>
          <SectionTitle>Náhled rozlosování</SectionTitle>
          <Card className="mb-4 flex divide-x divide-bd">
            {[
              [preview.teams, "týmů"],
              [preview.rounds, "kol"],
              [preview.matches, "zápasů"],
            ].map(([v, l]) => (
              <div key={String(l)} className="flex-1 py-4 text-center">
                <p className="tabular text-2xl font-black text-go">{v}</p>
                <p className="text-[12px] text-mu">{l}</p>
              </div>
            ))}
          </Card>

          <div className="space-y-4">
            {[...new Set(preview.fixtures.map((f) => f.round))]
              .sort((a, b) => a - b)
              .map((r) => (
                <div key={r}>
                  <p className="mb-2 text-[11px] font-bold uppercase tracking-wide text-go">
                    Kolo {r}
                  </p>
                  <Card className="overflow-hidden">
                    <div className="divide-y divide-bd">
                      {preview.fixtures
                        .filter((f) => f.round === r)
                        .map((f, i) => (
                          <div key={i} className="flex items-center gap-3 px-4 py-2.5">
                            <TeamDot color={f.homeTeam?.color} />
                            <span className="min-w-0 flex-1 truncate text-[14px] text-wh">
                              {f.homeTeam?.abbr}
                            </span>
                            <span className="text-[12px] text-di">vs</span>
                            <span className="min-w-0 flex-1 truncate text-right text-[14px] text-wh">
                              {f.awayTeam?.abbr}
                            </span>
                            <TeamDot color={f.awayTeam?.color} />
                          </div>
                        ))}
                    </div>
                  </Card>
                </div>
              ))}
          </div>

          <div className="mt-6 flex gap-2">
            <Button variant="ghost" className="flex-1" onClick={() => setStep("konfig")}>
              Zpět
            </Button>
            <Button className="flex-1" loading={busy} onClick={generate}>
              Vygenerovat rozpis
            </Button>
          </div>
        </>
      ) : null}

      {/* ---------- hotovo ---------- */}
      {step === "hotovo" && result ? (
        <div className="py-10 text-center">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-go/15 text-go">
            <CheckCircle2 size={40} />
          </span>
          <h2 className="mt-6 text-2xl font-bold text-wh">Rozlosování vytvořeno!</h2>
          <p className="mt-2 text-[15px] text-mu">
            {result.created} zápasů v {result.rounds} kolech.
          </p>
          <div className="mx-auto mt-6 flex max-w-xs flex-col gap-2">
            <Link href="/admin/zapasy">
              <Button className="w-full">Zobrazit zápasy</Button>
            </Link>
            <Button
              variant="ghost"
              onClick={() => {
                setResult(null);
                setPreview(null);
                setStep("struktura");
              }}
            >
              Zpět na strukturu
            </Button>
          </div>
        </div>
      ) : null}

      <MoveTeamModal
        team={moving}
        divisions={divisions}
        conferences={conferences}
        busy={busy}
        onClose={() => setMoving(null)}
        onSave={moveTeam}
      />
    </>
  );
}

/* ---------------- struktura jedné ligy ---------------- */

function StrukturaLiga({ liga, teams }: { liga: LeagueNode; teams: PlacedTeam[] }) {
  const vLize = teams.filter((t) => t.placement?.leagueId === liga.id);
  const bezKonference = vLize.filter((t) => !t.placement?.conferenceId);

  return (
    <section>
      <h2 className="mb-3 flex items-center gap-2 text-[13px] font-bold text-go">
        {liga.name}
        <span className="text-[12px] font-normal text-mu">({pluralTeam(vLize.length)})</span>
      </h2>

      <div className="space-y-3">
        {liga.conferences.map((konf) => {
          const vKonferenci = vLize.filter((t) => t.placement?.conferenceId === konf.id);
          const bezDivize = vKonferenci.filter((t) => !t.placement?.divisionId);
          return (
            <div key={konf.id} className="space-y-3">
              {konf.divisions.map((div) => (
                <TymySkupina
                  key={div.id}
                  nadpis={`${konf.name} · ${div.name}`}
                  teams={vKonferenci.filter((t) => t.placement?.divisionId === div.id)}
                />
              ))}
              {bezDivize.length ? (
                <TymySkupina nadpis={`${konf.name} · bez divize`} teams={bezDivize} />
              ) : null}
            </div>
          );
        })}

        {bezKonference.length ? (
          <TymySkupina nadpis="Přímo v lize" teams={bezKonference} />
        ) : null}

        {!vLize.length ? (
          <Card className="px-4 py-3 text-[13px] text-mu">
            V téhle lize ještě není zařazený žádný tým.
          </Card>
        ) : null}
      </div>
    </section>
  );
}

function TymySkupina({ nadpis, teams }: { nadpis: string; teams: PlacedTeam[] }) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center justify-between bg-c2/60 px-4 py-2.5">
        <span className="text-[13px] font-semibold text-wh">{nadpis}</span>
        <span className="text-[12px] text-mu">{teams.length}</span>
      </div>
      {teams.length ? (
        <div className="divide-y divide-bd">
          {teams.map((t) => (
            <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
              <TeamDot color={t.color} />
              <span className="min-w-0 flex-1 truncate text-[14px] text-wh">{t.name}</span>
              <span className="text-[12px] font-bold text-di">{t.abbr}</span>
            </div>
          ))}
        </div>
      ) : (
        <p className="px-4 py-2.5 text-[12px] text-mu">Prázdné</p>
      )}
    </Card>
  );
}

function ScopeCard({
  active,
  title,
  desc,
  onClick,
  children,
}: {
  active: boolean;
  title: string;
  desc: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <Card className={clsx("overflow-hidden", active && "border-go")}>
      <button
        onClick={onClick}
        className={clsx(
          "flex w-full cursor-pointer items-center gap-3 p-4 text-left transition-colors",
          active ? "bg-go text-bg" : "hover:bg-c2/60",
        )}
      >
        <span className="min-w-0 flex-1">
          <span className="block text-[15px] font-bold">{title}</span>
          <span className={clsx("block text-[12px]", active ? "text-bg/70" : "text-mu")}>
            {desc}
          </span>
        </span>
        {active ? <CheckCircle2 size={20} /> : <Circle size={20} className="text-di" />}
      </button>
      {active ? <div className="border-t border-bd p-4">{children}</div> : null}
    </Card>
  );
}

function MoveTeamModal({
  team,
  divisions,
  conferences,
  busy,
  onClose,
  onSave,
}: {
  team: TeamLite | null;
  divisions: string[];
  conferences: string[];
  busy: boolean;
  onClose: () => void;
  onSave: (division: string, conference: string) => void;
}) {
  const [division, setDivision] = useState("");
  const [conference, setConference] = useState("");

  return (
    <Modal open={!!team} onClose={onClose} title={`Přesunout ${team?.name ?? ""}`} size="sm">
      <div className="space-y-4">
        <Field label="Konference">
          <ChipRow>
            <Chip active={conference === ""} onClick={() => setConference("")}>
              Bez konference
            </Chip>
            {conferences.map((c) => (
              <Chip key={c} active={conference === c} onClick={() => setConference(c)}>
                {c}
              </Chip>
            ))}
          </ChipRow>
          <Input
            className="mt-2"
            value={conference}
            onChange={(e) => setConference(e.target.value)}
            placeholder="Nebo napiš novou konferenci"
          />
        </Field>

        <Field label="Divize" required>
          <ChipRow>
            {divisions.map((d) => (
              <Chip key={d} active={division === d} onClick={() => setDivision(d)}>
                {d}
              </Chip>
            ))}
          </ChipRow>
          <Input
            className="mt-2"
            value={division}
            onChange={(e) => setDivision(e.target.value)}
            placeholder="Nebo napiš novou divizi"
          />
        </Field>

        <Button
          className="w-full"
          disabled={!division.trim()}
          loading={busy}
          onClick={() => onSave(division, conference)}
        >
          Přesunout
        </Button>
      </div>
    </Modal>
  );
}
