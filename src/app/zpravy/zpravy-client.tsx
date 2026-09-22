"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clock } from "lucide-react";
import { useState } from "react";
import { chatApi, errMsg } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import type { ChatConversation } from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { Page } from "@/components/layout/container";
import { Button, Card, EmptyState, PageTitle, Textarea } from "@/components/ui/primitives";
import { AvatarChat, Vlakno } from "@/components/chat";
import { toast } from "@/components/ui/toast";

/**
 * Zprávy — jeden seznam konverzací pro všechny.
 *
 * **Supervisor tady nemá zvláštní obrazovku.** Má ten samý seznam, jen
 * s filtrem „čeká na tebe" a se štítkem termínu. Odpoví — a příznak spadne
 * sám; žádné tlačítko „vyřešeno" neexistuje.
 */
export function ZpravyClient() {
  const user = useAuthStore((s) => s.user);
  const mujId = user?.player?.id ?? null;
  const jeSupervisor = Boolean(user?.isSupervisor || user?.player?.isSupervisor);

  // Supervisor bez hráčského profilu nemá vlastní konverzace — ať rovnou
  // vidí to, kvůli čemu sem chodí.
  const [filtr, setFiltr] = useState<"vse" | "ceka">(
    jeSupervisor && !mujId ? "ceka" : "vse",
  );
  const [otevrena, setOtevrena] = useState<ChatConversation | null>(null);

  const konverzace = useQuery({
    queryKey: ["chat", "konverzace", filtr],
    refetchInterval: 20_000,
    queryFn: async () =>
      (await chatApi.conversations(filtr === "ceka" ? "waiting" : undefined)).data,
  });

  const maVlaknoSLigou = konverzace.data?.some(
    (k) => k.kind === "SUPPORT" && k.nazev === "Liga",
  );

  if (otevrena) {
    return (
      <Page>
        <button
          onClick={() => setOtevrena(null)}
          className="mb-3 inline-flex items-center gap-1.5 text-sm text-mu hover:text-wh"
        >
          <ArrowLeft size={16} /> Zpět na zprávy
        </button>
        <Card className="flex flex-col p-0">
          <div className="flex items-center gap-3 border-b border-bd px-5 py-3">
            <div className="flex-1">
              <p className="font-semibold text-wh">{otevrena.nazev}</p>
              {otevrena.cekaNaLigu && otevrena.dueAt && (
                <p className="text-xs text-go">
                  čeká na odpověď ligy — do {fmtDateTime(otevrena.dueAt)}
                </p>
              )}
            </div>
          </div>
          <Vlakno conversationId={otevrena.id} mujId={mujId} vyska="max-h-[30rem]" />
        </Card>
      </Page>
    );
  }

  return (
    <Page>
      <PageTitle title="Zprávy" />

      {jeSupervisor && (
        <div className="mb-4 flex gap-2">
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

      {konverzace.isLoading ? (
        <p className="text-sm text-mu">Načítám…</p>
      ) : konverzace.data?.length === 0 ? (
        <EmptyState
          title={filtr === "ceka" ? "Nic nečeká" : "Zatím žádné zprávy"}
          description={
            filtr === "ceka"
              ? "Všechno je odbavené."
              : "Jakmile tě liga zařadí do týmu, objeví se tu týmový chat."
          }
        />
      ) : (
        <Card className="divide-y divide-bd p-0">
          {konverzace.data?.map((k) => (
            <button
              key={k.id}
              onClick={() => setOtevrena(k)}
              className="flex w-full items-center gap-3 px-4 py-3 text-left hover:bg-c2"
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
                size={40}
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate font-semibold text-wh">{k.nazev}</span>
                  {k.cekaNaLigu && (
                    <span className="inline-flex items-center gap-1 rounded bg-go-soft px-1.5 py-0.5 text-[10px] font-semibold text-go">
                      <Clock size={11} />
                      {k.dueAt ? `do ${fmtDateTime(k.dueAt)}` : "čeká"}
                    </span>
                  )}
                </span>
                <span className="mt-0.5 block truncate text-sm text-mu">
                  {k.nahled ?? "Zatím nic"}
                </span>
              </span>
              {k.neprectene > 0 && (
                <span className="ml-2 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-go px-1.5 text-[11px] font-bold text-bg">
                  {k.neprectene}
                </span>
              )}
            </button>
          ))}
        </Card>
      )}

      {!jeSupervisor && !maVlaknoSLigou && <NapsatLize />}
    </Page>
  );
}

/**
 * Napsat lize.
 *
 * Ukazuje se, dokud vlákno neexistuje — jakmile jednou napíšeš, máš ho
 * v seznamu nahoře a píše se do něj dál jako do každé jiné konverzace.
 * Odpověď o termínu složí backend, ne tenhle formulář: „ozve se ti
 * nejpozději ve středu" musí být pravda i v pražském čase.
 */
function NapsatLize() {
  const qc = useQueryClient();
  const [text, setText] = useState("");

  const poslat = useMutation({
    mutationFn: async (body: string) => (await chatApi.lize(body)).data,
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["chat", "konverzace"] });
      toast.success("Předáno lize.");
    },
    onError: (e) => toast.error(errMsg(e, "Zprávu se nepovedlo odeslat.")),
  });

  return (
    <Card className="mt-6 p-5">
      <p className="font-semibold text-wh">Napsat lize</p>
      <p className="mt-1 text-sm text-mu">
        Cokoli kolem soutěže, plateb nebo termínů. Odpoví ti člověk z ligy.
      </p>
      <form
        className="mt-3"
        onSubmit={(e) => {
          e.preventDefault();
          const t = text.trim();
          if (t) poslat.mutate(t);
        }}
      >
        <label htmlFor="lize" className="sr-only">
          Zpráva pro ligu
        </label>
        <Textarea
          id="lize"
          rows={3}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="S čím potřebuješ pomoct?"
        />
        <Button type="submit" className="mt-3" disabled={!text.trim() || poslat.isPending}>
          Odeslat
        </Button>
      </form>
    </Card>
  );
}
