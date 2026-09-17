import type { ApiImage, Article, Category, Tag } from "@/types/api";

/* ------------------------------------------------------------------ */
/* Class names                                                         */
/* ------------------------------------------------------------------ */

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/* ------------------------------------------------------------------ */
/* Text                                                                */
/* ------------------------------------------------------------------ */

export function stripHtml(html = ""): string {
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\s+/g, " ")
    .trim();
}

export function truncate(text = "", max = 160): string {
  const clean = stripHtml(text);
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max).replace(/[\s,.;:!-]+\S*$/, "")}…`;
}

/** Best available summary for a card or meta description. */
export function excerptOf(article: Article, max = 160): string {
  const source =
    article.excerpt || article.shortDescription || article.description || article.content || "";
  return truncate(source || articleText(article), max);
}

/* ------------------------------------------------------------------ */
/* Dates                                                               */
/* ------------------------------------------------------------------ */

export function articleDate(article: Article): Date | null {
  const raw = article.publishedDate || article.createdAt || article.updatedAt;
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDate(value?: string | Date | null): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatDateTime(value?: string | Date | null): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function timeAgo(value?: string | Date | null): string {
  if (!value) return "";
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";

  const seconds = Math.round((Date.now() - date.getTime()) / 1000);
  if (Math.abs(seconds) < 60) return "just now";

  /**
   * Each step is how many of the current unit make up the next one, so the
   * amount is divided by the unit it is leaving — minutes by 60 to reach
   * hours, hours by 24 to reach days. Pairing a unit with the following
   * unit's size instead is what turns four months into "2 years".
   */
  const steps: Array<[Intl.RelativeTimeFormatUnit, number]> = [
    ["second", 60],
    ["minute", 60],
    ["hour", 24],
    ["day", 7],
    ["week", 4.34524],
    ["month", 12],
    ["year", Number.POSITIVE_INFINITY],
  ];

  const format = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
  let amount = seconds;

  for (const [unit, size] of steps) {
    if (Math.abs(amount) < size) return format.format(-Math.round(amount), unit);
    amount /= size;
  }

  return format.format(-Math.round(amount), "year");
}

/* ------------------------------------------------------------------ */
/* Numbers                                                             */
/* ------------------------------------------------------------------ */

export function compactNumber(value = 0): string {
  if (value < 1000) return String(value);
  return new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(
    value
  );
}

const WORDS_PER_MINUTE = 200;

/** Every text source an article can carry, flattened for search/read time. */
export function articleText(article: Article): string {
  const blocks = (article.contentBlocks || [])
    .map((block) => {
      const value = block.value;
      if (typeof value === "string") return value;
      if (value && typeof value === "object") {
        const record = value as Record<string, unknown>;
        return [record.text, record.caption, record.title]
          .filter((part): part is string => typeof part === "string")
          .join(" ");
      }
      return "";
    })
    .join(" ");

  return stripHtml(
    `${article.content || ""} ${blocks} ${article.longDescription || ""} ${article.description || ""}`
  );
}

/**
 * Read time: trust the backend value, but recompute when the body is clearly
 * longer than the stored estimate (imported rows often carry a stale 1).
 */
export function readTimeOf(article: Article): number {
  const words = articleText(article).split(/\s+/).filter(Boolean).length;
  const derived = Math.max(1, Math.ceil(words / WORDS_PER_MINUTE));
  if (article.readTime && article.readTime > derived) return article.readTime;
  return derived;
}

/* ------------------------------------------------------------------ */
/* Taxonomy                                                            */
/* ------------------------------------------------------------------ */

export function categoryOf(article: Article): Category | null {
  if (!article.category || typeof article.category === "string") return null;
  return article.category;
}

export function categoryName(article: Article): string {
  return categoryOf(article)?.name?.trim() || "News";
}

export function categoryHref(article: Article): string {
  const slug = categoryOf(article)?.slug;
  return slug ? `/category/${slug}` : "/latest";
}

export function tagsOf(article: Article): Tag[] {
  const fromRefs = (article.tags || []).filter(
    (t): t is Tag => typeof t !== "string" && !!t && !!t.name
  );
  if (fromRefs.length) return fromRefs;

  return (article.tagNames || []).map((name) => ({
    _id: name,
    name,
    slug: slugify(name),
  }));
}

export function slugify(value = ""): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

export function authorName(article: Article): string {
  return article.author?.name?.trim() || article.sourceName?.trim() || "TheTrendSnap Desk";
}

export function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? "")
    .join("")
    .toUpperCase();
}

/* ------------------------------------------------------------------ */
/* Category accent colours                                             */
/*                                                                     */
/* The backend `color` field wins; otherwise a stable palette entry is  */
/* picked from the name so a category always looks the same site-wide.  */
/* ------------------------------------------------------------------ */

/**
 * Four accents, not eight.
 *
 * Every category chip on a page draws from this list, so the longer it is the
 * more text colours a single screen carries — eight of them read as noise
 * rather than as a system. Four still tells categories apart at a glance.
 */
const ACCENTS = [
  { text: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-500/10", dot: "bg-indigo-500" },
  { text: "text-rose-600 dark:text-rose-400", bg: "bg-rose-50 dark:bg-rose-500/10", dot: "bg-rose-500" },
  { text: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-500/10", dot: "bg-emerald-500" },
  { text: "text-amber-600 dark:text-amber-400", bg: "bg-amber-50 dark:bg-amber-500/10", dot: "bg-amber-500" },
];

export function accentFor(key = ""): (typeof ACCENTS)[number] {
  let hash = 0;
  for (let i = 0; i < key.length; i += 1) hash = (hash * 31 + key.charCodeAt(i)) % 9973;
  return ACCENTS[hash % ACCENTS.length];
}

/* ------------------------------------------------------------------ */
/* Images                                                              */
/* ------------------------------------------------------------------ */

export function imageUrl(image?: ApiImage | string | null): string {
  if (!image) return "";
  if (typeof image === "string") return image;
  return image.url || image.thumbnailUrl || "";
}

export function articleImage(article: Article): string {
  return (
    imageUrl(article.featuredImage) ||
    imageUrl(article.ogImage) ||
    imageUrl(article.gallery?.[0]) ||
    imageUrl(article.videos?.[0]?.thumbnail) ||
    firstImageInHtml(article.content) ||
    ""
  );
}

function firstImageInHtml(html?: string): string {
  if (!html) return "";
  const match = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  return match?.[1] || "";
}

export function imageAlt(image: ApiImage | undefined, fallback: string): string {
  return image?.alt?.trim() || image?.title?.trim() || fallback;
}

/**
 * Cloudinary assets can be resized on the fly, which keeps cards light.
 * Requests run at 2x the CSS box (capped) with `q_auto:best`, so images stay
 * crisp on retina screens; any other host is returned untouched.
 */
export function optimizedImage(url: string, width: number): string {
  if (!url) return "";
  if (!url.includes("res.cloudinary.com") || !url.includes("/upload/")) return url;
  if (/\/upload\/[a-z]_[^/]+\//.test(url)) return url; // already transformed

  const retina = Math.min(2400, Math.round(width * 2));
  return url.replace("/upload/", `/upload/f_auto,q_auto:best,dpr_auto,w_${retina},c_limit/`);
}

/* ------------------------------------------------------------------ */
/* Links                                                               */
/* ------------------------------------------------------------------ */

export function articleHref(article: Article): string {
  return `/article/${article.slug}`;
}

export function dedupeArticles(...groups: Article[][]): Article[] {
  const seen = new Set<string>();
  const out: Article[] = [];
  groups.flat().forEach((article) => {
    if (!article || seen.has(article._id)) return;
    seen.add(article._id);
    out.push(article);
  });
  return out;
}
