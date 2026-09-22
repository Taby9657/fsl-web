"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import { Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { chatApi, errMsg } from "@/lib/api";
import { fmtDateTime } from "@/lib/format";
import type { ChatAuthor, ChatMessage } from "@/lib/types";
import { Button } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";

/**
 * Kolečko autora.
 *
 * **Fotka se drží u hráče, ne u zprávy** — backend ji posílá u autora, takže
 * změna profilovky se projeví i u starých zpráv. Kdo fotku nemá, má iniciály
 * v barvě spočítané backendem; web si nic nedopočítává, aby appka ukazovala
 * totéž.
 */
export function AvatarChat({ autor, size = 40 }: { autor: ChatAuthor; size?: number }) {
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
        background: autor.barva ?? "#2A2A33",
        color: autor.barvaTextu ?? "#FFFFFF",
      }}
      aria-hidden
    >
      {autor.panda ? "P" : (autor.iniciely ?? "?")}
    </span>
  );
}

/**
 * Vlákno zpráv s políčkem na psaní.
 *
 * Zprávy se tahají pollingem po deseti vteřinách — SSE přijde později.
 * Je to schválně nejlevnější věc, která funguje.
 */
export function Vlakno({
  conversationId,
  mujId,
  prazdne = "Zatím tu nikdo nic nenapsal.",
  vyska = "max-h-[26rem]",
}: {
  conversationId: string;
  mujId: string | null;
  prazdne?: string;
  vyska?: string;
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

  return (
    <div className="flex min-h-0 flex-col">
      <div className={clsx("flex-1 space-y-4 overflow-y-auto px-5 py-4", vyska)}>
        {zpravy.isLoading && <p className="text-sm text-mu">Načítám…</p>}
        {zpravy.data?.length === 0 && <p className="text-sm text-mu">{prazdne}</p>}
        {zpravy.data?.map((m: ChatMessage) => (
          <div key={m.id} className="flex gap-3">
            <AvatarChat autor={m.autor} size={36} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-2">
                <span className="text-sm font-semibold text-wh">{m.autor.jmeno}</span>
                {(m.autor.panda || m.odSupervisora) && (
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
          className="min-h-[44px] flex-1 rounded-xl border border-bd bg-c2 px-3 text-sm text-wh outline-none focus:border-bd-strong"
        />
        <Button type="submit" disabled={!text.trim() || poslat.isPending} aria-label="Odeslat">
          <Send size={16} />
        </Button>
      </form>
    </div>
  );
}
