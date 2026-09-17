import { useState } from "react";
import { ArrowDown, ArrowUp, Images, X } from "lucide-react";
import type {
  Article,
  GalleryRail,
  GalleryRailSize,
  GalleryRailWidth,
  GalleryRails,
  GallerySide,
  GalleryTile,
  HomepageGallery,
} from "@/admin/types";
import { MediaPicker } from "@/admin/components/MediaPicker";
import { Field, SectionCard, Toggle, cn } from "@/admin/components/ui";

/** Four tiles: the grid is two by two and a partial row looks broken. */
const TILE_COUNT = 4;

const BLANK_TILE: GalleryTile = {
  article: null,
  image: "",
  title: "",
  category: "",
  link: "",
  order: 0,
};

export const BLANK_GALLERY: HomepageGallery = {
  enabled: true,
  title: "Snap Wall",
  subtitle: "Four frames from the stories everyone is watching right now.",
  actionLabel: "Open the wall",
  actionLink: "/gallery",
  source: "auto",
  items: [],
  rails: {
    // On by default: the side stays invisible until an ad is booked at its
    // slot, so this only removes a setup step, it never opens a gap.
    left: { enabled: true, width: "narrow", type: "ad", size: "auto", adPosition: "home-gallery-left", heading: "", image: "", imageAlt: "", link: "", openInNewTab: true, stretch: false },
    right: { enabled: true, width: "narrow", type: "ad", size: "auto", adPosition: "home-gallery-right", heading: "", image: "", imageAlt: "", link: "", openInNewTab: true, stretch: false },
  },
};

/** Columns each rail takes, matching the frontend's arithmetic. */
const RAIL_COLS: Record<GalleryRailWidth, number> = { narrow: 3, medium: 4, wide: 5 };
const PAIRED_MAX_COLS = 3;
const WIDTH_LABEL: Record<GalleryRailWidth, string> = {
  narrow: "Narrow — 3 of 12 columns",
  medium: "Medium — 4 of 12 columns",
  wide: "Wide — 5 of 12 columns",
};

/**
 * How the rail frames its creative. "Auto" is the default and holds no frame,
 * so the banner fills the rail's width at its own proportions — the only
 * setting that leaves no empty space around the artwork.
 */
const RAIL_SIZE_LABEL: Record<GalleryRailSize, string> = {
  auto: "Auto — full banner, no empty space (recommended)",
  "300x250": "300 × 250 — medium rectangle",
  "300x600": "300 × 600 — half page",
  "160x600": "160 × 600 — wide skyscraper",
};

const SIDES: Array<{ key: GallerySide; label: string; slot: string }> = [
  { key: "left", label: "Left rail", slot: "home-gallery-left" },
  { key: "right", label: "Right rail", slot: "home-gallery-right" },
];

const idOf = (value: unknown): string =>
  typeof value === "string" ? value : ((value as { _id?: string })?._id ?? "");

/* ------------------------------------------------------------------ */
/* Image input with a media-library button                             */
/* ------------------------------------------------------------------ */

