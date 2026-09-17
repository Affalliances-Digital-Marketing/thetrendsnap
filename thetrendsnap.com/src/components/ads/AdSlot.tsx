import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { AdPosition, Advertisement } from "@/types/api";
import { trackAdClick, trackAdImpression } from "@/lib/api";
import { useAds } from "@/hooks/useContent";
import { useDevice } from "@/hooks/useMediaQuery";
import { cn, imageUrl, optimizedImage } from "@/lib/utils";

/** Set VITE_AD_PLACEHOLDER=true to preview slot geometry without live ads. */
const SHOW_PLACEHOLDER = import.meta.env.VITE_AD_PLACEHOLDER === "true";

/** How long each creative holds the slot before the next one slides in. */
const ROTATE_MS = 7000;

/**
 * One height for every ad on the site, so a page never has one booking twice
 * the size of the next. The picture is scaled down whole to reach it, so
 * nothing is ever cut — a creative wider than it is tall simply lands wider.
 */
const STANDARD_HEIGHT = 240;

/**
 * Column slots are the exception: there the creative *is* the column — a Snap
 * Wall rail or a card down a sidebar — and squeezing it into a shallow strip
 * would leave the space around it empty. These render at the creative's own
 * proportions across the full width of their column.
 */
const NATURAL_POSITIONS = new Set<AdPosition>([
  "home-gallery-left",
  "home-gallery-right",
  "home-gallery",
  "sidebar",
  "sidebar-sticky",
  "article-sidebar-top",
  "article-sidebar-middle",
  "article-sidebar-bottom",
]);

const isRail = (position: AdPosition) => NATURAL_POSITIONS.has(position);

/**
 * The Snap Wall rails are the one place a creative is stretched to its column:
 * the row is built around them and they are booked with large artwork. Every
 * other slot shows a creative at no more than its own pixel size.
 */
const FULL_BLEED_POSITIONS = new Set<AdPosition>([
  "home-gallery-left",
  "home-gallery-right",
  "home-gallery",
]);

/**
 * The leaderboards at the top of the homepage are allowed to grow a little
 * past the creative's own size, so a standard 728×90 reads as the page's
 * headline banner rather than as a strip. A quarter is enough to register and
 * little enough to stay crisp.
 */
const HERO_POSITIONS = new Set<AdPosition>(["home-hero", "home-top"]);
const HERO_SCALE = 1.25;

/**
 * Homepage banners that run the full width of the page: the leaderboards
 * above and the banners between the editorial rows. Each sits on a band of
 * its own colours — a blurred copy of the creative — so there is never a
 * white strip either side of it. Only the top leaderboards are also enlarged.
 */
const BAND_POSITIONS = new Set<AdPosition>([
  "home-hero",
  "home-top",
  "home-mid",
  "home-infeed",
  "home-bottom",
]);

/**
 * Article-page slots sit in a column wider than a standard rectangle. When
 * the creative does not fill it, a blurred copy of the same artwork fills the
 * frame behind it, so the slot reads as one finished card instead of a small
 * picture floating in white. A creative that already fills its column is
 * shown as it is.
 */
const FRAMED_POSITIONS = new Set<AdPosition>([
  "sidebar",
  "sidebar-sticky",
  "article-sidebar-top",
  "article-sidebar-middle",
  "article-sidebar-bottom",
  "article-top",
  "article-inline",
  "article-bottom",
]);

/**
 * Banners shown in a fixed full-width box: the homepage billboard under the
 * hero, the in-feed banner, the banner at the foot of the homepage and the
 * banner at the top of a category. The box is this tall (shorter on narrow screens); the creative is
 * shown whole at that height, centred, and the space either side takes the
 * site's light tint. Artwork made at about 6:1 — 1600×250, say — fills it.
 */
const SHARP_BANNER_HEIGHT: Partial<Record<AdPosition, number>> = {
  "home-hero": 250,
  "home-infeed": 250,
  "home-bottom": 230,
  "category-top": 250,
};

