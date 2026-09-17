import type {
  Advertisement,
  AdPosition,
  Article,
  Category,
  HomeFeed,
  HomepageConfig,
  NewsListQuery,
  Paginated,
  Tag,
} from "@/types/api";

/* ------------------------------------------------------------------ */
/* Base config                                                         */
/* ------------------------------------------------------------------ */

export const API_URL = (
  import.meta.env.VITE_API_URL || "https://admin.thetrendsnap.com/api"
).replace(/\/+$/, "");

export const SITE_URL = (
  import.meta.env.VITE_SITE_URL || "https://thetrendsnap.com"
).replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}

const REQUEST_TIMEOUT = 20000;

function buildQuery(params: Record<string, unknown> = {}): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "" || value === "all") return;
    search.set(key, String(value));
  });
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

  try {
    const res = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: init.signal ?? controller.signal,
      headers: {
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...(init.headers || {}),
      },
    });

    const contentType = res.headers.get("content-type") || "";

    // An Express 404 page is HTML, not JSON — treat it as a missing endpoint
    // so callers can fall back to the legacy route instead of crashing.
    if (!contentType.includes("application/json")) {
      throw new ApiError(`Non-JSON response from ${path}`, res.status || 502);
    }

    const body = (await res.json()) as T & { message?: string; success?: boolean };

    if (!res.ok) {
      throw new ApiError(body?.message || `Request failed (${res.status})`, res.status);
    }

    return body;
  } catch (err) {
    if (err instanceof ApiError) throw err;
    if (err instanceof DOMException && err.name === "AbortError") {
      throw new ApiError("Request timed out", 408);
    }
    throw new ApiError((err as Error).message || "Network error", 0);
  } finally {
    clearTimeout(timer);
  }
}

/** Runs `primary`; on any API failure falls back to the legacy path. */
async function withFallback<T>(primary: () => Promise<T>, fallback: () => Promise<T>): Promise<T> {
  try {
    return await primary();
  } catch (err) {
    if (err instanceof ApiError && err.status === 0) throw err; // offline: don't hammer
    return fallback();
  }
}

/* ------------------------------------------------------------------ */
/* Legacy pool                                                         */
/*                                                                     */
/* The production deployment still runs an older build that only       */
/* exposes `GET /api/news` (a bare array). Every modern endpoint below  */
/* degrades to this pool so the site is fully functional either way.   */
/* ------------------------------------------------------------------ */

let legacyPool: Promise<Article[]> | null = null;

function getLegacyPool(): Promise<Article[]> {
  if (!legacyPool) {
    legacyPool = request<Article[]>(`/news${buildQuery({ limit: 500 })}`)
      .then((rows) =>
        (Array.isArray(rows) ? rows : [])
          .filter((a) => !a.status || a.status === "published")
          .sort((a, b) => publishedTime(b) - publishedTime(a))
      )
      .catch((err) => {
        legacyPool = null;
        throw err;
      });
  }
  return legacyPool;
}

export function publishedTime(article: Article): number {
  const raw = article.publishedDate || article.createdAt || article.updatedAt;
  const time = raw ? new Date(raw).getTime() : 0;
  return Number.isFinite(time) ? time : 0;
}

const categoryId = (article: Article): string =>
  typeof article.category === "string" ? article.category : article.category?._id || "";

const categorySlug = (article: Article): string =>
  typeof article.category === "string" ? "" : article.category?.slug || "";

function matchesLegacyQuery(article: Article, query: NewsListQuery): boolean {
  if (query.category) {
    const key = String(query.category);
    if (categoryId(article) !== key && categorySlug(article) !== key) return false;
  }
  if (query.tag) {
    const key = String(query.tag).toLowerCase();
    const names = (article.tagNames || []).map((t) => t.toLowerCase());
    const slugs = (article.tags || []).map((t) =>
      typeof t === "string" ? t : (t.slug || "").toLowerCase()
    );
    if (!names.includes(key) && !slugs.includes(key)) return false;
  }
  if (query.author) {
    const author = (article.author?.name || "").toLowerCase();
    if (!author.includes(String(query.author).toLowerCase())) return false;
  }
  if (query.featured && !article.featured) return false;
  if (query.trending && !article.trending) return false;
  if (query.popular && !article.popular) return false;
  if (query.editorsPick && !article.editorsPick) return false;
  if (query.breaking && !article.breakingNews) return false;
  if (query.exclude && article._id === query.exclude) return false;

  if (query.search) {
    const needle = query.search.toLowerCase();
    const haystack = [
      article.title,
      article.subtitle,
      article.description,
      article.excerpt,
      article.destination,
      article.author?.name,
      (article.tagNames || []).join(" "),
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(needle)) return false;
  }

  return true;
}

