"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = { children: ReactNode };
type State = { crashed: boolean };

export class ErrorBoundary extends Component<Props, State> {
  state: State = { crashed: false };

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

  static getDerivedStateFromError(): State {
    return { crashed: true };
  }

  render() {
    if (this.state.crashed) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8 text-center">
          <p className="text-lg font-semibold text-ink">Something went wrong.</p>
          <p className="text-sm text-cocoa">Try refreshing the page.</p>
          <button
            className="rounded-full bg-ink px-6 py-2 text-sm font-semibold text-cream"
            onClick={() => window.location.reload()}
          >
            Refresh
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
