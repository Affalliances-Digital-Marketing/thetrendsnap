import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Search } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { ArticleFeed } from "@/components/ArticleFeed";
import { EmptyState } from "@/components/ui/States";
import { useSeo } from "@/hooks/useSeo";

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const query = params.get("q") || "";
  const [term, setTerm] = useState(query);

  useEffect(() => setTerm(query), [query]);

  useSeo({
    title: query ? `Search: ${query}` : "Search",
    description: `Search results for ${query || "articles"} on TheTrendSnap.`,
    robots: "noindex, follow",
  });

  return (
    <>
      <PageHeader
        eyebrow="Search"
        title={query ? `Results for “${query}”` : "Search articles"}
        description="Find news, reviews and guides across every category."
        breadcrumbs={[{ label: "Search" }]}
      >
        <form
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            setParams(term.trim() ? { q: term.trim() } : {});
          }}
          className="mt-5 flex max-w-xl gap-2"
        >
          <label className="sr-only" htmlFor="search-page-input">
            Search articles
          </label>
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" aria-hidden="true" />
            <input
              id="search-page-input"
              type="search"
              value={term}
              onChange={(event) => setTerm(event.target.value)}
              placeholder="Search articles, reviews, guides..."
              className="h-11 w-full rounded-xl border border-ink-200 bg-white pl-10 pr-4 text-sm outline-none transition-colors focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
            />
          </div>
          <button
            type="submit"
            className="h-11 rounded-xl bg-brand-600 px-5 text-sm font-bold text-white transition-colors hover:bg-brand-700"
          >
            Search
          </button>
        </form>
      </PageHeader>

      <div className="container py-8">
        {query ? (
          <ArticleFeed
            query={{ search: query }}
            emptyTitle={`No results for “${query}”`}
            emptyMessage="Try a different keyword, or browse the latest articles."
          />
        ) : (
          <EmptyState
            title="Start typing to search"
            message="Search across every article, review and guide we publish."
          />
        )}
      </div>
    </>
  );
}
