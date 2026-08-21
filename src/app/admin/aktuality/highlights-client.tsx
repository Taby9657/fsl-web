"use client";

import { useQuery } from "@tanstack/react-query";
import { Newspaper, Pencil, Pin, PinOff, Plus, Trash2, Video } from "lucide-react";
import { useState } from "react";
import { errMsg, highlightsApi } from "@/lib/api";
import { fmtDate } from "@/lib/format";
import type { Highlight } from "@/lib/types";
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  PageTitle,
  Switch,
  Textarea,
} from "@/components/ui/primitives";
import { ConfirmDialog, Modal, SkeletonCards } from "@/components/ui/feedback";
import { toast } from "@/components/ui/toast";

type Form = { round: string; title: string; body: string; imageUrl: string; pinned: boolean };
const EMPTY: Form = { round: "", title: "", body: "", imageUrl: "", pinned: false };

export function AdminHighlightsClient() {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Highlight | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [video, setVideo] = useState<File | null>(null);
  const [deleting, setDeleting] = useState<Highlight | null>(null);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);

  const q = useQuery({
    queryKey: ["highlights"],
    queryFn: async () => (await highlightsApi.list()).data,
  });

  function openCreate() {
    setEditing(null);
    setForm(EMPTY);
    setVideo(null);
    setOpen(true);
  }

  function openEdit(h: Highlight) {
    setEditing(h);
    setForm({
      round: h.round != null ? String(h.round) : "",
      title: h.title,
      body: h.body,
      imageUrl: h.imageUrl ?? "",
      pinned: h.pinned,
    });
    setVideo(null);
    setOpen(true);
  }

  async function save() {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("Chybí údaje", "Vyplň nadpis a text.");
      return;
    }
    setBusy(true);
    try {
      const payload = {
        round: form.round ? parseInt(form.round, 10) : null,
        title: form.title.trim(),
        body: form.body.trim(),
        imageUrl: form.imageUrl.trim() || null,
        pinned: form.pinned,
      };
      const res = editing
        ? await highlightsApi.update(editing.id, payload)
        : await highlightsApi.create(payload);

      if (video) {
        setUploading(true);
        try {
          await highlightsApi.uploadVideo(res.data.id, video);
        } catch (e) {
          toast.error("Video – chyba", errMsg(e));
        } finally {
          setUploading(false);
        }
      }
      await q.refetch();
      setOpen(false);
      toast.success(editing ? "Aktualita upravena" : "Aktualita přidána");
    } catch (e) {
      toast.error("Chyba", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function togglePin(h: Highlight) {
    try {
      await highlightsApi.update(h.id, { pinned: !h.pinned });
      await q.refetch();
    } catch {
      /* tiché selhání jako v aplikaci */
    }
  }

  async function remove() {
    if (!deleting) return;
    setBusy(true);
    try {
      await highlightsApi.delete(deleting.id);
      await q.refetch();
      setDeleting(null);
      toast.success("Aktualita smazána");
    } catch (e) {
      toast.error("Chyba", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <PageTitle
        title="Aktuality"
        subtitle="Highlighty kola viditelné na úvodní stránce"
        action={
          <Button size="sm" onClick={openCreate}>
            <Plus size={16} /> Nová aktualita
          </Button>
        }
      />

      {q.isLoading ? (
        <SkeletonCards count={3} />
      ) : !q.data?.length ? (
        <EmptyState
          icon={<Newspaper size={44} />}
          title="Žádné aktuality"
          description="Přidej první highlight kola."
          action={
            <Button size="sm" onClick={openCreate}>
              Přidat aktualitu
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {q.data.map((h) => (
            <Card key={h.id} className={h.pinned ? "border-go/50 p-4" : "p-4"}>
              <div className="mb-2 flex flex-wrap items-center gap-2">
                {h.round != null ? (
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-di">
                    Kolo {h.round}
                  </span>
                ) : null}
                {h.pinned ? <Badge>Připnuto</Badge> : null}
                {h.videoUrl ? (
                  <Badge color="#3B82F6" icon={<Video size={10} />}>
                    Video
                  </Badge>
                ) : null}
                <span className="ml-auto text-[11px] text-di">{fmtDate(h.createdAt)}</span>
              </div>
              <h3 className="text-[15px] font-bold text-wh">{h.title}</h3>
              <p className="mt-1 line-clamp-2 text-[13px] leading-6 text-mu">{h.body}</p>

              <div className="mt-3 flex flex-wrap gap-2 border-t border-bd pt-3">
                <button
                  onClick={() => togglePin(h)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-go transition-colors hover:bg-go/10"
                >
                  {h.pinned ? <PinOff size={14} /> : <Pin size={14} />}
                  {h.pinned ? "Odepnout" : "Připnout"}
                </button>
                <button
                  onClick={() => openEdit(h)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-mu transition-colors hover:bg-c2 hover:text-wh"
                >
                  <Pencil size={14} /> Upravit
                </button>
                <button
                  onClick={() => setDeleting(h)}
                  className="ml-auto flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[13px] font-semibold text-red transition-colors hover:bg-red/10"
                >
                  <Trash2 size={14} /> Smazat
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? "Upravit aktualitu" : "Nová aktualita"}
      >
        <div className="space-y-4">
          <Field label="Kolo (volitelné)">
            <Input
              value={form.round}
              inputMode="numeric"
              onChange={(e) => setForm({ ...form, round: e.target.value.replace(/\D/g, "") })}
            />
          </Field>
          <Field label="Nadpis" required>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </Field>
          <Field label="Text" required>
            <Textarea
              value={form.body}
              onChange={(e) => setForm({ ...form, body: e.target.value })}
              className="min-h-[130px]"
              placeholder="Tomáš Novák (BE) vstřelil hattrick v derby zápase…"
            />
          </Field>
          <Field label="URL obrázku (volitelné)">
            <Input
              value={form.imageUrl}
              onChange={(e) => setForm({ ...form, imageUrl: e.target.value })}
              placeholder="https://…"
            />
          </Field>
          <Field label="Video (volitelné)">
            <input
              type="file"
              accept="video/*"
              onChange={(e) => setVideo(e.target.files?.[0] ?? null)}
              className="block w-full text-[13px] text-mu file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-c2 file:px-3 file:py-2 file:text-[13px] file:text-wh"
            />
          </Field>
          <Switch
            checked={form.pinned}
            onChange={(v) => setForm({ ...form, pinned: v })}
            label="Připnout nahoře"
            description="Zobrazí se jako první na úvodní stránce"
          />
          <Button className="w-full" onClick={save} loading={busy || uploading}>
            {uploading
              ? "Nahrávám video…"
              : editing
                ? "Uložit změny"
                : "Přidat aktualitu"}
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleting}
        title="Smazat aktualitu"
        message={`„${deleting?.title}"\n\nOpravdu smazat?`}
        confirmLabel="Smazat"
        destructive
        loading={busy}
        onConfirm={remove}
        onCancel={() => setDeleting(null)}
      />
    </>
  );
}
