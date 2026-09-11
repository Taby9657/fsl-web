"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { Layers, Pencil, Plus, ShieldOff, Trash2, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { errMsg, leaguesApi, seasonsApi } from "@/lib/api";
import { pluralTeam } from "@/lib/format";
import type { LeagueNode, PlacedTeam } from "@/lib/types";
import {
  Badge,
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
} from "@/components/ui/primitives";
import { ConfirmDialog, Modal, SkeletonList } from "@/components/ui/feedback";
import { TeamDot } from "@/components/ui/data";
import { toast } from "@/components/ui/toast";

/** Úroveň struktury — kvůli hláškám v modálech, jinak se všechny tři chovají stejně. */
type Uroven = "liga" | "konference" | "divize";

const NAZEV_2_PAD: Record<Uroven, string> = {
  liga: "ligy",
  konference: "konference",
  divize: "divize",
};

/**
 * Jedno dialogové okno na všechna zadávání názvu — zakládání i přejmenování.
 * Držet si v něm `ulozit` jako funkci je schválně: jinak by tu musel být
 * stavový stroj se šesti variantami, který dělá pokaždé totéž.
 */
type NazevDialog = {
  titulek: string;
  popisek: string;
  tlacitko: string;
  hodnota: string;
  hlaska: string;
  ulozit: (name: string) => Promise<unknown>;
};

type Mazani = { uroven: Uroven; id: string; name: string };

