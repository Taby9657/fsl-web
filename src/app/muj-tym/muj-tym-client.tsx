"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { AlertTriangle, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { chatApi, errMsg, matchesApi, ucastApi } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import type { ChatAuthor, ChatMessage, Match } from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { Page } from "@/components/layout/container";
import { Button, Card, EmptyState, PageTitle, SectionTitle } from "@/components/ui/primitives";
import { SkeletonCards } from "@/components/ui/feedback";
import { toast } from "@/components/ui/toast";

/**
 * Můj tým — jedna obrazovka, jedna otázka: **jedeš ve čtvrtek?**
 *
 * Tlačítko Hraju / Nemůžu je schválně největší prvek na stránce; chat je
 * pod ním. Zprávy se zatím načítají pollingem, SSE přijde později.
 */
export function MujTymClient() {
  const user = useAuthStore((s) => s.user);
  const teamId = user?.player?.teamId ?? null;
  const mujId = user?.player?.id ?? null;
  const qc = useQueryClient();

  const zapasy = useQuery({
    queryKey: ["mujtym", "zapasy", teamId],
    enabled: !!teamId,
    queryFn: async () =>
      (await matchesApi.list({ teamId, status: "UPCOMING", limit: 5 })).data,
  });

  const zapas: Match | undefined = zapasy.data?.[0];

  const ucast = useQuery({
    queryKey: ["mujtym", "ucast", zapas?.id],
    enabled: !!zapas?.id,
    refetchInterval: 30_000,
    queryFn: async () => (await ucastApi.signups(zapas!.id)).data,
  });

  const prihlasit = useMutation({
    mutationFn: async (playing: boolean) => (await ucastApi.signup(zapas!.id, playing)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: ["mujtym", "ucast", zapas?.id] }),
    onError: (e) => toast.error(errMsg(e, "Přihlášení se nepovedlo.")),
  });

  if (!teamId) {
    return (
      <Page>
        <PageTitle title="Můj tým" />
        <EmptyState
          title="Zatím nejsi v týmu"
          description="Jakmile tě liga zařadí do týmu, najdeš tady sestavu na nejbližší zápas i chat s ostatními."
        />
      </Page>
    );
  }

  const muj = ucast.data?.seznam.find((p) => p.id === mujId);

  return (
    <Page>
      <PageTitle title="Můj tým" />

      {zapasy.isLoading ? (
        <SkeletonCards count={1} />
      ) : !zapas ? (
        <EmptyState
          title="Žádný zápas v plánu"
          description="Rozpis se zveřejní po losu. Do té doby tu bude prázdno."
        />
      ) : (
        <Card className="p-5 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <div className="text-lg font-semibold">
              {zapas.homeTeam?.name} – {zapas.awayTeam?.name}
            </div>
            <div className="text-sm text-mu">
              {fmtDateTime(zapas.date)}
              {zapas.venue ? ` · ${zapas.venue}` : ""}
            </div>
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span className="text-3xl font-bold tabular-nums">
              {ucast.data ? ucast.data.stav : "–"}
            </span>
            {ucast.data?.chybiBrankar && (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-go-soft px-2.5 py-1 text-sm font-medium text-go">
                <AlertTriangle size={15} /> chybí brankář
              </span>
            )}
            {ucast.data?.uzavreno && (
              <span className="rounded-lg bg-c2 px-2.5 py-1 text-sm text-mu">
                sestava uzavřená
              </span>
            )}
          </div>

          <div className="mt-4 flex gap-3">
            <Button
              size="lg" className="flex-1"
              disabled={ucast.data?.uzavreno || prihlasit.isPending}
              variant={muj?.stav === "HRAJU" ? "gold" : "subtle"}
              onClick={() => prihlasit.mutate(true)}
            >
              Hraju
            </Button>
            <Button
              size="lg" className="flex-1"
              disabled={ucast.data?.uzavreno || prihlasit.isPending}
              variant={muj?.stav === "NEMUZU" ? "subtle" : "ghost"}
              onClick={() => prihlasit.mutate(false)}
            >
              nemůžu
            </Button>
          </div>

          {ucast.data && !ucast.data.uzavreno && (
            <p className="mt-3 text-xs text-mu">
              Sestava se zavírá {fmtDateTime(ucast.data.uzaverka)} — 48 hodin před zápasem.
            </p>
          )}

          {ucast.data && ucast.data.seznam.length > 0 && (
            <div className="mt-5">
              <SectionTitle>Kdo jede</SectionTitle>
              <ul className="mt-2 divide-y divide-bd">
                {ucast.data.seznam.map((p) => (
                  <li key={p.id} className="flex items-center gap-3 py-2">
                    <AvatarChat autor={p} size={32} />
                    <span className="flex-1 text-sm">{p.jmeno}</span>
                    {p.slot === "GOALKEEPER" && (
                      <span className="text-xs text-mu">brankář</span>
                    )}
                    <span
                      className={clsx(
                        "text-xs font-medium",
                        p.stav === "HRAJU" && "text-green",
                        p.stav === "NEMUZU" && "text-mu",
                        p.stav === "MLCI" && "text-go",
                      )}
                    >
                      {p.stav === "HRAJU" ? "hraje" : p.stav === "NEMUZU" ? "nemůže" : "mlčí"}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>
      )}

      <TymovyChat teamId={teamId} mujId={mujId} />
    </Page>
  );
}

/** Kolečko autora: fotka z profilu, jinak iniciály v barvě z backendu. */
function AvatarChat({ autor, size = 40 }: { autor: ChatAuthor; size?: number }) {
  if (autor.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={autor.photoUrl}
        alt=""
        width={size}
        height={size}
        className="shrink-0 rounded-full object-cover"
        style={{ width: size, height: size }}
      />
    );
  }
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold"
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.38),
        background: autor.barva ?? "#2A2A33",
        color: autor.barvaTextu ?? "#FFFFFF",
      }}
      aria-hidden
    >
      {autor.panda ? "P" : (autor.iniciely ?? "?")}
    </span>
  );
}

