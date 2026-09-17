import { lazy, Suspense } from "react";
import { Route, Routes } from "react-router-dom";
import { Layout } from "@/components/layout/Layout";
import { Skeleton } from "@/components/ui/Skeleton";
import Home from "@/pages/Home";

// The whole CMS lives behind /admin inside this same app.
const AdminApp = lazy(() => import("@/admin/AdminApp"));

/* Route-level code splitting keeps the first paint small. */
const ArticlePage = lazy(() => import("@/pages/ArticlePage"));
const CategoryPage = lazy(() => import("@/pages/CategoryPage"));
const CategoriesPage = lazy(() => import("@/pages/CategoriesPage"));
const TagPage = lazy(() => import("@/pages/TagPage"));
const AuthorPage = lazy(() => import("@/pages/AuthorPage"));
const SearchPage = lazy(() => import("@/pages/SearchPage"));
const BookmarksPage = lazy(() => import("@/pages/BookmarksPage"));
const ContactPage = lazy(() => import("@/pages/ContactPage"));

const LatestPage = lazy(() => import("@/pages/LatestPage"));
const TrendingPage = lazy(() => import("@/pages/TrendingPage"));
const PopularPage = lazy(() => import("@/pages/PopularPage"));
const GalleryPage = lazy(() => import("@/pages/GalleryPage"));
const VideosPage = lazy(() => import("@/pages/VideosPage"));
const AboutPage = lazy(() =>
  import("@/pages/StaticPages").then((m) => ({ default: m.AboutPage }))
);
const PrivacyPage = lazy(() =>
  import("@/pages/StaticPages").then((m) => ({ default: m.PrivacyPage }))
);
const TermsPage = lazy(() =>
  import("@/pages/StaticPages").then((m) => ({ default: m.TermsPage }))
);
const SitemapPage = lazy(() =>
  import("@/pages/StaticPages").then((m) => ({ default: m.SitemapPage }))
);
const NewsletterPage = lazy(() =>
  import("@/pages/StaticPages").then((m) => ({ default: m.NewsletterPage }))
);
const NotFoundPage = lazy(() =>
  import("@/pages/StaticPages").then((m) => ({ default: m.NotFoundPage }))
);

function RouteFallback() {
  return (
    <div className="container space-y-5 py-10">
      <Skeleton className="h-9 w-72" />
      <Skeleton className="h-4 w-96" />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-72 rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      {/* admin panel — outside the public layout, own providers */}
      <Route
        path="/admin/*"
        element={
          <Suspense fallback={<RouteFallback />}>
            <AdminApp />
          </Suspense>
        }
      />

      <Route element={<Layout />}>
        <Route index element={<Home />} />

        <Route
          path="article/:slug"
          element={
            <Suspense fallback={<RouteFallback />}>
              <ArticlePage />
            </Suspense>
          }
        />
        {/* Legacy/alternate article paths keep old links alive. */}
        <Route
          path="news/:slug"
          element={
            <Suspense fallback={<RouteFallback />}>
              <ArticlePage />
            </Suspense>
          }
        />

        <Route
          path="category/:slug"
          element={
            <Suspense fallback={<RouteFallback />}>
              <CategoryPage />
            </Suspense>
          }
        />
        <Route
          path="categories"
          element={
            <Suspense fallback={<RouteFallback />}>
              <CategoriesPage />
            </Suspense>
          }
        />
        <Route
          path="categories/:slug"
          element={
            <Suspense fallback={<RouteFallback />}>
              <CategoryPage />
            </Suspense>
          }
        />
        <Route
          path="tag/:slug"
          element={
            <Suspense fallback={<RouteFallback />}>
              <TagPage />
            </Suspense>
          }
        />
        <Route
          path="author/:name"
          element={
            <Suspense fallback={<RouteFallback />}>
              <AuthorPage />
            </Suspense>
          }
        />
        <Route
          path="search"
          element={
            <Suspense fallback={<RouteFallback />}>
              <SearchPage />
            </Suspense>
          }
        />
        <Route
          path="latest"
          element={
            <Suspense fallback={<RouteFallback />}>
              <LatestPage />
            </Suspense>
          }
        />
        <Route
          path="trending"
          element={
            <Suspense fallback={<RouteFallback />}>
              <TrendingPage />
            </Suspense>
          }
        />
        <Route
          path="popular"
          element={
            <Suspense fallback={<RouteFallback />}>
              <PopularPage />
            </Suspense>
          }
        />
        <Route
          path="gallery"
          element={
            <Suspense fallback={<RouteFallback />}>
              <GalleryPage />
            </Suspense>
          }
        />
        <Route
          path="videos"
          element={
            <Suspense fallback={<RouteFallback />}>
              <VideosPage />
            </Suspense>
          }
        />
        <Route
          path="bookmarks"
          element={
            <Suspense fallback={<RouteFallback />}>
              <BookmarksPage />
            </Suspense>
          }
        />
        <Route
          path="contact"
          element={
            <Suspense fallback={<RouteFallback />}>
              <ContactPage />
            </Suspense>
          }
        />
        <Route
          path="about"
          element={
            <Suspense fallback={<RouteFallback />}>
              <AboutPage />
            </Suspense>
          }
        />
        <Route
          path="newsletter"
          element={
            <Suspense fallback={<RouteFallback />}>
              <NewsletterPage />
            </Suspense>
          }
        />
        <Route
          path="privacy-policy"
          element={
            <Suspense fallback={<RouteFallback />}>
              <PrivacyPage />
            </Suspense>
          }
        />
        <Route
          path="terms"
          element={
            <Suspense fallback={<RouteFallback />}>
              <TermsPage />
            </Suspense>
          }
        />
        <Route
          path="sitemap"
          element={
            <Suspense fallback={<RouteFallback />}>
              <SitemapPage />
            </Suspense>
          }
        />

        <Route
          path="*"
          element={
            <Suspense fallback={<RouteFallback />}>
              <NotFoundPage />
            </Suspense>
          }
        />
      </Route>
    </Routes>
  );
}
