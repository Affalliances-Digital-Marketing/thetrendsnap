import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { Clock } from "lucide-react";
import type { Article } from "@/types/api";
import { SmartImage } from "@/components/ui/SmartImage";
import { CategoryChip } from "@/components/ui/Bits";
import {
  articleDate,
  articleHref,
  articleImage,
  authorName,
  categoryHref,
  categoryName,
  cn,
  excerptOf,
  formatDate,
  imageAlt,
  readTimeOf,
} from "@/lib/utils";

/* ------------------------------------------------------------------ */
/* Shared meta line                                                    */
/* ------------------------------------------------------------------ */

export function ArticleMeta({
  article,
  className,
  showAuthor = false,
  tone = "muted",
  compact = false,
}: {
  article: Article;
  className?: string;
  showAuthor?: boolean;
  tone?: "muted" | "light";
  /** Caps the line at two facts so narrow columns never wrap mid-separator. */
  compact?: boolean;
}) {
  const date = articleDate(article);

  // Built as a list so a missing date never leaves a dangling separator.
  const parts: ReactNode[] = [];

  if (showAuthor) {
    parts.push(
      <span key="author" className="font-medium">
        By {authorName(article)}
      </span>
    );
  }

  if (date) {
    parts.push(
      <time key="date" dateTime={date.toISOString()}>
        {formatDate(date)}
      </time>
    );
  }

  parts.push(
    <span key="read" className="inline-flex items-center gap-1">
      <Clock className="h-3 w-3" aria-hidden="true" />
      {readTimeOf(article)} min read
    </span>
  );

  const visible = compact ? parts.slice(0, 2) : parts;

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs",
        tone === "light" ? "text-white/80" : "text-ink-500 dark:text-ink-400",
        className
      )}
    >
      {visible.map((part, index) => (
        // The separator travels with the item before it, so a wrapped line
        // never begins with a stray bullet.
        <span key={index} className="flex items-center gap-x-1.5 whitespace-nowrap">
          {part}
          {index < visible.length - 1 && <span aria-hidden="true">•</span>}
        </span>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Vertical card — used in every grid                                  */
/* ------------------------------------------------------------------ */

export function ArticleCard({
  article,
  priority = false,
  showExcerpt = true,
  ratio = "aspect-[4/3]",
}: {
  article: Article;
  priority?: boolean;
  showExcerpt?: boolean;
  ratio?: string;
}) {
  return (
    <article className="card group flex h-full flex-col overflow-hidden transition-shadow duration-200 hover:shadow-pop">
      <Link to={articleHref(article)} className="block overflow-hidden" tabIndex={-1} aria-hidden="true">
        <SmartImage
          src={articleImage(article)}
          alt={imageAlt(article.featuredImage, article.title)}
          ratio={ratio}
          rounded="rounded-none"
          width={720}
          priority={priority}
          imgClassName="transition-transform duration-500 group-hover:scale-[1.05]"
        />
      </Link>

      <div className="flex flex-1 flex-col gap-2.5 p-4">
        <CategoryChip
          name={categoryName(article)}
          href={categoryHref(article)}
          variant="plain"
          className="w-fit"
        />

        <h3 className="font-display text-base font-bold leading-snug tracking-tight text-ink-900 dark:text-white">
          <Link
            to={articleHref(article)}
            className="clamp-2 transition-colors hover:text-brand-600 dark:hover:text-brand-400"
          >
            {article.title}
          </Link>
        </h3>

        {showExcerpt && (
          <p className="clamp-2 text-sm leading-relaxed text-ink-500 dark:text-ink-400">
            {excerptOf(article, 130)}
          </p>
        )}

        <ArticleMeta article={article} className="mt-auto pt-1" showAuthor />
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Tile card — Featured Articles, Don't Miss, More Stories             */
/*                                                                     */
/* The image sits in its own square frame and is contained, so the full */
/* picture is always visible; the headline lives in the card body below */
/* where nothing can clip it. Only the badges sit over the artwork.     */
/* ------------------------------------------------------------------ */

export function ArticleTileCard({
  article,
  badge = "Featured",
  ratio = "aspect-square",
  priority = false,
  showExcerpt = false,
  stretch = true,
  fit = "cover",
  compact = false,
}: {
  article: Article;
  badge?: string | null;
  ratio?: string;
  priority?: boolean;
  showExcerpt?: boolean;
  /** Grid cells stretch to the row height; stacked cards should not. */
  stretch?: boolean;
  /** `contain` shows the whole frame; `cover` fills the box. */
  fit?: "cover" | "contain";
  /** Tighter type and padding for dense grids. */
  compact?: boolean;
}) {
  return (
    <article
      className={cn(
        "card group flex flex-col overflow-hidden transition-all duration-200 hover:-translate-y-0.5 hover:shadow-pop",
        stretch && "h-full"
      )}
    >
      <div className="relative bg-ink-50 dark:bg-ink-800/50">
        <SmartImage
          src={articleImage(article)}
          alt={imageAlt(article.featuredImage, article.title)}
          ratio={ratio}
          fit={fit}
          rounded="rounded-none"
          width={800}
          priority={priority}
          imgClassName={cn(
            "transition-transform duration-500",
            fit === "cover" ? "group-hover:scale-[1.05]" : "group-hover:scale-[1.02]"
          )}
        />

        {badge && (
          <span className="pointer-events-none absolute left-3 top-3 z-10 chip bg-flame text-white shadow-sm">
            {badge}
          </span>
        )}

        {!compact && (
          <span className="pointer-events-none absolute bottom-3 left-3 z-10 chip bg-ink-900/80 text-white backdrop-blur-sm">
            {categoryName(article)}
          </span>
        )}
      </div>

      <div className={cn("flex flex-1 flex-col gap-1.5", compact ? "p-3" : "p-4")}>
        {compact && (
          <CategoryChip
            name={categoryName(article)}
            href={categoryHref(article)}
            variant="plain"
            className="w-fit text-xs"
          />
        )}

        <h3
          className={cn(
            "font-display font-bold leading-snug tracking-tight text-ink-900 dark:text-white",
            compact ? "text-sm" : "text-sm sm:text-base"
          )}
        >
          <Link
            to={articleHref(article)}
            className={cn(
              "transition-colors hover:text-brand-600 dark:hover:text-brand-400",
              compact ? "clamp-2" : "clamp-3"
            )}
          >
            {article.title}
          </Link>
        </h3>

        {showExcerpt && (
          <p className="clamp-2 text-sm leading-relaxed text-ink-500 dark:text-ink-400">
            {excerptOf(article, 120)}
          </p>
        )}

        <ArticleMeta
          article={article}
          className={cn("mt-auto pt-1", compact && "text-xs")}
          showAuthor={!compact}
          compact
        />
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Horizontal list row — Editor's Picks, Don't Miss, sidebars          */
/* ------------------------------------------------------------------ */

export function ArticleListRow({
  article,
  showCategory = true,
  thumbSize = "w-[64px]",
  titleClass = "text-[13px]",
  dense = false,
}: {
  article: Article;
  showCategory?: boolean;
  thumbSize?: string;
  titleClass?: string;
  /** Tighter row for columns that need to carry more headlines. */
  dense?: boolean;
}) {
  return (
    <article
      className={cn(
        "group relative flex items-start gap-3",
        dense ? "py-2" : "py-3"
      )}
    >
      <SmartImage
        src={articleImage(article)}
        alt={imageAlt(article.featuredImage, article.title)}
        ratio="aspect-square"
        rounded="rounded-lg"
        width={280}
        className={cn("shrink-0", thumbSize)}
      />

      <div className="min-w-0 flex-1">
        {showCategory && (
          <CategoryChip
            name={categoryName(article)}
            variant="plain"
            className="mb-0.5 text-xs"
          />
        )}

        <h3
          className={cn(
            "font-display font-bold leading-snug tracking-tight text-ink-900 dark:text-white",
            titleClass
          )}
        >
          <Link
            to={articleHref(article)}
            className="clamp-2 transition-colors group-hover:text-brand-600 dark:group-hover:text-brand-400"
          >
            <span className="absolute inset-0" aria-hidden="true" />
            {article.title}
          </Link>
        </h3>

        <ArticleMeta
          article={article}
          className={cn(dense ? "mt-0.5" : "mt-1.5", "text-xs")}
          compact
        />
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Ranked row — Popular Now                                            */
/* ------------------------------------------------------------------ */

export function ArticleRankRow({
  article,
  rank,
  dense = false,
}: {
  article: Article;
  rank: number;
  dense?: boolean;
}) {
  return (
    <article
      className={cn("group relative flex items-start gap-3", dense ? "py-2" : "py-3")}
    >
      <div className="relative shrink-0">
        <SmartImage
          src={articleImage(article)}
          alt={imageAlt(article.featuredImage, article.title)}
          ratio="aspect-square"
          rounded="rounded-lg"
          width={240}
          className="w-[60px]"
        />
        <span className="absolute -right-1.5 -top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-xs font-bold text-white ring-2 ring-white dark:ring-ink-900">
          {rank}
        </span>
      </div>

      <div className="min-w-0 flex-1">
        <h3 className="font-display text-sm font-bold leading-snug tracking-tight text-ink-900 dark:text-white">
          <Link
            to={articleHref(article)}
            className="clamp-2 transition-colors group-hover:text-brand-600 dark:group-hover:text-brand-400"
          >
            <span className="absolute inset-0" aria-hidden="true" />
            {article.title}
          </Link>
        </h3>
        <ArticleMeta article={article} className="mt-0.5 text-xs" compact />
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Wide row — Latest Articles list                                     */
/* ------------------------------------------------------------------ */

export function ArticleWideRow({
  article,
  dense = false,
}: {
  article: Article;
  dense?: boolean;
}) {
  return (
    <article
      className={cn(
        "group flex flex-col gap-4 sm:flex-row",
        dense ? "py-3.5" : "py-5"
      )}
    >
      <Link
        to={articleHref(article)}
        className={cn("block w-full shrink-0 overflow-hidden rounded-xl", dense ? "sm:w-[132px]" : "sm:w-[168px]")}
        tabIndex={-1}
        aria-hidden="true"
      >
        <SmartImage
          src={articleImage(article)}
          alt={imageAlt(article.featuredImage, article.title)}
          ratio="aspect-square"
          width={460}
          imgClassName="transition-transform duration-500 group-hover:scale-[1.05]"
        />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col">
        <CategoryChip
          name={categoryName(article)}
          href={categoryHref(article)}
          variant="plain"
          className="mb-1.5 w-fit text-xs"
        />

        <h3 className="font-display text-base font-bold leading-snug tracking-tight text-ink-900 dark:text-white sm:text-base">
          <Link
            to={articleHref(article)}
            className="clamp-2 transition-colors hover:text-brand-600 dark:hover:text-brand-400"
          >
            {article.title}
          </Link>
        </h3>

        <p
          className={cn(
            "mt-1.5 text-sm leading-relaxed text-ink-500 dark:text-ink-400",
            dense ? "clamp-1" : "clamp-2"
          )}
        >
          {excerptOf(article, dense ? 110 : 150)}
        </p>

        <div className={cn("flex flex-wrap items-center justify-between gap-3", dense ? "mt-2" : "mt-3")}>
          <ArticleMeta article={article} />
          <Link
            to={articleHref(article)}
            className="inline-flex items-center gap-1 rounded-lg bg-brand-50 px-3 py-1.5 text-xs font-bold text-brand-700 transition-colors hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20"
          >
            Read More
          </Link>
        </div>
      </div>
    </article>
  );
}
