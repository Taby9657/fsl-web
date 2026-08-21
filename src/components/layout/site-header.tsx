"use client";

import clsx from "clsx";
import {
  Bell,
  ChevronDown,
  LogOut,
  Menu,
  Search,
  Settings,
  Shield,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { notificationsApi } from "@/lib/api";
import { useAuthStore, useIsSupervisor } from "@/store/auth";
import { Button, LinkButton } from "@/components/ui/primitives";

const NAV = [
  { href: "/zapasy", label: "Zápasy" },
  { href: "/tabulka", label: "Tabulka" },
  { href: "/statistiky", label: "Statistiky" },
  { href: "/tymy", label: "Týmy" },
  { href: "/draft", label: "Draft" },
  { href: "/aktuality", label: "Aktuality" },
];

export function SiteHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const user = useAuthStore((s) => s.user);
  const loading = useAuthStore((s) => s.loading);
  const logout = useAuthStore((s) => s.logout);
  const isSupervisor = useIsSupervisor();

  const { data: unread = 0 } = useQuery({
    queryKey: ["notifications", "unread"],
    enabled: !!user,
    refetchInterval: 60_000,
    queryFn: async () => {
      const res = await notificationsApi.list();
      return res.data.filter((n) => !n.read).length;
    },
  });

  useEffect(() => setOpen(false), [pathname]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenu(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  const displayName =
    user?.player?.firstName ??
    user?.referee?.firstName ??
    user?.email?.split("@")[0] ??
    "Účet";

  return (
    <header className="sticky top-0 z-50 border-b border-bd bg-bg/85 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex shrink-0 items-center gap-2.5">
          <span className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-go text-[13px] font-black tracking-tight text-go">
            FSL
          </span>
          <span className="hidden text-[15px] font-bold tracking-tight text-wh sm:block">
            Floorball Stars Liga
          </span>
        </Link>

        <nav className="hidden flex-1 items-center gap-1 lg:flex">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={clsx(
                "rounded-lg px-3 py-2 text-[14px] font-medium transition-colors",
                isActive(n.href)
                  ? "bg-go-soft text-go"
                  : "text-mu hover:bg-c1 hover:text-wh",
              )}
            >
              {n.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
          <Link
            href="/hledat"
            aria-label="Hledat"
            className="rounded-lg p-2 text-mu transition-colors hover:bg-c1 hover:text-wh"
          >
            <Search size={19} />
          </Link>

          {user ? (
            <Link
              href="/oznameni"
              aria-label="Oznámení"
              className="relative rounded-lg p-2 text-mu transition-colors hover:bg-c1 hover:text-wh"
            >
              <Bell size={19} className={unread > 0 ? "text-go" : undefined} />
              {unread > 0 ? (
                <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red px-1 text-[9px] font-bold text-white">
                  {unread > 9 ? "9+" : unread}
                </span>
              ) : null}
            </Link>
          ) : null}

          {loading ? (
            <div className="h-9 w-20 animate-fsl-skeleton rounded-xl bg-c2" />
          ) : user ? (
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenu((v) => !v)}
                className="flex cursor-pointer items-center gap-2 rounded-xl border border-bd bg-c1 px-2.5 py-1.5 text-[13px] font-medium text-wh transition-colors hover:border-bd-strong"
              >
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-go text-[11px] font-bold text-bg">
                  {displayName[0]?.toUpperCase()}
                </span>
                <span className="hidden max-w-24 truncate sm:block">{displayName}</span>
                <ChevronDown size={14} className="text-mu" />
              </button>

              {menu ? (
                <div className="absolute right-0 top-full z-50 mt-2 w-56 animate-fsl-fade-in overflow-hidden rounded-xl border border-bd bg-c1 shadow-2xl">
                  <div className="border-b border-bd px-4 py-3">
                    <p className="truncate text-[13px] font-semibold text-wh">
                      {displayName}
                    </p>
                    <p className="truncate text-[11px] text-mu">{user.email}</p>
                  </div>
                  <MenuLink href="/muj-ucet" icon={<User size={16} />} onClick={() => setMenu(false)}>
                    Můj účet
                  </MenuLink>
                  {isSupervisor ? (
                    <MenuLink
                      href="/admin"
                      icon={<Shield size={16} />}
                      onClick={() => setMenu(false)}
                    >
                      Administrace
                    </MenuLink>
                  ) : null}
                  <MenuLink
                    href="/nastaveni"
                    icon={<Settings size={16} />}
                    onClick={() => setMenu(false)}
                  >
                    Nastavení
                  </MenuLink>
                  <button
                    onClick={async () => {
                      setMenu(false);
                      await logout();
                      router.push("/");
                    }}
                    className="flex w-full cursor-pointer items-center gap-2.5 px-4 py-2.5 text-left text-[14px] text-red transition-colors hover:bg-c2"
                  >
                    <LogOut size={16} />
                    Odhlásit se
                  </button>
                </div>
              ) : null}
            </div>
          ) : (
            <LinkButton href="/prihlaseni" size="sm">
              Přihlásit se
            </LinkButton>
          )}

          <button
            onClick={() => setOpen((v) => !v)}
            aria-label="Menu"
            className="rounded-lg p-2 text-mu transition-colors hover:bg-c1 hover:text-wh lg:hidden"
          >
            {open ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {open ? (
        <div className="border-t border-bd bg-c1 lg:hidden">
          <nav className="mx-auto grid max-w-7xl gap-1 px-4 py-3 sm:px-6">
            {NAV.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                className={clsx(
                  "rounded-lg px-3 py-2.5 text-[15px] font-medium transition-colors",
                  isActive(n.href) ? "bg-go-soft text-go" : "text-mu hover:text-wh",
                )}
              >
                {n.label}
              </Link>
            ))}
            <Link
              href="/pavouk"
              className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-mu hover:text-wh"
            >
              Play-off pavouk
            </Link>
            <Link
              href="/aplikace"
              className="rounded-lg px-3 py-2.5 text-[15px] font-medium text-mu hover:text-wh"
            >
              Mobilní aplikace
            </Link>
            {!user ? (
              <Button
                variant="gold"
                className="mt-2"
                onClick={() => router.push("/prihlaseni")}
              >
                Přihlásit se
              </Button>
            ) : null}
          </nav>
        </div>
      ) : null}
    </header>
  );
}

function MenuLink({
  href,
  icon,
  children,
  onClick,
}: {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="flex items-center gap-2.5 px-4 py-2.5 text-[14px] text-wh transition-colors hover:bg-c2"
    >
      <span className="text-mu">{icon}</span>
      {children}
    </Link>
  );
}
