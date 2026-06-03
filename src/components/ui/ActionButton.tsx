"use client";

import { Loader2 } from "lucide-react";
import { useState, type ButtonHTMLAttributes, type ReactNode } from "react";
import { toast } from "@/lib/toast/toastStore";

type Variant = "primary" | "secondary" | "ghost";

type Props = Omit<ButtonHTMLAttributes<HTMLButtonElement>, "onClick" | "disabled"> & {
  /** Sync or async work to run on click. Errors are caught and toasted. */
  onAction: () => unknown | Promise<unknown>;
  /** Visual variant — maps to .btn--primary/secondary/ghost. */
  variant?: Variant;
  /** Extra class names (e.g. "btn--lg start-btn"). */
  className?: string;
  /** Override the spinner-replaces-leading-icon behavior with a custom leading node. */
  leading?: ReactNode;
  /** Trailing node (e.g. an arrow icon). */
  trailing?: ReactNode;
  /** Children render as the label. */
  children: ReactNode;
  /** Externally disabled (e.g. preconditions not met). */
  disabled?: boolean;
  /** Toast on success — set `false` to suppress. */
  successToast?: { title: string; description?: string } | false;
  /** Toast while loading — set `false` to suppress. */
  loadingToast?: { title: string; description?: string } | false;
  /** Toast on error — set `false` to suppress (falls back to "Action failed"). */
  errorToast?: { title: string; description?: string } | false;
};

export function ActionButton({
  onAction,
  variant = "primary",
  className,
  leading,
  trailing,
  children,
  disabled,
  successToast,
  loadingToast,
  errorToast,
  type = "button",
  ...rest
}: Props) {
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy || disabled) return;
    setBusy(true);
    const toastId = loadingToast
      ? toast.loading(loadingToast.title, loadingToast.description)
      : null;
    try {
      await onAction();
      if (toastId && successToast) {
        toast.update(toastId, {
          variant: "success",
          title: successToast.title,
          description: successToast.description,
        });
      } else if (successToast) {
        toast.success(successToast.title, successToast.description);
      } else if (toastId) {
        toast.dismiss(toastId);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (toastId) {
        toast.update(toastId, {
          variant: "error",
          title: errorToast ? errorToast.title : "Something went wrong",
          description: errorToast ? errorToast.description ?? message : message,
        });
      } else if (errorToast) {
        toast.error(errorToast.title, errorToast.description ?? message);
      } else {
        toast.error("Something went wrong", message);
      }
    } finally {
      setBusy(false);
    }
  };

  const classes = ["btn", `btn--${variant}`, className].filter(Boolean).join(" ");

  return (
    <button
      type={type}
      className={classes}
      onClick={handleClick}
      aria-busy={busy}
      disabled={busy || disabled}
      {...rest}
    >
      {busy ? (
        <Loader2 aria-hidden className="animate-spin" />
      ) : (
        leading
      )}
      {children}
      {!busy && trailing}
    </button>
  );
}

export default ActionButton;
