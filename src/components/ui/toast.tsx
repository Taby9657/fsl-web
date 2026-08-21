"use client";

import clsx from "clsx";
import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useEffect } from "react";
import { create } from "zustand";

type ToastKind = "success" | "error" | "info";

interface Toast {
  id: number;
  kind: ToastKind;
  title: string;
  message?: string;
}

interface ToastState {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => void;
  dismiss: (id: number) => void;
}

let seq = 0;

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  push: (t) => {
    const id = ++seq;
    set((s) => ({ toasts: [...s.toasts, { ...t, id }] }));
    setTimeout(() => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })), 5200);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((x) => x.id !== id) })),
}));

export const toast = {
  success: (title: string, message?: string) =>
    useToastStore.getState().push({ kind: "success", title, message }),
  error: (title: string, message?: string) =>
    useToastStore.getState().push({ kind: "error", title, message }),
  info: (title: string, message?: string) =>
    useToastStore.getState().push({ kind: "info", title, message }),
};

const ICONS = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
};

const COLORS: Record<ToastKind, string> = {
  success: "#22C55E",
  error: "#EF4444",
  info: "#C9A140",
};

export function ToastViewport() {
  const toasts = useToastStore((s) => s.toasts);
  const dismiss = useToastStore((s) => s.dismiss);

  useEffect(() => {
    /* noop – zajišťuje re-render při hydrataci */
  }, []);

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-[200] flex flex-col items-center gap-2 p-4 sm:bottom-auto sm:right-0 sm:top-0 sm:items-end">
      {toasts.map((t) => {
        const Icon = ICONS[t.kind];
        const color = COLORS[t.kind];
        return (
          <div
            key={t.id}
            className={clsx(
              "pointer-events-auto flex w-full max-w-sm animate-fsl-fade-in items-start gap-3 rounded-xl border bg-c1 p-3.5 shadow-2xl",
            )}
            style={{ borderColor: `${color}55` }}
          >
            <Icon size={20} style={{ color }} className="mt-0.5 shrink-0" />
            <div className="min-w-0 flex-1">
              <p className="text-[14px] font-semibold text-wh">{t.title}</p>
              {t.message ? (
                <p className="mt-0.5 whitespace-pre-line text-[13px] leading-5 text-mu">
                  {t.message}
                </p>
              ) : null}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              aria-label="Zavřít"
              className="cursor-pointer rounded p-0.5 text-di transition-colors hover:text-wh"
            >
              <X size={16} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
