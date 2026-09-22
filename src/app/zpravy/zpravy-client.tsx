"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { ArrowLeft, Clock } from "lucide-react";
import { useState } from "react";
import { chatApi, errMsg } from "@/lib/api";
import type { ChatAuthor, ChatConversation } from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { Container } from "@/components/layout/container";
import { Button } from "@/components/ui/primitives";
import { AvatarChat, Vlakno } from "@/components/chat";
import { toast } from "@/components/ui/toast";

/** Panda do míst, kde není zpráva — tlačítko a hlavička formuláře. */
const PANDA: ChatAuthor = { id: null, jmeno: "Panda", panda: true, photoUrl: null };

const CAS = new Intl.DateTimeFormat("cs-CZ", { hour: "numeric", minute: "2-digit" });
const DATUM = new Intl.DateTimeFormat("cs-CZ", { day: "numeric", month: "numeric" });

/** Dnešní zpráva se ukazuje časem, starší datem — jako v každém chatu. */
function kdyKratce(d: string) {
  const den = new Date(d);
  return den.toDateString() === new Date().toDateString()
    ? CAS.format(den)
    : DATUM.format(den).replace(/ /g, " ");
}

/**
 * Zprávy — dvousloupcové okno: vlevo konverzace, vpravo vlákno.
 *
 * **Supervisor tu nemá zvláštní administraci.** Má ten samý seznam, jen
 * s filtrem „Čeká na tebe" a se štítkem termínu. Odpoví — a příznak spadne
 * sám; tlačítko „vyřešeno" nikde není.
 *
 * Na mobilu se sloupce přepínají: dokud není vybraná konverzace, je vidět
 * seznam; po klepnutí vlákno se šipkou zpět.
 */
export function ZpravyClient() {
  const user = useAuthStore((s) => s.user);
  const mujId = user?.player?.id ?? null;
  const jeSupervisor = Boolean(user?.isSupervisor || user?.player?.isSupervisor);

  // Supervisor bez hráčského profilu vlastní konverzace nemá — ať rovnou
  // vidí to, kvůli čemu sem chodí.
  const [filtr, setFiltr] = useState<"vse" | "ceka">(jeSupervisor && !mujId ? "ceka" : "vse");
  const [vybranaId, setVybranaId] = useState<string | null>(null);
  const [pisiLize, setPisiLize] = useState(false);

  const konverzace = useQuery({
    queryKey: ["chat", "konverzace", filtr],
    refetchInterval: 20_000,
    queryFn: async () =>
      (await chatApi.conversations(filtr === "ceka" ? "waiting" : undefined)).data,
  });

  const seznam = konverzace.data ?? [];
  const vybrana = seznam.find((k) => k.id === vybranaId) ?? null;
  const maVlaknoSLigou = seznam.some((k) => k.kind === "SUPPORT" && k.nazev === "Liga");
  const muzePsatLize = !!mujId && !maVlaknoSLigou;

  return (
    <Container className="py-4 sm:py-8">
      <div className="flex h-[calc(100dvh-11rem)] min-h-[28rem] overflow-hidden rounded-2xl border border-bd bg-c1">
        {/* Levý sloupec: konverzace */}
        <aside
          className={clsx(
            "flex w-full shrink-0 flex-col border-r border-bd sm:w-80",
            (vybrana || pisiLize) && "hidden sm:flex",
          )}
        >
          <div className="border-b border-bd px-4 py-3">
            <h1 className="text-lg font-semibold text-wh">Zprávy</h1>
            {jeSupervisor && (
              <div className="mt-2 flex gap-2">
                <Button
                  size="sm"
                  variant={filtr === "vse" ? "gold" : "subtle"}
                  onClick={() => setFiltr("vse")}
                >
                  Všechny
                </Button>
                <Button
                  size="sm"
                  variant={filtr === "ceka" ? "gold" : "subtle"}
                  onClick={() => setFiltr("ceka")}
                >
                  Čeká na tebe
                </Button>
              </div>
            )}
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {konverzace.isLoading ? (
              <p className="px-4 py-6 text-sm text-mu">Načítám…</p>
            ) : seznam.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-mu">
                {filtr === "ceka"
                  ? "Nic nečeká. Všechno je odbavené."
                  : "Zatím žádná konverzace. Týmový chat se objeví, jakmile budeš v týmu."}
              </p>
            ) : (
              seznam.map((k: ChatConversation) => (
                <button
                  key={k.id}
                  onClick={() => {
                    setVybranaId(k.id);
                    setPisiLize(false);
                  }}
                  className={clsx(
                    "flex w-full items-center gap-3 border-b border-bd/50 px-4 py-3 text-left transition-colors hover:bg-c2",
                    k.id === vybranaId && "bg-c2",
                  )}
                >
                  <AvatarChat
                    autor={
                      k.protejsek ?? {
                        id: null,
                        jmeno: k.nazev,
                        panda: k.kind === "PANDA",
                        photoUrl: null,
                        iniciely: k.nazev.slice(0, 2).toUpperCase(),
                      }
                    }
                    size={42}
                  />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline gap-2">
                      <span className="truncate font-semibold text-wh">{k.nazev}</span>
                      <span className="ml-auto shrink-0 text-[11px] text-di">
                        {kdyKratce(k.lastMessageAt)}
                      </span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span className="truncate text-[13px] text-mu">
                        {k.nahled ?? "Zatím nic"}
                      </span>
                      {k.neprectene > 0 && (
                        <span className="ml-auto inline-flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full bg-go px-1.5 text-[11px] font-bold text-bg">
                          {k.neprectene}
                        </span>
                      )}
                    </span>
                    {k.cekaNaLigu && (
                      <span className="mt-1 inline-flex items-center gap-1 rounded bg-go-soft px-1.5 py-0.5 text-[10px] font-semibold text-go">
                        <Clock size={11} />
                        {k.dueAt ? `do ${DATUM.format(new Date(k.dueAt))}` : "čeká"}
                      </span>
                    )}
                  </span>
                </button>
              ))
            )}
          </div>

          {muzePsatLize && (
            <div className="border-t border-bd p-3">
              <Button
                variant="subtle"
                className="w-full"
                onClick={() => {
                  setPisiLize(true);
                  setVybranaId(null);
                }}
              >
                <AvatarChat autor={PANDA} size={32} /> Napiš Pandě
              </Button>
            </div>
          )}
        </aside>

        {/* Pravý sloupec: vlákno */}
        <section
          className={clsx(
            "flex min-w-0 flex-1 flex-col",
            !vybrana && !pisiLize && "hidden sm:flex",
          )}
        >
          {pisiLize ? (
            <NapsatLize
              onZpet={() => setPisiLize(false)}
              onHotovo={() => setPisiLize(false)}
            />
          ) : vybrana ? (
            <>
              <div className="flex items-center gap-3 border-b border-bd px-4 py-3">
                <button
                  onClick={() => setVybranaId(null)}
                  className="text-mu hover:text-wh sm:hidden"
                  aria-label="Zpět na konverzace"
                >
                  <ArrowLeft size={18} />
                </button>
                <div className="min-w-0">
                  <p className="truncate font-semibold text-wh">{vybrana.nazev}</p>
                  {vybrana.cekaNaLigu && vybrana.dueAt && (
                    <p className="text-[11px] text-go">
                      čeká na odpověď ligy — do {DATUM.format(new Date(vybrana.dueAt))}
                    </p>
                  )}
                </div>
              </div>
              <Vlakno conversationId={vybrana.id} mujId={mujId} />
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center px-6 text-center">
              <p className="text-sm text-mu">Vyber konverzaci vlevo.</p>
            </div>
          )}
        </section>
      </div>
    </Container>
  );
}

