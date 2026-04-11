"use client";

import { useAdminShellTheme } from "./AdminShellThemeContext";

export function AdminShellThemeToggle({ compact }: { compact?: boolean }) {
  const { shellTheme, setShellTheme } = useAdminShellTheme();
  return (
    <div
      className={`flex items-center gap-1 ${compact ? "" : "rounded-lg border p-0.5"}`}
      style={{ borderColor: "var(--tlk-border)" }}
    >
      {(["light", "dark"] as const).map((t) => (
        <button
          key={t}
          type="button"
          onClick={() => setShellTheme(t)}
          className="tlk-transition rounded-md px-2.5 py-1 text-xs font-semibold outline-none focus-visible:ring-2 focus-visible:ring-offset-1"
          style={{
            backgroundColor: shellTheme === t ? "var(--tlk-sidebar-active-bg)" : "transparent",
            color: "var(--tlk-text)",
            ["--tw-ring-color" as string]: "var(--tlk-focus)",
          }}
          aria-pressed={shellTheme === t}
        >
          {t === "light" ? "Светлая" : "Тёмная"}
        </button>
      ))}
    </div>
  );
}
