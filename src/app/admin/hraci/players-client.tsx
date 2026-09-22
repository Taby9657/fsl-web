"use client";

import { useQuery } from "@tanstack/react-query";
import clsx from "clsx";
import { LogOut, Shield, Trash2, UserPlus, Users } from "lucide-react";
import { useMemo, useState } from "react";
import { errMsg, supervisorApi } from "@/lib/api";
import { fmtDate, positionLabel } from "@/lib/format";
import type { AdminPlayer, RosterSlot } from "@/lib/types";
import { vekVLetech } from "@/lib/validation";
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
  Select,
} from "@/components/ui/primitives";
import { Modal, SkeletonList } from "@/components/ui/feedback";
import { Avatar, SearchInput } from "@/components/ui/data";
import { toast } from "@/components/ui/toast";

/**
 * „4. 9. 2003 · 23 let". Věk se počítá dovršený, stejně jako u hranice 18+
 * při registraci — supervisor u soupisky nepotřebuje datum přepočítávat
 * v hlavě.
 *
 * Datum narození může chybět jen u účtů z doby, kdy bylo volitelné
 * (do 11. 9. 2026). Nová registrace se bez něj nedokončí.
 */
function narozeni(h: AdminPlayer): string | null {
  if (!h.birthdate) return null;
  const let_ = vekVLetech(String(h.birthdate).slice(0, 10));
  return `${fmtDate(h.birthdate)}${let_ === null ? "" : ` · ${let_} let`}`;
}

const FILTRY = [
  { id: "bezTymu", label: "Bez týmu" },
  { id: "vPoolu", label: "V draftu" },
  { id: "", label: "Všichni" },
] as const;

type Filtr = (typeof FILTRY)[number]["id"];

/**
 * Správa hráčů — kde liga ručně rozhodne, kdo kde hraje.
 *
 * Výchozí filtr je **bez týmu**, protože to je jediný stav, který někdo
 * musí vyřešit: hráč se přihlásil, zaplatil a čeká, jestli si ho někdo
 * všimne. Ostatní hráče si spravuje jejich vedoucí sám.
 */
