import { useState } from "react";
import type { FormEvent } from "react";
import { Loader2, Mail, MapPin, MessageSquare, Send } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { sendContact } from "@/lib/api";
import { useSeo } from "@/hooks/useSeo";
import { cn } from "@/lib/utils";

type Status = "idle" | "sending" | "sent" | "error";

export default function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [status, setStatus] = useState<Status>("idle");
  const [feedback, setFeedback] = useState("");

  useSeo({
    title: "Contact Us",
    description: "Questions, tips or partnership ideas — reach the TheTrendSnap team.",
  });

  const update = (key: keyof typeof form, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (status === "sending") return;

    if (!form.name.trim() || !form.message.trim()) {
      setStatus("error");
      setFeedback("Name and message are required.");
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) {
      setStatus("error");
      setFeedback("Enter a valid email address.");
      return;
    }

    setStatus("sending");
    try {
      await sendContact({
        name: form.name.trim(),
        email: form.email.trim(),
        subject: form.subject.trim() || "Website enquiry",
        message: form.message.trim(),
      });
      setStatus("sent");
      setFeedback("Thanks! We'll get back to you shortly.");
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (error) {
      setStatus("error");
      setFeedback((error as Error).message || "Message failed to send. Try again.");
    }
  };

  const field =
    "h-11 w-full rounded-xl border border-ink-200 bg-white px-3.5 text-sm text-ink-900 outline-none transition-colors placeholder:text-ink-400 focus:border-brand-500 dark:border-ink-700 dark:bg-ink-900 dark:text-white";

  return (
    <>
      <PageHeader
        eyebrow="Say hello"
        title="Contact Us"
        description="Story tips, corrections, advertising or feedback — we read everything."
        breadcrumbs={[{ label: "Contact" }]}
      />

      <div className="container grid gap-8 py-10 lg:grid-cols-12">
        <form onSubmit={submit} className="card space-y-4 p-6 lg:col-span-7" noValidate>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="contact-name" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-500">
                Your name *
              </label>
              <input
                id="contact-name"
                className={field}
                value={form.name}
                onChange={(event) => update("name", event.target.value)}
                placeholder="Jane Doe"
                required
              />
            </div>
            <div>
              <label htmlFor="contact-email" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-500">
                Email *
              </label>
              <input
                id="contact-email"
                type="email"
                className={field}
                value={form.email}
                onChange={(event) => update("email", event.target.value)}
                placeholder="jane@example.com"
                required
              />
            </div>
          </div>

          <div>
            <label htmlFor="contact-subject" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-500">
              Subject
            </label>
            <input
              id="contact-subject"
              className={field}
              value={form.subject}
              onChange={(event) => update("subject", event.target.value)}
              placeholder="What's this about?"
            />
          </div>

          <div>
            <label htmlFor="contact-message" className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-ink-500">
              Message *
            </label>
            <textarea
              id="contact-message"
              rows={6}
              className={cn(field, "h-auto py-3 leading-relaxed")}
              value={form.message}
              onChange={(event) => update("message", event.target.value)}
              placeholder="Tell us everything…"
              required
            />
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={status === "sending"}
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand-600 px-6 text-sm font-bold text-white transition-colors hover:bg-brand-700 disabled:opacity-70"
            >
              {status === "sending" ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              ) : (
                <Send className="h-4 w-4" aria-hidden="true" />
              )}
              Send message
            </button>

            {feedback && (
              <p
                role={status === "error" ? "alert" : "status"}
                className={cn(
                  "text-sm font-semibold",
                  status === "error" ? "text-rose-600" : "text-emerald-600"
                )}
              >
                {feedback}
              </p>
            )}
          </div>
        </form>

        <aside className="space-y-4 lg:col-span-5">
          {[
            {
              Icon: Mail,
              title: "Email us",
              body: "hello@thetrendsnap.com",
              note: "We usually reply within one business day.",
            },
            {
              Icon: MessageSquare,
              title: "Editorial tips",
              body: "tips@thetrendsnap.com",
              note: "Got a scoop? Send it over — we protect our sources.",
            },
            {
              Icon: MapPin,
              title: "Newsroom",
              body: "Remote-first, publishing worldwide",
              note: "Coverage in English, seven days a week.",
            },
          ].map(({ Icon, title, body, note }) => (
            <div key={title} className="card flex gap-4 p-5">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div>
                <h2 className="font-display text-sm font-bold text-ink-900 dark:text-white">{title}</h2>
                <p className="mt-0.5 text-sm font-semibold text-brand-600 dark:text-brand-400">{body}</p>
                <p className="mt-1 text-xs text-ink-500 dark:text-ink-400">{note}</p>
              </div>
            </div>
          ))}
        </aside>
      </div>
    </>
  );
}
