import { useState } from "react";
import { ImageIcon, Images, Trash2 } from "lucide-react";
import type { ApiImage, MediaItem } from "@/admin/types";
import { MediaPicker } from "@/admin/components/MediaPicker";
import { Field, Toggle, cn } from "@/admin/components/ui";

export function mediaToImage(item: MediaItem): ApiImage {
  return {
    public_id: item.public_id,
    url: item.secureUrl || item.url,
    thumbnailUrl: item.thumbnailUrl,
    width: item.width,
    height: item.height,
    format: item.format,
    bytes: item.bytes,
    alt: item.alt || "",
    caption: item.caption || "",
    title: item.title || "",
    credit: item.credit || "",
    redirectUrl: item.redirectUrl || "",
  };
}

/**
 * Editor for the shared image sub-schema: source, presentation metadata and
 * the behaviour flags the frontend reads (lazy load, priority, nofollow…).
 */
export function ImageField({
  label,
  value,
  onChange,
  showAdvanced = true,
  className,
}: {
  label: string;
  value?: ApiImage;
  onChange: (image: ApiImage | undefined) => void;
  showAdvanced?: boolean;
  className?: string;
}) {
  const [picking, setPicking] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const image = value || {};
  const patch = (next: Partial<ApiImage>) => onChange({ ...image, ...next });

  return (
    <div className={cn("rounded-xl border border-ink-200 p-3 dark:border-ink-700", className)}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500 dark:text-ink-400">
          {label}
        </p>
        <div className="flex items-center gap-1.5">
          <button type="button" className="adm-btn-ghost adm-btn-sm" onClick={() => setPicking(true)}>
            <Images className="h-3.5 w-3.5" />
            Library
          </button>
          {image.url && (
            <button
              type="button"
              className="adm-btn-ghost adm-btn-sm text-rose-600"
              onClick={() => onChange(undefined)}
              aria-label={`Remove ${label}`}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      <div className="flex gap-3">
        <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-ink-200 bg-ink-50 dark:border-ink-700 dark:bg-ink-800">
          {image.url ? (
            <img src={image.thumbnailUrl || image.url} alt="" className="h-full w-full object-cover" />
          ) : (
            <ImageIcon className="h-5 w-5 text-ink-300" />
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <input
            value={image.url || ""}
            onChange={(event) => patch({ url: event.target.value })}
            placeholder="https://image-url…"
            className="adm-input"
          />
          <input
            value={image.alt || ""}
            onChange={(event) => patch({ alt: event.target.value })}
            placeholder="Alt text (accessibility + SEO)"
            className="adm-input"
          />
        </div>
      </div>

      {showAdvanced && (
        <>
          <button
            type="button"
            onClick={() => setExpanded((prev) => !prev)}
            className="mt-2.5 text-[11px] font-bold text-brand-600 hover:underline dark:text-brand-400"
          >
            {expanded ? "Hide" : "Show"} caption, credit & behaviour
          </button>

          {expanded && (
            <div className="mt-3 space-y-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Caption">
                  <input
                    value={image.caption || ""}
                    onChange={(event) => patch({ caption: event.target.value })}
                    className="adm-input"
                  />
                </Field>
                <Field label="Title attribute">
                  <input
                    value={image.title || ""}
                    onChange={(event) => patch({ title: event.target.value })}
                    className="adm-input"
                  />
                </Field>
                <Field label="Credit">
                  <input
                    value={image.credit || ""}
                    onChange={(event) => patch({ credit: event.target.value })}
                    className="adm-input"
                  />
                </Field>
                <Field label="Redirect URL" hint="Clicking the image opens this link">
                  <input
                    value={image.redirectUrl || ""}
                    onChange={(event) => patch({ redirectUrl: event.target.value })}
                    className="adm-input"
                  />
                </Field>
                <Field label="Width">
                  <input
                    type="number"
                    value={image.width ?? ""}
                    onChange={(event) =>
                      patch({ width: event.target.value ? Number(event.target.value) : undefined })
                    }
                    className="adm-input"
                  />
                </Field>
                <Field label="Height">
                  <input
                    type="number"
                    value={image.height ?? ""}
                    onChange={(event) =>
                      patch({ height: event.target.value ? Number(event.target.value) : undefined })
                    }
                    className="adm-input"
                  />
                </Field>
              </div>

              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                <Toggle
                  label="Open link in new tab"
                  checked={image.openInNewTab !== false}
                  onChange={(v) => patch({ openInNewTab: v })}
                />
                <Toggle
                  label="nofollow link"
                  checked={image.nofollow !== false}
                  onChange={(v) => patch({ nofollow: v })}
                />
                <Toggle
                  label="Lazy load"
                  checked={image.lazyLoad !== false}
                  onChange={(v) => patch({ lazyLoad: v })}
                />
                <Toggle
                  label="High priority (eager)"
                  checked={Boolean(image.priority)}
                  onChange={(v) => patch({ priority: v })}
                />
                <Toggle
                  label="Responsive"
                  checked={image.responsive !== false}
                  onChange={(v) => patch({ responsive: v })}
                />
              </div>
            </div>
          )}
        </>
      )}

      <MediaPicker
        open={picking}
        onClose={() => setPicking(false)}
        onSelect={(items) => {
          const first = items[0];
          if (first) onChange({ ...image, ...mediaToImage(first) });
        }}
      />
    </div>
  );
}
