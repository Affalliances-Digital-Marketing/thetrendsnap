import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Article } from "@/types/api";
import { SmartImage } from "@/components/ui/SmartImage";
import { CategoryChip } from "@/components/ui/Bits";
import { ArticleMeta } from "@/components/ArticleCard";
import {
  articleHref,
  articleImage,
  categoryHref,
  categoryName,
  cn,
  imageAlt,
} from "@/lib/utils";

/**
 * One card in the closing row.
 *
 * The row closes the page, so it stays shallow: a landscape frame, a headline
 * capped at two lines and one line of meta. The whole card is one target,
 * with the category chip lifted above it so it stays separately clickable.
 */
function SliderCard({ article, priority }: { article: Article; priority: boolean }) {
  return (
    <article className="group/card relative flex h-full flex-col overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-card transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-pop dark:border-ink-800 dark:bg-ink-900 dark:hover:border-brand-500/40">
      <div className="relative overflow-hidden">
        <SmartImage
          src={articleImage(article)}
          alt={imageAlt(article.featuredImage, article.title)}
          ratio="aspect-[16/11]"
          rounded="rounded-none"
          width={480}
          priority={priority}
          imgClassName="transition-transform duration-700 group-hover/card:scale-[1.05]"
        />

        {/* The chip sits on the artwork, so it needs its own ground. */}
        <div className="absolute left-2.5 top-2.5 z-20">
          <CategoryChip
            name={categoryName(article)}
            href={categoryHref(article)}
            variant="solid"
            className="bg-black/55 px-2 py-0.5 text-[10px] ring-1 ring-inset ring-white/20 backdrop-blur-md"
          />
        </div>

        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/45 to-transparent"
        />
      </div>

      <div className="flex flex-1 flex-col gap-1 p-2.5 sm:p-3">
        <h3 className="min-h-[2.5em] font-display text-[13px] font-bold leading-snug tracking-tight text-ink-900 dark:text-white">
          <Link
            to={articleHref(article)}
            className="clamp-2 transition-colors group-hover/card:text-brand-600 dark:group-hover/card:text-brand-400"
          >
            <span className="absolute inset-0" aria-hidden="true" />
            {article.title}
          </Link>
        </h3>

        <ArticleMeta article={article} className="mt-auto text-[10.5px]" compact />
      </div>
    </article>
  );
}

/**
 * The closing row of stories, scrolled sideways.
 *
 * A native scroller with snap points drives it, so a trackpad, a touchscreen
 * and the arrow buttons all move the same thing and the row still works while
 * JavaScript is busy. The arrows and the edge fades appear only on the side
 * that actually has more to show.
 */
export function StorySlider({
  articles,
  className,
}: {
  articles: Article[];
  className?: string;
}) {
  const track = useRef<HTMLDivElement | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(true);

  const sync = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    sync();
    const el = track.current;
    if (!el) return;
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    return () => observer.disconnect();
  }, [sync, articles.length]);

  const nudge = (direction: -1 | 1) => {
    const el = track.current;
    if (!el) return;
    // A whole card plus its gap, so a click lands on a card edge rather than
    // halfway across one.
    const card = el.querySelector("article");
    const step = card ? card.getBoundingClientRect().width + 16 : el.clientWidth * 0.8;
    el.scrollBy({ left: step * direction, behavior: "smooth" });
  };

  if (articles.length === 0) return null;

  const arrow =
    "btn-icon absolute top-1/2 z-20 hidden h-10 w-10 -translate-y-1/2 shadow-pop transition-opacity duration-200 disabled:pointer-events-none disabled:opacity-0 lg:flex";

  return (
    <div className={cn("relative", className)}>
      {/* Fades say the row continues past the frame — including on a touch
          screen, where the arrows are not shown at all. */}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 z-10 w-12 bg-gradient-to-r from-white to-transparent transition-opacity duration-300 dark:from-[#0b1120]",
          atStart && "opacity-0"
        )}
      />
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-white to-transparent transition-opacity duration-300 dark:from-[#0b1120]",
          atEnd && "opacity-0"
        )}
      />

      <div
        ref={track}
        onScroll={sync}
        className="no-scrollbar flex snap-x snap-mandatory gap-3 overflow-x-auto scroll-smooth px-0.5 pb-1 pt-1 sm:gap-4"
      >
        {articles.map((article, index) => (
          <div
            key={article._id}
            className="w-[58%] shrink-0 snap-start sm:w-[34%] lg:w-[calc((100%-3.75rem)/4)] xl:w-[calc((100%-5rem)/5)]"
          >
            <SliderCard article={article} priority={index < 3} />
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => nudge(-1)}
        disabled={atStart}
        aria-label="Previous stories"
        className={cn(arrow, "-left-4")}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>
      <button
        type="button"
        onClick={() => nudge(1)}
        disabled={atEnd}
        aria-label="More stories"
        className={cn(arrow, "-right-4")}
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </div>
  );
}
