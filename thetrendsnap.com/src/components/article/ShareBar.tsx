import { useState } from "react";
import {
  Bookmark,
  BookmarkCheck,
  Check,
  Facebook,
  Heart,
  Link2,
  Linkedin,
  Share2,
  Twitter,
} from "lucide-react";
import type { Article } from "@/types/api";
import { likeArticle, shareArticle, SITE_URL } from "@/lib/api";
import { useBookmarks } from "@/hooks/useBookmarks";
import { articleHref, cn, compactNumber } from "@/lib/utils";

export function ShareBar({ article }: { article: Article }) {
  const { has, toggle } = useBookmarks();
  const [likes, setLikes] = useState(article.likes || 0);
  const [liked, setLiked] = useState(false);
  const [copied, setCopied] = useState(false);

  const url = `${SITE_URL}${articleHref(article)}`;
  const bookmarked = has(article.slug);

  const onLike = async () => {
    const next = !liked;
    setLiked(next);
    setLikes((prev) => Math.max(0, prev + (next ? 1 : -1)));
    const serverValue = await likeArticle(article.slug, !next);
    if (typeof serverValue === "number") setLikes(serverValue);
  };

  const onShare = async (network: "twitter" | "facebook" | "linkedin" | "copy" | "native") => {
    void shareArticle(article.slug);

    if (network === "copy") {
      try {
        await navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        /* clipboard blocked — the visible URL is still selectable */
      }
      return;
    }

    if (network === "native" && navigator.share) {
      try {
        await navigator.share({ title: article.title, url });
      } catch {
        /* user dismissed the sheet */
      }
      return;
    }

    const targets = {
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(article.title)}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}`,
    } as const;

    if (network in targets) {
      window.open(targets[network as keyof typeof targets], "_blank", "noopener,noreferrer,width=640,height=520");
    }
  };

  const iconButton =
    "inline-flex h-9 w-9 items-center justify-center rounded-lg border border-ink-200 text-ink-500 transition-colors hover:border-brand-400 hover:text-brand-600 dark:border-ink-700 dark:text-ink-400 dark:hover:text-brand-400";

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-y border-ink-100 py-3 dark:border-ink-800">
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => void onLike()}
          aria-pressed={liked}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition-colors",
            liked
              ? "border-rose-200 bg-rose-50 text-rose-600 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-400"
              : "border-ink-200 text-ink-600 hover:border-rose-300 hover:text-rose-600 dark:border-ink-700 dark:text-ink-300"
          )}
        >
          <Heart className={cn("h-4 w-4", liked && "fill-current")} aria-hidden="true" />
          {compactNumber(likes)}
        </button>

        <button
          type="button"
          onClick={() => toggle(article.slug)}
          aria-pressed={bookmarked}
          className={cn(
            "inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-semibold transition-colors",
            bookmarked
              ? "border-brand-200 bg-brand-50 text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300"
              : "border-ink-200 text-ink-600 hover:border-brand-400 hover:text-brand-600 dark:border-ink-700 dark:text-ink-300"
          )}
        >
          {bookmarked ? (
            <BookmarkCheck className="h-4 w-4" aria-hidden="true" />
          ) : (
            <Bookmark className="h-4 w-4" aria-hidden="true" />
          )}
          {bookmarked ? "Saved" : "Save"}
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="mr-1 hidden text-xs font-bold uppercase tracking-wide text-ink-400 sm:inline">
          Share
        </span>
        <button type="button" onClick={() => void onShare("twitter")} className={iconButton} aria-label="Share on X">
          <Twitter className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => void onShare("facebook")} className={iconButton} aria-label="Share on Facebook">
          <Facebook className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => void onShare("linkedin")} className={iconButton} aria-label="Share on LinkedIn">
          <Linkedin className="h-4 w-4" aria-hidden="true" />
        </button>
        <button type="button" onClick={() => void onShare("copy")} className={iconButton} aria-label="Copy link">
          {copied ? <Check className="h-4 w-4 text-emerald-500" aria-hidden="true" /> : <Link2 className="h-4 w-4" aria-hidden="true" />}
        </button>
        {typeof navigator !== "undefined" && "share" in navigator && (
          <button type="button" onClick={() => void onShare("native")} className={cn(iconButton, "sm:hidden")} aria-label="Share">
            <Share2 className="h-4 w-4" aria-hidden="true" />
          </button>
        )}
      </div>
    </div>
  );
}
