"use client";

import { useQuery } from "@tanstack/react-query";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { errMsg, supervisorApi } from "@/lib/api";
import { fmtDate, REQUEST_TYPE_LABEL } from "@/lib/format";
import type { RequestStatus, SupervisorRequest } from "@/lib/types";
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
import { toast } from "@/components/ui/toast";

const FILTERS: { id: RequestStatus; label: string }[] = [
  { id: "PENDING", label: "Čeká" },
  { id: "IN_PROGRESS", label: "Řeší se" },
  { id: "APPROVED", label: "Schváleno" },
  { id: "REJECTED", label: "Zamítnuto" },
];

const STATUS_COLOR: Record<RequestStatus, string> = {
  PENDING: "#F59E0B",
  IN_PROGRESS: "#3B82F6",
  APPROVED: "#22C55E",
  REJECTED: "#EF4444",
};

const STATUS_LABEL: Record<RequestStatus, string> = {
  PENDING: "Čeká",
  IN_PROGRESS: "Řeší se",
  APPROVED: "Schváleno",
  REJECTED: "Zamítnuto",
};

export function AdminRequestsClient() {
  const [status, setStatus] = useState<RequestStatus>("PENDING");
  const [deciding, setDeciding] = useState<{ req: SupervisorRequest; approve: boolean } | null>(
    null,
  );
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  const q = useQuery({
    queryKey: ["supervisor", "requests", status],
    queryFn: async () => (await supervisorApi.requests(status)).data,
  });

  async function update(id: string, data: Record<string, unknown>, msg: string) {
    setBusy(id);
    try {
      await supervisorApi.updateRequest(id, data);
      await q.refetch();
      toast.success(msg);
      setDeciding(null);
      setNote("");
    } catch (e) {
      toast.error("Chyba", errMsg(e));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <PageTitle title="Žádosti" subtitle="Reklamace zápisů, spory a problémy s licencemi" />

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
        <EmptyState icon={<CheckCircle2 size={44} />} title="Žádné žádosti v této kategorii" />
      ) : (
        <div className="space-y-3">
          {q.data.map((r) => (
            <Card key={r.id} className="p-4">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <span className="text-[13px] font-semibold text-wh">
                  {REQUEST_TYPE_LABEL[r.type] ?? r.type}
                </span>
                <Badge color={STATUS_COLOR[r.status]}>{STATUS_LABEL[r.status]}</Badge>
                <span className="ml-auto text-[11px] text-di">{fmtDate(r.createdAt)}</span>
              </div>

              {r.user?.email ? (
                <p className="text-[12px] text-mu">Od: {r.user.email}</p>
              ) : null}

              <p className="mt-2 whitespace-pre-line text-[14px] leading-6 text-wh">{r.body}</p>

              {r.matchId ? (
                <Link
                  href={`/zapasy/${r.matchId}`}
                  className="mt-2 inline-block text-[13px] font-semibold text-go hover:underline"
                >
                  Zobrazit zápas →
                </Link>
              ) : null}

              {r.note ? (
                <p className="mt-3 rounded-lg bg-c2/60 px-3 py-2 text-[13px] italic text-mu">
                  Poznámka: {r.note}
                </p>
              ) : null}

              {r.status === "PENDING" || r.status === "IN_PROGRESS" ? (
                <div className="mt-4 flex flex-wrap gap-2 border-t border-bd pt-3">
                  {r.status === "PENDING" ? (
                    <Button
                      variant="subtle"
                      size="sm"
                      loading={busy === r.id}
                      onClick={() => update(r.id, { status: "IN_PROGRESS" }, "Převzato")}
                    >
                      Převzít
                    </Button>
                  ) : null}
                  <Button
                    variant="success"
                    size="sm"
                    disabled={!!busy}
                    onClick={() => {
                      setDeciding({ req: r, approve: true });
                      setNote(r.note ?? "");
                    }}
                  >
                    Schválit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-red/50 text-red hover:bg-red/10"
                    disabled={!!busy}
                    onClick={() => {
                      setDeciding({ req: r, approve: false });
                      setNote(r.note ?? "");
                    }}
                  >
                    Zamítnout
                  </Button>
                </div>
              ) : null}
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={!!deciding}
        onClose={() => setDeciding(null)}
        title={deciding?.approve ? "Schválit žádost" : "Zamítnout žádost"}
        size="sm"
      >
        <Field label="Poznámka pro žadatele (volitelné)">
          <Textarea value={note} onChange={(e) => setNote(e.target.value)} className="min-h-[90px]" />
        </Field>
        <Button
          variant={deciding?.approve ? "success" : "danger"}
          className="mt-4 w-full"
          loading={busy === deciding?.req.id}
          onClick={() =>
            deciding &&
            update(
              deciding.req.id,
              {
                status: deciding.approve ? "APPROVED" : "REJECTED",
                note: note.trim() || undefined,
              },
              deciding.approve ? "Žádost schválena" : "Žádost zamítnuta",
            )
          }
        >
          {deciding?.approve ? "Schválit" : "Zamítnout"}
        </Button>
      </Modal>
    </>
  );
}
