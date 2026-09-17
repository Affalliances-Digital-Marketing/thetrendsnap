/**
 * Mirrors the Mongoose schemas served by admin.driftdine.com.
 * Every field the backend marks optional is optional here — old documents
 * predate most of the newer fields, so nothing may be assumed present.
 */

export interface ApiImage {
  public_id?: string;
  url?: string;
  thumbnailUrl?: string;
  width?: number;
  height?: number;
  format?: string;
  alt?: string;
  caption?: string;
  title?: string;
  credit?: string;
  redirectUrl?: string;
  openInNewTab?: boolean;
  /** Defaults to true on the API: outbound image links carry rel="nofollow". */
  nofollow?: boolean;
  priority?: boolean;
}

export interface Category {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  icon?: string;
  color?: string;
  shortLabel?: string;
  image?: ApiImage;
  banner?: ApiImage;
  iconImage?: ApiImage;
  ogImage?: ApiImage;
  order?: number;
  priority?: number;
  featured?: boolean;
  hidden?: boolean;
  showInMenu?: boolean;
  showInFooter?: boolean;
  showOnHome?: boolean;
  status?: "active" | "inactive";
  articleCount?: number;
  /** Added by the backend when ?withCover=true — newest article image. */
  coverImage?: ApiImage | null;
  seoTitle?: string;
  seoDescription?: string;
  metaTitle?: string;
  metaDescription?: string;
  parent?: string | Category | null;
  children?: Category[];
}

export interface Tag {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  usageCount?: number;
  featured?: boolean;
  status?: "active" | "inactive";
}

export interface Author {
  name?: string;
  slug?: string;
  image?: ApiImage;
  bio?: string;
  designation?: string;
  email?: string;
  redirectUrl?: string;
  social?: {
    twitter?: string;
    instagram?: string;
    linkedin?: string;
    website?: string;
  };
}

export interface ContentBlock {
  type: "text" | "image" | "link" | "affiliate" | "html" | "video" | "quote" | "embed";
  value?: unknown;
  meta?: Record<string, unknown>;
}

export interface ArticleVideo {
  url?: string;
  thumbnail?: ApiImage;
  title?: string;
  caption?: string;
  redirectUrl?: string;
  provider?: string;
  duration?: number;
}

export interface AffiliateLink {
  title?: string;
  link?: string;
  buttonText?: string;
  productImage?: string;
  price?: string;
  clicks?: number;
  isAutoInjected?: boolean;
}

export interface Article {
  _id: string;
  title: string;
  slug: string;
  subtitle?: string;
  description: string;
  shortDescription?: string;
  longDescription?: string;
  excerpt?: string;
  content?: string;
  contentBlocks?: ContentBlock[];
  featuredImage?: ApiImage;
  gallery?: ApiImage[];
  videos?: ArticleVideo[];

  category?: Category | string | null;
  subCategory?: Category | string | null;
  tags?: Array<Tag | string>;
  tagNames?: string[];

  author?: Author;

  featured?: boolean;
  trending?: boolean;
  popular?: boolean;
  breakingNews?: boolean;
  editorsPick?: boolean;
  isMainTrending?: boolean;
  isSubTrending?: boolean;
  priority?: number;

  status?: "draft" | "published" | "archived" | "scheduled" | "trash";
  publishedDate?: string;
  updatedDate?: string;
  createdAt?: string;
  updatedAt?: string;

  readTime?: number;
  views?: number;
  clicks?: number;
  likes?: number;
  shareCount?: number;
  bookmarks?: number;

  language?: string;
  country?: string;
  region?: string;
  destination?: string;

  sourceName?: string;
  sourceUrl?: string;
  sourceLinks?: string[];
  canonicalUrl?: string;
  externalLink?: string;
  adsLink?: string;

  seoTitle?: string;
  seoDescription?: string;
  seoKeywords?: string[];
  metaTitle?: string;
  metaDescription?: string;
  focusKeyword?: string;
  ogImage?: ApiImage;
  robots?: string;
  schemaMarkup?: unknown;

  cta?: {
    label?: string;
    url?: string;
    style?: "primary" | "secondary" | "ghost";
    openInNewTab?: boolean;
  };
  advertisement?: { code?: string; position?: string; enabled?: boolean };
  affiliateLinks?: AffiliateLink[];
  relatedNews?: Array<Article | string>;
  internalLinks?: Array<{ news?: Article | string; anchorText?: string }>;
}

export interface Pagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
  hasMore?: boolean;
}

export interface Paginated<T> {
  success: boolean;
  data: T[];
  pagination: Pagination;
}

export interface HomeFeed {
  hero: Article | null;
  breaking: Article[];
  featured: Article[];
  editorsPick: Article[];
  trending: Article[];
  popular: Article[];
  latest: Article[];
  /** Client-derived rail: leftovers that no other section used. */
  dontMiss?: Article[];
}

