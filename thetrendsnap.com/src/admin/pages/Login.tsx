import { useState } from "react";
import type { FormEvent } from "react";
import { Lock, Mail } from "lucide-react";
import { useAuth } from "@/admin/hooks/useAuth";
import { Spinner } from "@/admin/components/ui";

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError("");
    setBusy(true);
    try {
      await login(email.trim(), password);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-ink-50 via-white to-brand-50 p-4 dark:from-[#0b1120] dark:via-[#0d1424] dark:to-[#131a2e]">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-brand-500 to-fuchsia-500">
            <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white" aria-hidden="true">
              <path d="M13.5 2 5.7 13.2h4.6L9 22l8.4-11.6h-4.7l.8-8.4z" />
            </svg>
          </span>
          <div>
            <p className="font-display text-lg font-extrabold text-ink-900 dark:text-white">
              TheTrendSnap
            </p>
            <p className="text-[11px] font-semibold uppercase tracking-wider text-ink-400">
              Admin panel
            </p>
          </div>
        </div>

        <form onSubmit={submit} className="adm-card space-y-4 p-5">
          <div>
            <h1 className="font-display text-lg font-bold text-ink-900 dark:text-white">Sign in</h1>
            <p className="mt-0.5 text-xs text-ink-500">Use your editor or superadmin account.</p>
          </div>

          <div>
            <label className="adm-label" htmlFor="email">
              Email
            </label>
            <div className="relative">
              <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                id="email"
                type="email"
                required
                autoComplete="username"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                className="adm-input pl-9"
                placeholder="you@example.com"
              />
            </div>
          </div>

          <div>
            <label className="adm-label" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                id="password"
                type="password"
                required
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="adm-input pl-9"
                placeholder="••••••••"
              />
            </div>
          </div>

          {error && (
            <p role="alert" className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 dark:bg-rose-500/10 dark:text-rose-300">
              {error}
            </p>
          )}

          <button type="submit" className="adm-btn-primary w-full" disabled={busy}>
            {busy && <Spinner />}
            Sign in
          </button>
        </form>
      </div>
    </div>
  );
}
