import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Copy,
  Filter,
  PenSquare,
  RotateCcw,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { articlesApi, categoriesApi, tagsApi } from "@/admin/lib/api";
import type { Article, ArticleStatus } from "@/admin/types";
import {
  ConfirmDialog,
  EmptyState,
  ErrorBlock,
  Field,
  LoadingBlock,
  Modal,
  Pagination,
  SectionCard,
  formatDate,
} from "@/admin/components/ui";
import { useToast } from "@/admin/components/Toast";
import { useAuth } from "@/admin/hooks/useAuth";

const STATUSES: Array<{ value: string; label: string }> = [
  { value: "all", label: "All statuses" },
  { value: "published", label: "Published" },
  { value: "draft", label: "Draft" },
  { value: "scheduled", label: "Scheduled" },
  { value: "archived", label: "Archived" },
  { value: "trash", label: "Trash" },
];

const SORTS = [
  { value: "latest", label: "Newest first" },
  { value: "updated", label: "Recently updated" },
  { value: "oldest", label: "Oldest first" },
  { value: "popular", label: "Most viewed" },
  { value: "priority", label: "Priority" },
  { value: "title", label: "Title A–Z" },
];

const FLAGS = [
  { key: "featured", label: "Featured" },
  { key: "trending", label: "Trending" },
  { key: "popular", label: "Popular" },
  { key: "breakingNews", label: "Breaking" },
  { key: "editorsPick", label: "Editor's pick" },
  { key: "isMainTrending", label: "Home hero" },
  { key: "isSubTrending", label: "Home rail" },
  { key: "isCategoryTrending", label: "Category hero" },
  { key: "isCategorySubTrending", label: "Category rail" },
];

