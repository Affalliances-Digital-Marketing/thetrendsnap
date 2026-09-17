import { useEffect, useRef, useState } from "react";
import { Link, NavLink } from "react-router-dom";
import { ArrowRight, Clock } from "lucide-react";
import type { Category } from "@/types/api";
import { useArticles } from "@/hooks/useContent";
import { SmartImage } from "@/components/ui/SmartImage";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  articleHref,
  articleImage,
  cn,
  formatDate,
  readTimeOf,
} from "@/lib/utils";

const OPEN_DELAY = 110;
const CLOSE_DELAY = 160;

/**
 * A nav category that reveals its latest stories on hover or keyboard focus.
 * Articles are fetched only once the pointer rests on the item, then cached by
 * react-query, so the menu costs nothing until it is actually used.
 */
const PANEL_WIDTH = 560;

export function CategoryFlyout({ category }: { category: Category }) {
  const [open, setOpen] = useState(false);
  const [primed, setPrimed] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const anchorRef = useRef<HTMLDivElement | null>(null);
  const openTimer = useRef<number | undefined>(undefined);
  const closeTimer = useRef<number | undefined>(undefined);

  const { data, isLoading } = useArticles(
    { category: category.slug, limit: 4, sort: "latest" },
    primed
  );

  const articles = data?.data ?? [];

  useEffect(
    () => () => {
      window.clearTimeout(openTimer.current);
      window.clearTimeout(closeTimer.current);
    },
    []
  );

  /**
   * The rail scrolls horizontally, so an absolutely positioned panel would be
   * clipped by it. The panel is fixed instead and anchored to the item's
   * on-screen box, clamped to stay inside the viewport.
   */
  const place = () => {
    const rect = anchorRef.current?.getBoundingClientRect();
    if (!rect) return;
    const maxLeft = window.innerWidth - PANEL_WIDTH - 12;
    setCoords({ top: rect.bottom + 6, left: Math.max(12, Math.min(rect.left, maxLeft)) });
  };

  const scheduleOpen = () => {
    window.clearTimeout(closeTimer.current);
    setPrimed(true);
    place();
    openTimer.current = window.setTimeout(() => {
      place();
      setOpen(true);
    }, OPEN_DELAY);
  };

  const scheduleClose = () => {
    window.clearTimeout(openTimer.current);
    closeTimer.current = window.setTimeout(() => setOpen(false), CLOSE_DELAY);
  };

  return (
    <div
      ref={anchorRef}
      className="shrink-0"
      onMouseEnter={scheduleOpen}
      onMouseLeave={scheduleClose}
      onFocus={scheduleOpen}
      onBlur={scheduleClose}
      onKeyDown={(event) => {
        if (event.key === "Escape") setOpen(false);
      }}
    >
      <NavLink
        to={`/category/${category.slug}`}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-[13px] font-bold transition-all duration-150",
            isActive
              ? "border-brand-600 bg-brand-600 text-white shadow-[0_6px_14px_-8px_rgba(79,70,229,.9)]"
              : open
                ? "border-brand-300 bg-brand-50 text-brand-700 dark:border-brand-500/40 dark:bg-brand-500/10 dark:text-brand-300"
                : "border-transparent bg-white text-ink-600 hover:border-brand-200 hover:bg-brand-50 hover:text-brand-700 dark:bg-ink-800/60 dark:text-ink-300 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
          )
        }
      >
        {({ isActive }) => (
          <>
            {category.shortLabel || category.name}
            {typeof category.articleCount === "number" && category.articleCount > 0 && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-px text-xs font-bold",
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-ink-100 text-ink-500 dark:bg-ink-700 dark:text-ink-300"
                )}
              >
                {category.articleCount}
              </span>
            )}
          </>
        )}
      </NavLink>

      {open && (
        <div
          className="fixed z-[60] hidden overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-pop lg:block dark:border-ink-700 dark:bg-ink-900"
          style={{ top: coords.top, left: coords.left, width: PANEL_WIDTH }}
          onMouseEnter={scheduleOpen}
          onMouseLeave={scheduleClose}
          role="menu"
        >
          <div className="flex items-center justify-between gap-3 border-b border-ink-100 bg-ink-50/70 px-4 py-2.5 dark:border-ink-800 dark:bg-ink-800/50">
            <div className="min-w-0">
              <p className="font-display text-[13px] font-bold text-ink-900 dark:text-white">
                {category.name}
              </p>
              <p className="clamp-1 text-xs text-ink-500 dark:text-ink-400">
                {category.description?.trim() ||
                  `Latest ${category.name.toLowerCase()} coverage`}
              </p>
            </div>
            <Link
              to={`/category/${category.slug}`}
              className="inline-flex shrink-0 items-center gap-1 text-xs font-bold text-brand-600 hover:underline dark:text-brand-400"
            >
              View all
              {typeof category.articleCount === "number" && category.articleCount > 0 && (
                <span className="rounded-full bg-brand-50 px-1.5 py-0.5 dark:bg-brand-500/10">
                  {category.articleCount}
                </span>
              )}
              <ArrowRight className="h-3 w-3" aria-hidden="true" />
            </Link>
          </div>

          <div className="grid grid-cols-2 gap-2 p-2.5">
            {isLoading
              ? Array.from({ length: 4 }).map((_, index) => (
                  <div key={index} className="flex gap-2.5 p-1">
                    <Skeleton className="h-14 w-14 shrink-0 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-3 w-full" />
                      <Skeleton className="h-3 w-2/3" />
                    </div>
                  </div>
                ))
              : articles.map((article) => (
                  <Link
                    key={article._id}
                    to={articleHref(article)}
                    onClick={() => setOpen(false)}
                    className="group flex gap-2.5 rounded-xl p-1.5 transition-colors hover:bg-ink-50 dark:hover:bg-ink-800/60"
                  >
                    <SmartImage
                      src={articleImage(article)}
                      alt=""
                      ratio="aspect-square"
                      rounded="rounded-lg"
                      width={180}
                      className="w-14 shrink-0"
                    />
                    <span className="min-w-0 flex-1">
                      <span className="clamp-2 block text-[13px] font-bold leading-snug text-ink-900 transition-colors group-hover:text-brand-600 dark:text-white dark:group-hover:text-brand-400">
                        {article.title}
                      </span>
                      <span className="mt-1 flex items-center gap-1.5 text-xs text-ink-500 dark:text-ink-400">
                        {formatDate(article.publishedDate || article.createdAt)}
                        <span aria-hidden="true">•</span>
                        <span className="inline-flex items-center gap-0.5">
                          <Clock className="h-2.5 w-2.5" aria-hidden="true" />
                          {readTimeOf(article)} min
                        </span>
                      </span>
                    </span>
                  </Link>
                ))}

            {!isLoading && articles.length === 0 && (
              <p className="col-span-2 px-2 py-4 text-center text-xs text-ink-500">
                No stories published in {category.name} yet.
              </p>
            )}
          </div>

        </div>
      )}
    </div>
  );
}
