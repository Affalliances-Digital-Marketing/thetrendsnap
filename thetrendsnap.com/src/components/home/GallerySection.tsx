import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, CalendarDays } from "lucide-react";
import type {
  AdPosition,
  Article,
  GalleryRail,
  GalleryRailSize,
  GalleryRailWidth,
  GallerySide,
  HomepageGallery,
} from "@/types/api";
import { SmartImage } from "@/components/ui/SmartImage";
import { Skeleton } from "@/components/ui/Skeleton";
import { AdLabel, AdSlot } from "@/components/ads/AdSlot";
import { useAds } from "@/hooks/useContent";
import { useDevice } from "@/hooks/useMediaQuery";
import {
  articleHref,
  articleImage,
  categoryHref,
  categoryName,
  cn,
  formatDate,
  optimizedImage,
  timeAgo,
} from "@/lib/utils";

/** Ad slot each side falls back to when the admin has not named one. */
export const DEFAULT_RAIL_POSITION: Record<GallerySide, AdPosition> = {
  left: "home-gallery-left",
  right: "home-gallery-right",
};

/** Shown when the admin has not renamed the block. */
export const GALLERY_DEFAULTS = {
  title: "Snap Wall",
  subtitle: "Four frames from the stories everyone is watching right now.",
  actionLabel: "Open the wall",
  actionLink: "/gallery",
};

/* ------------------------------------------------------------------ */
/* Layout table                                                        */
/*                                                                     */
/* The row is always twelve columns, so turning the rail on genuinely   */
/* narrows the grid instead of pushing it out of the row. Tailwind      */
/* only ships classes it can see in the source, so the spans have to be */
/* written out literally rather than interpolated.                      */
/* ------------------------------------------------------------------ */

/**
 * Column arithmetic.
 *
 * The row is always twelve columns and the tiles always consume their whole
 * column — no max width, no centring — so a missing rail can never leave a gap
 * at the edge. Rather than growing the squares to fill that space (four
 * half-width squares would be taller than the viewport), the row re-flows to
 * four across: it fills the width *and* makes each tile smaller.
 *
 * With a rail on each side the tiles lock to two-by-two, so a pair of banners
 * faces each other across a square block.
 *
 * Tailwind only ships classes it can see in the source, so the spans are
 * written out literally rather than interpolated.
 */
const SPAN: Record<number, string> = {
  2: "lg:col-span-2",
  3: "lg:col-span-3",
  4: "lg:col-span-4",
  5: "lg:col-span-5",
  6: "lg:col-span-6",
  7: "lg:col-span-7",
  8: "lg:col-span-8",
  9: "lg:col-span-9",
  10: "lg:col-span-10",
  12: "lg:col-span-12",
};

/**
 * Columns a rail takes. When both sides run they are capped at three each, so
 * the row settles into a balanced 3 / 6 / 3 whatever widths were picked — a
 * pair of wide rails would otherwise squeeze the tiles down to nothing.
 */
const RAIL_COLS: Record<GalleryRailWidth, number> = { narrow: 3, medium: 4, wide: 5 };
const PAIRED_MAX_COLS = 3;

/**
 * Frame for each creative slot.
 *
 * `auto` is the default and deliberately holds no frame: no ratio to letterbox
 * the artwork into and no width cap to leave bare card beside it, so the
 * banner spans the rail exactly as tall as its own proportions make it. The
 * fixed entries are for slots that must keep one height across rotations.
 */
const RAIL_SIZE: Record<GalleryRailSize, { ratio: string; maxWidth: string }> = {
  auto: { ratio: "", maxWidth: "" },
  "300x250": { ratio: "aspect-[300/250]", maxWidth: "max-w-[300px]" },
  "300x600": { ratio: "aspect-[300/600]", maxWidth: "max-w-[300px]" },
  "160x600": { ratio: "aspect-[160/600]", maxWidth: "max-w-[160px]" },
};

const isAutoSize = (rail: GalleryRail) => !rail.size || rail.size === "auto";

const sizeOf = (rail: GalleryRail) =>
  RAIL_SIZE[rail.size && RAIL_SIZE[rail.size] ? rail.size : "auto"];

/** Tile columns for the space the grid ended up with. */
function tileColumns(gridCols: number, paired: boolean): string {
  if (paired) return "grid-cols-2";
  if (gridCols >= 12) return "grid-cols-2 lg:grid-cols-4";
  if (gridCols >= 9) return "grid-cols-2 xl:grid-cols-4";
  if (gridCols >= 8) return "grid-cols-2 2xl:grid-cols-4";
  return "grid-cols-2";
}

