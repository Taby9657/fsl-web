"use client";

import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Pencil,
  Phone,
  PlayCircle,
  Timer,
  UserX,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { draftApi, errMsg } from "@/lib/api";
import { fullName, pluralOffer, positionLabel, timeLeft } from "@/lib/format";
import { useAuthStore, useIsManager } from "@/store/auth";
import { Page } from "@/components/layout/container";
import {
  Button,
  Card,
  EmptyState,
  SectionTitle,
  Textarea,
  Spinner,
} from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/feedback";
import { Avatar, TeamDot } from "@/components/ui/data";
import { toast } from "@/components/ui/toast";

export function DraftDetailClient({ playerId }: { playerId: string }) {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const isManager = useIsManager();
  const isOwn = user?.player?.id === playerId;

  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [offerConfirm, setOfferConfirm] = useState(false);
  const [acceptId, setAcceptId] = useState<string | null>(null);
  const [rejectId, setRejectId] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["draft", playerId],
    queryFn: async () => (await draftApi.getProfile(playerId)).data,
  });

  const p = q.data;

  if (q.isLoading) {
    return (
      <Page size="narrow">
        <div className="flex justify-center py-24 text-go">
          <Spinner size={32} />
        </div>
      </Page>
    );
  }

  if (!p) {
    return (
      <Page size="narrow">
        <EmptyState
          icon={<UserX size={44} />}
          title="Profil nenalezen"
          description="Hráč není v draft poolu."
        />
      </Page>
    );
  }

  async function makeOffer() {
    setBusy("offer");
    try {
      const res = await draftApi.makeOffer(playerId, { message: message.trim() || undefined });
      setMessage("");
      setOfferConfirm(false);
      await q.refetch();
      toast.success(
        "Nabídka odeslána",
        `Hráč byl informován. Vyprší za ${timeLeft(res.data.windowExpiresAt)}.`,
      );
    } catch (e) {
      toast.error("Chyba", errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  async function accept(offerId: string) {
    setBusy(offerId);
    try {
      const res = await draftApi.acceptOffer(playerId, offerId);
      await refreshUser();
      setAcceptId(null);
      toast.success("Přijato!", `Vstupuješ do týmu ${res.data.teamName}.`);
      router.push("/muj-ucet");
    } catch (e) {
      toast.error("Chyba", errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  async function reject(offerId: string) {
    setBusy(offerId);
    try {
      await draftApi.rejectOffer(playerId, offerId);
      setRejectId(null);
      await q.refetch();
      toast.success("Nabídka odmítnuta");
    } catch (e) {
      toast.error("Chyba", errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  const offerCount = p.offerCount ?? 0;

  return (
    <Page size="narrow">
      <div className="mb-4 flex items-center justify-between">
        <Link
          href="/draft"
          className="inline-flex items-center gap-1.5 text-[13px] text-mu transition-colors hover:text-wh"
        >
          <ArrowLeft size={16} /> Draft
        </Link>
        {isOwn ? (
          <Link
            href="/draft/profil"
            className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-go hover:underline"
          >
            <Pencil size={14} /> Upravit profil
          </Link>
        ) : null}
      </div>

      <Card className="p-6 text-center">
        <Avatar
          photoUrl={p.player?.photoUrl}
          firstName={p.player?.firstName}
          lastName={p.player?.lastName}
          size={90}
          className="mx-auto"
        />
        <h1 className="mt-4 text-2xl font-bold text-wh">{fullName(p.player)}</h1>
        <p className="mt-1 text-[14px] text-mu">
          {positionLabel(p.position ?? p.player?.position)}
        </p>
        {isManager && p.player?.phone ? (
          <a
            href={`tel:${p.player.phone}`}
            className="mt-4 inline-flex items-center gap-2 rounded-full border border-green/40 bg-green/15 px-4 py-2 text-[14px] font-semibold text-green"
          >
            <Phone size={15} /> {p.player.phone}
          </a>
        ) : null}
      </Card>

      {p.windowExpiresAt ? (
        <Card className="mt-4 flex items-center gap-2.5 border-go/40 bg-go/10 p-4 text-[14px] font-medium text-go">
          <Timer size={18} />
          {pluralOffer(offerCount)} · okno vyprší za {timeLeft(p.windowExpiresAt)}
        </Card>
      ) : null}

      {p.bio ? (
        <section className="mt-6">
          <SectionTitle>O mně</SectionTitle>
          <Card className="p-5 text-[14px] leading-6 text-mu">{p.bio}</Card>
        </section>
      ) : null}

      {p.pubSkill ? (
        <section className="mt-6">
          <SectionTitle>💬 Pub skill</SectionTitle>
          <Card className="border-go/40 p-5 text-[14px] italic leading-6 text-wh">
            {p.pubSkill}
          </Card>
        </section>
      ) : null}

      {p.videos?.length ? (
        <section className="mt-6">
          <SectionTitle>Sestřih ({p.videos.length})</SectionTitle>
          <Card className="overflow-hidden">
            <div className="divide-y divide-bd">
              {p.videos.map((v, i) => (
                <a
                  key={v.id}
                  href={v.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-c2/60"
                >
                  <PlayCircle size={20} className="text-go" />
                  <span className="flex-1 text-[14px] text-wh">Video {i + 1}</span>
                  <ExternalLink size={15} className="text-di" />
                </a>
              ))}
            </div>
          </Card>
        </section>
      ) : null}

      {/* nabídky pro vlastníka profilu */}
      {isOwn && p.offers?.length ? (
        <section className="mt-6">
          <SectionTitle>Nabídky ({p.offers.length})</SectionTitle>
          <div className="space-y-3">
            {p.offers.map((o) => (
              <Card key={o.id} className="p-4">
                <div className="flex items-center gap-2.5">
                  <TeamDot color={o.team?.color} size={10} />
                  <span className="text-[15px] font-semibold text-wh">{o.team?.name}</span>
                </div>
                {o.message ? (
                  <p className="mt-2 text-[13px] leading-6 text-mu">{o.message}</p>
                ) : null}
                <p className="mt-2 text-[12px] text-di">
                  Vyprší za {timeLeft(p.windowExpiresAt ?? o.expiresAt)}
                </p>
                <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                  <Button
                    className="flex-1"
                    loading={busy === o.id}
                    onClick={() => setAcceptId(o.id)}
                  >
                    Přijmout
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-red/50 text-red hover:bg-red/10"
                    disabled={!!busy}
                    onClick={() => setRejectId(o.id)}
                  >
                    Odmítnout
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        </section>
      ) : null}

      {/* nabídka od vedoucího */}
      {isManager && !isOwn ? (
        <section className="mt-6">
          <SectionTitle>Draftovat hráče</SectionTitle>
          {p.myTeamOffer?.status === "PENDING" ? (
            <Card className="flex items-center gap-2.5 border-green/40 bg-green/10 p-4 text-[14px] text-green">
              <CheckCircle2 size={18} />
              Váš tým už odeslal nabídku tomuto hráči.
            </Card>
          ) : (
            <Card className="p-5">
              <Textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Volitelná zpráva hráči…"
                className="min-h-[80px]"
              />
              <Button
                className="mt-3 w-full"
                loading={busy === "offer"}
                onClick={() => setOfferConfirm(true)}
              >
                {offerCount === 0 ? "Draftovat (72h okno)" : "Draftovat (přebít – 24h)"}
              </Button>
            </Card>
          )}
        </section>
      ) : null}

      <ConfirmDialog
        open={offerConfirm}
        title="Odeslat nabídku"
        message={`Draftovat ${fullName(p.player)}?\n\n${
          offerCount === 0
            ? "Hráč bude mít 72 hodin na rozhodnutí."
            : "Tím se okno zkrátí na 24 hodin."
        }`}
        confirmLabel="Odeslat"
        loading={busy === "offer"}
        onConfirm={makeOffer}
        onCancel={() => setOfferConfirm(false)}
      />

      <ConfirmDialog
        open={!!acceptId}
        title="Přijmout nabídku"
        message="Přijmeš nabídku a vstoupíš do týmu. Ostatní nabídky se zruší."
        confirmLabel="Přijmout"
        loading={!!busy && busy === acceptId}
        onConfirm={() => acceptId && accept(acceptId)}
        onCancel={() => setAcceptId(null)}
      />

      <ConfirmDialog
        open={!!rejectId}
        title="Odmítnout nabídku"
        message="Odmítneš tuto nabídku."
        confirmLabel="Odmítnout"
        destructive
        loading={!!busy && busy === rejectId}
        onConfirm={() => rejectId && reject(rejectId)}
        onCancel={() => setRejectId(null)}
      />
    </Page>
  );
}
