import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { AdSlot } from "@/components/ads/AdSlot";
import { useAds } from "@/hooks/useContent";
import { useDevice } from "@/hooks/useMediaQuery";
import { cn } from "@/lib/utils";

/**
 * A route change in a single-page app never reloads the page, so Analytics
 * would only ever see the first one. Each route reports itself instead, after
 * the page has set its own title (a page's own effect runs before this one).
 */
function PageViews() {
  const { pathname, search } = useLocation();

  useEffect(() => {
    const gtag = (window as unknown as { gtag?: (...args: unknown[]) => void }).gtag;
    if (typeof gtag !== "function") return;

    gtag("event", "page_view", {
      page_path: pathname + search,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [pathname, search]);

  return null;
}

function ScrollToTop() {
  const { pathname, hash } = useLocation();

  useEffect(() => {
    if (hash) return;
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [pathname, hash]);

  return null;
}

export function Layout() {
  const device = useDevice();
  const { data: stickyAds } = useAds("mobile-sticky-bottom", device);

  // Reserve room only when the sticky banner actually renders, so pages with
  // no booked ad keep their normal bottom spacing.
  const hasSticky =
    (stickyAds?.length ?? 0) > 0 || import.meta.env.VITE_AD_PLACEHOLDER === "true";

  return (
    <div className="flex min-h-screen flex-col bg-white dark:bg-[#0b1120]">
      <ScrollToTop />
      <PageViews />

      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-brand-600 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
      >
        Skip to content
      </a>

      <Header />

      <main id="main" className={cn("flex-1", hasSticky && "pb-24 lg:pb-0")}>
        <Outlet />
      </main>

      <Footer />

      {/* Mobile sticky banner: only paints when an ad is actually booked. */}
      {hasSticky && (
        <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 lg:hidden">
          <div className="pointer-events-auto container border-t border-ink-200 bg-white/95 py-2 backdrop-blur dark:border-ink-800 dark:bg-[#0b1120]/95">
            <AdSlot position="mobile-sticky-bottom" ratio="aspect-[320/50]" />
          </div>
        </div>
      )}
    </div>
  );
}
