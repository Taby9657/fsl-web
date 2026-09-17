"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { CheckCircle2, Pencil, Plus, Shield, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { errMsg, supervisorApi } from "@/lib/api";
import { fmtDate, REG_STATUS_COLOR, REG_STATUS_LABEL } from "@/lib/format";
import type { RegStatus, Team } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  Chip,
  ChipRow,
  EmptyState,
  Field,
  Input,
  PageTitle,
  Textarea,
} from "@/components/ui/primitives";
import { ConfirmDialog, Modal, SkeletonList } from "@/components/ui/feedback";
import { TeamBadge } from "@/components/ui/data";
import { toast } from "@/components/ui/toast";

const PALETTE = [
  "#C9A140", "#7C3AED", "#2563EB", "#DC2626", "#16A34A",
  "#EA580C", "#DB2777", "#0891B2", "#65A30D", "#9333EA",
];

const REG_FILTERS: { id: string; label: string }[] = [
  { id: "", label: "Vše" },
  { id: "PENDING", label: "Čekající" },
  { id: "APPEALING", label: "Odvolání" },
  { id: "APPROVED", label: "Schválené" },
  { id: "REJECTED", label: "Zamítnuté" },
];

const PAY_FILTERS: { id: string; label: string }[] = [
  { id: "", label: "Platby: vše" },
  { id: "PENDING", label: "Nezaplaceno" },
  { id: "PAID", label: "Zaplaceno" },
  { id: "OVERDUE", label: "Po splatnosti" },
];

const GROUP_ORDER: { status: RegStatus; label: string }[] = [
  { status: "PENDING", label: "⏳ Čeká na schválení" },
  { status: "APPEALING", label: "⚠️ Odvolání" },
  { status: "REJECTED", label: "❌ Zamítnuto" },
  { status: "APPROVED", label: "✅ Schváleno" },
];

type FormState = {
  name: string;
  abbr: string;
  division: string;
  conference: string;
  venue: string;
  color: string;
  isOpen: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  abbr: "",
  division: "Divize A",
  conference: "",
  venue: "",
  color: "#C9A140",
  isOpen: false,
};

