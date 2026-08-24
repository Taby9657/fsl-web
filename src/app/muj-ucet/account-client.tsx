"use client";

import { useQuery } from "@tanstack/react-query";
import {
  Bell,
  ChevronRight,
  ClipboardList,
  CreditCard,
  Flag,
  LogOut,
  MessageSquare,
  QrCode,
  Settings,
  Shield,
  Star,
  UserCog,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { errMsg, playersApi, teamsApi } from "@/lib/api";
import { fullName, REG_STATUS_COLOR, REG_STATUS_LABEL } from "@/lib/format";
import {
  useAuthStore,
  useIsManager,
  useIsReferee,
  useIsSupervisor,
} from "@/store/auth";
import { Page } from "@/components/layout/container";
import {
  Button,
  Card,
  LinkButton,
  PageTitle,
  SectionTitle,
  Textarea,
} from "@/components/ui/primitives";
import { ConfirmDialog, Modal } from "@/components/ui/feedback";
import { Avatar, StatBox, StatStrip, TeamBadge } from "@/components/ui/data";
import { toast } from "@/components/ui/toast";

export function AccountClient() {
  const router = useRouter();
  const user = useAuthStore((s) => s.user);
  const logout = useAuthStore((s) => s.logout);
  const refreshUser = useAuthStore((s) => s.refreshUser);
  const isManager = useIsManager();
  const isReferee = useIsReferee();
  const isSupervisor = useIsSupervisor();

  const [leaveOpen, setLeaveOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [appealOpen, setAppealOpen] = useState(false);
  const [appeal, setAppeal] = useState("");
  const [appealBusy, setAppealBusy] = useState(false);

  const player = user?.player;
  const managedTeamId = user?.manager?.[0]?.teamId;

  const stats = useQuery({
    queryKey: ["my-stats"],
    enabled: !!player,
    queryFn: async () => (await playersApi.myStats()).data,
  });

  const team = useQuery({
    queryKey: ["team", managedTeamId],
    enabled: !!managedTeamId,
    queryFn: async () => (await teamsApi.get(managedTeamId!)).data,
  });

  const hasRole = !!player || isReferee || isManager;

  async function leaveTeam() {
    if (!player) return;
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

  async function sendAppeal() {
    if (!managedTeamId || !appeal.trim()) {
      toast.error("Chyba", "Zadej text odvolání.");
      return;
    }
    setAppealBusy(true);
    try {
      await teamsApi.appeal(managedTeamId, appeal.trim());
      await team.refetch();
      setAppealOpen(false);
      setAppeal("");
      toast.success("Odesláno", "Odvolání bylo odesláno supervisorovi.");
    } catch (e) {
      toast.error("Chyba", errMsg(e));
    } finally {
      setAppealBusy(false);
    }
  }

  const regStatus = team.data?.regStatus;

  return (
    <Page size="narrow">
      <PageTitle
        title="Můj účet"
        subtitle={user?.email}
        action={
          <div className="flex gap-2">
            <LinkButton href="/nastaveni" variant="ghost" size="sm">
              <Settings size={15} /> Nastavení
            </LinkButton>
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await logout();
                router.push("/");
              }}
            >
              <LogOut size={15} /> Odhlásit
            </Button>
          </div>
        }
      />

      {/* profil */}
      <Card className="mb-6 flex flex-wrap items-center gap-4 p-5">
        <Avatar
          photoUrl={player?.photoUrl}
          firstName={player?.firstName ?? user?.referee?.firstName}
          lastName={player?.lastName ?? user?.referee?.lastName}
          size={56}
        />
        <div className="min-w-0 flex-1">
          <p className="text-[17px] font-bold text-wh">
            {fullName(player ?? user?.referee) !== "—"
              ? fullName(player ?? user?.referee)
              : "Uživatel"}
          </p>
          <p className="mt-0.5 flex flex-wrap gap-1.5 text-[12px]">
            {player ? <RoleTag color="#C9A140">Hráč</RoleTag> : null}
            {isManager ? <RoleTag color="#8B5CF6">Vedoucí týmu</RoleTag> : null}
            {isReferee ? <RoleTag color="#3B82F6">Rozhodčí</RoleTag> : null}
            {isSupervisor ? <RoleTag color="#22C55E">Supervisor</RoleTag> : null}
          </p>
        </div>
        {player?.team ? (
          <Link href={`/tymy/${player.team.id}`} className="flex items-center gap-2.5">
            <TeamBadge abbr={player.team.abbr} color={player.team.color} size={40} />
            <span className="hidden text-[13px] text-mu sm:block">{player.team.name}</span>
          </Link>
        ) : null}
      </Card>

      {!hasRole ? (
        <Card className="mb-6 border-go/50 p-5">
          <p className="text-[15px] font-semibold text-wh">Dokonči registraci</p>
          <p className="mt-1 text-[13px] text-mu">
            Připoj se k týmu, založ vlastní tým nebo se zaregistruj jako rozhodčí.
          </p>
          <LinkButton href="/registrace" className="mt-4" size="sm">
            Pokračovat v registraci
          </LinkButton>
        </Card>
      ) : null}

      {/* stav registrace týmu */}
      {isManager && regStatus && regStatus !== "APPROVED" ? (
        <Card
          className="mb-6 p-5"
          style={{
            backgroundColor: `${REG_STATUS_COLOR[regStatus]}18`,
            borderColor: `${REG_STATUS_COLOR[regStatus]}55`,
          }}
        >
          <p
            className="text-[15px] font-bold"
            style={{ color: REG_STATUS_COLOR[regStatus] }}
          >
            {regStatus === "PENDING"
              ? "Čeká na schválení"
              : regStatus === "REJECTED"
                ? "Registrace zamítnuta"
                : "Odvolání odesláno"}
          </p>
          <p className="mt-1 text-[13px] leading-6 text-mu">
            {regStatus === "PENDING"
              ? "Tým čeká na schválení supervisorem. Obdržíš oznámení po vyřízení."
              : regStatus === "REJECTED"
                ? `Důvod: ${team.data?.regNote ?? "neuveden"}`
                : `Tvé odvolání: ${team.data?.regAppeal ?? ""}`}
          </p>
          {regStatus === "REJECTED" ? (
            <Button variant="danger" size="sm" className="mt-4" onClick={() => setAppealOpen(true)}>
              Podat odvolání
            </Button>
          ) : null}
        </Card>
      ) : null}

      {/* statistiky hráče */}
      {player ? (
        <div className="mb-8">
          <SectionTitle>Moje statistiky</SectionTitle>
          <StatStrip>
            <StatBox value={stats.data?.goals ?? 0} label="Góly" />
            <StatBox value={stats.data?.assists ?? 0} label="Asistence" />
            <StatBox value={stats.data?.points ?? 0} label="Body" />
            <StatBox value={stats.data?.mvp ?? 0} label="MVP" />
          </StatStrip>
        </div>
      ) : null}

      {/* sekce podle rolí */}
      <div className="space-y-8">
        {player ? (
          <MenuSection title="Můj profil">
            <MenuRow href="/muj-profil" icon={<UserCog size={17} />} label="Upravit profil" desc="Jméno, telefon, číslo dresu" />
            <MenuRow href="/platby" icon={<CreditCard size={17} />} label="Platby" desc="Licence a poplatky" />
            <MenuRow href="/draft/profil" icon={<Star size={17} />} label="Draft profil" desc="Zviditelni se pro vedoucí" />
            <MenuRow href="/oznameni" icon={<Bell size={17} />} label="Oznámení" desc="Novinky a potvrzení plateb" />
          </MenuSection>
        ) : null}

        {isManager ? (
          <MenuSection title="Vedoucí týmu" color="#8B5CF6">
            <MenuRow href="/tym/soupiska" icon={<Users size={17} />} label="Soupiska" desc="Hráči týmu a jejich licence" color="#8B5CF6" />
            <MenuRow href="/tym/pozvanka" icon={<QrCode size={17} />} label="Pozvánkový kód" desc="Sdílej s hráči" color="#8B5CF6" />
            <MenuRow href="/tym/sestava" icon={<ClipboardList size={17} />} label="Sestava před zápasem" desc="Odeslání soupisky k zápasu" color="#8B5CF6" />
            <MenuRow href="/tym/po-zapase" icon={<Star size={17} />} label="Po-zápasový formulář" desc="MVP a hodnocení rozhodčího" color="#8B5CF6" />
            <MenuRow href="/platby" icon={<CreditCard size={17} />} label="Platby týmu" desc="Registrace a domácí zápasy" color="#8B5CF6" />
          </MenuSection>
        ) : null}

        {isReferee ? (
          <MenuSection title="Rozhodčí" color="#3B82F6">
            <MenuRow
              href={`/rozhodci/${user?.referee?.id}`}
              icon={<Flag size={17} />}
              label="Moje nasazení"
              desc="Nadcházející zápasy"
              color="#3B82F6"
            />
            <MenuRow href="/rozhodci/profil" icon={<UserCog size={17} />} label="Můj profil" desc="Kontakt a bankovní spojení" color="#3B82F6" />
          </MenuSection>
        ) : null}

        {isSupervisor ? (
          <MenuSection title="Supervisor" color="#22C55E">
            <MenuRow href="/admin" icon={<Shield size={17} />} label="Administrace ligy" desc="Dashboard, týmy, zápasy, platby" color="#22C55E" />
          </MenuSection>
        ) : null}

        <MenuSection title="Podpora">
          <MenuRow href="/zadost" icon={<MessageSquare size={17} />} label="Žádost supervisorovi" desc="Reklamace zápisu, spor, licence" />
        </MenuSection>
      </div>

      {player?.teamId ? (
        <Button variant="outline" className="mt-8 w-full border-red/50 text-red hover:bg-red/10" onClick={() => setLeaveOpen(true)}>
          Opustit tým
        </Button>
      ) : null}

      <ConfirmDialog
        open={leaveOpen}
        title="Opustit tým"
        message={`Opravdu chceš opustit tým ${player?.team?.name ?? ""}?`}
        confirmLabel="Opustit"
        destructive
        loading={leaving}
        onConfirm={leaveTeam}
        onCancel={() => setLeaveOpen(false)}
      />

      <Modal open={appealOpen} onClose={() => setAppealOpen(false)} title="Odvolání registrace">
        <p className="mb-3 text-[13px] leading-6 text-mu">
          Vysvětli, proč by měl být tým přijat do ligy. Odvolání se odešle supervisorovi.
        </p>
        <Textarea
          value={appeal}
          onChange={(e) => setAppeal(e.target.value)}
          placeholder="Napiš odvolání…"
        />
        <Button variant="danger" className="mt-4 w-full" onClick={sendAppeal} loading={appealBusy}>
          Odeslat odvolání
        </Button>
      </Modal>
    </Page>
  );
}

function RoleTag({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ color, backgroundColor: `${color}22` }}
    >
      {children}
    </span>
  );
}

function MenuSection({
  title,
  color = "#C9A140",
  children,
}: {
  title: string;
  color?: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2
        className="mb-3 text-[11px] font-semibold label-caps uppercase"
        style={{ color }}
      >
        {title}
      </h2>
      <Card className="overflow-hidden">
        <div className="divide-y divide-bd">{children}</div>
      </Card>
    </section>
  );
}

function MenuRow({
  href,
  icon,
  label,
  desc,
  color = "#C9A140",
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  desc: string;
  color?: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-3.5 px-4 py-3.5 transition-colors hover:bg-c2/60"
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
        style={{ backgroundColor: `${color}22`, color }}
      >
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-wh">{label}</span>
        <span className="block text-[12px] text-mu">{desc}</span>
      </span>
      <ChevronRight size={16} className="shrink-0 text-di" />
    </Link>
  );
}
