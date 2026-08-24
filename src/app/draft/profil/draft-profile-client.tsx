"use client";

import { useQuery } from "@tanstack/react-query";
import { PlayCircle, Trash2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { draftApi, errMsg } from "@/lib/api";
import type { DraftVideo } from "@/lib/types";
import { Page } from "@/components/layout/container";
import {
  Button,
  Card,
  Chip,
  Field,
  PageTitle,
  Textarea,
  Spinner,
} from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/feedback";
import { toast } from "@/components/ui/toast";

const POSITIONS = ["Útočník", "Obránce", "Brankář", "Univerzál"];
const MAX_VIDEOS = 5;

export function DraftProfileClient() {
  const router = useRouter();
  const [form, setForm] = useState({ bio: "", pubSkill: "", position: "" });
  const [videos, setVideos] = useState<DraftVideo[]>([]);
  const [hasProfile, setHasProfile] = useState(false);
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleteVideoId, setDeleteVideoId] = useState<string | null>(null);
  const [removeOpen, setRemoveOpen] = useState(false);

  const q = useQuery({
    queryKey: ["draft", "me"],
    queryFn: async () => (await draftApi.me()).data,
  });

  useEffect(() => {
    const p = q.data;
    if (!p) return;
    setForm({
      bio: p.bio ?? "",
      pubSkill: p.pubSkill ?? "",
      position: p.position ?? "",
    });
    setVideos(p.videos ?? []);
    setHasProfile(p.isActive === true);
  }, [q.data]);

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function save() {
    setBusy(true);
    try {
      const payload = {
        bio: form.bio.trim() || null,
        pubSkill: form.pubSkill.trim() || null,
        position: form.position || null,
      };
      if (hasProfile) await draftApi.updateProfile(payload);
      else await draftApi.createProfile(payload);
      await q.refetch();
      setHasProfile(true);
      toast.success("Hotovo", "Profil uložen.");
    } catch (e) {
      toast.error("Chyba", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function upload(file: File) {
    if (videos.length >= MAX_VIDEOS) {
      toast.error("Limit", `Maximálně ${MAX_VIDEOS} videí na profil.`);
      return;
    }
    if (!hasProfile) {
      toast.error("Nejprve ulož profil", "Ulož základní info před nahráváním videa.");
      return;
    }
    setUploading(true);
    try {
      const res = await draftApi.uploadVideo(file);
      setVideos((v) => [...v, res.data as DraftVideo]);
      toast.success("Video nahráno");
    } catch (e) {
      toast.error("Chyba nahrávání", errMsg(e));
    } finally {
      setUploading(false);
    }
  }

  async function removeVideo(id: string) {
    try {
      await draftApi.deleteVideo(id);
      setVideos((v) => v.filter((x) => x.id !== id));
      setDeleteVideoId(null);
      toast.success("Video smazáno");
    } catch (e) {
      toast.error("Chyba", errMsg(e));
    }
  }

  async function removeProfile() {
    setBusy(true);
    try {
      await draftApi.deleteProfile();
      toast.success("Hotovo", "Profil byl odebrán z draft poolu.");
      router.push("/draft");
    } catch (e) {
      toast.error("Chyba", errMsg(e));
    } finally {
      setBusy(false);
      setRemoveOpen(false);
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

  return (
    <Page size="narrow">
      <PageTitle
        title={hasProfile ? "Upravit draft profil" : "Vytvořit draft profil"}
        subtitle="Zviditelni se pro vedoucí týmů, kteří hledají posily"
      />

      <Card className="space-y-5 p-5">
        <Field label="Pozice">
          <div className="flex flex-wrap gap-2">
            {POSITIONS.map((p) => (
              <Chip key={p} active={form.position === p} onClick={() => set("position", p)}>
                {p}
              </Chip>
            ))}
          </div>
        </Field>

        <Field label="O sobě">
          <Textarea
            value={form.bio}
            onChange={(e) => set("bio", e.target.value)}
            placeholder="Napiš něco o sobě – zkušenosti, styl hry, co hledáš…"
            className="min-h-[110px]"
          />
        </Field>

        <Field label="Pub skill / Selling point">
          <p className="mb-2 text-[12px] leading-5 text-di">
            Napiš svůj největší skill, trik nebo kontroverzní výrok. Čím víc osobitosti, tím
            lépe.
          </p>
          <Textarea
            value={form.pubSkill}
            onChange={(e) => set("pubSkill", e.target.value)}
            placeholder="„Největší sekera v české florbalové historii“"
            className="min-h-[80px]"
          />
        </Field>

        <Button className="w-full" onClick={save} loading={busy}>
          {hasProfile ? "Uložit změny" : "Vytvořit profil"}
        </Button>
      </Card>

      <Card className="mt-4 p-5">
        <p className="text-[11px] font-semibold label-caps uppercase text-mu">
          Sestřih videí ({videos.length}/{MAX_VIDEOS})
        </p>
        <p className="mt-1.5 text-[12px] leading-5 text-di">
          Nahraj videa ze svých zápasů nebo tréninků. Vedoucí je uvidí na tvém profilu.
        </p>

        {videos.length ? (
          <div className="mt-4 divide-y divide-bd rounded-xl border border-bd">
            {videos.map((v, i) => (
              <div key={v.id} className="flex items-center gap-3 px-3 py-2.5">
                <PlayCircle size={18} className="text-go" />
                <a
                  href={v.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 text-[14px] text-wh hover:underline"
                >
                  Video {i + 1}
                </a>
                <button
                  onClick={() => setDeleteVideoId(v.id)}
                  aria-label="Smazat video"
                  className="cursor-pointer text-red transition-opacity hover:opacity-70"
                >
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        ) : null}

        {videos.length < MAX_VIDEOS ? (
          <label className="mt-4 flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-go/50 px-4 py-3 text-[14px] font-semibold text-go transition-colors hover:bg-go/10">
            {uploading ? <Spinner size={16} /> : <Upload size={16} />}
            {uploading ? "Nahrávám…" : "Nahrát video"}
            <input
              type="file"
              accept="video/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void upload(f);
                e.target.value = "";
              }}
            />
          </label>
        ) : null}
      </Card>

      {hasProfile ? (
        <Button
          variant="ghost"
          className="mt-4 w-full text-red hover:bg-red/10"
          onClick={() => setRemoveOpen(true)}
        >
          Odebrat se z draft poolu
        </Button>
      ) : null}

      <ConfirmDialog
        open={!!deleteVideoId}
        title="Smazat video"
        message="Opravdu smazat?"
        confirmLabel="Smazat"
        destructive
        onConfirm={() => deleteVideoId && removeVideo(deleteVideoId)}
        onCancel={() => setDeleteVideoId(null)}
      />

      <ConfirmDialog
        open={removeOpen}
        title="Odebrat z draftu"
        message="Odebereš svůj profil z draft poolu. Všechny nabídky se zruší."
        confirmLabel="Odebrat"
        destructive
        loading={busy}
        onConfirm={removeProfile}
        onCancel={() => setRemoveOpen(false)}
      />
    </Page>
  );
}
