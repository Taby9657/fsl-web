"use client";

import clsx from "clsx";
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

/* ---------------- Card ---------------- */

export function Card({
  className,
  children,
  ...rest
}: ComponentProps<"div">) {
  return (
    <div
      className={clsx(
        "rounded-xl border border-bd bg-c1/80 backdrop-blur-[2px]",
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}

export function CardBody({ className, children, ...rest }: ComponentProps<"div">) {
  return (
    <div className={clsx("p-4 sm:p-5", className)} {...rest}>
      {children}
    </div>
  );
}

/* ---------------- Section title ---------------- */

export function SectionTitle({
  children,
  action,
  className,
}: {
  children: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("mb-3 flex items-center justify-between gap-3", className)}>
      <h2 className="text-[13px] font-semibold label-caps uppercase text-mu">
        {children}
      </h2>
      {action}
    </div>
  );
}

export function PageTitle({
  title,
  subtitle,
  action,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-wh sm:text-[28px]">
          {title}
        </h1>
        {subtitle ? <p className="mt-1 text-sm text-mu">{subtitle}</p> : null}
      </div>
      {action}
    </div>
  );
}

/* ---------------- Button ---------------- */

type Variant = "gold" | "purple" | "ghost" | "outline" | "danger" | "success" | "subtle";
type Size = "sm" | "md" | "lg";

const VARIANTS: Record<Variant, string> = {
  gold: "bg-go text-bg hover:bg-[#d8b055] active:bg-[#bd9439] font-semibold",
  purple: "bg-pu text-white hover:bg-[#9d75f8] font-semibold",
  success: "bg-green text-[#052e12] hover:bg-[#38d16f] font-semibold",
  danger: "bg-red text-white hover:bg-[#f25c5c] font-semibold",
  outline:
    "border border-bd-strong text-go hover:bg-go-soft font-medium bg-transparent",
  ghost: "text-mu hover:text-wh hover:bg-c2 font-medium bg-transparent",
  subtle: "bg-c2 text-wh hover:bg-c3 font-medium border border-bd",
};

const SIZES: Record<Size, string> = {
  sm: "h-8 px-3 text-[13px] rounded-lg gap-1.5",
  md: "h-10 px-4 text-sm rounded-xl gap-2",
  lg: "h-12 px-5 text-[15px] rounded-xl gap-2",
};

export function Button({
  variant = "gold",
  size = "md",
  loading,
  className,
  children,
  disabled,
  ...rest
}: ComponentProps<"button"> & {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}) {
  return (
    <button
      className={clsx(
        "inline-flex cursor-pointer items-center justify-center whitespace-nowrap transition-colors",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-go",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={disabled || loading}
      {...rest}
    >
      {loading ? <Spinner size={16} className="shrink-0" /> : null}
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "gold",
  size = "md",
  className,
  children,
  ...rest
}: ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  return (
    <Link
      href={href}
      className={clsx(
        "inline-flex items-center justify-center whitespace-nowrap transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-go",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </Link>
  );
}

export function Spinner({
  size = 20,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    <svg
      className={clsx("animate-spin", className)}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        opacity="0.25"
      />
      <path
        d="M22 12a10 10 0 0 0-10-10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

/* ---------------- Chips (filtry) ---------------- */

export function Chip({
  active,
  accent = "gold",
  className,
  children,
  ...rest
}: ComponentProps<"button"> & {
  active?: boolean;
  accent?: "gold" | "purple";
}) {
  return (
    <button
      type="button"
      className={clsx(
        "shrink-0 cursor-pointer rounded-full border px-3.5 py-1.5 text-[13px] font-medium transition-colors",
        active
          ? accent === "gold"
            ? "border-go bg-go text-bg"
            : "border-pu bg-pu text-white"
          : "border-bd bg-c1 text-mu hover:border-bd-strong hover:text-wh",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function ChipRow({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1",
        className,
      )}
    >
      {children}
    </div>
  );
}

/* ---------------- Badge ---------------- */

export function Badge({
  color = "#C9A140",
  children,
  className,
  icon,
}: {
  color?: string;
  children: ReactNode;
  className?: string;
  icon?: ReactNode;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide",
        className,
      )}
      style={{
        color,
        borderColor: `${color}55`,
        backgroundColor: `${color}22`,
      }}
    >
      {icon}
      {children}
    </span>
  );
}

/* ---------------- Empty state ---------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-bd px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? <div className="mb-1 text-di">{icon}</div> : null}
      <p className="text-[15px] font-semibold text-wh">{title}</p>
      {description ? (
        <p className="max-w-sm text-[13px] leading-5 text-mu">{description}</p>
      ) : null}
      {action ? <div className="mt-3">{action}</div> : null}
    </div>
  );
}

/* ---------------- Formulářové prvky ---------------- */

export function Label({
  children,
  required,
  className,
}: {
  children: ReactNode;
  required?: boolean;
  className?: string;
}) {
  return (
    <label
      className={clsx(
        "mb-1.5 block text-[11px] font-semibold label-caps uppercase text-mu",
        className,
      )}
    >
      {children}
      {required ? <span className="ml-0.5 text-go">*</span> : null}
    </label>
  );
}

const fieldBase =
  "w-full rounded-xl border border-bd bg-c2 px-3.5 py-2.5 text-[15px] text-wh outline-none transition-colors placeholder:text-di focus:border-go/60 disabled:opacity-50";

export function Input({
  className,
  error,
  ...rest
}: ComponentProps<"input"> & { error?: string | null }) {
  return (
    <>
      <input
        className={clsx(fieldBase, error && "border-red/70", className)}
        {...rest}
      />
      {error ? <p className="mt-1 text-[12px] text-red">{error}</p> : null}
    </>
  );
}

export function Textarea({
  className,
  error,
  ...rest
}: ComponentProps<"textarea"> & { error?: string | null }) {
  return (
    <>
      <textarea
        className={clsx(fieldBase, "min-h-[100px] resize-y leading-6", error && "border-red/70", className)}
        {...rest}
      />
      {error ? <p className="mt-1 text-[12px] text-red">{error}</p> : null}
    </>
  );
}

export function Select({ className, children, ...rest }: ComponentProps<"select">) {
  return (
    <select className={clsx(fieldBase, "cursor-pointer", className)} {...rest}>
      {children}
    </select>
  );
}

export function Field({
  label,
  required,
  error,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  error?: string | null;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label required={required}>{label}</Label>
      {children}
      {error ? <p className="mt-1 text-[12px] text-red">{error}</p> : null}
    </div>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  accent = "gold",
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  description?: string;
  accent?: "gold" | "red";
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex w-full cursor-pointer items-center justify-between gap-4 rounded-xl border border-bd bg-c1 px-4 py-3 text-left transition-colors hover:border-bd-strong"
    >
      <span>
        <span className="block text-[15px] font-medium text-wh">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-[12px] text-mu">{description}</span>
        ) : null}
      </span>
      <span
        className={clsx(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? (accent === "gold" ? "bg-go" : "bg-red") : "bg-c3",
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all",
            checked ? "left-[22px]" : "left-0.5",
          )}
        />
      </span>
    </button>
  );
}