function TymovyChat({ teamId, mujId }: { teamId: string; mujId: string | null }) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const konec = useRef<HTMLDivElement>(null);

  const konverzace = useQuery({
    queryKey: ["mujtym", "chat", teamId],
    queryFn: async () => (await chatApi.team(teamId)).data,
  });

  const id = konverzace.data?.id;

  const zpravy = useQuery({
    queryKey: ["mujtym", "zpravy", id],
    enabled: !!id,
    refetchInterval: 10_000,
    queryFn: async () => (await chatApi.messages(id!)).data,
  });

  useEffect(() => {
    if (id) chatApi.read(id).catch(() => {});
    konec.current?.scrollIntoView({ block: "end" });
  }, [id, zpravy.data?.length]);

  const poslat = useMutation({
    mutationFn: async (body: string) => (await chatApi.send(id!, body)).data,
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["mujtym", "zpravy", id] });
    },
    onError: (e) => toast.error(errMsg(e, "Zprávu se nepovedlo odeslat.")),
  });

  return (
    <Card className="mt-6 flex max-h-[32rem] flex-col p-0">
      <div className="border-b border-bd px-5 py-3">
        <SectionTitle className="!mb-0">Týmový chat</SectionTitle>
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
        {zpravy.isLoading && <p className="text-sm text-mu">Načítám…</p>}
        {zpravy.data?.length === 0 && (
          <p className="text-sm text-mu">
            Zatím tu nikdo nic nenapsal. Začni třeba tím, kdo veze míčky.
          </p>
        )}
        {zpravy.data?.map((m: ChatMessage) => (
          <div key={m.id} className="flex gap-3">
            <AvatarChat autor={m.autor} size={36} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm font-semibold">{m.autor.jmeno}</span>
                {m.autor.panda && (
                  <span className="rounded bg-pu px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white">
                    LIGA
                  </span>
                )}
                <span className="text-xs text-mu">{fmtDateTime(m.createdAt)}</span>
              </div>
              <p
                className={clsx(
                  "mt-0.5 whitespace-pre-line break-words text-sm",
                  m.smazano ? "italic text-mu" : "text-wh",
                  m.autor.id === mujId && "font-medium",
                )}
              >
                {m.smazano ? "Zpráva byla smazána" : m.body}
              </p>
            </div>
          </div>
        ))}
        <div ref={konec} />
      </div>

      <form
        className="flex items-center gap-2 border-t border-bd px-4 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          const t = text.trim();
          if (t && id) poslat.mutate(t);
        }}
      >
        <label htmlFor="zprava" className="sr-only">
          Napsat zprávu
        </label>
        <input
          id="zprava"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Napsat zprávu…"
          className="min-h-[44px] flex-1 rounded-xl border border-bd bg-c2 px-3 text-sm text-wh outline-none focus:border-bd-strong"
        />
        <Button type="submit" disabled={!text.trim() || poslat.isPending} aria-label="Odeslat">
          <Send size={16} />
        </Button>
      </form>
    </Card>
  );
}
