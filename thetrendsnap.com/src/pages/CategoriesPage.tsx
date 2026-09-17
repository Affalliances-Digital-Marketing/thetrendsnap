import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Layers, Newspaper } from "lucide-react";
import type { Category } from "@/types/api";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/States";
import { useCategories } from "@/hooks/useContent";
import { useSeo } from "@/hooks/useSeo";
import { cn, imageUrl, optimizedImage } from "@/lib/utils";

/**
 * Descriptions are typed by hand in the panel and arrive as written —
 * "management of money , investment". Tidy the punctuation and the first
 * letter so the index reads as edited copy.
 */
const tidy = (text = "") => {
  const clean = text.replace(/\s+([,.;:!?])/g, "$1").replace(/\s{2,}/g, " ").trim();
  return clean ? clean.charAt(0).toUpperCase() + clean.slice(1) : "";
};

/** Gradients for a section with no artwork yet, so it looks designed, not broken. */
const FALLBACKS = [
  "from-indigo-600 via-violet-600 to-fuchsia-600",
  "from-rose-500 via-orange-500 to-amber-400",
  "from-emerald-600 via-teal-500 to-cyan-500",
  "from-slate-800 via-slate-700 to-indigo-700",
];

const fallbackFor = (name: string) => {
  let hash = 0;
  for (let i = 0; i < name.length; i += 1) hash = (hash * 31 + name.charCodeAt(i)) % 997;
  return FALLBACKS[hash % FALLBACKS.length];
};

const coverOf = (category: Category) =>
  imageUrl(category.image) || imageUrl(category.banner) || imageUrl(category.coverImage);

/**
 * Where each tile sits in the bento. The largest section leads as a tall
 * feature, the next two stand beside it as wide tiles, and the rest run in
 * rows of four — with the last row's tiles widened so it always ends flush.
 */
function spanFor(index: number, total: number): string {
  if (index === 0) return "sm:col-span-2 lg:col-span-2 lg:row-span-2";
  if (index <= 2) return "sm:col-span-2 lg:col-span-2";

  const rest = total - 3;
  const position = index - 3;
  const remainder = rest % 4;
  const inLastRow = remainder > 0 && position >= rest - remainder;

  if (!inLastRow) return "lg:col-span-1";
  if (remainder === 1) return "sm:col-span-2 lg:col-span-4";
  if (remainder === 2) return "lg:col-span-2";
  // remainder 3: the first of the three takes the extra column
  return position === rest - remainder ? "lg:col-span-2" : "lg:col-span-1";
}

