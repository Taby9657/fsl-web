"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { errMsg, playersApi } from "@/lib/api";
import { POSITION_FULL } from "@/lib/format";
import { firstError, validateJersey, validateName, validatePhone } from "@/lib/validation";
import { useAuthStore } from "@/store/auth";
import { Page } from "@/components/layout/container";
import { Button, Card, Chip, Field, Input, PageTitle } from "@/components/ui/primitives";
import { ConfirmDialog } from "@/components/ui/feedback";
import { Avatar } from "@/components/ui/data";
import { toast } from "@/components/ui/toast";

const POSITIONS = ["Útočník", "Obránce", "Brankář"];

export function ProfileClient() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const player = user!.player!;

  const [form, setForm] = useState({
    firstName: player.firstName ?? "",
    lastName: player.lastName ?? "",
    jersey: String(player.jersey ?? ""),
    position: POSITION_FULL[player.position ?? "F"] ?? "Útočník",
    phone: player.phone ?? "",
    birthdate: player.birthdate ? player.birthdate.slice(0, 10) : "",
  });
  const [errors, setErrors] = useState<Record<string, string | null>>({});
  const [busy, setBusy] = useState(false);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);

  const set = (k: keyof typeof form, v: string) => {
    setForm((f) => ({ ...f, [k]: v }));
    setErrors((e) => ({ ...e, [k]: null }));
  };

  async function uploadPhoto(file: File) {
    setPhotoBusy(true);
    try {
      await playersApi.uploadPhoto(player.id, file);
      await refreshUser();
      toast.success("Fotka nahrána");
    } catch (e) {
      toast.error("Chyba", errMsg(e, "Nepodařilo se nahrát fotku."));
    } finally {
      setPhotoBusy(false);
    }
  }

  async function save() {
    const next = {
      firstName: validateName(form.firstName, "Jméno"),
      lastName: validateName(form.lastName, "Příjmení"),
      phone: validatePhone(form.phone),
      jersey: validateJersey(form.jersey),
    };
    setErrors(next);
    const err = firstError(Object.values(next));
    if (err) {
      toast.error("Chyba ve formuláři", err);
      return;
    }
    setBusy(true);
    try {
      await playersApi.update(player.id, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        jersey: form.jersey ? parseInt(form.jersey, 10) : undefined,
        position: form.position,
        phone: form.phone.trim() || undefined,
        birthdate: form.birthdate ? new Date(form.birthdate).toISOString() : undefined,
      });
      await refreshUser();
      toast.success("Uloženo", "Profil byl aktualizován.");
      router.push("/muj-ucet");
    } catch (e) {
      toast.error("Chyba", errMsg(e));
    } finally {
      setBusy(false);
    }
  }

  async function leaveTeam() {
    setLeaving(true);
    try {
      await playersApi.leaveTeam(player.id);
      await refreshUser();
      toast.success("Hotovo", "Byl jsi odebrán z týmu.");
      setLeaveOpen(false);
    } catch (e) {
      toast.error("Chyba", errMsg(e));
    } finally {
      setLeaving(false);
    }
  }

  return (
    <Page size="narrow">
      <PageTitle title="Upravit profil" subtitle="Osobní a hráčské údaje" />

      <Card className="mb-4 flex flex-wrap items-center gap-4 p-5">
        <Avatar
          photoUrl={player.photoUrl}
          firstName={form.firstName}
          lastName={form.lastName}
          size={64}
        />
        <div className="min-w-0 flex-1">
          <label className="block text-[13px] text-mu">
            Profilová fotka
            <input
              type="file"
              accept="image/*"
              disabled={photoBusy}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void uploadPhoto(f);
              }}
              className="mt-1.5 block w-full text-[13px] text-mu file:mr-3 file:cursor-pointer file:rounded-lg file:border-0 file:bg-c2 file:px-3 file:py-2 file:text-[13px] file:text-wh"
            />
          </label>
        </div>
      </Card>

      <Card className="space-y-4 p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Jméno" required error={errors.firstName}>
            <Input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} />
          </Field>
          <Field label="Příjmení" required error={errors.lastName}>
            <Input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Číslo dresu" error={errors.jersey}>
            <Input
              value={form.jersey}
              onChange={(e) => set("jersey", e.target.value.replace(/\D/g, "").slice(0, 2))}
              inputMode="numeric"
            />
          </Field>
          <Field label="Telefon" error={errors.phone}>
            <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </Field>
        </div>
        <Field label="Pozice">
          <div className="flex flex-wrap gap-2">
            {POSITIONS.map((p) => (
              <Chip key={p} active={form.position === p} onClick={() => set("position", p)}>
                {p}
              </Chip>
            ))}
          </div>
        </Field>
        <Field label="Datum narození">
          <Input
            type="date"
            value={form.birthdate}
            onChange={(e) => set("birthdate", e.target.value)}
            max={new Date().toISOString().slice(0, 10)}
          />
        </Field>

        <Button className="w-full" onClick={save} loading={busy}>
          Uložit změny
        </Button>
      </Card>

      {player.teamId ? (
        <Card className="mt-4 p-5">
          <p className="text-[11px] font-semibold label-caps uppercase text-mu">
            Aktuální tým
          </p>
          <p className="mt-1 text-[15px] font-medium text-wh">{player.team?.name ?? "—"}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4 border-red/50 text-red hover:bg-red/10"
            onClick={() => setLeaveOpen(true)}
          >
            Opustit tým
          </Button>
        </Card>
      ) : null}

      <ConfirmDialog
        open={leaveOpen}
        title="Opustit tým"
        message={`Opravdu chceš opustit tým ${player.team?.name ?? ""}? Tuto akci nelze vrátit.`}
        confirmLabel="Opustit"
        destructive
        loading={leaving}
        onConfirm={leaveTeam}
        onCancel={() => setLeaveOpen(false)}
      />
    </Page>
  );
}
