import { useEffect, useRef, useState } from "react";
import type { ClipboardEvent as ReactClipboardEvent, DragEvent as ReactDragEvent } from "react";
import {
  Bold,
  Code2,
  Heading2,
  Heading3,
  ImagePlus,
  Italic,
  Link2,
  List,
  ListOrdered,
  Quote,
  Redo2,
  Table2,
  Underline,
  Undo2,
} from "lucide-react";
import { cn } from "@/admin/components/ui";
import { mediaApi } from "@/admin/lib/api";
import { cleanPastedHtml, dataUrlToFile, textToHtml } from "@/admin/lib/paste";
import { useToast } from "@/admin/components/Toast";

interface Props {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  onPickImage?: () => Promise<string | null>;
  /** Folder new uploads land in inside the media library. */
  uploadFolder?: string;
}

/**
 * Lightweight rich-text editor over `contenteditable`.
 *
 * The backend sanitises whatever it receives, so the editor's job is only to
 * produce clean-ish HTML. A source view is included for pasted markup.
 */
export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write the article…",
  onPickImage,
  uploadFolder = "article-body",
}: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [source, setSource] = useState(false);
  const [busy, setBusy] = useState(0);
  const toast = useToast();

  // Only push external changes in when they differ, so typing is never reset.
  useEffect(() => {
    const el = ref.current;
    if (!el || source) return;
    if (el.innerHTML !== value) el.innerHTML = value || "";
  }, [value, source]);

  const exec = (command: string, arg?: string) => {
    ref.current?.focus();
    document.execCommand(command, false, arg);
    onChange(ref.current?.innerHTML || "");
  };

  const insertHtml = (html: string) => {
    ref.current?.focus();
    document.execCommand("insertHTML", false, html);
    onChange(ref.current?.innerHTML || "");
  };

  const addLink = () => {
    const url = window.prompt("Link URL");
    if (!url) return;
    exec("createLink", url);
  };

  const addImage = async () => {
    let url: string | null = null;
    if (onPickImage) url = await onPickImage();
    if (!url) url = window.prompt("Image URL");
    if (!url) return;
    insertHtml(`<img src="${url}" alt="" />`);
  };

  const addTable = () => {
    const rows = Number(window.prompt("Rows", "3")) || 3;
    const cols = Number(window.prompt("Columns", "3")) || 3;
    const head = `<tr>${Array.from({ length: cols }, (_, i) => `<th>Head ${i + 1}</th>`).join("")}</tr>`;
    const body = Array.from(
      { length: Math.max(0, rows - 1) },
      () => `<tr>${Array.from({ length: cols }, () => "<td>&nbsp;</td>").join("")}</tr>`
    ).join("");
    insertHtml(`<table>${head}${body}</table><p><br/></p>`);
  };

  /** Uploads a blob to the media library and returns its permanent URL. */
  const uploadImage = async (file: File): Promise<string | null> => {
    setBusy((count) => count + 1);
    try {
      const res = await mediaApi.upload(file, { folder: uploadFolder, alt: "" });
      return res.data.secureUrl || res.data.url;
    } catch (error) {
      toast.error(`Image upload failed: ${(error as Error).message}`);
      return null;
    } finally {
      setBusy((count) => count - 1);
    }
  };

  /**
   * Paste handling:
   *  - image files on the clipboard are uploaded and inserted
   *  - rich HTML keeps its formatting but loses editor-specific styling
   *  - inline data: images inside that HTML are uploaded too, so nothing is
   *    left as a giant base64 blob inside the article body
   */
  const onPaste = async (event: ReactClipboardEvent<HTMLDivElement>) => {
    const clipboard = event.clipboardData;
    if (!clipboard) return;

    const files = Array.from(clipboard.files || []).filter((file) =>
      file.type.startsWith("image/")
    );

    if (files.length) {
      event.preventDefault();
      for (const file of files) {
        const url = await uploadImage(file);
        if (url) insertHtml(`<img src="${url}" alt="" style="max-width: 100%" />`);
      }
      if (files.length) toast.success(`${files.length} image(s) added`);
      return;
    }

    const html = clipboard.getData("text/html");

    if (!html) {
      // Plain text: keep the paragraph and line breaks the source had.
      const text = clipboard.getData("text/plain");
      if (!text) return;
      event.preventDefault();
      insertHtml(textToHtml(text));
      return;
    }

    event.preventDefault();
    // Formatting is preserved verbatim — see cleanPastedHtml.
    insertHtml(cleanPastedHtml(html));

    // Swap any base64 images that came along for uploaded copies.
    const holder = ref.current;
    if (!holder) return;

    const inline = Array.from(holder.querySelectorAll("img")).filter((img) =>
      (img.getAttribute("src") || "").startsWith("data:")
    );

    for (const img of inline) {
      const file = dataUrlToFile(img.getAttribute("src") || "", "pasted");
      if (!file) continue;

      // Remember the size the source used before swapping the source out.
      const style = img.getAttribute("style") || "";
      const url = await uploadImage(file);

      if (url) {
        img.setAttribute("src", url);
        if (style) img.setAttribute("style", style);
      } else {
        img.remove();
      }
    }

    if (inline.length) {
      onChange(holder.innerHTML);
      toast.success(`${inline.length} pasted image(s) uploaded`);
    }
  };

  /** Dropping image files works the same way as pasting them. */
  const onDrop = async (event: ReactDragEvent<HTMLDivElement>) => {
    const files = Array.from(event.dataTransfer?.files || []).filter((file) =>
      file.type.startsWith("image/")
    );
    if (!files.length) return;

    event.preventDefault();
    for (const file of files) {
      const url = await uploadImage(file);
      if (url) insertHtml(`<img src="${url}" alt="" style="max-width: 100%" />`);
    }
    toast.success(`${files.length} image(s) added`);
  };

  const tools = [
    { icon: Bold, label: "Bold", run: () => exec("bold") },
    { icon: Italic, label: "Italic", run: () => exec("italic") },
    { icon: Underline, label: "Underline", run: () => exec("underline") },
    { icon: Heading2, label: "Heading 2", run: () => exec("formatBlock", "<h2>") },
    { icon: Heading3, label: "Heading 3", run: () => exec("formatBlock", "<h3>") },
    { icon: List, label: "Bullet list", run: () => exec("insertUnorderedList") },
    { icon: ListOrdered, label: "Numbered list", run: () => exec("insertOrderedList") },
    { icon: Quote, label: "Quote", run: () => exec("formatBlock", "<blockquote>") },
    { icon: Link2, label: "Link", run: addLink },
    { icon: ImagePlus, label: "Image", run: addImage },
    { icon: Table2, label: "Table", run: addTable },
    { icon: Code2, label: "Code block", run: () => insertHtml("<pre><code>code</code></pre>") },
    { icon: Undo2, label: "Undo", run: () => exec("undo") },
    { icon: Redo2, label: "Redo", run: () => exec("redo") },
  ];

  return (
    <div>
      <div className="flex flex-wrap items-center gap-1 rounded-t-lg border border-ink-200 bg-ink-50 px-2 py-1.5 dark:border-ink-700 dark:bg-ink-800/70">
        {tools.map(({ icon: Icon, label, run }) => (
          <button
            key={label}
            type="button"
            title={label}
            aria-label={label}
            onClick={run}
            disabled={source}
            className="rounded-md p-1.5 text-ink-600 transition-colors hover:bg-white hover:text-brand-600 disabled:opacity-40 dark:text-ink-300 dark:hover:bg-ink-900"
          >
            <Icon className="h-4 w-4" />
          </button>
        ))}

        {busy > 0 && (
          <span className="ml-auto mr-2 text-[11px] font-bold text-brand-600">
            Uploading {busy} image(s)…
          </span>
        )}

        <button
          type="button"
          onClick={() => setSource((prev) => !prev)}
          className={cn(
            "rounded-md px-2 py-1 text-[11px] font-bold transition-colors",
            busy > 0 ? "" : "ml-auto",
            source
              ? "bg-brand-600 text-white"
              : "text-ink-500 hover:bg-white hover:text-brand-600 dark:hover:bg-ink-900"
          )}
        >
          HTML
        </button>
      </div>

      {source ? (
        <textarea
          value={value}
          onChange={(event) => onChange(event.target.value)}
          spellCheck={false}
          className="min-h-[320px] w-full rounded-b-lg border border-t-0 border-ink-200 bg-ink-900 p-4 font-mono text-[13px] leading-relaxed text-ink-100 outline-none dark:border-ink-700"
        />
      ) : (
        <div
          ref={ref}
          contentEditable
          suppressContentEditableWarning
          data-placeholder={placeholder}
          onInput={(event) => onChange((event.target as HTMLDivElement).innerHTML)}
          onBlur={(event) => onChange((event.target as HTMLDivElement).innerHTML)}
          onPaste={(event) => void onPaste(event)}
          onDrop={(event) => void onDrop(event)}
          onDragOver={(event) => event.preventDefault()}
          className="rte"
        />
      )}
    </div>
  );
}