/**
 * Napiš Pandě.
 *
 * **Adresát je Panda, ne formulář na ligu.** Člověk píše jí, ona odpoví na
 * to, co má v pravomoci, a zbytek předá supervisorovi — dokud třídění (E2)
 * neběží, předává všechno. Termín („ozve se ti nejpozději ve středu")
 * skládá backend v pražském čase.
 *
 * Ukazuje se, dokud vlákno neexistuje — jakmile hráč jednou napíše, má ho
 * v seznamu a píše do něj jako do každé jiné konverzace. Termín („ozve se ti
 * nejpozději ve středu") skládá backend v pražském čase, ne tenhle formulář.
 */
function NapsatLize({ onZpet, onHotovo }: { onZpet: () => void; onHotovo: () => void }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const poslat = useMutation({
    mutationFn: async (body: string) => (await chatApi.lize(body)).data,
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["chat", "konverzace"] });
      toast.success("Předáno lize.");
      onHotovo();
    },
    onError: (e) => toast.error(errMsg(e, "Zprávu se nepovedlo odeslat.")),
  });

  return (
    <>
      <div className="flex items-center gap-3 border-b border-bd px-4 py-3">
        <button
          onClick={onZpet}
          className="text-mu hover:text-wh sm:hidden"
          aria-label="Zpět na konverzace"
        >
          <ArrowLeft size={18} />
        </button>
        <AvatarChat autor={PANDA} size={36} />
        <div className="min-w-0">
          <p className="font-semibold text-wh">Panda</p>
          <p className="text-[11px] text-mu">první linka ligy</p>
        </div>
      </div>

      <div className="flex flex-1 flex-col justify-center px-5 py-6">
        <p className="text-sm text-mu">
          Napiš, s čím potřebuješ pomoct — soutěž, platby, termíny. Předám to lize
          a hned ti řeknu, dokdy se ti ozve.
        </p>
        <form
          className="mt-4"
          onSubmit={(e) => {
            e.preventDefault();
            const t = text.trim();
            if (t) poslat.mutate(t);
          }}
        >
          <label htmlFor="lize" className="sr-only">
            Zpráva pro Pandu
          </label>
          <textarea
            id="lize"
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="S čím potřebuješ pomoct?"
            className="w-full rounded-xl border border-bd bg-c2 px-3 py-2 text-sm text-wh placeholder:text-di outline-none focus:border-bd-strong"
          />
          <Button type="submit" className="mt-3" disabled={!text.trim() || poslat.isPending}>
            Odeslat
          </Button>
        </form>
      </div>
    </>
  );
}