export function AdminPlayersClient() {
  const [filtr, setFiltr] = useState<Filtr>("bezTymu");
  const [hledej, setHledej] = useState("");
  const [zarazuji, setZarazuji] = useState<AdminPlayer | null>(null);
  const [odvadim, setOdvadim] = useState<AdminPlayer | null>(null);
  const [teamId, setTeamId] = useState("");
  const [dres, setDres] = useState("");
  const [slot, setSlot] = useState<RosterSlot>("FIELD");
  const [doPoolu, setDoPoolu] = useState(true);
  const [mazu, setMazu] = useState<AdminPlayer | null>(null);
  const [sUctem, setSUctem] = useState(true);
  const [busy, setBusy] = useState(false);

  const q = useQuery({
    queryKey: ["supervisor", "players", filtr],
    queryFn: async () =>
      (
        await supervisorApi.players({
          bezTymu: filtr === "bezTymu" ? 1 : undefined,
          vPoolu: filtr === "vPoolu" ? 1 : undefined,
        })
      ).data,
  });

  const tymy = useQuery({
    queryKey: ["supervisor", "teams", "vyber"],
    queryFn: async () => (await supervisorApi.teams()).data,
  });

  // Hledá se v načteném seznamu, ne novým dotazem — u pár set hráčů je to
  // okamžité a nebliká to při každém písmenu.
  const hraci = useMemo(() => {
    const vse = q.data?.players ?? [];
    const dotaz = hledej.trim().toLowerCase();
    if (!dotaz) return vse;
    return vse.filter((h) =>
      `${h.firstName} ${h.lastName}`.toLowerCase().includes(dotaz),
    );
  }, [q.data, hledej]);

  function otevriZarazeni(h: AdminPlayer) {
    setZarazuji(h);
    setTeamId("");
    setDres(String(h.jersey ?? 0));
    // Post z draftu je to, podle čeho se vedoucí rozhoduje, takže má přednost.
    const post = h.draftProfile?.position ?? h.position;
    setSlot(/brank|^gk$|^g$/i.test(post ?? "") ? "GOALKEEPER" : "FIELD");
  }

  const vybranyTym = (tymy.data ?? []).find((t) => t.id === teamId);

  async function zarad() {
    if (!zarazuji) return;
    if (!teamId) {
      toast.error("Vyber tým", "Bez týmu není co uložit.");
      return;
    }
    setBusy(true);
    try {
      const r = await supervisorApi.setPlayerTeam(zarazuji.id, {
        teamId,
        jersey: dres.trim() === "" ? undefined : Number(dres),
        slot,
      });
      await q.refetch();
      const jmeno = `${zarazuji.firstName} ${zarazuji.lastName}`;
      setZarazuji(null);
      // U otevřeného týmu je zařazení zároveň vstup do soutěže — částka,
      // která hráči spadla do košíku, musí být vidět i tomu, kdo zařazoval.
      toast.success(
        "Zařazeno",
        (r.data as unknown as { vstupniBalik?: { amount: number } }).vstupniBalik
          ? `${jmeno} je na soupisce. V košíku mu čeká Virtuální vedoucí za `
            + `${(r.data as unknown as { vstupniBalik: { amount: number } }).vstupniBalik.amount} Kč`
            + " a e-mail o tom už dostal."
          : `${jmeno} je na soupisce a e-mail o tom dostal.`,
      );
    } catch (e) {
      toast.error("Nešlo zařadit", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function odved() {
    if (!odvadim) return;
    setBusy(true);
    try {
      const r = await supervisorApi.setPlayerTeam(odvadim.id, { teamId: null, doPoolu });
      await q.refetch();
      setOdvadim(null);
      toast.success(
        "Hráč je bez týmu",
        (r.data as unknown as { ponechanoKvuliStartum?: boolean })
          .ponechanoKvuliStartum
          ? "Na soupisce zůstal — za tým už odehrál zápas."
          : doPoolu
            ? "Vrátil se mezi volné hráče."
            : "Ze soupisky je odebraný.",
      );
    } catch (e) {
      toast.error("Nešlo odvést", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  /**
   * Smazání hráče — pro testovací registrace a pro toho, kdo o zrušení sám
   * požádá. Backend odmítne každého, kdo už nastoupil nebo má zaplaceno;
   * tady se tedy nic nekontroluje podruhé, jen se srozumitelně ukáže, proč
   * to nešlo.
   */
  async function smaz() {
    if (!mazu) return;
    setBusy(true);
    try {
      const r = await supervisorApi.deletePlayer(mazu.id, sUctem);
      await q.refetch();
      const jmeno = `${mazu.firstName} ${mazu.lastName}`;
      const ucet = r.data?.ucet;
      setMazu(null);
      toast.success(
        "Smazáno",
        ucet?.smazan
          ? `${jmeno} i jeho účet jsou pryč.`
          : ucet?.duvod
            ? `${jmeno} je pryč, účet zůstal: ${ucet.duvod.toLowerCase()}.`
            : `${jmeno} je pryč.`,
      );
    } catch (e) {
      toast.error("Nešlo smazat", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function zmenDres(h: AdminPlayer, cislo: string) {
    const n = Number(cislo);
    if (cislo.trim() === "" || isNaN(n) || n < 0 || n > 99) {
      toast.error("Neplatné číslo", "Dres musí být 0–99.");
      return;
    }
    if (n === h.jersey) return;
    try {
      await supervisorApi.updatePlayer(h.id, { jersey: n });
      await q.refetch();
      toast.success("Dres změněn");
    } catch (e) {
      toast.error("Nešlo změnit", errMsg(e));
    }
  }

  const sezona = q.data?.season;

  return (
    <>
      <PageTitle
        title="Správa hráčů"
        subtitle={
          sezona
            ? `Zařazení do týmů a soupisek — sezóna ${sezona}`
            : "Zařazení do týmů a soupisek"
        }
      />

      <div className="mb-5 space-y-2">
        <ChipRow>
          {FILTRY.map((f) => (
            <Chip key={f.id} active={filtr === f.id} onClick={() => setFiltr(f.id)}>
              {f.label}
            </Chip>
          ))}
        </ChipRow>
        <SearchInput value={hledej} onChange={setHledej} placeholder="Jméno hráče…" />
      </div>

      {q.isLoading ? (
        <SkeletonList rows={6} />
      ) : !hraci.length ? (
        <EmptyState
          icon={<Users size={44} />}
          title={filtr === "bezTymu" ? "Všichni mají tým" : "Nikdo tu není"}
          description={
            filtr === "bezTymu"
              ? "Nikdo nečeká na zařazení. Až se někdo přihlásí bez pozvánkového kódu, objeví se tady."
              : "Zkus jiný filtr nebo jiné jméno."
          }
        />
      ) : (
        <div className="space-y-2.5">
          {hraci.map((h) => {
            const naSoupisce = h.rosters?.some((r) => r.teamId === h.teamId);
            const vPoolu = h.draftProfile?.isActive === true;
            const licence = h.payment?.licStatus === "PAID";
            return (
              <Card key={h.id} className="p-4">
                <div className="flex flex-wrap items-center gap-4">
                  <Avatar
                    photoUrl={h.photoUrl}
                    firstName={h.firstName}
                    lastName={h.lastName}
                    size={44}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[15px] font-semibold text-wh">
                      {h.firstName} {h.lastName}
                    </p>
                    <p className="text-[13px] text-mu">
                      {positionLabel(h.draftProfile?.position ?? h.position)}
                      {narozeni(h) ? ` · ${narozeni(h)}` : ""}
                    </p>
                    {/* Kontakt patří supervisorovi na oči, ne do detailu za
                        dvě kliknutí: tohle je obrazovka, ze které se lidem
                        volá a píše. Odkazy, ať to jde rovnou z telefonu. */}
                    {h.user?.email || h.phone ? (
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px] text-di">
                        {h.user?.email ? (
                          <a
                            href={`mailto:${h.user.email}`}
                            className="truncate hover:text-go hover:underline"
                          >
                            {h.user.email}
                          </a>
                        ) : null}
                        {h.phone ? (
                          <a href={`tel:${h.phone}`} className="hover:text-go hover:underline">
                            {h.phone}
                          </a>
                        ) : null}
                      </p>
                    ) : null}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {h.team ? (
                        <Badge color="#8B5CF6">{h.team.name}</Badge>
                      ) : (
                        <Badge color="#F59E0B">Bez týmu</Badge>
                      )}
                      {/* Tohle je ten rozdíl, kvůli kterému obrazovka vznikla:
                          hráč může mít tým a na soupisce přesto nebýt — pak
                          ho vedoucí v sestavě nenajde a neví proč. */}
                      {h.teamId && !naSoupisce ? (
                        <Badge color="#EF4444">Není na soupisce</Badge>
                      ) : null}
                      {vPoolu ? <Badge color="#C9A140">V draftu</Badge> : null}
                      <Badge color={licence ? "#22C55E" : "#EF4444"}>
                        {licence ? "Licence ✓" : "Bez licence"}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="w-[76px]">
                      <Input
                        defaultValue={String(h.jersey ?? 0)}
                        onBlur={(e) => zmenDres(h, e.target.value)}
                        aria-label="Číslo dresu"
                        className="text-center"
                      />
                    </div>
                    {h.teamId ? (
                      <>
                        <Button size="sm" variant="subtle" onClick={() => otevriZarazeni(h)}>
                          <Shield size={15} /> Přesunout
                        </Button>
                        <Button
                          size="sm"
                          variant="subtle"
                          onClick={() => {
                            setOdvadim(h);
                            setDoPoolu(true);
                          }}
                        >
                          <LogOut size={15} /> Z týmu
                        </Button>
                      </>
                    ) : (
                      <Button size="sm" onClick={() => otevriZarazeni(h)}>
                        <UserPlus size={15} /> Zařadit
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      aria-label={`Smazat ${h.firstName} ${h.lastName}`}
                      onClick={() => {
                        setMazu(h);
                        setSUctem(true);
                      }}
                    >
                      <Trash2 size={15} />
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Modal
        open={!!zarazuji}
        onClose={() => setZarazuji(null)}
        title={
          zarazuji
            ? `${zarazuji.teamId ? "Přesunout" : "Zařadit"} ${zarazuji.firstName} ${zarazuji.lastName}`
            : ""
        }
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="subtle" onClick={() => setZarazuji(null)}>
              Zrušit
            </Button>
            <Button onClick={zarad} loading={busy}>
              Uložit
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <Field label="Tým" required>
            <Select value={teamId} onChange={(e) => setTeamId(e.target.value)}>
              <option value="">— vyber tým —</option>
              {(tymy.data ?? [])
                .filter((t) => t.regStatus !== "REJECTED" && t.id !== zarazuji?.teamId)
                .map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                    {t.regStatus === "PENDING" ? " (čeká na schválení)" : ""}
                  </option>
                ))}
            </Select>
          </Field>

          <Field label="Číslo dresu">
            <Input
              value={dres}
              onChange={(e) => setDres(e.target.value)}
              inputMode="numeric"
              placeholder="0–99"
            />
          </Field>

          <Field label="Místo na soupisce">
            <ChipRow>
              <Chip active={slot === "GOALKEEPER"} onClick={() => setSlot("GOALKEEPER")}>
                Brankář
              </Chip>
              <Chip active={slot === "FIELD"} onClick={() => setSlot("FIELD")}>
                Hráč do pole
              </Chip>
            </ChipRow>
          </Field>

          <p className="text-[12px] leading-5 text-di">
            Hráč se zapíše jako kmenový: nastaví se mu tým, přibude na soupisku
            sezóny a zmizí z nabídky volných hráčů. On i vedoucí týmu dostanou
            oznámení a hráči navíc odejde e-mail, že je v týmu.
            {vybranyTym?.isOpen ? (
              <>
                {" "}
                Je to otevřený tým, takže mu zároveň do košíku přibude balík
                Virtuální vedoucí (800 Kč, nebo 500 Kč, když už má zaplacenou
                licenci) — částku najde i v tom e-mailu. Když do 72 hodin
                nezaplatí, systém mu místo sám uvolní a napíše mu o tom;
                po zaplacení ho jde zařadit znovu.
              </>
            ) : null}
          </p>
        </div>
      </Modal>

      <Modal
        open={!!odvadim}
        onClose={() => setOdvadim(null)}
        title={odvadim ? `Odvést z týmu ${odvadim.team?.name ?? ""}` : ""}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="subtle" onClick={() => setOdvadim(null)}>
              Zrušit
            </Button>
            <Button onClick={odved} loading={busy}>
              Odvést
            </Button>
          </div>
        }
      >
        <p className="text-[14px] leading-6 text-mu">
          {odvadim?.firstName} {odvadim?.lastName} zůstane bez týmu. Pokud už za
          tým odehrál zápas, na soupisce ho necháme — stojí na ní statistiky
          a nárok na play-off.
        </p>
        <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-[14px] text-wh">
          <input
            type="checkbox"
            checked={doPoolu}
            onChange={(e) => setDoPoolu(e.target.checked)}
            className={clsx("mt-0.5 h-4 w-4 cursor-pointer accent-go")}
          />
          <span>
            Vrátit mezi volné hráče
            <span className="block text-[12px] leading-5 text-di">
              Objeví se v draftu a vedoucí dostanou oznámení. Nech vypnuté, když
              z ligy odchází.
            </span>
          </span>
        </label>
      </Modal>

      <Modal
        open={!!mazu}
        onClose={() => setMazu(null)}
        title={mazu ? `Smazat ${mazu.firstName} ${mazu.lastName}?` : ""}
        size="sm"
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="subtle" onClick={() => setMazu(null)}>
              Zrušit
            </Button>
            <Button variant="danger" onClick={smaz} loading={busy}>
              Smazat
            </Button>
          </div>
        }
      >
        <p className="text-[14px] leading-6 text-mu">
          Smaže se hráčský profil, jeho soupiska, draft profil i předpis
          licence. <span className="text-wh">Vrátit to nejde.</span> Kdo už
          nastoupil k zápasu nebo má něco zaplaceného, smazat nejde — na tom
          stojí statistiky a bankovní výpis.
        </p>
        <label className="mt-4 flex cursor-pointer items-start gap-2.5 text-[14px] text-wh">
          <input
            type="checkbox"
            checked={sUctem}
            onChange={(e) => setSUctem(e.target.checked)}
            className={clsx("mt-0.5 h-4 w-4 cursor-pointer accent-go")}
          />
          <span>
            Smazat i uživatelský účet
            <span className="block text-[12px] leading-5 text-di">
              Bez toho zůstane e-mail obsazený a znovu se s ním zaregistrovat
              nejde. Účet vedoucího týmu nebo rozhodčího zůstane tak jako tak.
            </span>
          </span>
        </label>
      </Modal>
    </>
  );
}
