import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Clock, Flame } from "lucide-react";
import type { Article } from "@/types/api";
import { SmartImage } from "@/components/ui/SmartImage";
import { Skeleton } from "@/components/ui/Skeleton";
import { useMediaQuery } from "@/hooks/useMediaQuery";
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
  initialsOf,
  readTimeOf,
} from "@/lib/utils";

/** How long each hero story holds before the next one fades in. */
const SLIDE_MS = 3000;

/**
 * Hero: the lead story fills its panel edge to edge — a drifting, blurred copy
 * of the artwork covers the frame so there is never a blank gutter, while the
 * real image sits on top uncropped. Category, headline and summary ride over
 * the picture on a dark scrim, which keeps them legible in both themes.
 *
 * `articles` is a short playlist (the newest stories). The panel cross-fades
 * through it on a timer; pass a single article to get a static hero.
 */
export function Hero({
  articles,
  rail,
  loading,
}: {
  articles: Article[];
  rail: Article[];
  loading?: boolean;
}) {
  const slides = articles.filter(Boolean).slice(0, 5);
  const reduceMotion = useMediaQuery("(prefers-reduced-motion: reduce)");

  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // Slides are mounted the first time they are shown and then kept, so the
  // browser fetches each hero image once — and only when it is actually needed,
  // rather than pulling all five during the first paint.
  const [mounted, setMounted] = useState<number[]>([0]);
  const timer = useRef<number | null>(null);

  const count = slides.length;
  const rotating = count > 1 && !reduceMotion && !paused;

  useEffect(() => {
    if (!rotating) return undefined;
    timer.current = window.setInterval(
      () => setIndex((current) => (current + 1) % count),
      SLIDE_MS
    );
    return () => {
      if (timer.current) window.clearInterval(timer.current);
    };
  }, [rotating, count]);

  // A shrinking playlist must never leave the pointer past the end.
  useEffect(() => {
    setIndex((current) => (current < count ? current : 0));
  }, [count]);

  useEffect(() => {
    setMounted((current) => (current.includes(index) ? current : [...current, index]));
  }, [index]);

  if (loading) return <HeroSkeleton />;
  if (!count) return null;

  const article = slides[index] ?? slides[0];
  const date = articleDate(article);
  const author = authorName(article);

  return (
    <section aria-label="Top story" className="grid gap-4 lg:grid-cols-12">
      {/* ---------------- lead story ---------------- */}
      <article
        className="group relative isolate overflow-hidden rounded-2xl border border-ink-200 bg-ink-900 shadow-card lg:col-span-8 lg:min-h-[520px] dark:border-ink-800"
        // Reading should not be interrupted: hovering or tabbing into the panel
        // holds the current story until the pointer or focus leaves.
        onMouseEnter={() => setPaused(true)}
        onMouseLeave={() => setPaused(false)}
        onFocusCapture={() => setPaused(true)}
        onBlurCapture={() => setPaused(false)}
      >
        {/* Image zone: its own block on phones so the picture is never buried
            under the copy; on desktop it fills the panel behind the text. */}
        <div className="relative aspect-[16/10] sm:aspect-[16/9] lg:absolute lg:inset-0 lg:aspect-auto">
          {slides.map((slide, slideIndex) =>
            mounted.includes(slideIndex) ? (
              <div
                key={slide._id}
                aria-hidden={slideIndex !== index}
                className={cn(
                  "absolute inset-0 transition-opacity duration-700 ease-out",
                  slideIndex === index ? "opacity-100" : "opacity-0"
                )}
              >
                <SmartImage
                  src={articleImage(slide)}
                  alt={imageAlt(slide.featuredImage, slide.title)}
                  ratio=""
                  fill
                  rounded="rounded-none"
                  width={1600}
                  priority={slideIndex === 0}
                  imgClassName="transition-transform duration-[1200ms] ease-out group-hover:scale-[1.02]"
                />
              </div>
            ) : null
          )}

          {/* legibility scrims — dark in both themes, so white text always reads */}
          <div
            aria-hidden="true"
            className="absolute inset-0 z-10 bg-gradient-to-t from-black/80 via-black/20 to-black/5 lg:from-black/90 lg:via-black/45 lg:to-black/10"
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 z-10 hidden bg-gradient-to-r from-black/70 via-black/20 to-transparent lg:block"
          />

          {/* slow light sweep + brand glow */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-0 z-10 w-1/3 animate-sheen bg-gradient-to-r from-transparent via-white/25 to-transparent"
          />
          <span
            aria-hidden="true"
            className="pointer-events-none absolute -left-24 -top-24 z-10 h-72 w-72 animate-glow-pulse rounded-full bg-brand-500/30 blur-3xl"
          />

          {count > 1 && (
            <div className="dot-rail absolute right-3 top-3 z-30 sm:right-4 sm:top-4">
              {slides.map((slide, slideIndex) => (
                <button
                  key={slide._id}
                  type="button"
                  onClick={() => setIndex(slideIndex)}
                  aria-label={`Show story ${slideIndex + 1} of ${count}`}
                  aria-current={slideIndex === index}
                  className={cn("dot", slideIndex === index && "dot-active")}
                />
              ))}
            </div>
          )}
        </div>

        <div className="relative z-20 flex flex-col justify-end p-6 sm:p-8 lg:h-full lg:min-h-[520px] lg:p-9">
          <div key={article._id} className="max-w-2xl animate-fade-up">
            <div className="flex flex-wrap items-center gap-2">
              <span className="chip bg-flame text-white shadow-[0_8px_20px_-8px_rgba(244,63,94,.9)]">
                <Flame className="h-3 w-3" aria-hidden="true" />
                Top Story
              </span>
              <Link
                to={categoryHref(article)}
                className="chip bg-white/15 text-white backdrop-blur-sm transition-colors hover:bg-white/25"
              >
                {categoryName(article)}
              </Link>
            </div>

            <h1 className="mt-4 font-display text-3xl font-extrabold leading-[1.14] tracking-tight text-white drop-shadow-sm sm:text-4xl xl:text-[40px]">
              <Link to={articleHref(article)} className="transition-colors hover:text-brand-200">
                {article.title}
              </Link>
            </h1>

            <p className="clamp-2 mt-3 max-w-xl text-sm leading-relaxed text-white/80">
              {excerptOf(article, 180)}
            </p>

            <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-3">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-brand-600 text-sm font-bold text-white ring-2 ring-white/25">
                  {article.author?.image?.url ? (
                    <img
                      src={article.author.image.url}
                      alt=""
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    initialsOf(author)
                  )}
                </span>
                <div className="text-[13px] leading-tight text-white">
                  <p className="font-bold">By {author}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-white/80">
                    {date && <time dateTime={date.toISOString()}>{formatDate(date)}</time>}
                    <span aria-hidden="true">•</span>
                    <span className="inline-flex items-center gap-1">
                      <Clock className="h-3 w-3" aria-hidden="true" />
                      {readTimeOf(article)} min read
                    </span>
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Link
                  to={articleHref(article)}
                  className="inline-flex h-11 items-center gap-2 rounded-xl bg-flame px-5 text-sm font-bold uppercase tracking-wide text-white shadow-[0_12px_28px_-12px_rgba(244,63,94,.95)] transition-transform duration-200 hover:-translate-y-0.5 hover:bg-rose-600"
                >
                  Read Full Story
                  <ArrowRight
                    className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
                    aria-hidden="true"
                  />
                </Link>
                <Link
                  to={categoryHref(article)}
                  className="inline-flex h-11 items-center gap-2 rounded-xl border border-white/35 bg-white/10 px-5 text-sm font-bold text-white backdrop-blur-sm transition-colors hover:bg-white/20"
                >
                  More in {categoryName(article)}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </article>

      {/* ---------------- story rail ---------------- */}
      <div className="card flex flex-col overflow-hidden lg:col-span-4">
        <div className="flex flex-1 flex-col divide-y divide-ink-100 dark:divide-ink-800">
          {rail.slice(0, 4).map((item, index) => (
            <article
              key={item._id}
              className={cn(
                "group/row relative flex flex-1 items-center gap-3.5 px-4 py-3 transition-colors",
                "hover:bg-ink-50/80 dark:hover:bg-ink-800/50"
              )}
              style={{ animationDelay: `${index * 60}ms` }}
            >
              {/* square frame, square image, no crop */}
              <SmartImage
                src={articleImage(item)}
                alt={imageAlt(item.featuredImage, item.title)}
                ratio="aspect-square"
                rounded="rounded-xl"
                width={320}
                className="w-[92px] shrink-0 sm:w-[104px]"
                imgClassName="transition-transform duration-500 group-hover/row:scale-[1.06]"
              />

              <div className="min-w-0 flex-1">
                <span className="text-xs font-bold tracking-wide text-brand-600 dark:text-brand-400">
                  {categoryName(item)}
                </span>
                <h2 className="mt-1 font-display text-sm font-bold leading-snug tracking-tight text-ink-900 dark:text-white">
                  <Link
                    to={articleHref(item)}
                    className="clamp-3 transition-colors group-hover/row:text-brand-600 dark:group-hover/row:text-brand-400"
                  >
                    <span className="absolute inset-0" aria-hidden="true" />
                    {item.title}
                  </Link>
                </h2>
                <p className="mt-1.5 flex items-center gap-2 text-xs text-ink-500 dark:text-ink-400">
                  <span>{formatDate(item.publishedDate || item.createdAt)}</span>
                  <span aria-hidden="true">•</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" aria-hidden="true" />
                    {readTimeOf(item)} min
                  </span>
                </p>
              </div>
            </article>
          ))}
        </div>

        <Link
          to="/latest"
          className="flex items-center justify-center gap-1.5 border-t border-ink-100 bg-ink-50/70 py-3 text-xs font-bold text-brand-600 transition-colors hover:bg-ink-100 dark:border-ink-800 dark:bg-ink-800/40 dark:text-brand-400 dark:hover:bg-ink-800/70"
        >
          View all stories
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}

function HeroSkeleton() {
  return (
    <section className="grid gap-4 lg:grid-cols-12">
      <Skeleton className="min-h-[440px] rounded-2xl sm:min-h-[500px] lg:col-span-8 lg:min-h-[520px]" />
      <div className="card flex flex-col divide-y divide-ink-100 lg:col-span-4 dark:divide-ink-800">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="flex flex-1 gap-3.5 px-4 py-3">
            <Skeleton className="h-[104px] w-[104px] shrink-0 rounded-xl" />
            <div className="flex-1 space-y-2 py-1">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-3/4" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
