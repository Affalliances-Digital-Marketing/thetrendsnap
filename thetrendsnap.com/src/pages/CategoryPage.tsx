import { useMemo, useRef } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import {
  ArrowRight,
  CalendarClock,
  Compass,
  Flame,
  Hash,
  LayoutGrid,
  Newspaper,
  TrendingUp,
} from "lucide-react";
import type { Article, Category, NewsListQuery } from "@/types/api";
import { AdSlot } from "@/components/ads/AdSlot";
import {
  ArticleCard,
  ArticleListRow,
  ArticleMeta,
  ArticleRankRow,
} from "@/components/ArticleCard";
import { CategoryChip, Pagination, PanelHeader } from "@/components/ui/Bits";
import { NewsletterCard } from "@/components/ui/Newsletter";
import { SmartImage } from "@/components/ui/SmartImage";
import { CardSkeleton, ListSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { useArticles, useCategories, useCategory } from "@/hooks/useContent";
import { useSeo } from "@/hooks/useSeo";
import { SITE_URL } from "@/lib/api";
import {
  accentFor,
  articleHref,
  articleImage,
  categoryName,
  cn,
  excerptOf,
  imageUrl,
  optimizedImage,
  timeAgo,
} from "@/lib/utils";

const PER_PAGE = 12;
/**
 * Lead story plus the five headlines beside it. Six is not arbitrary: it
 * leaves six for the grid below, which fills three even rows of two rather
 * than ending on a single orphan card.
 */
const SPOTLIGHT_COUNT = 6;

type Sort = NonNullable<NewsListQuery["sort"]>;

const SORTS: Array<{ value: Sort; label: string }> = [
  { value: "latest", label: "Latest" },
  { value: "popular", label: "Most read" },
  { value: "oldest", label: "Oldest" },
  { value: "title", label: "A–Z" },
];

/* ------------------------------------------------------------------ */
/* Hero                                                                */
/* ------------------------------------------------------------------ */

/**
 * Masthead for the category.
 *
 * These categories carry no artwork of their own, so the backdrop is borrowed
 * from the newest story that has a picture and pushed far behind a scrim — it
 * gives the band a subject without competing with the type in front of it.
 */
function CategoryHero({
  category,
  total,
  updatedAt,
  backdrop,
  siblings,
}: {
  category: Category;
  total: number;
  updatedAt?: string;
  backdrop: string;
  siblings: Category[];
}) {
  const accent = accentFor(category.name);

  const facts = [
    { icon: Newspaper, label: `${total} ${total === 1 ? "story" : "stories"}` },
    updatedAt ? { icon: CalendarClock, label: `Updated ${timeAgo(updatedAt)}` } : null,
    // No read counts anywhere on the site — the stat row carries what the
    // section is and when it last moved.

  ].filter(Boolean) as Array<{ icon: typeof Newspaper; label: string }>;

  return (
    <header className="relative isolate overflow-hidden border-b border-ink-200 bg-ink-50 dark:border-ink-800 dark:bg-ink-900">
      {backdrop && (
        <img
          src={optimizedImage(backdrop, 1600)}
          alt=""
          aria-hidden="true"
          // Fainter in light mode: the scrim over it is pale, so the same
          // opacity that reads as texture on black would read as haze here.
          className="absolute inset-0 h-full w-full scale-110 object-cover opacity-20 blur-[2px] dark:opacity-40"
          loading="eager"
          decoding="async"
        />
      )}
      {/* Two scrims: one flattens the photo, one keeps the left edge — where
          every line of type starts — solid whatever the picture does. Both
          invert with the theme, so the band belongs to the page it sits on. */}
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-br from-white/95 via-ink-50/85 to-brand-50/80 dark:from-ink-950/95 dark:via-ink-900/85 dark:to-brand-900/70"
      />
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/40 to-transparent dark:from-ink-950/90 dark:via-ink-950/40 dark:to-transparent"
      />

      <div className="container relative py-10 sm:py-12">
        <nav
          aria-label="Breadcrumb"
          className="flex flex-wrap items-center gap-1.5 text-xs font-medium text-ink-500 dark:text-white/80"
        >
          <Link to="/" className="transition-colors hover:text-brand-600 dark:hover:text-white">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <Link
            to="/categories"
            className="transition-colors hover:text-brand-600 dark:hover:text-white"
          >
            Categories
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-ink-700 dark:text-white/80">{category.name}</span>
        </nav>

        <div className="mt-4 grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-8">
            <span
              className={cn(
                "chip bg-white/80 ring-1 ring-inset ring-ink-200 backdrop-blur dark:bg-white/10 dark:ring-white/20",
                accent.text
              )}
            >
              <Compass className="h-3.5 w-3.5" aria-hidden="true" />
              Category
            </span>

            <h1 className="mt-3 font-display text-4xl font-extrabold leading-[1.05] tracking-tight text-ink-900 sm:text-5xl dark:text-white">
              {category.name}
            </h1>

            {(category.description || total > 0) && (
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-ink-600 dark:text-white/80">
                {category.description ||
                  `Every story we publish about ${category.name}, newest first.`}
              </p>
            )}

            {facts.length > 0 && (
              <dl className="mt-5 flex flex-wrap items-center gap-x-2 gap-y-2">
                {facts.map(({ icon: Icon, label }) => (
                  <div
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-xs font-semibold text-ink-700 ring-1 ring-inset ring-ink-200 backdrop-blur dark:bg-white/10 dark:text-white/80 dark:ring-white/15"
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    <dd>{label}</dd>
                  </div>
                ))}
              </dl>
            )}
          </div>

          {/* Sibling categories, so a reader who landed on the wrong one can
              leave without scrolling to the footer. */}
          {siblings.length > 0 && (
            <div className="lg:col-span-4">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-ink-400 dark:text-white/50">
                Jump to
              </p>
              <div className="mt-2.5 flex flex-wrap gap-1.5">
                {siblings.slice(0, 6).map((sibling) => (
                  <Link
                    key={sibling._id}
                    to={`/category/${sibling.slug}`}
                    className="inline-flex items-center gap-1.5 rounded-full bg-white/85 px-3 py-1.5 text-xs font-semibold text-ink-600 ring-1 ring-inset ring-ink-200 backdrop-blur transition-colors hover:border-brand-300 hover:bg-white hover:text-brand-600 dark:bg-white/10 dark:text-white/80 dark:ring-white/15 dark:hover:bg-white/20 dark:hover:text-white"
                  >
                    {sibling.name}
                    {typeof sibling.articleCount === "number" && sibling.articleCount > 0 && (
                      <span className="text-ink-400 dark:text-white/45">{sibling.articleCount}</span>
                    )}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Spotlight                                                           */
/* ------------------------------------------------------------------ */

/** Lead story: landscape on desktop so the picture carries the page opening. */
function LeadStory({ article }: { article: Article }) {
  return (
    <article className="card group grid h-full overflow-hidden lg:min-h-[360px] lg:grid-cols-2">
      <Link
        to={articleHref(article)}
        className="relative block overflow-hidden lg:h-full"
        tabIndex={-1}
        aria-hidden="true"
      >
        <SmartImage
          src={articleImage(article)}
          alt=""
          ratio="aspect-[16/10] lg:aspect-auto lg:h-full"
          rounded="rounded-none"
          width={1100}
          priority
          imgClassName="transition-transform duration-700 group-hover:scale-[1.04]"
        />
        <span className="chip absolute left-3 top-3 bg-flame px-2.5 py-1 text-xs text-white shadow-sm">
          <Flame className="h-3 w-3" aria-hidden="true" />
          Top story
        </span>
      </Link>

      <div className="flex flex-col justify-center gap-3 p-5 sm:p-7">
        <CategoryChip name={categoryName(article)} variant="plain" className="w-fit" />

        <h2 className="font-display text-2xl font-extrabold leading-tight tracking-tight text-ink-900 sm:text-3xl dark:text-white">
          <Link
            to={articleHref(article)}
            className="clamp-3 transition-colors hover:text-brand-600 dark:hover:text-brand-400"
          >
            {article.title}
          </Link>
        </h2>

        <p className="clamp-3 text-sm leading-relaxed text-ink-500 dark:text-ink-400">
          {excerptOf(article, 220)}
        </p>

        <ArticleMeta article={article} showAuthor className="mt-1" />

        <Link
          to={articleHref(article)}
          className="mt-2 inline-flex w-fit items-center gap-1.5 rounded-full bg-brand-600 px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-brand-700"
        >
          Read story
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Sidebar pieces                                                      */
/* ------------------------------------------------------------------ */

function Panel({
  title,
  icon,
  action,
  actionHref,
  children,
}: {
  title: string;
  icon?: React.ReactNode;
  action?: string;
  actionHref?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card overflow-hidden">
      <PanelHeader title={title} icon={icon} action={action} actionHref={actionHref} />
      <div className="px-4 py-1">{children}</div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* Page                                                                */
/* ------------------------------------------------------------------ */

export default function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const [params, setParams] = useSearchParams();
  const storiesRef = useRef<HTMLDivElement | null>(null);

  const sort = (SORTS.find((entry) => entry.value === params.get("sort"))?.value ??
    "latest") as Sort;
  const page = Math.max(1, Number(params.get("page")) || 1);

  const { data: category, isLoading: categoryLoading } = useCategory(slug);
  const { data: categories = [] } = useCategories({ withCounts: true });

  const feed = useArticles(
    { category: slug, sort, page, limit: PER_PAGE },
    Boolean(slug)
  );
  // Its own ranking, so the rail stays useful on page four of the listing.
  // Over-fetched because the spotlight's stories are dropped from it below.
  const mostRead = useArticles(
    { category: slug, sort: "popular", limit: 10 },
    Boolean(slug)
  );

  const articles = feed.data?.data ?? [];
  const pagination = feed.data?.pagination;
  const total = pagination?.total ?? category?.articleCount ?? 0;

  /** Newest picture in the category — the hero backdrop and nothing else. */
  const backdrop = useMemo(() => {
    const own = imageUrl(category?.banner) || imageUrl(category?.image) || imageUrl(category?.coverImage);
    if (own) return own;
    return articles.map(articleImage).find(Boolean) || "";
  }, [category, articles]);

  const updatedAt = useMemo(
    () =>
      articles
        .map((article) => article.publishedDate || article.createdAt)
        .filter(Boolean)
        .sort()
        .pop(),
    [articles]
  );


  /** Tag cloud built from what is actually on the page — no extra request. */
  const topics = useMemo(() => {
    const counts = new Map<string, { label: string; slug: string; count: number }>();
    articles.forEach((article) => {
      (article.tags || []).forEach((tag) => {
        if (typeof tag === "string") return;
        const key = tag.slug || tag.name;
        if (!key) return;
        const entry = counts.get(key) || { label: tag.name, slug: tag.slug || key, count: 0 };
        entry.count += 1;
        counts.set(key, entry);
      });
      (article.tagNames || []).forEach((name) => {
        const key = name.toLowerCase();
        if (counts.has(key)) return;
        counts.set(key, { label: name, slug: key, count: 1 });
      });
    });
    return [...counts.values()].sort((a, b) => b.count - a.count).slice(0, 12);
  }, [articles]);

  const siblings = useMemo(
    () => categories.filter((entry) => entry.slug !== slug),
    [categories, slug]
  );

  // The spotlight is the head of whatever ordering is active, so it always
  // means "the story this page is leading with" — never a second ranking.
  const spotlight = page === 1 ? articles.slice(0, SPOTLIGHT_COUNT) : [];
  const grid = page === 1 ? articles.slice(SPOTLIGHT_COUNT) : articles;
  // A category with no more stories than the spotlight holds would otherwise
  // print "All stories" over an empty row.
  const showListing = grid.length > 0 || (pagination?.pages ?? 1) > 1;

  // A headline the reader has already passed twice on the way down the page
  // adds nothing to the rail, so the spotlight's stories are dropped from it.
  const spotlightIds = new Set(spotlight.map((article) => article._id));
  const mostReadList = (mostRead.data?.data ?? [])
    .filter((article) => !spotlightIds.has(article._id))
    .slice(0, 5);

  useSeo({
    title: category?.metaTitle || category?.seoTitle || category?.name,
    description:
      category?.metaDescription ||
      category?.seoDescription ||
      category?.description ||
      `Latest ${category?.name || "news"} articles on TheTrendSnap.`,
    image: imageUrl(category?.ogImage) || backdrop,
    canonical: slug ? `${SITE_URL}/category/${slug}` : undefined,
    jsonLd: useMemo(() => {
      if (!category) return undefined;
      return {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: category.name,
        description: category.description,
        url: `${SITE_URL}/category/${category.slug}`,
        breadcrumb: {
          "@type": "BreadcrumbList",
          itemListElement: [
            { "@type": "ListItem", position: 1, name: "Home", item: SITE_URL },
            { "@type": "ListItem", position: 2, name: "Categories", item: `${SITE_URL}/categories` },
            {
              "@type": "ListItem",
              position: 3,
              name: category.name,
              item: `${SITE_URL}/category/${category.slug}`,
            },
          ],
        },
        mainEntity: {
          "@type": "ItemList",
          numberOfItems: articles.length,
          itemListElement: articles.map((article, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: article.title,
            url: `${SITE_URL}${articleHref(article)}`,
          })),
        },
      };
    }, [category, articles]),
  });

  const patch = (next: { sort?: Sort; page?: number }) => {
    const merged = new URLSearchParams(params);
    if (next.sort) {
      merged.set("sort", next.sort);
      merged.delete("page"); // a new ordering starts at the top of the list
    }
    if (next.page !== undefined) {
      if (next.page <= 1) merged.delete("page");
      else merged.set("page", String(next.page));
    }
    setParams(merged, { replace: false });
  };

  const changePage = (next: number) => {
    patch({ page: next });
    // Back to the head of the listing rather than the top of the page, so the
    // reader keeps the context of which category they are paging through.
    storiesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  if (categoryLoading) return <CategorySkeleton />;

  if (!category) {
    return (
      <div className="container py-16">
        <EmptyState
          title="Category not found"
          message="This category may have been renamed or removed."
          actionLabel="Browse categories"
          actionHref="/categories"
        />
      </div>
    );
  }

  return (
    <>
      <CategoryHero
        category={category}
        total={total}
        updatedAt={updatedAt}
        backdrop={backdrop}
        siblings={siblings}
      />

      <div className="container space-y-8 py-8">
        <AdSlot position="category-top" />

        {/* ---------------- spotlight ---------------- */}
        {feed.isLoading ? (
          <SpotlightSkeleton />
        ) : (
          spotlight.length > 0 && (
            <section aria-label={`Leading ${category.name} stories`} className="grid gap-4 lg:grid-cols-12">
              <div className="lg:col-span-8">
                <LeadStory article={spotlight[0]} />
              </div>

              {spotlight.length > 1 && (
                <div className="card flex flex-col overflow-hidden lg:col-span-4">
                  <PanelHeader
                    title="Also in this category"
                    icon={<LayoutGrid className="h-4 w-4 text-brand-500" aria-hidden="true" />}
                  />
                  <div className="flex flex-1 flex-col divide-y divide-ink-100 px-4 dark:divide-ink-800">
                    {spotlight.slice(1).map((article) => (
                      <div key={article._id} className="flex flex-1 flex-col justify-center">
                        <ArticleListRow article={article} showCategory={false} dense />
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </section>
          )
        )}

        {/* ---------------- listing + rail ---------------- */}
        <div ref={storiesRef} className="grid gap-6 lg:grid-cols-12 lg:gap-7">
          <div className={cn("min-w-0 lg:col-span-8", !showListing && "hidden lg:block")}>
            {showListing && (
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
              <div>
                <h2 className="font-display text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl dark:text-white">
                  {page > 1 ? `More stories · page ${page}` : `All ${category.name} stories`}
                </h2>
                {pagination && pagination.total > 0 && (
                  <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
                    Showing {(pagination.page - 1) * pagination.limit + 1}–
                    {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                    {pagination.total}
                  </p>
                )}
              </div>

              <div
                role="group"
                aria-label="Sort stories"
                className="flex items-center gap-1 rounded-xl border border-ink-200 p-1 dark:border-ink-700"
              >
                {SORTS.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => patch({ sort: option.value })}
                    aria-pressed={sort === option.value}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
                      sort === option.value
                        ? "bg-brand-600 text-white"
                        : "text-ink-500 hover:text-brand-600 dark:text-ink-400"
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
            )}

            {feed.isError ? (
              <ErrorState onRetry={() => void feed.refetch()} />
            ) : feed.isLoading ? (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <CardSkeleton key={index} />
                ))}
              </div>
            ) : articles.length === 0 ? (
              <EmptyState
                title={`No ${category.name} stories yet`}
                message="We're working on it — check back soon or browse another category."
                actionLabel="Browse categories"
                actionHref="/categories"
              />
            ) : !showListing ? null : (
              <>
                <div
                  className={cn(
                    "grid gap-5 transition-opacity sm:grid-cols-2 xl:grid-cols-3",
                    feed.isFetching && "opacity-60"
                  )}
                >
                  {grid.map((article, index) => (
                    <ArticleCard key={article._id} article={article} priority={index < 2} />
                  ))}
                </div>

                {/* Between the grid and the pager, where it interrupts nothing. */}
                <AdSlot position="category-infeed" className="mt-6" />

                {pagination && (
                  <Pagination
                    page={pagination.page}
                    pages={pagination.pages}
                    onChange={changePage}
                  />
                )}
              </>
            )}
          </div>

          {/* ---------------- rail ---------------- */}
          <aside className="min-w-0 space-y-5 lg:col-span-4">
            <div className="space-y-5 lg:sticky lg:top-24">
              <Panel
                title="Most read here"
                icon={<TrendingUp className="h-4 w-4 text-emerald-500" aria-hidden="true" />}
              >
                {mostRead.isLoading ? (
                  <ListSkeleton count={5} />
                ) : mostReadList.length === 0 ? (
                  <p className="py-4 text-sm text-ink-500 dark:text-ink-400">
                    Nothing else has enough reads yet.
                  </p>
                ) : (
                  <div className="divide-y divide-ink-100 dark:divide-ink-800">
                    {mostReadList.map((article, index) => (
                      <ArticleRankRow key={article._id} article={article} rank={index + 1} dense />
                    ))}
                  </div>
                )}
              </Panel>

              {topics.length > 0 && (
                <section className="card overflow-hidden">
                  <PanelHeader
                    title="Topics on this page"
                    icon={<Hash className="h-4 w-4 text-brand-500" aria-hidden="true" />}
                  />
                  <div className="flex flex-wrap gap-1.5 p-4">
                    {topics.map((topic) => (
                      <Link
                        key={topic.slug}
                        to={`/tag/${topic.slug}`}
                        className="inline-flex items-center gap-1.5 rounded-full border border-ink-200 px-2.5 py-1 text-xs font-semibold text-ink-600 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-ink-700 dark:text-ink-300"
                      >
                        {topic.label}
                        <span className="text-ink-400">{topic.count}</span>
                      </Link>
                    ))}
                  </div>
                </section>
              )}

              <AdSlot position="sidebar" ratio="aspect-[300/250]" />

              <NewsletterCard source={`category-${category.slug}`} layout="compact" />

              {siblings.length > 0 && (
                <section className="card overflow-hidden">
                  <PanelHeader
                    title="Other categories"
                    icon={<Compass className="h-4 w-4 text-brand-500" aria-hidden="true" />}
                    action="See all"
                    actionHref="/categories"
                  />
                  <ul className="divide-y divide-ink-100 dark:divide-ink-800">
                    {siblings.slice(0, 7).map((sibling) => (
                      <li key={sibling._id}>
                        <Link
                          to={`/category/${sibling.slug}`}
                          className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm font-semibold text-ink-700 transition-colors hover:bg-ink-50 hover:text-brand-600 dark:text-ink-200 dark:hover:bg-ink-800/60"
                        >
                          <span className="clamp-1">{sibling.name}</span>
                          <span className="shrink-0 text-xs font-bold text-ink-400">
                            {sibling.articleCount ?? 0}
                          </span>
                        </Link>
                      </li>
                    ))}
                  </ul>
                </section>
              )}

              <AdSlot position="sidebar-sticky" ratio="aspect-[300/600]" className="hidden lg:block" />
            </div>
          </aside>
        </div>
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Skeletons — same shape as the real page, so nothing jumps on load   */
/* ------------------------------------------------------------------ */

function SpotlightSkeleton() {
  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <Skeleton className="h-[320px] rounded-2xl lg:col-span-8" />
      <div className="card overflow-hidden lg:col-span-4">
        <div className="px-4 py-3.5">
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="px-4 pb-2">
          <ListSkeleton count={4} />
        </div>
      </div>
    </div>
  );
}

function CategorySkeleton() {
  return (
    <>
      <div className="border-b border-ink-200 bg-ink-50 py-12 dark:border-ink-800 dark:bg-ink-900">
        <div className="container space-y-4">
          <Skeleton className="h-3 w-52" />
          <Skeleton className="h-11 w-80" />
          <Skeleton className="h-4 w-[28rem]" />
          <Skeleton className="h-8 w-64 rounded-full" />
        </div>
      </div>

      <div className="container space-y-8 py-8">
        <SpotlightSkeleton />
        <div className="grid gap-6 lg:grid-cols-12">
          <div className="grid gap-5 sm:grid-cols-2 lg:col-span-8 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <CardSkeleton key={index} />
            ))}
          </div>
          <div className="space-y-5 lg:col-span-4">
            <Skeleton className="h-72 rounded-2xl" />
            <Skeleton className="h-40 rounded-2xl" />
          </div>
        </div>
      </div>
    </>
  );
}
