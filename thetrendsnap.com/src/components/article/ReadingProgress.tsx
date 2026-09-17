import { useEffect, useState } from "react";

/** Thin progress bar tied to how far the article body has been scrolled. */
export function ReadingProgress({ targetId }: { targetId: string }) {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const update = () => {
      const el = document.getElementById(targetId);
      if (!el) return;

      const start = el.offsetTop;
      const total = el.offsetHeight - window.innerHeight * 0.4;
      const scrolled = window.scrollY - start;

      if (total <= 0) {
        setProgress(scrolled > 0 ? 100 : 0);
        return;
      }

      setProgress(Math.min(100, Math.max(0, (scrolled / total) * 100)));
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [targetId]);

  return (
    <div
      className="fixed inset-x-0 top-0 z-[60] h-0.5 bg-transparent"
      role="progressbar"
      aria-label="Reading progress"
      aria-valuenow={Math.round(progress)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-gradient-to-r from-brand-500 to-fuchsia-500 transition-[width] duration-150"
        style={{ width: `${progress}%` }}
      />
    </div>
  );
}