export function AdminTeamsClient() {
  const [regStatus, setRegStatus] = useState("");
  const [payStatus, setPayStatus] = useState("");
  const [editing, setEditing] = useState<Team | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [reviewing, setReviewing] = useState<Team | null>(null);
  const [note, setNote] = useState("");
  const [deleting, setDeleting] = useState<Team | null>(null);
  const [busy, setBusy] = useState(false);
  // Soubor se drží mimo `form`: logo se nahrává až po uložení týmu, protože
  // nový tým do té chvíle nemá `id`, pod které by se dalo nahrát.
  const [logoFile, setLogoFile] = useState<File | null>(null);

  const q = useQuery({
    queryKey: ["supervisor", "teams", regStatus, payStatus],
    queryFn: async () =>
      (
        await supervisorApi.teams({
          regStatus: regStatus || undefined,
          payStatus: payStatus || undefined,
        })
      ).data,
  });

  const grouped = useMemo(() => {
    const list = q.data ?? [];
    return GROUP_ORDER.map((g) => ({
      ...g,
      teams: list.filter((t) => (t.regStatus ?? "APPROVED") === g.status),
    })).filter((g) => g.teams.length > 0);
  }, [q.data]);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setLogoFile(null);
    setFormOpen(true);
  }

  function openEdit(t: Team) {
    setEditing(t);
    setForm({
      name: t.name,
      abbr: t.abbr,
      division: t.division ?? "Divize A",
      conference: t.conference ?? "",
      venue: t.venue ?? "",
      color: t.color ?? "#C9A140",
      isOpen: t.isOpen ?? false,
    });
    setLogoFile(null);
    setFormOpen(true);
  }

  async function saveTeam() {
    if (!form.name.trim() || !form.abbr.trim() || !form.division.trim()) {
      toast.error("Chybí údaje", "Vyplň název, zkratku a divizi.");
      return;
    }
    if (form.abbr.trim().length > 3) {
      toast.error("Chyba", "Zkratka může mít maximálně 3 znaky.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        name: form.name.trim(),
        abbr: form.abbr.trim().toUpperCase(),
        division: form.division.trim(),
        conference: form.conference.trim() || null,
        venue: form.venue.trim() || null,
        color: form.color,
        isOpen: form.isOpen,
      };
      const ulozeny = editing
        ? (await supervisorApi.updateTeam(editing.id, payload)).data
        : (await supervisorApi.createTeam(payload)).data;

      // Logo až teď — nový tým dostane `id` teprve uložením. Když se nahrání
      // nepovede, tým zůstane uložený a řekne se to zvlášť: přijít o vyplněný
      // formulář kvůli obrázku by bylo horší než tým bez loga.
      if (logoFile) {
        try {
          await supervisorApi.uploadTeamLogo(ulozeny.id, logoFile);
        } catch (e) {
          toast.error("Tým uložen, logo ne", errMsg(e));
        }
      }

      await q.refetch();
      setFormOpen(false);
      setLogoFile(null);
      toast.success(editing ? "Tým upraven" : "Tým vytvořen");
    } catch (e) {
      toast.error("Chyba", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function removeTeam() {
    if (!deleting) return;
    setBusy(true);
    try {
      await supervisorApi.deleteTeam(deleting.id);
      await q.refetch();
      setDeleting(null);
      toast.success("Tým smazán");
    } catch (e) {
      toast.error("Nelze smazat", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function decide(approve: boolean) {
    if (!reviewing) return;
    if (!approve && !note.trim()) {
      toast.error("Chyba", "Důvod zamítnutí je povinný.");
      return;
    }
    setBusy(true);
    try {
      if (approve) await supervisorApi.approveTeam(reviewing.id, note.trim() || undefined);
      else await supervisorApi.rejectTeam(reviewing.id, note.trim());
      await q.refetch();
      setReviewing(null);
      setNote("");
      toast.success(approve ? "Tým schválen" : "Tým zamítnut");
    } catch (e) {
      toast.error("Chyba", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle
        title="Správa týmů"
        subtitle="Registrace, schvalování a evidence týmů"
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus size={16} /> Nový tým
          </Button>
        }
      />

      <div className="mb-5 space-y-2">
        <ChipRow>
          {REG_FILTERS.map((f) => (
            <Chip
              key={f.id}
              accent="purple"
              active={regStatus === f.id}
              onClick={() => setRegStatus(f.id)}
            >
              {f.label}
            </Chip>
          ))}
        </ChipRow>
        <ChipRow>
          {PAY_FILTERS.map((f) => (
            <Chip key={f.id} active={payStatus === f.id} onClick={() => setPayStatus(f.id)}>
              {f.label}
            </Chip>
          ))}
        </ChipRow>
      </div>

      {q.isLoading ? (
        <SkeletonList rows={8} />
      ) : !q.data?.length ? (
        <EmptyState
          icon={<Shield size={44} />}
          title="Žádné týmy"
          action={
            <Button size="sm" onClick={openCreate}>
              Přidat první tým
            </Button>
          }
        />
      ) : (
        <div className="space-y-8">
          {grouped.map((g) => (
            <section key={g.status}>
              <h2 className="mb-3 text-[11px] font-semibold label-caps uppercase text-mu">
                {g.label} ({g.teams.length})
              </h2>
              <Card className="overflow-hidden">
                <div className="divide-y divide-bd">
                  {g.teams.map((t) => {
                    const pay = Array.isArray(t.payments) ? t.payments[0] : t.payments;
                    const st = (t.regStatus ?? "APPROVED") as RegStatus;
                    return (
                      <div key={t.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5">
                        <TeamBadge abbr={t.abbr} color={t.color} logoUrl={t.logoUrl} size={44} />
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="truncate text-[15px] font-semibold text-wh">
                              {t.name}
                            </span>
                            <Badge color={REG_STATUS_COLOR[st]}>{REG_STATUS_LABEL[st]}</Badge>
                            {t.isOpen ? <Badge color="#0891B2">Otevřený</Badge> : null}
                            {pay ? (
                              <Badge
                                color={
                                  pay.status === "PAID"
                                    ? "#22C55E"
                                    : pay.status === "OVERDUE"
                                      ? "#EF4444"
                                      : "#9B8BC8"
                                }
                              >
                                {pay.status === "PAID"
                                  ? "Zaplaceno"
                                  : pay.status === "OVERDUE"
                                    ? "Po splatnosti"
                                    : "Nezaplaceno"}
                              </Badge>
                            ) : null}
                          </div>
                          <p className="mt-0.5 text-[12px] text-mu">
                            {t._count?.players ?? 0} hráčů · {t.division}
                            {t.conference ? ` · ${t.conference}` : ""}
                          </p>
                          {st === "APPEALING" && t.regAppeal ? (
                            <p className="mt-1 line-clamp-2 text-[12px] italic text-amber">
                              💬 {t.regAppeal}
                              {t.regAppealAt ? ` (${fmtDate(t.regAppealAt)})` : ""}
                            </p>
                          ) : null}
                          {st === "REJECTED" && t.regNote ? (
                            <p className="mt-1 line-clamp-2 text-[12px] italic text-mu">
                              ℹ️ {t.regNote}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          {st === "PENDING" || st === "APPEALING" ? (
                            <button
                              onClick={() => {
                                setReviewing(t);
                                setNote("");
                              }}
                              aria-label="Přezkoumat"
                              className="cursor-pointer rounded-lg p-2 text-pu transition-colors hover:bg-pu/15"
                            >
                              <CheckCircle2 size={17} />
                            </button>
                          ) : null}
                          <button
                            onClick={() => openEdit(t)}
                            aria-label="Upravit"
                            className="cursor-pointer rounded-lg p-2 text-mu transition-colors hover:bg-c2 hover:text-wh"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => setDeleting(t)}
                            aria-label="Smazat"
                            className="cursor-pointer rounded-lg p-2 text-red transition-colors hover:bg-red/10"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            </section>
          ))}
        </div>
      )}

      {/* formulář týmu */}
      <Modal
        open={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Upravit tým" : "Nový tým"}
      >
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <TeamBadge
              abbr={form.abbr || "??"}
              color={form.color}
              logoUrl={editing?.logoUrl}
              size={48}
            />
            <div className="min-w-0">
              <p className="truncate text-[15px] font-bold text-wh">
                {form.name || "Název týmu"}
              </p>
              <p className="text-[12px] text-mu">{form.division}</p>
            </div>
          </div>

          <Field label="Název týmu" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </Field>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Zkratka (max 3)" required>
              <Input
                value={form.abbr}
                maxLength={3}
                onChange={(e) =>
                  setForm({ ...form, abbr: e.target.value.toUpperCase().slice(0, 3) })
                }
              />
            </Field>
            <Field label="Divize" required>
              <Input
                value={form.division}
                onChange={(e) => setForm({ ...form, division: e.target.value })}
              />
            </Field>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Konference">
              <Input
                value={form.conference}
                onChange={(e) => setForm({ ...form, conference: e.target.value })}
              />
            </Field>
            <Field label="Domácí hřiště">
              <Input value={form.venue} onChange={(e) => setForm({ ...form, venue: e.target.value })} />
            </Field>
          </div>

          <Field label="Barva týmu">
            <div className="flex flex-wrap gap-2.5">
              {PALETTE.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  aria-label={c}
                  className={clsx(
                    "h-9 w-9 cursor-pointer rounded-full",
                    form.color === c && "ring-2 ring-white ring-offset-2 ring-offset-c1",
                  )}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </Field>

          {/* Logo se nahrává tudy, ne přes `POST /teams/:id/logo` — tamta
              cesta patří vedoucímu týmu a tým bez vedoucího by logo nedostal
              nikdy. Soubor se posílá až po uložení týmu, viz `saveTeam`. */}
          <Field label="Logo týmu">
            <input
              type="file"
              accept="image/*"
              onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
              className="block w-full text-[13px] text-mu file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-c2 file:px-3 file:py-2 file:text-[13px] file:text-wh"
            />
            <p className="mt-1.5 text-[12px] leading-5 text-mu">
              {logoFile
                ? `Vybráno: ${logoFile.name} — nahraje se po uložení.`
                : editing?.logoUrl
                  ? "Tým logo má. Nový soubor ho přepíše."
                  : "Bez loga se ukáže zkratka na barevném podkladu."}
            </p>
          </Field>

          {editing?.logoUrl && !logoFile ? (
            <Button
              variant="subtle"
              className="w-full"
              loading={busy}
              onClick={async () => {
                setBusy(true);
                try {
                  await supervisorApi.removeTeamLogo(editing.id);
                  await q.refetch();
                  setEditing({ ...editing, logoUrl: null });
                  toast.success("Logo odebráno");
                } catch (e) {
                  toast.error("Chyba", errMsg(e));
                } finally {
                  setBusy(false);
                }
              }}
            >
              Odebrat logo
            </Button>
          ) : null}

          {/* Otevřený tým: žádný živý vedoucí, hráče do něj zařazuje
              supervisor ve Správě hráčů. Registraci 3 000 Kč neplatí —
              tahle cesta žádný předpis nezakládá.

              **Ven se to nesmí dostat do 2. 11. 2026.** `isOpen` proto není
              ve veřejných datech a nikde mimo `/admin` se nevykresluje: než
              se losuje, nikdo zvenku nemá vědět, který tým je poskládaný
              z jednotlivců. */}
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-bd bg-c2 p-3.5">
            <input
              type="checkbox"
              checked={form.isOpen}
              onChange={(e) => setForm({ ...form, isOpen: e.target.checked })}
              className="mt-0.5 size-5 shrink-0 cursor-pointer accent-go"
            />
            <span className="min-w-0">
              <span className="block text-[15px] font-medium text-wh">
                Otevřený tým (virtuální vedoucí)
              </span>
              <span className="mt-0.5 block text-[13px] leading-5 text-mu">
                Nemá vedoucího ani pozvánkový kód — hráče do něj zařadíš ve
                Správě hráčů. Registraci 3 000 Kč neplatí. Venku to vidět není.
              </span>
            </span>
          </label>

          <Button className="w-full" onClick={saveTeam} loading={busy}>
            {editing ? "Uložit změny" : "Vytvořit tým"}
          </Button>
        </div>
      </Modal>

      {/* přezkoumání registrace */}
      <Modal
        open={!!reviewing}
        onClose={() => setReviewing(null)}
        title="Přezkoumat registraci"
      >
        {reviewing ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <TeamBadge abbr={reviewing.abbr} color={reviewing.color} size={40} />
              <div>
                <p className="text-[15px] font-bold text-wh">{reviewing.name}</p>
                <p className="text-[12px] text-mu">{reviewing.division}</p>
              </div>
            </div>

            {reviewing.regStatus === "APPEALING" && reviewing.regAppeal ? (
              <div className="rounded-xl border border-amber/40 bg-amber/10 p-4">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-amber">
                  Odvolání vedoucího
                </p>
                <p className="mt-1.5 text-[13px] leading-6 text-mu">{reviewing.regAppeal}</p>
                {reviewing.regAppealAt ? (
                  <p className="mt-1 text-[11px] text-di">{fmtDate(reviewing.regAppealAt)}</p>
                ) : null}
              </div>
            ) : null}

            <Field
              label={`Poznámka ke schválení / důvod zamítnutí${
                reviewing.regStatus === "APPEALING" ? "" : " (povinné pro zamítnutí)"
              }`}
            >
              <Textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="min-h-[90px]"
              />
            </Field>

            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-red/50 text-red hover:bg-red/10"
                loading={busy}
                onClick={() => decide(false)}
              >
                Zamítnout
              </Button>
              <Button className="flex-1" loading={busy} onClick={() => decide(true)}>
                Schválit
              </Button>
            </div>
          </div>
        ) : null}
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Smazat tým"
        message={`Opravdu smazat tým „${deleting?.name}"?\n\nSmazat lze jen tým bez hráčů a bez zápasů.`}
        confirmLabel="Smazat"
        destructive
        loading={busy}
        onConfirm={removeTeam}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
