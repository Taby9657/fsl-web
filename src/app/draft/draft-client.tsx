"use client";

import { useQuery } from "@tanstack/react-query";
import { Lock, Phone, Timer, UserPlus, Users, Video } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { draftApi } from "@/lib/api";
import { fullName, pluralOffer, positionLabel, timeLeft } from "@/lib/format";
import { useAuthStore, useIsManager } from "@/store/auth";
import { SEZONA, den, draftOtevren } from "@/lib/sezona";
import { Page } from "@/components/layout/container";
import {
  Card,
  EmptyState,
  LinkButton,
  PageTitle,
} from "@/components/ui/primitives";
import { ErrorView, SkeletonCards } from "@/components/ui/feedback";
import { Avatar } from "@/components/ui/data";

/**
 * `uvod` je vysvětlení pro nepřihlášené — seznam volných hráčů je veřejný,
 * ale bez kontextu je to pro nováčka jen výčet cizích jmen. Předává ho
 * `DraftGate`.
 */
export function DraftClient({ uvod }: { uvod?: ReactNode } = {}) {
  const user = useAuthStore((s) => s.user);
  const isManager = useIsManager();
  const canJoin = !!user?.player && !user.player.teamId;
  // Do 1. 11. se seznam nezobrazuje a ani se nenačítá — viz `DraftZamceno`.
  const otevreno = draftOtevren();

  const list = useQuery({
    queryKey: ["draft"],
    enabled: otevreno,
    queryFn: async () => (await draftApi.list()).data,
  });

  const mine = useQuery({
    queryKey: ["draft", "me"],
    enabled: canJoin,
    queryFn: async () => (await draftApi.me()).data,
  });

  return (
    <Page size="narrow">
      <PageTitle
        title="Draft"
        subtitle="Volní hráči hledající tým"
        action={
          canJoin ? (
            <LinkButton
              href="/draft/profil"
              size="sm"
              variant={mine.data?.isActive ? "gold" : "outline"}
            >
              <UserPlus size={15} />
              {mine.data?.isActive ? "Můj profil" : "Doplnit profil"}
            </LinkButton>
          ) : undefined
        }
      />

      {uvod}

      {!otevreno ? (
        <DraftZamceno canJoin={canJoin} maUvod={!!uvod} />
      ) : list.isLoading ? (
        <SkeletonCards count={4} />
      ) : list.isError ? (
        <ErrorView onRetry={() => list.refetch()} />
      ) : !list.data?.length ? (
        <EmptyState
          icon={<Users size={44} />}
          title="Draft pool je prázdný"
          description={
            canJoin
              ? "Zatím jsi tu sám. Doplň si profil, ať o tobě vedoucí něco vědí."
              : user
                ? "Momentálně žádní volní hráči."
                : "Momentálně se v draftu nikdo nenabízí. Můžeš být první."
          }
          action={
            canJoin ? (
              <LinkButton href="/draft/profil" size="sm">
                Doplnit profil
              </LinkButton>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-3">
          {list.data.map((p) => (
            <Link key={p.id} href={`/draft/${p.playerId}`}>
              <Card className="p-4 transition-colors hover:border-bd-strong hover:bg-c2/60">
                <div className="flex items-center gap-4">
                  <Avatar
                    photoUrl={p.player?.photoUrl}
                    firstName={p.player?.firstName}
                    lastName={p.player?.lastName}
                    size={52}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 text-[15px] font-semibold text-wh">
                      <span className="truncate">{fullName(p.player)}</span>
                      {p.player?.id === user?.player?.id ? (
                        <span className="rounded-full bg-go px-1.5 py-0.5 text-[10px] font-bold text-bg">
                          Já
                        </span>
                      ) : null}
                    </p>
                    <p className="text-[13px] text-mu">
                      {positionLabel(p.position ?? p.player?.position)}
                    </p>
                    {p.pubSkill ? (
                      <p className="mt-1.5 line-clamp-2 text-[13px] italic leading-5 text-mu">
                        💬 {p.pubSkill}
                      </p>
                    ) : null}
                    {isManager && p.player?.phone ? (
                      <p className="mt-1.5 flex items-center gap-1.5 text-[13px] font-medium text-green">
                        <Phone size={13} /> {p.player.phone}
                      </p>
                    ) : null}
                  </div>
                  {p.videos?.length ? (
                    <span className="flex shrink-0 items-center gap-1 rounded-full bg-go/15 px-2 py-1 text-[11px] font-bold text-go">
                      <Video size={12} /> {p.videos.length}
                    </span>
                  ) : null}
                </div>

                {p.windowExpiresAt ? (
                  <div className="mt-3 flex items-center gap-2 rounded-lg bg-go/10 px-3 py-2 text-[12px] font-medium text-go">
                    <Timer size={14} />
                    {pluralOffer(p.offerCount ?? 0)} · vyprší za {timeLeft(p.windowExpiresAt)}
                  </div>
                ) : null}
              </Card>
            </Link>
          ))}
        </div>
      )}
    </Page>
  );
}

/**
 * Zámek draft poolu do 1. 11. 2026.
 *
 * Hráči se přihlašují dál a draft profil si založí — jen ho zvenčí nikdo
 * nevidí. Důvod je sportovní, ne technický: přihlášky končí 1. 11. a hned
 * nato je los, takže dokud není jasné, kdo v soutěži je, nemají si vedoucí
 * co rozebírat. Datum bere `SEZONA.otevreniDraftu`.
 *
 * Zamčený je web, ne API — poznámka u `draftOtevren()`.
 */
function DraftZamceno({
  canJoin,
  maUvod,
}: {
  canJoin: boolean;
  /** Nepřihlášený má výzvu k přihlášce už v úvodu nad seznamem — druhá
      hned pod ní by byla jen šum. */
  maUvod: boolean;
}) {
  return (
    <div className="rounded-xl border border-bd bg-c1/60 p-6 text-center">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full border border-bd bg-go-soft text-go">
        <Lock size={22} />
      </div>
      <h2 className="mt-4 text-[17px] font-bold text-wh">
        Seznam volných hráčů se otevře {den(SEZONA.otevreniDraftu)}
      </h2>
      <p className="mx-auto mt-2 max-w-md text-[14px] leading-6 text-mu">
        Přihlášky běží do {den(SEZONA.konecPrihlasek)} a hned po nich je los.
        Do té doby se draft pool neukazuje, aby si vedoucí nerozebírali hráče
        dřív, než je jasné, kdo do soutěže nastoupí.
      </p>
      <p className="mx-auto mt-3 max-w-md text-[13px] leading-6 text-di">
        Přihlásit se ale můžeš hned — {den(SEZONA.otevreniDraftu)} se tvůj
        profil objeví v seznamu mezi prvními.
      </p>
      {canJoin ? (
        <div className="mt-5 flex justify-center">
          <LinkButton href="/draft/profil" size="md">
            <UserPlus size={15} />
            Doplnit profil
          </LinkButton>
        </div>
      ) : maUvod ? null : (
        <div className="mt-5 flex justify-center">
          <LinkButton href="/registrace" size="md">
            Přihlásit se do ligy
          </LinkButton>
        </div>
      )}
    </div>
  );
}
