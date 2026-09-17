import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowUp, Plus, Save, X } from "lucide-react";
import { articlesApi, categoriesApi, homepageApi } from "@/admin/lib/api";
import type {
  Article,
  HomepageConfig,
  HomepageRail,
  HomepageSectionKey,
  HomepageSections,
} from "@/admin/types";
import { SectionRailEditor } from "@/admin/components/SectionRailEditor";
import { BLANK_GALLERY, GalleryBlockEditor } from "@/admin/components/GalleryBlockEditor";
import {
  ErrorBlock,
  Field,
  LoadingBlock,
  SectionCard,
  Spinner,
} from "@/admin/components/ui";
import { useToast } from "@/admin/components/Toast";

const idOf = (value: unknown): string =>
  typeof value === "string" ? value : ((value as { _id?: string })?._id ?? "");

/**
 * Every rail on the homepage, in the order a reader meets them going down the
 * page — so the panel reads as the page rather than as a list of settings.
 * `slots` mirrors what the homepage actually renders.
 */
const RAILS: Array<{
  key: HomepageSectionKey;
  title: string;
  description: string;
  slots: number;
}> = [
  {
    key: "hero",
    title: "Hero slider",
    description: "The five slides at the top of the page, in order.",
    slots: 5,
  },
  {
    key: "heroRail",
    title: "Hero sidebar",
    description: "The four headlines stacked beside the hero.",
    slots: 4,
  },
  {
    key: "editorsPicks",
    title: "Editor's Picks",
    description: "Left column of the three-column block.",
    slots: 6,
  },
  {
    key: "featured",
    title: "Featured Articles",
    description: "The two-by-two grid in the middle of that block.",
    slots: 4,
  },
  {
    key: "popular",
    title: "Popular Now",
    description: "Ranked list in the right column. On automatic it ranks by reads.",
    slots: 6,
  },
  {
    key: "latest",
    title: "Latest Articles",
    description: "Two stories, left half of the row below the category strip.",
    slots: 2,
  },
  {
    key: "dontMiss",
    title: "Don't Miss",
    description: "Two stories, right half of that same row.",
    slots: 2,
  },
  {
    key: "moreStories",
    title: "More Stories",
    description: "The closing slider — five in view, the rest reached with the arrows.",
    slots: 10,
  },
];

