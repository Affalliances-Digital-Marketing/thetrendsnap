import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Plus, Search, Trash2 } from "lucide-react";
import { newsletterApi } from "@/admin/lib/api";
import {
  ConfirmDialog,
  EmptyState,
  ErrorBlock,
  Field,
  LoadingBlock,
  Pagination,
  SectionCard,
  Spinner,
  StatusBadge,
  formatDate,
} from "@/admin/components/ui";
import { useToast } from "@/admin/components/Toast";
import { useAuth } from "@/admin/hooks/useAuth";

export default function Subscribers() {
  const toast = useToast();
  const { can } = useAuth();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [newEmail, setNewEmail] = useState("");
  const [confirm, setConfirm] = useState<{ id: string; email: string } | null>(null);

  const list = useQuery({
    queryKey: ["subscribers", { search, status, page }],
    queryFn: () => newsletterApi.list({ search, status, page, limit: 50 }),
  });

  const invalidate = () => void queryClient.invalidateQueries({ queryKey: ["subscribers"] });

  const add = useMutation({
    mutationFn: (email: string) => newsletterApi.subscribe(email, "admin"),
    onSuccess: () => {
      toast.success("Subscriber added");
      setNewEmail("");
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => newsletterApi.remove(id),
    onSuccess: () => {
      toast.success("Subscriber removed");
      setConfirm(null);
      invalidate();
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rows = list.data?.data ?? [];

  const exportCsv = () => {
    const header = "email,name,status,source,createdAt\n";
    const body = rows
      .map((row) =>
        [row.email, row.name || "", row.status || "", row.source || "", row.createdAt || ""]
          .map((value) => `"${String(value).replace(/"/g, '""')}"`)
          .join(",")
      )
      .join("\n");

    const blob = new Blob([header + body], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "thetrendsnap-subscribers.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-extrabold text-ink-900 dark:text-white">
            Newsletter subscribers
          </h1>
          <p className="mt-0.5 text-sm text-ink-500">
            {list.data?.stats?.active ?? 0} active · {list.data?.pagination?.total ?? 0} total
          </p>
        </div>
        <button type="button" className="adm-btn-ghost" onClick={exportCsv} disabled={!rows.length}>
          <Download className="h-4 w-4" />
          Export CSV
        </button>
      </header>

      <SectionCard title="Search & add">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Field label="Search">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="email@example.com"
                className="adm-input pl-9"
              />
            </div>
          </Field>

          <Field label="Status">
            <select
              value={status}
              onChange={(event) => {
                setStatus(event.target.value);
                setPage(1);
              }}
              className="adm-select"
            >
              <option value="all">All</option>
              <option value="subscribed">Subscribed</option>
              <option value="unsubscribed">Unsubscribed</option>
            </select>
          </Field>

          <Field label="Add subscriber" className="lg:col-span-2">
            <div className="flex gap-2">
              <input
                type="email"
                value={newEmail}
                onChange={(event) => setNewEmail(event.target.value)}
                placeholder="new@example.com"
                className="adm-input"
              />
              <button
                type="button"
                className="adm-btn-primary shrink-0"
                disabled={!newEmail.trim() || add.isPending}
                onClick={() => add.mutate(newEmail.trim())}
              >
                {add.isPending ? <Spinner /> : <Plus className="h-4 w-4" />}
                Add
              </button>
            </div>
          </Field>
        </div>
      </SectionCard>

      <div className="adm-card p-0">
        {list.isLoading ? (
          <LoadingBlock />
        ) : list.isError ? (
          <div className="p-4">
            <ErrorBlock error={list.error} onRetry={() => void list.refetch()} />
          </div>
        ) : rows.length === 0 ? (
          <EmptyState title="No subscribers yet" message="Signups from the site will appear here." />
        ) : (
          <>
            <div className="adm-table-wrap">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Email</th>
                    <th>Name</th>
                    <th>Source</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th className="text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row._id}>
                      <td className="font-semibold text-ink-800 dark:text-ink-100">{row.email}</td>
                      <td className="text-ink-500">{row.name || "—"}</td>
                      <td className="text-ink-500">{row.source || "—"}</td>
                      <td>
                        <StatusBadge status={row.status === "subscribed" ? "published" : "draft"} />
                      </td>
                      <td className="whitespace-nowrap text-ink-500">{formatDate(row.createdAt)}</td>
                      <td>
                        <div className="flex justify-end">
                          {can("canDelete") && (
                            <button
                              type="button"
                              className="adm-btn-ghost adm-btn-sm text-rose-600"
                              onClick={() => setConfirm({ id: row._id, email: row.email })}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {list.data?.pagination && (
              <div className="px-4 pb-4">
                <Pagination
                  page={list.data.pagination.page}
                  pages={list.data.pagination.pages}
                  total={list.data.pagination.total}
                  onChange={setPage}
                />
              </div>
            )}
          </>
        )}
      </div>

      <ConfirmDialog
        open={Boolean(confirm)}
        title="Remove subscriber"
        message={`Delete ${confirm?.email} from the list?`}
        busy={remove.isPending}
        onCancel={() => setConfirm(null)}
        onConfirm={() => confirm && remove.mutate(confirm.id)}
      />
    </div>
  );
}
