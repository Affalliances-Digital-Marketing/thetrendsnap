import { Fragment, useEffect, useState } from "react";
import type { ReactNode } from "react";
import { AdSlot } from "@/components/ads/AdSlot";
import { ArticleCard } from "@/components/ArticleCard";
import { Pagination } from "@/components/ui/Bits";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState, ErrorState } from "@/components/ui/States";
import { useArticles } from "@/hooks/useContent";
import type { AdPosition, NewsListQuery } from "@/types/api";
import { cn } from "@/lib/utils";

const SORTS: Array<{ value: NonNullable<NewsListQuery["sort"]>; label: string }> = [
  { value: "latest", label: "Latest" },
  { value: "popular", label: "Most read" },
  { value: "oldest", label: "Oldest" },
  { value: "title", label: "A–Z" },
];

/**
 * Paginated grid shared by every listing route. The in-feed ad sits between
 * rows, so removing it leaves a perfectly even grid.
 */
export function ArticleFeed({
  query,
  showSort = true,
  header,
  emptyTitle,
  emptyMessage,
  adPosition = "home-infeed",
  perPage = 12,
  columns = "sm:grid-cols-2 lg:grid-cols-3",
}: {
  query: NewsListQuery;
  showSort?: boolean;
  header?: ReactNode;
  emptyTitle?: string;
  emptyMessage?: string;
  adPosition?: AdPosition;
  perPage?: number;
  columns?: string;
}) {
  const [page, setPage] = useState(1);
  const [sort, setSort] = useState<NonNullable<NewsListQuery["sort"]>>(query.sort || "latest");

  const serialized = JSON.stringify(query);
  // A new filter set always restarts pagination.
  useEffect(() => {
    setPage(1);
  }, [serialized]);

  const { data, isLoading, isError, isFetching, refetch } = useArticles({
    ...query,
    sort,
    page,
    limit: perPage,
  });

  const articles = data?.data ?? [];
  const pagination = data?.pagination;

  const changePage = (next: number) => {
    setPage(next);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <section>
      <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">{header}</div>

        {showSort && (
          <div className="flex items-center gap-1 rounded-xl border border-ink-200 p-1 dark:border-ink-700">
            {SORTS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setSort(option.value);
                  setPage(1);
                }}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-xs font-bold transition-colors",
                  sort === option.value
                    ? "bg-brand-600 text-white"
                    : "text-ink-500 hover:text-brand-600 dark:text-ink-400"
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {isError ? (
        <ErrorState onRetry={() => void refetch()} />
      ) : isLoading ? (
        <div className={cn("grid gap-5", columns)}>
          {Array.from({ length: perPage }).map((_, index) => (
            <CardSkeleton key={index} />
          ))}
        </div>
      ) : articles.length === 0 ? (
        <EmptyState title={emptyTitle} message={emptyMessage} />
      ) : (
        <>
          <div
            className={cn(
              "grid gap-5 transition-opacity",
              columns,
              isFetching && "opacity-60"
            )}
          >
            {articles.map((article, index) => (
              <Fragment key={article._id}>
                <ArticleCard article={article} priority={index < 3} />
                {index === 5 && articles.length > 6 && (
                  <div className="sm:col-span-2 lg:col-span-3">
                    <AdSlot position={adPosition} ratio="aspect-[970/140]" />
                  </div>
                )}
              </Fragment>
            ))}
          </div>

          {pagination && (
            <>
              <p className="mt-6 text-center text-xs text-ink-500 dark:text-ink-400">
                Showing {(pagination.page - 1) * pagination.limit + 1}–
                {Math.min(pagination.page * pagination.limit, pagination.total)} of{" "}
                {pagination.total} articles
              </p>
              <Pagination page={pagination.page} pages={pagination.pages} onChange={changePage} />
            </>
          )}
        </>
      )}
    </section>
  );
}
