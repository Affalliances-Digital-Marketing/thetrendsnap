import { useEffect, useRef } from "react";
import type { AdPosition, Article } from "@/types/api";
import { AdLabel, AdSlot } from "@/components/ads/AdSlot";
import { cn } from "@/lib/utils";

/**
 * Slots an article page offers. The editor picks one of these in the article's
 * own "Article ad override" panel.
 */
export type ArticleAdSlot = Extract<
  AdPosition,
  | "article-top"
  | "article-inline"
  | "article-bottom"
  | "article-sidebar-top"
  | "article-sidebar-middle"
  | "article-sidebar-bottom"
>;

/** Injected markup can contain <script>; cloning is what makes it execute. */
function RawAdCode({ code, className }: { code: string; className?: string }) {
  const host = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const node = host.current;
    if (!node) return;

    node.innerHTML = code;
    node.querySelectorAll("script").forEach((old) => {
      const script = document.createElement("script");
      Array.from(old.attributes).forEach((attr) =>
        script.setAttribute(attr.name, attr.value)
      );
      script.text = old.text;
      old.replaceWith(script);
    });

    return () => {
      node.innerHTML = "";
    };
  }, [code]);

  return (
    <aside className={cn("w-full", className)} aria-label="Advertisement">
      <AdLabel />
      <div ref={host} className="flex w-full items-center justify-center" />
    </aside>
  );
}

/**
 * One ad position on an article page.
 *
 * Two things can happen here, and they compose rather than fight:
 *
 * - the article carries its own creative (`advertisement.code`) and names the
 *   place it belongs — that markup renders at exactly that slot;
 * - the position is also a bookable slot, so whatever is sold there in
 *   Advertisements renders as usual.
 *
 * Turning the article's `advertisement.enabled` off silences every ad on that
 * one article, which is what a sponsored or sensitive piece needs.
 */
export function ArticleAd({
  article,
  slot,
  className,
  ratio,
}: {
  article?: Article | null;
  slot: ArticleAdSlot;
  className?: string;
  ratio?: string;
}) {
  const override = article?.advertisement;

  // An article opted out of advertising entirely.
  if (override?.enabled === false) return null;

  const raw = override?.code?.trim() || "";
  // Only markup is a creative. A sheet sometimes leaves a plain URL in this
  // column, and printing that as text where a banner belongs looks broken.
  const isMarkup = /<[a-z!/][\s\S]*>/i.test(raw);
  const custom = isMarkup && override?.position === slot ? raw : "";

  if (custom) {
    return <RawAdCode code={custom} className={className} />;
  }

  return <AdSlot position={slot} className={className} ratio={ratio} />;
}
