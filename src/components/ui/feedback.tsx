"use client";

import clsx from "clsx";
import { CloudOff, RefreshCw, X } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button, Card } from "./primitives";

/* ---------------- LIVE badge ---------------- */

export function LiveBadge({ size = "sm" }: { size?: "sm" | "md" }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border border-red/40 bg-red/15 font-bold uppercase tracking-[0.08em] text-red",
        size === "md" ? "px-2.5 py-1 text-[12px]" : "px-2 py-0.5 text-[10px]",
      )}
    >
      <span
        className={clsx(
          "animate-fsl-pulse rounded-full bg-red",
          size === "md" ? "h-2 w-2" : "h-1.5 w-1.5",
        )}
      />
      LIVE
    </span>
  );
}

/* ---------------- Skeletony ---------------- */

export function SkeletonBlock({
  className,
  style,
}: {
  className?: string;
  style?: React.CSSProperties;
}) {
  return (
    <div
      className={clsx("animate-fsl-skeleton rounded-lg bg-c2", className)}
      style={style}
    />
  );
}

export function SkeletonMatchCard() {
  return (
    <Card className="p-4">
      <SkeletonBlock className="mb-3 h-3 w-32" />
      <div className="flex items-center gap-3">
        <SkeletonBlock className="h-4 flex-1" />
        <SkeletonBlock className="h-6 w-14" />
        <SkeletonBlock className="h-4 flex-1" />
      </div>
    </Card>
  );
}

export function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 border-b border-bd px-4 py-3 last:border-0">
      <SkeletonBlock className="h-4 w-6" />
      <SkeletonBlock className="h-4 flex-1" />
      <SkeletonBlock className="h-4 w-10" />
    </div>
  );
}

export function SkeletonList({ rows = 8 }: { rows?: number }) {
  return (
    <Card className="overflow-hidden">
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonRow key={i} />
      ))}
    </Card>
  );
}

export function SkeletonHero() {
  return (
    <Card className="flex items-center gap-4 p-5">
      <SkeletonBlock className="h-14 w-14 rounded-full" />
      <div className="flex-1 space-y-2">
        <SkeletonBlock className="h-4 w-40" />
        <SkeletonBlock className="h-3 w-24" />
      </div>
    </Card>
  );
}

export function SkeletonCards({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonMatchCard key={i} />
      ))}
    </div>
  );
}

/* ---------------- Chybový stav ---------------- */

export function ErrorView({
  message = "Nepodařilo se načíst data.",
  onRetry,
  className,
}: {
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-bd bg-c1 px-6 py-14 text-center",
        className,
      )}
    >
      <CloudOff size={44} className="text-di" />
      <p className="text-[15px] text-mu">{message}</p>
      {onRetry ? (
        <Button variant="outline" size="sm" onClick={onRetry}>
          <RefreshCw size={14} />
          Zkusit znovu
        </Button>
      ) : null}
    </div>
  );
}

/* ---------------- Modal / bottom sheet ---------------- */

export function Modal({
  open,
  onClose,
  title,
  children,
  footer,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  size?: "sm" | "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  const width =
    size === "sm" ? "max-w-sm" : size === "lg" ? "max-w-3xl" : "max-w-lg";

  return createPortal(
    <div className="fixed inset-0 z-[100] flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        role="dialog"
        aria-modal="true"
        className={clsx(
          "relative z-10 flex max-h-[92vh] w-full flex-col rounded-t-2xl border border-bd bg-c1 shadow-2xl sm:rounded-2xl",
          width,
        )}
      >
        <div className="mx-auto mt-2.5 h-1 w-10 rounded-full bg-c3 sm:hidden" />
        {title ? (
          <div className="flex items-center justify-between gap-4 border-b border-bd px-5 py-4">
            <h3 className="text-[17px] font-semibold text-wh">{title}</h3>
            <button
              onClick={onClose}
              aria-label="Zavřít"
              className="cursor-pointer rounded-lg p-1 text-mu transition-colors hover:bg-c2 hover:text-wh"
            >
              <X size={20} />
            </button>
          </div>
        ) : null}
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? (
          <div className="border-t border-bd px-5 py-4">{footer}</div>
        ) : null}
      </div>
    </div>,
    document.body,
  );
}

/* ---------------- Potvrzovací dialog ---------------- */

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Potvrdit",
  cancelLabel = "Zrušit",
  destructive,
  loading,
  onConfirm,
  onCancel,
  extraAction,
}: {
  open: boolean;
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
  extraAction?: { label: string; onClick: () => void };
}) {
  return (
    <Modal open={open} onClose={onCancel} title={title} size="sm">
      {message ? (
        <div className="whitespace-pre-line text-[14px] leading-6 text-mu">
          {message}
        </div>
      ) : null}
      <div className="mt-5 flex flex-col gap-2">
        <Button
          variant={destructive ? "danger" : "gold"}
          onClick={onConfirm}
          loading={loading}
        >
          {confirmLabel}
        </Button>
        {extraAction ? (
          <Button variant="subtle" onClick={extraAction.onClick} disabled={loading}>
            {extraAction.label}
          </Button>
        ) : null}
        <Button variant="ghost" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
      </div>
    </Modal>
  );
}