export function LeagueClient() {
  /** Prázdná hodnota = aktuální sezóna podle nastavení ligy (dopočítá server). */
  const [season, setSeason] = useState("");
  const [novaLiga, setNovaLiga] = useState("");
  const [dialog, setDialog] = useState<NazevDialog | null>(null);
  const [mazani, setMazani] = useState<Mazani | null>(null);
  const [zarazovany, setZarazovany] = useState<PlacedTeam | null>(null);
  const [busy, setBusy] = useState(false);

  const seasons = useQuery({
    queryKey: ["seasons", "nastaveni"],
    staleTime: 30 * 60_000,
    queryFn: async () => (await seasonsApi.list()).data,
  });

  const tree = useQuery({
    queryKey: ["leagues", "tree", season],
    queryFn: async () => (await leaguesApi.tree(season || undefined)).data,
  });

  const teams = useQuery({
    queryKey: ["leagues", "teams", season],
    queryFn: async () => (await leaguesApi.teams(season || undefined)).data,
  });

  const leagues = tree.data?.leagues ?? [];
  const list = teams.data?.teams ?? [];
  /** Sezóna, kterou doopravdy vidíme — server ji dopočítá, když ji neposíláme. */
  const aktivniSezona = tree.data?.season ?? season;

  const moznosti = useMemo(() => {
    const s = seasons.data;
    return [...new Set([s?.current, s?.next, ...(s?.options ?? [])].filter(Boolean))] as string[];
  }, [seasons.data]);

  const nezarazenych = list.filter((t) => !t.placement).length;

  /** Jeden průchod pro každou změnu: zápis → načtení obojího → hláška. */
  async function akce(fn: () => Promise<unknown>, hlaska: string) {
    setBusy(true);
    try {
      await fn();
      await Promise.all([tree.refetch(), teams.refetch()]);
      toast.success(hlaska);
      return true;
    } catch (e) {
      toast.error("Nepovedlo se", errMsg(e));
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function zalozitLigu() {
    const name = novaLiga.trim();
    if (!name) return;
    const ok = await akce(
      () => leaguesApi.createLeague({ name, season: season || undefined }),
      "Liga založena",
    );
    if (ok) setNovaLiga("");
  }

  async function potvrditDialog() {
    if (!dialog) return;
    const name = dialog.hodnota.trim();
    if (!name) return;
    const ok = await akce(() => dialog.ulozit(name), dialog.hlaska);
    if (ok) setDialog(null);
  }

  async function smazat() {
    if (!mazani) return;
    const { uroven, id } = mazani;
    const ok = await akce(
      () =>
        uroven === "liga"
          ? leaguesApi.deleteLeague(id)
          : uroven === "konference"
            ? leaguesApi.deleteConference(id)
            : leaguesApi.deleteDivision(id),
      "Smazáno",
    );
    if (ok) setMazani(null);
  }

  function prejmenovat(uroven: Uroven, id: string, name: string) {
    setDialog({
      titulek: `Přejmenovat ${NAZEV_2_PAD[uroven]}`,
      popisek: "Název",
      tlacitko: "Uložit",
      hodnota: name,
      hlaska: "Přejmenováno",
      ulozit: (novy) =>
        uroven === "liga"
          ? leaguesApi.updateLeague(id, { name: novy })
          : uroven === "konference"
            ? leaguesApi.updateConference(id, novy)
            : leaguesApi.updateDivision(id, novy),
    });
  }

  async function zaradit(
    teamId: string,
    data: { leagueId: string | null; conferenceId?: string | null; divisionId?: string | null },
  ) {
    const ok = await akce(
      () => leaguesApi.setPlacement(teamId, { ...data, season: season || undefined }),
      data.leagueId ? "Tým zařazen" : "Tým vyřazen ze soutěže",
    );
    if (ok) setZarazovany(null);
  }

  return (
    <>
      <PageTitle
        title="Ligová struktura"
        subtitle="Liga → konference → divize a zařazení přihlášených týmů"
      />

      {moznosti.length > 1 ? (
        <ChipRow className="mb-5">
          {moznosti.map((s) => (
            <Chip key={s} active={aktivniSezona === s} onClick={() => setSeason(s)}>
              {s}
            </Chip>
          ))}
        </ChipRow>
      ) : null}

      {/* ---------- struktura ---------- */}
      <SectionTitle>
        {aktivniSezona ? `Struktura sezóny ${aktivniSezona}` : "Struktura sezóny"}
      </SectionTitle>

      {tree.isLoading ? (
        <SkeletonList rows={4} />
      ) : !leagues.length ? (
        <EmptyState
          icon={<Layers size={44} />}
          title="Pro tuhle sezónu ještě žádná liga není"
          description="Struktura se zakládá až po uzavření registrací, před rozlosováním. Registrace týmu ji nepotřebuje."
        />
      ) : (
        <div className="space-y-4">
          {leagues.map((liga) => (
            <LigaCard
              key={liga.id}
              liga={liga}
              onPrejmenovat={prejmenovat}
              onSmazat={setMazani}
              onPridatKonferenci={() =>
                setDialog({
                  titulek: `Nová konference v ${liga.name}`,
                  popisek: "Název konference",
                  tlacitko: "Přidat",
                  hodnota: "",
                  hlaska: "Konference přidána",
                  ulozit: (name) => leaguesApi.createConference(liga.id, name),
                })
              }
              onPridatDivizi={(conferenceId, konfName) =>
                setDialog({
                  titulek: `Nová divize v ${konfName}`,
                  popisek: "Název divize",
                  tlacitko: "Přidat",
                  hodnota: "",
                  hlaska: "Divize přidána",
                  ulozit: (name) => leaguesApi.createDivision(conferenceId, name),
                })
              }
            />
          ))}
        </div>
      )}

      <Card className="mt-4 p-4">
        <Field label="Nová liga v sezóně">
          <div className="flex gap-2">
            <Input
              value={novaLiga}
              onChange={(e) => setNovaLiga(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") zalozitLigu();
              }}
              placeholder="Například FSL Liga"
            />
            <Button loading={busy} disabled={!novaLiga.trim()} onClick={zalozitLigu}>
              <Plus size={16} /> Založit
            </Button>
          </div>
        </Field>
      </Card>

      {/* ---------- týmy ---------- */}
      <SectionTitle className="mt-8">
        {nezarazenych
          ? `Týmy přihlášené do sezóny · ${nezarazenych} nezařazených`
          : "Týmy přihlášené do sezóny"}
      </SectionTitle>

      {teams.isLoading ? (
        <SkeletonList rows={5} />
      ) : !list.length ? (
        <EmptyState
          icon={<Users size={44} />}
          title="Do téhle sezóny není přihlášený žádný tým"
          description="Přihláška do sezóny vzniká registrací týmu. Ve správě týmů se dá tým založit i ručně."
          action={
            <LinkButton href="/admin/tymy" size="sm">
              Správa týmů
            </LinkButton>
          }
        />
      ) : (
        <>
          <Card className="overflow-hidden">
            <div className="divide-y divide-bd">
              {list.map((t) => (
                <div key={t.id} className="flex items-center gap-3 px-4 py-3">
                  <TeamDot color={t.color} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] text-wh">{t.name}</span>
                    <span className="block truncate text-[12px] text-mu">
                      {t.placement
                        ? [
                            t.placement.league?.name,
                            t.placement.conference?.name,
                            t.placement.division?.name,
                          ]
                            .filter(Boolean)
                            .join(" · ")
                        : "Zatím nikam nezařazený"}
                    </span>
                  </span>
                  {!t.placement ? <Badge color="#EF4444">Nezařazeno</Badge> : null}
                  <Button
                    size="sm"
                    variant="subtle"
                    disabled={!leagues.length}
                    onClick={() => setZarazovany(t)}
                  >
                    {t.placement ? "Přeřadit" : "Zařadit"}
                  </Button>
                </div>
              ))}
            </div>
          </Card>

          {!leagues.length ? (
            <p className="mt-3 text-[13px] text-mu">
              Zařazovat půjde, až bude v sezóně aspoň jedna liga.
            </p>
          ) : null}
        </>
      )}

      {/* ---------- dialogy ---------- */}
      <Modal
        open={!!dialog}
        onClose={() => setDialog(null)}
        title={dialog?.titulek}
        size="sm"
      >
        <Field label={dialog?.popisek ?? "Název"} required>
          <Input
            value={dialog?.hodnota ?? ""}
            autoFocus
            onChange={(e) => setDialog((d) => (d ? { ...d, hodnota: e.target.value } : d))}
            onKeyDown={(e) => {
              if (e.key === "Enter") potvrditDialog();
            }}
          />
        </Field>
        <Button
          className="mt-4 w-full"
          loading={busy}
          disabled={!dialog?.hodnota.trim()}
          onClick={potvrditDialog}
        >
          {dialog?.tlacitko ?? "Uložit"}
        </Button>
      </Modal>

      <ConfirmDialog
        open={!!mazani}
        title={`Smazat ${mazani ? NAZEV_2_PAD[mazani.uroven] : ""}?`}
        message={
          mazani
            ? `„${mazani.name}“ se smaže. Když jsou v ní zařazené týmy, server mazání odmítne — nejdřív je přeřaď jinam.`
            : undefined
        }
        confirmLabel="Smazat"
        destructive
        loading={busy}
        onConfirm={smazat}
        onCancel={() => setMazani(null)}
      />

      <ZarazeniModal
        team={zarazovany}
        leagues={leagues}
        busy={busy}
        onClose={() => setZarazovany(null)}
        onSave={zaradit}
      />
    </>
  );
}

/* ---------------- jedna liga ---------------- */

function LigaCard({
  liga,
  onPrejmenovat,
  onSmazat,
  onPridatKonferenci,
  onPridatDivizi,
}: {
  liga: LeagueNode;
  onPrejmenovat: (uroven: Uroven, id: string, name: string) => void;
  onSmazat: (m: Mazani) => void;
  onPridatKonferenci: () => void;
  onPridatDivizi: (conferenceId: string, konfName: string) => void;
}) {
  return (
    <Card className="overflow-hidden">
      <div className="flex items-center gap-2 bg-c2/60 px-4 py-3">
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-bold text-wh">{liga.name}</span>
          <span className="block text-[12px] text-mu">
            Úroveň {liga.level}
            {typeof liga.teamCount === "number" ? ` · ${pluralTeam(liga.teamCount)}` : null}
          </span>
        </span>
        <IconButton
          label="Přejmenovat ligu"
          onClick={() => onPrejmenovat("liga", liga.id, liga.name)}
        >
          <Pencil size={15} />
        </IconButton>
        <IconButton
          label="Smazat ligu"
          danger
          onClick={() => onSmazat({ uroven: "liga", id: liga.id, name: liga.name })}
        >
          <Trash2 size={15} />
        </IconButton>
      </div>

      <div className="space-y-3 p-4">
        {liga.conferences.length ? (
          liga.conferences.map((konf) => (
            <div key={konf.id} className="rounded-xl border border-bd">
              <div className="flex items-center gap-2 px-3.5 py-2.5">
                <span className="min-w-0 flex-1 truncate text-[13px] font-semibold text-go">
                  {konf.name}
                  {typeof konf.teamCount === "number" ? (
                    <span className="ml-2 text-[12px] font-normal text-mu">{konf.teamCount}</span>
                  ) : null}
                </span>
                <IconButton
                  label="Přidat divizi"
                  onClick={() => onPridatDivizi(konf.id, konf.name)}
                >
                  <Plus size={15} />
                </IconButton>
                <IconButton
                  label="Přejmenovat konferenci"
                  onClick={() => onPrejmenovat("konference", konf.id, konf.name)}
                >
                  <Pencil size={15} />
                </IconButton>
                <IconButton
                  label="Smazat konferenci"
                  danger
                  onClick={() => onSmazat({ uroven: "konference", id: konf.id, name: konf.name })}
                >
                  <Trash2 size={15} />
                </IconButton>
              </div>

              {konf.divisions.length ? (
                <div className="divide-y divide-bd border-t border-bd">
                  {konf.divisions.map((div) => (
                    <div key={div.id} className="flex items-center gap-2 px-3.5 py-2.5">
                      <span className="min-w-0 flex-1 truncate text-[13px] text-wh">
                        {div.name}
                        {typeof div.teamCount === "number" ? (
                          <span className="ml-2 text-[12px] text-mu">{div.teamCount}</span>
                        ) : null}
                      </span>
                      <IconButton
                        label="Přejmenovat divizi"
                        onClick={() => onPrejmenovat("divize", div.id, div.name)}
                      >
                        <Pencil size={15} />
                      </IconButton>
                      <IconButton
                        label="Smazat divizi"
                        danger
                        onClick={() => onSmazat({ uroven: "divize", id: div.id, name: div.name })}
                      >
                        <Trash2 size={15} />
                      </IconButton>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="border-t border-bd px-3.5 py-2.5 text-[12px] text-mu">
                  Bez divizí — konference bez divizí je platný stav.
                </p>
              )}
            </div>
          ))
        ) : (
          <p className="text-[13px] text-mu">
            Liga bez konferencí je platný stav — týmy se pak zařazují přímo do ligy.
          </p>
        )}

        <Button variant="subtle" size="sm" onClick={onPridatKonferenci}>
          <Plus size={15} /> Přidat konferenci
        </Button>
      </div>
    </Card>
  );
}

function IconButton({
  label,
  danger,
  onClick,
  children,
}: {
  label: string;
  danger?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className={clsx(
        "shrink-0 cursor-pointer rounded-lg p-1.5 transition-colors",
        danger ? "text-mu hover:bg-red/15 hover:text-red" : "text-mu hover:bg-c2 hover:text-wh",
      )}
    >
      {children}
    </button>
  );
}

/* ---------------- zařazení týmu ---------------- */

function ZarazeniModal({
  team,
  leagues,
  busy,
  onClose,
  onSave,
}: {
  team: PlacedTeam | null;
  leagues: LeagueNode[];
  busy: boolean;
  onClose: () => void;
  onSave: (
    teamId: string,
    data: { leagueId: string | null; conferenceId?: string | null; divisionId?: string | null },
  ) => void;
}) {
  const [leagueId, setLeagueId] = useState("");
  const [conferenceId, setConferenceId] = useState("");
  const [divisionId, setDivisionId] = useState("");
  /** Čí zařazení je ve výběru — aby se při otevření jiného týmu nenabídlo to předchozí. */
  const [proTym, setProTym] = useState<string | null>(null);

  if (team && proTym !== team.id) {
    setProTym(team.id);
    setLeagueId(team.placement?.leagueId ?? "");
    setConferenceId(team.placement?.conferenceId ?? "");
    setDivisionId(team.placement?.divisionId ?? "");
  }

  const liga = leagues.find((l) => l.id === leagueId) ?? null;
  const konference = liga?.conferences ?? [];
  const divize = konference.find((k) => k.id === conferenceId)?.divisions ?? [];

  return (
    <Modal open={!!team} onClose={onClose} title={`Zařadit ${team?.name ?? ""}`} size="sm">
      <div className="space-y-4">
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

        {konference.length ? (
          <Field label="Konference">
            <ChipRow>
              <Chip
                active={conferenceId === ""}
                onClick={() => {
                  setConferenceId("");
                  setDivisionId("");
                }}
              >
                Bez konference
              </Chip>
              {konference.map((k) => (
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

        {conferenceId && divize.length ? (
          <Field label="Divize">
            <ChipRow>
              <Chip active={divisionId === ""} onClick={() => setDivisionId("")}>
                Bez divize
              </Chip>
              {divize.map((d) => (
                <Chip key={d.id} active={divisionId === d.id} onClick={() => setDivisionId(d.id)}>
                  {d.name}
                </Chip>
              ))}
            </ChipRow>
          </Field>
        ) : null}

        <Button
          className="w-full"
          loading={busy}
          disabled={!leagueId}
          onClick={() =>
            team &&
            onSave(team.id, {
              leagueId,
              conferenceId: conferenceId || null,
              divisionId: divisionId || null,
            })
          }
        >
          Zařadit
        </Button>

        {team?.placement ? (
          <Button
            variant="subtle"
            className="w-full"
            disabled={busy}
            onClick={() => team && onSave(team.id, { leagueId: null })}
          >
            <ShieldOff size={15} /> Vyřadit ze soutěže
          </Button>
        ) : null}

        <p className="text-[12px] leading-5 text-mu">
          Vyřazení ruší jen zařazení do struktury. Přihláška do sezóny týmu zůstává — odhlásit
          tým ze sezóny je jiná věc.
        </p>
      </div>
    </Modal>
  );
}
