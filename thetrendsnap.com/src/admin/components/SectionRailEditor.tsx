import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Plus, Search, X } from "lucide-react";
import type { Article, HomepageRail } from "@/admin/types";
import { Field, SectionCard, Toggle } from "@/admin/components/ui";
import { cn } from "@/lib/utils";

const idOf = (value: Article | string | undefined): string =>
  typeof value === "string" ? value : (value?._id ?? "");

const titleOf = (value: Article | string, pool: Article[]): string => {
  if (value && typeof value === "object") return value.title || "Untitled";
  return pool.find((article) => article._id === value)?.title || "(story not in the recent list)";
};

const imageOf = (value: Article | string, pool: Article[]): string => {
  const article = value && typeof value === "object" ? value : pool.find((a) => a._id === value);
  return article?.featuredImage?.url || "";
};

/**
 * One homepage rail.
 *
 * Auto is the default and means "whatever the live feed puts here", which is
 * how every section behaved before this panel existed. Manual pins the chosen
 * stories in order; any slot left empty is still filled from the feed, so a
 * half-curated rail never renders as half a row.
 */
export function SectionRailEditor({
  title,
  description,
  slots,
  value,
  articles,
  onChange,
}: {
  title: string;
  description: string;
  /** How many stories the section shows on the page. */
  slots: number;
  value: HomepageRail | undefined;
  articles: Article[];
  onChange: (next: HomepageRail) => void;
}) {
  const [query, setQuery] = useState("");

  const rail: HomepageRail = {
    enabled: value?.enabled !== false,
    mode: value?.mode === "manual" ? "manual" : "auto",
    items: value?.items || [],
  };

  const items = rail.items || [];
  const chosen = new Set(items.map(idOf));

  const patch = (next: Partial<HomepageRail>) => onChange({ ...rail, ...next });

  const move = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const list = [...items];
    [list[index], list[target]] = [list[target], list[index]];
    patch({ items: list });
  };

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    return articles
      .filter((article) => !chosen.has(article._id))
      .filter((article) => !term || article.title?.toLowerCase().includes(term))
      .slice(0, 8);
    // `chosen` is derived from items, which is part of the dependency below.
  }, [articles, query, items]);

  const full = items.length >= slots;

  return (
    <SectionCard
      title={title}
      description={description}
      actions={
        <div className="flex items-center gap-2">
          <span className="adm-chip bg-ink-100 dark:bg-ink-800">
            {items.length}/{slots} chosen
          </span>
          <select
            value={rail.mode}
            onChange={(event) => patch({ mode: event.target.value as HomepageRail["mode"] })}
            className="adm-select w-auto"
            aria-label={`${title} source`}
          >
            <option value="auto">Automatic</option>
            <option value="manual">Hand-picked</option>
          </select>
        </div>
      }
    >
      <Toggle
        checked={rail.enabled !== false}
        onChange={(enabled) => patch({ enabled })}
        label="Show this section on the homepage"
        hint="Turned off, the section disappears and the row closes up around it."
      />

      {rail.enabled !== false && rail.mode === "manual" && (
        <div className="mt-4 space-y-3">
          {/* ---------------- chosen ---------------- */}
          {items.length === 0 ? (
            <p className="rounded-lg border border-dashed border-ink-200 px-3 py-4 text-sm text-ink-500 dark:border-ink-700">
              Nothing pinned yet — the section is filled from the live feed until you add a story.
            </p>
          ) : (
            <ol className="space-y-2">
              {items.map((item, index) => (
                <li
                  key={idOf(item) || index}
                  className="flex items-center gap-2 rounded-lg border border-ink-200 p-2 dark:border-ink-700"
                >
                  <span className="w-5 shrink-0 text-center text-xs font-bold text-ink-400">
                    {index + 1}
                  </span>

                  {imageOf(item, articles) ? (
                    <img
                      src={imageOf(item, articles)}
                      alt=""
                      className="h-9 w-14 shrink-0 rounded object-cover"
                    />
                  ) : (
                    <span className="h-9 w-14 shrink-0 rounded bg-ink-100 dark:bg-ink-800" />
                  )}

                  <p className="clamp-1 min-w-0 flex-1 text-[13px] font-semibold text-ink-800 dark:text-ink-100">
                    {titleOf(item, articles)}
                  </p>

                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      type="button"
                      className="adm-btn-ghost adm-btn-sm"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      aria-label="Move up"
                    >
                      <ArrowUp className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="adm-btn-ghost adm-btn-sm"
                      onClick={() => move(index, 1)}
                      disabled={index === items.length - 1}
                      aria-label="Move down"
                    >
                      <ArrowDown className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      className="adm-btn-ghost adm-btn-sm text-rose-600"
                      onClick={() => patch({ items: items.filter((_, i) => i !== index) })}
                      aria-label="Remove"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </li>
              ))}
            </ol>
          )}

          {/* ---------------- picker ---------------- */}
          <Field
            label="Add a story"
            hint={
              full
                ? `This section shows ${slots}. Remove one before adding another.`
                : "Type to filter the most recent articles."
            }
          >
            <div className="relative">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400"
                aria-hidden="true"
              />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search articles…"
                className="adm-input pl-9"
                disabled={full}
              />
            </div>
          </Field>

          {!full && (
            <ul className="max-h-64 space-y-1 overflow-y-auto">
              {results.length === 0 ? (
                <li className="px-1 py-2 text-sm text-ink-500">No matching articles.</li>
              ) : (
                results.map((article) => (
                  <li key={article._id}>
                    <button
                      type="button"
                      onClick={() => {
                        patch({ items: [...items, article._id] });
                        setQuery("");
                      }}
                      className={cn(
                        "flex w-full items-center gap-2 rounded-lg border border-transparent p-2 text-left transition-colors",
                        "hover:border-brand-300 hover:bg-brand-50 dark:hover:border-brand-500/40 dark:hover:bg-brand-500/10"
                      )}
                    >
                      {article.featuredImage?.url ? (
                        <img
                          src={article.featuredImage.url}
                          alt=""
                          className="h-8 w-12 shrink-0 rounded object-cover"
                        />
                      ) : (
                        <span className="h-8 w-12 shrink-0 rounded bg-ink-100 dark:bg-ink-800" />
                      )}
                      <span className="clamp-1 min-w-0 flex-1 text-[13px] text-ink-700 dark:text-ink-200">
                        {article.title}
                      </span>
                      <Plus className="h-3.5 w-3.5 shrink-0 text-brand-600" aria-hidden="true" />
                    </button>
                  </li>
                ))
              )}
            </ul>
          )}
        </div>
      )}

      {rail.enabled !== false && rail.mode === "auto" && (
        <p className="mt-3 text-sm text-ink-500">
          Filled from the live feed — the article flags (Featured, Editor&apos;s pick, Trending…)
          decide what appears here. Switch to <strong>Hand-picked</strong> to choose the stories
          yourself; anything already chosen is kept.
        </p>
      )}
    </SectionCard>
  );
}
