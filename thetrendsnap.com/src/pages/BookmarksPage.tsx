import { useQueries } from "@tanstack/react-query";
import { PageHeader } from "@/components/ui/PageHeader";
import { ArticleCard } from "@/components/ArticleCard";
import { CardSkeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/States";
import { useBookmarks } from "@/hooks/useBookmarks";
import { getArticle } from "@/lib/api";
import { useSeo } from "@/hooks/useSeo";

export default function BookmarksPage() {
  const { slugs } = useBookmarks();

  useSeo({
    title: "Reading List",
    description: "Articles you saved to read later.",
    robots: "noindex, nofollow",
  });

  const results = useQueries({
    queries: slugs.map((slug) => ({
      queryKey: ["article", slug],
      queryFn: () => getArticle(slug),
      staleTime: 5 * 60 * 1000,
      retry: false,
    })),
  });

  const loading = results.some((result) => result.isLoading);
  const articles = results.map((result) => result.data).filter(Boolean);

  return (
    <>
      <PageHeader
        eyebrow="Saved"
        title="Your Reading List"
        description="Stories you bookmarked, stored privately in this browser."
        breadcrumbs={[{ label: "Reading list" }]}
      />

      <div className="container py-8">
        {slugs.length === 0 ? (
          <EmptyState
            title="Nothing saved yet"
            message="Tap Save on any article and it will show up here."
          />
        ) : loading ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {slugs.map((slug) => (
              <CardSkeleton key={slug} />
            ))}
          </div>
        ) : articles.length === 0 ? (
          <EmptyState
            title="Saved stories are unavailable"
            message="The articles you saved are no longer published."
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {articles.map((article) => article && <ArticleCard key={article._id} article={article} />)}
          </div>
        )}
      </div>
    </>
  );
}
