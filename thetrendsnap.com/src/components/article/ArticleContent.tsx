import { useMemo } from "react";
import DOMPurify from "dompurify";
import type { Article, ContentBlock } from "@/types/api";
import { SmartImage } from "@/components/ui/SmartImage";
import { imageUrl } from "@/lib/utils";

const slugifyHeading = (text: string, index: number) =>
  `h-${index}-${text.toLowerCase().replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 48) || "section"}`;

/** Links inside article HTML always open safely. */
DOMPurify.addHook("afterSanitizeAttributes", (node) => {
  if (node.tagName === "A" && node.getAttribute("href")?.startsWith("http")) {
    if (!node.getAttribute("target")) node.setAttribute("target", "_blank");

    // Keep whatever the editor set (sponsored, nofollow…) and add the safety
    // tokens on top instead of replacing the attribute.
    const rel = new Set((node.getAttribute("rel") || "").split(/\s+/).filter(Boolean));
    rel.add("noopener");
    rel.add("noreferrer");
    node.setAttribute("rel", [...rel].join(" "));
  }
  if (node.tagName === "IMG") {
    node.setAttribute("loading", "lazy");
    node.setAttribute("decoding", "async");
    // Guarantee a pasted image can never overflow the article column.
    const style = node.getAttribute("style") || "";
    if (!/max-width/i.test(style)) {
      node.setAttribute("style", `${style}${style ? "; " : ""}max-width: 100%`);
    }
  }
});

function sanitize(html: string): string {
  const clean = DOMPurify.sanitize(html, {
    ADD_TAGS: ["iframe", "figure", "figcaption", "font", "center", "mark"],
    // `style`, `width`/`height`, alignment and table spans are what make pasted
    // content render exactly as it did in the source document.
    ADD_ATTR: [
      "allow", "allowfullscreen", "frameborder", "target", "loading", "decoding",
      "style", "width", "height", "align", "valign", "colspan", "rowspan",
      "start", "type", "reversed", "color", "face", "size", "bgcolor",
      "cellpadding", "cellspacing", "border",
    ],
  });

  // Wide editorial tables scroll inside their own box instead of stretching
  // the article column on small screens.
  const wrapped = clean
    .replace(/<table/gi, '<div class="table-scroll"><table')
    .replace(/<\/table>/gi, "</table></div>");

  // Stamp ids on headings so the table of contents can link to them, and mark
  // images so the page knows which ones already carry a redirect link.
  const doc = new DOMParser().parseFromString(wrapped, "text/html");

  Array.from(doc.querySelectorAll("h2, h3")).forEach((heading, index) => {
    if (!heading.id) heading.id = slugifyHeading(heading.textContent || "", index);
  });

  Array.from(doc.querySelectorAll("img")).forEach((img) => {
    const linked = Boolean(img.closest("a[href]"));
    img.setAttribute("data-linked", linked ? "true" : "false");
    if (linked) img.setAttribute("title", img.getAttribute("title") || "Opens a link");
  });

  return doc.body.innerHTML;
}

/**
 * Renders `content` (rich HTML from the editor) when present and falls back to
 * the legacy `contentBlocks` array, exactly like the backend documents.
 */
export function ArticleContent({
  article,
  onImageClick,
}: {
  article: Article;
  /** Called for images that do not already link somewhere. */
  onImageClick?: (image: { src: string; alt: string; caption: string }) => void;
}) {
  const handleClick = (event: React.MouseEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement;
    if (target.tagName !== "IMG") return;

    const img = target as HTMLImageElement;
    // A linked image must follow its link, never open the viewer.
    if (img.closest("a[href]")) return;
    if (!onImageClick) return;

    event.preventDefault();
    onImageClick({
      src: img.currentSrc || img.src,
      alt: img.alt || "",
      caption:
        img.closest("figure")?.querySelector("figcaption")?.textContent?.trim() ||
        img.getAttribute("data-caption") ||
        "",
    });
  };

  const html = useMemo(() => {
    const raw = article.content?.trim() || article.longDescription?.trim() || "";
    return raw ? sanitize(raw) : "";
  }, [article.content, article.longDescription]);

  if (html) {
    return (
      <div
        className="article-body"
        onClick={handleClick}
        // Sanitised above; the backend also sanitises on write.
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  const blocks = article.contentBlocks || [];

  if (blocks.length) {
    return (
      <div className="article-body" onClick={handleClick}>
        {blocks.map((block, index) => (
          <Block key={index} block={block} />
        ))}
      </div>
    );
  }

  return (
    <div className="article-body">
      {(article.description || "")
        .split(/\n{1,}/)
        .filter((line) => line.trim())
        .map((line, index) => (
          <p key={index}>{line}</p>
        ))}
    </div>
  );
}

function Block({ block }: { block: ContentBlock }) {
  const value = block.value;

  switch (block.type) {
    // Editors store rich HTML inside "text" blocks as well as "html" blocks,
    // so both go through the sanitiser rather than being printed literally.
    case "text":
    case "html":
      return <div dangerouslySetInnerHTML={{ __html: sanitize(toHtml(value)) }} />;

    case "image": {
      const src = typeof value === "string" ? value : imageUrl(value as never);
      const caption = (block.meta?.caption as string) || "";
      if (!src) return null;
      return (
        <figure>
          <SmartImage src={src} alt={caption || "Article image"} ratio="aspect-[16/9]" fit="contain" width={900} />
          {caption && <figcaption>{caption}</figcaption>}
        </figure>
      );
    }

    case "quote":
      return <blockquote>{String(value ?? "")}</blockquote>;

    case "link":
    case "affiliate": {
      const href = typeof value === "string" ? value : (value as { link?: string })?.link;
      const label =
        (block.meta?.label as string) ||
        (value as { title?: string })?.title ||
        href ||
        "Read more";
      if (!href) return null;
      return (
        <p>
          <a href={href} target="_blank" rel="noopener noreferrer sponsored">
            {label}
          </a>
        </p>
      );
    }

    case "video":
    case "embed": {
      const src = typeof value === "string" ? value : (value as { url?: string })?.url;
      if (!src) return null;
      const embed = toEmbedUrl(src);
      return embed ? (
        <iframe
          src={embed}
          title="Embedded video"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
        />
      ) : (
        <video src={src} controls className="w-full rounded-xl" />
      );
    }

    default:
      return <div dangerouslySetInnerHTML={{ __html: sanitize(toHtml(value)) }} />;
  }
}

/** Blocks hold either a raw string or an object with a text-ish field. */
function toHtml(value: unknown): string {
  if (typeof value === "string") {
    // Plain text (no tags) still needs paragraph breaks.
    return /<[a-z][\s\S]*>/i.test(value)
      ? value
      : value
          .split(/\n{2,}/)
          .filter((part) => part.trim())
          .map((part) => `<p>${part.replace(/\n/g, "<br />")}</p>`)
          .join("");
  }

  if (value && typeof value === "object") {
    const record = value as Record<string, unknown>;
    const text = record.html ?? record.text ?? record.content ?? "";
    return typeof text === "string" ? text : "";
  }

  return "";
}

export function toEmbedUrl(url: string): string | null {
  const youtube = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{6,})/
  );
  if (youtube) return `https://www.youtube.com/embed/${youtube[1]}`;

  const vimeo = url.match(/vimeo\.com\/(\d+)/);
  if (vimeo) return `https://player.vimeo.com/video/${vimeo[1]}`;

  return null;
}
