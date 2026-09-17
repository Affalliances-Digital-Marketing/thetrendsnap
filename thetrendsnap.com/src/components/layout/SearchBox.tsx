import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Clock3, Loader2, Search, TrendingUp, X } from "lucide-react";
import { useCategories, useSearch } from "@/hooks/useContent";
import { SmartImage } from "@/components/ui/SmartImage";
import { articleHref, articleImage, categoryName, cn, formatDate, readTimeOf } from "@/lib/utils";

const RECENT_KEY = "tts-recent-searches";
const MAX_RECENT = 5;

function readRecent(): string[] {
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    return Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === "string") : [];
  } catch {
    return [];
  }
}

function pushRecent(term: string) {
  const next = [term, ...readRecent().filter((t) => t.toLowerCase() !== term.toLowerCase())].slice(
    0,
    MAX_RECENT
  );
  window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
}

/**
 * Site search: debounced typeahead with keyboard navigation, recent searches
 * and category shortcuts when the field is still empty.
 */
export function SearchBox({
  className,
  autoFocus = false,
  onDone,
  placeholder = "Search articles, reviews, guides…",
  size = "md",
}: {
  className?: string;
  autoFocus?: boolean;
  onDone?: () => void;
  placeholder?: string;
  size?: "md" | "lg";
}) {
  const [term, setTerm] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);

  const navigate = useNavigate();
  const boxRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);
  const listId = useId();

  const { data: results = [], isFetching } = useSearch(debounced, 5);
  const { data: categories = [] } = useCategories();

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(term.trim()), 260);
    return () => clearTimeout(timer);
  }, [term]);

  useEffect(() => setRecent(readRecent()), [open]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      if (!boxRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  // Native listener as well as the React handler: focus arriving by Tab (or
  // programmatically) must open the suggestions just like a click does.
  useEffect(() => {
    const input = inputRef.current;
    if (!input) return undefined;
    const onFocus = () => setOpen(true);
    input.addEventListener("focus", onFocus);
    return () => input.removeEventListener("focus", onFocus);
  }, []);

  // ⌘K / Ctrl+K focuses search from anywhere on the page.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        inputRef.current?.focus();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = useCallback(
    (path: string, remember?: string) => {
      if (remember) pushRecent(remember);
      setOpen(false);
      setTerm("");
      setCursor(-1);
      onDone?.();
      navigate(path);
    },
    [navigate, onDone]
  );

  const submit = () => {
    const value = term.trim();
    if (!value) return;
    go(`/search?q=${encodeURIComponent(value)}`, value);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Escape") {
      setOpen(false);
      inputRef.current?.blur();
      return;
    }
    if (!results.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setCursor((prev) => (prev + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setCursor((prev) => (prev <= 0 ? results.length - 1 : prev - 1));
    } else if (event.key === "Enter" && cursor >= 0) {
      event.preventDefault();
      go(articleHref(results[cursor]), term.trim());
    }
  };

  const shortcuts = useMemo(() => categories.slice(0, 4), [categories]);
  const showResults = debounced.length > 1;
  const height = size === "lg" ? "h-11" : "h-10";

  return (
    <div ref={boxRef} className={cn("relative", className)}>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          submit();
        }}
      >
        <label className="sr-only" htmlFor={listId}>
          Search articles
        </label>

        <div
          className={cn(
            "flex items-center gap-2 rounded-lg border border-ink-200 bg-ink-50 px-2.5 transition-all duration-200",
            "focus-within:border-brand-500 focus-within:bg-white focus-within:shadow-[0_0_0_4px_rgba(79,70,229,.12)]",
            "dark:border-ink-700 dark:bg-ink-800/70 dark:focus-within:bg-ink-900",
            height
          )}
        >
          <Search className="h-3.5 w-3.5 shrink-0 text-ink-400" aria-hidden="true" />

          <input
            id={listId}
            ref={inputRef}
            type="search"
            value={term}
            autoFocus={autoFocus}
            autoComplete="off"
            onChange={(event) => {
              setTerm(event.target.value);
              setCursor(-1);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onClick={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder={placeholder}
            className="min-w-0 flex-1 bg-transparent text-[13px] text-ink-900 outline-none placeholder:text-ink-400 dark:text-white [&::-webkit-search-cancel-button]:hidden"
          />

          {term ? (
            <button
              type="button"
              onMouseDown={(event) => event.preventDefault()} // keep focus off the blur path
              onClick={() => {
                // One tap clears the field and dismisses the suggestions.
                setTerm("");
                setDebounced("");
                setCursor(-1);
                setOpen(false);
                inputRef.current?.blur();
              }}
              className="rounded-md p-1 text-ink-400 transition-colors hover:text-ink-600 dark:hover:text-ink-200"
              aria-label="Close suggestions"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" />
            </button>
          ) : (
            <kbd className="hidden shrink-0 rounded border border-ink-200 bg-white px-1.5 py-0.5 font-sans text-xs font-semibold text-ink-400 lg:block dark:border-ink-700 dark:bg-ink-900">
              ⌘K
            </kbd>
          )}
        </div>
      </form>

      {open && (
        <div className="absolute right-0 top-[calc(100%+6px)] z-50 w-[min(360px,88vw)] overflow-hidden rounded-xl border border-ink-200 bg-white shadow-pop dark:border-ink-700 dark:bg-ink-900">
          {showResults ? (
            isFetching && !results.length ? (
              <p className="flex items-center gap-2 px-4 py-4 text-sm text-ink-500">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Searching…
              </p>
            ) : results.length ? (
              <>
                <ul className="max-h-[46vh] divide-y divide-ink-100 overflow-y-auto dark:divide-ink-800">
                  {results.map((article, index) => (
                    <li key={article._id}>
                      <button
                        type="button"
                        onMouseEnter={() => setCursor(index)}
                        onClick={() => go(articleHref(article), debounced)}
                        className={cn(
                          "flex w-full items-start gap-2.5 px-2.5 py-2 text-left transition-colors",
                          index === cursor
                            ? "bg-brand-50 dark:bg-brand-500/10"
                            : "hover:bg-ink-50 dark:hover:bg-ink-800/60"
                        )}
                      >
                        <SmartImage
                          src={articleImage(article)}
                          alt=""
                          ratio="aspect-square"
                          rounded="rounded-md"
                          width={140}
                          className="w-10 shrink-0"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="clamp-2 block text-[13px] font-semibold leading-snug text-ink-900 dark:text-white">
                            {article.title}
                          </span>
                          <span className="mt-0.5 flex flex-wrap items-center gap-1.5 text-xs text-ink-500">
                            <span className="font-bold text-brand-600 dark:text-brand-400">
                              {categoryName(article)}
                            </span>
                            <span aria-hidden="true">•</span>
                            {formatDate(article.publishedDate || article.createdAt)}
                            <span aria-hidden="true">•</span>
                            {readTimeOf(article)} min
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>

                <button
                  type="button"
                  onClick={submit}
                  className="flex w-full items-center justify-center gap-1.5 border-t border-ink-100 bg-ink-50 px-4 py-2.5 text-xs font-bold text-brand-600 transition-colors hover:bg-ink-100 dark:border-ink-800 dark:bg-ink-800/60 dark:text-brand-400"
                >
                  See all results for “{debounced}”
                  <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                </button>
              </>
            ) : (
              <p className="px-4 py-4 text-sm text-ink-500">
                No articles match “{debounced}”.
              </p>
            )
          ) : (
            <div className="p-2.5">
              {recent.length > 0 && (
                <div className="mb-3">
                  <p className="mb-1.5 flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wider text-ink-400">
                    <Clock3 className="h-3 w-3" aria-hidden="true" />
                    Recent
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {recent.map((entry) => (
                      <button
                        key={entry}
                        type="button"
                        onClick={() => go(`/search?q=${encodeURIComponent(entry)}`, entry)}
                        className="rounded-lg bg-ink-100 px-2.5 py-1 text-xs font-semibold text-ink-600 transition-colors hover:bg-ink-200 dark:bg-ink-800 dark:text-ink-300 dark:hover:bg-ink-700"
                      >
                        {entry}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p className="mb-1.5 flex items-center gap-1.5 px-1 text-xs font-bold uppercase tracking-wider text-ink-400">
                <TrendingUp className="h-3 w-3" aria-hidden="true" />
                Popular sections
              </p>
              <div className="flex flex-wrap gap-1.5">
                {shortcuts.map((category) => (
                  <button
                    key={category._id}
                    type="button"
                    onClick={() => go(`/category/${category.slug}`)}
                    className="rounded-lg bg-brand-50 px-2.5 py-1 text-xs font-semibold text-brand-700 transition-colors hover:bg-brand-100 dark:bg-brand-500/10 dark:text-brand-300 dark:hover:bg-brand-500/20"
                  >
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
