import { useQuery } from "@tanstack/react-query";
import {
  backfillFeed,
  getArticle,
  getCategories,
  getCategory,
  getHomeFeed,
  getHomepageConfig,
  getRelatedArticles,
  getTags,
  listArticles,
  searchArticles,
  serveAds,
} from "@/lib/api";
import type { AdPosition, NewsListQuery } from "@/types/api";

const FIVE_MIN = 5 * 60 * 1000;

export function useHomeFeed() {
  return useQuery({
    queryKey: ["home-feed"],
    queryFn: async () => backfillFeed(await getHomeFeed()),
    staleTime: FIVE_MIN,
  });
}

/** Editor-curated homepage settings; never rejects, so it cannot blank a section. */
export function useHomepageConfig() {
  return useQuery({
    queryKey: ["homepage-config"],
    queryFn: getHomepageConfig,
    staleTime: FIVE_MIN,
    retry: false,
  });
}

export function useArticles(query: NewsListQuery, enabled = true) {
  return useQuery({
    queryKey: ["articles", query],
    queryFn: () => listArticles(query),
    staleTime: FIVE_MIN,
    enabled,
    placeholderData: (prev) => prev, // keeps the grid steady while paging
  });
}

export function useArticle(slug?: string) {
  return useQuery({
    queryKey: ["article", slug],
    queryFn: () => getArticle(slug as string),
    enabled: Boolean(slug),
    staleTime: FIVE_MIN,
    retry: (failureCount, error) => {
      const status = (error as { status?: number }).status;
      return status !== 404 && failureCount < 2;
    },
  });
}

export function useRelated(slug?: string, limit = 6) {
  return useQuery({
    queryKey: ["related", slug, limit],
    queryFn: () => getRelatedArticles(slug as string, limit),
    enabled: Boolean(slug),
    staleTime: FIVE_MIN,
  });
}

export function useCategories(opts: { withCounts?: boolean; withCover?: boolean } = {}) {
  return useQuery({
    queryKey: ["categories", opts],
    queryFn: () => getCategories(opts),
    staleTime: 30 * 60 * 1000, // taxonomy barely changes
  });
}

export function useCategory(slug?: string) {
  return useQuery({
    queryKey: ["category", slug],
    queryFn: () => getCategory(slug as string),
    enabled: Boolean(slug),
    staleTime: 30 * 60 * 1000,
  });
}

export function useTags(limit = 20) {
  return useQuery({
    queryKey: ["tags", limit],
    queryFn: () => getTags({ limit, sort: "popular" }),
    staleTime: 30 * 60 * 1000,
  });
}

export function useSearch(term: string, limit = 8) {
  return useQuery({
    queryKey: ["search", term, limit],
    queryFn: () => searchArticles(term, limit),
    enabled: term.trim().length > 1,
    staleTime: 60 * 1000,
  });
}

export function useAds(
  position: AdPosition,
  device: string,
  category?: string,
  enabled = true
) {
  return useQuery({
    queryKey: ["ads", position, device, category],
    queryFn: () => serveAds(position, { device: device as "desktop", category }),
    staleTime: FIVE_MIN,
    retry: false,
    enabled,
  });
}
