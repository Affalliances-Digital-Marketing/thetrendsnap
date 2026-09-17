import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Category } from "@/types/api";
import { CategoryFlyout } from "@/components/layout/CategoryFlyout";
import { cn } from "@/lib/utils";

/**
 * Horizontal category rail: scrolls with the wheel, with a click-and-drag, or
 * with the arrow buttons, so every category stays reachable at any width.
 */
export function CategoryStrip({ categories }: { categories: Category[] }) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragging = useRef(false);
  const dragMoved = useRef(false);
  const startX = useRef(0);
  const startScroll = useRef(0);

  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const sync = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    sync();
    const el = trackRef.current;
    if (!el) return undefined;

    // Vertical wheel gestures move the rail sideways.
    const onWheel = (event: WheelEvent) => {
      if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return;
      if (el.scrollWidth <= el.clientWidth) return;
      event.preventDefault();
      el.scrollLeft += event.deltaY;
    };

    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", sync);

    // Web fonts land after the first measure and change the rail's width, so
    // re-measure whenever the track (or its content) actually resizes.
    const observer = new ResizeObserver(sync);
    observer.observe(el);
    Array.from(el.children).forEach((child) => observer.observe(child));
    document.fonts?.ready.then(sync).catch(() => {});

    return () => {
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", sync);
      observer.disconnect();
    };
  }, [sync, categories.length]);

  const nudge = (direction: 1 | -1) => {
    trackRef.current?.scrollBy({ left: direction * 260, behavior: "smooth" });
  };

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.pointerType === "touch") return; // native scrolling is better here
    const el = trackRef.current;
    if (!el) return;
    dragging.current = true;
    dragMoved.current = false;
    startX.current = event.clientX;
    startScroll.current = el.scrollLeft;
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging.current) return;
    const el = trackRef.current;
    if (!el) return;
    const delta = event.clientX - startX.current;
    if (Math.abs(delta) > 4) dragMoved.current = true;
    el.scrollLeft = startScroll.current - delta;
  };

  const endDrag = () => {
    dragging.current = false;
  };

  return (
    <div className="relative flex min-w-0 flex-1 items-center pr-3">
      {!atStart && (
        <button
          type="button"
          onClick={() => nudge(-1)}
          aria-label="Scroll categories left"
          className="btn-icon absolute left-0 z-20"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden="true" />
        </button>
      )}

      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-white to-transparent transition-opacity dark:from-[#0b1120]",
          atStart && "opacity-0"
        )}
      />

      <div
        ref={trackRef}
        onScroll={sync}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onClickCapture={(event) => {
          // A drag should never navigate.
          if (dragMoved.current) {
            event.preventDefault();
            event.stopPropagation();
            dragMoved.current = false;
          }
        }}
        className="no-scrollbar flex min-w-0 flex-1 cursor-grab items-center gap-2 overflow-x-auto scroll-smooth py-1.5 active:cursor-grabbing"
      >
        {categories.map((category) => (
          <CategoryFlyout key={category._id} category={category} />
        ))}
      </div>

      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-white to-transparent transition-opacity dark:from-[#0b1120]",
          atEnd && "opacity-0"
        )}
      />

      {!atEnd && (
        <button
          type="button"
          onClick={() => nudge(1)}
          aria-label="Scroll categories right"
          className="btn-icon absolute right-1 z-20"
        >
          <ChevronRight className="h-4 w-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
