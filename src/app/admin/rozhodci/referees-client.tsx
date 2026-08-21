"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, ChevronDown, ChevronUp } from "lucide-react";
import { useState } from "react";
import { errMsg, supervisorApi } from "@/lib/api";
import { fullName, REFEREE_LEVEL_LABEL } from "@/lib/format";
import type { Referee, RefereeStatus } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  Chip,
  ChipRow,
  EmptyState,
  Field,
  PageTitle,
  Textarea,
} from "@/components/ui/primitives";
import { Modal, SkeletonList } from "@/components/ui/feedback";
import { Avatar } from "@/components/ui/data";
import { toast } from "@/components/ui/toast";

const FILTERS: { id: RefereeStatus; label: string }[] = [
  { id: "PENDING", label: "Čekající" },
  { id: "APPROVED", label: "Schválení" },
  { id: "REJECTED", label: "Zamítnutí" },
];

export function AdminRefereesClient() {
  const [status, setStatus] = useState<RefereeStatus>("PENDING");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [approving, setApproving] = useState<Referee | null>(null);
  const [level, setLevel] = useState<"A" | "B" | "C">("C");
  const [rejecting, setRejecting] = useState<Referee | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);

  const q = useQuery({
    queryKey: ["supervisor", "referees", status],
    queryFn: async () => (await supervisorApi.referees(status)).data,
  });

  async function approve() {
    if (!approving) return;
    setBusy(true);
    try {
      await supervisorApi.approveRef(approving.id, level);
      await q.refetch();
      toast.success("Hotovo", `${fullName(approving)} schválen (úroveň ${level}).`);
      setApproving(null);
    } catch (e) {
      toast.error("Chyba", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function reject() {
    if (!rejecting) return;
    setBusy(true);
    try {
      await supervisorApi.rejectRef(rejecting.id, reason.trim() || undefined);
      await q.refetch();
      toast.success("Registrace zamítnuta");
      setRejecting(null);
      setReason("");
    } catch (e) {
      toast.error("Chyba", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle title="Rozhodčí" subtitle="Schvalování registrací a evidence rozhodčích" />

      <ChipRow className="mb-5">
        {FILTERS.map((f) => (
          <Chip
            key={f.id}
            accent="purple"
            active={status === f.id}
            onClick={() => setStatus(f.id)}
          >
            {f.label}
          </Chip>
        ))}
      </ChipRow>

      {q.isLoading ? (
        <SkeletonList rows={5} />
      ) : !q.data?.length ? (
        <EmptyState
          icon={<CheckCircle2 size={44} />}
          title={
            status === "PENDING"
              ? "Žádní čekající rozhodčí"
              : "Žádní rozhodčí v této kategorii"
          }
        />
      ) : (
        <div className="space-y-3">
          {q.data.map((r) => {
            const open = expanded === r.id;
            return (
              <Card key={r.id} className="overflow-hidden">
                <div className="flex flex-wrap items-center gap-3 p-4">
                  <Avatar
                    photoUrl={r.photoUrl}
                    firstName={r.firstName}
                    lastName={r.lastName}
                    size={42}
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-wh">{fullName(r)}</p>
                    <p className="text-[12px] text-mu">{r.user?.email ?? r.phone ?? ""}</p>
                  </div>
                  {r.level ? (
                    <Badge>{REFEREE_LEVEL_LABEL[r.level] ?? r.level}</Badge>
                  ) : null}
                  <button
                    onClick={() => setExpanded(open ? null : r.id)}
                    className="cursor-pointer rounded-lg p-2 text-mu transition-colors hover:bg-c2 hover:text-wh"
                    aria-label="Detail"
                  >
                    {open ? <ChevronUp size={17} /> : <ChevronDown size={17} />}
                  </button>
                </div>

                {open ? (
                  <dl className="divide-y divide-bd border-t border-bd bg-c2/40">
                    {(
                      [
                        ["Telefon", r.phone],
                        ["Rodné číslo", r.birthNo],
                        ["Adresa", [r.address, r.city, r.zip].filter(Boolean).join(", ")],
                        ["Bankovní účet", r.bankAccount ? `${r.bankAccount}/${r.bankCode ?? ""}` : ""],
                      ] as [string, string | null | undefined][]
                    ).map(([k, v]) => (
                      <div key={k} className="flex items-center justify-between gap-4 px-4 py-2.5">
                        <dt className="text-[12px] text-mu">{k}</dt>
                        <dd className="text-right text-[13px] text-wh">{v || "—"}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}

                {status === "PENDING" ? (
                  <div className="flex gap-2 border-t border-bd p-3">
                    <Button
                      variant="success"
                      size="sm"
                      className="flex-1"
                      onClick={() => {
                        setApproving(r);
                        setLevel((r.level as "A" | "B" | "C") ?? "C");
                      }}
                    >
                      Schválit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-red/50 text-red hover:bg-red/10"
                      onClick={() => {
                        setRejecting(r);
                        setReason("");
                      }}
                    >
                      Zamítnout
                    </Button>
                  </div>
                ) : null}
              </Card>
            );
          })}
        </div>
      )}

      <Modal open={!!approving} onClose={() => setApproving(null)} title="Schválit rozhodčího" size="sm">
        <p className="mb-4 text-[14px] text-mu">
          {fullName(approving)} — vyber úroveň rozhodčího:
        </p>
        <div className="flex gap-2">
          {(["A", "B", "C"] as const).map((l) => (
            <Chip key={l} active={level === l} onClick={() => setLevel(l)} className="flex-1 text-center">
              Úroveň {l}
            </Chip>
          ))}
        </div>
        <p className="mt-2 text-[12px] text-di">{REFEREE_LEVEL_LABEL[level]}</p>
        <Button className="mt-5 w-full" onClick={approve} loading={busy}>
          Schválit
        </Button>
      </Modal>

      <Modal open={!!rejecting} onClose={() => setRejecting(null)} title="Zamítnout registraci" size="sm">
        <Field label="Důvod zamítnutí (volitelné)">
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} className="min-h-[90px]" />
        </Field>
        <Button variant="danger" className="mt-4 w-full" onClick={reject} loading={busy}>
          Zamítnout
        </Button>
      </Modal>
    </>
  );
}
