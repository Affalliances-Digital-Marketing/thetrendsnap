import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Clock, ExternalLink, Play, Video as VideoIcon, X } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SmartImage } from "@/components/ui/SmartImage";
import { AdSlot } from "@/components/ads/AdSlot";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { toEmbedUrl } from "@/components/article/ArticleContent";
import { useArticles, useCategories } from "@/hooks/useContent";
import { useSeo } from "@/hooks/useSeo";
import type { Article } from "@/types/api";
import {
  articleHref,
  articleImage,
  categoryHref,
  categoryName,
  cn,
  formatDate,
  imageUrl,
  readTimeOf,
} from "@/lib/utils";

interface Clip {
  key: string;
  url: string;
  embed: string | null;
  thumb: string;
  title: string;
  caption: string;
  provider: string;
  duration?: number;
  redirectUrl: string;
  article: Article;
}

/** YouTube thumbnails come free from the video id. */
function youtubeThumb(url: string): string {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/);
  return match ? `https://img.youtube.com/vi/${match[1]}/hqdefault.jpg` : "";
}

function collectClips(articles: Article[]): Clip[] {
  const clips: Clip[] = [];

  articles.forEach((article) => {
    (article.videos || [])
      .filter((video) => video.url)
      .forEach((video, index) => {
        const url = video.url as string;
        clips.push({
          key: `${article._id}-v${index}`,
          url,
          embed: toEmbedUrl(url),
          thumb: imageUrl(video.thumbnail) || youtubeThumb(url) || articleImage(article),
          title: video.title || article.title,
          caption: video.caption || "",
          provider: video.provider || (url.includes("youtu") ? "youtube" : "video"),
          duration: video.duration,
          redirectUrl: video.redirectUrl || "",
          article,
        });
      });
  });

  return clips;
}

