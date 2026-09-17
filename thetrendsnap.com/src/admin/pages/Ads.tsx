import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BarChart3, PenSquare, Plus, Trash2 } from "lucide-react";
import { adsApi, categoriesApi } from "@/admin/lib/api";
import type { AdPosition, Advertisement } from "@/admin/types";
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
  toLocalInput,
} from "@/admin/components/ui";
import { ImageField } from "@/admin/components/ImageField";
import { useToast } from "@/admin/components/Toast";
import { useAuth } from "@/admin/hooks/useAuth";

const POSITIONS: AdPosition[] = [
  "home-hero", "home-top", "home-infeed", "home-mid",
  "home-gallery-left", "home-gallery-right", "home-gallery", "home-bottom",
  "sidebar", "sidebar-sticky",
  "article-sidebar-top", "article-sidebar-middle", "article-sidebar-bottom",
  "article-top", "article-inline", "article-bottom",
  "category-top", "category-infeed", "footer", "mobile-sticky-bottom",
];

/**
 * Where each slot actually renders on the live site. Booking an ad is the only
 * step: a slot with nothing booked renders nothing at all, so every one of
 * these can be left empty without leaving a gap on the page.
 */
const POSITION_INFO: Record<AdPosition, string> = {
  "home-hero": "Home — full-width billboard directly under the hero slider",
  "home-top": "Home — leaderboard at the very top, above the hero",
  "home-infeed": "Home — strip between the Latest / Don't Miss block and More Stories. Also used inside article feeds",
  "home-mid": "Home — wide banner between the three-column block and the category grid",
  "home-gallery-left": "Home — left rail beside the Snap Wall tiles",
  "home-gallery-right": "Home — right rail beside the Snap Wall tiles",
  "home-gallery": "Legacy single Snap Wall rail — use the left / right slots instead",
  "home-bottom": "Home — banner at the very bottom, above the footer",
  sidebar: "Right column on Home, article pages, Trending, Popular and Latest",
  "sidebar-sticky": "Sticky half-page in the right column on Home and article pages",
  "article-sidebar-top": "Article page — top of the right column, above the contents list",
  "article-sidebar-middle": "Article page — right column, between the editor's picks and Popular now",
  "article-sidebar-bottom": "Article page — right column, below the related stories",
  "article-top": "Article page — above the headline",
  "article-inline": "Article page — inside the body copy",
  "article-bottom": "Article page — below the body, before related stories",
  "category-top": "Category, Trending, Popular and Videos pages — above the listing",
  "category-infeed": "Gallery page — inside the listing",
  footer: "Every page — leaderboard directly above the footer columns",
  "mobile-sticky-bottom": "Every page, phones only — sticky 320x50 bar pinned to the bottom",
};

const BLANK: Partial<Advertisement> = {
  name: "",
  position: "home-top",
  type: "image",
  display: "banner",
  targetUrl: "",
  scriptCode: "",
  openInNewTab: true,
  devices: ["desktop", "tablet", "mobile"],
  categories: [],
  priority: 0,
  status: "active",
};

