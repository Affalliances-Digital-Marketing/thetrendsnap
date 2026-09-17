import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3,
  Bot,
  FileText,
  FolderTree,
  Mail,
  PenSquare,
  Sparkles,
  TrendingUp,
} from "lucide-react";
import { articlesApi, contactApi, dashboardApi, mediaApi, newsletterApi, tagsApi } from "@/admin/lib/api";
import { ErrorBlock, LoadingBlock, SectionCard, StatusBadge, formatDate } from "@/admin/components/ui";
import type { ContactMessage } from "@/admin/types";

export default function Dashboard() {
  const stats = useQuery({ queryKey: ["dashboard"], queryFn: () => dashboardApi.stats() });

  const recent = useQuery({
    queryKey: ["articles", { page: 1, limit: 8, sort: "updated", status: "all" }],
    queryFn: () => articlesApi.list({ page: 1, limit: 8, sort: "updated", status: "all" }),
  });

  const tags = useQuery({ queryKey: ["tags", { limit: 1 }], queryFn: () => tagsApi.list({ limit: 1 }) });
  const media = useQuery({ queryKey: ["media", { limit: 1 }], queryFn: () => mediaApi.list({ limit: 1 }) });
  const subs = useQuery({ queryKey: ["subscribers", { limit: 1 }], queryFn: () => newsletterApi.list({ limit: 1 }) });
  const contacts = useQuery({ queryKey: ["contacts"], queryFn: () => contactApi.list() });

  const contactList: ContactMessage[] = Array.isArray(contacts.data)
    ? contacts.data
    : contacts.data?.data ?? [];

  const cards = [
    { label: "Total articles", value: stats.data?.totalNews, icon: FileText, to: "/articles" },
    { label: "Published", value: stats.data?.publishedNews, icon: TrendingUp, to: "/articles?status=published" },
    { label: "Drafts", value: stats.data?.draftNews, icon: PenSquare, to: "/articles?status=draft" },
    { label: "Categories", value: stats.data?.categories, icon: FolderTree, to: "/categories" },
    { label: "Tags", value: tags.data?.pagination?.total, icon: Sparkles, to: "/tags" },
    { label: "Media files", value: media.data?.pagination?.total, icon: BarChart3, to: "/media" },
    { label: "Subscribers", value: subs.data?.stats?.active ?? subs.data?.pagination?.total, icon: Mail, to: "/subscribers" },
    { label: "AI generated", value: stats.data?.aiNews, icon: Bot, to: "/automation" },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-ink-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-0.5 text-sm text-ink-500">Everything happening across TheTrendSnap.</p>
        </div>
        <Link to="/admin/articles/new" className="adm-btn-primary">
          <PenSquare className="h-4 w-4" />
          New article
        </Link>
      </header>

      {stats.isError && <ErrorBlock error={stats.error} onRetry={() => void stats.refetch()} />}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, icon: Icon, to }) => (
          <Link
            key={label}
            to={to}
            className="adm-card flex items-center gap-3 p-4 transition-all hover:-translate-y-0.5 hover:shadow-pop"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
              <Icon className="h-5 w-5" />
            </span>
            <span>
              <span className="block font-display text-xl font-extrabold text-ink-900 dark:text-white">
                {typeof value === "number" ? value.toLocaleString() : "—"}
              </span>
              <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                {label}
              </span>
            </span>
          </Link>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <SectionCard
          title="Recently updated"
          description="The last eight articles touched by the team."
          className="lg:col-span-2"
          actions={
            <Link to="/admin/articles" className="adm-btn-ghost adm-btn-sm">
              All articles
            </Link>
          }
        >
          {recent.isLoading ? (
            <LoadingBlock />
          ) : recent.isError ? (
            <ErrorBlock error={recent.error} onRetry={() => void recent.refetch()} />
          ) : (
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Status</th>
                    <th>Views</th>
                    <th>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {(recent.data?.data ?? []).map((article) => (
                    <tr key={article._id}>
                      <td>
                        <Link
                          to={`/admin/articles/${article._id}/edit`}
                          className="clamp-1 font-semibold text-ink-800 hover:text-brand-600 dark:text-ink-100"
                        >
                          {article.title}
                        </Link>
                      </td>
                      <td>
                        <StatusBadge status={article.status} />
                      </td>
                      <td className="text-ink-500">{article.views ?? 0}</td>
                      <td className="whitespace-nowrap text-ink-500">
                        {formatDate(article.updatedAt || article.publishedDate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>

        <div className="space-y-5">
          <SectionCard title="Content health">
            <dl className="space-y-2.5 text-sm">
              {[
                ["Average SEO score", stats.data?.avgSeoScore != null ? `${stats.data.avgSeoScore}/100` : "—"],
                ["Auto-update enabled", stats.data?.autoUpdateNews ?? "—"],
                ["AI generated", stats.data?.aiNews ?? "—"],
                ["New contact messages", stats.data?.newContacts ?? "—"],
              ].map(([label, value]) => (
                <div key={String(label)} className="flex items-center justify-between gap-3">
                  <dt className="text-ink-500 dark:text-ink-400">{label}</dt>
                  <dd className="font-bold text-ink-900 dark:text-white">{String(value)}</dd>
                </div>
              ))}
            </dl>
          </SectionCard>

          <SectionCard
            title="Latest messages"
            actions={
              <Link to="/admin/contacts" className="adm-btn-ghost adm-btn-sm">
                Inbox
              </Link>
            }
          >
            {contacts.isLoading ? (
              <LoadingBlock />
            ) : contactList.length === 0 ? (
              <p className="py-3 text-sm text-ink-500">No messages yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {contactList.slice(0, 4).map((message) => (
                  <li key={message._id} className="rounded-lg border border-ink-100 p-2.5 dark:border-ink-800">
                    <div className="flex items-center justify-between gap-2">
                      <p className="clamp-1 text-[13px] font-bold text-ink-800 dark:text-ink-100">
                        {message.name}
                      </p>
                      <StatusBadge status={message.status} />
                    </div>
                    <p className="clamp-2 mt-1 text-[12px] text-ink-500">{message.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}
