import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Camera, Images, Link2, X } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SmartImage } from "@/components/ui/SmartImage";
import { AdSlot } from "@/components/ads/AdSlot";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { useArticles, useCategories } from "@/hooks/useContent";
import { useSeo } from "@/hooks/useSeo";
import type { ApiImage, Article } from "@/types/api";
import {
  articleHref,
  categoryHref,
  categoryName,
  cn,
  formatDate,
  imageUrl,
} from "@/lib/utils";

interface Shot {
  key: string;
  src: string;
  alt: string;
  caption: string;
  redirectUrl: string;
  openInNewTab: boolean;
  article: Article;
}

/** Flattens every gallery image (and the featured shot) out of the feed. */
function collectShots(articles: Article[]): Shot[] {
  const shots: Shot[] = [];

  articles.forEach((article) => {
    const gallery = (article.gallery || []).filter((item) => imageUrl(item));

    gallery.forEach((item: ApiImage, index) => {
      shots.push({
        key: `${article._id}-g${index}`,
        src: imageUrl(item),
        alt: item.alt || article.title,
        caption: item.caption || "",
        redirectUrl: item.redirectUrl || "",
        openInNewTab: item.openInNewTab !== false,
        article,
      });
    });

    // Articles without a gallery still contribute their lead image, so the wall
    // stays full rather than showing gaps.
    if (!gallery.length && imageUrl(article.featuredImage)) {
      shots.push({
        key: `${article._id}-f`,
        src: imageUrl(article.featuredImage),
        alt: article.featuredImage?.alt || article.title,
        caption: article.featuredImage?.caption || "",
        redirectUrl: article.featuredImage?.redirectUrl || "",
        openInNewTab: article.featuredImage?.openInNewTab !== false,
        article,
      });
    }
  });

  return shots;
}

export default function GalleryPage() {
  const [category, setCategory] = useState("");
  const [active, setActive] = useState<Shot | null>(null);

  const { data, isLoading, isError, refetch } = useArticles({
    sort: "latest",
    limit: 60,
    category: category || undefined,
  });

  const { data: categories = [] } = useCategories({ withCounts: true });

  useSeo({
    title: "Photo Gallery",
    description: "Every photo published across TheTrendSnap, with the story behind it.",
  });

  const shots = useMemo(() => collectShots(data?.data ?? []), [data]);

  return (
    <>
      <PageHeader
        eyebrow="Visual desk"
        title="Photo Gallery"
        description="Images from every published story — tap a photo to see it big, or jump straight to the article."
        breadcrumbs={[{ label: "Gallery" }]}
      >
        <div className="mt-5 flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => setCategory("")}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
              !category
                ? "border-brand-600 bg-brand-600 text-white"
                : "border-ink-200 text-ink-600 hover:border-brand-400 hover:text-brand-600 dark:border-ink-700 dark:text-ink-300"
            )}
          >
            All photos
          </button>
          {categories.map((entry) => (
            <button
              key={entry._id}
              type="button"
              onClick={() => setCategory(entry.slug)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-xs font-bold transition-colors",
                category === entry.slug
                  ? "border-brand-600 bg-brand-600 text-white"
                  : "border-ink-200 text-ink-600 hover:border-brand-400 hover:text-brand-600 dark:border-ink-700 dark:text-ink-300"
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
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 15 }).map((_, index) => (
              <Skeleton key={index} className="aspect-square rounded-2xl" />
            ))}
          </div>
        ) : shots.length === 0 ? (
          <EmptyState title="No photos yet" message="Images added to articles will appear here." />
        ) : (
          <>
            <p className="mb-4 flex items-center gap-2 text-sm text-ink-500 dark:text-ink-400">
              <Camera className="h-4 w-4 text-brand-500" aria-hidden="true" />
              {shots.length} photos from {data?.data.length ?? 0} stories
            </p>

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {shots.map((shot, index) => (
                <figure
                  key={shot.key}
                  className="group card relative overflow-hidden transition-all hover:-translate-y-1 hover:shadow-pop"
                >
                  <button
                    type="button"
                    onClick={() => setActive(shot)}
                    className="block w-full cursor-zoom-in"
                    aria-label={`View ${shot.alt}`}
                  >
                    <SmartImage
                      src={shot.src}
                      alt={shot.alt}
                      ratio="aspect-square"
                      rounded="rounded-none"
                      width={520}
                      priority={index < 5}
                      imgClassName="transition-transform duration-500 group-hover:scale-[1.06]"
                    />
                  </button>

                  {shot.redirectUrl && (
                    <a
                      href={shot.redirectUrl}
                      target={shot.openInNewTab ? "_blank" : "_self"}
                      rel="noopener noreferrer sponsored"
                      title="Opens the linked page"
                      className="absolute right-2 top-2 z-10 rounded-full bg-ink-900/80 p-1.5 text-white transition-colors hover:bg-brand-600"
                    >
                      <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                    </a>
                  )}

                  <figcaption className="p-2.5">
                    <Link
                      to={categoryHref(shot.article)}
                      className="text-xs font-bold tracking-wide text-brand-600 hover:underline dark:text-brand-400"
                    >
                      {categoryName(shot.article)}
                    </Link>
                    <Link
                      to={articleHref(shot.article)}
                      className="clamp-2 mt-0.5 block font-display text-[13px] font-bold leading-snug text-ink-900 hover:text-brand-600 dark:text-white"
                    >
                      {shot.article.title}
                    </Link>
                    <p className="mt-1 text-xs text-ink-400">
                      {formatDate(shot.article.publishedDate || shot.article.createdAt)}
                    </p>
                  </figcaption>
                </figure>
              ))}
            </div>

            <AdSlot position="category-infeed" className="mt-8" />
          </>
        )}
      </div>

      {/* ---------------- viewer ---------------- */}
      {active && (
        <div
          className="fixed inset-0 z-[95] flex flex-col items-center justify-center bg-black/90 p-4"
          onClick={() => setActive(null)}
          role="dialog"
          aria-modal="true"
          aria-label={active.alt}
        >
          <button
            type="button"
            onClick={() => setActive(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <img
            src={active.src}
            alt={active.alt}
            onClick={(event) => event.stopPropagation()}
            className="max-h-[76vh] max-w-full rounded-xl object-contain"
          />

          <div
            className="mt-4 w-full max-w-2xl rounded-xl bg-white/10 p-3 text-center backdrop-blur"
            onClick={(event) => event.stopPropagation()}
          >
            <p className="text-xs font-bold uppercase tracking-wider text-brand-300">
              {categoryName(active.article)}
            </p>
            <Link
              to={articleHref(active.article)}
              className="mt-1 block font-display text-sm font-bold text-white hover:underline"
            >
              {active.article.title}
            </Link>
            {active.caption && <p className="mt-1 text-xs text-white/80">{active.caption}</p>}

            <div className="mt-2 flex flex-wrap items-center justify-center gap-2">
              <Link
                to={articleHref(active.article)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-brand-700"
              >
                <Images className="h-3.5 w-3.5" aria-hidden="true" />
                Read the story
              </Link>
              {active.redirectUrl && (
                <a
                  href={active.redirectUrl}
                  target={active.openInNewTab ? "_blank" : "_self"}
                  rel="noopener noreferrer sponsored"
                  className="inline-flex items-center gap-1.5 rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold text-white hover:bg-white/25"
                >
                  <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                  Open link
                </a>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