function formatDuration(seconds?: number): string {
  if (!seconds) return "";
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

export default function VideosPage() {
  const [category, setCategory] = useState("");
  const [playing, setPlaying] = useState<Clip | null>(null);

  const { data, isLoading, isError, refetch } = useArticles({
    sort: "latest",
    limit: 60,
    category: category || undefined,
  });

  const { data: categories = [] } = useCategories({ withCounts: true });

  useSeo({
    title: "Videos",
    description: "Every video published with a TheTrendSnap story.",
  });

  const clips = useMemo(() => collectClips(data?.data ?? []), [data]);
  const [hero, ...others] = clips;

  return (
    <>
      <PageHeader
        eyebrow="Watch"
        title="Videos"
        description="Explainers, reviews and clips attached to our reporting — play them here or open the full story."
        breadcrumbs={[{ label: "Videos" }]}
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
            All videos
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
          <div className="grid gap-4 lg:grid-cols-3">
            <Skeleton className="aspect-video rounded-2xl lg:col-span-2" />
            <Skeleton className="aspect-video rounded-2xl" />
          </div>
        ) : clips.length === 0 ? (
          <EmptyState
            title="No videos published yet"
            message="Videos attached to an article in the admin panel show up here automatically."
          />
        ) : (
          <>
            {/* ---------------- featured player ---------------- */}
            <section className="grid gap-5 lg:grid-cols-12" aria-label="Featured video">
              <div className="lg:col-span-8">
                <div className="overflow-hidden rounded-2xl border border-ink-200 bg-black dark:border-ink-800">
                  {hero.embed ? (
                    <iframe
                      src={hero.embed}
                      title={hero.title}
                      className="aspect-video w-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                  ) : (
                    <video src={hero.url} controls poster={hero.thumb} className="aspect-video w-full" />
                  )}
                </div>

                <div className="mt-3">
                  <Link
                    to={categoryHref(hero.article)}
                    className="text-xs font-bold tracking-wide text-brand-600 hover:underline dark:text-brand-400"
                  >
                    {categoryName(hero.article)}
                  </Link>
                  <h2 className="mt-1 font-display text-xl font-extrabold leading-snug text-ink-900 dark:text-white">
                    {hero.title}
                  </h2>
                  {hero.caption && (
                    <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">{hero.caption}</p>
                  )}
                  <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-500">
                    <span>{formatDate(hero.article.publishedDate || hero.article.createdAt)}</span>
                    <span aria-hidden="true">•</span>
                    <span className="capitalize">{hero.provider}</span>
                    {hero.duration ? (
                      <>
                        <span aria-hidden="true">•</span>
                        <span>{formatDuration(hero.duration)}</span>
                      </>
                    ) : null}
                  </p>

                  <div className="mt-3 flex flex-wrap gap-2">
                    <Link
                      to={articleHref(hero.article)}
                      className="inline-flex h-10 items-center gap-2 rounded-xl bg-brand-600 px-4 text-[13px] font-bold text-white transition-colors hover:bg-brand-700"
                    >
                      Read the full story
                    </Link>
                    {hero.redirectUrl && (
                      <a
                        href={hero.redirectUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex h-10 items-center gap-2 rounded-xl border border-ink-200 px-4 text-[13px] font-bold text-ink-700 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-ink-700 dark:text-ink-200"
                      >
                        <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
                        Watch on {hero.provider}
                      </a>
                    )}
                  </div>
                </div>
              </div>

              {/* up next rail */}
              <aside className="lg:col-span-4">
                <h2 className="mb-2 flex items-center gap-2 font-display text-sm font-bold text-ink-900 dark:text-white">
                  <VideoIcon className="h-4 w-4 text-brand-500" aria-hidden="true" />
                  Up next
                </h2>
                <ol className="card divide-y divide-ink-100 dark:divide-ink-800">
                  {others.slice(0, 5).map((clip) => (
                    <li key={clip.key}>
                      <button
                        type="button"
                        onClick={() => setPlaying(clip)}
                        className="group flex w-full items-center gap-3 p-2.5 text-left transition-colors hover:bg-ink-50 dark:hover:bg-ink-800/60"
                      >
                        <span className="relative w-[104px] shrink-0">
                          <SmartImage
                            src={clip.thumb}
                            alt=""
                            ratio="aspect-video"
                            rounded="rounded-lg"
                            width={260}
                          />
                          <span className="absolute inset-0 z-10 flex items-center justify-center">
                            <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white">
                              <Play className="h-3.5 w-3.5 fill-white" aria-hidden="true" />
                            </span>
                          </span>
                        </span>

                        <span className="min-w-0 flex-1">
                          <span className="text-xs font-bold tracking-wide text-brand-600 dark:text-brand-400">
                            {categoryName(clip.article)}
                          </span>
                          <span className="clamp-2 block text-[13px] font-bold leading-snug text-ink-900 group-hover:text-brand-600 dark:text-white">
                            {clip.title}
                          </span>
                          <span className="mt-0.5 block text-xs text-ink-400">
                            {formatDate(clip.article.publishedDate || clip.article.createdAt)}
                            {clip.duration ? ` · ${formatDuration(clip.duration)}` : ""}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ol>
              </aside>
            </section>

            <AdSlot position="category-top" className="my-7" />

            {/* ---------------- grid ---------------- */}
            {others.length > 0 && (
              <section aria-label="All videos">
                <h2 className="mb-3 font-display text-lg font-extrabold text-ink-900 dark:text-white">
                  All videos <span className="text-[13px] font-semibold text-ink-400">({clips.length})</span>
                </h2>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {others.map((clip) => (
                    <article
                      key={clip.key}
                      className="group card overflow-hidden transition-all hover:-translate-y-1 hover:shadow-pop"
                    >
                      <button
                        type="button"
                        onClick={() => setPlaying(clip)}
                        className="relative block w-full"
                        aria-label={`Play ${clip.title}`}
                      >
                        <SmartImage
                          src={clip.thumb}
                          alt={clip.title}
                          ratio="aspect-video"
                          rounded="rounded-none"
                          width={520}
                          imgClassName="transition-transform duration-500 group-hover:scale-[1.05]"
                        />
                        <span className="absolute inset-0 z-10 flex items-center justify-center bg-black/20 transition-colors group-hover:bg-black/30">
                          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-white/90 text-brand-600 shadow-lg transition-transform group-hover:scale-110">
                            <Play className="h-5 w-5 fill-current" aria-hidden="true" />
                          </span>
                        </span>
                        {clip.duration ? (
                          <span className="absolute bottom-2 right-2 z-10 rounded bg-black/80 px-1.5 py-0.5 text-xs font-bold text-white">
                            {formatDuration(clip.duration)}
                          </span>
                        ) : null}
                      </button>

                      <div className="p-3">
                        <Link
                          to={categoryHref(clip.article)}
                          className="text-xs font-bold tracking-wide text-brand-600 hover:underline dark:text-brand-400"
                        >
                          {categoryName(clip.article)}
                        </Link>
                        <h3 className="clamp-2 mt-0.5 font-display text-sm font-bold leading-snug text-ink-900 dark:text-white">
                          {clip.title}
                        </h3>
                        <p className="mt-1.5 flex flex-wrap items-center gap-x-2 text-xs text-ink-400">
                          <span>{formatDate(clip.article.publishedDate || clip.article.createdAt)}</span>
                          <span aria-hidden="true">•</span>
                          <span className="inline-flex items-center gap-1">
                            <Clock className="h-3 w-3" aria-hidden="true" />
                            {readTimeOf(clip.article)} min read
                          </span>
                        </p>
                        <Link
                          to={articleHref(clip.article)}
                          className="mt-2 inline-block text-xs font-bold text-brand-600 hover:underline dark:text-brand-400"
                        >
                          Open the article
                        </Link>
                      </div>
                    </article>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {/* ---------------- player modal ---------------- */}
      {playing && (
        <div
          className="fixed inset-0 z-[95] flex items-center justify-center bg-black/90 p-4"
          onClick={() => setPlaying(null)}
          role="dialog"
          aria-modal="true"
          aria-label={playing.title}
        >
          <button
            type="button"
            onClick={() => setPlaying(null)}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="w-full max-w-4xl" onClick={(event) => event.stopPropagation()}>
            <div className="overflow-hidden rounded-2xl bg-black">
              {playing.embed ? (
                <iframe
                  src={`${playing.embed}?autoplay=1`}
                  title={playing.title}
                  className="aspect-video w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              ) : (
                <video src={playing.url} controls autoPlay className="aspect-video w-full" />
              )}
            </div>

            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wider text-brand-300">
                  {categoryName(playing.article)}
                </p>
                <p className="clamp-1 font-display text-sm font-bold text-white">{playing.title}</p>
              </div>
              <Link
                to={articleHref(playing.article)}
                className="inline-flex h-9 shrink-0 items-center rounded-lg bg-brand-600 px-3.5 text-[13px] font-bold text-white hover:bg-brand-700"
              >
                Read the story
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
