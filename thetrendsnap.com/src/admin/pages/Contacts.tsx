import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Mail, Reply, Trash2 } from "lucide-react";
import { contactApi } from "@/admin/lib/api";
import type { ContactMessage } from "@/admin/types";
import {
  ConfirmDialog,
  EmptyState,
  ErrorBlock,
  Field,
  LoadingBlock,
  Modal,
  SectionCard,
  Spinner,
  StatusBadge,
  formatDate,
} from "@/admin/components/ui";
import { useToast } from "@/admin/components/Toast";
import { useAuth } from "@/admin/hooks/useAuth";

export default function Contacts() {
  const toast = useToast();
  const { can } = useAuth();
  const queryClient = useQueryClient();

  const [status, setStatus] = useState("all");
  const [replying, setReplying] = useState<ContactMessage | null>(null);
  const [replyText, setReplyText] = useState("");
  const [confirm, setConfirm] = useState<ContactMessage | null>(null);

  const list = useQuery({ queryKey: ["contacts"], queryFn: () => contactApi.list() });

  const messages: ContactMessage[] = Array.isArray(list.data) ? list.data : list.data?.data ?? [];

  const filtered = useMemo(
    () => (status === "all" ? messages : messages.filter((message) => message.status === status)),
    [messages, status]
  );

  const reply = useMutation({
    mutationFn: () => contactApi.reply(replying?._id as string, replyText),
    onSuccess: () => {
      toast.success("Reply sent");
      setReplying(null);
      setReplyText("");
      void queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => contactApi.remove(id),
    onSuccess: () => {
      toast.success("Message deleted");
      setConfirm(null);
      void queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-xl font-extrabold text-ink-900 dark:text-white">
          Contact inbox
        </h1>
        <p className="mt-0.5 text-sm text-ink-500">
          {messages.length} messages · {messages.filter((m) => m.status === "new").length} new
        </p>
      </header>

      <SectionCard title="Filter">
        <Field label="Status" className="max-w-xs">
          <select value={status} onChange={(event) => setStatus(event.target.value)} className="adm-select">
            <option value="all">All</option>
            <option value="new">New</option>
            <option value="replied">Replied</option>
            <option value="closed">Closed</option>
          </select>
        </Field>
      </SectionCard>

      <div className="adm-card p-0">
        {list.isLoading ? (
          <LoadingBlock />
        ) : list.isError ? (
          <div className="p-4">
            <ErrorBlock error={list.error} onRetry={() => void list.refetch()} />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState title="No messages" message="Nothing has come through the contact form yet." />
        ) : (
          <ul className="divide-y divide-ink-100 dark:divide-ink-800">
            {filtered.map((message) => (
              <li key={message._id} className="p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-bold text-ink-900 dark:text-white">{message.name}</p>
                      <StatusBadge status={message.status} />
                    </div>
                    <p className="mt-0.5 text-[12px] text-ink-500">
                      <a href={`mailto:${message.email}`} className="hover:text-brand-600">
                        {message.email}
                      </a>
                      {message.subject && ` · ${message.subject}`} · {formatDate(message.createdAt)}
                    </p>
                    <p className="mt-2 whitespace-pre-line text-sm text-ink-700 dark:text-ink-200">
                      {message.message}
                    </p>

                    {message.reply?.message && (
                      <div className="mt-3 rounded-lg border-l-4 border-brand-500 bg-brand-50 p-3 text-sm dark:bg-brand-500/10">
                        <p className="text-[11px] font-bold uppercase tracking-wide text-brand-600 dark:text-brand-300">
                          Replied {formatDate(message.reply.repliedAt)}
                        </p>
                        <p className="mt-1 whitespace-pre-line text-ink-700 dark:text-ink-200">
                          {message.reply.message}
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-2">
                    <button
                      type="button"
                      className="adm-btn-ghost adm-btn-sm"
                      onClick={() => {
                        setReplying(message);
                        setReplyText(message.reply?.message || "");
                      }}
                    >
                      <Reply className="h-3.5 w-3.5" />
                      Reply
                    </button>
                    {can("canDelete") && (
                      <button
                        type="button"
                        className="adm-btn-ghost adm-btn-sm text-rose-600"
                        onClick={() => setConfirm(message)}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal
        open={Boolean(replying)}
        title={`Reply to ${replying?.name ?? ""}`}
        onClose={() => setReplying(null)}
        footer={
          <>
            <button type="button" className="adm-btn-ghost" onClick={() => setReplying(null)}>
              Cancel
            </button>
            <button
              type="button"
              className="adm-btn-primary"
              disabled={reply.isPending || !replyText.trim()}
              onClick={() => reply.mutate()}
            >
              {reply.isPending ? <Spinner /> : <Mail className="h-4 w-4" />}
              Send reply
            </button>
          </>
        }
      >
        <p className="mb-3 rounded-lg bg-ink-50 p-3 text-sm text-ink-600 dark:bg-ink-800 dark:text-ink-300">
          {replying?.message}
        </p>
        <Field label="Your reply" hint="Sent by email from the configured mailbox">
          <textarea
            rows={6}
            value={replyText}
            onChange={(event) => setReplyText(event.target.value)}
            className="adm-textarea"
          />
        </Field>
      </Modal>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Delete message"
        message={`Delete the message from ${confirm?.name}? This cannot be undone.`}
        busy={remove.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && remove.mutate(confirm._id)}
      />
    </div>
  );
}
