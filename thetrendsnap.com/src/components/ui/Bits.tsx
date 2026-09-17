import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import type { ReactNode } from "react";
import { accentFor, cn } from "@/lib/utils";

/* ---------------- category chip ---------------- */

export function CategoryChip({
  name,
  href,
  className,
  variant = "soft",
}: {
  name: string;
  href?: string;
  className?: string;
  variant?: "soft" | "plain" | "solid";
}) {
  const accent = accentFor(name);

  const base = cn(
    "chip",
    variant === "soft" && cn(accent.bg, accent.text),
    variant === "plain" && cn("px-0", accent.text),
    variant === "solid" && "bg-white/15 text-white backdrop-blur",
    className
  );

  if (!href) return <span className={base}>{name}</span>;

  return (
    <Link to={href} className={cn(base, "transition-opacity hover:opacity-80")}>
      {name}
    </Link>
  );
}

/* ---------------- panel header ---------------- */

export function PanelHeader({
  icon,
  title,
  action,
  actionHref,
  className,
}: {
  icon?: ReactNode;
  title: string;
  action?: string;
  actionHref?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-b border-ink-100 px-4 py-3.5 dark:border-ink-800",
        className
      )}
    >
      <h2 className="panel-title">
        {icon}
        <span>{title}</span>
      </h2>
      {action && actionHref && (
        <Link to={actionHref} className="link-action">
          {action}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

/* ---------------- section header (page level) ---------------- */

export function SectionHeader({
  title,
  subtitle,
  action,
  actionHref,
  className,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  actionHref?: string;
  className?: string;
}) {
  return (
    <div className={cn("section-rule", className)}>
      <div className="min-w-0">
        <h2 className="section-title">{title}</h2>
        {subtitle && <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{subtitle}</p>}
      </div>
      {action && actionHref && (
        <Link to={actionHref} className="link-action text-sm">
          {action}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}
    </div>
  );
}

/* ---------------- pagination ---------------- */

export function Pagination({
  page,
  pages,
  onChange,
}: {
  page: number;
  pages: number;
  onChange: (page: number) => void;
}) {
  if (pages <= 1) return null;

  const window_ = 1;
  const items: Array<number | "gap"> = [];

  for (let i = 1; i <= pages; i += 1) {
    const inWindow = Math.abs(i - page) <= window_;
    if (i === 1 || i === pages || inWindow) {
      items.push(i);
    } else if (items[items.length - 1] !== "gap") {
      items.push("gap");
    }
  }

  const buttonBase = "btn h-10 min-w-10 border px-3 text-sm";

  return (
    <nav className="mt-8 flex flex-wrap items-center justify-center gap-2" aria-label="Pagination">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
        className={cn(
          buttonBase,
          "border-ink-200 text-ink-600 hover:border-brand-400 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-ink-700 dark:text-ink-300"
        )}
      >
        Prev
      </button>

      {items.map((item, index) =>
        item === "gap" ? (
          <span key={`gap-${index}`} className="px-1 text-ink-400">
            …
          </span>
        ) : (
          <button
            key={item}
            type="button"
            onClick={() => onChange(item)}
            aria-current={item === page ? "page" : undefined}
            className={cn(
              buttonBase,
              item === page
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-ink-200 text-ink-600 hover:border-brand-400 hover:text-brand-600 dark:border-ink-700 dark:text-ink-300"
            )}
          >
            {item}
          </button>
        )
      )}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page >= pages}
        className={cn(
          buttonBase,
          "border-ink-200 text-ink-600 hover:border-brand-400 hover:text-brand-600 disabled:cursor-not-allowed disabled:opacity-40 dark:border-ink-700 dark:text-ink-300"
        )}
      >
        Next
      </button>
    </nav>
  );
}
