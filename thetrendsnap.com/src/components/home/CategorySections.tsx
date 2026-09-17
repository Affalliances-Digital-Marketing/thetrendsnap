import { Link } from "react-router-dom";
import { ArrowUpRight, Flame, Layers } from "lucide-react";
import type { Article, Category, HomepageCategorySection } from "@/types/api";
import { SmartImage } from "@/components/ui/SmartImage";
import { Skeleton } from "@/components/ui/Skeleton";
import { ArticleMeta } from "@/components/ArticleCard";
import { useArticles } from "@/hooks/useContent";
import {
  articleHref,
  articleImage,
  cn,
  dedupeArticles,
  excerptOf,
  imageAlt,
} from "@/lib/utils";

/** Stories shown beside the lead in every block. */
const RAIL_COUNT = 4;

const asArticle = (value: unknown): Article | null =>
  value && typeof value === "object" && "_id" in (value as Article) ? (value as Article) : null;

const asCategory = (value: unknown): Category | null =>
  value && typeof value === "object" && "slug" in (value as Category) ? (value as Category) : null;

/* ------------------------------------------------------------------ */
/* Cards                                                               */
/* ------------------------------------------------------------------ */

/**
 * Every picture in this block is *contained*, never cropped: the whole frame
 * the editor chose is visible. What would otherwise be bare card either side
 * of it is filled by a blurred, brightened copy of the same picture, so the
 * card reads as one solid object however the artwork is shaped.
 */
const BACKDROP = "opacity-95 blur-2xl saturate-150 scale-125";

function LeadCard({ article }: { article: Article }) {
  return (
    <article className="card group relative flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-pop dark:hover:border-brand-500/40">
      <div className="relative overflow-hidden">
        <SmartImage
          src={articleImage(article)}
          alt=""
          ratio="aspect-[16/10]"
          rounded="rounded-none"
          fit="contain"
          width={1200}
          priority
          backdropClassName={BACKDROP}
          imgClassName="transition-transform duration-700 group-hover:scale-[1.03]"
        />

        {/* Sits on the artwork's own colours, so the chip reads on a white
            photograph and a dark one alike. */}
        <span className="chip absolute left-3 top-3 z-10 bg-black/55 px-2.5 py-1 text-xs text-white ring-1 ring-inset ring-white/20 backdrop-blur-md">
          <Flame className="h-3 w-3" aria-hidden="true" />
          Top story
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2.5 p-4 sm:p-5">
        <h3 className="font-display text-xl font-extrabold leading-snug tracking-tight text-ink-900 sm:text-2xl dark:text-white">
          <Link
            to={articleHref(article)}
            className="clamp-2 transition-colors hover:text-brand-600 dark:hover:text-brand-400"
          >
            <span className="absolute inset-0" aria-hidden="true" />
            {article.title}
          </Link>
        </h3>

        <p className="clamp-2 text-sm leading-relaxed text-ink-500 dark:text-ink-400">
          {excerptOf(article, 190)}
        </p>

        <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
          <ArticleMeta article={article} showAuthor />
          <span className="inline-flex items-center gap-1 text-xs font-bold text-brand-600 transition-transform group-hover:translate-x-0.5 dark:text-brand-400">
            Read story
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>
      </div>
    </article>
  );
}

/**
 * One of the four beside the lead.
 *
 * A picture on top of its headline rather than beside it: at this width a
 * thumbnail leaves the card mostly empty, while a full-width frame fills it
 * and still shows the whole image.
 */
