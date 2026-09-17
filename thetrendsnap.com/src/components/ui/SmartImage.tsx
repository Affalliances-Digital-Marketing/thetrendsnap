import { useCallback, useEffect, useRef, useState } from "react";
import { ImageOff } from "lucide-react";
import { cn, optimizedImage } from "@/lib/utils";

type Fit = "cover" | "contain";

interface SmartImageProps {
  src?: string;
  alt: string;
  /** Tailwind aspect utility, e.g. "aspect-[16/9]". */
  ratio?: string;
  /**
   * `cover` fills a fixed-ratio card (used in grids so every card aligns).
   * `contain` shows the whole frame — nothing is ever cut off — over a blurred
   * copy of the same image so there are no empty letterbox bars.
   */
  fit?: Fit;
  className?: string;
  imgClassName?: string;
  width?: number;
  priority?: boolean;
  rounded?: string;
  overlay?: boolean;
  /** Absolutely fills the nearest positioned ancestor instead of flowing. */
  fill?: boolean;
  /** Extra classes for the blurred backdrop shown behind a contained image. */
  backdropClassName?: string;
}

export function SmartImage({
  src,
  alt,
  ratio = "aspect-[16/9]",
  fit = "cover",
  className,
  imgClassName,
  width = 800,
  priority = false,
  rounded = "rounded-xl",
  overlay = false,
  fill = false,
  backdropClassName,
}: SmartImageProps) {
  const [status, setStatus] = useState<"loading" | "ready" | "error">(src ? "loading" : "error");
  const imgRef = useRef<HTMLImageElement | null>(null);
  const resolved = src ? optimizedImage(src, width) : "";

  /**
   * A picture already in the browser cache can finish decoding before React
   * attaches `onLoad`, and that event then never fires — the image would sit
   * at `opacity-0` for the rest of the visit, which is why a hero slide could
   * come up blank until the page was reloaded. Checking `complete` covers the
   * case the event misses.
   */
  const settle = useCallback(() => {
    const node = imgRef.current;
    if (!node || !node.complete) return;
    setStatus(node.naturalWidth > 0 ? "ready" : "error");
  }, []);

  useEffect(() => {
    setStatus(src ? "loading" : "error");
    if (src) settle();
  }, [src, resolved, settle]);

  return (
    <div
      className={cn(
        // Position utilities can't both be present — Tailwind's `relative`
        // would win the cascade over a `absolute` passed via className.
        fill ? "absolute inset-0 h-full w-full" : "relative",
        "isolate overflow-hidden bg-ink-100 dark:bg-ink-800",
        ratio,
        rounded,
        className
      )}
    >
      {status === "loading" && <div className={cn("absolute inset-0 skeleton", rounded)} />}

      {status !== "error" && fit === "contain" && (
        // Only a contained image can leave bare frame; fill it with a blurred
        // copy of itself. `cover` images already fill the box edge to edge.
        <img
          src={resolved}
          alt=""
          aria-hidden="true"
          className={cn(
            "absolute inset-0 h-full w-full scale-125 object-cover opacity-70 blur-2xl saturate-150",
            backdropClassName
          )}
          loading="lazy"
          decoding="async"
        />
      )}

      {status !== "error" ? (
        <img
          ref={(node) => {
            imgRef.current = node;
            settle();
          }}
          src={resolved}
          alt={alt}
          width={width}
          loading={priority ? "eager" : "lazy"}
          // React 18 forwards only the lowercase spelling of this attribute.
          {...{ fetchpriority: priority ? "high" : "auto" }}
          decoding="async"
          onLoad={() => setStatus("ready")}
          onError={() => setStatus("error")}
          className={cn(
            "relative h-full w-full transition-all duration-500",
            // `object-center` keeps the subject centred when cover trims edges.
            fit === "cover" ? "object-cover object-center" : "object-contain",
            status === "loading" ? "opacity-0" : "opacity-100",
            imgClassName
          )}
        />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-ink-100 to-ink-200 text-ink-400 dark:from-ink-800 dark:to-ink-900">
          <ImageOff className="h-6 w-6" aria-hidden="true" />
          <span className="px-3 text-center text-xs font-medium uppercase tracking-wide">
            TheTrendSnap
          </span>
        </div>
      )}

      {overlay && status !== "error" && (
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/5"
        />
      )}
    </div>
  );
}
