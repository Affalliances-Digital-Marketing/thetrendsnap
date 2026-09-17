import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowRight,
  BadgeCheck,
  Bookmark,
  ChevronRight,
  Clock,
  ExternalLink,
  Globe2,
  Heart,
  ImageIcon,
  Link2,
  MapPin,
  Megaphone,
  Play,
  Share2,
  ShoppingBag,
  Sparkles,
  Tag as TagIcon,
} from "lucide-react";
import { ArticleContent, toEmbedUrl } from "@/components/article/ArticleContent";
import { ShareBar } from "@/components/article/ShareBar";
import { ReadingProgress } from "@/components/article/ReadingProgress";
import { TableOfContents, useHeadings } from "@/components/article/TableOfContents";
import { Lightbox } from "@/components/article/Lightbox";
import { AdSlot } from "@/components/ads/AdSlot";
import { ArticleAd } from "@/components/ads/ArticleAd";
import { SmartImage } from "@/components/ui/SmartImage";
import { NewsletterCard } from "@/components/ui/Newsletter";
import { PanelHeader } from "@/components/ui/Bits";
import { CardSkeleton, ListSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { ArticleCard, ArticleListRow, ArticleRankRow } from "@/components/ArticleCard";
import { useArticle, useArticles, useRelated } from "@/hooks/useContent";
import { useSeo } from "@/hooks/useSeo";
import { SITE_URL } from "@/lib/api";
import type { Article } from "@/types/api";
import {
  articleDate,
  articleHref,
  articleImage,
  authorName,
  categoryHref,
  categoryName,
  cn,
  compactNumber,
  excerptOf,
  formatDate,
  formatDateTime,
  imageAlt,
  initialsOf,
  readTimeOf,
  tagsOf,
} from "@/lib/utils";

const BODY_ID = "article-body";

export default function ArticlePage() {
  const { slug } = useParams<{ slug: string }>();
  const { data: article, isLoading, isError, error, refetch } = useArticle(slug);
  const { data: related = [], isLoading: relatedLoading } = useRelated(slug, 6);
  const { data: popularPage } = useArticles({ sort: "popular", limit: 5 });

  const [lightbox, setLightbox] = useState<{ src: string; alt: string; caption: string } | null>(
    null
  );

  const image = article ? articleImage(article) : "";

  // A redirect set on the main image. Only an absolute http(s) URL is used, so
  // a stray value in the field (a title, a caption) never becomes a link.
  const featuredLink = (() => {
    const url = article?.featuredImage?.redirectUrl?.trim() || "";
    return /^https?:\/\//i.test(url) ? url : "";
  })();
  const date = article ? articleDate(article) : null;
  const tags = article ? tagsOf(article) : [];
  const headings = useHeadings(BODY_ID, article?.content);

  // Neighbouring stories in the same category power the prev / next footer.
  const categoryId =
    article && typeof article.category !== "string" ? article.category?._id : undefined;
  const { data: siblingsPage } = useArticles(
    { category: categoryId, limit: 40, sort: "latest" },
    Boolean(categoryId)
  );

  const { previous, next } = useMemo(() => {
    const list = siblingsPage?.data ?? [];
    const index = list.findIndex((item) => item._id === article?._id);
    if (index === -1) return { previous: undefined, next: undefined };
    return { previous: list[index + 1], next: list[index - 1] };
  }, [siblingsPage, article?._id]);

  useSeo({
    title: article?.metaTitle || article?.seoTitle || article?.title,
    description: article
      ? article.metaDescription || article.seoDescription || excerptOf(article, 180)
      : undefined,
    image: image || undefined,
    type: "article",
    canonical: article?.canonicalUrl || (article ? `${SITE_URL}/article/${article.slug}` : undefined),
    robots: article?.robots,
    publishedTime: article?.publishedDate,
    author: article ? authorName(article) : undefined,
    jsonLd: useMemo(() => {
      if (!article) return null;
      if (article.schemaMarkup) return article.schemaMarkup;
      return {
        "@context": "https://schema.org",
        "@type": "NewsArticle",
        headline: article.title,
        description: excerptOf(article, 200),
        image: image ? [image] : undefined,
        datePublished: article.publishedDate,
        dateModified: article.updatedDate || article.updatedAt || article.publishedDate,
        keywords: (article.seoKeywords || []).join(", ") || undefined,
        articleSection: categoryName(article),
        author: [{ "@type": "Person", name: authorName(article) }],
        publisher: { "@type": "Organization", name: "TheTrendSnap", url: SITE_URL },
        mainEntityOfPage: `${SITE_URL}/article/${article.slug}`,
      };
    }, [article, image]),
  });

  if (isLoading) return <ArticleSkeleton />;

  if (isError) {
    const status = (error as { status?: number })?.status;
    return (
      <div className="container py-16">
        {status === 404 ? (
          <EmptyState title="Article not found" message="This story may have been moved or unpublished." />
        ) : (
          <ErrorState onRetry={() => void refetch()} />
        )}
      </div>
    );
  }

  if (!article) return null;

  const author = authorName(article);
  const videos = (article.videos || []).filter((video) => video.url);
  const gallery = (article.gallery || []).filter((item) => item.url);
  const deals = (article.affiliateLinks || []).filter((deal) => deal.link);
  const internalLinks = (article.internalLinks || []).filter(
    (link) => link.news && typeof link.news !== "string"
  );
  const curatedRelated = (article.relatedNews || []).filter(
    (item): item is Article => typeof item !== "string" && Boolean(item?._id)
  );
  const sources = [...(article.sourceUrl ? [article.sourceUrl] : []), ...(article.sourceLinks || [])]
    .filter(Boolean)
    .filter((value, index, list) => list.indexOf(value) === index);

  const updated = article.updatedDate || article.updatedAt;
  const isUpdated = Boolean(updated && date && new Date(updated).getTime() - date.getTime() > 60_000);
  const subCategory = typeof article.subCategory === "string" ? null : article.subCategory;

  const place = [article.destination, article.region, article.country].filter(Boolean).join(" · ");

  return (
    <div className="pb-2">
      <ReadingProgress targetId={BODY_ID} />

      <div className="container py-5 sm:py-6">
        <ArticleAd article={article} slot="article-top" className="mb-5" />

        {/* ---------------- hero ---------------- */}
        <header className="mb-6">
          <nav
            aria-label="Breadcrumb"
            className="mb-3 flex flex-wrap items-center gap-1 text-xs text-ink-500 dark:text-ink-400"
          >
            <Link to="/" className="hover:text-brand-600">Home</Link>
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            <Link to={categoryHref(article)} className="hover:text-brand-600">
              {categoryName(article)}
            </Link>
            {subCategory && (
              <>
                <ChevronRight className="h-3 w-3" aria-hidden="true" />
                <Link to={`/category/${subCategory.slug}`} className="hover:text-brand-600">
                  {subCategory.name}
                </Link>
              </>
            )}
            <ChevronRight className="h-3 w-3" aria-hidden="true" />
            <span className="clamp-1 max-w-[45%] text-ink-400">{article.title}</span>
          </nav>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={categoryHref(article)}
              className="chip bg-brand-600 text-white transition-colors hover:bg-brand-700"
            >
              {categoryName(article)}
            </Link>
            {article.breakingNews && <span className="chip bg-flame text-white">Breaking</span>}
            {article.featured && (
              <span className="chip bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">
                Featured
              </span>
            )}
            {article.editorsPick && (
              <span className="chip bg-violet-50 text-violet-700 dark:bg-violet-500/10 dark:text-violet-300">
                <BadgeCheck className="h-3 w-3" aria-hidden="true" />
                Editor's pick
              </span>
            )}
            {article.trending && (
              <span className="chip bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
                Trending
              </span>
            )}
            {isUpdated && (
              <span className="chip bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                Updated {formatDate(updated)}
              </span>
            )}
          </div>

          <h1 className="mt-3 font-display text-3xl font-extrabold leading-[1.14] tracking-tight text-ink-900 sm:text-4xl xl:text-[42px] dark:text-white">
            {article.title}
          </h1>

          {article.subtitle && (
            <p className="mt-3 max-w-3xl text-base leading-relaxed text-ink-600 sm:text-lg dark:text-ink-300">
              {article.subtitle}
            </p>
          )}

          {/* byline + counters */}
          <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
            <div className="flex items-center gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-sm font-bold text-white">
                {article.author?.image?.url ? (
                  <img src={article.author.image.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  initialsOf(author)
                )}
              </span>
              <div className="text-[13px] leading-tight">
                <p className="font-bold text-ink-900 dark:text-white">
                  {article.author?.redirectUrl ? (
                    <a
                      href={article.author.redirectUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:text-brand-600"
                    >
                      {author}
                    </a>
                  ) : (
                    <Link to={`/author/${encodeURIComponent(author)}`} className="hover:text-brand-600">
                      {author}
                    </Link>
                  )}
                  {article.author?.designation && (
                    <span className="ml-2 font-medium text-ink-400">{article.author.designation}</span>
                  )}
                </p>
                <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-ink-500 dark:text-ink-400">
                  {date && <time dateTime={date.toISOString()}>{formatDateTime(date)}</time>}
                  <span aria-hidden="true">•</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {readTimeOf(article)} min read
                  </span>
                  {article.language && (
                    <>
                      <span aria-hidden="true">•</span>
                      <span className="uppercase">{article.language}</span>
                    </>
                  )}
                </p>
              </div>
            </div>

            <dl className="flex flex-wrap items-center gap-2 text-xs font-semibold text-ink-500 dark:text-ink-400">
              {[
                { icon: Heart, label: "likes", value: article.likes },
                { icon: Share2, label: "shares", value: article.shareCount },
                { icon: Bookmark, label: "saves", value: article.bookmarks },
              ]
                .filter((stat) => (stat.value || 0) > 0)
                .map(({ icon: Icon, label, value }) => (
                  <div
                    key={label}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-ink-50 px-2.5 py-1.5 dark:bg-ink-800/70"
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    <dt className="sr-only">{label}</dt>
                    <dd>
                      {compactNumber(value || 0)} <span className="font-normal">{label}</span>
                    </dd>
                  </div>
                ))}
            </dl>
          </div>

          {place && (
            <p className="mt-3 inline-flex flex-wrap items-center gap-1.5 rounded-lg bg-ink-50 px-2.5 py-1.5 text-xs font-semibold text-ink-600 dark:bg-ink-800/70 dark:text-ink-300">
              <MapPin className="h-3.5 w-3.5 text-brand-500" aria-hidden="true" />
              {place}
            </p>
          )}
        </header>

        {/* ---------------- main grid ---------------- */}
        <div className="grid gap-6 lg:grid-cols-12 lg:gap-8">
          <article className="min-w-0 lg:col-span-8">
            {image && (
              <figure className="overflow-hidden rounded-2xl border border-ink-200 dark:border-ink-800">
                {(() => {
                  const picture = (
                    <SmartImage
                      src={image}
                      alt={imageAlt(article.featuredImage, article.title)}
                      ratio="aspect-[16/9]"
                      rounded="rounded-none"
                      width={1400}
                      priority
                      imgClassName={
                        featuredLink ? "transition-transform duration-500 group-hover:scale-[1.02]" : undefined
                      }
                    />
                  );

                  // The editor's redirect link for the main image, set in the
                  // article editor or the import sheet. Without one the image
                  // stays a picture, not a dead link.
                  if (!featuredLink) return picture;

                  const newTab = article.featuredImage?.openInNewTab !== false;
                  const rel = [
                    newTab ? "noopener noreferrer" : "",
                    article.featuredImage?.nofollow !== false ? "nofollow" : "",
                  ]
                    .filter(Boolean)
                    .join(" ");

                  return (
                    <a
                      href={featuredLink}
                      target={newTab ? "_blank" : undefined}
                      rel={rel || undefined}
                      className="group relative block cursor-pointer"
                      aria-label={`${imageAlt(article.featuredImage, article.title)} — opens link`}
                    >
                      {picture}
                      <span className="pointer-events-none absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/55 px-2.5 py-1 text-xs font-semibold text-white opacity-0 ring-1 ring-inset ring-white/20 backdrop-blur-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                        Open link
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </span>
                    </a>
                  );
                })()}
                {(article.featuredImage?.caption || article.featuredImage?.credit) && (
                  <figcaption className="flex flex-wrap items-center justify-between gap-2 bg-ink-50 px-4 py-2 text-xs text-ink-500 dark:bg-ink-800/60 dark:text-ink-400">
                    <span>{article.featuredImage?.caption}</span>
                    {article.featuredImage?.credit && (
                      <span className="italic">© {article.featuredImage.credit}</span>
                    )}
                  </figcaption>
                )}
              </figure>
            )}

            {/* summary card — always filled, so the column never starts thin */}
            {excerptOf(article, 260) && (
              <aside className="mt-5 rounded-2xl border border-brand-200 bg-brand-50/60 p-4 dark:border-brand-500/30 dark:bg-brand-500/10">
                <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-brand-700 dark:text-brand-300">
                  <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
                  In short
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-ink-700 dark:text-ink-200">
                  {excerptOf(article, 260)}
                </p>
              </aside>
            )}

            <div className="mt-5">
              <ShareBar article={article} />
            </div>

            {/* mobile table of contents */}
            {headings.length > 1 && (
              <details className="mt-5 rounded-2xl border border-ink-200 p-3 lg:hidden dark:border-ink-800">
                <summary className="cursor-pointer text-sm font-bold text-ink-900 dark:text-white">
                  On this page ({headings.length})
                </summary>
                <ol className="mt-2 space-y-1">
                  {headings.map((heading) => (
                    <li key={heading.id}>
                      <a
                        href={`#${heading.id}`}
                        className={cn(
                          "block rounded-lg px-2 py-1.5 text-[13px] text-ink-600 hover:bg-ink-50 dark:text-ink-300 dark:hover:bg-ink-800",
                          heading.level === 3 && "pl-5"
                        )}
                      >
                        {heading.text}
                      </a>
                    </li>
                  ))}
                </ol>
              </details>
            )}

            <div id={BODY_ID} className="mt-6">
              <ArticleContent article={article} onImageClick={setLightbox} />
            </div>

            {/* per-article ad override from the admin panel */}
            {article.advertisement?.enabled !== false && article.advertisement?.code && (
              <aside className="my-8" aria-label="Advertisement">
                <p className="mb-1.5 text-center text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
                  Advertisement
                </p>
                <div
                  className="overflow-hidden rounded-2xl border border-ink-200 dark:border-ink-800"
                  dangerouslySetInnerHTML={{ __html: article.advertisement.code }}
                />
              </aside>
            )}

            <ArticleAd article={article} slot="article-inline" className="my-8" />

            {/* ---------------- deals ---------------- */}
            {deals.length > 0 && (
              <section className="mt-8" aria-labelledby="article-deals">
                <h2
                  id="article-deals"
                  className="flex items-center gap-2 font-display text-xl font-extrabold text-ink-900 dark:text-white"
                >
                  <ShoppingBag className="h-5 w-5 text-brand-500" aria-hidden="true" />
                  Deals mentioned in this story
                </h2>

                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {deals.map((deal, index) => (
                    <a
                      key={index}
                      href={deal.link}
                      target="_blank"
                      rel="noopener noreferrer sponsored nofollow"
                      className="card group flex items-center gap-3 p-3 transition-all hover:-translate-y-0.5 hover:shadow-pop"
                    >
                      {deal.productImage ? (
                        <img
                          src={deal.productImage}
                          alt=""
                          className="h-16 w-16 shrink-0 rounded-lg object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10">
                          <ShoppingBag className="h-6 w-6" aria-hidden="true" />
                        </span>
                      )}

                      <span className="min-w-0 flex-1">
                        <span className="clamp-2 block text-sm font-bold text-ink-900 dark:text-white">
                          {deal.title || "View deal"}
                        </span>
                        {deal.price && (
                          <span className="mt-0.5 block text-[13px] font-bold text-emerald-600 dark:text-emerald-400">
                            {deal.price}
                          </span>
                        )}
                      </span>

                      <span className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-brand-600 px-3 py-2 text-xs font-bold text-white transition-colors group-hover:bg-brand-700">
                        {deal.buttonText || "Get deal"}
                        <ExternalLink className="h-3 w-3" aria-hidden="true" />
                      </span>
                    </a>
                  ))}
                </div>
              </section>
            )}

            {/* ---------------- videos ---------------- */}
            {videos.length > 0 && (
              <section className="mt-8" aria-labelledby="article-videos">
                <h2
                  id="article-videos"
                  className="flex items-center gap-2 font-display text-xl font-extrabold text-ink-900 dark:text-white"
                >
                  <Play className="h-5 w-5 text-brand-500" aria-hidden="true" />
                  Watch
                </h2>

                <div className="mt-4 grid gap-4 sm:grid-cols-2">
                  {videos.map((video, index) => {
                    const embed = toEmbedUrl(video.url || "");
                    return (
                      <figure
                        key={index}
                        className="overflow-hidden rounded-xl border border-ink-200 dark:border-ink-800"
                      >
                        {embed ? (
                          <iframe
                            src={embed}
                            title={video.title || `Video ${index + 1}`}
                            className="aspect-video w-full"
                            allowFullScreen
                            loading="lazy"
                          />
                        ) : (
                          <video src={video.url} controls className="aspect-video w-full bg-black" />
                        )}
                        {(video.title || video.caption) && (
                          <figcaption className="px-3 py-2 text-sm text-ink-600 dark:text-ink-300">
                            <span className="font-semibold">{video.title}</span>
                            {video.caption && (
                              <span className="mt-0.5 block text-xs text-ink-500">{video.caption}</span>
                            )}
                            {video.redirectUrl && (
                              <a
                                href={video.redirectUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-brand-600 hover:underline dark:text-brand-400"
                              >
                                Watch on {video.provider || "source"}
                                <ExternalLink className="h-3 w-3" aria-hidden="true" />
                              </a>
                            )}
                          </figcaption>
                        )}
                      </figure>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ---------------- gallery ---------------- */}
            {gallery.length > 0 && (
              <section className="mt-8" aria-labelledby="article-gallery">
                <h2
                  id="article-gallery"
                  className="flex items-center gap-2 font-display text-xl font-extrabold text-ink-900 dark:text-white"
                >
                  <ImageIcon className="h-5 w-5 text-brand-500" aria-hidden="true" />
                  Gallery
                  <span className="text-[13px] font-semibold text-ink-400">{gallery.length} photos</span>
                </h2>

                <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {gallery.map((item, index) => {
                    const inner = (
                      <>
                        <SmartImage
                          src={item.url}
                          alt={item.alt || `${article.title} — image ${index + 1}`}
                          ratio="aspect-square"
                          rounded="rounded-xl"
                          width={520}
                          imgClassName="transition-transform duration-500 group-hover:scale-[1.05]"
                        />
                        {item.redirectUrl && (
                          <span className="absolute right-2 top-2 z-10 rounded-full bg-ink-900/80 p-1.5 text-white">
                            <Link2 className="h-3 w-3" aria-hidden="true" />
                          </span>
                        )}
                      </>
                    );

                    return item.redirectUrl ? (
                      <a
                        key={index}
                        href={item.redirectUrl}
                        target={item.openInNewTab === false ? "_self" : "_blank"}
                        rel="noopener noreferrer sponsored"
                        className="group relative block"
                      >
                        {inner}
                        {item.caption && (
                          <span className="mt-1.5 block text-xs text-ink-500">{item.caption}</span>
                        )}
                      </a>
                    ) : (
                      <button
                        key={index}
                        type="button"
                        onClick={() =>
                          setLightbox({
                            src: item.url || "",
                            alt: item.alt || "",
                            caption: item.caption || "",
                          })
                        }
                        className="group relative block cursor-zoom-in text-left"
                      >
                        {inner}
                        {item.caption && (
                          <span className="mt-1.5 block text-xs text-ink-500">{item.caption}</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            {/* ---------------- CTA ---------------- */}
            {article.cta?.url && article.cta.label && (
              <a
                href={article.cta.url}
                target={article.cta.openInNewTab === false ? "_self" : "_blank"}
                rel="noopener noreferrer"
                className={cn(
                  "mt-8 flex items-center justify-center gap-2 rounded-2xl px-6 py-4 text-center text-sm font-bold transition-colors",
                  article.cta.style === "secondary"
                    ? "bg-ink-900 text-white hover:bg-black dark:bg-white dark:text-ink-900"
                    : article.cta.style === "ghost"
                      ? "border border-brand-300 text-brand-700 hover:bg-brand-50 dark:border-brand-500/40 dark:text-brand-300"
                      : "bg-brand-600 text-white hover:bg-brand-700"
                )}
              >
                {article.cta.label}
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </a>
            )}

            {/* ---------------- external / ad links ---------------- */}
            {(article.externalLink || article.adsLink) && (
              <div className="mt-6 flex flex-wrap gap-2">
                {article.externalLink && (
                  <a
                    href={article.externalLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-lg border border-ink-200 px-3 py-2 text-[13px] font-bold text-ink-700 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-ink-700 dark:text-ink-200"
                  >
                    <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                    Read the full story at the source
                  </a>
                )}
                {article.adsLink && (
                  <a
                    href={article.adsLink}
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-50 px-3 py-2 text-[13px] font-bold text-amber-700 transition-colors hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-300"
                  >
                    <Megaphone className="h-3.5 w-3.5" aria-hidden="true" />
                    Sponsored offer
                  </a>
                )}
              </div>
            )}

            {/* ---------------- further reading ---------------- */}
            {internalLinks.length > 0 && (
              <section className="mt-8 rounded-2xl border border-ink-200 p-4 dark:border-ink-800">
                <h2 className="font-display text-sm font-bold text-ink-900 dark:text-white">
                  Further reading
                </h2>
                <ul className="mt-3 space-y-2">
                  {internalLinks.map((link, index) => {
                    const target = link.news as Article;
                    return (
                      <li key={index}>
                        <Link
                          to={articleHref(target)}
                          className="group flex items-start gap-2 text-sm text-ink-700 hover:text-brand-600 dark:text-ink-200"
                        >
                          <ArrowRight className="mt-1 h-3.5 w-3.5 shrink-0 text-brand-500" aria-hidden="true" />
                          <span className="clamp-2">{link.anchorText || target.title}</span>
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {/* ---------------- tags + keywords ---------------- */}
            {(tags.length > 0 || (article.seoKeywords || []).length > 0) && (
              <section className="mt-8" aria-label="Topics">
                <h2 className="flex items-center gap-2 text-sm font-bold text-ink-900 dark:text-white">
                  <TagIcon className="h-4 w-4 text-brand-500" aria-hidden="true" />
                  Topics in this story
                </h2>
                <ul className="mt-3 flex flex-wrap gap-2">
                  {tags.map((tag) => (
                    <li key={tag._id}>
                      <Link
                        to={`/tag/${tag.slug}`}
                        className="inline-block rounded-lg border border-ink-200 px-3 py-1.5 text-xs font-semibold text-ink-600 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-ink-700 dark:text-ink-300"
                      >
                        #{tag.name}
                      </Link>
                    </li>
                  ))}
                  {(article.seoKeywords || [])
                    .filter((keyword) => !tags.some((tag) => tag.name.toLowerCase() === keyword.toLowerCase()))
                    .map((keyword) => (
                      <li key={keyword}>
                        <Link
                          to={`/search?q=${encodeURIComponent(keyword)}`}
                          className="inline-block rounded-lg bg-ink-100 px-3 py-1.5 text-xs font-semibold text-ink-500 transition-colors hover:bg-brand-50 hover:text-brand-600 dark:bg-ink-800 dark:text-ink-400"
                        >
                          {keyword}
                        </Link>
                      </li>
                    ))}
                </ul>
              </section>
            )}

            {/* ---------------- sources ---------------- */}
            {(sources.length > 0 || article.sourceName) && (
              <section
                className="mt-8 rounded-2xl bg-ink-50 p-4 dark:bg-ink-800/50"
                aria-label="Sources"
              >
                <h2 className="flex items-center gap-2 text-sm font-bold text-ink-900 dark:text-white">
                  <Globe2 className="h-4 w-4 text-brand-500" aria-hidden="true" />
                  Sources & attribution
                </h2>
                {article.sourceName && (
                  <p className="mt-1.5 text-[13px] text-ink-600 dark:text-ink-300">
                    Originally reported by <strong>{article.sourceName}</strong>
                  </p>
                )}
                {sources.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {sources.map((source) => (
                      <li key={source}>
                        <a
                          href={source}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="break-all text-xs text-brand-600 hover:underline dark:text-brand-400"
                        >
                          {source}
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
                {article.canonicalUrl && (
                  <p className="mt-2 break-all text-xs text-ink-400">
                    Canonical: {article.canonicalUrl}
                  </p>
                )}
              </section>
            )}

            {/* ---------------- author ---------------- */}
            <section className="mt-8 flex flex-col gap-4 rounded-2xl border border-ink-200 p-5 sm:flex-row dark:border-ink-800">
              <span className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-xl font-bold text-white">
                {article.author?.image?.url ? (
                  <img src={article.author.image.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  initialsOf(author)
                )}
              </span>

              <div className="min-w-0 flex-1">
                <p className="font-display text-base font-bold text-ink-900 dark:text-white">{author}</p>
                {article.author?.designation && (
                  <p className="text-xs font-semibold uppercase tracking-wide text-brand-600 dark:text-brand-400">
                    {article.author.designation}
                  </p>
                )}
                <p className="mt-2 text-sm leading-relaxed text-ink-600 dark:text-ink-300">
                  {article.author?.bio ||
                    `${author} writes for TheTrendSnap, covering ${categoryName(article).toLowerCase()} with a focus on what actually matters to readers.`}
                </p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Link
                    to={`/author/${encodeURIComponent(author)}`}
                    className="text-xs font-bold text-brand-600 hover:underline dark:text-brand-400"
                  >
                    More from this author
                  </Link>

                  {article.author?.email && (
                    <a
                      href={`mailto:${article.author.email}`}
                      className="text-xs font-bold text-ink-500 hover:text-brand-600 dark:text-ink-400"
                    >
                      Email
                    </a>
                  )}

                  {Object.entries(article.author?.social || {})
                    .filter(([, url]) => url)
                    .map(([network, url]) => (
                      <a
                        key={network}
                        href={url as string}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-bold capitalize text-ink-500 hover:text-brand-600 dark:text-ink-400"
                      >
                        {network}
                      </a>
                    ))}
                </div>
              </div>
            </section>

            {/* ---------------- prev / next ---------------- */}
            {(previous || next) && (
              <nav className="mt-8 grid gap-3 sm:grid-cols-2" aria-label="More in this category">
                {previous ? (
                  <Link
                    to={articleHref(previous)}
                    className="card group flex items-center gap-3 p-3 transition-all hover:-translate-y-0.5 hover:shadow-pop"
                  >
                    <SmartImage
                      src={articleImage(previous)}
                      alt=""
                      ratio="aspect-square"
                      rounded="rounded-lg"
                      width={200}
                      className="w-16 shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-bold uppercase tracking-wider text-ink-400">
                        Previous story
                      </span>
                      <span className="clamp-2 mt-0.5 block text-sm font-bold text-ink-900 group-hover:text-brand-600 dark:text-white">
                        {previous.title}
                      </span>
                    </span>
                  </Link>
                ) : (
                  <span />
                )}

                {next && (
                  <Link
                    to={articleHref(next)}
                    className="card group flex items-center gap-3 p-3 text-right transition-all hover:-translate-y-0.5 hover:shadow-pop sm:flex-row-reverse"
                  >
                    <SmartImage
                      src={articleImage(next)}
                      alt=""
                      ratio="aspect-square"
                      rounded="rounded-lg"
                      width={200}
                      className="w-16 shrink-0"
                    />
                    <span className="min-w-0">
                      <span className="block text-xs font-bold uppercase tracking-wider text-ink-400">
                        Next story
                      </span>
                      <span className="clamp-2 mt-0.5 block text-sm font-bold text-ink-900 group-hover:text-brand-600 dark:text-white">
                        {next.title}
                      </span>
                    </span>
                  </Link>
                )}
              </nav>
            )}

            <ArticleAd article={article} slot="article-bottom" className="mt-8" />
          </article>

          {/* ---------------- sidebar ---------------- */}
          <aside className="min-w-0 lg:col-span-4">
            <div className="space-y-5 lg:sticky lg:top-28">
              {/* Three bookable places down this column. Each renders the
                  creative at its own size — the Snap Wall rails' behaviour, not
                  the page's banner strip — rotates when more than one ad is
                  booked, and disappears entirely when none is, leaving the
                  column exactly as it reads today. */}
              <ArticleAd article={article} slot="article-sidebar-top" />

              <TableOfContents headings={headings} className="hidden lg:block" />

              {curatedRelated.length > 0 && (
                <div className="card overflow-hidden">
                  <PanelHeader title="Editor's related picks" />
                  <div className="flex flex-col divide-y divide-ink-100 px-4 dark:divide-ink-800">
                    {curatedRelated.slice(0, 4).map((item) => (
                      <ArticleListRow key={item._id} article={item} dense />
                    ))}
                  </div>
                </div>
              )}

              <ArticleAd article={article} slot="article-sidebar-middle" />

              <div className="card overflow-hidden">
                <PanelHeader title="Popular now" action="See all" actionHref="/popular" />
                <div className="flex flex-col divide-y divide-ink-100 px-4 dark:divide-ink-800">
                  {(popularPage?.data || []).slice(0, 5).map((item, index) => (
                    <ArticleRankRow key={item._id} article={item} rank={index + 1} dense />
                  ))}
                </div>
              </div>

              <NewsletterCard source="article-sidebar" layout="compact" />

              {/* Kept so creatives booked here before the three named places
                  existed keep running. */}
              <AdSlot position="sidebar-sticky" />

              {related.length > 0 && (
                <div className="card overflow-hidden">
                  <PanelHeader title={`More in ${categoryName(article)}`} action="View" actionHref={categoryHref(article)} />
                  <div className="flex flex-col divide-y divide-ink-100 px-4 dark:divide-ink-800">
                    {related.slice(0, 4).map((item) => (
                      <ArticleListRow key={item._id} article={item} dense />
                    ))}
                  </div>
                </div>
              )}

              <ArticleAd article={article} slot="article-sidebar-bottom" />
            </div>
          </aside>
        </div>

        {/* ---------------- related grid ---------------- */}
        <section className="mt-12" aria-labelledby="related-articles">
          <h2
            id="related-articles"
            className="font-display text-xl font-extrabold tracking-tight text-ink-900 sm:text-2xl dark:text-white"
          >
            You might also like
          </h2>
          <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            {relatedLoading
              ? Array.from({ length: 6 }).map((_, index) => <CardSkeleton key={index} />)
              : related.slice(0, 6).map((item) => <ArticleCard key={item._id} article={item} showExcerpt={false} />)}
          </div>
        </section>
      </div>

      {lightbox && (
        <Lightbox
          src={lightbox.src}
          alt={lightbox.alt}
          caption={lightbox.caption}
          onClose={() => setLightbox(null)}
        />
      )}
    </div>
  );
}

function ArticleSkeleton() {
  return (
    <div className="container grid gap-8 py-8 lg:grid-cols-12">
      <div className="space-y-4 lg:col-span-8">
        <Skeleton className="h-4 w-56" />
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-3/4" />
        <Skeleton className="h-4 w-48" />
        <Skeleton className="aspect-[16/9] w-full rounded-2xl" />
        <div className="space-y-3 pt-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-4 w-full" />
          ))}
        </div>
      </div>
      <div className="space-y-5 lg:col-span-4">
        <div className="card p-4">
          <ListSkeleton count={5} />
        </div>
        <Skeleton className="h-52 rounded-2xl" />
      </div>
    </div>
  );
}
