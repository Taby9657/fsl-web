"use client";

import clsx from "clsx";
import { Search, Star, User, X } from "lucide-react";
import Image from "next/image";
import type { ReactNode } from "react";
import { alpha, initials } from "@/lib/format";

/* ---------------- Týmový odznak ---------------- */

export function TeamBadge({
  abbr,
  color,
  logoUrl,
  size = 44,
  className,
}: {
  abbr?: string | null;
  color?: string | null;
  logoUrl?: string | null;
  size?: number;
  className?: string;
}) {
  const c = color || "#C9A140";
  if (logoUrl) {
    return (
      <span
        className={clsx("relative shrink-0 overflow-hidden rounded-full border", className)}
        style={{ width: size, height: size, borderColor: alpha(c, 0.5) }}
      >
        <Image src={logoUrl} alt={abbr ?? ""} fill sizes={`${size}px`} className="object-cover" />
      </span>
    );
  }
  return (
    <span
      className={clsx(
        "flex shrink-0 items-center justify-center rounded-full font-black text-white",
        className,
      )}
      style={{
        width: size,
        height: size,
        backgroundColor: c,
        fontSize: Math.max(10, size * 0.34),
      }}
    >
      {abbr ?? "?"}
    </span>
  );
}

export function TeamDot({ color, size = 8 }: { color?: string | null; size?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full"
      style={{ width: size, height: size, backgroundColor: color || "#C9A140" }}
    />
  );
}

/* ---------------- Avatar ---------------- */

export function Avatar({
  photoUrl,
  firstName,
  lastName,
  jersey,
  size = 44,
  ring = true,
  className,
}: {
  photoUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  jersey?: number | null;
  size?: number;
  ring?: boolean;
  className?: string;
}) {
  const style = { width: size, height: size };
  if (photoUrl) {
    return (
      <span
        className={clsx(
          "relative shrink-0 overflow-hidden rounded-full",
          ring && "ring-2 ring-go/60",
          className,
        )}
        style={style}
      >
        <Image src={photoUrl} alt="" fill sizes={`${size}px`} className="object-cover" />
      </span>
    );
  }
  const label =
    jersey != null ? String(jersey) : firstName || lastName ? initials(firstName, lastName) : null;
  return (
    <span
      className={clsx(
        "flex shrink-0 items-center justify-center rounded-full bg-c2 font-bold text-go",
        ring && "ring-2 ring-go/40",
        className,
      )}
      style={{ ...style, fontSize: Math.max(11, size * 0.34) }}
    >
      {label ?? <User size={size * 0.5} />}
    </span>
  );
}

/* ---------------- Statistiky ---------------- */

export function StatBox({
  value,
  label,
  icon,
  color = "#C9A140",
}: {
  value: ReactNode;
  label: string;
  icon?: ReactNode;
  color?: string;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-1 px-2 py-3 text-center">
      {icon ? <span style={{ color }}>{icon}</span> : null}
      <span className="tabular text-xl font-black" style={{ color }}>
        {value}
      </span>
      <span className="text-[11px] font-medium text-mu">{label}</span>
    </div>
  );
}

export function StatStrip({ children }: { children: ReactNode }) {
  return (
    <div className="flex divide-x divide-bd rounded-xl border border-bd bg-c1">
      {children}
    </div>
  );
}

/* ---------------- Hvězdičky ---------------- */

export function StarRow({ value, size = 14 }: { value: number; size?: number }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = value >= i;
        const half = !filled && value >= i - 0.5;
        return (
          <Star
            key={i}
            size={size}
            className={filled || half ? "text-go" : "text-di"}
            fill={filled ? "currentColor" : half ? "currentColor" : "none"}
            fillOpacity={half ? 0.45 : 1}
          />
        );
      })}
    </span>
  );
}

export function StarPicker({
  value,
  onChange,
  size = 30,
  disabled,
}: {
  value: number;
  onChange: (v: number) => void;
  size?: number;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <button
          key={i}
          type="button"
          disabled={disabled}
          onClick={() => onChange(i)}
          aria-label={`${i} z 5`}
          className="cursor-pointer transition-transform hover:scale-110 disabled:cursor-not-allowed"
        >
          <Star
            size={size}
            className={value >= i ? "text-go" : "text-di"}
            fill={value >= i ? "currentColor" : "none"}
          />
        </button>
      ))}
    </div>
  );
}

/* ---------------- Taby ---------------- */

export function Tabs<T extends string>({
  tabs,
  value,
  onChange,
  accent = "gold",
  className,
}: {
  tabs: { id: T; label: string; count?: number }[];
  value: T;
  onChange: (id: T) => void;
  accent?: "gold" | "purple";
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "no-scrollbar flex gap-1 overflow-x-auto rounded-xl border border-bd bg-c1 p-1",
        className,
      )}
    >
      {tabs.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onChange(t.id)}
          className={clsx(
            "flex-1 shrink-0 cursor-pointer whitespace-nowrap rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors",
            value === t.id
              ? accent === "gold"
                ? "bg-go text-bg"
                : "bg-pu text-white"
              : "text-mu hover:bg-c2 hover:text-wh",
          )}
        >
          {t.label}
          {t.count != null ? (
            <span className="ml-1.5 opacity-70">({t.count})</span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

/* ---------------- Vyhledávací pole ---------------- */

export function SearchInput({
  value,
  onChange,
  placeholder = "Hledat…",
  autoFocus,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex items-center gap-2.5 rounded-xl border border-bd bg-c1 px-3.5 py-2.5",
        className,
      )}
    >
      <Search size={18} className="shrink-0 text-di" />
      <input
        value={value}
        autoFocus={autoFocus}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="min-w-0 flex-1 bg-transparent text-[15px] text-wh outline-none placeholder:text-di"
      />
      {value ? (
        <button
          onClick={() => onChange("")}
          aria-label="Vymazat"
          className="cursor-pointer text-di transition-colors hover:text-wh"
        >
          <X size={16} />
        </button>
      ) : null}
    </div>
  );
}
