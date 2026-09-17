import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BookmarkCheck,
  Flame,
  Newspaper,
  Sparkles,
  Star,
  TrendingUp,
} from "lucide-react";
import { Hero } from "@/components/home/Hero";
import { TrendingTopics } from "@/components/home/TrendingTopics";
import { CategoryGrid } from "@/components/home/CategoryGrid";
import { GallerySection } from "@/components/home/GallerySection";
import { StorySlider } from "@/components/home/StorySlider";
import { CategorySections } from "@/components/home/CategorySections";
import { AdSlot } from "@/components/ads/AdSlot";
import { NewsletterCard } from "@/components/ui/Newsletter";
import { CategoryChip, PanelHeader, SectionHeader } from "@/components/ui/Bits";
import { SmartImage } from "@/components/ui/SmartImage";
import { CardSkeleton, ListSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { ErrorState } from "@/components/ui/States";
import {
  ArticleListRow,
  ArticleRankRow,
  ArticleTileCard,
  ArticleWideRow,
} from "@/components/ArticleCard";
import { useArticles, useCategories, useHomeFeed, useHomepageConfig } from "@/hooks/useContent";
import type { Article, HomepageSectionKey, HomepageSections } from "@/types/api";
import { useSeo } from "@/hooks/useSeo";
import {
  articleHref,
  articleImage,
  categoryHref,
  categoryName,
  dedupeArticles,
  excerptOf,
} from "@/lib/utils";
import { SITE_URL } from "@/lib/api";

/**
 * Resolves one homepage rail.
 *
 * A section left on `auto` behaves exactly as it always has — the live feed,
 * with the backfill behind it. Switched to `manual` in the panel, it renders
 * the stories that were pinned there, in that order, and falls back to the
 * feed only for slots the editor left empty so the block is never half a row.
 */
function resolveRail(sections: HomepageSections | undefined, key: HomepageSectionKey, auto: Article[], count: number) {
  const rail = sections?.[key];
  if (rail?.enabled === false) return [];
  if (rail?.mode !== "manual") return auto.slice(0, count);

  const pinned = (rail.items || []).filter(
    (item): item is Article => Boolean(item) && typeof item === "object" && "_id" in item
  );
  const pinnedIds = new Set(pinned.map((article) => article._id));
  const filler = auto.filter((article) => !pinnedIds.has(article._id));

  return [...pinned, ...filler].slice(0, count);
}

export default function Home() {
  const { data: feed, isLoading, isError, refetch } = useHomeFeed();
  const { data: categories = [], isLoading: catsLoading } = useCategories({
    withCounts: true,
    withCover: true,
  });
  // Its own query keeps the closing grid full even when the feed rails have
  // already consumed every article they returned.
  const { data: morePage } = useArticles({ sort: "latest", limit: 24 });
  // Editor-curated layout settings (the gallery block and its optional rail).
  const { data: homepageConfig, isLoading: configLoading } = useHomepageConfig();

  useSeo({
    title: undefined,
    description:
      "TheTrendSnap — breaking news, in-depth reviews, practical guides and the trends shaping tomorrow.",
    jsonLd: useMemo(
      () => ({
        "@context": "https://schema.org",
        "@type": "WebSite",
        name: "TheTrendSnap",
        url: SITE_URL,
        potentialAction: {
          "@type": "SearchAction",
          target: `${SITE_URL}/search?q={search_term_string}`,
          "query-input": "required name=search_term_string",
        },
      }),
      []
    ),
  });

  const pool = useMemo(
    () =>
      feed
        ? dedupeArticles(
            feed.hero ? [feed.hero] : [],
            feed.featured,
            feed.editorsPick,
            feed.trending,
            feed.latest,
            feed.dontMiss,
            feed.popular
          )
        : [],
    [feed]
  );

  if (isError) {
    return (
      <div className="container py-16">
        <ErrorState
          title="We can't reach the newsroom"
          message="The article service didn't respond. Check your connection and try again."
          onRetry={() => void refetch()}
        />
      </div>
    );
  }

  // Curated rails from Homepage layout; anything left on auto reads exactly
  // as it did before this existed.
  const sections = homepageConfig?.sections;

  // Hero playlist: the curated lead first, then the newest stories, capped at
  // five so the rotation stays short enough to see the whole loop.
  const heroAuto = feed
    ? dedupeArticles(feed.hero ? [feed.hero] : [], feed.latest, feed.trending)
    : [];
  const heroSlides = resolveRail(sections, "hero", heroAuto, 5);
  const slideIds = new Set(heroSlides.map((article) => article._id));

  // The rail sits beside the hero, so it must not repeat what the hero is
  // already cycling through.
  const heroRailAuto = feed
    ? dedupeArticles(feed.breaking, feed.trending, feed.latest).filter(
        (article) => !slideIds.has(article._id)
      )
    : [];
  const heroRail = resolveRail(sections, "heroRail", heroRailAuto, 4);
  /*
   * Rail lengths for the two panelled rows.
   *
   * Featured runs two across, so four fills exactly two rows and the panel
   * ends square. Six each in the columns either side of it — and six again in
   * Don't Miss — keeps every panel in the row about the same height, which is
   * what stops one column from stretching its rows apart to catch up with a
   * longer neighbour.
   */
  const featured = resolveRail(sections, "featured", feed?.featured ?? [], 4);
  const editorsPick = resolveRail(sections, "editorsPicks", feed?.editorsPick ?? [], 6);
  const popular = resolveRail(sections, "popular", feed?.popular ?? [], 6);
  // Two apiece: the row keeps its original 7 / 5 shape and its two cards, it
  // just carries fewer stories than it used to.
  const latest = resolveRail(sections, "latest", feed?.latest ?? [], 2);
  // A lead card plus one headline under it.
  const dontMiss = resolveRail(sections, "dontMiss", feed?.dontMiss ?? [], 2);

  // "More Stories" shows only what no other rail used, so nothing repeats.
  const shown = new Set(
    [
      heroSlides,
      heroRail,
      featured,
      editorsPick,
      popular,
      latest,
      dontMiss,
    ]
      .flat()
      .map((article) => article._id)
  );
  const leftovers = dedupeArticles(
    pool.filter((article) => !shown.has(article._id)),
    (morePage?.data ?? []).filter((article) => !shown.has(article._id))
  );
  // Ten in the closing slider: five sit in view on a desktop row and the rest
  // are what the arrows scroll to.
  const moreStories = resolveRail(sections, "moreStories", leftovers, 10);

  return (
    <div className="container space-y-8 py-5 sm:py-6">
      {/* Leaderboard above the fold — collapses entirely when unsold. */}
      <AdSlot position="home-top" />

      {/* hero and the trending rail read as one block — no gap between them */}
      <div className="space-y-3">
        <Hero articles={heroSlides} rail={heroRail} loading={isLoading} />

        {/* Billboard tied to the hero — sits between the hero and the trending
            strip, and collapses with the block when unsold. */}
        <AdSlot position="home-hero" ratio="aspect-[1200/200]" />

        <TrendingTopics
          categories={categories}
          articles={pool}
          loading={isLoading || catsLoading}
        />
      </div>

      {/* ---------------- gallery ---------------- */}
      <GallerySection
        gallery={homepageConfig?.gallery}
        articles={pool}
        loading={isLoading || configLoading}
      />

      {/* ---------------- three-column editorial block ---------------- */}
      <section className="grid gap-4 lg:grid-cols-12">
        {/* Editor's Picks */}
        {(isLoading || editorsPick.length > 0) && (
        <div className="card flex flex-col overflow-hidden lg:col-span-3">
          <PanelHeader
            icon={<Star className="h-4 w-4 text-amber-500" aria-hidden="true" />}
            title="Editor's Picks"
          />
          <div className="flex flex-1 flex-col divide-y divide-ink-100 px-4 dark:divide-ink-800">
            {isLoading ? (
              <ListSkeleton count={6} />
            ) : (
              editorsPick.map((article) => (
                <div key={article._id} className="flex flex-1 flex-col justify-center">
                  <ArticleListRow article={article} dense />
                </div>
              ))
            )}
          </div>
          <Link
            to="/latest"
            className="link-action justify-center border-t border-ink-100 py-3 hover:bg-ink-50 dark:border-ink-800 dark:hover:bg-ink-800/40"
          >
            View all
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>
        )}

        {/* Featured Articles */}
        {(isLoading || featured.length > 0) && (
        <div className="card flex flex-col overflow-hidden lg:col-span-5">
          <PanelHeader
            icon={<Sparkles className="h-4 w-4 text-brand-500" aria-hidden="true" />}
            title="Featured Articles"
            action="See all"
            actionHref="/trending"
          />
          <div className="grid flex-1 grid-cols-2 gap-3 p-3 sm:gap-3.5 sm:p-3.5">
            {isLoading
              ? Array.from({ length: 4 }).map((_, index) => <CardSkeleton key={index} />)
              : featured.map((article, index) => (
                  <ArticleTileCard
                    key={article._id}
                    article={article}
                    // Landscape frames: four square tiles two across would
                    // stand a head taller than the columns either side of them
                    // and pull the whole row out of proportion.
                    ratio="aspect-[4/3]"
                    priority={index < 2}
                    compact
                  />
                ))}
          </div>
        </div>
        )}

        {/* Popular Now — the column also carries the newsletter and the ads,
            so it stays even when the ranking itself is switched off. */}
        <div className="flex flex-col gap-4 lg:col-span-4">
          {(isLoading || popular.length > 0) && (
          <div className="card flex flex-1 flex-col overflow-hidden">
            <PanelHeader
              icon={<TrendingUp className="h-4 w-4 text-emerald-500" aria-hidden="true" />}
              title="Popular Now"
            />
            <div className="flex flex-1 flex-col divide-y divide-ink-100 px-4 dark:divide-ink-800">
              {isLoading ? (
                <ListSkeleton count={6} />
              ) : (
                popular.map((article, index) => (
                  <div key={article._id} className="flex flex-1 flex-col justify-center">
                    <ArticleRankRow article={article} rank={index + 1} dense />
                  </div>
                ))
              )}
            </div>
            <Link
              to="/popular"
              className="link-action mt-auto justify-center border-t border-ink-100 py-3 hover:bg-ink-50 dark:border-ink-800 dark:hover:bg-ink-800/40"
            >
              View all
              <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
            </Link>
          </div>
          )}

          <NewsletterCard source="home-sidebar" layout="compact" />

          <AdSlot position="sidebar" ratio="aspect-[300/250]" className="hidden lg:block" />

          {/* Half-page unit that follows the column; desktop only, because a
              sticky rail on a phone would cover the article list. */}
          <AdSlot
            position="sidebar-sticky"
            ratio="aspect-[300/600]"
            className="hidden lg:block lg:sticky lg:top-24"
          />
        </div>
      </section>

      {/* Banner ahead of the curated section blocks. */}
      <AdSlot position="home-mid" />

      {/* Editor-configured category blocks, in the order they were added. */}
      <CategorySections
        sections={homepageConfig?.categorySections}
        loading={configLoading}
      />

      <CategoryGrid categories={categories} articles={pool} loading={isLoading || catsLoading} />

      {/* ---------------- latest + don't miss ---------------- */}
      {/* The original 7 / 5 split, unchanged — only the number of stories in
          each column came down. */}
      <section className="grid gap-5 lg:grid-cols-12">
        {(isLoading || latest.length > 0) && (
          <div className="card flex flex-col overflow-hidden lg:col-span-7">
            <PanelHeader
              icon={<Newspaper className="h-4 w-4 text-brand-500" aria-hidden="true" />}
              title="Latest Articles"
              action="View all"
              actionHref="/latest"
            />
            <div className="flex flex-1 flex-col divide-y divide-ink-100 px-4 dark:divide-ink-800">
              {isLoading ? (
                <ListSkeleton count={2} />
              ) : (
                latest.map((article) => (
                  <div key={article._id} className="flex flex-1 flex-col justify-center">
                    <ArticleWideRow article={article} dense />
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {(isLoading || dontMiss.length > 0) && (
          <div className="card flex flex-col overflow-hidden lg:col-span-5">
            <PanelHeader
              icon={<BookmarkCheck className="h-4 w-4 text-flame" aria-hidden="true" />}
              title="Don't Miss"
              action="More"
              actionHref="/trending"
            />

            <div className="flex flex-1 flex-col p-4">
              {isLoading ? (
                <>
                  <Skeleton className="h-28 rounded-xl" />
                  <ListSkeleton count={1} />
                </>
              ) : (
                <>
                  {/* lead item — smaller, laid out sideways so it reads as the
                      section's anchor without swallowing the column */}
                  {dontMiss[0] && (
                    <article className="group relative mb-3 flex gap-3.5 rounded-xl border border-ink-100 bg-ink-50/60 p-2.5 transition-colors hover:border-brand-300 dark:border-ink-800 dark:bg-ink-800/40">
                      <div className="relative w-[104px] shrink-0 sm:w-[118px]">
                        <SmartImage
                          src={articleImage(dontMiss[0])}
                          alt=""
                          ratio="aspect-square"
                          rounded="rounded-lg"
                          width={320}
                          imgClassName="transition-transform duration-500 group-hover:scale-[1.05]"
                        />
                        <span className="absolute left-1.5 top-1.5 chip bg-flame px-2 py-0.5 text-xs text-white">
                          Featured
                        </span>
                      </div>

                      <div className="min-w-0 flex-1 py-0.5">
                        <CategoryChip
                          name={categoryName(dontMiss[0])}
                          href={categoryHref(dontMiss[0])}
                          variant="plain"
                          className="text-xs"
                        />
                        <h3 className="mt-1 font-display text-sm font-bold leading-snug tracking-tight text-ink-900 dark:text-white">
                          <Link
                            to={articleHref(dontMiss[0])}
                            className="clamp-2 hover:text-brand-600 dark:hover:text-brand-400"
                          >
                            <span className="absolute inset-0" aria-hidden="true" />
                            {dontMiss[0].title}
                          </Link>
                        </h3>
                        <p className="clamp-2 mt-1 text-[13px] leading-relaxed text-ink-500 dark:text-ink-400">
                          {excerptOf(dontMiss[0], 110)}
                        </p>
                      </div>
                    </article>
                  )}

                  <div className="flex flex-1 flex-col divide-y divide-ink-100 dark:divide-ink-800">
                    {dontMiss.slice(1).map((article) => (
                      <div key={article._id} className="flex flex-1 flex-col justify-center">
                        <ArticleListRow article={article} dense />
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </section>

      {/* In-feed unit between the editorial blocks and the closing grid. */}
      <AdSlot position="home-infeed" ratio="aspect-[970/140]" />

      {/* ---------------- more stories ---------------- */}
      {moreStories.length > 0 && (
        <section aria-labelledby="more-stories">
          <SectionHeader
            title="More Stories"
            subtitle="Everything else our editors published this week."
            action="Browse latest"
            actionHref="/latest"
          />
          <StorySlider articles={moreStories} />
        </section>
      )}

      <div className="flex items-center justify-center gap-2 rounded-2xl border border-dashed border-ink-200 px-6 py-6 text-center dark:border-ink-800">
        <Flame className="h-4 w-4 text-flame" aria-hidden="true" />
        <p className="text-sm text-ink-600 dark:text-ink-300">
          Want more?{" "}
          <Link to="/latest" className="font-bold text-brand-600 hover:underline dark:text-brand-400">
            Browse every article
          </Link>{" "}
          or{" "}
          <Link to="/categories" className="font-bold text-brand-600 hover:underline dark:text-brand-400">
            pick a category
          </Link>
          .
        </p>
      </div>

      <AdSlot position="home-bottom" />
    </div>
  );
}
