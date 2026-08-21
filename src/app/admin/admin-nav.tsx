"use client";

import clsx from "clsx";
import {
  CalendarCog,
  CreditCard,
  Flag,
  LayoutDashboard,
  MessageSquare,
  Newspaper,
  Network,
  Shield,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/admin", label: "Dashboard", icon: <LayoutDashboard size={17} /> },
  { href: "/admin/tymy", label: "Týmy", icon: <Shield size={17} /> },
  { href: "/admin/zapasy", label: "Zápasy", icon: <CalendarCog size={17} /> },
  { href: "/admin/rozlosovani", label: "Rozlosování", icon: <Network size={17} /> },
  { href: "/admin/rozhodci", label: "Rozhodčí", icon: <Flag size={17} /> },
  { href: "/admin/platby", label: "Platby", icon: <CreditCard size={17} /> },
  { href: "/admin/aktuality", label: "Aktuality", icon: <Newspaper size={17} /> },
  { href: "/admin/zadosti", label: "Žádosti", icon: <MessageSquare size={17} /> },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="lg:w-56 lg:shrink-0">
      <p className="mb-3 hidden text-[11px] font-semibold uppercase tracking-[0.1em] text-pu lg:block">
        Administrace
      </p>
      <div className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col">
        {LINKS.map((l) => {
          const active =
            l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
          return (
            <Link
              key={l.href}
              href={l.href}
              className={clsx(
                "flex shrink-0 items-center gap-2.5 whitespace-nowrap rounded-xl px-3.5 py-2.5 text-[14px] font-medium transition-colors",
                active ? "bg-pu/20 text-pu" : "text-mu hover:bg-c1 hover:text-wh",
              )}
            >
              {l.icon}
              {l.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
