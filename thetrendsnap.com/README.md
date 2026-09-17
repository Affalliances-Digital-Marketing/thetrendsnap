# TheTrendSnap — Frontend

Article publishing frontend for **thetrendsnap.com**, built on the
`admin.driftdine.com` backend (Express + MongoDB).

React 18 · TypeScript · Vite · Tailwind CSS · TanStack Query.

---

## Getting started

```bash
npm install
npm run dev          # http://localhost:5175
```

Create `.env` from `.env.example`:

```
VITE_API_URL=https://admin.driftdine.com/api   # or http://localhost:4000/api
VITE_SITE_URL=https://thetrendsnap.com
VITE_AD_PLACEHOLDER=false                      # true = draw empty ad slots
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server with HMR |
| `npm run build` | Generates `public/sitemap.xml`, type-checks, builds `dist/` |
| `npm run preview` | Serves the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run sitemap` | Regenerates the sitemap only |

---

## Section pages

Each listing page has its own layout rather than the same card grid:

- **`/latest`** — a dated timeline: lead story, then Today / Yesterday / This week
  buckets with compact rows, section filter pills, "load more" that appends, and a
  sidebar with publishing pace and section jump-links.
- **`/trending`** — a leaderboard: top-three podium with a heat score
  (views + likes×4 + shares×6), ranked rows with heat bars and per-story
  view/like/share counts, hot-sections meters and a most-shared list.
