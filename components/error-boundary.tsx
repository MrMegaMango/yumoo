"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { crashed: boolean; message?: string };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { crashed: false, message: undefined };

  componentDidCatch(error: Error, info: ErrorInfo) {
    fetch("/api/log-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        location: typeof window !== "undefined" ? window.location.pathname : ""
      })
    }).catch(() => {});

    console.error("[error-boundary]", error, info.componentStack);
  }

  static getDerivedStateFromError(error: Error): State {
    return { crashed: true, message: error.message };
  }

  render() {
    if (this.state.crashed) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-lg font-semibold text-ink">Something went wrong.</p>
          <p className="text-sm text-cocoa">Yumoo hit an unexpected snag. Try refreshing — your diary is safe in local storage.</p>
          {this.state.message && (
            <p className="text-xs text-cocoa/60">{this.state.message}</p>
          )}
          <div className="flex gap-3">
            <a
              href="/scrapbook"
              className="rounded-full bg-white/90 px-6 py-2 text-sm font-semibold text-ink ring-1 ring-[#EAD6C7]"
            >
              My Pages
            </a>
            <button
              className="rounded-full bg-ink px-6 py-2 text-sm font-semibold text-cream"
              onClick={() => window.location.reload()}
            >
              Refresh
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
