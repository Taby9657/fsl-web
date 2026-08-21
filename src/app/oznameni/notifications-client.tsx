"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import clsx from "clsx";
import {
  Bell,
  BellOff,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Flag,
  Star,
  Target,
  XCircle,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { errMsg, notificationsApi } from "@/lib/api";
import { timeAgo } from "@/lib/format";
import type { AppNotification } from "@/lib/types";
import { Page } from "@/components/layout/container";
import { Button, Card, EmptyState, PageTitle } from "@/components/ui/primitives";
import { SkeletonList } from "@/components/ui/feedback";
import { toast } from "@/components/ui/toast";

function notifIcon(n: AppNotification): { icon: React.ReactNode; color: string } {
  const t = `${n.title} ${n.body}`.toLowerCase();
  if (/gól|skóre|zápas začal|live/.test(t)) return { icon: <Target size={17} />, color: "#C9A140" };
  if (/platb|licenc|poplatek/.test(t)) return { icon: <CreditCard size={17} />, color: "#22C55E" };
  if (/schválen/.test(t)) return { icon: <CheckCircle2 size={17} />, color: "#22C55E" };
  if (/zamítnut/.test(t)) return { icon: <XCircle size={17} />, color: "#EF4444" };
  if (/zápas ukončen|postmatch|formulář/.test(t))
    return { icon: <ClipboardList size={17} />, color: "#8B5CF6" };
  if (/rozhodčí|nasazen/.test(t)) return { icon: <Flag size={17} />, color: "#9B8BC8" };
  if (/draft|nabídka/.test(t)) return { icon: <Star size={17} />, color: "#C9A140" };
  return { icon: <Bell size={17} />, color: "#9B8BC8" };
}

function groupByDate(list: AppNotification[]) {
  const midnight = new Date();
  midnight.setHours(0, 0, 0, 0);
  const t = midnight.getTime();
  const groups: Record<string, AppNotification[]> = {
    Dnes: [],
    Včera: [],
    "Tento týden": [],
    Starší: [],
  };
  list.forEach((n) => {
    const d = new Date(n.createdAt).getTime();
    if (d >= t) groups["Dnes"].push(n);
    else if (d >= t - 86_400_000) groups["Včera"].push(n);
    else if (d >= t - 6 * 86_400_000) groups["Tento týden"].push(n);
    else groups["Starší"].push(n);
  });
  return Object.entries(groups).filter(([, v]) => v.length > 0);
}

/** Mapa obrazovek z aplikace na webové cesty. */
function screenToHref(screen?: string | null): string | null {
  if (!screen) return null;
  const s = screen.replace(/^\//, "");
  const map: Record<string, string> = {
    admin: "/muj-ucet",
    platby: "/platby",
    payments: "/platby",
    draft: "/draft",
    postmatch: "/tym/po-zapase",
    "onboard-ref": "/rozhodci/profil",
    "ref-detail": "/muj-ucet",
    lineup: "/tym/sestava",
  };
  if (map[s]) return map[s];
  if (s.startsWith("zapasy/") || s.startsWith("match/"))
    return `/zapasy/${s.split("/")[1]}`;
  if (s.startsWith("player/")) return `/hraci/${s.split("/")[1]}`;
  if (s.startsWith("team/")) return `/tymy/${s.split("/")[1]}`;
  return null;
}

export function NotificationsClient() {
  const qc = useQueryClient();
  const router = useRouter();

  const query = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => (await notificationsApi.list()).data,
  });

  const readAll = useMutation({
    mutationFn: () => notificationsApi.readAll(),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      toast.success("Označeno jako přečtené");
    },
    onError: (e) => toast.error("Chyba", errMsg(e)),
  });

  const unread = (query.data ?? []).filter((n) => !n.read).length;
  const groups = groupByDate(query.data ?? []);

  async function open(n: AppNotification) {
    if (!n.read) {
      await notificationsApi.read(n.id).catch(() => {});
      void qc.invalidateQueries({ queryKey: ["notifications"] });
      void qc.invalidateQueries({ queryKey: ["notifications", "unread"] });
    }
    const href = screenToHref(n.screen);
    if (href) router.push(href);
  }

  return (
    <Page size="narrow">
      <PageTitle
        title={unread > 0 ? `Oznámení (${unread})` : "Oznámení"}
        action={
          <Button
            variant="ghost"
            size="sm"
            disabled={unread === 0}
            loading={readAll.isPending}
            onClick={() => readAll.mutate()}
          >
            Vše přečteno
          </Button>
        }
      />

      {query.isLoading ? (
        <SkeletonList rows={6} />
      ) : !query.data?.length ? (
        <EmptyState
          icon={<BellOff size={44} />}
          title="Žádná oznámení"
          description="Zde se zobrazí novinky, potvrzení plateb a zprávy od supervizora."
        />
      ) : (
        <div className="space-y-6">
          {groups.map(([label, items]) => (
            <section key={label}>
              <h2 className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-di">
                {label}
              </h2>
              <Card className="overflow-hidden">
                <div className="divide-y divide-bd">
                  {items.map((n) => {
                    const { icon, color } = notifIcon(n);
                    return (
                      <button
                        key={n.id}
                        onClick={() => open(n)}
                        className={clsx(
                          "flex w-full cursor-pointer items-start gap-3 px-4 py-3.5 text-left transition-colors hover:bg-c2/60",
                          !n.read && "bg-go/[0.05]",
                        )}
                      >
                        <span
                          className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
                          style={{ backgroundColor: `${color}22`, color }}
                        >
                          {icon}
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span
                              className={clsx(
                                "min-w-0 flex-1 truncate text-[14px]",
                                n.read ? "text-mu" : "font-semibold text-wh",
                              )}
                            >
                              {n.title}
                            </span>
                            <span className="shrink-0 text-[11px] text-di">
                              {timeAgo(n.createdAt)}
                            </span>
                            {!n.read ? (
                              <span className="h-2 w-2 shrink-0 rounded-full bg-go" />
                            ) : null}
                          </span>
                          <span className="mt-0.5 block text-[13px] leading-5 text-mu">
                            {n.body}
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </Card>
            </section>
          ))}
        </div>
      )}
    </Page>
  );
}
