import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, Clock, Flame, Heart, Share2, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SmartImage } from "@/components/ui/SmartImage";
import { AdSlot } from "@/components/ads/AdSlot";
import { CardSkeleton, ListSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { CategoryChip } from "@/components/ui/Bits";
import { useArticles, useCategories } from "@/hooks/useContent";
import { useSeo } from "@/hooks/useSeo";
import type { Article } from "@/types/api";
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

/** A simple heat score so the leaderboard has something to rank and show. */
function heatOf(article: Article): number {
  return (article.views || 0) + (article.likes || 0) * 4 + (article.shareCount || 0) * 6;
}

export default function TrendingPage() {
  const [category, setCategory] = useState("");

  const { data, isLoading, isError, refetch } = useArticles({
    sort: "trending",
    limit: 30,
    category: category || undefined,
  });

  const { data: categories = [] } = useCategories({ withCounts: true });

  useSeo({
    title: "Trending Now",
    description: "The stories readers can't stop clicking on right now.",
  });

  const articles = data?.data ?? [];
  const maxHeat = useMemo(() => Math.max(1, ...articles.map(heatOf)), [articles]);

  const podium = articles.slice(0, 3);
  const rest = articles.slice(3);

  return (
    <>
      <PageHeader
        eyebrow="Hot right now"
        title="Trending Now"
        description="Ranked by how much readers are viewing, liking and sharing each story."
        breadcrumbs={[{ label: "Trending" }]}
      >
        <div className="mt-5 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategory("")}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
              !category
                ? "border-flame bg-flame text-white"
                : "border-ink-200 text-ink-600 hover:border-flame hover:text-flame dark:border-ink-700 dark:text-ink-300"
            )}
          >
            Everything
          </button>
          {categories.map((entry) => (
            <button
              key={entry._id}
              type="button"
              onClick={() => setCategory(entry.slug)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
                category === entry.slug
                  ? "border-flame bg-flame text-white"
                  : "border-ink-200 text-ink-600 hover:border-flame hover:text-flame dark:border-ink-700 dark:text-ink-300"
              )}
            >
              {entry.name}
            </button>
          ))}
        </div>
      </PageHeader>

      <div className="container py-8">
        {isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : isLoading ? (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              {Array.from({ length: 3 }).map((_, index) => (
                <CardSkeleton key={index} />
              ))}
            </div>
            <ListSkeleton count={6} />
          </div>
        ) : articles.length === 0 ? (
          <EmptyState
            title="Nothing trending here yet"
            message="Try another section or browse the latest stories."
          />
        ) : (
          <>
            {/* ---------------- podium ---------------- */}
            <section aria-label="Top three" className="grid gap-4 md:grid-cols-3">
              {podium.map((article, index) => (
                <article
                  key={article._id}
                  className={cn(
                    "group relative isolate overflow-hidden rounded-2xl border shadow-card transition-all hover:-translate-y-1 hover:shadow-pop",
                    index === 0
                      ? "border-flame/40 md:row-span-1"
                      : "border-ink-200 dark:border-ink-800"
                  )}
                >
                  <div className="relative">
                    <SmartImage
                      src={articleImage(article)}
                      alt={imageAlt(article.featuredImage, article.title)}
                      ratio={index === 0 ? "aspect-[16/10]" : "aspect-[16/10]"}
                      rounded="rounded-none"
                      width={720}
                      priority={index === 0}
                      overlay
                      imgClassName="transition-transform duration-500 group-hover:scale-[1.05]"
                    />

                    <span
                      className={cn(
                        "absolute left-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full font-display text-sm font-extrabold shadow-lg",
                        index === 0 ? "bg-flame text-white" : "bg-white text-ink-900"
                      )}
                    >
                      {index + 1}
                    </span>

                    <div className="absolute inset-x-0 bottom-0 z-10 p-3.5">
                      <CategoryChip name={categoryName(article)} variant="solid" className="mb-1.5" />
                      <h2 className="font-display text-sm font-bold leading-snug text-white sm:text-base">
                        <Link to={articleHref(article)} className="clamp-2">
                          <span className="absolute inset-0" aria-hidden="true" />
                          {article.title}
                        </Link>
                      </h2>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 bg-white px-3.5 py-2.5 text-xs text-ink-500 dark:bg-ink-900 dark:text-ink-400">
                    <span className="inline-flex items-center gap-1 font-bold text-flame">
                      <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                      {compactNumber(heatOf(article))} heat
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {readTimeOf(article)} min
                    </span>
                  </div>
                </article>
              ))}
            </section>

            <AdSlot position="category-top" className="my-7" />

            {/* ---------------- leaderboard ---------------- */}
            <section aria-label="Trending leaderboard" className="grid gap-6 lg:grid-cols-12">
              <div className="min-w-0 lg:col-span-8">
                <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-extrabold text-ink-900 dark:text-white">
                  <TrendingUp className="h-5 w-5 text-flame" aria-hidden="true" />
                  The full leaderboard
                </h2>

                <ol className="card divide-y divide-ink-100 dark:divide-ink-800">
                  {rest.map((article, index) => {
                    const heat = heatOf(article);
                    return (
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

                          {/* heat bar makes the ranking legible at a glance */}
                          <div className="mt-1.5 flex items-center gap-2">
                            <span className="h-1.5 w-full max-w-[160px] overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                              <span
                                className="block h-full rounded-full bg-gradient-to-r from-flame to-orange-400"
                                style={{ width: `${Math.max(6, (heat / maxHeat) * 100)}%` }}
                              />
                            </span>
                            <span className="text-xs font-bold text-flame">
                              {compactNumber(heat)}
                            </span>
                          </div>
                        </div>

                        <div className="hidden shrink-0 flex-col items-end gap-1 text-xs text-ink-400 sm:flex">
                          <span className="inline-flex items-center gap-1">
                            <Heart className="h-3 w-3" aria-hidden="true" />
                            {compactNumber(article.likes || 0)}
                          </span>
                          <span className="inline-flex items-center gap-1">
                            <Share2 className="h-3 w-3" aria-hidden="true" />
                            {compactNumber(article.shareCount || 0)}
                          </span>
                        </div>
                      </li>
                    );
                  })}
                </ol>
              </div>

              {/* ---------------- sidebar ---------------- */}
              <aside className="min-w-0 lg:col-span-4">
                <div className="space-y-5 lg:sticky lg:top-28">
                  <section className="card p-4">
                    <h2 className="font-display text-sm font-bold text-ink-900 dark:text-white">
                      Hot sections
                    </h2>
                    <ul className="mt-3 space-y-2">
                      {Object.entries(
                        articles.reduce<Record<string, number>>((acc, article) => {
                          const name = categoryName(article);
                          acc[name] = (acc[name] || 0) + heatOf(article);
                          return acc;
                        }, {})
                      )
                        .sort((a, b) => b[1] - a[1])
                        .slice(0, 6)
                        .map(([name, heat], index) => (
                          <li key={name} className="flex items-center gap-2.5">
                            <span className="w-4 text-xs font-bold text-ink-400">{index + 1}</span>
                            <span className="min-w-0 flex-1">
                              <span className="clamp-1 block text-[13px] font-semibold text-ink-800 dark:text-ink-100">
                                {name}
                              </span>
                              <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-ink-100 dark:bg-ink-800">
                                <span
                                  className="block h-full rounded-full bg-brand-500"
                                  style={{
                                    width: `${Math.max(8, (heat / Math.max(1, maxHeat * 3)) * 100)}%`,
                                  }}
                                />
                              </span>
                            </span>
                            <span className="text-xs font-bold text-ink-400">
                              {compactNumber(heat)}
                            </span>
                          </li>
                        ))}
                    </ul>
                  </section>

                  <section className="card p-4">
                    <h2 className="font-display text-sm font-bold text-ink-900 dark:text-white">
                      Most shared today
                    </h2>
                    <ul className="mt-3 space-y-3">
                      {[...articles]
                        .sort((a, b) => (b.shareCount || 0) - (a.shareCount || 0))
                        .slice(0, 4)
                        .map((article) => (
                          <li key={article._id} className="group">
                            <Link to={articleHref(article)} className="flex items-start gap-2">
                              <ArrowUpRight
                                className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500"
                                aria-hidden="true"
                              />
                              <span className="min-w-0">
                                <span className="clamp-2 block text-[13px] font-semibold text-ink-800 group-hover:text-brand-600 dark:text-ink-100">
                                  {article.title}
                                </span>
                                <span className="mt-0.5 block text-xs text-ink-400">
                                  {compactNumber(article.shareCount || 0)} shares ·{" "}
                                  {formatDate(article.publishedDate || article.createdAt)}
                                </span>
                              </span>
                            </Link>
                          </li>
                        ))}
                    </ul>
                  </section>

                  <AdSlot position="sidebar" ratio="aspect-[300/250]" />
                </div>
              </aside>
            </section>

            {/* ---------------- editor context ---------------- */}
            {podium[0] && (
              <section className="mt-8 rounded-2xl border border-ink-200 p-5 dark:border-ink-800">
                <h2 className="font-display text-sm font-bold text-ink-900 dark:text-white">
                  Why this is trending
                </h2>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                  <strong>{podium[0].title}</strong> — {excerptOf(podium[0], 200)}
                </p>
                <p className="mt-2 text-xs text-ink-500">
                  By {authorName(podium[0])} ·{" "}
                  {formatDate(podium[0].publishedDate || podium[0].createdAt)}
                </p>
              </section>
            )}
          </>
        )}
      </div>
    </>
  );
}
