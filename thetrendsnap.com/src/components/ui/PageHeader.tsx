import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  eyebrow,
  title,
  description,
  breadcrumbs,
  children,
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  breadcrumbs?: Array<{ label: string; to?: string }>;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "border-b border-ink-200 bg-gradient-to-br from-ink-50 to-white py-8 dark:border-ink-800 dark:from-ink-900 dark:to-[#0b1120]",
        className
      )}
    >
      <div className="container">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1 text-xs text-ink-500 dark:text-ink-400">
            <Link to="/" className="hover:text-brand-600">Home</Link>
            {breadcrumbs.map((crumb) => (
              <span key={crumb.label} className="flex items-center gap-1">
                <ChevronRight className="h-3 w-3" aria-hidden="true" />
                {crumb.to ? (
                  <Link to={crumb.to} className="hover:text-brand-600">{crumb.label}</Link>
                ) : (
                  <span className="text-ink-400">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        )}

        {eyebrow && (
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">
            {eyebrow}
          </p>
        )}

        <h1 className="mt-1.5 font-display text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl dark:text-white">
          {title}
        </h1>

        {description && (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-600 dark:text-ink-300">
            {description}
          </p>
        )}

        {children}
      </div>
    </header>
  );
}
