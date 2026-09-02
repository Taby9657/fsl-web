"use client";

/**
 * Přistání z pozvánkového odkazu — `https://fslleague.cz/pozvanka/FSL-TM-XXXX`.
 *
 * Odkaz i QR kód takhle rozesílá mobilní aplikace. Web tuhle stránku dlouho
 * neměl, takže každý, kdo appku neměl, skončil na 404 — a to je přesně ten,
 * komu pozvánka patří.
 *
 * Co se tu děje:
 *   • nepřihlášený   → ukážeme tým a pošleme ho na přihlášení s kódem v ruce
 *   • bez profilu    → rovnou do registrace s předvyplněným kódem
 *   • hráč bez týmu  → připojíme ho jedním kliknutím
 *   • hráč v týmu    → řekneme mu, proč pozvánku použít nemůže
 */

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { errMsg, playersApi, teamsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Page } from "@/components/layout/container";
import { Button, Card, EmptyState, LinkButton, PageTitle, Spinner } from "@/components/ui/primitives";
import { TeamBadge } from "@/components/ui/data";
import { toast } from "@/components/ui/toast";

export function PozvankaClient({ code }: { code: string }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const hydrated = useAuthStore((s) => s.hydrated);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const [busy, setBusy] = useState(false);

  const q = useQuery({
    queryKey: ["pozvanka", code],
    queryFn: async () => (await teamsApi.join(code)).data.team,
    retry: false,
  });

  const team = q.data;
  const maHrace = !!user?.player;
  const maTym = !!user?.player?.teamId;

  async function pripoj() {
    setBusy(true);
    try {
      const res = await playersApi.join(code);
      await refreshUser();
      toast.success("Jsi v týmu", `Vítej v týmu ${res.data.team.name}.`);
      router.push("/muj-ucet");
    } catch (e) {
      toast.error("Nepovedlo se", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  if (q.isLoading || !hydrated) {
    return (
      <Page size="narrow">
        <div className="flex justify-center py-20">
          <Spinner />
        </div>
      </Page>
    );
  }

  if (q.isError || !team) {
    return (
      <Page size="narrow">
        <PageTitle title="Pozvánka nefunguje" />
        <EmptyState
          title="Kód neplatí"
          description={
            errMsg(q.error) ||
            "Kód je nejspíš zastaralý nebo tým už v lize není. Popros vedoucího o nový."
          }
        />
        <div className="mt-4 flex flex-col gap-2">
          <LinkButton href="/">Zpět na úvod</LinkButton>
        </div>
      </Page>
    );
  }

  const kartaTymu = (
    <Card
      className="mb-5 flex items-center gap-4 p-5"
      style={{ borderColor: team.color ?? undefined }}
    >
      <TeamBadge abbr={team.abbr} color={team.color} logoUrl={team.logoUrl} size={56} />
      <div className="min-w-0">
        <p className="truncate text-[17px] font-bold text-wh">{team.name}</p>
        <p className="text-[13px] text-mu">{team.division ?? "Divizi přidělí supervisor"}</p>
      </div>
    </Card>
  );

  const cekaNaSchvaleni = team.regStatus === "PENDING" || team.regStatus === "APPEALING";

  return (
    <Page size="narrow">
      <PageTitle title="Pozvánka do týmu" subtitle="Někdo tě zve na soupisku." />
      {kartaTymu}

      {cekaNaSchvaleni ? (
        <Card className="mb-4 border-go/40 bg-go-soft p-4">
          <p className="text-[13px] leading-6 text-wh">
            Tým ještě čeká na schválení supervisorem. Na soupisku se zapsat můžeš,
            zápasy se rozlosují až po schválení.
          </p>
        </Card>
      ) : null}

      <Card className="space-y-4 p-6">
        {!user ? (
          <>
            <p className="text-[14px] leading-6 text-mu">
              Přihlas se nebo si založ účet a kód se použije sám.
            </p>
            <div className="flex flex-col gap-2">
              <LinkButton href={`/prihlaseni?next=${encodeURIComponent(`/pozvanka/${code}`)}`}>
                Přihlásit se
              </LinkButton>
              <LinkButton href={`/registrace?kod=${encodeURIComponent(code)}`} variant="outline">
                Nemám účet, chci se zaregistrovat
              </LinkButton>
            </div>
          </>
        ) : !maHrace ? (
          <>
            <p className="text-[14px] leading-6 text-mu">
              Zbývá vyplnit hráčský profil — jméno, číslo dresu a pozici. Zabere to minutu.
            </p>
            <LinkButton href={`/registrace?kod=${encodeURIComponent(code)}`}>
              Dokončit registraci hráče
            </LinkButton>
          </>
        ) : !maTym ? (
          <>
            <p className="text-[14px] leading-6 text-mu">
              Hráčský profil už máš, stačí potvrdit vstup do týmu.
            </p>
            <Button className="w-full" onClick={pripoj} loading={busy}>
              Připojit se k týmu {team.name}
            </Button>
          </>
        ) : (
          <>
            <p className="text-[14px] leading-6 text-mu">
              Jsi v týmu{" "}
              <span className="font-semibold text-wh">{user.player?.team?.name ?? "—"}</span>.
              Kód se dá použít, až tenhle tým opustíš v nastavení profilu.
            </p>
            <div className="flex flex-col gap-2">
              <LinkButton href="/muj-profil" variant="outline">
                Můj profil
              </LinkButton>
              <LinkButton href="/muj-ucet" variant="ghost">
                Můj účet
              </LinkButton>
            </div>
          </>
        )}
      </Card>

      <p className="mt-4 text-center text-[12px] text-di">Kód: {code}</p>
    </Page>
  );
}
