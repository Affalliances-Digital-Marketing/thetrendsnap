import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Link2, Search, Upload } from "lucide-react";
import { mediaApi } from "@/admin/lib/api";
import type { MediaItem } from "@/admin/types";
import { EmptyState, Field, LoadingBlock, Modal, Spinner, cn, formatBytes } from "@/admin/components/ui";
import { useToast } from "@/admin/components/Toast";

/**
 * Media library picker. Doubles as the upload surface, so an editor never has
 * to leave the form to add an image.
 */
export function MediaPicker({
  open,
  onClose,
  onSelect,
  multiple = false,
}: {
  open: boolean;
  onClose: () => void;
  onSelect: (items: MediaItem[]) => void;
  multiple?: boolean;
}) {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [folder, setFolder] = useState("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Record<string, MediaItem>>({});
  const [externalUrl, setExternalUrl] = useState("");

  useEffect(() => {
    if (!open) {
      setSelected({});
      setExternalUrl("");
      setPage(1);
    }
  }, [open]);

  const { data, isLoading } = useQuery({
    queryKey: ["media", { search, folder, page }],
    queryFn: () => mediaApi.list({ search, folder, page, limit: 24 }),
    enabled: open,
  });

  const { data: folders } = useQuery({
    queryKey: ["media-folders"],
    queryFn: () => mediaApi.folders(),
    enabled: open,
  });

  const upload = useMutation({
    mutationFn: async (files: File[]): Promise<MediaItem[]> => {
      const target = folder === "all" ? "uncategorized" : folder;
      if (files.length === 1) {
        const res = await mediaApi.upload(files[0], { folder: target });
        return [res.data];
      }
      const res = await mediaApi.uploadMany(files, { folder: target });
      return res.data;
    },
    onSuccess: () => {
      toast.success("Upload complete");
      void queryClient.invalidateQueries({ queryKey: ["media"] });
      void queryClient.invalidateQueries({ queryKey: ["media-folders"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const register = useMutation({
    mutationFn: (url: string) => mediaApi.registerExternal({ url, folder: "external" }),
    onSuccess: (res) => {
      toast.success("URL added to library");
      setExternalUrl("");
      void queryClient.invalidateQueries({ queryKey: ["media"] });
      onSelect([res.data]);
      onClose();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const items = data?.data ?? [];
  const chosen = useMemo(() => Object.values(selected), [selected]);

  const toggle = (item: MediaItem) => {
    setSelected((prev) => {
      if (prev[item._id]) {
        const next = { ...prev };
        delete next[item._id];
        return next;
      }
      return multiple ? { ...prev, [item._id]: item } : { [item._id]: item };
    });
  };

  return (
    <Modal
      open={open}
      title="Media library"
      onClose={onClose}
      width="max-w-5xl"
      footer={
        <>
          <span className="mr-auto text-xs text-ink-500">
            {chosen.length ? `${chosen.length} selected` : "Select an asset"}
          </span>
          <button type="button" className="adm-btn-ghost" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="adm-btn-primary"
            disabled={!chosen.length}
            onClick={() => {
              onSelect(chosen);
              onClose();
            }}
          >
            Use {multiple && chosen.length > 1 ? `${chosen.length} files` : "file"}
          </button>
        </>
      }
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-[1fr_180px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search media…"
            className="adm-input pl-9"
          />
        </div>

        <select
          value={folder}
          onChange={(event) => {
            setFolder(event.target.value);
            setPage(1);
          }}
          className="adm-select"
        >
          <option value="all">All folders</option>
          {(folders?.data ?? []).map((entry) => (
            <option key={entry.folder} value={entry.folder}>
              {entry.folder} ({entry.count})
            </option>
          ))}
        </select>

        <label className="adm-btn-ghost cursor-pointer">
          {upload.isPending ? <Spinner /> : <Upload className="h-4 w-4" />}
          Upload
          <input
            type="file"
            accept="image/*,video/*"
            multiple={multiple}
            className="hidden"
            onChange={(event) => {
              const files = Array.from(event.target.files || []);
              if (files.length) upload.mutate(files);
              event.target.value = "";
            }}
          />
        </label>
      </div>

      <div className="mb-4 flex flex-wrap items-end gap-2">
        <Field label="Or paste an external image URL" className="min-w-[240px] flex-1">
          <input
            value={externalUrl}
            onChange={(event) => setExternalUrl(event.target.value)}
            placeholder="https://…"
            className="adm-input"
          />
        </Field>
        <button
          type="button"
          className="adm-btn-ghost"
          disabled={!externalUrl.trim() || register.isPending}
          onClick={() => register.mutate(externalUrl.trim())}
        >
          {register.isPending ? <Spinner /> : <Link2 className="h-4 w-4" />}
          Add URL
        </button>
      </div>

      {isLoading ? (
        <LoadingBlock label="Loading media…" />
      ) : items.length === 0 ? (
        <EmptyState title="No media yet" message="Upload a file or add an image URL to get started." />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
            {items.map((item) => {
              const active = Boolean(selected[item._id]);
              return (
                <button
                  key={item._id}
                  type="button"
                  onClick={() => toggle(item)}
                  className={cn(
                    "group relative overflow-hidden rounded-lg border text-left transition-all",
                    active
                      ? "border-brand-600 ring-2 ring-brand-500/40"
                      : "border-ink-200 hover:border-brand-300 dark:border-ink-700"
                  )}
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
                    <span className="clamp-1 block text-[11px] font-semibold text-ink-800 dark:text-ink-100">
                      {item.name}
                    </span>
                    <span className="block text-[10px] text-ink-400">
                      {item.width && item.height ? `${item.width}×${item.height} · ` : ""}
                      {formatBytes(item.bytes)}
                    </span>
                  </span>
                  {active && (
                    <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-white">
                      <Check className="h-3 w-3" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {data?.pagination && data.pagination.pages > 1 && (
            <div className="mt-4 flex items-center justify-between">
              <p className="text-xs text-ink-500">
                Page {data.pagination.page} of {data.pagination.pages} · {data.pagination.total} files
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  className="adm-btn-ghost adm-btn-sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Prev
                </button>
                <button
                  type="button"
                  className="adm-btn-ghost adm-btn-sm"
                  disabled={page >= (data.pagination.pages || 1)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </Modal>
  );
}
