"use client";

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { errMsg, matchesApi, requestsApi } from "@/lib/api";
import { fmtDate, REQUEST_TYPE_LABEL } from "@/lib/format";
import type { RequestType } from "@/lib/types";
import { useAuthStore, useMyTeamId } from "@/store/auth";
import { Page } from "@/components/layout/container";
import {
  Button,
  Card,
  Chip,
  Field,
  PageTitle,
  Select,
  Textarea,
} from "@/components/ui/primitives";
import { toast } from "@/components/ui/toast";

const TYPES: RequestType[] = [
  "MATCH_TRANSCRIPT",
  "PLAYER_DISPUTE",
  "LICENSE_ISSUE",
  "OTHER",
];

export function RequestClient() {
  const user = useAuthStore((s) => s.user);
  const teamId = useMyTeamId();
  const [type, setType] = useState<RequestType>("MATCH_TRANSCRIPT");
  const [matchId, setMatchId] = useState("");
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  const matches = useQuery({
    queryKey: ["my-matches", teamId],
    enabled: !!teamId && type === "MATCH_TRANSCRIPT",
    queryFn: async () =>
      (await matchesApi.list({ teamId, status: "DONE", limit: 20 })).data,
  });

  async function submit() {
    if (!body.trim()) {
      toast.error("Chybí popis", "Popiš, čeho se žádost týká.");
      return;
    }
    setBusy(true);
    try {
      await requestsApi.create({
        type,
        body: body.trim(),
        teamId: teamId ?? undefined,
        matchId: matchId || undefined,
      });
      setSent(true);
      setBody("");
      setMatchId("");
      toast.success("Odesláno", "Supervisor žádost uvidí ve své frontě.");
    } catch (e) {
      toast.error("Chyba", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page size="narrow">
      <PageTitle
        title="Žádost supervisorovi"
        subtitle="Reklamace zápisu ze zápasu, hráčský spor nebo problém s licencí"
      />

      {sent ? (
        <Card className="mb-4 border-green/40 bg-green/10 p-5">
          <p className="text-[15px] font-semibold text-green">Žádost byla odeslána</p>
          <p className="mt-1 text-[13px] text-mu">
            O vyřízení tě budeme informovat oznámením.
          </p>
        </Card>
      ) : null}

      <Card className="space-y-4 p-5">
        <Field label="Typ žádosti" required>
          <div className="flex flex-wrap gap-2">
            {TYPES.map((t) => (
              <Chip key={t} active={type === t} onClick={() => setType(t)}>
                {REQUEST_TYPE_LABEL[t]}
              </Chip>
            ))}
          </div>
        </Field>

        {type === "MATCH_TRANSCRIPT" && matches.data?.length ? (
          <Field label="Kterého zápasu se týká">
            <Select value={matchId} onChange={(e) => setMatchId(e.target.value)}>
              <option value="">— nevybráno —</option>
              {matches.data.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.homeTeam?.abbr} {m.homeScore}:{m.awayScore} {m.awayTeam?.abbr} ·{" "}
                  {fmtDate(m.date)}
                </option>
              ))}
            </Select>
          </Field>
        ) : null}

        <Field label="Popis" required>
          <Textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="Popiš co nejkonkrétněji, čeho se žádost týká…"
            className="min-h-[140px]"
          />
        </Field>

        <p className="text-[12px] text-di">
          Žádost bude odeslána pod účtem {user?.email}.
        </p>

        <Button className="w-full" onClick={submit} loading={busy}>
          Odeslat žádost
        </Button>
      </Card>
    </Page>
  );
}
