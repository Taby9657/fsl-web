"use client";

import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Script from "next/script";
import { useCallback, useEffect, useRef, useState } from "react";
import { api, authApi, errMsg } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Container } from "@/components/layout/container";
import { Button, Card, Spinner } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";

declare global {
  interface Window {
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

  useEffect(() => {
    if (user) router.replace(next);
  }, [user, next, router]);

  const handleCredential = useCallback(
    async (idToken: string) => {
      setBusy(true);
      try {
        const res = await authApi.google(idToken);
        setAuth(res.data.token, res.data.user);
        const u = res.data.user;
        const hasProfile = !!u.player || !!u.referee || (u.manager?.length ?? 0) > 0;
        router.replace(hasProfile ? next : "/registrace");
      } catch (e) {
        toast.error("Přihlášení selhalo", errMsg(e));
      } finally {
        setBusy(false);
      }
    },
    [setAuth, router, next],
  );

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
    window.google.accounts.id.renderButton(btnRef.current, {
      theme: "filled_black",
      size: "large",
      shape: "pill",
      text: "signin_with",
      locale: "cs",
      width: 320,
    });
  }, [gisReady, handleCredential]);

  async function devLogin() {
    setBusy(true);
    try {
      const res = await api.post<{ token: string; user: import("@/lib/types").AuthUser }>(
        "/auth/dev-login",
      );
      setAuth(res.data.token, res.data.user);
      router.replace(next);
    } catch (e) {
      toast.error("Testovací přihlášení selhalo", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onLoad={() => setGisReady(true)}
      />
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
                <Spinner size={18} /> Přihlašuji…
              </div>
            ) : CLIENT_ID ? (
              <div ref={btnRef} className="min-h-11" />
            ) : (
              <p className="text-[13px] text-red">
                Chybí NEXT_PUBLIC_GOOGLE_CLIENT_ID — přihlášení přes Google není nakonfigurováno.
              </p>
            )}

            {DEV_LOGIN ? (
              <Button variant="subtle" onClick={devLogin} disabled={busy} className="w-full">
                Testovací přihlášení (vývoj)
              </Button>
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
