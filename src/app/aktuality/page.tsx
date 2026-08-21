import type { Metadata } from "next";
import { Newspaper, Pin, PlayCircle } from "lucide-react";
import Image from "next/image";
import { publicFetch } from "@/lib/api";
import type { Highlight } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { Page } from "@/components/layout/container";
import { Card, EmptyState, PageTitle } from "@/components/ui/primitives";

export const revalidate = 120;

export const metadata: Metadata = {
  title: "Aktuality",
  description: "Highlighty kola, novinky a zajímavosti z Floorball Stars Ligy.",
};

export default async function AktualityPage() {
  const highlights = (await publicFetch<Highlight[]>("/highlights")) ?? [];

  return (
    <Page size="narrow">
      <PageTitle title="Aktuality" subtitle="Highlighty kola a novinky z ligy" />

      {highlights.length === 0 ? (
        <EmptyState icon={<Newspaper size={44} />} title="Zatím žádné aktuality" />
      ) : (
        <div className="space-y-4">
          {highlights.map((h) => (
            <Card key={h.id} className={h.pinned ? "overflow-hidden border-go/50" : "overflow-hidden"}>
              {h.imageUrl ? (
                <div className="relative h-52 w-full">
                  <Image src={h.imageUrl} alt="" fill className="object-cover" sizes="768px" />
                </div>
              ) : null}
              <div className="p-5">
                <div className="mb-2.5 flex flex-wrap items-center gap-2">
                  {h.pinned ? (
                    <span className="inline-flex items-center gap-1 rounded-full bg-go px-2 py-0.5 text-[10px] font-bold uppercase text-bg">
                      <Pin size={10} /> Připnuto
                    </span>
                  ) : null}
                  {h.round != null ? (
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-di">
                      Kolo {h.round}
                    </span>
                  ) : null}
                  <span className="ml-auto text-[11px] text-di">{fmtDate(h.createdAt)}</span>
                </div>
                <h2 className="text-[17px] font-bold text-wh">{h.title}</h2>
                <p className="mt-2 whitespace-pre-line text-[14px] leading-6 text-mu">{h.body}</p>
                {h.videoUrl ? (
                  <a
                    href={h.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl border border-blue/40 bg-blue/15 px-3.5 py-2 text-[13px] font-semibold text-blue transition-colors hover:bg-blue/25"
                  >
                    <PlayCircle size={16} />
                    Přehrát video
                  </a>
                ) : null}
              </div>
            </Card>
          ))}
        </div>
      )}
    </Page>
  );
}
