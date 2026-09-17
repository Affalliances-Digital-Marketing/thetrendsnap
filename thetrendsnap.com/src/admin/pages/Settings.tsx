import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { KeyRound, LogOut, ShieldCheck, UserPlus } from "lucide-react";
import { API_URL, SITE_URL, authApi } from "@/admin/lib/api";
import { Field, SectionCard, Spinner, formatDate } from "@/admin/components/ui";
import { useToast } from "@/admin/components/Toast";
import { useAuth } from "@/admin/hooks/useAuth";

export default function Settings() {
  const toast = useToast();
  const { admin, logout } = useAuth();

  const [form, setForm] = useState({ name: "", email: "", password: "" });

  const register = useMutation({
    mutationFn: () => authApi.register(form),
    onSuccess: (res) => {
      toast.success(`${res.admin.email} created`);
      setForm({ name: "", email: "", password: "" });
    },
    onError: (error: Error) => toast.error(error.message),
  });

  return (
    <div className="space-y-4">
      <header>
        <h1 className="font-display text-xl font-extrabold text-ink-900 dark:text-white">Settings</h1>
        <p className="mt-0.5 text-sm text-ink-500">Account, permissions and environment.</p>
      </header>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Signed in as">
          <dl className="space-y-2.5 text-sm">
            {[
              ["Name", admin?.name || "—"],
              ["Email", admin?.email || "—"],
              ["Role", admin?.role || "—"],
              ["Can publish", admin?.role === "superadmin" || admin?.permissions?.canPublish ? "Yes" : "No"],
              ["Can delete", admin?.role === "superadmin" || admin?.permissions?.canDelete ? "Yes" : "No"],
              ["Account created", formatDate(admin?.createdAt)],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-center justify-between gap-3">
                <dt className="text-ink-500 dark:text-ink-400">{label}</dt>
                <dd className="font-bold text-ink-900 dark:text-white">{String(value)}</dd>
              </div>
            ))}
          </dl>

          <button type="button" className="adm-btn-ghost mt-4" onClick={logout}>
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </SectionCard>

        <SectionCard title="Environment" description="Where this panel is pointing.">
          <dl className="space-y-2.5 text-sm">
            <div className="flex items-start justify-between gap-3">
              <dt className="text-ink-500">API base URL</dt>
              <dd className="break-all text-right font-mono text-[12px] text-ink-800 dark:text-ink-100">
                {API_URL}
              </dd>
            </div>
            <div className="flex items-start justify-between gap-3">
              <dt className="text-ink-500">Public site</dt>
              <dd className="break-all text-right font-mono text-[12px] text-ink-800 dark:text-ink-100">
                {SITE_URL}
              </dd>
            </div>
          </dl>

          <p className="mt-3 rounded-lg bg-ink-50 p-3 text-[12px] text-ink-500 dark:bg-ink-800 dark:text-ink-400">
            <ShieldCheck className="mr-1.5 inline h-3.5 w-3.5" />
            Change these with <code>VITE_API_URL</code> and <code>VITE_SITE_URL</code> before building.
          </p>
        </SectionCard>
      </div>

      <SectionCard
        title="Create an admin account"
        description="Registers another superadmin through /api/auth/register."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="Name">
            <input
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="adm-input"
            />
          </Field>
          <Field label="Email">
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className="adm-input"
            />
          </Field>
          <Field label="Password">
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              className="adm-input"
            />
          </Field>
        </div>

        <button
          type="button"
          className="adm-btn-primary mt-3"
          disabled={register.isPending || !form.email.trim() || form.password.length < 6}
          onClick={() => register.mutate()}
        >
          {register.isPending ? <Spinner /> : <UserPlus className="h-4 w-4" />}
          Create admin
        </button>

        <p className="mt-2 text-[12px] text-ink-500">
          <KeyRound className="mr-1 inline h-3.5 w-3.5" />
          Passwords are hashed by the backend; there is no password-reset endpoint yet.
        </p>
      </SectionCard>
    </div>
  );
}