/** The row sits on a panel so the block reads as one object on the page. */
const PANEL =
  "rounded-2xl border border-ink-200 bg-ink-50/70 p-3 shadow-card sm:p-4 dark:border-ink-800 dark:bg-ink-900/50";

interface Tile {
  key: string;
  image: string;
  title: string;
  category: string;
  /** Relative age, e.g. "3 days ago". */
  meta: string;
  /** The publication date itself, spelled out. */
  date: string;
  href: string;
  categoryHref: string;
  external: boolean;
}

const isExternal = (href: string) => /^https?:\/\//i.test(href);

const dateSourceOf = (article: Article) =>
  article.publishedDate || article.createdAt || article.updatedAt;

const metaOf = (article: Article): string => timeAgo(dateSourceOf(article));

/** A tile needs a picture; anything without one would render as a grey hole. */
function tileFromArticle(article: Article): Tile | null {
  const image = articleImage(article);
  if (!image) return null;

  return {
    key: article._id,
    image,
    title: article.title,
    category: categoryName(article),
    meta: metaOf(article),
    date: formatDate(dateSourceOf(article)),
    href: articleHref(article),
    categoryHref: categoryHref(article),
    external: false,
  };
}

/**
 * Resolves the four tiles.
 *
 * Curated tiles win, and each field falls back to the linked article, so an
 * editor can override just the title (or just the image) and leave the rest.
 * Whatever is missing is topped up from the live feed — a half-filled block is
 * never rendered, which is the point of the backfill.
 */
function resolveTiles(gallery: HomepageGallery | undefined, pool: Article[]): Tile[] {
  const tiles: Tile[] = [];
  const usedArticles = new Set<string>();

  if (gallery?.source === "manual") {
    (gallery.items || []).forEach((item, index) => {
      const pinned =
        item.article && typeof item.article === "object" ? (item.article as Article) : null;

      // A pinned story that was later unpublished must not keep its tile; the
      // backfill below takes the slot instead.
      const article = pinned && pinned.status && pinned.status !== "published" ? null : pinned;

      const image = item.image || (article ? articleImage(article) : "");
      const title = item.title || article?.title || "";
      if (!image || !title) return;

      const href = item.link || (article ? articleHref(article) : "");
      if (!href) return;

      if (article) usedArticles.add(article._id);

      tiles.push({
        key: `curated-${index}`,
        image,
        title,
        category: item.category || (article ? categoryName(article) : "Featured"),
        meta: article ? metaOf(article) : "",
        date: article ? formatDate(dateSourceOf(article)) : "",
        href,
        categoryHref: article ? categoryHref(article) : "",
        external: isExternal(href),
      });
    });
  }

  for (const article of pool) {
    if (tiles.length >= 4) break;
    if (usedArticles.has(article._id)) continue;
    const tile = tileFromArticle(article);
    if (!tile) continue;
    usedArticles.add(article._id);
    tiles.push(tile);
  }

  // Only whole rows: four tiles, or two, never a ragged three.
  return tiles.slice(0, tiles.length >= 4 ? 4 : 2);
}

/* ------------------------------------------------------------------ */
/* Tile                                                                */
/* ------------------------------------------------------------------ */

