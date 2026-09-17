import { useEffect } from "react";
import type { ReactNode } from "react";
import { Loader2, X } from "lucide-react";

export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

/* ---------------- form primitives ---------------- */

export function Field({
  label,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className}>
      <label className="adm-label">
        {label}
        {required && <span className="ml-1 text-rose-500">*</span>}
      </label>
      {children}
      {hint && <p className="mt-1 text-[11px] text-ink-400">{hint}</p>}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-ink-200 p-2.5 transition-colors hover:border-brand-300 dark:border-ink-700">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="mt-0.5 h-4 w-4 shrink-0 accent-brand-600"
      />
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-ink-800 dark:text-ink-100">
          {label}
        </span>
        {hint && <span className="mt-0.5 block text-[11px] text-ink-400">{hint}</span>}
      </span>
    </label>
  );
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("adm-card p-4 sm:p-5", className)}>
      <header className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="font-display text-[15px] font-bold text-ink-900 dark:text-white">
            {title}
          </h2>
          {description && (
            <p className="mt-0.5 text-[12px] text-ink-500 dark:text-ink-400">{description}</p>
          )}
        </div>
        {actions}
      </header>
      {children}
    </section>
  );
}

/* ---------------- feedback ---------------- */

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={cn("h-4 w-4 animate-spin", className)} aria-hidden="true" />;
}

export function LoadingBlock({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-ink-500">
      <Spinner />
      {label}
    </div>
  );
}

export function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
      <h3 className="font-display text-base font-bold text-ink-900 dark:text-white">{title}</h3>
      {message && <p className="max-w-md text-sm text-ink-500 dark:text-ink-400">{message}</p>}
      {action}
    </div>
  );
}

export function ErrorBlock({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  const message = error instanceof Error ? error.message : "Something went wrong";
  return (
    <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-300">
      <p className="font-semibold">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="mt-2 text-xs font-bold underline">
          Try again
        </button>
      )}
    </div>
  );
}

export function StatusBadge({ status }: { status?: string }) {
  const tone =
    status === "published"
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
      : status === "draft"
        ? "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
        : status === "scheduled"
          ? "bg-sky-50 text-sky-700 dark:bg-sky-500/10 dark:text-sky-300"
          : status === "trash"
            ? "bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300"
            : "bg-ink-100 text-ink-600 dark:bg-ink-800 dark:text-ink-300";

  return <span className={cn("adm-chip", tone)}>{status || "unknown"}</span>;
}

/* ---------------- overlays ---------------- */

export function Modal({
  open,
  title,
  onClose,
  children,
  footer,
  width = "max-w-2xl",
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[90] flex items-start justify-center overflow-y-auto p-4 sm:p-8">
      <div className="fixed inset-0 bg-ink-900/50 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn("relative z-10 w-full rounded-2xl bg-white shadow-pop dark:bg-ink-900", width)}
      >
        <header className="flex items-center justify-between gap-3 border-b border-ink-100 px-5 py-3.5 dark:border-ink-800">
          <h2 className="font-display text-[15px] font-bold text-ink-900 dark:text-white">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-ink-400 transition-colors hover:bg-ink-100 hover:text-ink-700 dark:hover:bg-ink-800"
            aria-label="Close"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="max-h-[70vh] overflow-y-auto px-5 py-4">{children}</div>

        {footer && (
          <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-ink-100 px-5 py-3.5 dark:border-ink-800">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Delete",
  destructive = true,
  busy = false,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  return (
    <Modal
      open={open}
      title={title}
      onClose={onCancel}
      width="max-w-md"
      footer={
        <>
          <button type="button" className="adm-btn-ghost" onClick={onCancel} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={destructive ? "adm-btn-danger" : "adm-btn-primary"}
            onClick={onConfirm}
            disabled={busy}
          >
            {busy && <Spinner />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <p className="text-sm leading-relaxed text-ink-600 dark:text-ink-300">{message}</p>
    </Modal>
  );
}

/* ---------------- pagination ---------------- */

export function Pagination({
  page,
  pages,
  total,
  onChange,
}: {
  page: number;
  pages: number;
  total?: number;
  onChange: (page: number) => void;
}) {
  if (pages <= 1) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-4">
      {typeof total === "number" && (
        <p className="text-xs text-ink-500">
          Page {page} of {pages} · {total} records
        </p>
      )}
      <div className="ml-auto flex items-center gap-2">
        <button
          type="button"
          className="adm-btn-ghost adm-btn-sm"
          onClick={() => onChange(page - 1)}
          disabled={page <= 1}
        >
          Prev
        </button>
        <button
          type="button"
          className="adm-btn-ghost adm-btn-sm"
          onClick={() => onChange(page + 1)}
          disabled={page >= pages}
        >
          Next
        </button>
      </div>
    </div>
  );
}

/* ---------------- misc helpers ---------------- */

export function formatDate(value?: string | Date | null): string {
  if (!value) return "—";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** `YYYY-MM-DDTHH:mm` for <input type="datetime-local">. */
export function toLocalInput(value?: string | null): string {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

export function formatBytes(bytes?: number): string {
  if (!bytes) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unit = 0;
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024;
    unit += 1;
  }
  return `${value.toFixed(value >= 10 || unit === 0 ? 0 : 1)} ${units[unit]}`;
}
