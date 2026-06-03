"use client";

import { create } from "zustand";

export type ToastVariant = "success" | "error" | "info" | "loading";

export type Toast = {
  id: string;
  variant: ToastVariant;
  title: string;
  description?: string;
  /** Auto-dismiss after this many ms. 0 disables auto-dismiss (default for "loading"). */
  timeoutMs?: number;
};

type ToastInput = Omit<Toast, "id">;

type ToastStoreState = {
  toasts: Toast[];
  push: (toast: ToastInput) => string;
  update: (id: string, patch: Partial<ToastInput>) => void;
  dismiss: (id: string) => void;
  clear: () => void;
};

const DEFAULT_TIMEOUT_MS = 4000;

function nextId(): string {
  return `t_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export const useToastStore = create<ToastStoreState>((set) => ({
  toasts: [],
  push: (toast) => {
    const id = nextId();
    set((state) => ({ toasts: [...state.toasts, { ...toast, id }] }));
    return id;
  },
  update: (id, patch) =>
    set((state) => ({
      toasts: state.toasts.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    })),
  dismiss: (id) =>
    set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) })),
  clear: () => set({ toasts: [] }),
}));

export const toast = {
  success(title: string, description?: string) {
    return useToastStore
      .getState()
      .push({ variant: "success", title, description, timeoutMs: DEFAULT_TIMEOUT_MS });
  },
  error(title: string, description?: string) {
    return useToastStore
      .getState()
      .push({ variant: "error", title, description, timeoutMs: 6000 });
  },
  info(title: string, description?: string) {
    return useToastStore
      .getState()
      .push({ variant: "info", title, description, timeoutMs: DEFAULT_TIMEOUT_MS });
  },
  loading(title: string, description?: string) {
    return useToastStore
      .getState()
      .push({ variant: "loading", title, description, timeoutMs: 0 });
  },
  update(id: string, patch: Partial<ToastInput>) {
    useToastStore.getState().update(id, patch);
    if (patch.variant && patch.variant !== "loading" && patch.timeoutMs === undefined) {
      const ms = patch.variant === "error" ? 6000 : DEFAULT_TIMEOUT_MS;
      useToastStore.getState().update(id, { timeoutMs: ms });
    }
  },
  dismiss(id: string) {
    useToastStore.getState().dismiss(id);
  },
};
