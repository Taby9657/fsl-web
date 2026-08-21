"use client";

import { useQuery } from "@tanstack/react-query";
import { Info } from "lucide-react";
import { useEffect, useState } from "react";
import { errMsg, refereesApi } from "@/lib/api";
import { fullName, REFEREE_LEVEL_LABEL } from "@/lib/format";
import { firstError, validatePhone } from "@/lib/validation";
import { useAuthStore } from "@/store/auth";
import { Page } from "@/components/layout/container";
import {
  Badge,
  Button,
  Card,
  Field,
  Input,
  PageTitle,
  SectionTitle,
  Spinner,
} from "@/components/ui/primitives";
import { Avatar } from "@/components/ui/data";
import { toast } from "@/components/ui/toast";

const STATUS_COLOR: Record<string, string> = {
  APPROVED: "#22C55E",
  REJECTED: "#EF4444",
  PENDING: "#F59E0B",
};
const STATUS_LABEL: Record<string, string> = {
  APPROVED: "Schválen",
  REJECTED: "Zamítnut",
  PENDING: "Čeká na schválení",
};

export function RefereeProfileClient() {
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const refId = user?.referee?.id;

  const [form, setForm] = useState({
    phone: "",
    address: "",
    city: "",
    zip: "",
    bankAccount: "",
    bankCode: "",
  });
  const [busy, setBusy] = useState(false);

  const q = useQuery({
    queryKey: ["referee", refId],
    enabled: !!refId,
    queryFn: async () => (await refereesApi.get(refId!)).data,
  });

  useEffect(() => {
    const r = q.data;
    if (!r) return;
    setForm({
      phone: r.phone ?? "",
      address: r.address ?? "",
      city: r.city ?? "",
      zip: r.zip ?? "",
      bankAccount: r.bankAccount ?? "",
      bankCode: r.bankCode ?? "",
    });
  }, [q.data]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    const err = firstError([
      validatePhone(form.phone),
      form.bankAccount.trim() ? null : "Číslo účtu je povinné pro výplatu odměn.",
    ]);
    if (err) {
      toast.error("Chyba ve formuláři", err);
      return;
    }
    setBusy(true);
    try {
      await refereesApi.update(refId!, form);
      await q.refetch();
      await refreshUser();
      toast.success("Uloženo");
    } catch (e) {
      toast.error("Chyba", errMsg(e, "Nepodařilo se uložit."));
    } finally {
      setBusy(false);
    }
  }

  if (q.isLoading) {
    return (
      <Page size="narrow">
        <div className="flex justify-center py-24 text-go">
          <Spinner size={32} />
        </div>
      </Page>
    );
  }

  const ref = q.data;
  const status = ref?.status ?? "PENDING";

  return (
    <Page size="narrow">
      <PageTitle title="Profil rozhodčího" subtitle="Kontaktní údaje a bankovní spojení" />

      <Card className="mb-4 flex flex-wrap items-center gap-4 p-5">
        <Avatar
          photoUrl={ref?.photoUrl}
          firstName={ref?.firstName}
          lastName={ref?.lastName}
          size={56}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-bold text-wh">{fullName(ref)}</p>
          <p className="text-[13px] text-mu">
            {REFEREE_LEVEL_LABEL[ref?.level ?? "C"] ?? ""}
          </p>
        </div>
        <Badge color={STATUS_COLOR[status]}>{STATUS_LABEL[status]}</Badge>
      </Card>

      {status === "PENDING" ? (
        <Card className="mb-4 flex items-start gap-3 border-go/40 bg-go/10 p-4">
          <Info size={18} className="mt-0.5 shrink-0 text-go" />
          <p className="text-[13px] leading-6 text-mu">
            Tvoje registrace čeká na schválení supervisorem. Obdržíš oznámení, jakmile bude
            vyřízena.
          </p>
        </Card>
      ) : null}

      <Card className="space-y-4 p-5">
        <SectionTitle>Kontaktní údaje</SectionTitle>
        <Field label="Telefon">
          <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
        </Field>
        <Field label="Adresa">
          <Input value={form.address} onChange={(e) => set("address", e.target.value)} />
        </Field>
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Field label="Město">
            <Input value={form.city} onChange={(e) => set("city", e.target.value)} />
          </Field>
          <Field label="PSČ">
            <Input value={form.zip} onChange={(e) => set("zip", e.target.value)} inputMode="numeric" />
          </Field>
        </div>
      </Card>

      <Card className="mt-4 space-y-4 p-5">
        <SectionTitle>Bankovní spojení (výplaty)</SectionTitle>
        <div className="grid gap-4 sm:grid-cols-[2fr_1fr]">
          <Field label="Číslo účtu" required>
            <Input
              value={form.bankAccount}
              onChange={(e) => set("bankAccount", e.target.value)}
              inputMode="numeric"
            />
          </Field>
          <Field label="Kód banky">
            <Input
              value={form.bankCode}
              onChange={(e) => set("bankCode", e.target.value)}
              inputMode="numeric"
            />
          </Field>
        </div>
        <p className="text-[12px] text-di">
          Bankovní údaje jsou potřeba pro výplatu odměn za odřízené zápasy. Vidí je pouze
          supervisor ligy.
        </p>
      </Card>

      <Button className="mt-5 w-full" onClick={save} loading={busy}>
        Uložit změny
      </Button>
    </Page>
  );
}