export default function Articles() {
  const toast = useToast();
  const { can } = useAuth();
  const queryClient = useQueryClient();
  const [params, setParams] = useSearchParams();

  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<{ ids: string[]; hard: boolean } | null>(null);
  const [bulkPanel, setBulkPanel] = useState<null | "category" | "tags" | "flags">(null);

  const filters = useMemo(
    () => ({
      search: params.get("search") || "",
      status: params.get("status") || "all",
      category: params.get("category") || "",
      tag: params.get("tag") || "",
      author: params.get("author") || "",
      sort: params.get("sort") || "latest",
      dateFrom: params.get("dateFrom") || "",
      dateTo: params.get("dateTo") || "",
    }),
    [params]
  );

  const setFilter = (key: string, value: string) => {
    const next = new URLSearchParams(params);
    if (value) next.set(key, value);
    else next.delete(key);
    setParams(next);
    setPage(1);
    setSelected([]);
  };

  const list = useQuery({
    queryKey: ["articles", { ...filters, page }],
    queryFn: () => articlesApi.list({ ...filters, page, limit: 20 }),
  });

  const categories = useQuery({
    queryKey: ["categories", "all"],
    queryFn: () => categoriesApi.list({ withCounts: true }),
  });

  const tags = useQuery({ queryKey: ["tags", "all"], queryFn: () => tagsApi.list({ limit: 200 }) });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["articles"] });
    void queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: ArticleStatus }) =>
      articlesApi.changeStatus(id, status),
    onSuccess: () => {
      toast.success("Status updated");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => articlesApi.duplicate(id),
    onSuccess: () => {
      toast.success("Article duplicated as draft");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: async ({ ids, hard }: { ids: string[]; hard: boolean }) => {
      if (hard) {
        if (ids.length === 1) return articlesApi.remove(ids[0]);
        return articlesApi.bulkDelete(ids);
      }
      if (ids.length === 1) return articlesApi.trash(ids[0]);
      return articlesApi.bulkStatus(ids, "trash");
    },
    onSuccess: (_res, vars) => {
      toast.success(vars.hard ? "Deleted permanently" : "Moved to trash");
      setConfirm(null);
      setSelected([]);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const bulkStatus = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: ArticleStatus }) =>
      articlesApi.bulkStatus(ids, status),
    onSuccess: (res) => {
      toast.success(`${res.modified} article(s) updated`);
      setSelected([]);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const items = list.data?.data ?? [];
  const pagination = list.data?.pagination;

  const allSelected = items.length > 0 && selected.length === items.length;

  const toggleAll = () =>
    setSelected(allSelected ? [] : items.map((article) => article._id));

  const toggleOne = (id: string) =>
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-ink-900 dark:text-white">
            Articles
          </h1>
          <p className="mt-0.5 text-sm text-ink-500">
            {pagination ? `${pagination.total} articles` : "Loading…"}
          </p>
        </div>
        <Link to="/admin/articles/new" className="adm-btn-primary">
          <PenSquare className="h-4 w-4" />
          New article
        </Link>
      </header>

      {/* ---------------- filters ---------------- */}
      <SectionCard title="Filters" description="Everything the backend supports.">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Search">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                value={filters.search}
                onChange={(event) => setFilter("search", event.target.value)}
                placeholder="Title, slug, body…"
                className="adm-input pl-9"
              />
            </div>
          </Field>

          <Field label="Status">
            <select
              value={filters.status}
              onChange={(event) => setFilter("status", event.target.value)}
              className="adm-select"
            >
              {STATUSES.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Category">
            <select
              value={filters.category}
              onChange={(event) => setFilter("category", event.target.value)}
              className="adm-select"
            >
              <option value="">All categories</option>
              {(categories.data ?? []).map((category) => (
                <option key={category._id} value={category._id}>
                  {category.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Tag">
            <select
              value={filters.tag}
              onChange={(event) => setFilter("tag", event.target.value)}
              className="adm-select"
            >
              <option value="">All tags</option>
              {(tags.data?.data ?? []).map((tag) => (
                <option key={tag._id} value={tag._id}>
                  {tag.name}
                </option>
              ))}
            </select>
          </Field>

          <Field label="Author">
            <input
              value={filters.author}
              onChange={(event) => setFilter("author", event.target.value)}
              placeholder="Author name"
              className="adm-input"
            />
          </Field>

          <Field label="Published from">
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(event) => setFilter("dateFrom", event.target.value)}
              className="adm-input"
            />
          </Field>

          <Field label="Published to">
            <input
              type="date"
              value={filters.dateTo}
              onChange={(event) => setFilter("dateTo", event.target.value)}
              className="adm-input"
            />
          </Field>

          <Field label="Sort">
            <select
              value={filters.sort}
              onChange={(event) => setFilter("sort", event.target.value)}
              className="adm-select"
            >
              {SORTS.map((sort) => (
                <option key={sort.value} value={sort.value}>
                  {sort.label}
                </option>
              ))}
            </select>
          </Field>
        </div>

        {[...params.keys()].length > 0 && (
          <button
            type="button"
            onClick={() => {
              setParams(new URLSearchParams());
              setPage(1);
            }}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-brand-600 hover:underline"
          >
            <X className="h-3.5 w-3.5" />
            Clear all filters
          </button>
        )}
      </SectionCard>

      {/* ---------------- bulk bar ---------------- */}
      {selected.length > 0 && (
        <div className="adm-card sticky top-16 z-30 flex flex-wrap items-center gap-2 p-3">
          <span className="text-sm font-bold text-ink-800 dark:text-ink-100">
            {selected.length} selected
          </span>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <select
              className="adm-select h-8 w-auto text-xs"
              defaultValue=""
              onChange={(event) => {
                const status = event.target.value as ArticleStatus;
                if (status) bulkStatus.mutate({ ids: selected, status });
                event.target.value = "";
              }}
            >
              <option value="">Set status…</option>
              <option value="published">Published</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
              <option value="trash">Trash</option>
            </select>

            <button type="button" className="adm-btn-ghost adm-btn-sm" onClick={() => setBulkPanel("category")}>
              <Filter className="h-3.5 w-3.5" />
              Category
            </button>
            <button type="button" className="adm-btn-ghost adm-btn-sm" onClick={() => setBulkPanel("tags")}>
              Tags
            </button>
            <button type="button" className="adm-btn-ghost adm-btn-sm" onClick={() => setBulkPanel("flags")}>
              Flags
            </button>

            {can("canDelete") && (
              <button
                type="button"
                className="adm-btn-danger adm-btn-sm"
                onClick={() => setConfirm({ ids: selected, hard: false })}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Trash
              </button>
            )}

            <button type="button" className="adm-btn-ghost adm-btn-sm" onClick={() => setSelected([])}>
              Clear
            </button>
          </div>
        </div>
      )}

      {/* ---------------- table ---------------- */}
      <div className="adm-card p-0">
        {list.isLoading ? (
          <LoadingBlock label="Loading articles…" />
        ) : list.isError ? (
          <div className="p-4">
            <ErrorBlock error={list.error} onRetry={() => void list.refetch()} />
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="No articles match these filters"
            message="Try clearing the filters or create a new article."
            action={
              <Link to="/admin/articles/new" className="adm-btn-primary mt-2">
                New article
              </Link>
            }
          />
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th className="w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      className="h-4 w-4 accent-brand-600"
                      aria-label="Select all"
                    />
                  </th>
                  <th>Article</th>
                  <th>Category</th>
                  <th>Status</th>
                  <th>Flags</th>
                  <th>Views</th>
                  <th>Published</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {items.map((article) => (
                  <ArticleRow
                    key={article._id}
                    article={article}
                    checked={selected.includes(article._id)}
                    onToggle={() => toggleOne(article._id)}
                    onStatus={(status) => statusMutation.mutate({ id: article._id, status })}
                    onDuplicate={() => duplicateMutation.mutate(article._id)}
                    onTrash={() => setConfirm({ ids: [article._id], hard: false })}
                    onDelete={() => setConfirm({ ids: [article._id], hard: true })}
                    canDelete={can("canDelete")}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && (
          <div className="px-4 pb-4">
            <Pagination
              page={pagination.page}
              pages={pagination.pages}
              total={pagination.total}
              onChange={(next) => {
                setPage(next);
                setSelected([]);
                window.scrollTo({ top: 0, behavior: "smooth" });
              }}
            />
          </div>
        )}
      </div>

      <BulkPanels
        panel={bulkPanel}
        ids={selected}
        onClose={() => setBulkPanel(null)}
        onDone={() => {
          setBulkPanel(null);
          setSelected([]);
          invalidate();
        }}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        title={confirm?.hard ? "Delete permanently" : "Move to trash"}
        message={
          confirm?.hard
            ? `This permanently removes ${confirm.ids.length} article(s). This cannot be undone.`
            : `Move ${confirm?.ids.length ?? 0} article(s) to trash? You can restore them later.`
        }
        confirmLabel={confirm?.hard ? "Delete forever" : "Move to trash"}
        busy={deleteMutation.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && deleteMutation.mutate(confirm)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function ArticleRow({
  article,
  checked,
  onToggle,
  onStatus,
  onDuplicate,
  onTrash,
  onDelete,
  canDelete,
}: {
  article: Article;
  checked: boolean;
  onToggle: () => void;
  onStatus: (status: ArticleStatus) => void;
  onDuplicate: () => void;
  onTrash: () => void;
  onDelete: () => void;
  canDelete: boolean;
}) {
  const category = typeof article.category === "string" ? null : article.category;

  const flags = FLAGS.filter(({ key }) => Boolean((article as unknown as Record<string, unknown>)[key]));

  return (
    <tr>
      <td>
        <input
          type="checkbox"
          checked={checked}
          onChange={onToggle}
          className="h-4 w-4 accent-brand-600"
          aria-label={`Select ${article.title}`}
        />
      </td>

      <td className="max-w-[380px]">
        <div className="flex items-center gap-2.5">
          {article.featuredImage?.url && (
            <img
              src={article.featuredImage.thumbnailUrl || article.featuredImage.url}
              alt=""
              className="h-10 w-10 shrink-0 rounded-lg object-cover"
              loading="lazy"
            />
          )}
          <div className="min-w-0">
            <Link
              to={`/admin/articles/${article._id}/edit`}
              className="clamp-1 font-semibold text-ink-800 hover:text-brand-600 dark:text-ink-100"
            >
              {article.title}
            </Link>
            <p className="clamp-1 text-[11px] text-ink-400">/{article.slug}</p>
          </div>
        </div>
      </td>

      <td className="whitespace-nowrap text-ink-600 dark:text-ink-300">{category?.name || "—"}</td>

      <td>
        <select
          value={article.status || "draft"}
          onChange={(event) => onStatus(event.target.value as ArticleStatus)}
          className="adm-select h-8 w-auto text-xs"
        >
          <option value="published">Published</option>
          <option value="draft">Draft</option>
          <option value="scheduled">Scheduled</option>
          <option value="archived">Archived</option>
          <option value="trash">Trash</option>
        </select>
      </td>

      <td>
        <div className="flex max-w-[180px] flex-wrap gap-1">
          {flags.length === 0 ? (
            <span className="text-xs text-ink-400">—</span>
          ) : (
            flags.map((flag) => (
              <span
                key={flag.key}
                className="adm-chip bg-brand-50 text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
              >
                {flag.label}
              </span>
            ))
          )}
        </div>
      </td>

      <td className="text-ink-500">{article.views ?? 0}</td>

      <td className="whitespace-nowrap text-ink-500">
        {formatDate(article.publishedDate || article.createdAt)}
      </td>

      <td>
        <div className="flex items-center justify-end gap-1">
          <Link to={`/admin/articles/${article._id}/edit`} className="adm-btn-ghost adm-btn-sm" title="Edit">
            <PenSquare className="h-3.5 w-3.5" />
          </Link>
          <button type="button" onClick={onDuplicate} className="adm-btn-ghost adm-btn-sm" title="Duplicate">
            <Copy className="h-3.5 w-3.5" />
          </button>
          {article.status === "trash" || article.deletedAt ? (
            <button type="button" onClick={() => onStatus("draft")} className="adm-btn-ghost adm-btn-sm" title="Restore">
              <RotateCcw className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button type="button" onClick={onTrash} className="adm-btn-ghost adm-btn-sm" title="Move to trash">
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="adm-btn-ghost adm-btn-sm text-rose-600"
              title="Delete permanently"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

/* ------------------------------------------------------------------ */

function BulkPanels({
  panel,
  ids,
  onClose,
  onDone,
}: {
  panel: null | "category" | "tags" | "flags";
  ids: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const toast = useToast();
  const categories = useQuery({ queryKey: ["categories", "all"], queryFn: () => categoriesApi.list({}) });

  const [category, setCategory] = useState("");
  const [subCategory, setSubCategory] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tagMode, setTagMode] = useState<"add" | "replace" | "remove">("add");
  const [flags, setFlags] = useState<Record<string, boolean>>({});

  const run = useMutation({
    mutationFn: async () => {
      if (panel === "category") return articlesApi.bulkCategory(ids, category || undefined, subCategory || null);
      if (panel === "tags")
        return articlesApi.bulkTags(
          ids,
          tagInput.split(",").map((t) => t.trim()).filter(Boolean),
          tagMode
        );
      return articlesApi.bulkFlags(ids, flags);
    },
    onSuccess: (res) => {
      toast.success(`${res.modified} article(s) updated`);
      onDone();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const title =
    panel === "category" ? "Move to category" : panel === "tags" ? "Update tags" : "Toggle flags";

  return (
    <Modal
      open={Boolean(panel)}
      title={`${title} · ${ids.length} article(s)`}
      onClose={onClose}
      footer={
        <>
          <button type="button" className="adm-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button type="button" className="adm-btn-primary" onClick={() => run.mutate()} disabled={run.isPending}>
            Apply
          </button>
        </>
      }
    >
      {panel === "category" && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Category">
            <select value={category} onChange={(event) => setCategory(event.target.value)} className="adm-select">
              <option value="">Leave unchanged</option>
              {(categories.data ?? []).map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Sub category">
            <select
              value={subCategory}
              onChange={(event) => setSubCategory(event.target.value)}
              className="adm-select"
            >
              <option value="">Clear sub category</option>
              {(categories.data ?? []).map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
            </select>
          </Field>
        </div>
      )}

      {panel === "tags" && (
        <div className="space-y-3">
          <Field label="Tags" hint="Comma separated. Names that don't exist are created.">
            <input
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              placeholder="travel, hotels, budget"
              className="adm-input"
            />
          </Field>
          <Field label="Mode">
            <select
              value={tagMode}
              onChange={(event) => setTagMode(event.target.value as typeof tagMode)}
              className="adm-select"
            >
              <option value="add">Add to existing</option>
              <option value="replace">Replace all</option>
              <option value="remove">Remove these</option>
            </select>
          </Field>
        </div>
      )}

      {panel === "flags" && (
        <div className="grid gap-2 sm:grid-cols-2">
          {FLAGS.map((flag) => (
            <label
              key={flag.key}
              className="flex items-center justify-between gap-3 rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700"
            >
              <span className="font-semibold text-ink-700 dark:text-ink-200">{flag.label}</span>
              <select
                value={flags[flag.key] === undefined ? "" : String(flags[flag.key])}
                onChange={(event) => {
                  const value = event.target.value;
                  setFlags((prev) => {
                    const next = { ...prev };
                    if (value === "") delete next[flag.key];
                    else next[flag.key] = value === "true";
                    return next;
                  });
                }}
                className="adm-select h-8 w-28 text-xs"
              >
                <option value="">Unchanged</option>
                <option value="true">On</option>
                <option value="false">Off</option>
              </select>
            </label>
          ))}
        </div>
      )}
    </Modal>
  );
}
