"use client";

import { useQuery } from "@tanstack/react-query";
import { Phone, Timer, UserPlus, Users, Video } from "lucide-react";
import Link from "next/link";
import { draftApi } from "@/lib/api";
import { fullName, pluralOffer, positionLabel, timeLeft } from "@/lib/format";
import { useAuthStore, useIsManager } from "@/store/auth";
import { Page } from "@/components/layout/container";
import {
  Card,
  EmptyState,
  LinkButton,
  PageTitle,
} from "@/components/ui/primitives";
import { ErrorView, SkeletonCards } from "@/components/ui/feedback";
import { Avatar } from "@/components/ui/data";

export function DraftClient() {
  const user = useAuthStore((s) => s.user);
  const isManager = useIsManager();
  const canJoin = !!user?.player && !user.player.teamId;

  const list = useQuery({
    queryKey: ["draft"],
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
              {mine.data?.isActive ? "Můj profil" : "Přidat se"}
            </LinkButton>
          ) : undefined
        }
      />

      {list.isLoading ? (
        <SkeletonCards count={4} />
      ) : list.isError ? (
        <ErrorView onRetry={() => list.refetch()} />
      ) : !list.data?.length ? (
        <EmptyState
          icon={<Users size={44} />}
          title="Draft pool je prázdný"
          description={
            canJoin
              ? "Buď první — přidej svůj draft profil."
              : "Momentálně žádní volní hráči."
          }
          action={
            canJoin ? (
              <LinkButton href="/draft/profil" size="sm">
                Vytvořit profil
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
