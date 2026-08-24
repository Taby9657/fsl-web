"use client";

import { useQuery } from "@tanstack/react-query";
import { Copy, Share2 } from "lucide-react";
import Image from "next/image";
import { teamsApi } from "@/lib/api";
import { useAuthStore } from "@/store/auth";
import { Page } from "@/components/layout/container";
import { Button, Card, EmptyState, PageTitle, Spinner } from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";

export function InviteClient() {
  const user = useAuthStore((s) => s.user);
  const manager = user?.manager?.[0];
  const teamId = manager?.teamId;
  const teamName = manager?.team?.name ?? "Tvůj tým";

  const q = useQuery({
    queryKey: ["invite", teamId],
    enabled: !!teamId,
    queryFn: async () => (await teamsApi.invite(teamId!)).data,
  });

  const code = q.data?.code;
  const qr = code
    ? `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
        code,
      )}&bgcolor=0d0120&color=c9a140&qzone=2&format=png`
    : null;

  const shareText = `Připoj se k týmu ${teamName} ve Floorball Stars Lize! 🏑\n\nPozvánkový kód: ${code}\n\nZaregistruj se na https://fslleague.cz/registrace`;

  async function share() {
    if (!code) return;
    if (navigator.share) {
      try {
        await navigator.share({ title: "Pozvánka do FSL", text: shareText });
        return;
      } catch {
        /* zrušeno */
      }
    }
    await navigator.clipboard.writeText(shareText);
    toast.success("Pozvánka zkopírována");
  }

  return (
    <Page size="narrow">
      <PageTitle
        title="Pozvánkový kód"
        subtitle={`Sdílej ho s hráči týmu ${teamName}`}
      />

      {q.isLoading ? (
        <div className="flex justify-center py-20 text-go">
          <Spinner size={30} />
        </div>
      ) : !code ? (
        <EmptyState title="Kód není dostupný" description="Zkus to prosím znovu později." />
      ) : (
        <Card className="p-8 text-center">
          {qr ? (
            <Image
              src={qr}
              alt="QR kód pozvánky"
              width={240}
              height={240}
              unoptimized
              className="mx-auto rounded-xl"
            />
          ) : null}
          <p className="mt-6 text-[11px] font-semibold label-caps uppercase text-mu">
            Pozvánkový kód
          </p>
          <p className="mt-2 select-all text-3xl font-black tracking-[0.2em] text-go">
            {code}
          </p>
          <p className="mx-auto mt-3 max-w-xs text-[13px] leading-6 text-mu">
            Hráč naskenuje QR kód v aplikaci nebo kód zadá ručně při registraci na webu.
          </p>
          <div className="mt-6 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Button onClick={share}>
              <Share2 size={16} /> Sdílet pozvánku
            </Button>
            <Button
              variant="subtle"
              onClick={() => {
                void navigator.clipboard.writeText(code);
                toast.success("Kód zkopírován");
              }}
            >
              <Copy size={16} /> Zkopírovat kód
            </Button>
          </div>
        </Card>
      )}
    </Page>
  );
}
