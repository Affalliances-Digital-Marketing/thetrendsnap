import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Eye, EyeOff, PenSquare, Plus, Trash2 } from "lucide-react";
import { categoriesApi } from "@/admin/lib/api";
import type { Category } from "@/admin/types";
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
import { ImageField } from "@/admin/components/ImageField";
import { useToast } from "@/admin/components/Toast";
import { useAuth } from "@/admin/hooks/useAuth";

const BLANK: Partial<Category> = {
  name: "",
  slug: "",
  description: "",
  icon: "",
  color: "",
  shortLabel: "",
  redirectUrl: "",
  status: "active",
  order: 0,
  priority: 0,
  maxSubTrending: 5,
  dailyAutoUpdateLimit: 10,
  showOnHome: true,
  showInMenu: true,
  showInFooter: false,
  featured: false,
  hidden: false,
  autoUpdateEnabled: false,
  robots: "index, follow",
};

export default function Categories() {
  const toast = useToast();
  const { can } = useAuth();
  const queryClient = useQueryClient();

  const [editing, setEditing] = useState<Partial<Category> | null>(null);
  const [confirm, setConfirm] = useState<Category | null>(null);

  const list = useQuery({
    queryKey: ["categories", "admin"],
    queryFn: () => categoriesApi.list({ withCounts: true }),
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["categories"] });

  const save = useMutation({
    mutationFn: (payload: Partial<Category>) =>
      payload._id ? categoriesApi.update(payload._id, payload) : categoriesApi.create(payload),
    onSuccess: () => {
      toast.success("Category saved");
      setEditing(null);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const toggleVisibility = useMutation({
    mutationFn: (id: string) => categoriesApi.toggleVisibility(id),
    onSuccess: () => {
      toast.success("Visibility updated");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const reorder = useMutation({
    mutationFn: (items: Array<{ id: string; order: number }>) => categoriesApi.reorder(items),
    onSuccess: () => invalidate(),
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => categoriesApi.remove(id),
    onSuccess: () => {
      toast.success("Category deleted");
      setConfirm(null);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const categories = list.data ?? [];

  const move = (index: number, direction: -1 | 1) => {
    const next = [...categories];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    reorder.mutate(next.map((category, position) => ({ id: category._id, order: position })));
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-ink-900 dark:text-white">
            Categories
          </h1>
          <p className="mt-0.5 text-sm text-ink-500">
            {categories.length} categories · order controls the navigation
          </p>
        </div>
        <button type="button" className="adm-btn-primary" onClick={() => setEditing({ ...BLANK })}>
          <Plus className="h-4 w-4" />
          New category
        </button>
      </header>

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
                  <th className="w-24">Order</th>
                  <th>Category</th>
                  <th>Articles</th>
                  <th>Status</th>
                  <th>Placement</th>
                  <th>Auto news</th>
                  <th>Updated</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((category, index) => (
                  <tr key={category._id}>
                    <td>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          className="adm-btn-ghost adm-btn-sm px-1.5"
                          onClick={() => move(index, -1)}
                          disabled={index === 0 || reorder.isPending}
                          aria-label="Move up"
                        >
                          <ArrowUp className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          className="adm-btn-ghost adm-btn-sm px-1.5"
                          onClick={() => move(index, 1)}
                          disabled={index === categories.length - 1 || reorder.isPending}
                          aria-label="Move down"
                        >
                          <ArrowDown className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>

                    <td>
                      <div className="flex items-center gap-2.5">
                        {(category.image?.url || category.iconImage?.url) && (
                          <img
                            src={category.image?.url || category.iconImage?.url}
                            alt=""
                            className="h-9 w-9 rounded-lg object-cover"
                          />
                        )}
                        <div>
                          <p className="font-semibold text-ink-800 dark:text-ink-100">{category.name}</p>
                          <p className="text-[11px] text-ink-400">/{category.slug}</p>
                        </div>
                      </div>
                    </td>

                    <td className="text-ink-500">{category.articleCount ?? "—"}</td>

                    <td>
                      <span
                        className={`adm-chip ${
                          category.status === "active"
                            ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                            : "bg-ink-100 text-ink-500 dark:bg-ink-800"
                        }`}
                      >
                        {category.status}
                      </span>
                    </td>

                    <td>
                      <div className="flex flex-wrap gap-1 text-[10px]">
                        {category.showInMenu !== false && <span className="adm-chip bg-ink-100 dark:bg-ink-800">menu</span>}
                        {category.showOnHome && <span className="adm-chip bg-ink-100 dark:bg-ink-800">home</span>}
                        {category.showInFooter && <span className="adm-chip bg-ink-100 dark:bg-ink-800">footer</span>}
                        {category.featured && <span className="adm-chip bg-brand-50 text-brand-700 dark:bg-brand-500/10">featured</span>}
                        {category.hidden && <span className="adm-chip bg-rose-50 text-rose-600 dark:bg-rose-500/10">hidden</span>}
                      </div>
                    </td>

                    <td className="text-ink-500">
                      {category.autoUpdateEnabled ? `${category.dailyAutoUpdateLimit ?? 0}/day` : "off"}
                    </td>

                    <td className="whitespace-nowrap text-ink-500">{formatDate(category.updatedAt)}</td>

                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          className="adm-btn-ghost adm-btn-sm"
                          onClick={() => toggleVisibility.mutate(category._id)}
                          title={category.hidden ? "Show" : "Hide"}
                        >
                          {category.hidden ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                        <button
                          type="button"
                          className="adm-btn-ghost adm-btn-sm"
                          onClick={() => setEditing(category)}
                          title="Edit"
                        >
                          <PenSquare className="h-3.5 w-3.5" />
                        </button>
                        {can("canDelete") && (
                          <button
                            type="button"
                            className="adm-btn-ghost adm-btn-sm text-rose-600"
                            onClick={() => setConfirm(category)}
                            title="Delete"
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

      <CategoryModal
        value={editing}
        categories={categories}
        busy={save.isPending}
        onClose={() => setEditing(null)}
        onSave={(payload) => save.mutate(payload)}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete category"
        message={`Delete "${confirm?.name}"? Articles in this category keep their reference and may need reassigning.`}
        busy={remove.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && remove.mutate(confirm._id)}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */

function CategoryModal({
  value,
  categories,
  busy,
  onClose,
  onSave,
}: {
  value: Partial<Category> | null;
  categories: Category[];
  busy: boolean;
  onClose: () => void;
  onSave: (payload: Partial<Category>) => void;
}) {
  const [form, setForm] = useState<Partial<Category>>(value || BLANK);

  useEffect(() => setForm(value || BLANK), [value]);

  if (!value) return null;

  const patch = (next: Partial<Category>) => setForm((prev) => ({ ...prev, ...next }));

  return (
    <Modal
      open
      title={form._id ? `Edit ${form.name}` : "New category"}
      onClose={onClose}
      width="max-w-3xl"
      footer={
        <>
          <button type="button" className="adm-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="adm-btn-primary"
            disabled={busy || !form.name?.trim()}
            onClick={() => {
              const payload: Partial<Category> = { ...form };
              if (payload.parent && typeof payload.parent !== "string") {
                payload.parent = (payload.parent as Category)._id;
              }
              onSave(payload);
            }}
          >
            {busy && <Spinner />}
            Save category
          </button>
        </>
      }
    >
      <div className="space-y-4">
        <SectionCard title="Basics" className="border-0 p-0 shadow-none">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Name" required>
              <input
                value={form.name || ""}
                onChange={(event) => patch({ name: event.target.value })}
                className="adm-input"
              />
            </Field>
            <Field label="Slug" hint="Auto-generated from the name when empty">
              <input
                value={form.slug || ""}
                onChange={(event) => patch({ slug: event.target.value })}
                className="adm-input"
              />
            </Field>
            <Field label="Short label" hint="Compact label for nav pills">
              <input
                value={form.shortLabel || ""}
                onChange={(event) => patch({ shortLabel: event.target.value })}
                className="adm-input"
              />
            </Field>
            <Field label="Icon class or emoji">
              <input
                value={form.icon || ""}
                onChange={(event) => patch({ icon: event.target.value })}
                placeholder="fa-solid fa-plane or ✈️"
                className="adm-input"
              />
            </Field>
            <Field label="Accent colour">
              <input
                value={form.color || ""}
                onChange={(event) => patch({ color: event.target.value })}
                placeholder="#4f46e5"
                className="adm-input"
              />
            </Field>
            <Field label="Redirect URL" hint="Send this category elsewhere">
              <input
                value={form.redirectUrl || ""}
                onChange={(event) => patch({ redirectUrl: event.target.value })}
                className="adm-input"
              />
            </Field>
            <Field label="Parent category" className="sm:col-span-2">
              <select
                value={typeof form.parent === "string" ? form.parent : form.parent?._id || ""}
                onChange={(event) => patch({ parent: event.target.value || null })}
                className="adm-select"
              >
                <option value="">No parent (top level)</option>
                {categories
                  .filter((category) => category._id !== form._id)
                  .map((category) => (
                    <option key={category._id} value={category._id}>
                      {category.name}
                    </option>
                  ))}
              </select>
            </Field>
            <Field label="Description" className="sm:col-span-2">
              <textarea
                rows={3}
                value={form.description || ""}
                onChange={(event) => patch({ description: event.target.value })}
                className="adm-textarea"
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="Imagery" className="border-0 p-0 shadow-none">
          <div className="grid gap-3 lg:grid-cols-2">
            <ImageField label="Cover image" value={form.image} onChange={(image) => patch({ image })} />
            <ImageField label="Banner" value={form.banner} onChange={(image) => patch({ banner: image })} />
            <ImageField
              label="Icon image"
              value={form.iconImage}
              showAdvanced={false}
              onChange={(image) => patch({ iconImage: image })}
            />
            <ImageField
              label="Open Graph image"
              value={form.ogImage}
              showAdvanced={false}
              onChange={(image) => patch({ ogImage: image })}
            />
          </div>
        </SectionCard>

        <SectionCard title="Placement & ordering" className="border-0 p-0 shadow-none">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Field label="Order">
              <input
                type="number"
                value={form.order ?? 0}
                onChange={(event) => patch({ order: Number(event.target.value) })}
                className="adm-input"
              />
            </Field>
            <Field label="Priority">
              <input
                type="number"
                value={form.priority ?? 0}
                onChange={(event) => patch({ priority: Number(event.target.value) })}
                className="adm-input"
              />
            </Field>
            <Field label="Max sub-trending">
              <input
                type="number"
                value={form.maxSubTrending ?? 5}
                onChange={(event) => patch({ maxSubTrending: Number(event.target.value) })}
                className="adm-input"
              />
            </Field>
            <Field label="Status">
              <select
                value={form.status || "active"}
                onChange={(event) => patch({ status: event.target.value as "active" | "inactive" })}
                className="adm-select"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </Field>
          </div>

          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            <Toggle label="Show on homepage" checked={form.showOnHome !== false} onChange={(v) => patch({ showOnHome: v })} />
            <Toggle label="Show in menu" checked={form.showInMenu !== false} onChange={(v) => patch({ showInMenu: v })} />
            <Toggle label="Show in footer" checked={Boolean(form.showInFooter)} onChange={(v) => patch({ showInFooter: v })} />
            <Toggle label="Featured" checked={Boolean(form.featured)} onChange={(v) => patch({ featured: v })} />
            <Toggle label="Hidden" hint="Hides it everywhere on the site" checked={Boolean(form.hidden)} onChange={(v) => patch({ hidden: v })} />
          </div>
        </SectionCard>

        <SectionCard title="Automation" className="border-0 p-0 shadow-none">
          <div className="grid gap-3 sm:grid-cols-2">
            <Toggle
              label="Auto-generate news"
              hint="Included in the daily AI cron"
              checked={Boolean(form.autoUpdateEnabled)}
              onChange={(v) => patch({ autoUpdateEnabled: v })}
            />
            <Field label="Daily auto-update limit">
              <input
                type="number"
                value={form.dailyAutoUpdateLimit ?? 10}
                onChange={(event) => patch({ dailyAutoUpdateLimit: Number(event.target.value) })}
                className="adm-input"
              />
            </Field>
          </div>
        </SectionCard>

        <SectionCard title="SEO" className="border-0 p-0 shadow-none">
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Meta title">
              <input
                value={form.metaTitle || ""}
                onChange={(event) => patch({ metaTitle: event.target.value })}
                className="adm-input"
              />
            </Field>
            <Field label="SEO title (legacy)">
              <input
                value={form.seoTitle || ""}
                onChange={(event) => patch({ seoTitle: event.target.value })}
                className="adm-input"
              />
            </Field>
            <Field label="Focus keyword">
              <input
                value={form.focusKeyword || ""}
                onChange={(event) => patch({ focusKeyword: event.target.value })}
                className="adm-input"
              />
            </Field>
            <Field label="Canonical URL">
              <input
                value={form.canonicalUrl || ""}
                onChange={(event) => patch({ canonicalUrl: event.target.value })}
                className="adm-input"
              />
            </Field>
            <Field label="Robots">
              <select
                value={form.robots || "index, follow"}
                onChange={(event) => patch({ robots: event.target.value })}
                className="adm-select"
              >
                <option value="index, follow">index, follow</option>
                <option value="noindex, follow">noindex, follow</option>
                <option value="index, nofollow">index, nofollow</option>
                <option value="noindex, nofollow">noindex, nofollow</option>
              </select>
            </Field>
            <Field label="Meta description" className="sm:col-span-2">
              <textarea
                rows={2}
                value={form.metaDescription || ""}
                onChange={(event) => patch({ metaDescription: event.target.value })}
                className="adm-textarea"
              />
            </Field>
            <Field label="SEO description (legacy)" className="sm:col-span-2">
              <textarea
                rows={2}
                value={form.seoDescription || ""}
                onChange={(event) => patch({ seoDescription: event.target.value })}
                className="adm-textarea"
              />
            </Field>
          </div>
        </SectionCard>
      </div>
    </Modal>
  );
}
