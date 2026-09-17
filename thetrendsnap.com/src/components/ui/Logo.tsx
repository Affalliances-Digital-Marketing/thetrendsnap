import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * The brand wordmark, used as supplied.
 *
 * Two files rather than one: the artwork's letterforms are near-black, so the
 * dark header gets a twin whose neutral strokes are white and whose purple is
 * untouched. Both are the same image at the same size, so the swap is
 * invisible apart from the colour.
 */
export function Logo({
  className,
  compact = false,
  tone = "auto",
  size = "md",
}: {
  className?: string;
  /** Kept for call sites that used to hide the tagline; the mark carries it. */
  compact?: boolean;
  /** `light` forces the white-on-dark artwork, e.g. over a photograph. */
  tone?: "auto" | "light";
  size?: "md" | "lg";
}) {
  /*
   * The header mark sits in a row of 14px nav labels, so it is set to about
   * their line height rather than to the tile size it replaced — the artwork
   * includes its own tagline, which makes a tall image read much larger than
   * the type beside it.
   */
  const height = size === "lg" ? "h-11 sm:h-12" : compact ? "h-6" : "h-7 sm:h-8";
  const shared = cn("w-auto object-contain", height);

  return (
    <Link
      to="/"
      aria-label="TheTrendSnap — what comes next"
      className={cn("group inline-flex items-center", className)}
    >
      {tone === "light" ? (
        <img
          src="/wordmark-dark.png"
          alt="TheTrendSnap"
          className={cn(shared, "transition-transform duration-200 group-hover:scale-[1.02]")}
          loading="eager"
          decoding="async"
        />
      ) : (
        <>
          <img
            src="/wordmark.png"
            alt="TheTrendSnap"
            className={cn(
              shared,
              "transition-transform duration-200 group-hover:scale-[1.02] dark:hidden"
            )}
            loading="eager"
            decoding="async"
          />
          <img
            src="/wordmark-dark.png"
            alt=""
            aria-hidden="true"
            className={cn(
              shared,
              "hidden transition-transform duration-200 group-hover:scale-[1.02] dark:block"
            )}
            loading="eager"
            decoding="async"
          />
        </>
      )}
    </Link>
  );
}
