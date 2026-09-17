import { useEffect } from "react";
import { X } from "lucide-react";

/** Full-screen viewer for images that do not carry their own redirect link. */
export function Lightbox({
  src,
  alt,
  caption,
  onClose,
}: {
  src: string;
  alt?: string;
  caption?: string;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[95] flex flex-col items-center justify-center bg-black/90 p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={alt || "Image"}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white transition-colors hover:bg-white/20"
        aria-label="Close"
      >
        <X className="h-5 w-5" />
      </button>

      <img
        src={src}
        alt={alt || ""}
        onClick={(event) => event.stopPropagation()}
        className="max-h-[85vh] max-w-full rounded-xl object-contain"
      />

      {caption && <p className="mt-3 max-w-2xl text-center text-sm text-white/80">{caption}</p>}
    </div>
  );
}
