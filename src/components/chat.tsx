"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { chatApi, errMsg } from "@/lib/api";
import type { ChatAuthor, ChatMessage } from "@/lib/types";
import { toast } from "@/components/ui/toast";

/**
 * Kolečko autora.
 *
 * **Fotka se drží u hráče, ne u zprávy** — backend ji posílá u autora, takže
 * změna profilovky se projeví i u starých zpráv. Kdo fotku nemá, má iniciály
 * v barvě spočítané backendem; web si nic nedopočítává, aby appka ukazovala
 * totéž.
 */
export function AvatarChat({ autor, size = 36 }: { autor: ChatAuthor; size?: number }) {
  if (autor.photoUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={autor.photoUrl}
        alt=""
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
        background: autor.barva ?? "#2e0f58",
        color: autor.barvaTextu ?? "#f0e8ff",
      }}
      aria-hidden
    >
      {autor.panda ? "P" : (autor.iniciely ?? "?")}
    </span>
  );
}

const DEN = new Intl.DateTimeFormat("cs-CZ", {
  weekday: "long",
  day: "numeric",
  month: "numeric",
});
const CAS = new Intl.DateTimeFormat("cs-CZ", { hour: "numeric", minute: "2-digit" });

function denKlic(d: string) {
  return new Date(d).toDateString();
}

function denPopisek(d: string) {
  const dnes = new Date().toDateString();
  const vcera = new Date(Date.now() - 86_400_000).toDateString();
  const k = new Date(d).toDateString();
  if (k === dnes) return "dnes";
  if (k === vcera) return "včera";
  return DEN.format(new Date(d)).replace(/ /g, " ");
}

/**
 * Vlákno zpráv.
 *
 * Bubliny jako v každém chatu: moje vpravo, cizí vlevo s kolečkem. Avatar se
 * kreslí jen u poslední zprávy v řadě od téhož člověka — jinak z toho je
 * sloupec koleček a text se ztratí.
 *
 * Zprávy se tahají pollingem po deseti vteřinách, SSE přijde později.
 */
export function Vlakno({
  conversationId,
  mujId,
  prazdne = "Zatím tu nikdo nic nenapsal.",
}: {
  conversationId: string;
  mujId: string | null;
  prazdne?: string;
}) {
  const qc = useQueryClient();
  const [text, setText] = useState("");
  const konec = useRef<HTMLDivElement>(null);

  const zpravy = useQuery({
    queryKey: ["chat", "zpravy", conversationId],
    refetchInterval: 10_000,
    queryFn: async () => (await chatApi.messages(conversationId)).data,
  });

  useEffect(() => {
    chatApi.read(conversationId).catch(() => {});
    konec.current?.scrollIntoView({ block: "end" });
  }, [conversationId, zpravy.data?.length]);

  const poslat = useMutation({
    mutationFn: async (body: string) => (await chatApi.send(conversationId, body)).data,
    onSuccess: () => {
      setText("");
      qc.invalidateQueries({ queryKey: ["chat", "zpravy", conversationId] });
      qc.invalidateQueries({ queryKey: ["chat", "konverzace"] });
    },
    onError: (e) => toast.error(errMsg(e, "Zprávu se nepovedlo odeslat.")),
  });

  const data = zpravy.data ?? [];

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex-1 space-y-1 overflow-y-auto px-4 py-4 sm:px-5">
        {zpravy.isLoading && <p className="text-sm text-mu">Načítám…</p>}
        {!zpravy.isLoading && data.length === 0 && (
          <p className="py-10 text-center text-sm text-mu">{prazdne}</p>
        )}

        {data.map((m: ChatMessage, i: number) => {
          const moje = !!mujId && m.autor.id === mujId;
          const predchozi = data[i - 1];
          const dalsi = data[i + 1];
          const novyDen = !predchozi || denKlic(predchozi.createdAt) !== denKlic(m.createdAt);
          // Poslední zpráva v řadě od téhož člověka nese kolečko i jméno.
          const konecRady = !dalsi || dalsi.autor.id !== m.autor.id;
          const zacatekRady = !predchozi || predchozi.autor.id !== m.autor.id || novyDen;

          return (
            <div key={m.id}>
              {novyDen && (
                <div className="my-4 flex justify-center">
                  <span className="rounded-full bg-c2 px-3 py-1 text-[11px] text-mu">
                    {denPopisek(m.createdAt)}
                  </span>
                </div>
              )}

              <div className={clsx("flex items-end gap-2", moje && "flex-row-reverse")}>
                <span className="w-9 shrink-0">
                  {!moje && konecRady && <AvatarChat autor={m.autor} size={36} />}
                </span>

                <div className={clsx("max-w-[78%] min-w-0", moje && "items-end")}>
                  {!moje && zacatekRady && (
                    <div className="mb-1 flex items-center gap-2 pl-1">
                      <span className="text-xs font-semibold text-wh">{m.autor.jmeno}</span>
                      {(m.autor.panda || m.odSupervisora) && (
                        <span className="rounded bg-pu px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-white">
                          LIGA
                        </span>
                      )}
                    </div>
                  )}

                  <div
                    className={clsx(
                      "inline-block whitespace-pre-line break-words px-3.5 py-2 text-sm",
                      moje
                        ? "rounded-2xl rounded-br-md bg-pu text-white"
                        : "rounded-2xl rounded-bl-md bg-c2 text-wh",
                      m.smazano && "italic opacity-60",
                    )}
                  >
                    {m.smazano ? "Zpráva byla smazána" : m.body}
                  </div>

                  <div
                    className={clsx(
                      "mt-0.5 px-1 text-[11px] text-di",
                      moje ? "text-right" : "text-left",
                    )}
                  >
                    {CAS.format(new Date(m.createdAt))}
                    {m.upraveno ? " · upraveno" : ""}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
        <div ref={konec} />
      </div>

      <form
        className="flex items-center gap-2 border-t border-bd bg-c1 px-3 py-3"
        onSubmit={(e) => {
          e.preventDefault();
          const t = text.trim();
          if (t) poslat.mutate(t);
        }}
      >
        <label htmlFor={`zprava-${conversationId}`} className="sr-only">
          Napsat zprávu
        </label>
        <input
          id={`zprava-${conversationId}`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Napsat zprávu…"
          autoComplete="off"
          className="h-11 flex-1 rounded-full border border-bd bg-c2 px-4 text-sm text-wh placeholder:text-di outline-none focus:border-bd-strong"
        />
        <button
          type="submit"
          disabled={!text.trim() || poslat.isPending}
          aria-label="Odeslat"
          className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-go text-bg transition-colors hover:bg-[#d8b055] disabled:opacity-40"
        >
          <Send size={17} />
        </button>
      </form>
    </div>
  );
}