export default function Ads() {
  const toast = useToast();
  const { can } = useAuth();
  const queryClient = useQueryClient();

  const [position, setPosition] = useState("all");
  const [status, setStatus] = useState("all");
  const [editing, setEditing] = useState<Partial<Advertisement> | null>(null);
  const [confirm, setConfirm] = useState<Advertisement | null>(null);

  const list = useQuery({
    queryKey: ["ads", { position, status }],
    queryFn: () => adsApi.list({ position, status }),
  });

  const categories = useQuery({ queryKey: ["categories", "all"], queryFn: () => categoriesApi.list({}) });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["ads"] });

  const save = useMutation({
    mutationFn: (payload: Partial<Advertisement>) =>
      payload._id ? adsApi.update(payload._id, payload) : adsApi.create(payload),
    onSuccess: () => {
      toast.success("Advertisement saved");
      setEditing(null);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => adsApi.remove(id),
    onSuccess: () => {
      toast.success("Advertisement deleted");
      setConfirm(null);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const ads = list.data?.data ?? [];
  const totalImpressions = ads.reduce((sum, ad) => sum + (ad.impressions || 0), 0);
  const totalClicks = ads.reduce((sum, ad) => sum + (ad.clicks || 0), 0);

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-ink-900 dark:text-white">
            Advertisements
          </h1>
          <p className="mt-0.5 text-sm text-ink-500">
            {ads.length} placements · {totalImpressions.toLocaleString()} impressions ·{" "}
            {totalClicks.toLocaleString()} clicks
          </p>
        </div>
        <button type="button" className="adm-btn-primary" onClick={() => setEditing({ ...BLANK })}>
          <Plus className="h-4 w-4" />
          New advertisement
        </button>
      </header>

      <SectionCard title="Filters">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Position">
            <select value={position} onChange={(event) => setPosition(event.target.value)} className="adm-select">
              <option value="all">All positions</option>
              {POSITIONS.map((entry) => (
                <option key={entry} value={entry}>
                  {entry}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Status">
            <select value={status} onChange={(event) => setStatus(event.target.value)} className="adm-select">
              <option value="all">All</option>
              <option value="active">Active</option>
              <option value="paused">Paused</option>
            </select>
          </Field>
        </div>
      </SectionCard>

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
                  <th>Advertisement</th>
                  <th>Position</th>
                  <th>Type</th>
                  <th>Devices</th>
                  <th>Schedule</th>
                  <th>Impr.</th>
                  <th>Clicks</th>
                  <th>CTR</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {ads.map((ad) => {
                  const ctr = ad.impressions ? ((ad.clicks || 0) / ad.impressions) * 100 : 0;
                  return (
                    <tr key={ad._id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          {ad.image?.url && (
                            <img src={ad.image.url} alt="" className="h-9 w-16 rounded object-cover" />
                          )}
                          <div className="min-w-0">
                            <p className="font-semibold text-ink-800 dark:text-ink-100">{ad.name}</p>
                            {ad.targetUrl && (
                              <p className="clamp-1 text-[11px] text-ink-400">{ad.targetUrl}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap">
                        <span className="adm-chip bg-ink-100 dark:bg-ink-800">{ad.position}</span>
                      </td>
                      <td className="whitespace-nowrap">
                        {ad.type}
                        <span className="block text-[11px] text-ink-400">
                          {ad.maxHeight ? `${ad.maxHeight}px` : "standard 240px"}
                        </span>
                      </td>
                      <td className="text-[11px] text-ink-500">{(ad.devices || []).join(", ")}</td>
                      <td className="whitespace-nowrap text-[11px] text-ink-500">
                        {ad.startsAt || ad.endsAt
                          ? `${ad.startsAt ? formatDate(ad.startsAt) : "—"} → ${ad.endsAt ? formatDate(ad.endsAt) : "—"}`
                          : "Always on"}
                      </td>
                      <td>{(ad.impressions || 0).toLocaleString()}</td>
                      <td>{(ad.clicks || 0).toLocaleString()}</td>
                      <td>{ctr.toFixed(2)}%</td>
                      <td>
                        <span
                          className={`adm-chip ${
                            ad.status === "active"
                              ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                              : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-300"
                          }`}
                        >
                          {ad.status}
                        </span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-1">
                          <button type="button" className="adm-btn-ghost adm-btn-sm" onClick={() => setEditing(ad)}>
                            <PenSquare className="h-3.5 w-3.5" />
                          </button>
                          {can("canDelete") && (
                            <button
                              type="button"
                              className="adm-btn-ghost adm-btn-sm text-rose-600"
                              onClick={() => setConfirm(ad)}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <SectionCard
        title="Placement reference"
        description="Where every slot renders on the live site. A slot with nothing booked renders nothing, so the layout closes up instead of leaving a gap."
      >
        <div className="grid gap-1.5 sm:grid-cols-2">
          {POSITIONS.map((entry) => {
            const count = ads.filter((ad) => ad.position === entry && ad.status === "active").length;
            return (
              <div
                key={entry}
                className="flex items-start gap-2 rounded-lg border border-ink-100 p-2 dark:border-ink-800"
              >
                <span
                  className={`adm-chip shrink-0 ${
                    count
                      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                      : "bg-ink-100 text-ink-500 dark:bg-ink-800"
                  }`}
                >
                  <BarChart3 className="h-3 w-3" />
                  {entry} · {count}
                </span>
                <p className="text-[11px] leading-relaxed text-ink-500">{POSITION_INFO[entry]}</p>
              </div>
            );
          })}
        </div>
      </SectionCard>

      <AdModal
        value={editing}
        categories={categories.data ?? []}
        busy={save.isPending}
        onClose={() => setEditing(null)}
        onSave={(payload) => save.mutate(payload)}
      />

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete advertisement"
        message={`Delete "${confirm?.name}"? Its impression and click history is removed too.`}
        busy={remove.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && remove.mutate(confirm._id)}
      />
    </div>
  );
}

function AdModal({
  value,
  categories,
  busy,
  onClose,
  onSave,
}: {
  value: Partial<Advertisement> | null;
  categories: Array<{ _id: string; name: string }>;
  busy: boolean;
  onClose: () => void;
  onSave: (payload: Partial<Advertisement>) => void;
}) {
  const [form, setForm] = useState<Partial<Advertisement>>(value || BLANK);

  useEffect(() => setForm(value || BLANK), [value]);

  if (!value) return null;

  const patch = (next: Partial<Advertisement>) => setForm((prev) => ({ ...prev, ...next }));
  const devices = form.devices || [];
  const selectedCategories = (form.categories || []).map((entry) =>
    typeof entry === "string" ? entry : entry._id
  );

  return (
    <Modal
      open
      title={form._id ? `Edit ${form.name}` : "New advertisement"}
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
            onClick={() => onSave({ ...form, categories: selectedCategories })}
          >
            {busy && <Spinner />}
            Save advertisement
          </button>
        </>
      }
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Name" required>
          <input
            value={form.name || ""}
            onChange={(event) => patch({ name: event.target.value })}
            className="adm-input"
          />
        </Field>

        <Field
          label="Position"
          required
          hint={form.position ? POSITION_INFO[form.position as AdPosition] : undefined}
        >
          <select
            value={form.position}
            onChange={(event) => patch({ position: event.target.value as AdPosition })}
            className="adm-select"
          >
            {POSITIONS.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Type">
          <select
            value={form.type || "image"}
            onChange={(event) => patch({ type: event.target.value as "image" | "script" })}
            className="adm-select"
          >
            <option value="image">Image banner</option>
            <option value="script">Script / AdSense</option>
          </select>
        </Field>

        <Field
          label="Height limit (px)"
          hint="Overrides the 240px standard for this one ad. The image is scaled down whole to fit — never cropped. Snap Wall rails ignore both and keep the creative's own size."
        >
          <input
            type="number"
            min={0}
            max={1200}
            placeholder="Slot default"
            value={form.maxHeight ?? ""}
            onChange={(event) =>
              patch({ maxHeight: event.target.value ? Number(event.target.value) : null })
            }
            className="adm-input"
          />
        </Field>

        <Field
          label="Priority"
          hint="Higher shows first; several ads in one slot rotate every 7 seconds"
        >
          <input
            type="number"
            value={form.priority ?? 0}
            onChange={(event) => patch({ priority: Number(event.target.value) })}
            className="adm-input"
          />
        </Field>

        {form.type === "script" ? (
          <Field label="Script code" className="sm:col-span-2">
            <textarea
              rows={6}
              value={form.scriptCode || ""}
              onChange={(event) => patch({ scriptCode: event.target.value })}
              className="adm-textarea font-mono text-xs"
              placeholder="<script>…</script>"
            />
          </Field>
        ) : (
          <div className="sm:col-span-2">
            <ImageField
              label="Banner creative"
              value={form.image}
              onChange={(image) => patch({ image })}
            />
          </div>
        )}

        <Field label="Target URL">
          <input
            value={form.targetUrl || ""}
            onChange={(event) => patch({ targetUrl: event.target.value })}
            className="adm-input"
          />
        </Field>

        <div className="flex items-end">
          <Toggle
            label="Open in new tab"
            checked={form.openInNewTab !== false}
            onChange={(value_) => patch({ openInNewTab: value_ })}
          />
        </div>

        <Field label="Starts at">
          <input
            type="datetime-local"
            value={toLocalInput(form.startsAt)}
            onChange={(event) =>
              patch({ startsAt: event.target.value ? new Date(event.target.value).toISOString() : null })
            }
            className="adm-input"
          />
        </Field>

        <Field label="Ends at">
          <input
            type="datetime-local"
            value={toLocalInput(form.endsAt)}
            onChange={(event) =>
              patch({ endsAt: event.target.value ? new Date(event.target.value).toISOString() : null })
            }
            className="adm-input"
          />
        </Field>

        <Field label="Devices" className="sm:col-span-2">
          <div className="flex flex-wrap gap-2">
            {(["desktop", "tablet", "mobile"] as const).map((device) => (
              <label
                key={device}
                className="flex items-center gap-2 rounded-lg border border-ink-200 px-3 py-2 text-sm dark:border-ink-700"
              >
                <input
                  type="checkbox"
                  checked={devices.includes(device)}
                  onChange={(event) =>
                    patch({
                      devices: event.target.checked
                        ? [...devices, device]
                        : devices.filter((entry) => entry !== device),
                    })
                  }
                  className="h-4 w-4 accent-brand-600"
                />
                {device}
              </label>
            ))}
          </div>
        </Field>

        <Field label="Limit to categories" hint="Empty = every category" className="sm:col-span-2">
          <select
            multiple
            size={5}
            value={selectedCategories}
            onChange={(event) =>
              patch({ categories: Array.from(event.target.selectedOptions).map((option) => option.value) })
            }
            className="adm-select h-auto py-2"
          >
            {categories.map((category) => (
              <option key={category._id} value={category._id}>
                {category.name}
              </option>
            ))}
          </select>
        </Field>

        <Field label="Status">
          <select
            value={form.status || "active"}
            onChange={(event) => patch({ status: event.target.value as "active" | "paused" })}
            className="adm-select"
          >
            <option value="active">Active</option>
            <option value="paused">Paused</option>
          </select>
        </Field>
      </div>
    </Modal>
  );
}