export default function HomepageLayout() {
  const toast = useToast();
  const queryClient = useQueryClient();

  const [form, setForm] = useState<HomepageConfig>({
    mainTrending: null,
    subTrending: [],
    categorySections: [],
    customHomeBlocks: [],
    gallery: BLANK_GALLERY,
    sections: {},
  });

  const config = useQuery({ queryKey: ["homepage"], queryFn: () => homepageApi.get() });

  const articles = useQuery({
    queryKey: ["articles", "homepage-picker"],
    queryFn: () => articlesApi.list({ limit: 100, sort: "latest", status: "published" }),
  });

  const categories = useQuery({
    queryKey: ["categories", "all"],
    queryFn: () => categoriesApi.list({}),
  });

  useEffect(() => {
    const data = config.data;
    if (!data) return;
    setForm({
      mainTrending: idOf(data.mainTrending) || null,
      subTrending: (data.subTrending || []).map(idOf).filter(Boolean),
      categorySections: (data.categorySections || []).map((section) => ({
        category: idOf(section.category),
        trending: idOf(section.trending) || null,
        subTrending: (section.subTrending || []).map(idOf).filter(Boolean),
      })),
      customHomeBlocks: data.customHomeBlocks || [],
      // Items arrive populated so the panel can show titles and thumbnails;
      // they go back as ids on save.
      sections: data.sections || {},
      // A deployment that predates the gallery answers without the key; the
      // defaults keep the editor usable and the first save writes them back.
      gallery: {
        ...BLANK_GALLERY,
        ...(data.gallery || {}),
        rails: {
          left: { ...BLANK_GALLERY.rails?.left, ...(data.gallery?.rails?.left || {}) },
          right: { ...BLANK_GALLERY.rails?.right, ...(data.gallery?.rails?.right || {}) },
        },
        // Tiles arrive with their article populated; the API wants ids back.
        items: (data.gallery?.items || []).map((item) => ({
          ...item,
          article: idOf(item.article) || null,
        })),
      },
    });
  }, [config.data]);

  const save = useMutation({
    mutationFn: () => {
      const sectionsPayload = Object.entries(form.sections || {}).reduce<HomepageSections>(
        (acc, [key, rail]) => {
          acc[key as HomepageSectionKey] = {
            enabled: rail?.enabled !== false,
            mode: rail?.mode === "manual" ? "manual" : "auto",
            items: (rail?.items || []).map(idOf).filter(Boolean),
          };
          return acc;
        },
        {}
      );

      return homepageApi.update({ ...form, sections: sectionsPayload });
    },
    onSuccess: () => {
      toast.success("Homepage layout saved");
      void queryClient.invalidateQueries({ queryKey: ["homepage"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const options: Article[] = articles.data?.data ?? [];
  const categoryList = categories.data ?? [];

  if (config.isLoading) return <LoadingBlock label="Loading homepage layout…" />;
  if (config.isError) return <ErrorBlock error={config.error} onRetry={() => void config.refetch()} />;

  const subTrending = (form.subTrending as string[]) || [];
  const sections = form.categorySections || [];
  const rails = form.sections || {};

  const patchRail = (key: HomepageSectionKey, next: HomepageRail) =>
    setForm({ ...form, sections: { ...rails, [key]: next } });
  const blocks = form.customHomeBlocks || [];

  const moveBlock = (index: number, direction: -1 | 1) => {
    const next = [...blocks];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setForm({ ...form, customHomeBlocks: next.map((block, order) => ({ ...block, order })) });
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-ink-900 dark:text-white">
            Homepage layout
          </h1>
          <p className="mt-0.5 text-sm text-ink-500">
            Every section of the homepage, top to bottom. Leave one on automatic and it behaves as
            it always has; hand-pick it and your order is what readers see.
          </p>
        </div>
        <button type="button" className="adm-btn-primary" onClick={() => save.mutate()} disabled={save.isPending}>
          {save.isPending ? <Spinner /> : <Save className="h-4 w-4" />}
          Save layout
        </button>
      </header>

      {RAILS.map((rail) => (
        <SectionRailEditor
          key={rail.key}
          title={rail.title}
          description={rail.description}
          slots={rail.slots}
          value={rails[rail.key]}
          articles={options}
          onChange={(next) => patchRail(rail.key, next)}
        />
      ))}

      <SectionCard
        title="Hero story (legacy)"
        description="The single lead story used when the hero slider is on automatic. Article flags can override it on the live site."
      >
        <Field label="Main trending article">
          <select
            value={(form.mainTrending as string) || ""}
            onChange={(event) => setForm({ ...form, mainTrending: event.target.value || null })}
            className="adm-select"
          >
            <option value="">None selected</option>
            {options.map((article) => (
              <option key={article._id} value={article._id}>
                {article.title}
              </option>
            ))}
          </select>
        </Field>
      </SectionCard>

      <SectionCard
        title="Hero rail (legacy)"
        description="Kept from the previous panel; the Hero sidebar section above is what the homepage reads."
        actions={
          <button
            type="button"
            className="adm-btn-ghost adm-btn-sm"
            disabled={subTrending.length >= 5}
            onClick={() => setForm({ ...form, subTrending: [...subTrending, ""] })}
          >
            <Plus className="h-3.5 w-3.5" />
            Add slot
          </button>
        }
      >
        {subTrending.length === 0 ? (
          <p className="py-3 text-sm text-ink-500">No rail stories selected.</p>
        ) : (
          <div className="space-y-2">
            {subTrending.map((value, index) => (
              <div key={index} className="flex gap-2">
                <select
                  value={value}
                  onChange={(event) => {
                    const next = [...subTrending];
                    next[index] = event.target.value;
                    setForm({ ...form, subTrending: next });
                  }}
                  className="adm-select"
                >
                  <option value="">Select an article…</option>
                  {options.map((article) => (
                    <option key={article._id} value={article._id}>
                      {article.title}
                    </option>
                  ))}
                </select>
                <button
                  type="button"
                  className="adm-btn-ghost adm-btn-sm shrink-0 text-rose-600"
                  onClick={() =>
                    setForm({ ...form, subTrending: subTrending.filter((_, i) => i !== index) })
                  }
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <GalleryBlockEditor
        value={form.gallery || BLANK_GALLERY}
        articles={options}
        onChange={(gallery) => setForm({ ...form, gallery })}
      />

      <SectionCard
        title="Category sections"
        description="Blocks that run on the homepage between the mid-page banner and Explore by Category — a lead story plus four more from that category. Sections appear in the order added, and anything left unselected fills itself from that category's latest."
        actions={
          <button
            type="button"
            className="adm-btn-ghost adm-btn-sm"
            onClick={() =>
              setForm({
                ...form,
                categorySections: [...sections, { category: "", trending: null, subTrending: [] }],
              })
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Add section
          </button>
        }
      >
        {sections.length === 0 ? (
          <p className="py-3 text-sm text-ink-500">No category sections configured.</p>
        ) : (
          <div className="space-y-4">
            {sections.map((section, index) => {
              const sectionSubs = (section.subTrending as string[]) || [];
              const update = (next: Partial<typeof section>) => {
                const list = [...sections];
                list[index] = { ...list[index], ...next };
                setForm({ ...form, categorySections: list });
              };

              return (
                <div key={index} className="rounded-xl border border-ink-200 p-3 dark:border-ink-700">
                  <div className="mb-3 flex items-center justify-between">
                    <p className="text-[11px] font-bold uppercase tracking-wide text-ink-500">
                      Section {index + 1}
                    </p>
                    <button
                      type="button"
                      className="adm-btn-ghost adm-btn-sm text-rose-600"
                      onClick={() =>
                        setForm({
                          ...form,
                          categorySections: sections.filter((_, i) => i !== index),
                        })
                      }
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <Field label="Category">
                      <select
                        value={(section.category as string) || ""}
                        onChange={(event) => update({ category: event.target.value })}
                        className="adm-select"
                      >
                        <option value="">Select…</option>
                        {categoryList.map((category) => (
                          <option key={category._id} value={category._id}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </Field>

                    <Field label="Lead article" hint="Left empty, the category's newest story leads.">
                      <select
                        value={(section.trending as string) || ""}
                        onChange={(event) => update({ trending: event.target.value || null })}
                        className="adm-select"
                      >
                        <option value="">None</option>
                        {options.map((article) => (
                          <option key={article._id} value={article._id}>
                            {article.title}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>

                  <div className="mt-3">
                    <div className="mb-1.5 flex items-center justify-between">
                      <p className="adm-label mb-0">Articles beside the lead (max 4)</p>
                      <button
                        type="button"
                        className="adm-btn-ghost adm-btn-sm"
                        disabled={sectionSubs.length >= 4}
                        onClick={() => update({ subTrending: [...sectionSubs, ""] })}
                      >
                        <Plus className="h-3 w-3" />
                        Add
                      </button>
                    </div>

                    <div className="space-y-2">
                      {sectionSubs.map((value, subIndex) => (
                        <div key={subIndex} className="flex gap-2">
                          <select
                            value={value}
                            onChange={(event) => {
                              const next = [...sectionSubs];
                              next[subIndex] = event.target.value;
                              update({ subTrending: next });
                            }}
                            className="adm-select"
                          >
                            <option value="">Select an article…</option>
                            {options.map((article) => (
                              <option key={article._id} value={article._id}>
                                {article.title}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            className="adm-btn-ghost adm-btn-sm shrink-0 text-rose-600"
                            onClick={() =>
                              update({ subTrending: sectionSubs.filter((_, i) => i !== subIndex) })
                            }
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Custom promo blocks"
        description="Free-form tiles (title, link, image) rendered by the homepage."
        actions={
          <button
            type="button"
            className="adm-btn-ghost adm-btn-sm"
            onClick={() =>
              setForm({
                ...form,
                customHomeBlocks: [...blocks, { title: "", link: "", image: "", order: blocks.length }],
              })
            }
          >
            <Plus className="h-3.5 w-3.5" />
            Add block
          </button>
        }
      >
        {blocks.length === 0 ? (
          <p className="py-3 text-sm text-ink-500">No custom blocks.</p>
        ) : (
          <div className="space-y-3">
            {blocks.map((block, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-xl border border-ink-200 p-3 sm:grid-cols-[1fr_1fr_1fr_auto] dark:border-ink-700"
              >
                <Field label="Title">
                  <input
                    value={block.title || ""}
                    onChange={(event) => {
                      const next = [...blocks];
                      next[index] = { ...next[index], title: event.target.value };
                      setForm({ ...form, customHomeBlocks: next });
                    }}
                    className="adm-input"
                  />
                </Field>
                <Field label="Link">
                  <input
                    value={block.link || ""}
                    onChange={(event) => {
                      const next = [...blocks];
                      next[index] = { ...next[index], link: event.target.value };
                      setForm({ ...form, customHomeBlocks: next });
                    }}
                    className="adm-input"
                  />
                </Field>
                <Field label="Image URL">
                  <input
                    value={block.image || ""}
                    onChange={(event) => {
                      const next = [...blocks];
                      next[index] = { ...next[index], image: event.target.value };
                      setForm({ ...form, customHomeBlocks: next });
                    }}
                    className="adm-input"
                  />
                </Field>
                <div className="flex items-end gap-1">
                  <button
                    type="button"
                    className="adm-btn-ghost adm-btn-sm px-2"
                    onClick={() => moveBlock(index, -1)}
                    disabled={index === 0}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="adm-btn-ghost adm-btn-sm px-2"
                    onClick={() => moveBlock(index, 1)}
                    disabled={index === blocks.length - 1}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </button>
                  <button
                    type="button"
                    className="adm-btn-ghost adm-btn-sm px-2 text-rose-600"
                    onClick={() =>
                      setForm({ ...form, customHomeBlocks: blocks.filter((_, i) => i !== index) })
                    }
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
