"use client";

/** Скелетон загрузки для страниц кабинета и админки */
export function CabinetSkeleton() {
  return (
    <div className="space-y-6 animate-pulse" role="status" aria-label="Загрузка">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-24 rounded-xl bg-[rgba(10,25,47,0.06)]"
          />
        ))}
      </div>
      <div className="rounded-xl border-0 p-6">
        <div className="mb-4 h-6 w-48 rounded bg-[rgba(10,25,47,0.08)]" />
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="flex gap-4">
              <div className="h-4 flex-1 rounded bg-[rgba(10,25,47,0.06)]" />
              <div className="h-4 w-24 rounded bg-[rgba(10,25,47,0.06)]" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
