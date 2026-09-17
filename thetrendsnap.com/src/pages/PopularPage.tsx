import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Award, BookOpen, Clock, Heart, Medal, Trophy } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SmartImage } from "@/components/ui/SmartImage";
import { AdSlot } from "@/components/ads/AdSlot";
import { NewsletterCard } from "@/components/ui/Newsletter";
import { CardSkeleton, ListSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { CategoryChip } from "@/components/ui/Bits";
import { useArticles, useCategories } from "@/hooks/useContent";
import { useSeo } from "@/hooks/useSeo";
import {
  articleHref,
  articleImage,
  authorName,
  categoryHref,
  categoryName,
  cn,
  compactNumber,
  excerptOf,
  formatDate,
  imageAlt,
  readTimeOf,
} from "@/lib/utils";

const RANGES = [
  { key: "all", label: "All time", days: 0 },
  { key: "month", label: "This month", days: 30 },
  { key: "week", label: "This week", days: 7 },
] as const;

export default function PopularPage() {
  const [range, setRange] = useState<(typeof RANGES)[number]["key"]>("all");
  const [category, setCategory] = useState("");

  const dateFrom = useMemo(() => {
    const entry = RANGES.find((item) => item.key === range);
    if (!entry?.days) return undefined;
    const from = new Date();
    from.setDate(from.getDate() - entry.days);
    return from.toISOString().slice(0, 10);
  }, [range]);

  const { data, isLoading, isError, refetch } = useArticles({
    sort: "popular",
    limit: 30,
    dateFrom,
    category: category || undefined,
  });

  const { data: categories = [] } = useCategories({ withCounts: true });

  useSeo({
    title: "Most Popular",
    description: "The most-read articles on TheTrendSnap.",
  });

  const articles = data?.data ?? [];
  const [first, second, third, ...rest] = articles;
  const totalViews = articles.reduce((sum, article) => sum + (article.views || 0), 0);

  const podium = [
    { article: second, place: 2, icon: Medal, tone: "from-slate-300 to-slate-400", height: "sm:mt-8" },
    { article: first, place: 1, icon: Trophy, tone: "from-amber-300 to-amber-500", height: "" },
    { article: third, place: 3, icon: Award, tone: "from-orange-300 to-orange-500", height: "sm:mt-12" },
  ].filter((entry) => entry.article);

  return (
    <>
      <PageHeader
        eyebrow="Reader favourites"
        title="Most Popular"
        description="Ranked purely by how many people actually read each story."
        breadcrumbs={[{ label: "Popular" }]}
      >
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-xl border border-ink-200 p-1 dark:border-ink-700">
            {RANGES.map((entry) => (
              <button
                key={entry.key}
                type="button"
                onClick={() => setRange(entry.key)}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
                  range === entry.key
                    ? "bg-brand-600 text-white"
                    : "text-ink-500 hover:text-brand-600 dark:text-ink-400"
                )}
              >
                {entry.label}
              </button>
            ))}
          </div>

          <select
            value={category}
            onChange={(event) => setCategory(event.target.value)}
            className="h-9 rounded-xl border border-ink-200 bg-white px-3 text-[13px] font-semibold text-ink-700 outline-none focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-200"
          >
            <option value="">All sections</option>
            {categories.map((entry) => (
              <option key={entry._id} value={entry.slug}>
                {entry.name}
              </option>
            ))}
          </select>

          {articles.length > 0 && (
            <p className="text-xs font-semibold text-ink-500 dark:text-ink-400">
              {articles.length} stories
            </p>
          )}
        </div>
      </PageHeader>

      <div className="container py-8">
        {isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : isLoading ? (
          <div className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <CardSkeleton key={index} />
              ))}
            </div>
            <ListSkeleton count={6} />
          </div>
        ) : articles.length === 0 ? (
          <EmptyState
            title="No reads recorded for this period"
            message="Pick a wider date range or another section."
          />
        ) : (
          <>
            {/* ---------------- podium ---------------- */}
            <section aria-label="Top three most read" className="grid items-end gap-4 sm:grid-cols-3">
              {podium.map(({ article, place, icon: Icon, tone, height }) => (
                <article
                  key={article!._id}
                  className={cn(
                    "group card relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-pop",
                    height,
                    place === 1 && "ring-2 ring-amber-400/60"
                  )}
                >
                  <div className="relative">
                    <SmartImage
                      src={articleImage(article!)}
                      alt={imageAlt(article!.featuredImage, article!.title)}
                      ratio={place === 1 ? "aspect-[16/10]" : "aspect-[16/9]"}
                      rounded="rounded-none"
                      width={720}
                      priority={place === 1}
                      imgClassName="transition-transform duration-500 group-hover:scale-[1.05]"
                    />
                    <span
                      className={cn(
                        "absolute left-3 top-3 z-10 inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r px-2.5 py-1 text-xs font-extrabold text-white shadow-lg",
                        tone
                      )}
                    >
                      <Icon className="h-3.5 w-3.5" aria-hidden="true" />#{place}
                    </span>
                  </div>

                  <div className="p-3.5">
                    <CategoryChip
                      name={categoryName(article!)}
                      href={categoryHref(article!)}
                      variant="plain"
                      className="text-xs"
                    />
                    <h2 className="mt-1 font-display text-sm font-bold leading-snug text-ink-900 dark:text-white">
                      <Link to={articleHref(article!)} className="clamp-2 hover:text-brand-600">
                        <span className="absolute inset-0" aria-hidden="true" />
                        {article!.title}
                      </Link>
                    </h2>
                    <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500 dark:text-ink-400">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="h-3 w-3" aria-hidden="true" />
                        {readTimeOf(article!)} min
                      </span>
                    </p>
                  </div>
                </article>
              ))}
            </section>

            <AdSlot position="category-top" className="my-7" />

            {/* ---------------- ranked table ---------------- */}
            <section className="grid gap-6 lg:grid-cols-12">
              <div className="min-w-0 lg:col-span-8">
                <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-extrabold text-ink-900 dark:text-white">
                  <BookOpen className="h-5 w-5 text-brand-500" aria-hidden="true" />
                  The rest of the top 30
                </h2>

                <ol className="card divide-y divide-ink-100 dark:divide-ink-800">
                  {rest.map((article, index) => (
                    <li key={article._id} className="group relative flex items-center gap-3 p-3">
                      <span className="w-7 shrink-0 text-center font-display text-sm font-extrabold text-ink-300 dark:text-ink-600">
                        {index + 4}
                      </span>

                      <SmartImage
                        src={articleImage(article)}
                        alt=""
                        ratio="aspect-square"
                        rounded="rounded-lg"
                        width={200}
                        className="w-14 shrink-0 sm:w-16"
                      />

                      <div className="min-w-0 flex-1">
                        <CategoryChip
                          name={categoryName(article)}
                          href={categoryHref(article)}
                          variant="plain"
                          className="text-xs"
                        />
                        <h3 className="mt-0.5 font-display text-sm font-bold leading-snug text-ink-900 dark:text-white">
                          <Link to={articleHref(article)} className="clamp-2 hover:text-brand-600">
                            <span className="absolute inset-0" aria-hidden="true" />
                            {article.title}
                          </Link>
                        </h3>
                        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-400">
                          <span>By {authorName(article)}</span>
                          <span aria-hidden="true">•</span>
                          <span>{formatDate(article.publishedDate || article.createdAt)}</span>
                          <span aria-hidden="true">•</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            {readTimeOf(article)} min
                          </span>
                        </p>
                      </div>

                      {(article.likes || 0) > 0 && (
                        <div className="shrink-0 text-right">
                          <p className="inline-flex items-center gap-1 text-xs text-rose-500">
                            <Heart className="h-3 w-3" aria-hidden="true" />
                            {compactNumber(article.likes || 0)}
                          </p>
                        </div>
                      )}
                    </li>
                  ))}
                </ol>
              </div>

              {/* ---------------- sidebar ---------------- */}
              <aside className="min-w-0 lg:col-span-4">
                <div className="space-y-5 lg:sticky lg:top-28">
                  <section className="card p-4">
                    <h2 className="font-display text-sm font-bold text-ink-900 dark:text-white">
                      Where readers spend time
                    </h2>
                    <ul className="mt-3 space-y-2.5">
                      {Object.entries(
                        articles.reduce<Record<string, number>>((acc, article) => {
                          const name = categoryName(article);
                          acc[name] = (acc[name] || 0) + (article.views || 0);
                          return acc;
                        }, {})
                      )
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 6)
                        .map(([name, views]) => (
                          <li key={name}>
                            <div className="flex items-center justify-between gap-2 text-[13px]">
                              <span className="clamp-1 font-semibold text-ink-800 dark:text-ink-100">
                                {name}
                              </span>
                              <span className="shrink-0 font-bold text-ink-400">
                                {Math.round((views / Math.max(1, totalViews)) * 100)}%
                              </span>
                            </div>
                            <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                              <span
                                className="block h-full rounded-full bg-gradient-to-r from-brand-500 to-fuchsia-500"
                                style={{ width: `${Math.max(6, (views / Math.max(1, totalViews)) * 100)}%` }}
                              />
                            </span>
                          </li>
                        ))}
                    </ul>
                  </section>

                  {first && (
                    <section className="card p-4">
                      <h2 className="font-display text-sm font-bold text-ink-900 dark:text-white">
                        Story of the period
                      </h2>
                      <p className="clamp-3 mt-1.5 text-[13px] leading-relaxed text-ink-600 dark:text-ink-300">
                        {excerptOf(first, 160)}
                      </p>
                      <Link
                        to={articleHref(first)}
                        className="mt-2 inline-block text-xs font-bold text-brand-600 hover:underline dark:text-brand-400"
                      >
                        Read it now
                      </Link>
                    </section>
                  )}

                  <NewsletterCard source="popular-page" layout="compact" />
                  <AdSlot position="sidebar" ratio="aspect-[300/250]" />
                </div>
              </aside>
            </section>
          </>
        )}
      </div>
    </>
  );
}
