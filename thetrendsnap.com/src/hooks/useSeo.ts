import { useEffect } from "react";
import { SITE_URL } from "@/lib/api";

interface SeoOptions {
  title?: string;
  description?: string;
  image?: string;
  type?: "website" | "article";
  canonical?: string;
  robots?: string;
  publishedTime?: string;
  author?: string;
  jsonLd?: unknown;
}

const SITE_NAME = "TheTrendSnap";

/**
 * The brand card every page falls back to. A route that has its own picture —
 * an article, a category — passes one in; everything else still shares as the
 * logo rather than as a bare link.
 */
const DEFAULT_SHARE_IMAGE = `${SITE_URL}/og-image.jpg`;
const DEFAULT_DESCRIPTION =
  "TheTrendSnap brings you the latest news, reviews, guides and trends that matter.";

function upsertMeta(selector: string, attr: "name" | "property", key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/** Keeps document head in sync with the current route (title, OG, JSON-LD). */
export function useSeo({
  title,
  description = DEFAULT_DESCRIPTION,
  image = DEFAULT_SHARE_IMAGE,
  type = "website",
  canonical,
  robots = "index, follow",
  publishedTime,
  author,
  jsonLd,
}: SeoOptions) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — What Comes Next`;
    const url = canonical || `${SITE_URL}${window.location.pathname}`;

    document.title = fullTitle;

    upsertMeta('meta[name="description"]', "name", "description", description);
    upsertMeta('meta[name="robots"]', "name", "robots", robots);

    upsertMeta('meta[property="og:title"]', "property", "og:title", fullTitle);
    upsertMeta('meta[property="og:description"]', "property", "og:description", description);
    upsertMeta('meta[property="og:type"]', "property", "og:type", type);
    upsertMeta('meta[property="og:url"]', "property", "og:url", url);
    upsertMeta('meta[property="og:site_name"]', "property", "og:site_name", SITE_NAME);
    if (image) upsertMeta('meta[property="og:image"]', "property", "og:image", image);

    upsertMeta('meta[name="twitter:card"]', "name", "twitter:card", image ? "summary_large_image" : "summary");
    upsertMeta('meta[name="twitter:title"]', "name", "twitter:title", fullTitle);
    upsertMeta('meta[name="twitter:description"]', "name", "twitter:description", description);
    if (image) upsertMeta('meta[name="twitter:image"]', "name", "twitter:image", image);

    if (publishedTime) {
      upsertMeta('meta[property="article:published_time"]', "property", "article:published_time", publishedTime);
    }
    if (author) {
      upsertMeta('meta[property="article:author"]', "property", "article:author", author);
    }

    upsertLink("canonical", url);
  }, [title, description, image, type, canonical, robots, publishedTime, author]);

  useEffect(() => {
    if (!jsonLd) return undefined;
    const script = document.createElement("script");
    script.type = "application/ld+json";
    script.text = JSON.stringify(jsonLd);
    document.head.appendChild(script);
    return () => {
      document.head.removeChild(script);
    };
  }, [jsonLd]);
}
