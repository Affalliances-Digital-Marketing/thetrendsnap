import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import type { ApiImage } from "@/types/api";
import { cn, optimizedImage } from "@/lib/utils";

interface Size {
  width: number;
  height: number;
}

const sizeOf = (image?: ApiImage): Size | null =>
  image?.width && image?.height ? { width: image.width, height: image.height } : null;

/**
 * The article's lead picture, shown whole.
 *
 * It used to sit in a fixed 16:9 frame and fill it, which did two things to a
 * picture that was not 16:9 and not as wide as the column: it cut the sides
 * off, and it stretched what was left past the file's own pixels until the
 * result went soft. A 700x300 lead image lost both ends and was blown up by
 * half again.
 *
 * So the frame takes the picture's proportions instead of imposing its own,
 * and never grows wider than the file itself. Nothing is cropped, nothing is
 * upscaled, and there is no blurred copy behind it — on a column wider than
 * the artwork the whole figure simply centres, caption and all.
 */
export function FeaturedImage({
  src,
  alt,
  image,
  priority = false,
  className,
  imgClassName,
  children,
}: {
  src: string;
  alt: string;
  image?: ApiImage;
  priority?: boolean;
  className?: string;
  imgClassName?: string;
  /** Caption / credit strip, kept inside the same bounded figure. */
  children?: React.ReactNode;
}) {
  // The backend records a size for anything uploaded through the media
  // library; a picture registered from an external URL has none, so that one
  // is measured as it loads instead.
  const [size, setSize] = useState<Size | null>(() => sizeOf(image));
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setSize(sizeOf(image));
    setFailed(false);
  }, [src, image]);

  // Request twice the displayed size so the picture stays crisp on a retina
  // screen. Cloudinary's `c_limit` never enlarges, so asking for more than the
  // file holds simply returns the file.
  const resolved = optimizedImage(src, size ? Math.min(size.width, 1600) : 1400);

  if (failed) {
    return (
      <figure
        className={cn(
          "flex aspect-[16/9] flex-col items-center justify-center gap-2 rounded-2xl border border-ink-200 bg-gradient-to-br from-ink-100 to-ink-200 text-ink-400 dark:border-ink-800 dark:from-ink-800 dark:to-ink-900",
          className
        )}
      >
        <ImageOff className="h-6 w-6" aria-hidden="true" />
        <span className="px-3 text-center text-xs font-medium uppercase tracking-wide">
          TheTrendSnap
        </span>
      </figure>
    );
  }

  return (
    <figure
      className={cn(
        "mx-auto w-full overflow-hidden rounded-2xl border border-ink-200 dark:border-ink-800",
        className
      )}
      // The cap is the whole fix: the figure stops at the artwork's own width,
      // so the picture is never drawn larger than it was made.
      style={size ? { maxWidth: `${size.width}px` } : undefined}
    >
      <img
        src={resolved}
        alt={alt}
        // Reserving the real box keeps the headline from jumping as it loads.
        width={size?.width}
        height={size?.height}
        loading={priority ? "eager" : "lazy"}
        {...{ fetchpriority: priority ? "high" : "auto" }}
        decoding="async"
        onLoad={(event) => {
          if (size) return;
          const node = event.currentTarget;
          if (node.naturalWidth) {
            setSize({ width: node.naturalWidth, height: node.naturalHeight });
          }
        }}
        onError={() => setFailed(true)}
        className={cn("block h-auto w-full", imgClassName)}
      />
      {children}
    </figure>
  );
}
