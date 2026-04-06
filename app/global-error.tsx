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
    console.error(error);
  }, [error]);

  return (
    <html lang="ru">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#0d0e12", color: "#fafafa", minHeight: "100vh" }}>
        <div style={{ display: "flex", minHeight: "100vh", alignItems: "center", justifyContent: "center", padding: 24 }}>
          <div style={{ maxWidth: 400, textAlign: "center" }}>
            <h1 style={{ fontSize: "1.25rem", marginBottom: 8 }}>Критический сбой</h1>
            <p style={{ fontSize: "0.875rem", opacity: 0.85, marginBottom: 24 }}>
              Приложение не смогло отобразить страницу. Обновите вкладку или зайдите позже.
            </p>
            <button
              type="button"
              onClick={() => reset()}
              style={{
                padding: "12px 20px",
                borderRadius: 12,
                border: "none",
                background: "#c5a572",
                color: "#0a192f",
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Повторить
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
