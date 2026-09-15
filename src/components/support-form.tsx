"use client";

import { useState } from "react";
import { errMsg, requestsApi } from "@/lib/api";
import { REQUEST_TYPE_LABEL } from "@/lib/format";
import type { RequestType } from "@/lib/types";
import { useAuthStore } from "@/store/auth";
import { Button, Chip, Field, Input, Textarea } from "@/components/ui/primitives";

/**
 * Formulář „napiš nám". Jeden na všechno — chyba, platby, soupiska,
 * registrace, dotaz. Používá ho plovoucí okno i stránka `/zadost`.
 *
 * Funguje i bez přihlášení: kdo se nemůže registrovat nebo přihlásit, má
 * právě tehdy největší důvod se ozvat. Nepřihlášený proto vyplní e-mail,
 * ať je komu odpovědět.
 */

/** Pořadí je podle toho, co lidi hlásí nejčastěji, ne podle abecedy. */
const KATEGORIE: RequestType[] = [
  "WEB_BUG",
  "REGISTRATION",
  "PAYMENT",
  "ROSTER",
  "MATCH_TRANSCRIPT",
  "OTHER",
];

export function SupportForm({ onSent }: { onSent?: () => void }) {
  const user = useAuthStore((s) => s.user);
  const [type, setType] = useState<RequestType>("WEB_BUG");
  const [body, setBody] = useState("");
  const [email, setEmail] = useState("");
  const [web, setWeb] = useState(""); // past na roboty, člověk ji nevidí
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    setEmailError(null);

    if (body.trim().length < 10) {
      setError("Napiš aspoň větu, ať víme, čeho se to týká.");
      return;
    }
    if (!user && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())) {
      setEmailError("Vyplň e-mail, ať je ti kam odpovědět.");
      return;
    }

    setBusy(true);
    try {
      await requestsApi.create({
        type,
        body: body.trim(),
        ...(user ? {} : { email: email.trim() }),
        // Adresa stránky je u hlášení chyby to hlavní a člověk ji sám
        // nenapíše.
        page: typeof window === "undefined" ? undefined : window.location.pathname,
        web,
      });
      setSent(true);
      setBody("");
      onSent?.();
    } catch (e) {
      setError(errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  if (sent) {
    return (
      <div className="space-y-3">
        <p className="text-[15px] font-semibold text-green">Zpráva odešla</p>
        <p className="text-[13px] leading-6 text-mu">
          Ozveme se na {user?.email ?? email}. Díky, že jsi nám dal vědět.
        </p>
        <Button variant="outline" className="w-full" onClick={() => setSent(false)}>
          Napsat další
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Field label="Čeho se to týká" required>
        <div className="flex flex-wrap gap-2">
          {KATEGORIE.map((t) => (
            <Chip key={t} active={type === t} onClick={() => setType(t)}>
              {REQUEST_TYPE_LABEL[t]}
            </Chip>
          ))}
        </div>
      </Field>

      <Field label="Zpráva" required error={error ?? undefined}>
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Co jsi dělal, co se stalo a co jsi čekal. Klidně pár vět."
          className="min-h-[130px]"
          maxLength={4000}
        />
      </Field>

      {user ? (
        <p className="text-[12px] text-di">
          Odpovíme na {user.email}, tvůj přihlašovací e-mail.
        </p>
      ) : (
        <Field label="Tvůj e-mail" required error={emailError ?? undefined}>
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="jan.novak@email.cz"
            autoComplete="email"
          />
        </Field>
      )}

      {/* Past na roboty: skryté pole, které člověk nevyplní. Ne přes
          display:none — část robotů to pozná; posuneme ho mimo obrazovku. */}
      <div aria-hidden className="absolute left-[-9999px] top-0 h-0 w-0 overflow-hidden">
        <label>
          Nevyplňuj
          <input
            tabIndex={-1}
            autoComplete="off"
            value={web}
            onChange={(e) => setWeb(e.target.value)}
          />
        </label>
      </div>

      <Button className="w-full" onClick={submit} loading={busy}>
        Odeslat
      </Button>
    </div>
  );
}