function GalleryTile({
  tile,
  index,
  priority,
  stretch,
}: {
  tile: Tile;
  index: number;
  priority: boolean;
  /** Fill the grid cell instead of holding a square — used when the row's
      height is being matched to the banners beside it. */
  stretch?: boolean;
}) {
  const categoryChip = (
    <span className="chip bg-black/55 px-2.5 py-1 text-xs text-white shadow-sm ring-1 ring-white/25 backdrop-blur-md sm:text-xs">
      {tile.category}
    </span>
  );

  return (
    <article
      className={cn(
        "group relative overflow-hidden rounded-2xl border border-ink-200 bg-ink-100 shadow-card ring-1 ring-black/5 transition-all duration-300 hover:-translate-y-1 hover:border-brand-300 hover:shadow-pop dark:border-ink-800 dark:bg-ink-800 dark:ring-white/5 dark:hover:border-brand-500/50",
        stretch ? "h-full" : "aspect-square"
      )}
    >
      {/* `contain` shows the whole picture — nothing is ever cropped — over a
          blurred copy of itself, so the square frame has no empty bars. */}
      <SmartImage
        src={tile.image}
        alt=""
        fill
        ratio=""
        rounded="rounded-none"
        fit="contain"
        width={720}
        priority={priority}
        backdropClassName="opacity-60 blur-3xl"
        imgClassName="transition-transform duration-500 group-hover:scale-[1.04]"
      />

      {/* Scrims: the text sits on these, not on the picture, so a light photo
          and a dark photo read identically — and identically in both themes. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 top-0 z-10 h-1/3 bg-gradient-to-b from-black/55 via-black/20 to-transparent"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-10 h-3/5 bg-gradient-to-t from-black/90 via-black/55 to-transparent"
      />
      {/* Brand wash on hover — the only colour the tile adds to the photo. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-tr from-brand-600/40 via-transparent to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100"
      />

      {/* Frame number — gives the wall a running order. */}
      <span
        aria-hidden="true"
        className="absolute left-2.5 top-2.5 z-20 font-display text-xs font-extrabold tabular-nums text-white/80 drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] sm:left-3 sm:top-3 sm:text-xs"
      >
        {String(index + 1).padStart(2, "0")}
      </span>

      {/* Category — top right, above the stretched title link so it stays
          separately clickable. */}
      <div className="absolute right-2.5 top-2.5 z-30 sm:right-3 sm:top-3">
        {tile.categoryHref ? (
          <Link
            to={tile.categoryHref}
            className="transition-opacity hover:opacity-85"
            aria-label={`More in ${tile.category}`}
          >
            {categoryChip}
          </Link>
        ) : (
          categoryChip
        )}
      </div>

      {/* Positioned wrapper, so the title's stretched link covers the whole
          tile rather than just this strip. */}
      <div className="relative z-20 flex h-full flex-col justify-end p-3 sm:p-3.5">
        {/* A caption plate: the headline and its meta always sit on the same
            dark ground, whatever the picture behind them is doing. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 z-0 h-[62%] bg-gradient-to-t from-black/95 via-black/75 to-transparent"
        />
        <span
          aria-hidden="true"
          className="mb-2 h-0.5 w-7 rounded-full bg-brand-400/90 transition-all duration-300 group-hover:w-12"
        />

        {/* Two lines of room, so a headline wraps instead of being cut at the
            first word that does not fit. */}
        <h3 className="relative z-10 min-h-[2.4em] font-display text-[13px] font-bold leading-snug tracking-tight text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.75)] sm:text-sm">
          {tile.external ? (
            <a
              href={tile.href}
              target="_blank"
              rel="noopener noreferrer"
              className="clamp-2 transition-colors hover:text-brand-200"
            >
              <span className="absolute inset-0" aria-hidden="true" />
              {tile.title}
            </a>
          ) : (
            <Link to={tile.href} className="clamp-2 transition-colors hover:text-brand-200">
              <span className="absolute inset-0" aria-hidden="true" />
              {tile.title}
            </Link>
          )}
        </h3>

        {/*
         * Date and reads sit on the plate in solid white with a shadow behind
         * the glyphs: the tile is always dark-scrimmed, so one treatment reads
         * on a bright photograph and a dark one, in either site theme.
         */}
        <div className="relative z-10 mt-1.5 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs font-semibold text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
          {tile.date && (
            <span className="inline-flex items-center gap-1 whitespace-nowrap">
              <CalendarDays className="h-3 w-3 shrink-0" aria-hidden="true" />
              <time dateTime={tile.date}>{tile.date}</time>
              {tile.meta && <span className="text-white/80">· {tile.meta}</span>}
            </span>
          )}

          <span className="ml-auto inline-flex items-center gap-1 opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            View
            <ArrowUpRight className="h-3.5 w-3.5" aria-hidden="true" />
          </span>
        </div>
      </div>
    </article>
  );
}

/* ------------------------------------------------------------------ */
/* Rail                                                                */
/* ------------------------------------------------------------------ */

