/**
 * Builds public/sitemap.xml from the live API at build time.
 * A missing or unreachable API is not fatal — the build continues with the
 * static routes only, so a deploy never breaks because of the CMS.
 */
import { writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const API = (process.env.VITE_API_URL || "https://admin.driftdine.com/api").replace(/\/+$/, "");
const SITE = (process.env.VITE_SITE_URL || "https://thetrendsnap.com").replace(/\/+$/, "");

const STATIC_ROUTES = [
  ["/", "1.0", "hourly"],
  ["/latest", "0.9", "hourly"],
  ["/trending", "0.8", "hourly"],
  ["/popular", "0.8", "daily"],
  ["/gallery", "0.7", "daily"],
  ["/videos", "0.7", "daily"],
  ["/categories", "0.7", "weekly"],
  ["/about", "0.4", "monthly"],
  ["/contact", "0.4", "monthly"],
  ["/newsletter", "0.4", "monthly"],
  ["/privacy-policy", "0.3", "yearly"],
  ["/terms", "0.3", "yearly"],
  ["/sitemap", "0.3", "monthly"],
];

const escape = (value) =>
  String(value).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const url = (loc, lastmod, priority, changefreq) =>
  [
    "  <url>",
    `    <loc>${escape(SITE + loc)}</loc>`,
    lastmod ? `    <lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : "",
    `    <changefreq>${changefreq}</changefreq>`,
    `    <priority>${priority}</priority>`,
    "  </url>",
  ]
    .filter(Boolean)
    .join("\n");

const fetchJson = async (path) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${API}${path}`, { signal: controller.signal });
    if (!res.ok) throw new Error(`${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
};

const entries = STATIC_ROUTES.map(([loc, priority, freq]) => url(loc, null, priority, freq));

try {
  const categories = await fetchJson("/categories");
  (Array.isArray(categories) ? categories : []).forEach((category) => {
    if (category?.slug) {
      entries.push(url(`/category/${category.slug}`, category.updatedAt, "0.7", "daily"));
    }
  });
} catch (error) {
  console.warn("sitemap: categories unavailable —", error.message);
}

try {
  let page = 1;
  let pages = 1;
  let count = 0;

  while (page <= pages && page <= 20) {
    const res = await fetchJson(`/news/list?limit=100&page=${page}&sort=latest`);
    const items = res?.data || [];
    pages = res?.pagination?.pages || 1;

    items.forEach((article) => {
      if (!article?.slug) return;
      entries.push(
        url(
          `/article/${article.slug}`,
          article.updatedDate || article.publishedDate || article.createdAt,
          "0.6",
          "weekly"
        )
      );
      count += 1;
    });

    if (!items.length) break;
    page += 1;
  }

  console.log(`sitemap: ${count} articles included`);
} catch (error) {
  console.warn("sitemap: articles unavailable —", error.message);
}

const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;

writeFileSync(resolve(here, "../public/sitemap.xml"), xml);
console.log(`sitemap: wrote ${entries.length} urls`);