- **`/popular`** — a podium of the three most-read stories (#1 raised), the rest
  of the top 30 as a ranked table with read counts, an all-time / month / week
  range switch, a section filter, and a "where readers spend time" breakdown.
- **`/gallery`** — every gallery (and lead) image from published stories as a
  photo wall; each tile shows the category, article title and date, opens a
  viewer, and shows a link badge when the image carries a redirect URL.
- **`/videos`** — a featured player with an up-next rail plus a thumbnail grid;
  each card shows category, title, date, duration and a link to the article.
  Videos are read straight from each article's `videos` field.

`Gallery` and `Videos` sit next to `Popular` in the navbar, and the home page's
section rail is category-led (name + article count + that category's newest
image) instead of hashtags.

---

## Article page

`/article/:slug` renders **every field the admin panel can set**:

- **Header** — category + sub-category breadcrumb, breaking / featured / editor's
  pick / trending badges, "Updated" stamp, title, subtitle, byline with
  designation, published date-time, read time, language, view / like / share /
  save counters, and a destination · region · country line
- **Body** — featured image with caption and credit, an "In short" summary card,
  share + save bar, sanitised rich HTML (headings get ids), legacy content blocks
  as a fallback, and the per-article advertisement override
- **Modules** — affiliate deals cards, videos (YouTube/Vimeo/file + source link),
  gallery with captions, CTA button in its configured style, external and
  sponsored links, further-reading internal links, tags + SEO keywords, sources
  and attribution with canonical URL, author card with socials and email
- **Navigation** — previous / next story in the same category, a six-card
  "You might also like" grid
- **Sidebar** (sticky) — table of contents that tracks the active heading,
  editor's curated related picks, popular now, newsletter, ad slot, more from the
  category
- **Extras** — reading-progress bar, image lightbox, mobile table of contents

**Image redirect links.** Any image given a redirect link in the admin panel is
wrapped in an anchor and opens that URL (`target` + `rel` preserved, safety
tokens added); images without one open in the lightbox instead. Gallery images
carry a link badge when they redirect.

---

## Admin panel — `/admin`

The full CMS ships inside this same app at **`/admin`** (login at
`/admin/login`), so one deploy serves both the public site and the panel, using
the same `VITE_API_URL` backend.

| Screen | Covers |
| --- | --- |
| Dashboard | every `/api/dashboard` counter, recent activity, inbox preview |
| Articles | all backend filters, inline status, duplicate, trash/restore, delete, bulk status/category/tags/flags/delete |
| Article editor | every `News` field across 8 tabs (Content, Media, Taxonomy, Author, Publishing, SEO, Links & CTA, Stats) |
| Categories | CRUD, ordering, visibility, hierarchy, imagery, merchandising, automation, SEO |
| Tags | CRUD, merge, recount, bulk delete |
| Media library | upload, external URLs, folders, metadata, replace, delete |
| Homepage layout | hero, hero rail, Snap Wall (tiles + left/right rails), category sections, custom promo blocks |
| Advertisements | all 17 slots, image/script creatives, targeting, scheduling, CTR |
| Contact inbox | list, reply by email, delete |
| Newsletter | subscribers, manual add, CSV export |
| Import / export | template, export, validate, run, batch report, history, rollback |
| Automation | run auto-news, cron overview, AI drafts |
| SEO insights | per-article audit + stored score |
| Settings | account, permissions, environment, create admin |

### Pasting from Notes / Word / the web

The body editor accepts a normal paste and keeps the formatting (headings,
bold, italics, lists, links, tables) while dropping the source app's inline
styles and classes. Images come across too:

- image files on the clipboard are uploaded to the media library and inserted
- `data:` images embedded in pasted HTML are uploaded and swapped for their
  hosted URL, so no base64 blob is ever stored in the article
- dropping image files onto the editor does the same thing

### Image redirect links

Under the body, **Image links** lists every image in the article with a
redirect URL field, an alt-text field and an "open in a new tab" toggle.
Setting a URL wraps that image in `<a href … target … rel="noopener noreferrer
sponsored">`, which the public article renderer already supports; clearing the
field unwraps it.

---

## Backend endpoints used

All reads are public; nothing on the site needs a token.

| Endpoint | Used by |
| --- | --- |
| `GET /api/news/homefeed` | Homepage rails (hero, breaking, featured, editor's picks, trending, popular, latest, don't miss) |
| `GET /api/news/list` | Every listing page, pagination, filters, sorting |
| `GET /api/news/:slug` | Article page (also increments views) |
| `GET /api/news/related/:slug` | "Related reads" and "You might also like" |
| `GET /api/news/search` | Header typeahead |
| `POST /api/news/:slug/like` · `/share` | Article engagement counters |
| `GET /api/categories?withCounts&withCover` | Nav, category grid, category pages |
| `GET /api/categories/:idOrSlug` | Category header |
| `GET /api/tags` | Trending topics, footer topics, tag pages |
| `GET /api/ads/serve?position=&device=` | Every ad slot |
| `POST /api/ads/:id/impression` · `/click` | Ad metrics |
| `POST /api/contact` | Contact form |
| `POST /api/newsletter/subscribe` | Newsletter forms |

**Legacy fallback.** The production deployment of the backend is currently an
older build that only exposes `GET /api/news` and `GET /api/categories`. Every
call above degrades to that legacy pool automatically
(`src/lib/api.ts`), so the site works against both builds — deploy the updated
backend to get the faster, purpose-built endpoints.

---

## Backend changes shipped with this frontend

Made in `admin.driftdine.com/`:

1. **CORS** — added `thetrendsnap.com`, `www.`, `admin.` and `localhost:5175/4173`.
2. **Newsletter API** — new `models/Subscriber.js`, `controllers/newsletter.controller.js`,
   `routes/newsletter.routes.js`, mounted at `/api/newsletter`
   (`POST /subscribe`, `POST /unsubscribe`, admin `GET /`, admin `DELETE /:id`).
3. **`GET /api/categories?withCover=true`** — attaches the newest article image
   as `coverImage` so category cards always have art.
4. **`GET /api/news/homefeed`** — rails are backfilled from recent articles when
   no editorial flags are set, dates are included in the projection, and the
   response now also carries a `dontMiss` rail.
5. **`GET /api/news/related/:slug`** — falls back to recent articles when tag and
   category matches run out, so the rail is never empty.
6. **Scheduled-publish cron fix** — Mongoose 9 needs `{ updatePipeline: true }`;
   the job was throwing every minute before.

---

## Ad slots

`<AdSlot position="…" />` fetches from `/api/ads/serve` and **renders nothing**
when no ad is booked, so pages look intentional either way. Positions wired up:

| Slot | Where it renders | Creative |
| --- | --- | --- |
| `home-top` | homepage, above the hero | 970×90 leaderboard |
| `home-mid` | homepage, under the three-column block | 1200×220 billboard |
| `home-gallery-left` | Snap Wall, left rail | 300×250 / 300×600 / 160×600 |
| `home-gallery-right` | Snap Wall, right rail | 300×250 / 300×600 / 160×600 |
| `home-bottom` | homepage footer | 970×90 leaderboard |
| `home-infeed` | between feed rows | 970×140 |
| `sidebar` | homepage / listing sidebars | 300×250 |
| `sidebar-sticky` | article sidebar | 300×600 |
| `article-top` · `article-inline` · `article-bottom` | article body | 970×90 / 970×180 / 970×90 |
| `category-top` · `category-infeed` | category, trending, popular, video, gallery pages | 970×90 |
| `mobile-sticky-bottom` | pinned to the bottom on phones | 320×50 |
| `home-gallery` | legacy single Snap Wall rail | — |

Both Snap Wall rails only render when **Homepage layout → Snap Wall section**
turns that side on *and* a creative is booked. With nothing booked the tiles
spread back across the full row, so the edge never shows a gap. With a rail on
each side the row settles into 3 / 6 / 3 and the tiles lock to two-by-two, so
the banners face each other across a square block.

Set `VITE_AD_PLACEHOLDER=true` to visualise slot geometry while designing.

---

## Design notes

- Light mode is primary; dark mode mirrors it via Tailwind's `class` strategy
  and is applied before first paint (no flash). `?theme=dark|light` forces one.
- Card images use fixed aspect ratios so grids align; hero, article and gallery
  images use `fit="contain"` over a blurred backdrop, so **nothing is cropped**.
- Failed images degrade to a branded placeholder instead of a broken icon.
- Every rail has a fallback source, so no section is ever empty:
  tags → categories, category art → newest article image, flags → recent posts.

---

## Deploying

Static build; any host works.

- **Vercel** — `vercel.json` included (SPA rewrites + asset caching).
- **Netlify** — `public/_redirects` included.
- **Apache / cPanel** — `public/.htaccess` included.

Build command `npm run build`, output `dist/`. Set `VITE_API_URL` and
`VITE_SITE_URL` in the host's environment before building.
