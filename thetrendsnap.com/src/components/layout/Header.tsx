import { useEffect, useMemo, useRef, useState } from "react";
import { Link, NavLink, useLocation } from "react-router-dom";
import {
  Bookmark,
  ChevronDown,
  Flame,
  LayoutGrid,
  Menu,
  Moon,
  Search,
  Sun,
  X,
} from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import { SearchBox } from "@/components/layout/SearchBox";
import { CategoryStrip } from "@/components/layout/CategoryStrip";
import { useCategories, useHomeFeed } from "@/hooks/useContent";
import { useTheme } from "@/hooks/useTheme";
import { useBookmarks } from "@/hooks/useBookmarks";
import { articleHref, categoryName, cn } from "@/lib/utils";

const STATIC_LINKS = [
  { label: "Home", to: "/" },
  { label: "Latest", to: "/latest" },
  { label: "Trending", to: "/trending" },
  { label: "Popular", to: "/popular" },
  { label: "Gallery", to: "/gallery" },
  { label: "Videos", to: "/videos" },
];

export function Header() {
  const { theme, toggle } = useTheme();
  const { data: categories = [] } = useCategories({ withCounts: true });
  const { data: feed } = useHomeFeed();
  const { slugs } = useBookmarks();
  const location = useLocation();

  const [mobileOpen, setMobileOpen] = useState(false);
  const [browseOpen, setBrowseOpen] = useState(false);
  const [mobileSearch, setMobileSearch] = useState(false);
  const browseRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setMobileOpen(false);
    setBrowseOpen(false);
    setMobileSearch(false);
  }, [location.pathname, location.search]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!browseRef.current?.contains(event.target as Node)) setBrowseOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setBrowseOpen(false);
        setMobileOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onClick);
      document.removeEventListener("keydown", onKey);
    };
  }, []);

  useEffect(() => {
    document.body.style.overflow = mobileOpen ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileOpen]);

  const navCategories = useMemo(
    () => categories.filter((c) => c.showInMenu !== false),
    [categories]
  );

  // Headline ticker fills the right of the nav strip instead of dead space.
  const ticker = useMemo(() => {
    const pool = [
      ...(feed?.breaking ?? []),
      ...(feed?.trending ?? []),
      ...(feed?.latest ?? []),
    ];
    const seen = new Set<string>();
    return pool
      .filter((article) => article && !seen.has(article._id) && seen.add(article._id))
      .slice(0, 6);
  }, [feed]);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    cn(
      "relative whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-bold transition-colors",
      // The current page carries both a tint and a rule under it: the tint
      // alone is easy to read as a hover, the rule is not.
      isActive
        ? "bg-brand-50 text-brand-700 after:absolute after:inset-x-3 after:-bottom-[9px] after:h-0.5 after:rounded-full after:bg-brand-600 dark:bg-brand-500/15 dark:text-brand-300 dark:after:bg-brand-400"
        : "text-ink-600 hover:bg-ink-100 hover:text-brand-600 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-brand-400"
    );

  return (
    <header className="sticky top-0 z-50 border-b border-ink-200 bg-white shadow-[0_1px_0_rgba(15,23,42,.04)] dark:border-ink-800 dark:bg-[#0b1120]">
      {/* ---------------- row 1 ---------------- */}
      <div className="container">
        <div className="flex h-[68px] items-center gap-3 lg:gap-6">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="-ml-1 btn-quiet lg:hidden"
            aria-label="Open menu"
            aria-expanded={mobileOpen}
          >
            <Menu className="h-5 w-5" aria-hidden="true" />
          </button>

          <Logo className="shrink-0" />

          {/* primary sections live beside the logo; categories get their own row */}
          <nav aria-label="Primary" className="ml-2 hidden items-center gap-1 lg:flex">
            {STATIC_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} end={link.to === "/"} className={navLinkClass}>
                {link.label}
              </NavLink>
            ))}
          </nav>

          <SearchBox className="ml-auto hidden w-full max-w-[300px] md:block xl:max-w-[340px]" />

          <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
            <button
              type="button"
              onClick={() => setMobileSearch((prev) => !prev)}
              className="btn-quiet h-9 w-9 md:hidden sm:h-10 sm:w-10"
              aria-label="Search"
            >
              <Search className="h-5 w-5" aria-hidden="true" />
            </button>

            <button
              type="button"
              onClick={toggle}
              className="btn-quiet h-9 w-9 sm:h-10 sm:w-10"
              aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            >
              {theme === "dark" ? (
                <Sun className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Moon className="h-5 w-5" aria-hidden="true" />
              )}
            </button>

            <Link
              to="/bookmarks"
              className="btn-quiet relative hidden h-9 w-9 sm:inline-flex sm:h-10 sm:w-10"
              aria-label="Reading list"
            >
              <Bookmark className="h-5 w-5" aria-hidden="true" />
              {slugs.length > 0 && (
                <span className="absolute right-1 top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-flame px-1 text-xs font-bold text-white">
                  {slugs.length > 9 ? "9+" : slugs.length}
                </span>
              )}
            </Link>

            <Link
              to="/newsletter"
              className="ml-1 hidden h-10 items-center rounded-lg bg-brand-600 px-4 text-[13px] font-bold text-white transition-colors hover:bg-brand-700 sm:inline-flex"
            >
              Subscribe
            </Link>
          </div>
        </div>

        {mobileSearch && (
          <div className="pb-3 md:hidden">
            <SearchBox autoFocus onDone={() => setMobileSearch(false)} />
          </div>
        )}
      </div>

      {/* ---------------- row 2: categories ---------------- */}
      <div className="border-t border-ink-100 bg-ink-50/60 dark:border-ink-800 dark:bg-ink-900/40">
        <div className="container flex items-center gap-3">
          <div ref={browseRef} className="relative shrink-0 py-1.5">
            <button
              type="button"
              onClick={() => setBrowseOpen((prev) => !prev)}
              aria-expanded={browseOpen}
              className="btn-primary h-8 px-3 py-0 sm:px-4"
            >
              <LayoutGrid className="h-3.5 w-3.5" aria-hidden="true" />
              Categories
              <ChevronDown
                className={cn("h-3 w-3 transition-transform", browseOpen && "rotate-180")}
                aria-hidden="true"
              />
            </button>

            {browseOpen && (
              <div className="absolute left-0 top-[46px] z-50 w-[min(720px,92vw)] overflow-hidden rounded-2xl border border-ink-200 bg-white shadow-pop dark:border-ink-700 dark:bg-ink-900">
                <div className="flex items-center justify-between border-b border-ink-100 px-4 py-2.5 dark:border-ink-800">
                  <p className="font-display text-[13px] font-bold text-ink-900 dark:text-white">
                    All categories
                  </p>
                  <span className="text-xs font-semibold text-ink-500 dark:text-ink-400">
                    {categories.length} sections
                  </span>
                </div>

                <div className="grid max-h-[62vh] grid-cols-2 gap-1 overflow-y-auto p-2 sm:grid-cols-3">
                  {categories.map((category) => (
                    <NavLink
                      key={category._id}
                      to={`/category/${category.slug}`}
                      className={({ isActive }) =>
                        cn(
                          "flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors",
                          isActive
                            ? "bg-brand-600 text-white"
                            : "text-ink-700 hover:bg-brand-50 hover:text-brand-700 dark:text-ink-200 dark:hover:bg-brand-500/10 dark:hover:text-brand-300"
                        )
                      }
                    >
                      {({ isActive }) => (
                        <>
                          <span className="clamp-1">{category.name}</span>
                          {typeof category.articleCount === "number" && (
                            <span
                              className={cn(
                                "shrink-0 rounded-full px-1.5 py-0.5 text-xs font-bold",
                                isActive
                                  ? "bg-white/20 text-white"
                                  : "bg-ink-100 text-ink-500 dark:bg-ink-800 dark:text-ink-400"
                              )}
                            >
                              {category.articleCount}
                            </span>
                          )}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>

                <Link
                  to="/categories"
                  className="block border-t border-ink-100 bg-ink-50 px-3 py-2 text-center text-xs font-bold text-brand-600 transition-colors hover:bg-ink-100 dark:border-ink-800 dark:bg-ink-800/60 dark:text-brand-400"
                >
                  Browse every category
                </Link>
              </div>
            )}
          </div>

          {/* divider makes it obvious where the category rail begins */}
          <span
            aria-hidden="true"
            className="hidden h-5 w-px shrink-0 bg-ink-200 lg:block dark:bg-ink-700"
          />

          <CategoryStrip categories={navCategories} />

          {/* trending ticker — larger and clearly separated */}
          {ticker.length > 0 && (
            <div className="ml-2 hidden min-w-0 shrink items-center gap-3 border-l border-ink-200 pl-5 xl:flex dark:border-ink-700">
              <Link
                to="/trending"
                className="btn shrink-0 bg-flame px-4 py-1.5 text-white hover:bg-rose-600"
              >
                <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                Trending
              </Link>

              <div className="relative min-w-0 max-w-[210px] flex-1 overflow-hidden 2xl:max-w-[420px]">
                <ul className="flex w-max animate-marquee items-center gap-6 py-2">
                  {[...ticker, ...ticker].map((article, index) => (
                    <li key={`${article._id}-${index}`} aria-hidden={index >= ticker.length}>
                      <Link
                        to={articleHref(article)}
                        tabIndex={index >= ticker.length ? -1 : undefined}
                        className="flex items-center gap-2 whitespace-nowrap text-[13px] font-semibold text-ink-600 transition-colors hover:text-brand-600 dark:text-ink-300 dark:hover:text-brand-400"
                      >
                        <span className="shrink-0 text-xs font-bold text-brand-600 dark:text-brand-400">
                          {categoryName(article)}
                        </span>
                        <span>{article.title}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---------------- mobile drawer ---------------- */}
      {mobileOpen && (
        <div className="fixed inset-0 z-[60] lg:hidden">
          <div
            className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
            aria-hidden="true"
          />
          <div className="absolute inset-y-0 left-0 flex w-[86%] max-w-sm flex-col bg-white shadow-pop dark:bg-ink-900">
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3 dark:border-ink-800">
              <Logo compact />
              <button
                type="button"
                onClick={() => setMobileOpen(false)}
                className="btn-quiet h-9 w-9 sm:h-10 sm:w-10"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <SearchBox onDone={() => setMobileOpen(false)} />

              <nav aria-label="Mobile" className="mt-5 space-y-1">
                {STATIC_LINKS.map((link) => (
                  <NavLink
                    key={link.to}
                    to={link.to}
                    end={link.to === "/"}
                    className={({ isActive }) =>
                      cn(
                        "block rounded-lg px-3 py-2.5 text-sm font-bold transition-colors",
                        isActive
                          ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                          : "text-ink-700 hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-800"
                      )
                    }
                  >
                    {link.label}
                  </NavLink>
                ))}
              </nav>

              <p className="mt-6 px-3 text-xs font-bold uppercase tracking-wider text-ink-400">
                Categories
              </p>
              <nav aria-label="Categories" className="mt-2 space-y-1">
                {categories.map((category) => (
                  <NavLink
                    key={category._id}
                    to={`/category/${category.slug}`}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center justify-between rounded-lg px-3 py-2.5 text-sm font-semibold transition-colors",
                        isActive
                          ? "bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                          : "text-ink-700 hover:bg-ink-50 dark:text-ink-200 dark:hover:bg-ink-800"
                      )
                    }
                  >
                    <span className="clamp-1">{category.name}</span>
                    {typeof category.articleCount === "number" && (
                      <span className="shrink-0 text-xs font-bold text-ink-400">
                        {category.articleCount}
                      </span>
                    )}
                  </NavLink>
                ))}
              </nav>

              <Link
                to="/newsletter"
                className="mt-6 flex h-11 items-center justify-center rounded-lg bg-brand-600 text-sm font-bold text-white"
              >
                Subscribe to newsletter
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
