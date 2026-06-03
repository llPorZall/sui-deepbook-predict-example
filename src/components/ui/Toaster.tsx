"use client";

import { useEffect } from "react";
import {
  CircleCheckBig,
  CircleX,
  Info as InfoIcon,
  Loader2,
  X,
} from "lucide-react";
import { useToastStore, type Toast } from "@/lib/toast/toastStore";

const ICONS = {
  success: CircleCheckBig,
  error: CircleX,
  info: InfoIcon,
  loading: Loader2,
} as const;

function ToastItem({ toast }: { toast: Toast }) {
  const dismiss = useToastStore((s) => s.dismiss);
  const Icon = ICONS[toast.variant];

  useEffect(() => {
    if (!toast.timeoutMs || toast.timeoutMs <= 0) return;
    const id = window.setTimeout(() => dismiss(toast.id), toast.timeoutMs);
    return () => window.clearTimeout(id);
  }, [toast.id, toast.timeoutMs, dismiss]);

  return (
    <div className={`toast toast--${toast.variant}`} role="status">
      <span className="toast-ico" aria-hidden>
        <Icon className={toast.variant === "loading" ? "animate-spin" : undefined} />
      </span>
      <div className="toast-body">
        <p className="toast-title">{toast.title}</p>
        {toast.description && <p className="toast-desc">{toast.description}</p>}
      </div>
      <button
        type="button"
        className="toast-close"
        aria-label="Dismiss"
        onClick={() => dismiss(toast.id)}
      >
        <X aria-hidden />
      </button>
    </div>
  );
}

export function Toaster() {
  const toasts = useToastStore((s) => s.toasts);
  if (toasts.length === 0) return null;
  return (
    <div className="toast-stack" role="region" aria-label="Notifications">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} />
      ))}
    </div>
  );
}

export default Toaster;