function sortLegacy(items: Article[], sort: NewsListQuery["sort"]): Article[] {
  const copy = [...items];
  switch (sort) {
    case "oldest":
      return copy.sort((a, b) => publishedTime(a) - publishedTime(b));
    case "popular":
      return copy.sort((a, b) => (b.views || 0) - (a.views || 0));
    case "trending":
      return copy.sort(
        (a, b) => (b.views || 0) - (a.views || 0) || publishedTime(b) - publishedTime(a)
      );
    case "priority":
      return copy.sort(
        (a, b) => (b.priority || 0) - (a.priority || 0) || publishedTime(b) - publishedTime(a)
      );
    case "title":
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return copy.sort((a, b) => publishedTime(b) - publishedTime(a));
  }
}

function paginate<T>(items: T[], page: number, limit: number): Paginated<T> {
  const total = items.length;
  const start = (page - 1) * limit;
  return {
    success: true,
    data: items.slice(start, start + limit),
    pagination: {
      page,
      limit,
      total,
      pages: Math.max(1, Math.ceil(total / limit)),
      hasMore: start + limit < total,
    },
  };
}

/* ------------------------------------------------------------------ */
/* Articles                                                            */
/* ------------------------------------------------------------------ */

export async function listArticles(query: NewsListQuery = {}): Promise<Paginated<Article>> {
  const page = query.page || 1;
  const limit = query.limit || 12;

  return withFallback(
    () => request<Paginated<Article>>(`/news/list${buildQuery({ ...query, page, limit })}`),
    async () => {
      const pool = await getLegacyPool();
      const filtered = pool.filter((a) => matchesLegacyQuery(a, query));
      return paginate(sortLegacy(filtered, query.sort), page, limit);
    }
  );
}

export async function getArticle(slug: string): Promise<Article> {
  return request<Article>(`/news/${encodeURIComponent(slug)}`);
}

export async function getRelatedArticles(slug: string, limit = 6): Promise<Article[]> {
  return withFallback(
    async () => {
      const res = await request<{ success: boolean; data: Article[] }>(
        `/news/related/${encodeURIComponent(slug)}${buildQuery({ limit })}`
      );
      return res.data || [];
    },
    async () => {
      const pool = await getLegacyPool();
      const current = pool.find((a) => a.slug === slug);
      const sameCategory = pool.filter(
        (a) => a.slug !== slug && current && categoryId(a) === categoryId(current)
      );
      const fill = pool.filter((a) => a.slug !== slug && !sameCategory.includes(a));
      return [...sameCategory, ...fill].slice(0, limit);
    }
  );
}

export async function searchArticles(term: string, limit = 8): Promise<Article[]> {
  if (!term.trim()) return [];
  return withFallback(
    async () => {
      const res = await request<{ success: boolean; data: Article[] }>(
        `/news/search${buildQuery({ q: term, limit })}`
      );
      return res.data || [];
    },
    async () => {
      const pool = await getLegacyPool();
      return pool.filter((a) => matchesLegacyQuery(a, { search: term })).slice(0, limit);
    }
  );
}

export async function likeArticle(slug: string, unlike = false): Promise<number | null> {
  try {
    const res = await request<{ success: boolean; likes: number }>(
      `/news/${encodeURIComponent(slug)}/like`,
      { method: "POST", body: JSON.stringify({ unlike }) }
    );
    return res.likes ?? null;
  } catch {
    return null; // engagement counters must never break the page
  }
}

