import { Link } from "react-router-dom";
import { ArrowRight, Flame } from "lucide-react";
import type { Article, Category } from "@/types/api";
import { SmartImage } from "@/components/ui/SmartImage";
import { Skeleton } from "@/components/ui/Skeleton";
import { articleImage, cn } from "@/lib/utils";

interface Topic {
  key: string;
  label: string;
  href: string;
  count?: number;
  image?: string;
}

const TINTS = [
  "bg-brand-50 dark:bg-brand-500/10",
  "bg-emerald-50 dark:bg-emerald-500/10",
  "bg-rose-50 dark:bg-rose-500/10",
  "bg-amber-50 dark:bg-amber-500/10",
  "bg-sky-50 dark:bg-sky-500/10",
  "bg-violet-50 dark:bg-violet-500/10",
];

/**
 * Trending rail: an endless right-to-left marquee. The track carries two
 * copies of the topic list and slides by exactly half its width, so the loop
 * is seamless and the strip never sits still or shows a gap.
 */
export function TrendingTopics({
  categories,
  articles,
  loading,
}: {
  categories: Category[];
  articles: Article[];
  loading?: boolean;
}) {
  const imageFor = (index: number) =>
    articleImage(articles[index % Math.max(1, articles.length)] || ({} as Article));

  // Always category-led: readers recognise "Hotel" faster than "#hotel", and
  // each tile shows that category's newest article image.
  const topics: Topic[] = categories
    .map((category, index) => ({
      key: category._id,
      label: category.name,
      href: `/category/${category.slug}`,
      count: category.articleCount,
      image: category.coverImage?.url || category.image?.url || imageFor(index),
    }))
    .filter((topic) => topic.label);

  if (loading) {
    return (
      <div className="card flex items-center gap-3 p-3">
        <Skeleton className="h-8 w-40 shrink-0 rounded-full" />
        <div className="flex flex-1 gap-3 overflow-hidden">
          {Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="h-14 w-56 shrink-0 rounded-xl" />
          ))}
        </div>
      </div>
    );
  }

  if (!topics.length) return null;

  // Two passes of the same list make the loop continuous.
  const track = [...topics, ...topics];

  return (
    <section className="card overflow-hidden" aria-labelledby="trending-topics">
      <div className="flex items-stretch">
        <h2
          id="trending-topics"
          className="flex shrink-0 items-center gap-2 border-r border-ink-100 bg-ink-50/70 px-4 font-display text-[13px] font-bold uppercase tracking-wide text-ink-900 dark:border-ink-800 dark:bg-ink-800/50 dark:text-white"
        >
          <Flame className="h-4 w-4 text-flame" aria-hidden="true" />
          <span className="hidden sm:inline">Browse Sections</span>
          <span className="sm:hidden">Sections</span>
        </h2>

        <div className="relative min-w-0 flex-1 overflow-hidden py-2.5">
          {/* soft edges so items enter and leave the rail cleanly */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-white to-transparent dark:from-ink-900"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white to-transparent dark:from-ink-900"
          />

          <ul className="flex w-max animate-marquee items-center gap-3 pl-3">
            {track.map((topic, index) => (
              <li key={`${topic.key}-${index}`} aria-hidden={index >= topics.length}>
                <Link
                  to={topic.href}
                  tabIndex={index >= topics.length ? -1 : undefined}
                  className={cn(
                    "flex w-[236px] items-center gap-3 rounded-xl border border-ink-100 p-2 transition-all duration-200 hover:border-brand-300 hover:shadow-card dark:border-ink-800 dark:hover:border-brand-500/40",
                    TINTS[index % TINTS.length]
                  )}
                >
                  <SmartImage
                    src={topic.image}
                    alt=""
                    ratio="aspect-square"
                    rounded="rounded-lg"
                    width={140}
                    className="w-11 shrink-0"
                  />
                  <span className="min-w-0">
                    <span className="clamp-1 block text-[13px] font-bold text-ink-900 dark:text-white">
                      {topic.label}
                    </span>
                    {typeof topic.count === "number" && topic.count > 0 && (
                      <span className="mt-0.5 block text-xs text-ink-500 dark:text-ink-400">
                        {topic.count} {topic.count === 1 ? "article" : "articles"}
                      </span>
                    )}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <Link
          to="/categories"
          className="hidden shrink-0 items-center gap-1 border-l border-ink-100 bg-ink-50/70 px-4 text-xs font-bold text-brand-600 transition-colors hover:bg-ink-100 sm:flex dark:border-ink-800 dark:bg-ink-800/50 dark:text-brand-400 dark:hover:bg-ink-800"
        >
          View all
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
