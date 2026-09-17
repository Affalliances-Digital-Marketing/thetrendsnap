import { useMemo } from "react";
import { ExternalLink, ImageOff, Link2Off } from "lucide-react";
import { applyImageLink, listImages } from "@/admin/lib/paste";
import { Field, SectionCard, Toggle } from "@/admin/components/ui";

/**
 * Every image inside the article body, with a redirect link editor.
 *
 * Adding a URL wraps that image in an anchor (`target`/`rel` included), which
 * is exactly what the public article renderer already understands — clearing
 * the URL unwraps it again.
 */
export function ArticleImageLinks({
  content,
  onChange,
}: {
  content: string;
  onChange: (html: string) => void;
}) {
  const images = useMemo(() => listImages(content), [content]);

  return (
    <SectionCard
      title="Image links"
      description={
        images.length
          ? `${images.length} image(s) in the body — give any of them a redirect link.`
          : "Images you paste or insert into the body show up here."
      }
    >
      {images.length === 0 ? (
        <p className="flex items-center gap-2 py-3 text-sm text-ink-500">
          <ImageOff className="h-4 w-4" />
          No images in the article body yet.
        </p>
      ) : (
        <div className="space-y-3">
          {images.map((image) => (
            <div
              key={`${image.src}-${image.index}`}
              className="grid gap-3 rounded-xl border border-ink-200 p-3 sm:grid-cols-[96px_1fr] dark:border-ink-700"
            >
              <div className="relative">
                <img
                  src={image.src}
                  alt={image.alt}
                  className="h-24 w-24 rounded-lg border border-ink-200 object-cover dark:border-ink-700"
                  loading="lazy"
                />
                <span className="mt-1 block text-center text-[10px] font-bold uppercase tracking-wide text-ink-400">
                  #{image.index + 1}
                </span>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Redirect link" hint="Clicking the image opens this URL">
                  <div className="flex gap-2">
                    <input
                      value={image.redirectUrl}
                      onChange={(event) =>
                        onChange(applyImageLink(content, image.index, { redirectUrl: event.target.value }))
                      }
                      placeholder="https://example.com/offer"
                      className="adm-input"
                    />
                    {image.redirectUrl && (
                      <>
                        <a
                          href={image.redirectUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="adm-btn-ghost adm-btn-sm shrink-0"
                          title="Open link"
                        >
                          <ExternalLink className="h-3.5 w-3.5" />
                        </a>
                        <button
                          type="button"
                          className="adm-btn-ghost adm-btn-sm shrink-0 text-rose-600"
                          title="Remove link"
                          onClick={() =>
                            onChange(applyImageLink(content, image.index, { redirectUrl: "" }))
                          }
                        >
                          <Link2Off className="h-3.5 w-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                </Field>

                <Field label="Alt text" hint="Describes the image for search engines and screen readers">
                  <input
                    value={image.alt}
                    onChange={(event) =>
                      onChange(applyImageLink(content, image.index, { alt: event.target.value }))
                    }
                    className="adm-input"
                  />
                </Field>

                <div className="sm:col-span-2">
                  <Toggle
                    label="Open the link in a new tab"
                    checked={image.openInNewTab}
                    onChange={(value) =>
                      onChange(applyImageLink(content, image.index, { openInNewTab: value }))
                    }
                  />
                </div>

                <p className="clamp-1 sm:col-span-2 text-[11px] text-ink-400">{image.src}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  );
}