interface AdSlotProps {
  position: AdPosition;
  category?: string;
  className?: string;
  /** Only shapes the empty-slot placeholder; live creatives keep their own. */
  ratio?: string;
  /** Set false only where the surrounding block prints its own label. */
  label?: boolean;
  /** Accepted for call-site compatibility; heights come from the ad itself. */
  maxHeight?: string;
}

/**
 * The disclosure that sits above a paid placement. One component, so the
 * wording, size and colour cannot drift between the page's ad slots, an
 * article's own creative and the Snap Wall rails.
 */
export function AdLabel({ className }: { className?: string }) {
  return (
    <p
      className={cn(
        "mb-1 text-center text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-400 dark:text-ink-500",
        className
      )}
    >
      Advertisement
    </p>
  );
}

/* ------------------------------------------------------------------ */
/* One creative                                                        */
/* ------------------------------------------------------------------ */

function Creative({
  ad,
  sharpHeight,
  rail,
  fullBleed,
  hero,
  band,
  framed,
}: {
  ad: Advertisement;
  sharpHeight?: number;
  rail: boolean;
  fullBleed: boolean;
  hero: boolean;
  band: boolean;
  framed: boolean;
}) {
  const scriptHost = useRef<HTMLDivElement | null>(null);
  const [naturalWidth, setNaturalWidth] = useState(0);
  // Injected markup can contain <script> tags (AdSense/GAM); cloning them into
  // the DOM is the only way the browser will execute them.
  useEffect(() => {
    const host = scriptHost.current;
    if (!host || ad.type !== "script" || !ad.scriptCode) return;

    host.innerHTML = ad.scriptCode;
    host.querySelectorAll("script").forEach((old) => {
      const script = document.createElement("script");
      Array.from(old.attributes).forEach((attr) =>
        script.setAttribute(attr.name, attr.value)
      );
      script.text = old.text;
      old.replaceWith(script);
    });
  }, [ad._id, ad.type, ad.scriptCode]);

  /**
   * Nothing here ever crops or stretches a creative.
   *
   * Every slot but the Snap Wall rails holds the same standard height, and the
   * picture is scaled down whole to reach it — so the ads across a page all
   * read as one size and none of them is missing an edge. A booking that needs
   * a different size names its own height in the panel; nothing else can make
   * one ad tower over the next.
   */
  const cap = ad.maxHeight || (rail ? 0 : STANDARD_HEIGHT);

  const image = optimizedImage(imageUrl(ad.image), 1600);
  const alt = ad.image?.alt || ad.name;

  /*
   * Sharpness.
   *
   * Banners are booked at their standard sizes — a 728×90 leaderboard, a
   * 300×250 rectangle — and a raster enlarged past its own pixels goes soft.
   * The band used to force every creative to 240px tall (a 90px leaderboard
   * blown up nearly three times) and the sidebars stretched a 300px rectangle
   * across the whole column, both behind a blurred copy of the artwork. Now an
   * image is drawn at its own size, shrunk only when the column is narrower,
   * and the slot is exactly as tall as the creative — so it stays crisp and
   * leaves no empty band around it.
   */
  const inner =
    ad.type === "script" ? (
      <div ref={scriptHost} className="flex w-full items-center justify-center" />
    ) : sharpHeight ? (
      <div
        className="w-full overflow-hidden rounded-xl bg-brand-50 dark:bg-ink-800"
        style={{
          height: `clamp(${Math.round((ad.maxHeight || sharpHeight) / 2)}px, ${
            ((ad.maxHeight || sharpHeight) / 1400) * 100
          }vw, ${ad.maxHeight || sharpHeight}px)`,
        }}
      >
        <img
          src={image}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="block h-full w-full object-contain object-center"
        />
      </div>
    ) : fullBleed ? (
      // A Snap Wall rail is a fixed square the width of its column. Its size is
      // known before the picture loads, so the rail — and the tiles matched to
      // its height — never jump when the image arrives, rotates or reloads. A
      // square creative fills it exactly; any other shape is shown whole,
      // centred on the site's light tint.
      <div className="aspect-square w-full overflow-hidden rounded-xl bg-brand-50 dark:bg-ink-800">
        <img
          src={image}
          alt={alt}
          loading="lazy"
          decoding="async"
          className="block h-full w-full object-contain"
        />
      </div>
    ) : band ? (
      // Homepage leaderboard: a quarter larger than the creative, never wider
      // than the page, sitting on a full-width band. The band's left and right
      // are filled with a blurred, saturated copy of the same artwork — the
      // article-page frame, stretched sideways — so the banner reads as one
      // piece across the page in its own colours rather than as a strip with
      // white either side.
      <div className="relative isolate w-full overflow-hidden rounded-xl bg-ink-100 dark:bg-ink-800">
        <img
          src={image}
          alt=""
          aria-hidden="true"
          loading={hero ? "eager" : "lazy"}
          decoding="async"
          className="absolute inset-0 -z-10 h-full w-full scale-150 object-cover opacity-75 blur-2xl saturate-150"
        />
        <img
          src={image}
          alt={alt}
          loading={hero ? "eager" : "lazy"}
          decoding="async"
          onLoad={(event) => setNaturalWidth(event.currentTarget.naturalWidth)}
          style={
            hero
              ? naturalWidth
                ? { width: `${Math.round(naturalWidth * HERO_SCALE)}px` }
                : undefined
              : cap
                ? { maxHeight: `${cap}px` }
                : undefined
          }
          className={cn(
            "relative mx-auto block h-auto max-w-full shadow-[0_10px_30px_-14px_rgba(0,0,0,.45)]",
            !hero && "w-auto"
          )}
        />
      </div>
    ) : framed ? (
      // Drawn at its own size, shrunk only when the column is narrower, and
      // centred. Nothing sits behind it — no blurred copy of the artwork.
      <div className="w-full">
        <img
          src={image}
          alt={alt}
          loading="lazy"
          decoding="async"
          style={cap ? { maxHeight: `${cap}px` } : undefined}
          className="mx-auto block h-auto w-auto max-w-full rounded-xl"
        />
      </div>
    ) : (
      <img
        src={image}
        alt={alt}
        loading="lazy"
        decoding="async"
        style={cap ? { maxHeight: `${cap}px` } : undefined}
        className="mx-auto block h-auto w-auto max-w-full rounded-lg"
      />
    );

  const href = ad.targetUrl?.trim() || ad.image?.redirectUrl?.trim() || "";
  const newTab = ad.openInNewTab ?? ad.image?.openInNewTab ?? true;

  if (!href) return inner;

  return (
    <a
      href={href}
      target={newTab === false ? "_self" : "_blank"}
      rel="noopener noreferrer sponsored"
      onClick={() => trackAdClick(ad._id)}
      className="block"
    >
      {inner}
    </a>
  );
}

