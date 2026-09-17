import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AppShell } from "@/admin/components/AppShell";
import { LoadingBlock } from "@/admin/components/ui";
import { ToastProvider } from "@/admin/components/Toast";
import { AuthProvider, useAuth } from "@/admin/hooks/useAuth";
import Login from "@/admin/pages/Login";
import Dashboard from "@/admin/pages/Dashboard";

const Articles = lazy(() => import("@/admin/pages/Articles"));
const ArticleEditor = lazy(() => import("@/admin/pages/ArticleEditor"));
const Categories = lazy(() => import("@/admin/pages/Categories"));
const Tags = lazy(() => import("@/admin/pages/Tags"));
const Media = lazy(() => import("@/admin/pages/Media"));
const HomepageLayout = lazy(() => import("@/admin/pages/HomepageLayout"));
const Ads = lazy(() => import("@/admin/pages/Ads"));
const Contacts = lazy(() => import("@/admin/pages/Contacts"));
const Subscribers = lazy(() => import("@/admin/pages/Subscribers"));
const ImportExport = lazy(() => import("@/admin/pages/ImportExport"));
const Automation = lazy(() => import("@/admin/pages/Automation"));
const SeoInsights = lazy(() => import("@/admin/pages/SeoInsights"));
const Settings = lazy(() => import("@/admin/pages/Settings"));

/** The panel keeps its own cache so admin data never mixes with the public site. */
const adminQueryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 60 * 1000, refetchOnWindowFocus: false, retry: 1 },
  },
});

function Protected({ children }: { children: React.ReactNode }) {
  const { isAuthed } = useAuth();
  const location = useLocation();

  if (!isAuthed) return <Navigate to="/admin/login" state={{ from: location }} replace />;
  return <>{children}</>;
}

function AdminRoutes() {
  const { isAuthed } = useAuth();

  return (
    <Suspense fallback={<LoadingBlock />}>
      <Routes>
        <Route path="login" element={isAuthed ? <Navigate to="/admin" replace /> : <Login />} />

        <Route
          element={
            <Protected>
              <AppShell />
            </Protected>
          }
        >
          <Route index element={<Dashboard />} />
          <Route path="articles" element={<Articles />} />
          <Route path="articles/new" element={<ArticleEditor />} />
          <Route path="articles/:id/edit" element={<ArticleEditor />} />
          <Route path="categories" element={<Categories />} />
          <Route path="tags" element={<Tags />} />
          <Route path="media" element={<Media />} />
          <Route path="homepage" element={<HomepageLayout />} />
          <Route path="ads" element={<Ads />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="subscribers" element={<Subscribers />} />
          <Route path="import" element={<ImportExport />} />
          <Route path="automation" element={<Automation />} />
          <Route path="seo" element={<SeoInsights />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}

/**
 * Mounted by the public app at /admin/*. It carries its own providers so the
 * marketing site keeps its own query cache, theme handling and toasts.
 */
export default function AdminApp() {
  return (
    <QueryClientProvider client={adminQueryClient}>
      <ToastProvider>
        <AuthProvider>
          <div className="admin-root min-h-screen bg-ink-50 text-ink-900 dark:bg-[#0b1120] dark:text-ink-100">
            <AdminRoutes />
          </div>
        </AuthProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}
