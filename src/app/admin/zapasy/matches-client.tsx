"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { CalendarCog, Pencil, Plus, Square, Trash2, UserPlus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { errMsg, matchesApi, refereesApi, supervisorApi } from "@/lib/api";
import { fmtDateTime, fullName, MATCH_STATUS_LABEL } from "@/lib/format";
import type { Match, MatchStatus } from "@/lib/types";
import { useSeasons } from "@/hooks/use-league";
import {
  Button,
  Card,
  Chip,
  ChipRow,
  EmptyState,
  Field,
  Input,
  PageTitle,
} from "@/components/ui/primitives";
import { ConfirmDialog, Modal, SkeletonCards } from "@/components/ui/feedback";
import { TeamBadge, TeamDot } from "@/components/ui/data";
import { toast } from "@/components/ui/toast";

const STATUS_FILTERS: { id: string; label: string }[] = [
  { id: "UPCOMING", label: "Nadcházející" },
  { id: "LIVE", label: "LIVE" },
  { id: "DONE", label: "Odehrané" },
  { id: "", label: "Vše" },
];

const STATUS_COLOR: Record<MatchStatus, string> = {
  UPCOMING: "text-mu",
  LIVE: "text-red",
  DONE: "text-green",
  CANCELLED: "text-di",
};

type MatchForm = {
  homeTeamId: string;
  awayTeamId: string;
  date: string;
  time: string;
  venue: string;
  round: string;
  division: string;
  season: string;
};

const EMPTY: MatchForm = {
  homeTeamId: "",
  awayTeamId: "",
  date: "",
  time: "18:00",
  venue: "",
  round: "",
  division: "Divize A",
  season: "",
};