function RailCard({ article }: { article: Article }) {
  return (
    <article className="card group relative flex h-full flex-col overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:border-brand-300 hover:shadow-pop dark:hover:border-brand-500/40">
      <div className="relative overflow-hidden">
        <SmartImage
          src={articleImage(article)}
          alt={imageAlt(article.featuredImage, article.title)}
          ratio="aspect-[4/3]"
          rounded="rounded-none"
          fit="contain"
          width={520}
          backdropClassName={BACKDROP}
          imgClassName="transition-transform duration-700 group-hover:scale-[1.04]"
        />
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3">
        <h4 className="font-display text-sm font-bold leading-snug tracking-tight text-ink-900 sm:text-sm dark:text-white">
          <Link
            to={articleHref(article)}
            className="clamp-3 transition-colors group-hover:text-brand-600 dark:group-hover:text-brand-400"
          >
            <span className="absolute inset-0" aria-hidden="true" />
            {article.title}
          </Link>
        </h4>
        <ArticleMeta article={article} className="mt-auto text-xs" compact />
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* One configured block                                                */
/* ------------------------------------------------------------------ */

/** The block sits on a panel, so each section reads as one object on the page. */
const PANEL =
  "rounded-2xl border border-ink-200 bg-ink-50/70 p-3 shadow-card sm:p-4 dark:border-ink-800 dark:bg-ink-900/50";

function CategoryBlock({
  section,
  index,
}: {
  section: HomepageCategorySection;
  /** Alternates which side the lead sits on, so a run of blocks has rhythm. */
  index: number;
}) {
  const category = asCategory(section.category);
  const curatedLead = asArticle(section.trending);
  const curatedRail = (section.subTrending || []).map(asArticle).filter(Boolean) as Article[];

  // The editor picks what matters and the rest fills itself in from the same
  // category, so a half-configured block still renders as a full one.
  const short = !curatedLead || curatedRail.length < RAIL_COUNT;
  const { data, isLoading } = useArticles(
    { category: category?.slug, sort: "latest", limit: RAIL_COUNT + 4 },
    Boolean(category?.slug) && short
  );

  const pool = dedupeArticles(
    curatedLead ? [curatedLead] : [],
    curatedRail,
    (data?.data ?? []).filter((article) => article.status !== "draft")
  );

  const lead = curatedLead || pool[0] || null;
  const rail = pool.filter((article) => article._id !== lead?._id).slice(0, RAIL_COUNT);

  if (!category) return null;

  if (isLoading && !lead) {
    return (
      <section className="space-y-4">
        <Skeleton className="h-7 w-52" />
        <div className="grid gap-4 lg:grid-cols-12">
          <Skeleton className="h-[420px] rounded-2xl lg:col-span-7" />
          <div className="grid gap-3 sm:grid-cols-2 lg:col-span-5">
            {Array.from({ length: RAIL_COUNT }).map((_, index) => (
              <Skeleton key={index} className="h-[200px] rounded-2xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  // Nothing published in this category yet: skip it rather than print a
  // heading over an empty row.
  if (!lead) return null;

  const flip = index % 2 === 1;

  return (
    <section aria-labelledby={`section-${category.slug}`} className={cn("space-y-4", PANEL)}>
      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink-200/80 pb-3 dark:border-ink-800">
        <div className="min-w-0">
          <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-[0.16em] text-brand-600 dark:text-brand-400">
            <Layers className="h-3.5 w-3.5" aria-hidden="true" />
            Section
          </span>

          <div className="mt-1 flex flex-wrap items-center gap-2.5">
            <h2 id={`section-${category.slug}`} className="section-title">
              {category.name}
            </h2>
            {typeof category.articleCount === "number" && category.articleCount > 0 && (
              <span className="chip bg-brand-50 px-2.5 py-0.5 text-xs text-brand-700 dark:bg-brand-500/10 dark:text-brand-300">
                {category.articleCount} stories
              </span>
            )}
          </div>

          {category.description && (
            <p className="clamp-1 mt-1 max-w-xl text-sm text-ink-500 dark:text-ink-400">
              {category.description}
            </p>
          )}
        </div>

        <Link
          to={`/category/${category.slug}`}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-ink-200 bg-white px-3.5 py-1.5 text-xs font-bold text-ink-600 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-ink-700 dark:bg-ink-900 dark:text-ink-300 dark:hover:border-brand-500/50 dark:hover:text-brand-400"
        >
          All {category.name}
          <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>

      {/* Lead beside its four. On a phone the lead comes first and the four
          stack two across; the column only splits once there is room for it. */}
      <div className="grid gap-4 lg:grid-cols-12">
        <div className={cn("lg:col-span-7", flip && "lg:order-last")}>
          <LeadCard article={lead} />
        </div>

        {rail.length > 0 && (
          <div
            className={cn(
              // Two by two rather than four stacked rows: at this width a
              // stacked row is mostly white space, while a square block of
              // four fills the column beside the lead and gives every one of
              // them a picture big enough to be worth looking at.
              "grid gap-3 sm:grid-cols-2 lg:col-span-5",
              rail.length === RAIL_COUNT && "lg:[grid-auto-rows:1fr]"
            )}
          >
            {rail.map((article) => (
              <RailCard key={article._id} article={article} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */
/* All blocks                                                          */
/* ------------------------------------------------------------------ */

/**
 * The per-category blocks an editor configures under Homepage layout.
 *
 * Each one is a lead story plus four from the same category, and they stack in
 * the order they were added — adding a section in the panel adds a block here,
 * directly above "Explore by Category".
 */
export function CategorySections({
  sections,
  loading,
}: {
  sections?: HomepageCategorySection[];
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-7 w-52" />
        <div className="grid gap-4 lg:grid-cols-12">
          <Skeleton className="h-[420px] rounded-2xl lg:col-span-7" />
          <div className="grid gap-3 sm:grid-cols-2 lg:col-span-5">
            {Array.from({ length: RAIL_COUNT }).map((_, index) => (
              <Skeleton key={index} className="h-[200px] rounded-2xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const configured = (sections || []).filter((section) => section && section.category);
  if (configured.length === 0) return null;

  return (
    <div className="space-y-8">
      {configured.map((section, index) => (
        <CategoryBlock
          key={
            asCategory(section.category)?._id ||
            (typeof section.category === "string" ? section.category : index)
          }
          section={section}
          index={index}
        />
      ))}
    </div>
  );
}