function GalleryRailBox({ rail, side }: { rail: GalleryRail; side: GallerySide }) {
  const auto = isAutoSize(rail);
  // A card taller than its creative is precisely what leaves empty space above
  // and below the banner, so an auto-sized rail never stretches: the card ends
  // where the artwork ends.
  const stretch = !auto && rail.stretch === true;

  const inner =
    rail.type === "banner" ? (
      <img
        src={optimizedImage(rail.image || "", 720)}
        alt={rail.imageAlt || rail.heading || "Promotion"}
        loading="lazy"
        decoding="async"
        // Its own aspect ratio inside the box: never cropped, never stretched.
        className="w-full rounded-xl object-contain"
      />
    ) : (
      <AdSlot
        position={(rail.adPosition || DEFAULT_RAIL_POSITION[side]) as AdPosition}
        ratio={sizeOf(rail).ratio || "aspect-[300/250]"}
        label={false}
        className="w-full"
      />
    );

  const body =
    rail.type === "banner" && rail.link ? (
      <a
        href={rail.link}
        target={rail.openInNewTab === false ? "_self" : "_blank"}
        rel="noopener noreferrer sponsored"
        className="block"
      >
        {inner}
      </a>
    ) : (
      inner
    );

  // Auto rails are frameless: no card, no padding and no label row, so the
  // creative reaches all four edges of the rail. A card would only add chrome
  // the artwork has to sit inside — the "empty space in the box" this avoids.
  // Nothing is printed over the artwork either; the landmark label carries the
  // disclosure for assistive technology without marking the picture itself.
  if (auto) {
    return (
      <aside aria-label={rail.heading || "Advertisement"} className="w-full">
        {/* The rail's creative is frameless, so the disclosure sits above it
            rather than on the artwork. `label={false}` on the slot below keeps
            it from being printed twice. */}
        <AdLabel />
        <div className="relative overflow-hidden rounded-2xl">{body}</div>
      </aside>
    );
  }

  return (
    <aside
      aria-label={rail.heading || "Advertisement"}
      className={cn("w-full", stretch && "lg:h-full")}
    >
      <div className={cn("card flex flex-col gap-2 p-2.5", stretch && "lg:h-full")}>
        {/* Only a heading the editor actually typed is printed; an unnamed
            rail shows the creative alone. */}
        {rail.heading && (
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-ink-400">
            {rail.heading}
          </p>
        )}
        {/* The card fills the column, the creative stays its own size and sits
            in the middle of it. Letting the creative grow with the column
            instead would make a wide rail render an enormous banner. */}
        <div
          className={cn(
            "mx-auto w-full",
            // Auto rails take the whole card width; only a fixed slot is
            // capped, because there the creative's own pixel size is the point.
            sizeOf(rail).maxWidth,
            stretch && "flex min-h-0 flex-1 items-center justify-center"
          )}
        >
          {body}
        </div>
      </div>
    </aside>
  );
}

/* ------------------------------------------------------------------ */
/* Section                                                             */
/* ------------------------------------------------------------------ */

/** Resolves one side: is it configured, and will it actually have something to show? */
function useRailState(rail: GalleryRail | undefined, side: GallerySide, device: string) {
  const position = (rail?.adPosition || DEFAULT_RAIL_POSITION[side]) as AdPosition;
  // Only an explicit `false` turns a side off. A homepage document saved
  // before the rails existed carries no flag at all, and in that case the
  // booked ad alone decides whether the column appears.
  const enabled = rail?.enabled !== false;
  const wantsAd = Boolean(enabled && rail?.type !== "banner");

  // A rail must not reserve a column it cannot fill: an unsold slot would leave
  // a visible hole beside the tiles. The booked ads are checked here so the
  // column only exists once something will render in it. The query is skipped
  // entirely when this side is off or serves a self-hosted banner.
  const { data: ads, isFetched } = useAds(position, device, undefined, wantsAd);

  const active = Boolean(
    enabled && (rail?.type === "banner" ? Boolean(rail.image) : (ads?.length ?? 0) > 0)
  );

  const width: GalleryRailWidth =
    rail?.width && rail.width in RAIL_COLS ? rail.width : "narrow";

  // Until the booking is known the row's shape is not: rendering the tiles
  // first would lay them out full width and then squeeze them when the rail
  // arrives.
  const settled = !wantsAd || isFetched;

  return { active, width, settled };
}

