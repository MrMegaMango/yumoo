"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    fetch("/api/log-error", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: error.message,
        stack: error.stack,
        location: typeof window !== "undefined" ? window.location.pathname : "",
      }),
    }).catch(() => {});
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          fontFamily: "system-ui, sans-serif",
          background: "linear-gradient(160deg, #FFF0DE 0%, #FDE8D4 50%, #FDDCC8 100%)",
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            textAlign: "center",
            padding: "2rem",
            maxWidth: "360px",
          }}
        >
          <p style={{ fontSize: "1.125rem", fontWeight: 600, color: "#2B221E", margin: "0 0 0.5rem" }}>
            Something went wrong.
          </p>
          <p style={{ fontSize: "0.875rem", color: "#6B584E", margin: "0 0 0.5rem", lineHeight: 1.6 }}>
            Yumoo hit an unexpected snag. Try refreshing — your diary is safe in local storage.
          </p>
          {error.message ? (
            <p style={{ fontSize: "0.75rem", color: "#9B8880", margin: "0 0 1.5rem", fontFamily: "monospace", wordBreak: "break-word" }}>
              {error.message}
            </p>
          ) : null}
          <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
            <a
              href="/scrapbook"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "9999px",
                padding: "0.5rem 1.5rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#2B221E",
                background: "rgba(255,255,255,0.9)",
                border: "1px solid #EAD6C7",
                textDecoration: "none",
              }}
            >
              My Pages
            </a>
            <button
              onClick={reset}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                borderRadius: "9999px",
                padding: "0.5rem 1.5rem",
                fontSize: "0.875rem",
                fontWeight: 600,
                color: "#FFF8F2",
                background: "#2B221E",
                border: "none",
                cursor: "pointer",
              }}
            >
              Refresh
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
