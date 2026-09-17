/**
 * Helpers for pasting rich content (Notes, Word, Google Docs, web pages) into
 * the article editor without dragging their styling along.
 */

const BLOCKED_TAGS = new Set([
  "SCRIPT", "STYLE", "LINK", "META", "TITLE", "BASE", "NOSCRIPT",
  "FORM", "INPUT", "BUTTON", "SELECT", "TEXTAREA", "OBJECT", "EMBED",
  "IFRAME", "SVG", "CANVAS", "XML",
]);

/**
 * Attributes worth keeping. `style` is deliberately kept — that is what makes a
 * paste from Notes, Word, Docs or a web page look identical here — while
 * `class`/`id` are dropped because they would resolve against *this* site's
 * stylesheet and silently restyle the content.
 */
const KEEP_ATTRS = new Set([
  "style", "href", "target", "rel", "src", "srcset", "sizes", "alt", "title",
  "width", "height", "align", "valign", "colspan", "rowspan", "start", "type",
  "reversed", "value", "cite", "datetime", "dir", "lang", "color", "face", "size",
  "border", "cellpadding", "cellspacing", "bgcolor",
  "data-redirect", "data-caption", "data-credit",
]);

/** CSS declarations that can break out of the article are dropped. */
const BLOCKED_CSS = /^(position|z-index|top|left|right|bottom|transform|animation|transition|content|cursor|pointer-events|user-select|will-change|filter|mix-blend-mode|isolation)$/i;

