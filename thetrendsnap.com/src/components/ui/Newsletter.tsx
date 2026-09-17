import { useState } from "react";
import type { FormEvent } from "react";
import { Check, Loader2, Mail } from "lucide-react";
import { subscribeNewsletter } from "@/lib/api";
import { cn } from "@/lib/utils";

type Status = "idle" | "loading" | "done" | "error";

export function NewsletterCard({
  source = "sidebar",
  variant = "brand",
  layout = "stack",
  className,
}: {
  source?: string;
  variant?: "brand" | "plain";
  /**
   * `row` lays the pitch and the form side by side for full-width strips;
   * `compact` is a short card that closes a column without leaving a gap.
   */
  layout?: "stack" | "row" | "compact";
  className?: string;
}) {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "loading") return;

    const value = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value)) {
      setStatus("error");
      setMessage("Enter a valid email address.");
      return;
    }

    setStatus("loading");
    try {
      await subscribeNewsletter(value, source);
      setStatus("done");
      setMessage("You're subscribed. Watch your inbox!");
      setEmail("");
    } catch {
      setStatus("error");
      setMessage("Subscription failed. Please try again.");
    }
  };

  const brand = variant === "brand";
  const row = layout === "row";
  const compact = layout === "compact";

  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl p-5",
        row && "flex flex-col items-start gap-4 px-6 py-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8",
        compact && "p-4",
        brand
          ? "bg-gradient-to-br from-brand-600 to-fuchsia-600 text-white shadow-card"
          : "card",
        className
      )}
      aria-labelledby={`newsletter-${source}`}
    >
      <div
        className={cn(
          "flex items-center gap-2.5",
          brand ? "text-white" : "",
          row && "shrink-0",
          compact && "gap-2"
        )}
      >
        <span
          className={cn(
            "flex items-center justify-center rounded-xl",
            compact ? "h-8 w-8" : "h-9 w-9",
            brand ? "bg-white/20" : "bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400"
          )}
        >
          <Mail className={compact ? "h-4 w-4" : "h-4 w-4"} aria-hidden="true" />
        </span>
        <div>
          <h2
            id={`newsletter-${source}`}
            className={cn(
              "font-display font-bold",
              compact ? "text-sm" : "text-sm",
              brand ? "text-white" : "text-ink-900 dark:text-white"
            )}
          >
            Stay Updated!
          </h2>
          <p
            className={cn(
              compact ? "text-xs" : "text-xs",
              brand ? "text-white/80" : "text-ink-500 dark:text-ink-400"
            )}
          >
            Latest news, reviews and trends in your inbox.
          </p>
        </div>
      </div>

      <form
        onSubmit={submit}
        className={cn(
          "space-y-2.5",
          row && "w-full lg:mt-0 lg:max-w-xl lg:flex-1",
          compact && "mt-3 w-full",
          !row && !compact && "mt-4"
        )}
        noValidate
      >
        <label className="sr-only" htmlFor={`newsletter-email-${source}`}>
          Email address
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id={`newsletter-email-${source}`}
            type="email"
            required
            value={email}
            onChange={(event) => {
              setEmail(event.target.value);
              if (status !== "idle") setStatus("idle");
            }}
            placeholder="Enter your email"
            className={cn(
              "h-10 w-full min-w-0 flex-1 rounded-lg px-3 text-sm outline-none transition",
              brand
                ? "bg-white text-ink-900 placeholder:text-ink-400 focus:ring-2 focus:ring-white/60"
                : "border border-ink-200 bg-white text-ink-900 placeholder:text-ink-400 focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white"
            )}
          />
          <button
            type="submit"
            disabled={status === "loading"}
            className="btn-primary h-10 px-5 text-sm"
          >
            {status === "loading" && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {status === "done" && <Check className="h-4 w-4" aria-hidden="true" />}
            {status === "done" ? "Subscribed" : "Subscribe"}
          </button>
        </div>

        <p
          role={status === "error" ? "alert" : undefined}
          className={cn(
            compact ? "min-h-0 text-xs" : "min-h-[16px] text-xs",
            status === "error"
              ? brand
                ? "text-rose-100"
                : "text-rose-600"
              : brand
                ? "text-white/80"
                : "text-ink-500"
          )}
        >
          {message || "Join 25,000+ subscribers. No spam, unsubscribe anytime."}
        </p>
      </form>
    </section>
  );
}