export async function shareArticle(slug: string): Promise<number | null> {
  try {
    const res = await request<{ success: boolean; shareCount: number }>(
      `/news/${encodeURIComponent(slug)}/share`,
      { method: "POST" }
    );
    return res.shareCount ?? null;
  } catch {
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Home feed                                                           */
/* ------------------------------------------------------------------ */

/** Fills empty rails from the latest pool so no homepage section is blank. */
export function backfillFeed(feed: HomeFeed): Required<HomeFeed> {
  const pool = [...feed.latest, ...feed.popular, ...feed.trending, ...feed.featured];
  const unique = new Map<string, Article>();
  pool.forEach((a) => a && unique.set(a._id, a));
  const all = [...unique.values()].sort((a, b) => publishedTime(b) - publishedTime(a));

  const used = new Set<string>();
  const take = (existing: Article[], count: number, markUsed = true): Article[] => {
    const out = existing.filter(Boolean).slice(0, count);
    out.forEach((a) => markUsed && used.add(a._id));
    if (out.length >= count) return out;

    for (const candidate of all) {
      if (out.length >= count) break;
      if (used.has(candidate._id)) continue;
      if (out.some((a) => a._id === candidate._id)) continue;
      out.push(candidate);
      if (markUsed) used.add(candidate._id);
    }
    return out;
  };

  const hero = feed.hero || all[0] || null;
  if (hero) used.add(hero._id);

  const breaking = take(feed.breaking, 4);
  const featured = take(feed.featured, 6);
  const editorsPick = take(feed.editorsPick, 11);
  const trending = take(feed.trending, 5);
  // Popular ranks by views, so it may legitimately repeat earlier picks.
  const popular = (feed.popular.length ? feed.popular : [...all].sort((a, b) => (b.views || 0) - (a.views || 0))).slice(0, 10);
  const latest = take(feed.latest, 7);
  const dontMiss = take([], 8);

  return { hero, breaking, featured, editorsPick, trending, popular, latest, dontMiss };
}

export async function getHomeFeed(): Promise<HomeFeed> {
  const empty: HomeFeed = {
    hero: null,
    breaking: [],
    featured: [],
    editorsPick: [],
    trending: [],
    popular: [],
    latest: [],
  };

  const feed = await withFallback(
    async () => {
      const res = await request<{ success: boolean; data: HomeFeed }>("/news/homefeed");
      return { ...empty, ...(res.data || {}) };
    },
    async () => {
      const pool = await getLegacyPool();
      const byViews = [...pool].sort((a, b) => (b.views || 0) - (a.views || 0));
      return {
        hero: pool.find((a) => a.isMainTrending) || pool[0] || null,
        breaking: pool.filter((a) => a.breakingNews).slice(0, 10),
        featured: pool.filter((a) => a.featured).slice(0, 8),
        editorsPick: pool.filter((a) => a.editorsPick).slice(0, 8),
        trending: pool.filter((a) => a.trending || a.isSubTrending).slice(0, 8),
        popular: byViews.slice(0, 6),
        latest: pool.slice(0, 24),
      } satisfies HomeFeed;
    }
  );

  return feed;
}

/* ------------------------------------------------------------------ */
/* Homepage layout config                                              */
/* ------------------------------------------------------------------ */

/**
 * Editor-curated homepage settings (currently the gallery block).
 *
 * Deployments that predate `/api/homepage` — or that answer with the older
 * payload that has no `gallery` key — resolve to an empty object. Every
 * consumer treats that as "use the defaults", so the section still renders.
 */
export async function getHomepageConfig(): Promise<HomepageConfig> {
  try {
    const res = await request<HomepageConfig>("/homepage");
    return res && typeof res === "object" ? res : {};
  } catch {
    return {};
  }
}

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

export async function getCategories(
  opts: {
    withCounts?: boolean;
    withCover?: boolean;
    showInMenu?: boolean;
    /** Pass false to include sub-categories; the site lists sections only. */
    topLevelOnly?: boolean;
  } = {}
): Promise<Category[]> {
  const rows = await request<Category[]>(
    `/categories${buildQuery({
      withCounts: opts.withCounts ? "true" : undefined,
      withCover: opts.withCover ? "true" : undefined,
      showInMenu: opts.showInMenu ? "true" : undefined,
      // Sub-categories such as "Runway" describe an article inside a section;
      // they are not sections themselves, so they stay out of the navigation
      // rail, the homepage strip and the footer.
      parent: opts.topLevelOnly === false ? undefined : "root",
    })}`
  );

  return (Array.isArray(rows) ? rows : [])
    .filter((c) => !c.hidden && c.status !== "inactive")
    .sort(
      (a, b) => (b.priority || 0) - (a.priority || 0) || (a.order || 0) - (b.order || 0)
    );
}

export async function getCategory(idOrSlug: string): Promise<Category | null> {
  return withFallback(
    async () => {
      const res = await request<Category | { success: boolean; data: Category }>(
        `/categories/${encodeURIComponent(idOrSlug)}`
      );
      return (res as { data?: Category }).data ?? (res as Category);
    },
    async () => {
      const all = await getCategories();
      return all.find((c) => c.slug === idOrSlug || c._id === idOrSlug) || null;
    }
  );
}

/* ------------------------------------------------------------------ */
/* Tags                                                                */
/* ------------------------------------------------------------------ */

export async function getTags(
  opts: { limit?: number; sort?: "popular" | "name" | "latest"; featured?: boolean } = {}
): Promise<Tag[]> {
  return withFallback(
    async () => {
      const res = await request<Paginated<Tag>>(
        `/tags${buildQuery({
          limit: opts.limit || 20,
          sort: opts.sort || "popular",
          featured: opts.featured ? "true" : undefined,
        })}`
      );
      return res.data || [];
    },
    // Older deployments have no tag collection; derive from article tagNames.
    async () => {
      const pool = await getLegacyPool();
      const counts = new Map<string, number>();
      pool.forEach((a) =>
        (a.tagNames || []).forEach((name) => counts.set(name, (counts.get(name) || 0) + 1))
      );
      return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, opts.limit || 20)
        .map(([name, usageCount]) => ({
          _id: name,
          name,
          slug: name.toLowerCase().replace(/\s+/g, "-"),
          usageCount,
        }));
    }
  );
}

/* ------------------------------------------------------------------ */
/* Ads                                                                 */
/* ------------------------------------------------------------------ */

export async function serveAds(
  position: AdPosition,
  opts: { device?: "desktop" | "tablet" | "mobile"; category?: string } = {}
): Promise<Advertisement[]> {
  try {
    const res = await request<{ success: boolean; data: Advertisement[] }>(
      `/ads/serve${buildQuery({ position, device: opts.device, category: opts.category })}`
    );
    return res.data || [];
  } catch {
    return []; // no ad configured (or endpoint absent) — slot renders nothing
  }
}

export function trackAdImpression(id: string): void {
  void fetch(`${API_URL}/ads/${id}/impression`, { method: "POST" }).catch(() => {});
}

export function trackAdClick(id: string): void {
  void fetch(`${API_URL}/ads/${id}/click`, { method: "POST" }).catch(() => {});
}

/* ------------------------------------------------------------------ */
/* Contact + newsletter                                                */
/* ------------------------------------------------------------------ */

export interface ContactPayload {
  name: string;
  email: string;
  subject?: string;
  message: string;
}

export async function sendContact(payload: ContactPayload): Promise<void> {
  await request("/contact", { method: "POST", body: JSON.stringify(payload) });
}

export async function subscribeNewsletter(email: string, source = "footer"): Promise<void> {
  await withFallback(
    () =>
      request("/newsletter/subscribe", {
        method: "POST",
        body: JSON.stringify({ email, source }),
      }),
    // Deployments without the newsletter collection still capture the lead.
    () =>
      request("/contact", {
        method: "POST",
        body: JSON.stringify({
          name: "Newsletter subscriber",
          email,
          subject: "Newsletter subscription",
          message: `Subscribe request from ${source}.`,
        }),
      })
  );
}
