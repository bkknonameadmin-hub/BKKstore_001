"use client";
import { create } from "zustand";

export type ToastKind = "info" | "success" | "error" | "warning";

export type Toast = {
  id: string;
  kind: ToastKind;
  message: string;
  href?: string;
  hrefLabel?: string;
};

type State = {
  toasts: Toast[];
  push: (t: Omit<Toast, "id">) => void;
  remove: (id: string) => void;
};

export const useToast = create<State>((set, get) => ({
  toasts: [],
  push: (t) => {
    const id = Math.random().toString(36).slice(2);
    set({ toasts: [...get().toasts, { ...t, id }] });
    setTimeout(() => get().remove(id), 3500);
  },
  remove: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
}));

// 편의 헬퍼
export const toast = {
  info:    (message: string, opts?: Partial<Toast>) => useToast.getState().push({ kind: "info", message, ...opts }),
  success: (message: string, opts?: Partial<Toast>) => useToast.getState().push({ kind: "success", message, ...opts }),
  error:   (message: string, opts?: Partial<Toast>) => useToast.getState().push({ kind: "error", message, ...opts }),
  warning: (message: string, opts?: Partial<Toast>) => useToast.getState().push({ kind: "warning", message, ...opts }),
};
