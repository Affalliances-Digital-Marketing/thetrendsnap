import { Component } from "react";
import type { ErrorInfo, ReactNode } from "react";

interface State {
  error: Error | null;
}

/** Last line of defence: a render crash shows a recovery card, not a blank page. */
export class ErrorBoundary extends Component<{ children: ReactNode }, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("Render error:", error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-white px-6 text-center dark:bg-[#0b1120]">
        <h1 className="font-display text-2xl font-bold text-ink-900 dark:text-white">
          Something broke on our side
        </h1>
        <p className="max-w-md text-sm text-ink-500 dark:text-ink-400">
          The page failed to render. Reloading usually fixes it.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="inline-flex h-11 items-center rounded-xl bg-brand-600 px-6 text-sm font-bold text-white hover:bg-brand-700"
        >
          Reload page
        </button>
      </div>
    );
  }
}