export function AdminMatchesClient() {
  const [status, setStatus] = useState("UPCOMING");
  const [season, setSeason] = useState<string | undefined>();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Match | null>(null);
  const [form, setForm] = useState<MatchForm>(EMPTY);
  const [assigning, setAssigning] = useState<Match | null>(null);
  const [deleting, setDeleting] = useState<Match | null>(null);
  const [ending, setEnding] = useState<Match | null>(null);
  const [busy, setBusy] = useState(false);

  const { data: seasons = [] } = useSeasons();

  const q = useQuery({
    queryKey: ["supervisor", "matches", status, season],
    queryFn: async () =>
      (await supervisorApi.matches({ status: status || undefined, season })).data,
  });

  const teams = useQuery({
    queryKey: ["supervisor", "teams", "all"],
    queryFn: async () => (await supervisorApi.teams()).data,
  });

  const referees = useQuery({
    queryKey: ["referees", "APPROVED"],
    queryFn: async () => (await refereesApi.list({ status: "APPROVED" })).data,
  });

  function openCreate() {
    setEditing(null);
    setForm({ ...EMPTY, season: seasons[0] ?? "" });
    setFormOpen(true);
  }

  function openEdit(m: Match) {
    const d = new Date(m.date);
    setEditing(m);
    setForm({
      homeTeamId: m.homeTeamId,
      awayTeamId: m.awayTeamId,
      date: d.toISOString().slice(0, 10),
      time: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
      venue: m.venue ?? "",
      round: m.round != null ? String(m.round) : "",
      division: m.division ?? "Divize A",
      season: m.season ?? "",
    });
    setFormOpen(true);
  }

  async function save() {
    if (!form.date) return toast.error("Chybí datum", "Vyber datum zápasu.");
    if (!/^\d{1,2}:\d{2}$/.test(form.time))
      return toast.error("Chybný čas", "Formát: HH:MM");
    if (!form.homeTeamId || !form.awayTeamId)
      return toast.error("Chybí týmy", "Vyber domácí i hostující tým.");
    if (form.homeTeamId === form.awayTeamId)
      return toast.error("Chyba", "Domácí a hosté musí být různé týmy.");

    const [h, min] = form.time.split(":").map(Number);
    const date = new Date(form.date);
    date.setHours(h, min, 0, 0);

    setBusy(true);
    try {
      const payload = {
        homeTeamId: form.homeTeamId,
        awayTeamId: form.awayTeamId,
        date: date.toISOString(),
        venue: form.venue.trim() || null,
        round: form.round ? parseInt(form.round, 10) : null,
        division: form.division.trim(),
        competition: "FSL Liga",
        season: form.season.trim() || null,
      };
      if (editing) await matchesApi.update(editing.id, payload);
      else await matchesApi.create(payload);
      await q.refetch();
      setFormOpen(false);
      toast.success(editing ? "Zápas upraven" : "Zápas vytvořen");
    } catch (e) {
      toast.error("Chyba", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function assign(refereeId: string) {
    if (!assigning) return;
    setBusy(true);
    try {
      await supervisorApi.assignReferee(assigning.id, refereeId);
      await q.refetch();
      setAssigning(null);
      toast.success("Rozhodčí přiřazen");
    } catch (e) {
      toast.error("Chyba", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await supervisorApi.deleteMatch(deleting.id);
      await q.refetch();
      setDeleting(null);
      toast.success("Zápas smazán");
    } catch (e) {
      toast.error("Nelze smazat", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function end() {
    if (!ending) return;
    setBusy(true);
    try {
      await matchesApi.endMatch(ending.id);
      await q.refetch();
      setEnding(null);
      toast.success("Zápas ukončen");
    } catch (e) {
      toast.error("Chyba", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle
        title="Správa zápasů"
        subtitle="Rozpis, přiřazení rozhodčích a úpravy zápasů"
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus size={16} /> Nový zápas
          </Button>
        }
      />

      <div className="mb-5 space-y-2">
        <ChipRow>
          {STATUS_FILTERS.map((f) => (
            <Chip key={f.id} active={status === f.id} onClick={() => setStatus(f.id)}>
              {f.label}
            </Chip>
          ))}
        </ChipRow>
        {seasons.length > 1 ? (
          <ChipRow>
            {seasons.map((s, i) => (
              <Chip
                key={s}
                active={season === s || (!season && i === 0)}
                onClick={() => setSeason(i === 0 ? undefined : s)}
              >
                {s}
              </Chip>
            ))}
          </ChipRow>
        ) : null}
      </div>

      {q.isLoading ? (
        <SkeletonCards count={5} />
      ) : !q.data?.length ? (
        <EmptyState icon={<CalendarCog size={44} />} title="Žádné zápasy" />
      ) : (
        <div className="space-y-3">
          {q.data.map((m) => (
            <Card key={m.id} className="p-4">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className={clsx(
                    "text-[11px] font-bold uppercase tracking-wide",
                    STATUS_COLOR[m.status],
                  )}
                >
                  {MATCH_STATUS_LABEL[m.status]}
                </span>
                {m.round != null ? (
                  <span className="rounded-full bg-c2 px-2 py-0.5 text-[11px] font-semibold text-mu">
                    Kolo {m.round}
                  </span>
                ) : null}
                <span className="ml-auto text-[11px] text-di">{m.division}</span>
              </div>

              <div className="flex items-center gap-3">
                <TeamBadge abbr={m.homeTeam?.abbr} color={m.homeTeam?.color} size={32} />
                <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-wh">
                  {m.homeTeam?.abbr}
                </span>
                <span className="tabular shrink-0 text-[17px] font-black text-go">
                  {m.status === "UPCOMING" ? "vs" : `${m.homeScore}:${m.awayScore}`}
                </span>
                <span className="min-w-0 flex-1 truncate text-right text-[15px] font-bold text-wh">
                  {m.awayTeam?.abbr}
                </span>
                <TeamBadge abbr={m.awayTeam?.abbr} color={m.awayTeam?.color} size={32} />
              </div>

              <p className="mt-2 text-[12px] text-mu">
                {fmtDateTime(m.date)}
                {m.venue ? ` · ${m.venue}` : ""}
              </p>

              <div className="mt-3">
                {m.referee ? (
                  <div className="flex items-center gap-2 rounded-lg border border-green/30 bg-green/10 px-3 py-2">
                    <span className="text-[13px] text-green">
                      Rozhodčí: {fullName(m.referee)} ({m.referee.level})
                    </span>
                    <button
                      onClick={() => setAssigning(m)}
                      className="ml-auto cursor-pointer text-[12px] font-semibold text-mu hover:text-wh"
                    >
                      Změnit
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setAssigning(m)}
                    className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-pu/50 px-3 py-2 text-[13px] font-semibold text-pu transition-colors hover:bg-pu/10"
                  >
                    <UserPlus size={15} /> Přiřadit rozhodčího
                  </button>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2 border-t border-bd pt-3">
                <Link
                  href={`/zapasy/${m.id}`}
                  className="rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-mu transition-colors hover:bg-c2 hover:text-wh"
                >
                  Detail
                </Link>
                <button
                  onClick={() => openEdit(m)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-go transition-colors hover:bg-go/10"
                >
                  <Pencil size={14} /> Upravit
                </button>
                {m.status === "LIVE" ? (
                  <button
                    onClick={() => setEnding(m)}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-red transition-colors hover:bg-red/10"
                  >
                    <Square size={14} /> Ukončit
                  </button>
                ) : null}
                {m.status === "UPCOMING" ? (
                  <button
                    onClick={() => setDeleting(m)}
                    className="ml-auto flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-red transition-colors hover:bg-red/10"
                  >
                    <Trash2 size={14} /> Smazat
                  </button>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* formulář zápasu */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Upravit zápas" : "Nový zápas"}
      >
        <div className="space-y-4">
          <Field label="Domácí tým" required>
            <ChipRow>
              {(teams.data ?? []).map((t) => (
                <Chip
                  key={t.id}
                  active={form.homeTeamId === t.id}
                  onClick={() => setForm({ ...form, homeTeamId: t.id })}
                >
                  <span className="flex items-center gap-1.5">
                    <TeamDot color={t.color} size={7} />
                    {t.abbr}
                  </span>
                </Chip>
              ))}
            </ChipRow>
          </Field>

          <Field label="Hostující tým" required>
            <ChipRow>
              {(teams.data ?? []).map((t) => (
                <Chip
                  key={t.id}
                  accent="purple"
                  active={form.awayTeamId === t.id}
                  onClick={() => setForm({ ...form, awayTeamId: t.id })}
                >
                  <span className="flex items-center gap-1.5">
                    <TeamDot color={t.color} size={7} />
                    {t.abbr}
                  </span>
                </Chip>
              ))}
            </ChipRow>
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Datum" required>
              <Input
                type="date"
                value={form.date}
                onChange={(e) => setForm({ ...form, date: e.target.value })}
              />
            </Field>
            <Field label="Čas">
              <Input
                type="time"
                value={form.time}
                onChange={(e) => setForm({ ...form, time: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <Field label="Hřiště">
              <Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
            </Field>
            <Field label="Kolo">
              <Input
                value={form.round}
                inputMode="numeric"
                onChange={(e) => setForm({ ...form, round: e.target.value.replace(/\D/g, "") })}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
            <Field label="Divize">
              <Input
                value={form.division}
                onChange={(e) => setForm({ ...form, division: e.target.value })}
              />
            </Field>
            <Field label="Sezóna">
              <Input
                value={form.season}
                placeholder="2025/26"
                onChange={(e) => setForm({ ...form, season: e.target.value })}
              />
            </Field>
          </div>

          <Button className="w-full" onClick={save} loading={busy}>
            {editing ? "Uložit změny" : "Vytvořit zápas"}
          </Button>
        </div>
      </Modal>

      {/* přiřazení rozhodčího */}
      <Modal open={!!assigning} onClose={() => setAssigning(null)} title="Přiřadit rozhodčího">
        {assigning ? (
          <>
            <p className="mb-4 text-[13px] text-mu">
              {assigning.homeTeam?.abbr} vs {assigning.awayTeam?.abbr} ·{" "}
              {fmtDateTime(assigning.date)}
            </p>
            {!referees.data?.length ? (
              <p className="text-[14px] text-mu">Žádní schválení rozhodčí</p>
            ) : (
              <div className="divide-y divide-bd rounded-xl border border-bd">
                {referees.data.map((r) => (
                  <button
                    key={r.id}
                    disabled={busy}
                    onClick={() => assign(r.id)}
                    className="flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-c2 disabled:opacity-50"
                  >
                    <span className="flex h-9 w-9 items-center justify-center rounded-full bg-pu/20 text-[12px] font-bold text-pu">
                      {r.level}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[14px] text-wh">
                      {fullName(r)}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Smazat zápas"
        message={`${deleting?.homeTeam?.abbr} vs ${deleting?.awayTeam?.abbr}\n${
          deleting ? fmtDateTime(deleting.date) : ""
        }\n\nOpravdu smazat?`}
        confirmLabel="Smazat"
        destructive
        loading={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />

      <ConfirmDialog
        open={!!ending}
        title="Ukončit zápas"
        message={`${ending?.homeTeam?.abbr} ${ending?.homeScore}:${ending?.awayScore} ${ending?.awayTeam?.abbr}\n\nUkončit zápas a nastavit stav na Odehráno?`}
        confirmLabel="Ukončit"
        destructive
        loading={busy}
        onConfirm={end}
        onCancel={() => setEnding(null)}
      />
    </>
  );
}
