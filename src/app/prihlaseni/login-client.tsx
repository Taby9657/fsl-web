"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, authApi, errMsg } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import type { AuthUser } from "@/lib/types";
import { Container } from "@/components/layout/container";
import { Button, Card, Field, Input, Spinner } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";

interface AppleSignInResponse {
  authorization?: { id_token?: string; code?: string };
  user?: { name?: { firstName?: string; lastName?: string }; email?: string };
}

declare global {
  interface Window {
    AppleID?: {
      auth: {
        init: (o: Record<string, unknown>) => void;
        signIn: () => Promise<AppleSignInResponse>;
      };
    };
    google?: {
      accounts: {
        id: {
          initialize: (o: Record<string, unknown>) => void;
          renderButton: (el: HTMLElement, o: Record<string, unknown>) => void;
          prompt: () => void;
        };
      };
    };
  }
}

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
const DEV_LOGIN = process.env.NEXT_PUBLIC_DEV_LOGIN === "1";
/** Services ID z Apple Developer (jine nez App ID mobilni aplikace). */
const APPLE_CLIENT_ID = process.env.NEXT_PUBLIC_APPLE_CLIENT_ID;

/** Shodné s backendem (MIN_HESLO v routes/auth.js). */
const MIN_HESLO = 8;

type Mode = "login" | "register" | "forgot" | "reset";

const TEXTS: Record<Mode, { title: string; submit: string }> = {
  login: { title: "Přihlášení e-mailem", submit: "Přihlásit se" },
  register: { title: "Nový účet", submit: "Vytvořit účet" },
  forgot: { title: "Zapomenuté heslo", submit: "Poslat kód" },
  reset: { title: "Nové heslo", submit: "Nastavit heslo a přihlásit" },
};

