import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { articlesApi } from "@/admin/lib/api";
import type { Article } from "@/admin/types";
import { ErrorBlock, LoadingBlock, SectionCard, StatusBadge, formatDate } from "@/admin/components/ui";

interface Issue {
  article: Article;
  problems: string[];
}

/** Client-side audit over the article list — no extra backend endpoint needed. */
function audit(article: Article): string[] {
  const problems: string[] = [];
  const title = article.metaTitle || article.seoTitle || article.title || "";
  const description = article.metaDescription || article.seoDescription || article.description || "";

  if (!article.featuredImage?.url) problems.push("No featured image");
  if (!title) problems.push("Missing title");
  else if (title.length > 65) problems.push(`Title too long (${title.length})`);
  if (!description) problems.push("Missing meta description");
  else if (description.length < 70) problems.push(`Description short (${description.length})`);
  else if (description.length > 170) problems.push(`Description long (${description.length})`);
  if (!article.focusKeyword) problems.push("No focus keyword");
  if (!(article.tagNames?.length || article.tags?.length)) problems.push("No tags");
  if (!article.category) problems.push("No category");
  if (!article.featuredImage?.alt) problems.push("Featured image missing alt text");
  if (article.robots && article.robots.includes("noindex")) problems.push("Set to noindex");

  return problems;
}

export default function SeoInsights() {
  const [status, setStatus] = useState("published");

  const list = useQuery({
    queryKey: ["articles", "seo", status],
    queryFn: () => articlesApi.list({ limit: 100, status, sort: "latest" }),
  });

  const rows: Issue[] = useMemo(
    () =>
      (list.data?.data ?? [])
        .map((article) => ({ article, problems: audit(article) }))
        .sort((a, b) => b.problems.length - a.problems.length),
    [list.data]
  );

  const clean = rows.filter((row) => row.problems.length === 0).length;

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-ink-900 dark:text-white">
            SEO insights
          </h1>
          <p className="mt-0.5 text-sm text-ink-500">
            {clean} of {rows.length} checked articles have no issues.
          </p>
        </div>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="adm-select w-auto">
          <option value="published">Published</option>
          <option value="draft">Drafts</option>
          <option value="all">All statuses</option>
        </select>
      </header>

      <SectionCard
        title="Article audit"
        description="Checks titles, descriptions, keywords, images, alt text, tags and robots."
      >
        {list.isLoading ? (
          <LoadingBlock />
        ) : list.isError ? (
          <ErrorBlock error={list.error} onRetry={() => void list.refetch()} />
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Article</th>
                  <th>Status</th>
                  <th>Score</th>
                  <th>Issues</th>
                  <th>Published</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(({ article, problems }) => (
                  <tr key={article._id}>
                    <td className="max-w-[320px]">
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
                    <td className="whitespace-nowrap">{article.seoScore ?? 0}/100</td>
                    <td>
                      {problems.length === 0 ? (
                        <span className="adm-chip bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
                          <CheckCircle2 className="h-3 w-3" />
                          All good
                        </span>
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {problems.map((problem) => (
                            <span
                              key={problem}
                              className="adm-chip bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                            >
                              <AlertTriangle className="h-3 w-3" />
                              {problem}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="whitespace-nowrap text-ink-500">{formatDate(article.publishedDate)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>
    </div>
  );
}