export type AdPosition =
  | "home-hero"
  | "home-top"
  | "home-infeed"
  | "home-mid"
  /** Rails beside the homepage Snap Wall — one slot per side. */
  | "home-gallery-left"
  | "home-gallery-right"
  /** @deprecated single-rail slot kept for creatives booked before the split. */
  | "home-gallery"
  | "home-bottom"
  | "sidebar"
  | "sidebar-sticky"
  /** Three bookable places down the article page's right column. */
  | "article-sidebar-top"
  | "article-sidebar-middle"
  | "article-sidebar-bottom"
  | "article-top"
  | "article-inline"
  | "article-bottom"
  | "category-top"
  | "category-infeed"
  | "footer"
  | "mobile-sticky-bottom";

/**
 * How a creative is framed. `banner` keeps the image's own proportions and
 * fills the slot's width, so nothing is cropped and no empty space is left
 * around it; `frame` holds the slot's standard size instead.
 */
export type AdDisplay = "banner" | "frame";

export interface Advertisement {
  _id: string;
  name: string;
  position: AdPosition;
  type: "image" | "script";
  display?: AdDisplay;
  /** Per-creative height ceiling in pixels; falls back to the slot's default. */
  maxHeight?: number | null;
  image?: ApiImage;
  scriptCode?: string;
  targetUrl?: string;
  openInNewTab?: boolean;
  devices?: string[];
}

/* ------------------------------------------------------------------ */
/* Homepage layout config — GET /api/homepage                          */
/* ------------------------------------------------------------------ */

export interface GalleryTile {
  /** Populated by the backend when the tile points at an article. */
  article?: Article | string | null;
  /** Overrides; each one wins over the article's own value when set. */
  image?: string;
  title?: string;
  category?: string;
  link?: string;
  order?: number;
}

export type GallerySide = "left" | "right";
export type GalleryRailWidth = "narrow" | "medium" | "wide";
/**
 * How the rail frames its creative. `auto` holds no frame at all — the artwork
 * keeps its own proportions and fills the rail's width, so nothing is cropped
 * and nothing is letterboxed. The fixed sizes keep one height across
 * rotations, at the cost of empty space around a shorter creative.
 */
export type GalleryRailSize = "auto" | "300x250" | "300x600" | "160x600";

export interface GalleryRail {
  enabled?: boolean;
  width?: GalleryRailWidth;
  /** "ad" serves whatever is booked on `adPosition`; "banner" uses the fields below. */
  type?: "ad" | "banner";
  size?: GalleryRailSize;
  adPosition?: AdPosition | string;
  heading?: string;
  image?: string;
  imageAlt?: string;
  link?: string;
  openInNewTab?: boolean;
  /** Stretch the rail card to match the grid height. */
  stretch?: boolean;
}

/** One rail per side; both may run at once. */
export interface GalleryRails {
  left?: GalleryRail;
  right?: GalleryRail;
}

export interface HomepageGallery {
  enabled?: boolean;
  title?: string;
  subtitle?: string;
  actionLabel?: string;
  actionLink?: string;
  /** "auto" fills the four tiles from the live feed; "manual" uses `items`. */
  source?: "auto" | "manual";
  items?: GalleryTile[];
  rails?: GalleryRails;
}

/**
 * One per-category block on the homepage: a lead story and the four that sit
 * beside it. Both arrive populated from the API; ids only ever appear on the
 * way back in from the admin panel.
 */
export interface HomepageCategorySection {
  category?: Category | string | null;
  trending?: Article | string | null;
  subTrending?: Array<Article | string>;
}

/**
 * One curated homepage rail.
 *
 * `auto` leaves the section to the live feed; `manual` pins `items` in the
 * order an editor arranged them. Items arrive populated from the API and go
 * back as ids.
 */
export interface HomepageRail {
  enabled?: boolean;
  mode?: "auto" | "manual";
  items?: Array<Article | string>;
  /** How many stories the section renders — set by the API. */
  limit?: number;
}

export type HomepageSectionKey =
  | "hero"
  | "heroRail"
  | "editorsPicks"
  | "featured"
  | "popular"
  | "latest"
  | "dontMiss"
  | "moreStories";

export type HomepageSections = Partial<Record<HomepageSectionKey, HomepageRail>>;

export interface HomepageConfig {
  mainTrending?: Article | null;
  subTrending?: Article[];
  categorySections?: HomepageCategorySection[];
  sections?: HomepageSections;
  customHomeBlocks?: Array<{ title?: string; link?: string; image?: string; order?: number }>;
  gallery?: HomepageGallery;
}

export interface NewsListQuery {
  page?: number;
  limit?: number;
  sort?: "latest" | "oldest" | "popular" | "trending" | "priority" | "title" | "updated";
  search?: string;
  category?: string;
  subCategory?: string;
  tag?: string;
  author?: string;
  region?: string;
  country?: string;
  language?: string;
  featured?: boolean;
  trending?: boolean;
  popular?: boolean;
  editorsPick?: boolean;
  breaking?: boolean;
  exclude?: string;
  dateFrom?: string;
  dateTo?: string;
}