export function LoginClient() {
  const router = useRouter();
  const params = useSearchParams();
  const next = params.get("next") || "/muj-ucet";

  const setAuth = useAuthStore((s) => s.setAuth);
  const user = useAuthStore((s) => s.user);
  const loginAsGuest = useAuthStore((s) => s.loginAsGuest);

  const [busy, setBusy] = useState(false);
  const [gisReady, setGisReady] = useState(false);
  const btnRef = useRef<HTMLDivElement>(null);

  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [gisFailed, setGisFailed] = useState(false);
  const [appleReady, setAppleReady] = useState(false);

  useEffect(() => {
    if (user) router.replace(next);
  }, [user, next, router]);

  /** Po přihlášení: kdo nemá žádný profil, jde nejdřív dodělat registraci. */
  const goAfterAuth = useCallback(
    (u: AuthUser) => {
      const hasProfile = !!u.player || !!u.referee || (u.manager?.length ?? 0) > 0;
      router.replace(hasProfile ? next : "/registrace");
    },
    [router, next],
  );

  const handleCredential = useCallback(
    async (idToken: string) => {
      setBusy(true);
      try {
        const res = await authApi.google(idToken);
        setAuth(res.data.token, res.data.user);
        goAfterAuth(res.data.user);
      } catch (e) {
        toast.error("Přihlášení selhalo", errMsg(e));
      } finally {
        setBusy(false);
      }
    },
    [setAuth, goAfterAuth],
  );

  /** Apple SDK se inicializuje až po načtení skriptu; redirectURI musí sedět s tím v Apple Developer. */
  useEffect(() => {
    if (!appleReady || !APPLE_CLIENT_ID || !window.AppleID) return;
    window.AppleID.auth.init({
      clientId: APPLE_CLIENT_ID,
      scope: "name email",
      redirectURI: `${window.location.origin}/prihlaseni`,
      usePopup: true,
    });
  }, [appleReady]);

  const handleApple = useCallback(async () => {
    if (!window.AppleID) return;
    setBusy(true);
    try {
      const r = await window.AppleID.auth.signIn();
      const idToken = r?.authorization?.id_token;
      if (!idToken) throw new Error("Apple nevrátil identityToken");
      // Jméno a e-mail Apple pošle jen při úplně prvním přihlášení – backend
      // si je proto uloží hned a napříště bere `sub` z tokenu.
      const res = await authApi.apple(
        idToken,
        r?.user?.name?.firstName,
        r?.user?.name?.lastName,
        r?.user?.email,
      );
      setAuth(res.data.token, res.data.user);
      goAfterAuth(res.data.user);
    } catch (e) {
      // Zavřené okno není chyba, kterou má smysl uživateli hlásit.
      const code = (e as { error?: string })?.error;
      if (code === "popup_closed_by_user" || code === "user_cancelled_authorize") return;
      toast.error("Přihlášení přes Apple selhalo", errMsg(e));
    } finally {
      setBusy(false);
    }
  }, [setAuth, goAfterAuth]);

  /**
   * Šířku tlačítka musíme Googlu předat v pixelech a odpovídat skutečnému místu.
   * S natvrdo zapsanou hodnotou se na úzkých displejích vykreslilo 0 × 0 px,
   * takže na mobilu nebylo vidět vůbec nic. Povolené rozmezí je 200–400 px.
   */
  const lastWidth = useRef(0);

  const renderGoogleButton = useCallback(() => {
    const el = btnRef.current;
    if (!el || !window.google) return;
    const avail = Math.round(el.getBoundingClientRect().width);
    const width = Math.min(400, Math.max(200, avail || 300));

    // Opakované renderButton() Google po pár voláních tiše ignoruje a zůstane
    // prázdné místo. Překreslujeme proto jen když se šířka opravdu změnila,
    // nebo když je obal prázdný.
    if (width === lastWidth.current && el.childElementCount > 0) return;
    lastWidth.current = width;

    el.innerHTML = "";
    window.google.accounts.id.renderButton(el, {
      theme: "filled_black",
      size: "large",
      shape: "pill",
      text: "signin_with",
      logo_alignment: "left",
      locale: "cs",
      width,
    });
  }, []);

  useEffect(() => {
    if (!gisReady || !CLIENT_ID || !btnRef.current || !window.google) return;
    window.google.accounts.id.initialize({
      client_id: CLIENT_ID,
      callback: (r: { credential?: string }) => {
        if (r.credential) void handleCredential(r.credential);
      },
      ux_mode: "popup",
      auto_select: false,
    });
    renderGoogleButton();

    // Resize chodí i při schování adresního řádku na mobilu, proto s odstupem.
    let resizeTimer = 0;
    const onResize = () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(renderGoogleButton, 250);
    };
    window.addEventListener("resize", onResize);

    // Google tlačítko vykresluje buď jako <div>, nebo (personalizované, se jménem
    // uživatele) jako <iframe> – hlídáme proto obsah obalu, ne konkrétní prvek.
    const jePrazdne = () => {
      const el = btnRef.current;
      return !el || el.childElementCount === 0 || el.getBoundingClientRect().height < 8;
    };
    // Jeden pokus navíc; teprve pak to vzdáme a řekneme to uživateli.
    const t1 = window.setTimeout(() => { if (jePrazdne()) renderGoogleButton(); }, 2000);
    const t2 = window.setTimeout(() => { if (jePrazdne()) setGisFailed(true); }, 5000);

    return () => {
      window.removeEventListener("resize", onResize);
      window.clearTimeout(resizeTimer);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [gisReady, handleCredential, renderGoogleButton]);

  function switchMode(m: Mode) {
    setMode(m);
    setFormError(null);
    setNotice(null);
    if (m === "login" || m === "register") setCode("");
    if (m !== "reset") setPassword("");
  }

  async function submitEmailForm(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);
    setNotice(null);

    const mail = email.trim();
    if (!mail) return setFormError("Vyplň e-mail.");
    if (mode !== "forgot" && !password) return setFormError("Vyplň heslo.");
    if ((mode === "register" || mode === "reset") && password.length < MIN_HESLO) {
      return setFormError(`Heslo musí mít alespoň ${MIN_HESLO} znaků.`);
    }
    if (mode === "reset" && !code.trim()) return setFormError("Vyplň kód z e-mailu.");

    setBusy(true);
    try {
      if (mode === "forgot") {
        const res = await authApi.forgotPassword(mail);
        setNotice(res.data.message);
        setMode("reset");
        setPassword("");
        return;
      }

      const res =
        mode === "login"
          ? await authApi.login(mail, password)
          : mode === "register"
            ? await authApi.register(mail, password)
            : await authApi.resetPassword(mail, code.trim(), password);

      setAuth(res.data.token, res.data.user);
      goAfterAuth(res.data.user);
    } catch (err) {
      setFormError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  async function devLogin() {
    setBusy(true);
    try {
      const res = await api.post<{ token: string; user: AuthUser }>("/auth/dev-login");
      setAuth(res.data.token, res.data.user);
      router.replace(next);
    } catch (e) {
      toast.error("Testovací přihlášení selhalo", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  const t = TEXTS[mode];

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGisReady(true)}
      />
      {APPLE_CLIENT_ID ? (
        <Script
          src="https://appleid.cdn-apple.com/appleauth/static/jsapi/appleid/1/en_US/appleid.auth.js"
          strategy="afterInteractive"
          onLoad={() => setAppleReady(true)}
        />
      ) : null}
      <Container size="narrow" className="flex min-h-[70vh] items-center justify-center py-12">
        <Card className="w-full max-w-md p-8 text-center">
          <span className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border-2 border-go text-[22px] font-black text-go">
            FSL
          </span>
          <h1 className="mt-6 text-2xl font-bold text-wh">Floorball Stars Liga</h1>
          <p className="mt-2 text-[14px] text-mu">
            Přihlas se pro přístup ke správě týmu, platbám a draftu.
          </p>

          <div className="mt-8 flex flex-col items-center gap-3">
            {busy ? (
              <div className="flex h-11 items-center gap-2 text-mu">
                <Spinner size={18} /> Pracuji…
              </div>
            ) : CLIENT_ID ? (
              <>
                {/*
                  Personalizovanou variantu tlačítka vykresluje Google v iframu,
                  který si nasazuje `margin: -2px -10px` a přečnívá přes svůj obal
                  — ten přesah je bílý a kolem tmavé pilulky vypadá jako deska.
                  Ořez patří na ten vnitřní <div>, který má rozměr přesně jako
                  tlačítko; na našem obalu by uřízl 2 px z horní hrany.
                */}
                <div
                  ref={btnRef}
                  className="min-h-11 w-full max-w-[320px] [&>div]:overflow-hidden [&>div]:rounded-full"
                />
                {gisFailed ? (
                  <p className="text-[12px] leading-5 text-di">
                    Přihlášení přes Google se tu nenačetlo — prohlížeče uvnitř aplikací
                    (Messenger, Instagram) ho blokují. Otevři fslleague.cz v Safari nebo
                    Chromu, nebo se přihlas e-mailem níž.
                  </p>
                ) : null}
              </>
            ) : (
              <p className="text-[13px] text-red">
                Chybí NEXT_PUBLIC_GOOGLE_CLIENT_ID — přihlášení přes Google není nakonfigurováno.
              </p>
            )}

            {APPLE_CLIENT_ID ? (
              <button
                type="button"
                onClick={handleApple}
                disabled={busy || !appleReady}
                className="flex h-11 w-full max-w-[320px] cursor-pointer items-center justify-center gap-2 rounded-full bg-black text-[14px] font-medium text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <svg viewBox="0 0 384 512" width="15" height="15" fill="currentColor" aria-hidden="true">
                  <path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z" />
                </svg>
                Přihlásit se přes Apple
              </button>
            ) : null}

            {DEV_LOGIN ? (
              <Button variant="subtle" onClick={devLogin} disabled={busy} className="w-full">
                Testovací přihlášení (vývoj)
              </Button>
            ) : null}
          </div>

          <div className="my-7 flex items-center gap-3">
            <span className="h-px flex-1 bg-bd" />
            <span className="text-[12px] text-di">nebo e-mailem</span>
            <span className="h-px flex-1 bg-bd" />
          </div>

          <form onSubmit={submitEmailForm} className="space-y-3 text-left">
            <p className="text-center text-[13px] font-semibold text-wh">{t.title}</p>

            {mode === "reset" ? (
              <p className="text-center text-[12px] leading-5 text-mu">
                Kód platí 30 minut. Nepřišel? Zkontroluj spam, nebo si{" "}
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="cursor-pointer text-go underline"
                >
                  vyžádej nový
                </button>
                .
              </p>
            ) : null}

            <Field label="E-mail" required>
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="jmeno@email.cz"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={busy}
              />
            </Field>

            {mode === "reset" ? (
              <Field label="Kód z e-mailu" required>
                <Input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  disabled={busy}
                />
              </Field>
            ) : null}

            {mode !== "forgot" ? (
              <Field label={mode === "login" ? "Heslo" : "Nové heslo"} required>
                <Input
                  type="password"
                  autoComplete={mode === "login" ? "current-password" : "new-password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={busy}
                />
                {mode !== "login" ? (
                  <p className="mt-1 text-[12px] text-di">Alespoň {MIN_HESLO} znaků.</p>
                ) : null}
              </Field>
            ) : null}

            {notice ? (
              <p className="rounded-xl border border-bd bg-c2/60 px-3 py-2 text-[12px] leading-5 text-mu">
                {notice}
              </p>
            ) : null}
            {formError ? <p className="text-[12px] leading-5 text-red">{formError}</p> : null}

            <Button type="submit" className="w-full" loading={busy} disabled={busy}>
              {t.submit}
            </Button>
          </form>

          <div className="mt-4 flex flex-wrap justify-center gap-x-4 gap-y-1 text-[12px] text-mu">
            {mode !== "login" ? (
              <button
                type="button"
                onClick={() => switchMode("login")}
                className="cursor-pointer underline hover:text-wh"
              >
                Zpět na přihlášení
              </button>
            ) : null}
            {mode === "login" ? (
              <>
                <button
                  type="button"
                  onClick={() => switchMode("register")}
                  className="cursor-pointer underline hover:text-wh"
                >
                  Nemám účet
                </button>
                <button
                  type="button"
                  onClick={() => switchMode("forgot")}
                  className="cursor-pointer underline hover:text-wh"
                >
                  Zapomenuté heslo
                </button>
              </>
            ) : null}
          </div>

          <div className="my-7 flex items-center gap-3">
            <span className="h-px flex-1 bg-bd" />
            <span className="text-[12px] text-di">nebo</span>
            <span className="h-px flex-1 bg-bd" />
          </div>

          <Button
            variant="ghost"
            className="w-full"
            onClick={() => {
              loginAsGuest();
              router.push("/");
            }}
          >
            Pokračovat bez přihlášení
          </Button>
          <p className="mt-3 text-[12px] leading-5 text-di">
            Bez přihlášení si můžeš prohlížet tabulku, zápasy a statistiky. Správa týmu,
            platby a draft vyžadují účet.
          </p>

          <p className="mt-8 text-[11px] leading-5 text-di">
            Přihlášením souhlasíš s{" "}
            <Link href="/podminky" className="text-mu underline">
              podmínkami použití
            </Link>{" "}
            a{" "}
            <Link href="/ochrana-osobnich-udaju" className="text-mu underline">
              zpracováním osobních údajů
            </Link>
            .
          </p>
        </Card>
      </Container>
    </>
  );
}