function ImageUrlField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
}) {
  const [picking, setPicking] = useState(false);

  return (
    <Field label={label} hint={hint}>
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder="https://…"
          className="adm-input"
        />
        <button
          type="button"
          className="adm-btn-ghost adm-btn-sm shrink-0"
          onClick={() => setPicking(true)}
        >
          <Images className="h-3.5 w-3.5" />
          Library
        </button>
        {value && (
          <button
            type="button"
            className="adm-btn-ghost adm-btn-sm shrink-0 text-rose-600"
            onClick={() => onChange("")}
            aria-label={`Clear ${label}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        )}
      </div>

      {value && (
        <img
          src={value}
          alt=""
          className="mt-2 h-20 w-20 rounded-lg border border-ink-200 object-contain dark:border-ink-700"
        />
      )}

      <MediaPicker
        open={picking}
        onClose={() => setPicking(false)}
        onSelect={(items) => {
          const first = items[0];
          if (first) onChange(first.secureUrl || first.url);
          setPicking(false);
        }}
      />
    </Field>
  );
}

/* ------------------------------------------------------------------ */
/* Layout schematic                                                    */
/* ------------------------------------------------------------------ */

/**
 * Shows what the row will look like once saved. It is the quickest way to see
 * that a wide rail really does shrink the grid, rather than trusting the
 * numbers in the select.
 */
function LayoutPreview({ rails }: { rails: Required<GalleryRails> }) {
  const leftOn = Boolean(rails.left.enabled);
  const rightOn = Boolean(rails.right.enabled);
  const paired = leftOn && rightOn;

  const cols = (rail: GalleryRail) => {
    const raw = RAIL_COLS[rail.width && RAIL_COLS[rail.width] ? rail.width : "narrow"];
    return paired ? Math.min(raw, PAIRED_MAX_COLS) : raw;
  };
  const leftCols = leftOn ? cols(rails.left) : 0;
  const rightCols = rightOn ? cols(rails.right) : 0;
  const gridCols = 12 - leftCols - rightCols;

  const box = (rail: GalleryRail, span: number, label: string) => (
    <div
      className="flex items-center justify-center rounded-lg border border-dashed border-brand-400 bg-brand-50 px-1 py-6 text-center text-[10px] font-bold uppercase tracking-wide text-brand-600 dark:bg-brand-500/10 dark:text-brand-300"
      style={{ gridColumn: `span ${span} / span ${span}` }}
    >
      {label}
      <br />
      {rail.type === "banner" ? "banner" : "ad"}
    </div>
  );

  const note = paired
    ? "A rail on each side: each is capped at 3 of 12 columns and the tiles lock to two by two, so the banners face each other across a square block."
    : leftOn || rightOn
      ? `One rail: the tiles take ${gridCols} of 12 columns and return to a single row once there is room.`
      : "No rails: the tiles spread across the full row in a single line, so no space is left at the edges.";

  return (
    <div className="rounded-xl border border-ink-200 p-3 dark:border-ink-700">
      <p className="adm-label">Row preview</p>
      <div className="grid grid-cols-12 gap-2">
        {leftOn && box(rails.left, leftCols, "Left")}
        <div
          className={cn("grid gap-2", gridCols >= 12 ? "grid-cols-4" : "grid-cols-2")}
          style={{ gridColumn: `span ${gridCols} / span ${gridCols}` }}
        >
          {Array.from({ length: TILE_COUNT }).map((_, index) => (
            <div key={index} className="aspect-square rounded-lg bg-ink-200/70 dark:bg-ink-700/70" />
          ))}
        </div>
        {rightOn && box(rails.right, rightCols, "Right")}
      </div>
      <p className="mt-2 text-[11px] text-ink-400">
        {note} Below 1024px the rails stack under the tiles.
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* One rail                                                            */
/* ------------------------------------------------------------------ */

function RailEditor({
  side,
  label,
  slot,
  rail,
  onChange,
}: {
  side: GallerySide;
  label: string;
  slot: string;
  rail: GalleryRail;
  onChange: (next: Partial<GalleryRail>) => void;
}) {
  return (
    <div className="rounded-xl border border-ink-200 p-3 dark:border-ink-700">
      <p className="mb-3 text-[11px] font-bold uppercase tracking-wide text-ink-500">{label}</p>

      <div className="space-y-3">
        <Toggle
          checked={Boolean(rail.enabled)}
          onChange={(enabled) => onChange({ enabled })}
          label={`Show a banner or ad on the ${side}`}
          hint="If the slot has no ad booked, this rail is skipped and the tiles spread back out — no gap is ever left at the edge."
        />

        {rail.enabled && (
          <>
            <div className="grid gap-3 sm:grid-cols-3">
              <Field label="Width">
                <select
                  value={rail.width || "narrow"}
                  onChange={(event) => onChange({ width: event.target.value as GalleryRailWidth })}
                  className="adm-select"
                >
                  {(Object.keys(RAIL_COLS) as GalleryRailWidth[]).map((key) => (
                    <option key={key} value={key}>
                      {WIDTH_LABEL[key]}
                    </option>
                  ))}
                </select>
              </Field>

              <Field
                label="Creative size"
                hint="Auto shows the whole image at its own shape, edge to edge in the rail. A fixed size keeps one height across rotations but leaves space around a shorter creative."
              >
                <select
                  value={rail.size || "auto"}
                  onChange={(event) => onChange({ size: event.target.value as GalleryRailSize })}
                  className="adm-select"
                >
                  {(Object.keys(RAIL_SIZE_LABEL) as GalleryRailSize[]).map((key) => (
                    <option key={key} value={key}>
                      {RAIL_SIZE_LABEL[key]}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Content">
                <select
                  value={rail.type || "ad"}
                  onChange={(event) => onChange({ type: event.target.value as GalleryRail["type"] })}
                  className="adm-select"
                >
                  <option value="ad">Booked ad slot</option>
                  <option value="banner">Custom banner image</option>
                </select>
              </Field>
            </div>

            {rail.type === "ad" ? (
              <Field
                label="Ad slot"
                hint={`Book the creative under Advertisements with position "${slot}".`}
              >
                <input
                  value={rail.adPosition || slot}
                  onChange={(event) => onChange({ adPosition: event.target.value })}
                  className="adm-input"
                />
              </Field>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                <ImageUrlField
                  label="Banner image"
                  value={rail.image || ""}
                  onChange={(image) => onChange({ image })}
                  hint="Shown at its own aspect ratio, so it is never cropped. 300x250 or 300x600 both work."
                />
                <div className="space-y-3">
                  <Field label="Alt text">
                    <input
                      value={rail.imageAlt || ""}
                      onChange={(event) => onChange({ imageAlt: event.target.value })}
                      className="adm-input"
                    />
                  </Field>
                  <Field label="Link">
                    <input
                      value={rail.link || ""}
                      onChange={(event) => onChange({ link: event.target.value })}
                      placeholder="https://…"
                      className="adm-input"
                    />
                  </Field>
                  <Toggle
                    checked={rail.openInNewTab !== false}
                    onChange={(openInNewTab) => onChange({ openInNewTab })}
                    label="Open the link in a new tab"
                  />
                </div>
              </div>
            )}

            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Rail heading" hint="Defaults to “Advertisement”.">
                <input
                  value={rail.heading || ""}
                  onChange={(event) => onChange({ heading: event.target.value })}
                  className="adm-input"
                />
              </Field>
              {(rail.size || "auto") !== "auto" && (
                <div className="flex items-end">
                  <Toggle
                    checked={rail.stretch === true}
                    onChange={(stretch) => onChange({ stretch })}
                    label="Match the tile grid's height"
                    hint="Pulls the rail card down to the tiles' height. A creative shorter than that is centred, which leaves empty space above and below it — leave off to have the card end where the banner ends."
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Editor                                                              */
/* ------------------------------------------------------------------ */

export function GalleryBlockEditor({
  value,
  articles,
  onChange,
}: {
  value: HomepageGallery;
  articles: Article[];
  onChange: (next: HomepageGallery) => void;
}) {
  const gallery: HomepageGallery = { ...BLANK_GALLERY, ...value };
  const rails: Required<GalleryRails> = {
    left: { ...BLANK_GALLERY.rails?.left, ...(value.rails?.left || {}) },
    right: { ...BLANK_GALLERY.rails?.right, ...(value.rails?.right || {}) },
  };
  const items = gallery.items || [];

  const patch = (next: Partial<HomepageGallery>) => onChange({ ...gallery, ...next });
  const patchRail = (side: GallerySide, next: Partial<GalleryRail>) =>
    patch({ rails: { ...rails, [side]: { ...rails[side], ...next } } });

  /** Always writes back a dense four-slot list — a sparse array serialises as nulls. */
  const tileList = (): GalleryTile[] =>
    Array.from({ length: TILE_COUNT }, (_, i) => ({ ...BLANK_TILE, ...items[i], order: i }));

  const patchItem = (index: number, next: Partial<GalleryTile>) => {
    const list = tileList();
    list[index] = { ...list[index], ...next, order: index };
    patch({ items: list });
  };

  const moveItem = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= TILE_COUNT) return;
    const list = tileList();
    [list[index], list[target]] = [list[target], list[index]];
    patch({ items: list.map((item, order) => ({ ...item, order })) });
  };

  return (
    <SectionCard
      title="Snap Wall section"
      description="Four square tiles below the Browse rail on the homepage, with an optional banner or ad beside them. Without a rail the tiles sit in one full-width row; with one they fall back to two by two."
      actions={
        <Toggle
          checked={gallery.enabled !== false}
          onChange={(enabled) => patch({ enabled })}
          label="Show on homepage"
        />
      }
    >
      <div className="space-y-4">
        {/* ---------------- heading ---------------- */}
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title">
            <input
              value={gallery.title || ""}
              onChange={(event) => patch({ title: event.target.value })}
              placeholder="Snap Wall"
              className="adm-input"
            />
          </Field>
          <Field label="Subtitle">
            <input
              value={gallery.subtitle || ""}
              onChange={(event) => patch({ subtitle: event.target.value })}
              className="adm-input"
            />
          </Field>
          <Field label="Link label" hint="Shown at the right of the heading.">
            <input
              value={gallery.actionLabel || ""}
              onChange={(event) => patch({ actionLabel: event.target.value })}
              placeholder="Open the wall"
              className="adm-input"
            />
          </Field>
          <Field label="Link target">
            <input
              value={gallery.actionLink || ""}
              onChange={(event) => patch({ actionLink: event.target.value })}
              placeholder="/gallery"
              className="adm-input"
            />
          </Field>
        </div>

        {/* ---------------- tiles ---------------- */}
        <Field
          label="Tiles"
          hint="Automatic keeps the four tiles filled from the newest stories. Curated pins them — any tile you leave incomplete is topped up automatically, so the grid is never half empty."
        >
          <select
            value={gallery.source || "auto"}
            onChange={(event) => {
              const source = event.target.value as "auto" | "manual";
              patch({
                source,
                // Give the editor four rows to fill the moment they switch.
                items:
                  source === "manual" && !items.length
                    ? Array.from({ length: TILE_COUNT }, (_, order) => ({ ...BLANK_TILE, order }))
                    : items,
              });
            }}
            className="adm-select"
          >
            <option value="auto">Automatic — newest stories</option>
            <option value="manual">Curated — pick each tile</option>
          </select>
        </Field>

        {gallery.source === "manual" && (
          <div className="space-y-3">
            {Array.from({ length: TILE_COUNT }).map((_, index) => {
              const item = items[index] || { ...BLANK_TILE, order: index };

              return (
                <div
                  key={index}
                  className="rounded-xl border border-ink-200 p-3 dark:border-ink-700"
                >
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">
                      Tile {index + 1}
                    </p>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        className="adm-btn-ghost adm-btn-sm px-2"
                        onClick={() => moveItem(index, -1)}
                        disabled={index === 0}
                        aria-label="Move up"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="adm-btn-ghost adm-btn-sm px-2"
                        onClick={() => moveItem(index, 1)}
                        disabled={index === TILE_COUNT - 1}
                        aria-label="Move down"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      <button
                        type="button"
                        className="adm-btn-ghost adm-btn-sm px-2 text-rose-600"
                        onClick={() => patchItem(index, { ...BLANK_TILE, order: index })}
                        aria-label="Clear tile"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Article" className="sm:col-span-2">
                      <select
                        value={idOf(item.article)}
                        onChange={(event) =>
                          patchItem(index, { article: event.target.value || null })
                        }
                        className="adm-select"
                      >
                        <option value="">None — custom tile</option>
                        {articles.map((article) => (
                          <option key={article._id} value={article._id}>
                            {article.title}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <ImageUrlField
                      label="Image override"
                      value={item.image || ""}
                      onChange={(image) => patchItem(index, { image })}
                      hint="Leave empty to use the article's featured image. Images are shown whole, never cropped."
                    />

                    <div className="space-y-3">
                      <Field label="Title override">
                        <input
                          value={item.title || ""}
                          onChange={(event) => patchItem(index, { title: event.target.value })}
                          className="adm-input"
                        />
                      </Field>
                      <Field label="Category label override">
                        <input
                          value={item.category || ""}
                          onChange={(event) => patchItem(index, { category: event.target.value })}
                          className="adm-input"
                        />
                      </Field>
                      <Field label="Link override" hint="A full URL opens in a new tab.">
                        <input
                          value={item.link || ""}
                          onChange={(event) => patchItem(index, { link: event.target.value })}
                          placeholder="/article/my-story"
                          className="adm-input"
                        />
                      </Field>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ---------------- rails ---------------- */}
        <div className="space-y-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">
            Banners / ads beside the wall
          </p>

          {SIDES.map((entry) => (
            <RailEditor
              key={entry.key}
              side={entry.key}
              label={entry.label}
              slot={entry.slot}
              rail={rails[entry.key]}
              onChange={(next) => patchRail(entry.key, next)}
            />
          ))}

          <LayoutPreview rails={rails} />
        </div>
      </div>
    </SectionCard>
  );
}
