import { useEffect, useState } from "react";
import { List } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Heading {
  id: string;
  text: string;
  level: number;
}

/** Reads the headings the renderer stamped with ids and tracks the active one. */
export function useHeadings(containerId: string, content?: string): Heading[] {
  const [headings, setHeadings] = useState<Heading[]>([]);

  useEffect(() => {
    const container = document.getElementById(containerId);
    if (!container) return;

    const found = Array.from(container.querySelectorAll("h2, h3"))
      .filter((node) => node.textContent?.trim())
      .map((node) => ({
        id: node.id,
        text: node.textContent?.trim() || "",
        level: node.tagName === "H2" ? 2 : 3,
      }))
      .filter((heading) => heading.id);

    setHeadings(found);
  }, [containerId, content]);

  return headings;
}

export function TableOfContents({
  headings,
  className,
}: {
  headings: Heading[];
  className?: string;
}) {
  const [active, setActive] = useState<string>("");

  useEffect(() => {
    if (!headings.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) setActive(visible.target.id);
      },
      { rootMargin: "-120px 0px -70% 0px", threshold: [0, 1] }
    );

    headings.forEach((heading) => {
      const el = document.getElementById(heading.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [headings]);

  if (headings.length < 2) return null;

  return (
    <nav className={cn("card overflow-hidden", className)} aria-label="On this page">
      <p className="flex items-center gap-2 border-b border-ink-100 px-4 py-3 font-display text-[13px] font-bold text-ink-900 dark:border-ink-800 dark:text-white">
        <List className="h-4 w-4 text-brand-500" aria-hidden="true" />
        On this page
      </p>

      <ol className="max-h-[52vh] space-y-0.5 overflow-y-auto p-2">
        {headings.map((heading) => (
          <li key={heading.id}>
            <a
              href={`#${heading.id}`}
              onClick={(event) => {
                event.preventDefault();
                const el = document.getElementById(heading.id);
                if (!el) return;
                window.scrollTo({ top: el.offsetTop - 96, behavior: "smooth" });
                setActive(heading.id);
              }}
              className={cn(
                "block rounded-lg px-2.5 py-1.5 text-[13px] leading-snug transition-colors",
                heading.level === 3 && "pl-5",
                active === heading.id
                  ? "bg-brand-50 font-bold text-brand-700 dark:bg-brand-500/10 dark:text-brand-300"
                  : "text-ink-600 hover:bg-ink-50 hover:text-brand-600 dark:text-ink-300 dark:hover:bg-ink-800"
              )}
            >
              {heading.text}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
