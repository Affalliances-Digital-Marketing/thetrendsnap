import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  BarChart3,
  Bot,
  ExternalLink,
  FileText,
  FolderTree,
  Image as ImageIcon,
  LayoutDashboard,
  LogOut,
  Mail,
  Megaphone,
  Menu,
  Moon,
  Newspaper,
  Settings,
  Sun,
  Tags,
  Upload,
  Users,
  X,
} from "lucide-react";
import { useAuth } from "@/admin/hooks/useAuth";
import { SITE_URL } from "@/admin/lib/api";
import { cn } from "@/admin/components/ui";

const NAV = [
  { to: "/admin", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/admin/articles", label: "Articles", icon: FileText },
  { to: "/admin/categories", label: "Categories", icon: FolderTree },
  { to: "/admin/tags", label: "Tags", icon: Tags },
  { to: "/admin/media", label: "Media library", icon: ImageIcon },
  { to: "/admin/homepage", label: "Homepage layout", icon: Newspaper },
  { to: "/admin/ads", label: "Advertisements", icon: Megaphone },
  { to: "/admin/contacts", label: "Contact inbox", icon: Mail },
  { to: "/admin/subscribers", label: "Newsletter", icon: Users },
  { to: "/admin/import", label: "Import / export", icon: Upload },
  { to: "/admin/automation", label: "Automation", icon: Bot },
  { to: "/admin/seo", label: "SEO insights", icon: BarChart3 },
  { to: "/admin/settings", label: "Settings", icon: Settings },
];

const THEME_KEY = "tts-admin-theme";

export function AppShell() {
  const { admin, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem(THEME_KEY) === "dark");

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
  }, [dark]);

  const nav = (
    <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2.5 rounded-lg px-3 py-2 text-[13px] font-semibold transition-colors",
              isActive
                ? "bg-brand-600 text-white"
                : "text-ink-600 hover:bg-ink-100 hover:text-ink-900 dark:text-ink-300 dark:hover:bg-ink-800 dark:hover:text-white"
            )
          }
        >
          <Icon className="h-4 w-4 shrink-0" />
          {label}
        </NavLink>
      ))}
    </nav>
  );

  return (
    <div className="flex min-h-screen">
      {/* ---------------- desktop sidebar ---------------- */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-ink-200 bg-white lg:flex dark:border-ink-800 dark:bg-ink-900">
        <div className="flex items-center gap-2.5 border-b border-ink-100 px-4 py-4 dark:border-ink-800">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-brand-500 to-fuchsia-500">
            <svg viewBox="0 0 24 24" className="h-4 w-4 fill-white" aria-hidden="true">
              <path d="M13.5 2 5.7 13.2h4.6L9 22l8.4-11.6h-4.7l.8-8.4z" />
            </svg>
          </span>
          <div className="min-w-0">
            <p className="font-display text-[14px] font-extrabold leading-none text-ink-900 dark:text-white">
              TheTrendSnap
            </p>
            <p className="mt-1 text-[10.5px] font-semibold uppercase tracking-wider text-ink-400">
              Admin panel
            </p>
          </div>
        </div>

        {nav}

        <div className="border-t border-ink-100 p-3 dark:border-ink-800">
          <a
            href={SITE_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 rounded-lg px-3 py-2 text-[12px] font-semibold text-ink-500 transition-colors hover:bg-ink-100 hover:text-brand-600 dark:text-ink-400 dark:hover:bg-ink-800"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            View live site
          </a>
        </div>
      </aside>

      {/* ---------------- mobile drawer ---------------- */}
      {open && (
        <div className="fixed inset-0 z-[80] lg:hidden">
          <div
            className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm"
            onClick={() => setOpen(false)}
            aria-hidden="true"
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-white dark:bg-ink-900">
            <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3 dark:border-ink-800">
              <p className="font-display text-sm font-extrabold text-ink-900 dark:text-white">
                TheTrendSnap Admin
              </p>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg p-1.5 text-ink-500 hover:bg-ink-100 dark:hover:bg-ink-800"
                aria-label="Close menu"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            {nav}
          </aside>
        </div>
      )}

      {/* ---------------- main ---------------- */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-40 flex h-14 items-center gap-3 border-b border-ink-200 bg-white px-4 dark:border-ink-800 dark:bg-ink-900">
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="rounded-lg p-2 text-ink-600 hover:bg-ink-100 lg:hidden dark:text-ink-300 dark:hover:bg-ink-800"
            aria-label="Open menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          <Link
            to="/admin/articles/new"
            className="adm-btn-primary adm-btn-sm hidden sm:inline-flex"
          >
            New article
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => setDark((prev) => !prev)}
              className="rounded-lg p-2 text-ink-600 hover:bg-ink-100 dark:text-ink-300 dark:hover:bg-ink-800"
              aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
            >
              {dark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            <div className="hidden text-right sm:block">
              <p className="text-[12px] font-bold leading-none text-ink-800 dark:text-ink-100">
                {admin?.name || admin?.email}
              </p>
              <p className="mt-1 text-[10.5px] uppercase tracking-wide text-ink-400">
                {admin?.role}
              </p>
            </div>

            <button
              type="button"
              onClick={logout}
              className="rounded-lg p-2 text-ink-600 hover:bg-rose-50 hover:text-rose-600 dark:text-ink-300 dark:hover:bg-rose-500/10"
              aria-label="Log out"
              title="Log out"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
