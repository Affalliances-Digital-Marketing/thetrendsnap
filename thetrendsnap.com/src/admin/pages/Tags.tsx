import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Merge, PenSquare, Plus, RefreshCw, Search, Trash2 } from "lucide-react";
import { tagsApi } from "@/admin/lib/api";
import type { Tag } from "@/admin/types";
import {
  ConfirmDialog,
  ErrorBlock,
  Field,
  LoadingBlock,
  Modal,
  SectionCard,
  Spinner,
  Toggle,
  formatDate,
} from "@/admin/components/ui";
import { useToast } from "@/admin/components/Toast";
import { useAuth } from "@/admin/hooks/useAuth";

const BLANK: Partial<Tag> = {
  name: "",
  slug: "",
  description: "",
  seoTitle: "",
  seoDescription: "",
  focusKeyword: "",
  featured: false,
  status: "active",
};

export default function Tags() {
  const toast = useToast();
  const { can } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("popular");
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<Partial<Tag> | null>(null);
  const [merging, setMerging] = useState(false);
  const [mergeTarget, setMergeTarget] = useState("");
  const [confirm, setConfirm] = useState<{ ids: string[] } | null>(null);

  const list = useQuery({
    queryKey: ["tags", { search, sort }],
    queryFn: () => tagsApi.list({ search, sort, limit: 200, status: "all" }),
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["tags"] });

  const save = useMutation({
    mutationFn: (payload: Partial<Tag>) =>
      payload._id ? tagsApi.update(payload._id, payload) : tagsApi.create(payload),
    onSuccess: () => {
      toast.success("Tag saved");
      setEditing(null);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const recount = useMutation({
    mutationFn: () => tagsApi.recount(),
    onSuccess: () => {
      toast.success("Usage counts rebuilt");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const merge = useMutation({
    mutationFn: () => tagsApi.merge(selected.filter((id) => id !== mergeTarget), mergeTarget),
    onSuccess: () => {
      toast.success("Tags merged");
      setMerging(false);
      setSelected([]);
      setMergeTarget("");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (ids: string[]) =>
      ids.length === 1 ? tagsApi.remove(ids[0]) : tagsApi.bulkDelete(ids),
    onSuccess: () => {
      toast.success("Tag(s) deleted");
      setConfirm(null);
      setSelected([]);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const tags = list.data?.data ?? [];
  const allSelected = tags.length > 0 && selected.length === tags.length;

  const selectedTags = useMemo(
    () => tags.filter((tag) => selected.includes(tag._id)),
    [tags, selected]
  );

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-ink-900 dark:text-white">Tags</h1>
          <p className="mt-0.5 text-sm text-ink-500">
            {list.data?.pagination?.total ?? 0} tags
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="adm-btn-ghost"
            onClick={() => recount.mutate()}
            disabled={recount.isPending}
          >
            {recount.isPending ? <Spinner /> : <RefreshCw className="h-4 w-4" />}
            Rebuild counts
          </button>
          <button type="button" className="adm-btn-primary" onClick={() => setEditing({ ...BLANK })}>
            <Plus className="h-4 w-4" />
            New tag
          </button>
        </div>
      </header>

      <SectionCard title="Find tags">
        <div className="grid gap-3 sm:grid-cols-[1fr_200px]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search tags…"
              className="adm-input pl-9"
            />
          </div>
          <select value={sort} onChange={(event) => setSort(event.target.value)} className="adm-select">
            <option value="popular">Most used</option>
            <option value="name">Name A–Z</option>
            <option value="latest">Newest</option>
          </select>
        </div>
      </SectionCard>

      {selected.length > 0 && (
        <div className="adm-card flex flex-wrap items-center gap-2 p-3">
          <span className="text-sm font-bold">{selected.length} selected</span>
          <div className="ml-auto flex gap-2">
            <button
              type="button"
              className="adm-btn-ghost adm-btn-sm"
              disabled={selected.length < 2}
              onClick={() => {
                setMergeTarget(selected[0]);
                setMerging(true);
              }}
            >
              <Merge className="h-3.5 w-3.5" />
              Merge
            </button>
            {can("canDelete") && (
              <button
                type="button"
                className="adm-btn-danger adm-btn-sm"
                onClick={() => setConfirm({ ids: selected })}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            )}
            <button type="button" className="adm-btn-ghost adm-btn-sm" onClick={() => setSelected([])}>
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="adm-card p-0">
        {list.isLoading ? (
          <LoadingBlock />
        ) : list.isError ? (
          <div className="p-4">
            <ErrorBlock error={list.error} onRetry={() => void list.refetch()} />
          </div>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th className="w-8">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={() => setSelected(allSelected ? [] : tags.map((tag) => tag._id))}
                      className="h-4 w-4 accent-brand-600"
                      aria-label="Select all"
                    />
                  </th>
                  <th>Tag</th>
                  <th>Articles</th>
                  <th>Status</th>
                  <th>Featured</th>
                  <th>Created</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tags.map((tag) => (
                  <tr key={tag._id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selected.includes(tag._id)}
                        onChange={() =>
                          setSelected((prev) =>
                            prev.includes(tag._id)
                              ? prev.filter((id) => id !== tag._id)
                              : [...prev, tag._id]
                          )
                        }
                        className="h-4 w-4 accent-brand-600"
                        aria-label={`Select ${tag.name}`}
                      />
                    </td>
                    <td>
                      <p className="font-semibold text-ink-800 dark:text-ink-100">{tag.name}</p>
                      <p className="text-[11px] text-ink-400">/{tag.slug}</p>
                    </td>
                    <td className="text-ink-500">{tag.usageCount ?? 0}</td>
                    <td>
                      <span
                        className={`adm-chip ${
                          tag.status === "active"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                            : "bg-ink-100 text-ink-500 dark:bg-ink-800"
                        }`}
                      >
                        {tag.status || "active"}
                      </span>
                    </td>
                    <td>{tag.featured ? "Yes" : "—"}</td>
                    <td className="whitespace-nowrap text-ink-500">{formatDate(tag.createdAt)}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button type="button" className="adm-btn-ghost adm-btn-sm" onClick={() => setEditing(tag)}>
                          <PenSquare className="h-3.5 w-3.5" />
                        </button>
                        {can("canDelete") && (
                          <button
                            type="button"
                            className="adm-btn-ghost adm-btn-sm text-rose-600"
                            onClick={() => setConfirm({ ids: [tag._id] })}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ---------------- edit modal ---------------- */}
      <Modal
        open={Boolean(editing)}
        title={editing?._id ? `Edit ${editing.name}` : "New tag"}
        onClose={() => setEditing(null)}
        footer={
          <>
            <button type="button" className="adm-btn-ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="adm-btn-primary"
              disabled={save.isPending || !editing?.name?.trim()}
              onClick={() => editing && save.mutate(editing)}
            >
              {save.isPending && <Spinner />}
              Save tag
            </button>
          </>
        }
      >
        {editing && (
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" required>
              <input
                value={editing.name || ""}
                onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                className="adm-input"
              />
            </Field>
            <Field label="Slug">
              <input
                value={editing.slug || ""}
                onChange={(event) => setEditing({ ...editing, slug: event.target.value })}
                className="adm-input"
              />
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <textarea
                rows={2}
                value={editing.description || ""}
                onChange={(event) => setEditing({ ...editing, description: event.target.value })}
                className="adm-textarea"
              />
            </Field>
            <Field label="SEO title">
              <input
                value={editing.seoTitle || ""}
                onChange={(event) => setEditing({ ...editing, seoTitle: event.target.value })}
                className="adm-input"
              />
            </Field>
            <Field label="Focus keyword">
              <input
                value={editing.focusKeyword || ""}
                onChange={(event) => setEditing({ ...editing, focusKeyword: event.target.value })}
                className="adm-input"
              />
            </Field>
            <Field label="SEO description" className="sm:col-span-2">
              <textarea
                rows={2}
                value={editing.seoDescription || ""}
                onChange={(event) => setEditing({ ...editing, seoDescription: event.target.value })}
                className="adm-textarea"
              />
            </Field>
            <Toggle
              label="Featured tag"
              checked={Boolean(editing.featured)}
              onChange={(value) => setEditing({ ...editing, featured: value })}
            />
            <Field label="Status">
              <select
                value={editing.status || "active"}
                onChange={(event) =>
                  setEditing({ ...editing, status: event.target.value as "active" | "inactive" })
                }
                className="adm-select"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
          </div>
        )}
      </Modal>

      {/* ---------------- merge modal ---------------- */}
      <Modal
        open={merging}
        title="Merge tags"
        onClose={() => setMerging(false)}
        footer={
          <>
            <button type="button" className="adm-btn-ghost" onClick={() => setMerging(false)}>
              Cancel
            </button>
            <button
              type="button"
              className="adm-btn-primary"
              disabled={merge.isPending || !mergeTarget}
              onClick={() => merge.mutate()}
            >
              {merge.isPending && <Spinner />}
              Merge into selected tag
            </button>
          </>
        }
      >
        <p className="mb-3 text-sm text-ink-600 dark:text-ink-300">
          Every article on the other tags moves to the tag you keep; the rest are deleted.
        </p>
        <Field label="Keep this tag">
          <select
            value={mergeTarget}
            onChange={(event) => setMergeTarget(event.target.value)}
            className="adm-select"
          >
            {selectedTags.map((tag) => (
              <option key={tag._id} value={tag._id}>
                {tag.name} ({tag.usageCount ?? 0} articles)
              </option>
            ))}
          </select>
        </Field>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete tags"
        message={`Delete ${confirm?.ids.length ?? 0} tag(s)? Articles keep their tag names but lose the link.`}
        busy={remove.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && remove.mutate(confirm.ids)}
      />
    </div>
  );
}
