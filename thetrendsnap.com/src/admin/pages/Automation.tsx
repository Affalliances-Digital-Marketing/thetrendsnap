import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, PlayCircle, Timer } from "lucide-react";
import { articlesApi, automationApi, categoriesApi, dashboardApi } from "@/admin/lib/api";
import { ErrorBlock, LoadingBlock, SectionCard, Spinner, StatusBadge, formatDate } from "@/admin/components/ui";
import { useToast } from "@/admin/components/Toast";
import { useAuth } from "@/admin/hooks/useAuth";
import { Link } from "react-router-dom";

export default function Automation() {
  const toast = useToast();
  const { can } = useAuth();
  const queryClient = useQueryClient();

  const stats = useQuery({ queryKey: ["dashboard"], queryFn: () => dashboardApi.stats() });

  const categories = useQuery({
    queryKey: ["categories", "automation"],
    queryFn: () => categoriesApi.list({ withCounts: true }),
  });

  const aiArticles = useQuery({
    queryKey: ["articles", "ai"],
    queryFn: () => articlesApi.list({ limit: 10, sort: "latest", status: "all" }),
  });

  const run = useMutation({
    mutationFn: () => automationApi.run(),
    onSuccess: (res) => {
      toast.success(`${res.count} draft(s) generated`);
      void queryClient.invalidateQueries({ queryKey: ["articles"] });
      void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const autoCategories = (categories.data ?? []).filter((category) => category.autoUpdateEnabled);
  const generated = (aiArticles.data?.data ?? []).filter((article) => article.aiGenerated);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-ink-900 dark:text-white">
            Automation
          </h1>
          <p className="mt-0.5 text-sm text-ink-500">
            Auto-generated drafts, the daily cron and scheduled publishing.
          </p>
        </div>
        <button
          type="button"
          className="adm-btn-primary"
          onClick={() => run.mutate()}
          disabled={run.isPending || !can("canPublish")}
        >
          {run.isPending ? <Spinner /> : <PlayCircle className="h-4 w-4" />}
          Run auto-news now
        </button>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <SectionCard title="Pipeline status" className="lg:col-span-2">
          <dl className="grid gap-3 sm:grid-cols-2">
            {[
              ["AI generated articles", stats.data?.aiNews ?? "—"],
              ["Auto-update enabled", stats.data?.autoUpdateNews ?? "—"],
              ["Categories in the cron", autoCategories.length],
              ["Average SEO score", stats.data ? `${stats.data.avgSeoScore}/100` : "—"],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg border border-ink-200 p-3 dark:border-ink-700">
                <dt className="text-[11px] font-bold uppercase tracking-wide text-ink-400">{label}</dt>
                <dd className="mt-1 font-display text-lg font-extrabold text-ink-900 dark:text-white">
                  {String(value)}
                </dd>
              </div>
            ))}
          </dl>
        </SectionCard>

        <SectionCard title="Scheduled jobs">
          <ul className="space-y-2.5 text-sm">
            <li className="flex items-start gap-2.5">
              <Timer className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
              <span>
                <strong className="block text-ink-800 dark:text-ink-100">Daily auto-news</strong>
                <span className="text-ink-500">
                  Runs on the backend cron (CRON_TIME in the server environment).
                </span>
              </span>
            </li>
            <li className="flex items-start gap-2.5">
              <Timer className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" />
              <span>
                <strong className="block text-ink-800 dark:text-ink-100">Scheduled publishing</strong>
                <span className="text-ink-500">
                  Every minute: articles whose publish time has arrived go live automatically.
                </span>
              </span>
            </li>
          </ul>
        </SectionCard>
      </div>

      <SectionCard
        title="Categories in the auto-news cron"
        description="Toggle a category's automation from the Categories screen."
        actions={
          <Link to="/admin/categories" className="adm-btn-ghost adm-btn-sm">
            Manage categories
          </Link>
        }
      >
        {categories.isLoading ? (
          <LoadingBlock />
        ) : categories.isError ? (
          <ErrorBlock error={categories.error} onRetry={() => void categories.refetch()} />
        ) : autoCategories.length === 0 ? (
          <p className="py-3 text-sm text-ink-500">
            No category has automation enabled — the cron will do nothing.
          </p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th>Daily limit</th>
                  <th>Articles</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {autoCategories.map((category) => (
                  <tr key={category._id}>
                    <td className="font-semibold">{category.name}</td>
                    <td>{category.dailyAutoUpdateLimit ?? 0}</td>
                    <td>{category.articleCount ?? 0}</td>
                    <td>
                      <StatusBadge status={category.status === "active" ? "published" : "draft"} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Recent AI drafts" description="Generated articles waiting for review.">
        {aiArticles.isLoading ? (
          <LoadingBlock />
        ) : generated.length === 0 ? (
          <p className="py-3 text-sm text-ink-500">
            <Bot className="mr-1.5 inline h-4 w-4" />
            No AI-generated articles in the latest batch.
          </p>
        ) : (
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {generated.map((article) => (
              <li key={article._id} className="flex items-center justify-between gap-3 py-2.5">
                <Link
                  to={`/admin/articles/${article._id}/edit`}
                  className="clamp-1 text-sm font-semibold text-ink-800 hover:text-brand-600 dark:text-ink-100"
                >
                  {article.title}
                </Link>
                <div className="flex shrink-0 items-center gap-2 text-[11px] text-ink-500">
                  <StatusBadge status={article.status} />
                  {formatDate(article.createdAt)}
                </div>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}