function CategoryTile({
  category,
  index,
  total,
}: {
  category: Category;
  index: number;
  total: number;
}) {
  const cover = coverOf(category);
  // A cover URL that fails to load (a deleted upload, a hotlink that stopped
  // working) falls back to the designed gradient rather than a broken frame.
  const [coverFailed, setCoverFailed] = useState(false);
  const feature = index === 0;
  const count = category.articleCount ?? 0;
  const description = tidy(category.description);

  return (
    <Link
      to={`/category/${category.slug}`}
      className={cn(
        "group relative isolate flex min-h-[190px] flex-col justify-end overflow-hidden rounded-2xl ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-pop focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500 dark:ring-white/10",
        spanFor(index, total)
      )}
    >
      {/* artwork, or a designed stand-in until the section has some */}
      {cover && !coverFailed ? (
        <img
          src={optimizedImage(cover, feature ? 1200 : 640)}
          alt=""
          loading={index < 3 ? "eager" : "lazy"}
          decoding="async"
          onError={() => setCoverFailed(true)}
          className="absolute inset-0 -z-20 h-full w-full bg-ink-800 object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
        />
      ) : (
        <div
          aria-hidden="true"
          className={cn("absolute inset-0 -z-20 bg-gradient-to-br", fallbackFor(category.name))}
        >
          <span className="absolute -bottom-6 -right-2 font-display text-[9rem] font-extrabold leading-none text-white/10">
            {category.name.charAt(0)}
          </span>
        </div>
      )}

      {/* scrim: deep at the foot where the type sits, clear at the top */}
      <div
        aria-hidden="true"
        className="absolute inset-0 -z-10 bg-gradient-to-t from-black/85 via-black/35 to-black/5 transition-opacity duration-300 group-hover:from-black/90"
      />

      {/* top row: running number and story count */}
      <div className="absolute inset-x-0 top-0 flex items-center justify-between p-4">
        <span className="font-display text-xs font-bold tabular-nums tracking-[0.2em] text-white/70">
          {String(index + 1).padStart(2, "0")}
        </span>
        <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-1 text-xs font-semibold text-white ring-1 ring-inset ring-white/25 backdrop-blur-md">
          <Newspaper className="h-3 w-3" aria-hidden="true" />
          {count} {count === 1 ? "story" : "stories"}
        </span>
      </div>

      {/* foot: name, a line of description, the way in */}
      <div className={cn("flex items-end justify-between gap-4 p-4", feature && "sm:p-6")}>
        <div className="min-w-0">
          <h2
            className={cn(
              "font-display font-extrabold leading-tight tracking-tight text-white",
              feature ? "text-2xl sm:text-3xl" : "text-lg"
            )}
          >
            {category.name}
          </h2>
          {description && (
            <p
              className={cn(
                "mt-1 max-w-md text-[13px] leading-relaxed text-white/75",
                feature ? "clamp-2 sm:text-sm" : "clamp-1"
              )}
            >
              {description}
            </p>
          )}
        </div>

        <span
          aria-hidden="true"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white text-ink-900 shadow-lg transition-all duration-300 group-hover:rotate-45 group-hover:bg-brand-500 group-hover:text-white"
        >
          <ArrowUpRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}

export default function CategoriesPage() {
  const { data: categories = [], isLoading } = useCategories({ withCounts: true, withCover: true });

  useSeo({
    title: "All Categories",
    description: "Browse every section covered on TheTrendSnap.",
  });

  // The busiest section leads the bento; ties keep the editors' order.
  const ordered = useMemo(
    () =>
      [...categories].sort((a, b) => (b.articleCount ?? 0) - (a.articleCount ?? 0)),
    [categories]
  );

  const totalStories = useMemo(
    () => categories.reduce((sum, category) => sum + (category.articleCount ?? 0), 0),
    [categories]
  );

  return (
    <div className="container py-8 sm:py-10">
      {/* ---------------- header ---------------- */}
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4 border-b border-ink-200 pb-5 dark:border-ink-800">
        <div className="min-w-0">
          <nav aria-label="Breadcrumb" className="mb-2 text-xs text-ink-400">
            <Link to="/" className="transition-colors hover:text-brand-600">
              Home
            </Link>
            <span className="mx-1.5" aria-hidden="true">
              /
            </span>
            <span className="text-ink-600 dark:text-ink-300">Categories</span>
          </nav>

          <p className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.18em] text-brand-600 dark:text-brand-400">
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            The index
          </p>
          <h1 className="mt-1 font-display text-3xl font-extrabold tracking-tight text-ink-900 sm:text-4xl dark:text-white">
            Every section, one place
          </h1>
          <p className="mt-1.5 max-w-xl text-sm text-ink-500 dark:text-ink-400">
            Pick a topic and go straight to everything we have published on it.
          </p>
        </div>

        {!isLoading && categories.length > 0 && (
          <dl className="flex items-center divide-x divide-ink-200 rounded-2xl border border-ink-200 bg-white text-center shadow-card dark:divide-ink-800 dark:border-ink-800 dark:bg-ink-900">
            <div className="px-5 py-2.5">
              <dd className="font-display text-xl font-extrabold text-ink-900 dark:text-white">
                {categories.length}
              </dd>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">Sections</dt>
            </div>
            <div className="px-5 py-2.5">
              <dd className="font-display text-xl font-extrabold text-ink-900 dark:text-white">
                {totalStories}
              </dd>
              <dt className="text-xs font-semibold uppercase tracking-wide text-ink-400">Stories</dt>
            </div>
          </dl>
        )}
      </header>

      {/* ---------------- bento ---------------- */}
      {isLoading ? (
        <div className="grid auto-rows-[190px] gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          <Skeleton className="rounded-2xl sm:col-span-2 lg:row-span-2" />
          <Skeleton className="rounded-2xl sm:col-span-2" />
          <Skeleton className="rounded-2xl sm:col-span-2" />
          {Array.from({ length: 4 }).map((_, index) => (
            <Skeleton key={index} className="rounded-2xl" />
          ))}
        </div>
      ) : categories.length === 0 ? (
        <EmptyState title="No categories yet" message="Sections will appear here once published." />
      ) : (
        <div className="grid auto-rows-[190px] grid-flow-dense gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-4">
          {ordered.map((category, index) => (
            <CategoryTile
              key={category._id}
              category={category}
              index={index}
              total={ordered.length}
            />
          ))}
        </div>
      )}
    </div>
  );
}
