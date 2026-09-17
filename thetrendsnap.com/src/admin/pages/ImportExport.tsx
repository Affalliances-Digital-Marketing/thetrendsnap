import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, FileSpreadsheet, PlayCircle, RotateCcw, ShieldCheck } from "lucide-react";
import { importApi } from "@/admin/lib/api";
import type { ImportJob } from "@/admin/types";
import {
  ConfirmDialog,
  ErrorBlock,
  Field,
  LoadingBlock,
  SectionCard,
  Spinner,
  StatusBadge,
  formatDate,
} from "@/admin/components/ui";
import { useToast } from "@/admin/components/Toast";
import { useAuth } from "@/admin/hooks/useAuth";

export default function ImportExport() {
  const toast = useToast();
  const { can } = useAuth();
  const queryClient = useQueryClient();

  const [file, setFile] = useState<File | null>(null);
  const [mode, setMode] = useState<"create" | "upsert">("upsert");
  const [report, setReport] = useState<ImportJob | null>(null);
  const [rollbackTarget, setRollbackTarget] = useState<ImportJob | null>(null);

  const history = useQuery({ queryKey: ["import-history"], queryFn: () => importApi.history(25) });

  const validate = useMutation({
    mutationFn: () => importApi.validate(file as File, mode),
    onSuccess: (res) => {
      setReport(res.data);
      toast.success(
        res.data.errorCount
          ? `Validated with ${res.data.errorCount} issue(s)`
          : "Sheet looks good — ready to import"
      );
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const run = useMutation({
    mutationFn: () => importApi.run(file as File, mode),
    onSuccess: (res) => {
      setReport(res.data);
      toast.success(
        `Imported: ${res.data.createdCount ?? 0} created, ${res.data.updatedCount ?? 0} updated`
      );
      void queryClient.invalidateQueries({ queryKey: ["import-history"] });
      void queryClient.invalidateQueries({ queryKey: ["articles"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rollback = useMutation({
    mutationFn: (batchId: string) => importApi.rollback(batchId),
    onSuccess: () => {
      toast.success("Import rolled back");
      setRollbackTarget(null);
      void queryClient.invalidateQueries({ queryKey: ["import-history"] });
      void queryClient.invalidateQueries({ queryKey: ["articles"] });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const download = useMutation({
    mutationFn: (kind: "sample" | "export") =>
      kind === "sample" ? importApi.sample() : importApi.export(),
    onSuccess: () => toast.success("Download started"),
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-xl font-extrabold text-ink-900 dark:text-white">
          Import & export
        </h1>
        <p className="mt-0.5 text-sm text-ink-500">
          Bulk-load articles from a spreadsheet, or export everything for editing offline.
        </p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Templates" description="Start from the sample sheet so the columns match.">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="adm-btn-ghost"
              onClick={() => download.mutate("sample")}
              disabled={download.isPending}
            >
              <FileSpreadsheet className="h-4 w-4" />
              Download template
            </button>
            <button
              type="button"
              className="adm-btn-ghost"
              onClick={() => download.mutate("export")}
              disabled={download.isPending}
            >
              <Download className="h-4 w-4" />
              Export all articles
            </button>
          </div>
        </SectionCard>

        <SectionCard title="Upload a sheet" description=".xlsx, .xlsm or .csv up to 50 MB.">
          <div className="grid gap-3">
            <Field label="File">
              <input
                type="file"
                accept=".xlsx,.xlsm,.csv"
                onChange={(event) => {
                  const picked = event.target.files?.[0] ?? null;
                  setReport(null);

                  // While a workbook is open, Excel keeps a lock file beside it
                  // with the same name behind a "~$". It shows up in the file
                  // picker and is not a spreadsheet, so catch it here rather
                  // than letting the upload fail on the server.
                  if (picked && picked.name.startsWith("~$")) {
                    toast.error(
                      "That is Excel's temporary lock file, not the sheet. Close the workbook in Excel and pick the file without the \"~$\" in front of its name."
                    );
                    event.target.value = "";
                    setFile(null);
                    return;
                  }

                  if (picked && /\.xls$/i.test(picked.name)) {
                    toast.error(
                      "That is the old .xls format. In Excel use File → Save As → Excel Workbook (.xlsx) and upload that."
                    );
                    event.target.value = "";
                    setFile(null);
                    return;
                  }

                  setFile(picked);
                }}
                className="adm-input h-auto py-2"
              />
            </Field>

            <Field label="Mode" hint="Upsert updates an existing article when the slug matches">
              <select
                value={mode}
                onChange={(event) => setMode(event.target.value as "create" | "upsert")}
                className="adm-select"
              >
                <option value="upsert">Upsert (create or update)</option>
                <option value="create">Create only</option>
              </select>
            </Field>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                className="adm-btn-ghost"
                disabled={!file || validate.isPending}
                onClick={() => validate.mutate()}
              >
                {validate.isPending ? <Spinner /> : <ShieldCheck className="h-4 w-4" />}
                Validate only
              </button>
              <button
                type="button"
                className="adm-btn-primary"
                disabled={!file || run.isPending || !can("canPublish")}
                onClick={() => run.mutate()}
              >
                {run.isPending ? <Spinner /> : <PlayCircle className="h-4 w-4" />}
                Run import
              </button>
            </div>
          </div>
        </SectionCard>
      </div>

      {report && (
        <SectionCard
          title={`Batch ${report.batchId}`}
          description={`${report.fileName ?? "sheet"} · ${report.status}`}
        >
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {[
              ["Rows", report.totalRows ?? 0],
              ["Created", report.createdCount ?? 0],
              ["Updated", report.updatedCount ?? 0],
              ["Skipped", report.skippedCount ?? 0],
              ["Errors", report.errorCount ?? 0],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-lg border border-ink-200 p-3 dark:border-ink-700">
                <p className="text-[11px] font-bold uppercase tracking-wide text-ink-400">{label}</p>
                <p className="mt-1 font-display text-lg font-extrabold text-ink-900 dark:text-white">
                  {String(value)}
                </p>
              </div>
            ))}
          </div>

          {(report.pendingSubCategories?.length || report.createdSubCategories?.length) ? (
            <p className="mt-3 rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-[13px] text-brand-700 dark:border-brand-500/30 dark:bg-brand-500/10 dark:text-brand-300">
              {report.createdSubCategories?.length
                ? `Sub-categories created: ${report.createdSubCategories.join(", ")}`
                : `Sub-categories the import will create: ${report.pendingSubCategories?.join(", ")}`}
            </p>
          ) : null}

          {report.issues && report.issues.length > 0 && (
            <div className="mt-4 adm-table-wrap max-h-72 overflow-y-auto">
              <table className="adm-table">
                <thead>
                  <tr>
                    <th>Row</th>
                    <th>Field</th>
                    <th>Message</th>
                    <th>Value</th>
                  </tr>
                </thead>
                <tbody>
                  {report.issues.map((issue, index) => (
                    <tr key={index}>
                      <td>{issue.row ?? "—"}</td>
                      <td className="font-semibold">{issue.field ?? "—"}</td>
                      <td className="text-rose-600 dark:text-rose-400">{issue.message}</td>
                      <td className="clamp-1 max-w-[220px] text-ink-500">{issue.value ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </SectionCard>
      )}

      <SectionCard title="Import history" description="Every batch, newest first.">
        {history.isLoading ? (
          <LoadingBlock />
        ) : history.isError ? (
          <ErrorBlock error={history.error} onRetry={() => void history.refetch()} />
        ) : (history.data?.data ?? []).length === 0 ? (
          <p className="py-3 text-sm text-ink-500">No imports run yet.</p>
        ) : (
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Batch</th>
                  <th>File</th>
                  <th>Mode</th>
                  <th>Rows</th>
                  <th>Created</th>
                  <th>Updated</th>
                  <th>Errors</th>
                  <th>Status</th>
                  <th>When</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(history.data?.data ?? []).map((job) => (
                  <tr key={job.batchId}>
                    <td className="font-mono text-[11px]">{job.batchId}</td>
                    <td className="clamp-1 max-w-[180px]">{job.fileName || "—"}</td>
                    <td>{job.mode}</td>
                    <td>{job.totalRows ?? 0}</td>
                    <td>{job.createdCount ?? 0}</td>
                    <td>{job.updatedCount ?? 0}</td>
                    <td className={job.errorCount ? "font-bold text-rose-600" : ""}>
                      {job.errorCount ?? 0}
                    </td>
                    <td>
                      <StatusBadge status={job.status === "completed" ? "published" : job.status} />
                    </td>
                    <td className="whitespace-nowrap text-ink-500">{formatDate(job.createdAt)}</td>
                    <td>
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          className="adm-btn-ghost adm-btn-sm"
                          onClick={async () => {
                            const res = await importApi.status(job.batchId);
                            setReport(res.data);
                            window.scrollTo({ top: 0, behavior: "smooth" });
                          }}
                        >
                          Report
                        </button>
                        {can("canDelete") && job.status === "completed" && (
                          <button
                            type="button"
                            className="adm-btn-ghost adm-btn-sm text-rose-600"
                            onClick={() => setRollbackTarget(job)}
                            title="Roll back"
                          >
                            <RotateCcw className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </SectionCard>

      <ConfirmDialog
        open={Boolean(rollbackTarget)}
        title="Roll back import"
        message={`Delete everything batch ${rollbackTarget?.batchId} created and restore the articles it updated?`}
        confirmLabel="Roll back"
        busy={rollback.isPending}
        onCancel={() => setRollbackTarget(null)}
        onConfirm={() => rollbackTarget && rollback.mutate(rollbackTarget.batchId)}
      />
    </div>
  );
}