export function GallerySection({
  gallery,
  articles,
  loading,
}: {
  gallery?: HomepageGallery;
  articles: Article[];
  loading?: boolean;
}) {
  const device = useDevice();
  const leftRail = gallery?.rails?.left;
  const rightRail = gallery?.rails?.right;

  const left = useRailState(leftRail, "left", device);
  const right = useRailState(rightRail, "right", device);

  const paired = left.active && right.active;
  const colsFor = (state: { active: boolean; width: GalleryRailWidth }) =>
    state.active ? (paired ? Math.min(RAIL_COLS[state.width], PAIRED_MAX_COLS) : RAIL_COLS[state.width]) : 0;

  const leftCols = colsFor(left);
  const rightCols = colsFor(right);
  const gridCols = 12 - leftCols - rightCols;

  const tiles = useMemo(() => resolveTiles(gallery, articles), [gallery, articles]);

  /**
   * Height matching.
   *
   * The rails render their creative at its own proportions, so a column
   * holding one ends wherever the artwork does — shorter than a block of
   * square tiles, and the difference shows as bare panel under the ad.
   * Cropping the banner to close that gap is not an option, so the tiles give
   * way instead: the row is measured from the tallest banner and the tiles
   * fill exactly that height. Both columns then end on the same line.
   *
   * Desktop only — below 1024px the rails stack under the tiles and each
   * block is free to take its natural height.
   */
  const [rowHeight, setRowHeight] = useState<number | null>(null);
  const matchHeights = device === "desktop" && (left.active || right.active);

  // The rail boxes are kept in state, so the observer below is built from
  // whatever is mounted *now*. An observer wired up inside a ref callback and
  // torn down on unmount lost its boxes when the page was left and returned to
  // (the rails re-mounted from cache in the same commit as the cleanup), and
  // the tiles fell back to their square height beside the rails.
  const [leftBox, setLeftBox] = useState<HTMLDivElement | null>(null);
  const [rightBox, setRightBox] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    const nodes = [leftBox, rightBox].filter((node): node is HTMLDivElement => Boolean(node));
    if (!matchHeights || nodes.length === 0) {
      setRowHeight(null);
      return;
    }

    const measure = () => {
      const tallest = Math.max(...nodes.map((node) => node.getBoundingClientRect().height));
      // A rail not laid out yet measures near zero; ignore it rather than
      // collapsing the tiles to nothing.
      setRowHeight(tallest > 120 ? Math.round(tallest) : null);
    };

    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [leftBox, rightBox, matchHeights, tiles.length, leftCols, rightCols]);

  if (gallery?.enabled === false) return null;

  if (loading || !left.settled || !right.settled) {
    return (
      <section>
        <Skeleton className="mb-5 h-7 w-44" />
        <div className={PANEL}>
          <div className={cn("grid w-full gap-4 sm:gap-5", tileColumns(12, false))}>
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="aspect-square rounded-2xl" />
            ))}
          </div>
        </div>
      </section>
    );
  }

  if (tiles.length < 2) return null;

  return (
    <section aria-label={gallery?.title || GALLERY_DEFAULTS.title}>
      <div className="section-rule">
        <div className="min-w-0">
          <h2 className="section-title">{gallery?.title || GALLERY_DEFAULTS.title}</h2>
          <p className="mt-1 text-sm text-ink-500 dark:text-ink-400">
            {gallery?.subtitle || GALLERY_DEFAULTS.subtitle}
          </p>
        </div>

        <Link to={gallery?.actionLink || GALLERY_DEFAULTS.actionLink} className="btn-outline">
          {gallery?.actionLabel || GALLERY_DEFAULTS.actionLabel}
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>

      <div className={cn("grid gap-4 lg:grid-cols-12 lg:gap-5", PANEL)}>
        {/* Source order puts the tiles first so a phone gets the content before
            the ads; the desktop row restores left / centre / right. */}
        <div className={cn("min-w-0", SPAN[gridCols] ?? SPAN[12])}>
          <div
            className={cn("grid w-full gap-4 sm:gap-5", tileColumns(gridCols, paired))}
            // Equal rows, so however many the grid ends up with they divide the
            // measured height between them exactly.
            style={rowHeight ? { height: rowHeight, gridAutoRows: "1fr" } : undefined}
          >
            {tiles.map((tile, index) => (
              <GalleryTile
                key={tile.key}
                tile={tile}
                index={index}
                priority={index < 2}
                stretch={Boolean(rowHeight)}
              />
            ))}
          </div>
        </div>

        {/* The outer cell takes the row's height; the inner box keeps the
            banner's own. Measuring the inner one is what stops the row height
            and the rail height from chasing each other. Two creatives of
            different proportions differ by a few pixels — centring splits that
            evenly instead of hanging it all under the shorter one. */}
        {left.active && leftRail && (
          <div className={cn("flex min-w-0 items-center lg:order-first", SPAN[leftCols])}>
            <div ref={setLeftBox} className="w-full">
              <GalleryRailBox rail={leftRail} side="left" />
            </div>
          </div>
        )}

        {right.active && rightRail && (
          <div className={cn("flex min-w-0 items-center lg:order-last", SPAN[rightCols])}>
            <div ref={setRightBox} className="w-full">
              <GalleryRailBox rail={rightRail} side="right" />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