/* ------------------------------------------------------------------ */
/* Slot                                                                */
/* ------------------------------------------------------------------ */

/**
 * Renders the ads booked for a position.
 *
 * One booking renders as a static banner. Several rotate through the same
 * space — the slot stays one banner tall however many are sold, which is why
 * booking more of them cannot push the page around. Rotation pauses while the
 * pointer is over the slot so a creative can actually be clicked, and holds
 * still entirely for readers who ask for reduced motion.
 *
 * When nothing is booked the component returns `null` and the surrounding
 * layout closes up — sections use flow spacing rather than fixed offsets
 * precisely so both states look intentional.
 */
export function AdSlot({
  position,
  category,
  className,
  ratio = "aspect-[970/140]",
  label = true,
}: AdSlotProps) {
  const device = useDevice();
  const { data } = useAds(position, device, category);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const ads = useMemo(
    () =>
      (data || []).filter(
        (item) => !item.devices?.length || item.devices.includes(device)
      ),
    [data, device]
  );

  const current = ads[Math.min(index, Math.max(ads.length - 1, 0))];

  // A booking list that changed under us must not leave the slot on a stale
  // index — that would blank the frame until the next tick.
  useEffect(() => {
    setIndex(0);
  }, [ads.length, position]);

  useEffect(() => {
    if (ads.length < 2 || paused) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const timer = window.setInterval(
      () => setIndex((prev) => (prev + 1) % ads.length),
      ROTATE_MS
    );
    return () => window.clearInterval(timer);
  }, [ads.length, paused]);

  // Each creative counts once per appearance, so a rotation earns its own
  // impression rather than only the first one in the list ever being counted.
  useEffect(() => {
    if (current?._id) trackAdImpression(current._id);
  }, [current?._id]);

  const goTo = useCallback((next: number) => setIndex(next), []);

  // Track the height of the slide on show; images finish loading after the
  // first paint, so this keeps watching rather than measuring once. The slide
  // is held in state and watched from an effect: an observer owned by a ref
  // callback was torn down when the page was entered from another page (the
  // ads came from cache and mounted with the cleanup), leaving the frame
  // stuck at its first, pre-load height and the creative cut off.
  const [frameHeight, setFrameHeight] = useState<number>();
  const [activeSlide, setActiveSlide] = useState<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!activeSlide) return;
    const measure = () => setFrameHeight(activeSlide.offsetHeight || undefined);
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(activeSlide);
    return () => observer.disconnect();
  }, [activeSlide]);

  if (!current) {
    if (!SHOW_PLACEHOLDER) return null;
    return (
      <div
        className={cn(
          "flex items-center justify-center rounded-xl border border-dashed border-ink-300 bg-ink-50 text-xs font-semibold uppercase tracking-wide text-ink-400 dark:border-ink-700 dark:bg-ink-900/60",
          ratio || "py-8",
          className
        )}
      >
        Ad slot · {position}
      </div>
    );
  }

  const rotating = ads.length > 1;

  return (
    <aside
      className={cn("w-full", className)}
      aria-label="Advertisement"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      {/* Small, quiet, and above every creative: paid placement has to be
          named as such, and one label in one style says it the same way
          wherever an ad appears. */}
      {label && <AdLabel />}

      {/* The rail is as wide as the slot and slides one creative at a time.
          Its height follows the creative on show, so a short banner rotating
          with a tall one never sits above an empty band. */}
      <div
        className="relative overflow-hidden"
        style={frameHeight ? { height: frameHeight } : undefined}
      >
        <div
          className="flex items-start transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
          aria-live="off"
        >
          {ads.map((ad, position_) => (
            <div
              key={ad._id}
              ref={position_ === index ? setActiveSlide : undefined}
              className="w-full shrink-0 basis-full"
              aria-hidden={position_ === index ? undefined : true}
            >
              <Creative
                ad={ad}
                sharpHeight={SHARP_BANNER_HEIGHT[position]}
                rail={isRail(position)}
                fullBleed={FULL_BLEED_POSITIONS.has(position)}
                hero={HERO_POSITIONS.has(position)}
                band={BAND_POSITIONS.has(position)}
                framed={FRAMED_POSITIONS.has(position)}
              />
            </div>
          ))}
        </div>
      </div>

      {rotating && (
        <div className="mt-1.5 flex items-center justify-center gap-1.5">
          {ads.map((ad, dot) => (
            <button
              key={ad._id}
              type="button"
              onClick={() => goTo(dot)}
              aria-label={`Show advertisement ${dot + 1} of ${ads.length}`}
              aria-current={dot === index}
              className={cn("dot", dot === index && "dot-active")}
            />
          ))}
        </div>
      )}
    </aside>
  );
}