function sanitizeStyle(style: string): string {
  return style
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(Boolean)
    .filter((declaration) => {
      const [property, ...rest] = declaration.split(":");
      const value = rest.join(":");
      if (!property || !value) return false;
      if (BLOCKED_CSS.test(property.trim())) return false;
      if (/url\s*\(\s*['"]?\s*javascript:/i.test(value)) return false;
      if (/expression\s*\(/i.test(value)) return false;
      return true;
    })
    .join("; ");
}

/**
 * Keeps a paste looking exactly like its source.
 *
 * Everything visual survives — bold, italics, colours, font sizes and families,
 * alignment, spacing, lists, tables, links, images and their dimensions. Only
 * executable or layout-escaping markup is removed.
 */
export function cleanPastedHtml(html: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");

  // Office/Docs wrappers and anything executable.
  doc.querySelectorAll("script, style, link, meta, title, noscript, form, input, button, object, embed, iframe, canvas, o\\:p").forEach((node) => node.remove());

  // Comments (Word ships conditional comments full of markup).
  const walker = doc.createTreeWalker(doc.body, NodeFilter.SHOW_COMMENT);
  const comments: Comment[] = [];
  while (walker.nextNode()) comments.push(walker.currentNode as Comment);
  comments.forEach((comment) => comment.remove());

  const clean = (node: Element) => {
    Array.from(node.children).forEach((child) => clean(child));

    if (BLOCKED_TAGS.has(node.tagName)) {
      node.remove();
      return;
    }

    Array.from(node.attributes).forEach((attr) => {
      const name = attr.name.toLowerCase();

      if (name.startsWith("on")) {
        node.removeAttribute(attr.name);
        return;
      }

      if (name === "style") {
        const safe = sanitizeStyle(attr.value);
        if (safe) node.setAttribute("style", safe);
        else node.removeAttribute("style");
        return;
      }

      // `class`/`id` would hit this site's own CSS, so they go.
      if (!KEEP_ATTRS.has(name)) node.removeAttribute(attr.name);
    });

    if (node.tagName === "A") {
      const href = node.getAttribute("href") || "";
      if (/^\s*(javascript|vbscript|data:text\/html)/i.test(href)) node.removeAttribute("href");
    }

    if (node.tagName === "IMG") {
      // Width/height attributes lose to our stylesheet, so pin the size the
      // source used as inline style — the image then keeps its exact size.
      const width = node.getAttribute("width");
      const height = node.getAttribute("height");
      const style = node.getAttribute("style") || "";

      const extra: string[] = [];
      if (width && !/(^|;)\s*width\s*:/i.test(style)) {
        extra.push(`width: ${/^\d+$/.test(width) ? `${width}px` : width}`);
      }
      if (height && !/(^|;)\s*height\s*:/i.test(style)) {
        extra.push(`height: ${/^\d+$/.test(height) ? `${height}px` : height}`);
      }
      if (extra.length) {
        node.setAttribute("style", [style, ...extra].filter(Boolean).join("; "));
      }
      // Never let a pasted image overflow the column.
      const finalStyle = node.getAttribute("style") || "";
      if (!/max-width/i.test(finalStyle)) {
        node.setAttribute("style", `${finalStyle}${finalStyle ? "; " : ""}max-width: 100%`);
      }
    }
  };

  Array.from(doc.body.children).forEach((child) => clean(child));

  return doc.body.innerHTML.trim();
}

/** Plain-text pastes keep their line and paragraph breaks. */
export function textToHtml(text: string): string {
  return text
    .split(/\n{2,}/)
    .map((block) => `<p>${block.replace(/\n/g, "<br>").replace(/</g, "&lt;")}</p>`)
    .join("");
}

/** Data URLs (typical for images pasted out of Notes) become real files. */
export function dataUrlToFile(dataUrl: string, name = "pasted-image"): File | null {
  const match = dataUrl.match(/^data:([^;,]+)(;base64)?,(.*)$/);
  if (!match) return null;

  const [, mime, isBase64, payload] = match;
  const binary = isBase64 ? atob(payload) : decodeURIComponent(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

  const extension = (mime.split("/")[1] || "png").replace("jpeg", "jpg");
  return new File([bytes], `${name}-${Date.now()}.${extension}`, { type: mime });
}

export interface EditorImage {
  index: number;
  src: string;
  alt: string;
  redirectUrl: string;
  openInNewTab: boolean;
}

/** Lists every <img> in the article body plus any link wrapped around it. */
export function listImages(html: string): EditorImage[] {
  if (!html) return [];
  const doc = new DOMParser().parseFromString(html, "text/html");

  return Array.from(doc.querySelectorAll("img")).map((img, index) => {
    const anchor = img.closest("a");
    return {
      index,
      src: img.getAttribute("src") || "",
      alt: img.getAttribute("alt") || "",
      redirectUrl: anchor?.getAttribute("href") || "",
      openInNewTab: (anchor?.getAttribute("target") || "_blank") === "_blank",
    };
  });
}

/**
 * Applies a redirect link (and alt text) to the nth image, wrapping it in an
 * anchor — or unwrapping when the URL is cleared.
 */
export function applyImageLink(
  html: string,
  index: number,
  patch: { redirectUrl?: string; alt?: string; openInNewTab?: boolean }
): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  const images = Array.from(doc.querySelectorAll("img"));
  const img = images[index];
  if (!img) return html;

  if (patch.alt !== undefined) img.setAttribute("alt", patch.alt);

  const anchor = img.closest("a");
  const url = patch.redirectUrl !== undefined ? patch.redirectUrl.trim() : anchor?.getAttribute("href") || "";
  const newTab =
    patch.openInNewTab !== undefined
      ? patch.openInNewTab
      : (anchor?.getAttribute("target") || "_blank") === "_blank";

  if (!url) {
    // Clearing the link removes the wrapper but keeps the image in place.
    if (anchor) anchor.replaceWith(img);
  } else if (anchor) {
    anchor.setAttribute("href", url);
    anchor.setAttribute("target", newTab ? "_blank" : "_self");
    anchor.setAttribute("rel", "noopener noreferrer sponsored");
  } else {
    const link = doc.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("target", newTab ? "_blank" : "_self");
    link.setAttribute("rel", "noopener noreferrer sponsored");
    img.replaceWith(link);
    link.appendChild(img);
  }

  return doc.body.innerHTML;
}

/** Swaps one image source for another (used after uploading a pasted blob). */
export function replaceImageSrc(html: string, from: string, to: string): string {
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("img").forEach((img) => {
    if (img.getAttribute("src") === from) img.setAttribute("src", to);
  });
  return doc.body.innerHTML;
}
