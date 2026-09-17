import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CalendarDays, Clock, Loader2, Radio } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SmartImage } from "@/components/ui/SmartImage";
import { AdSlot } from "@/components/ads/AdSlot";
import { NewsletterCard } from "@/components/ui/Newsletter";
import { CardSkeleton, ListSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { CategoryChip } from "@/components/ui/Bits";
import { useArticles, useCategories } from "@/hooks/useContent";
import { useSeo } from "@/hooks/useSeo";
import type { Article } from "@/types/api";
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

const PER_PAGE = 18;

/** Groups the feed into Today / Yesterday / date buckets. */
function bucketOf(article: Article): string {
  const date = articleDate(article);
  if (!date) return "Earlier";

  const startOfDay = (value: Date) =>
    new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();

  const days = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);

  if (days <= 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return "This week";
  return formatDate(date);
}

export default function LatestPage() {
  const [page, setPage] = useState(1);
  const [category, setCategory] = useState("");

  const { data, isLoading, isError, isFetching, refetch } = useArticles({
    sort: "latest",
    limit: PER_PAGE,
    page,
    category: category || undefined,
  });

  const { data: categories = [] } = useCategories({ withCounts: true });

  useSeo({
    title: "Latest Articles",
    description: "Every story published on TheTrendSnap, newest first.",
  });

  const [collected, setCollected] = useState<Article[]>([]);

  // "Load more" appends instead of replacing, so the timeline keeps growing.
  const articles = useMemo(() => {
    const incoming = data?.data ?? [];
    if (page === 1) return incoming;
    const seen = new Set(collected.map((a) => a._id));
    return [...collected, ...incoming.filter((a) => !seen.has(a._id))];
  }, [data, page]); // eslint-disable-line react-hooks/exhaustive-deps

  const lead = page === 1 ? articles[0] : undefined;

  const groups = useMemo(() => {
    const map = new Map<string, Article[]>();
    articles
      // the lead is rendered above the timeline, so it never repeats inside it
      .filter((article) => article._id !== lead?._id)
      .forEach((article) => {
        const key = bucketOf(article);
        map.set(key, [...(map.get(key) || []), article]);
      });
    return [...map.entries()].filter(([, items]) => items.length > 0);
  }, [articles, lead?._id]);
  const pagination = data?.pagination;

  return (
    <>
      <PageHeader
        eyebrow="Live feed"
        title="Latest Articles"
        description="A running timeline of everything our editors publish, newest first."
        breadcrumbs={[{ label: "Latest" }]}
      >
        <div className="mt-5 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => {
              setCategory("");
              setPage(1);
              setCollected([]);
            }}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
              !category
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-ink-200 text-ink-600 hover:border-brand-400 hover:text-brand-600 dark:border-ink-700 dark:text-ink-300"
            )}
          >
            All sections
          </button>
          {categories.map((entry) => (
            <button
              key={entry._id}
              type="button"
              onClick={() => {
                setCategory(entry.slug);
                setPage(1);
                setCollected([]);
              }}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
                category === entry.slug
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-ink-200 text-ink-600 hover:border-brand-400 hover:text-brand-600 dark:border-ink-700 dark:text-ink-300"
              )}
            >
              {entry.name}
              {typeof entry.articleCount === "number" && (
                <span className="ml-1.5 opacity-60">{entry.articleCount}</span>
              )}
            </button>
          ))}
        </div>
      </PageHeader>

      <div className="container py-8">
        {isError ? (
          <ErrorState onRetry={() => void refetch()} />
        ) : isLoading ? (
          <div className="space-y-5">
            <CardSkeleton />
            <ListSkeleton count={6} />
          </div>
        ) : articles.length === 0 ? (
          <EmptyState title="Nothing published yet" message="Check back shortly." />
        ) : (
          <div className="grid gap-8 lg:grid-cols-12">
            {/* ------------- timeline ------------- */}
            <div className="min-w-0 lg:col-span-8">
              {/* lead story */}
              {lead && (
                <article className="group card mb-6 overflow-hidden">
                  <div className="grid sm:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
                    <div className="order-2 flex flex-col justify-center gap-2.5 p-5 sm:order-1">
                      <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-flame/10 px-2.5 py-1 text-xs font-bold uppercase tracking-wider text-flame">
                        <Radio className="h-3 w-3" aria-hidden="true" />
                        Just published
                      </span>
                      <CategoryChip
                        name={categoryName(lead)}
                        href={categoryHref(lead)}
                        variant="plain"
                        className="w-fit text-xs"
                      />
                      <h2 className="font-display text-xl font-extrabold leading-snug tracking-tight text-ink-900 sm:text-2xl dark:text-white">
                        <Link to={articleHref(lead)} className="clamp-3 hover:text-brand-600">
                          {lead.title}
                        </Link>
                      </h2>
                      <p className="clamp-2 text-sm leading-relaxed text-ink-500 dark:text-ink-400">
                        {excerptOf(lead, 170)}
                      </p>
                      <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-500">
                        <span className="font-semibold">By {authorName(lead)}</span>
                        <span aria-hidden="true">•</span>
                        {formatDate(lead.publishedDate || lead.createdAt)}
                        <span aria-hidden="true">•</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock className="h-3 w-3" aria-hidden="true" />
                          {readTimeOf(lead)} min
                        </span>
                      </p>
                    </div>

                    <Link to={articleHref(lead)} className="order-1 block sm:order-2" aria-hidden="true" tabIndex={-1}>
                      <SmartImage
                        src={articleImage(lead)}
                        alt={imageAlt(lead.featuredImage, lead.title)}
                        ratio="aspect-[16/10]"
                        rounded="rounded-none"
                        width={800}
                        priority
                        imgClassName="transition-transform duration-500 group-hover:scale-[1.04]"
                      />
                    </Link>
                  </div>
                </article>
              )}

              {/* grouped timeline */}
              <div className="space-y-7">
                {groups.map(([label, items]) => (
                  <section key={label} aria-label={label}>
                    <div className="mb-3 flex items-center gap-3">
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-ink-900 px-3 py-1 text-xs font-bold uppercase tracking-wider text-white dark:bg-white dark:text-ink-900">
                        <CalendarDays className="h-3 w-3" aria-hidden="true" />
                        {label}
                      </span>
                      <span className="h-px flex-1 bg-ink-200 dark:bg-ink-800" />
                      <span className="text-xs font-semibold text-ink-400">
                        {items.length} {items.length === 1 ? "story" : "stories"}
                      </span>
                    </div>

                    <ol className="relative space-y-0 border-l border-ink-200 pl-4 dark:border-ink-800">
                      {items.map((article) => (
                          <li key={article._id} className="relative py-3">
                            <span className="absolute -left-[21px] top-6 h-2 w-2 rounded-full bg-brand-500 ring-4 ring-white dark:ring-[#0b1120]" />

                            <article className="group flex gap-3">
                              <Link
                                to={articleHref(article)}
                                className="block w-[92px] shrink-0 sm:w-[116px]"
                                tabIndex={-1}
                                aria-hidden="true"
                              >
                                <SmartImage
                                  src={articleImage(article)}
                                  alt=""
                                  ratio="aspect-square"
                                  rounded="rounded-xl"
                                  width={280}
                                  imgClassName="transition-transform duration-500 group-hover:scale-[1.05]"
                                />
                              </Link>

                              <div className="min-w-0 flex-1">
                                <CategoryChip
                                  name={categoryName(article)}
                                  href={categoryHref(article)}
                                  variant="plain"
                                  className="text-xs"
                                />
                                <h3 className="mt-0.5 font-display text-sm font-bold leading-snug tracking-tight text-ink-900 dark:text-white">
                                  <Link to={articleHref(article)} className="clamp-2 hover:text-brand-600">
                                    {article.title}
                                  </Link>
                                </h3>
                                <p className="clamp-1 mt-1 text-[13px] text-ink-500 dark:text-ink-400">
                                  {excerptOf(article, 110)}
                                </p>
                                <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-ink-400">
                                  <span>{formatDate(article.publishedDate || article.createdAt)}</span>
                                  <span aria-hidden="true">•</span>
                                  <span className="inline-flex items-center gap-1">
                                    <Clock className="h-3 w-3" aria-hidden="true" />
                                    {readTimeOf(article)} min
                                  </span>
                                  {(article.views || 0) > 0 && (
                                    <>
                                    </>
                                  )}
                                </p>
                              </div>
                            </article>
                          </li>
                      ))}
                    </ol>
                  </section>
                ))}
              </div>

              {pagination && pagination.page < pagination.pages && (
                <button
                  type="button"
                  onClick={() => {
                    setCollected(articles);
                    setPage((prev) => prev + 1);
                  }}
                  disabled={isFetching}
                  className="mt-8 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-ink-200 text-sm font-bold text-ink-700 transition-colors hover:border-brand-400 hover:text-brand-600 disabled:opacity-60 dark:border-ink-700 dark:text-ink-200"
                >
                  {isFetching && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  Load more stories
                  <span className="text-ink-400">
                    ({articles.length} of {pagination.total})
                  </span>
                </button>
              )}
            </div>

            {/* ------------- sidebar ------------- */}
            <aside className="min-w-0 lg:col-span-4">
              <div className="space-y-5 lg:sticky lg:top-28">
                <section className="card p-4">
                  <h2 className="font-display text-sm font-bold text-ink-900 dark:text-white">
                    Publishing pace
                  </h2>
                  <dl className="mt-3 space-y-2 text-[13px]">
                    {groups.slice(0, 4).map(([label, items]) => (
                      <div key={label} className="flex items-center justify-between gap-3">
                        <dt className="text-ink-500 dark:text-ink-400">{label}</dt>
                        <dd className="font-bold text-ink-900 dark:text-white">{items.length}</dd>
                      </div>
                    ))}
                    {pagination && (
                      <div className="flex items-center justify-between gap-3 border-t border-ink-100 pt-2 dark:border-ink-800">
                        <dt className="text-ink-500 dark:text-ink-400">Total published</dt>
                        <dd className="font-bold text-ink-900 dark:text-white">{pagination.total}</dd>
                      </div>
                    )}
                  </dl>
                </section>

                <section className="card p-4">
                  <h2 className="font-display text-sm font-bold text-ink-900 dark:text-white">
                    Jump to a section
                  </h2>
                  <ul className="mt-3 space-y-1.5">
                    {categories.slice(0, 8).map((entry) => (
                      <li key={entry._id}>
                        <Link
                          to={`/category/${entry.slug}`}
                          className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-ink-700 transition-colors hover:bg-brand-50 hover:text-brand-700 dark:text-ink-200 dark:hover:bg-brand-500/10"
                        >
                          <span className="clamp-1">{entry.name}</span>
                          <span className="shrink-0 text-xs font-bold text-ink-400">
                            {entry.articleCount ?? 0}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>

                <NewsletterCard source="latest-page" layout="compact" />

                <AdSlot position="sidebar" ratio="aspect-[300/250]" />
              </div>
            </aside>
          </div>
        )}
      </div>
    </>
  );
}
