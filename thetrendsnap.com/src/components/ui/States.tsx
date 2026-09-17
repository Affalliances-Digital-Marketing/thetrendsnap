import { Link } from "react-router-dom";
import { AlertTriangle, Compass, RefreshCw } from "lucide-react";

export function ErrorState({
  title = "Something went wrong",
  message = "We couldn't load this content. Please try again.",
  onRetry,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-rose-50 text-rose-600 dark:bg-rose-500/10 dark:text-rose-400">
        <AlertTriangle className="h-6 w-6" aria-hidden="true" />
      </span>
      <h3 className="font-display text-lg font-bold text-ink-900 dark:text-white">{title}</h3>
      <p className="max-w-md text-sm text-ink-500 dark:text-ink-400">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="mt-2 inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
        >
          <RefreshCw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
      )}
    </div>
  );
}

export function EmptyState({
  title = "Nothing here yet",
  message = "New stories are published every day — check back soon.",
  actionLabel = "Browse latest",
  actionHref = "/latest",
}: {
  title?: string;
  message?: string;
  actionLabel?: string;
  actionHref?: string;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-12 text-center">
      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
        <Compass className="h-6 w-6" aria-hidden="true" />
      </span>
      <h3 className="font-display text-lg font-bold text-ink-900 dark:text-white">{title}</h3>
      <p className="max-w-md text-sm text-ink-500 dark:text-ink-400">{message}</p>
      <Link
        to={actionHref}
        className="mt-2 inline-flex items-center gap-2 rounded-full bg-brand-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700"
      >
        {actionLabel}
      </Link>
    </div>
  );
}
