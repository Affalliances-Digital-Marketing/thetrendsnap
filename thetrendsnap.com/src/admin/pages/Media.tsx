import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Copy, Link2, RefreshCw, Search, Trash2, Upload } from "lucide-react";
import { mediaApi } from "@/admin/lib/api";
import type { MediaItem } from "@/admin/types";
import {
  ConfirmDialog,
  EmptyState,
  ErrorBlock,
  Field,
  LoadingBlock,
  Modal,
  Pagination,
  SectionCard,
  Spinner,
  cn,
  formatBytes,
  formatDate,
} from "@/admin/components/ui";
import { useToast } from "@/admin/components/Toast";
import { useAuth } from "@/admin/hooks/useAuth";

export default function Media() {
  const toast = useToast();
  const { can } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState("all");
  const [type, setType] = useState("all");
  const [sort, setSort] = useState("-createdAt");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string[]>([]);
  const [editing, setEditing] = useState<MediaItem | null>(null);
  const [confirm, setConfirm] = useState<string[] | null>(null);
  const [externalUrl, setExternalUrl] = useState("");
  const [uploadFolder, setUploadFolder] = useState("");

  const list = useQuery({
    queryKey: ["media", { search, folder, type, sort, page }],
    queryFn: () => mediaApi.list({ search, folder, type, sort, page, limit: 36 }),
  });

  const folders = useQuery({ queryKey: ["media-folders"], queryFn: () => mediaApi.folders() });

  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: ["media"] });
    void queryClient.invalidateQueries({ queryKey: ["media-folders"] });
  };

  const upload = useMutation({
    mutationFn: async (files: File[]) => {
      const target = uploadFolder.trim() || (folder !== "all" ? folder : "uncategorized");
      if (files.length === 1) {
        const res = await mediaApi.upload(files[0], { folder: target });
        return [res.data];
      }
      const res = await mediaApi.uploadMany(files, { folder: target });
      return res.data;
    },
    onSuccess: (items) => {
      toast.success(`${items.length} file(s) uploaded`);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const register = useMutation({
    mutationFn: (url: string) => mediaApi.registerExternal({ url, folder: "external" }),
    onSuccess: () => {
      toast.success("External URL registered");
      setExternalUrl("");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const update = useMutation({
    mutationFn: (item: MediaItem) =>
      mediaApi.update(item._id, {
        name: item.name,
        folder: item.folder,
        alt: item.alt,
        caption: item.caption,
        title: item.title,
        credit: item.credit,
        redirectUrl: item.redirectUrl,
        tags: item.tags,
      }),
    onSuccess: () => {
      toast.success("Media updated");
      setEditing(null);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const replace = useMutation({
    mutationFn: ({ id, file }: { id: string; file: File }) => mediaApi.replace(id, file),
    onSuccess: (res) => {
      toast.success("File replaced");
      setEditing(res.data);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (ids: string[]) =>
      ids.length === 1 ? mediaApi.remove(ids[0]) : mediaApi.bulkDelete(ids),
    onSuccess: () => {
      toast.success("Deleted");
      setConfirm(null);
      setSelected([]);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const items = list.data?.data ?? [];

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-ink-900 dark:text-white">
            Media library
          </h1>
          <p className="mt-0.5 text-sm text-ink-500">
            {list.data?.pagination?.total ?? 0} files
          </p>
        </div>

        <label className="adm-btn-primary cursor-pointer">
          {upload.isPending ? <Spinner /> : <Upload className="h-4 w-4" />}
          Upload files
          <input
            type="file"
            multiple
            accept="image/*,video/*"
            className="hidden"
            onChange={(event) => {
              const files = Array.from(event.target.files || []);
              if (files.length) upload.mutate(files);
              event.target.value = "";
            }}
          />
        </label>
      </header>

      <SectionCard title="Filters & upload target">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Search">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                className="adm-input pl-9"
                placeholder="Name, alt, caption…"
              />
            </div>
          </Field>

          <Field label="Folder">
            <select
              value={folder}
              onChange={(event) => {
                setFolder(event.target.value);
                setPage(1);
              }}
              className="adm-select"
            >
              <option value="all">All folders</option>
              {(folders.data?.data ?? []).map((entry) => (
                <option key={entry.folder} value={entry.folder}>
                  {entry.folder} ({entry.count})
                </option>
              ))}
            </select>
          </Field>

          <Field label="Type">
            <select
              value={type}
              onChange={(event) => {
                setType(event.target.value);
                setPage(1);
              }}
              className="adm-select"
            >
              <option value="all">All types</option>
              <option value="image">Images</option>
              <option value="video">Videos</option>
              <option value="raw">Raw</option>
            </select>
          </Field>

          <Field label="Sort">
            <select value={sort} onChange={(event) => setSort(event.target.value)} className="adm-select">
              <option value="-createdAt">Newest first</option>
              <option value="createdAt">Oldest first</option>
              <option value="name">Name A–Z</option>
              <option value="-bytes">Largest first</option>
              <option value="-usageCount">Most used</option>
            </select>
          </Field>

          <Field label="Upload into folder" hint="Blank uses the selected folder">
            <input
              value={uploadFolder}
              onChange={(event) => setUploadFolder(event.target.value)}
              placeholder="uncategorized"
              className="adm-input"
            />
          </Field>

          <Field label="Register external URL" className="lg:col-span-2">
            <div className="flex gap-2">
              <input
                value={externalUrl}
                onChange={(event) => setExternalUrl(event.target.value)}
                placeholder="https://…"
                className="adm-input"
              />
              <button
                type="button"
                className="adm-btn-ghost shrink-0"
                disabled={!externalUrl.trim() || register.isPending}
                onClick={() => register.mutate(externalUrl.trim())}
              >
                <Link2 className="h-4 w-4" />
                Add
              </button>
            </div>
          </Field>
        </div>
      </SectionCard>

      {selected.length > 0 && can("canDelete") && (
        <div className="adm-card flex items-center gap-3 p-3">
          <span className="text-sm font-bold">{selected.length} selected</span>
          <div className="ml-auto flex gap-2">
            <button type="button" className="adm-btn-danger adm-btn-sm" onClick={() => setConfirm(selected)}>
              <Trash2 className="h-3.5 w-3.5" />
              Delete
            </button>
            <button type="button" className="adm-btn-ghost adm-btn-sm" onClick={() => setSelected([])}>
              Clear
            </button>
          </div>
        </div>
      )}

      <div className="adm-card p-4">
        {list.isLoading ? (
          <LoadingBlock />
        ) : list.isError ? (
          <ErrorBlock error={list.error} onRetry={() => void list.refetch()} />
        ) : items.length === 0 ? (
          <EmptyState title="No media" message="Upload a file or register an external URL." />
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
              {items.map((item) => {
                const checked = selected.includes(item._id);
                return (
                  <div
                    key={item._id}
                    className={cn(
                      "group relative overflow-hidden rounded-xl border transition-colors",
                      checked ? "border-brand-600" : "border-ink-200 dark:border-ink-700"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => setEditing(item)}
                      className="block w-full text-left"
                    >
                      <span className="block aspect-square overflow-hidden bg-ink-100 dark:bg-ink-800">
                        <img
                          src={item.thumbnailUrl || item.url}
                          alt={item.alt || item.name}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                      </span>
                      <span className="block px-2 py-1.5">
                        <span className="clamp-1 block text-[11.5px] font-semibold text-ink-800 dark:text-ink-100">
                          {item.name}
                        </span>
                        <span className="block text-[10px] text-ink-400">
                          {item.folder} · {formatBytes(item.bytes)}
                        </span>
                      </span>
                    </button>

                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() =>
                        setSelected((prev) =>
                          prev.includes(item._id)
                            ? prev.filter((id) => id !== item._id)
                            : [...prev, item._id]
                        )
                      }
                      className="absolute left-2 top-2 h-4 w-4 accent-brand-600"
                      aria-label={`Select ${item.name}`}
                    />
                  </div>
                );
              })}
            </div>

            {list.data?.pagination && (
              <Pagination
                page={list.data.pagination.page}
                pages={list.data.pagination.pages}
                total={list.data.pagination.total}
                onChange={setPage}
              />
            )}
          </>
        )}
      </div>

      {/* ---------------- detail modal ---------------- */}
      <Modal
        open={Boolean(editing)}
        title={editing?.name || "Media"}
        onClose={() => setEditing(null)}
        width="max-w-3xl"
        footer={
          <>
            {can("canDelete") && editing && (
              <button
                type="button"
                className="adm-btn-danger mr-auto"
                onClick={() => setConfirm([editing._id])}
              >
                <Trash2 className="h-4 w-4" />
                Delete
              </button>
            )}
            <button type="button" className="adm-btn-ghost" onClick={() => setEditing(null)}>
              Close
            </button>
            <button
              type="button"
              className="adm-btn-primary"
              disabled={update.isPending}
              onClick={() => editing && update.mutate(editing)}
            >
              {update.isPending && <Spinner />}
              Save changes
            </button>
          </>
        }
      >
        {editing && (
          <div className="grid gap-4 sm:grid-cols-[220px_1fr]">
            <div>
              <img
                src={editing.url}
                alt={editing.alt || editing.name}
                className="w-full rounded-xl border border-ink-200 object-cover dark:border-ink-700"
              />
              <dl className="mt-3 space-y-1 text-[11px] text-ink-500">
                <div className="flex justify-between gap-2">
                  <dt>Dimensions</dt>
                  <dd>{editing.width && editing.height ? `${editing.width}×${editing.height}` : "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Size</dt>
                  <dd>{formatBytes(editing.bytes)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Format</dt>
                  <dd>{editing.format || "—"}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Used in</dt>
                  <dd>{editing.usageCount ?? 0} articles</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt>Uploaded</dt>
                  <dd>{formatDate(editing.createdAt)}</dd>
                </div>
              </dl>

              <div className="mt-3 flex flex-col gap-2">
                <button
                  type="button"
                  className="adm-btn-ghost adm-btn-sm"
                  onClick={() => {
                    void navigator.clipboard.writeText(editing.secureUrl || editing.url);
                    toast.success("URL copied");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" />
                  Copy URL
                </button>

                <label className="adm-btn-ghost adm-btn-sm cursor-pointer">
                  {replace.isPending ? <Spinner /> : <RefreshCw className="h-3.5 w-3.5" />}
                  Replace file
                  <input
                    type="file"
                    accept="image/*,video/*"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) replace.mutate({ id: editing._id, file });
                      event.target.value = "";
                    }}
                  />
                </label>
              </div>
            </div>

            <div className="grid gap-3">
              <Field label="Name">
                <input
                  value={editing.name}
                  onChange={(event) => setEditing({ ...editing, name: event.target.value })}
                  className="adm-input"
                />
              </Field>
              <Field label="Folder">
                <input
                  value={editing.folder || ""}
                  onChange={(event) => setEditing({ ...editing, folder: event.target.value })}
                  className="adm-input"
                />
              </Field>
              <Field label="Alt text">
                <input
                  value={editing.alt || ""}
                  onChange={(event) => setEditing({ ...editing, alt: event.target.value })}
                  className="adm-input"
                />
              </Field>
              <Field label="Caption">
                <input
                  value={editing.caption || ""}
                  onChange={(event) => setEditing({ ...editing, caption: event.target.value })}
                  className="adm-input"
                />
              </Field>
              <Field label="Title">
                <input
                  value={editing.title || ""}
                  onChange={(event) => setEditing({ ...editing, title: event.target.value })}
                  className="adm-input"
                />
              </Field>
              <Field label="Credit">
                <input
                  value={editing.credit || ""}
                  onChange={(event) => setEditing({ ...editing, credit: event.target.value })}
                  className="adm-input"
                />
              </Field>
              <Field label="Redirect URL">
                <input
                  value={editing.redirectUrl || ""}
                  onChange={(event) => setEditing({ ...editing, redirectUrl: event.target.value })}
                  className="adm-input"
                />
              </Field>
              <Field label="Tags" hint="Comma separated">
                <input
                  value={(editing.tags || []).join(", ")}
                  onChange={(event) =>
                    setEditing({
                      ...editing,
                      tags: event.target.value.split(",").map((t) => t.trim()).filter(Boolean),
                    })
                  }
                  className="adm-input"
                />
              </Field>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete media"
        message={`Delete ${confirm?.length ?? 0} file(s)? They are removed from Cloudinary as well.`}
        busy={remove.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && remove.mutate(confirm)}
      />
    </div>
  );
}
