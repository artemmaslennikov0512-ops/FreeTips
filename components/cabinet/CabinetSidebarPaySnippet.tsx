"use client";

import { useCallback, useState } from "react";
import Link from "next/link";
import { Copy, ExternalLink } from "lucide-react";
import { CABINET_WAITER_BTN_INLINE } from "@/lib/cabinet-button-classes";

type Props = {
  paySlug: string | null;
  payLink: string | null;
  /** Закрыть моб. меню при переходе по ссылкам */
  onNavigate?: () => void;
};

/**
 * Компактный блок «код + ссылка для чаевых» в сайдбаре ЛК (десктоп и моб. шторка).
 * Одинаково читается в светлой и тёмной теме (поля — .cabinet-input-window из globals).
 */
export function CabinetSidebarPaySnippet({ paySlug, payLink, onNavigate }: Props) {
  const [copied, setCopied] = useState(false);

  const copyLink = useCallback(async () => {
    if (!payLink) return;
    try {
      await navigator.clipboard.writeText(payLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* ignore */
    }
  }, [payLink]);

  if (!payLink) {
    return (
      <div
        data-cabinet-sidebar-pay-snippet
        className="cabinet-sidebar-pay-snippet cabinet-block-inner mx-0 mb-2 shrink-0 rounded-[10px] border border-[rgba(197,165,114,0.55)] px-3 py-2.5 lg:mx-3"
      >
        <Link
          href="/cabinet/link"
          onClick={onNavigate}
          className="text-sm font-medium text-[var(--color-text)] underline-offset-2 hover:underline"
        >
          Код и ссылка для чаевых
        </Link>
        <p className="mt-1 text-xs leading-snug text-[var(--color-text)]/75">Страница с QR и ссылкой для гостей</p>
      </div>
    );
  }

  return (
    <div
      data-cabinet-sidebar-pay-snippet
      className="cabinet-sidebar-pay-snippet cabinet-block-inner mx-0 mb-2 shrink-0 rounded-[10px] border border-[rgba(197,165,114,0.55)] px-3 py-2.5 lg:mx-3"
    >
      <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[var(--color-text)]/80">Ваш ID для чаевых</div>
      {paySlug ? (
        <div className="cabinet-input-window mb-2 min-w-0 rounded-lg px-2.5 py-1.5 font-mono text-sm font-semibold tracking-wide text-[var(--color-text)]">
          {paySlug}
        </div>
      ) : null}
      <div className="mb-1 text-[0.6875rem] font-medium text-[var(--color-text)]/75">Ссылка для гостей</div>
      <div
        className="cabinet-input-window mb-2 min-w-0 max-w-full rounded-lg px-2.5 py-1.5 font-mono text-[0.6875rem] leading-snug text-[var(--color-text)]/95"
        title={payLink}
      >
        <span className="line-clamp-2 break-all">{payLink}</span>
      </div>
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={() => void copyLink()}
            className={`${CABINET_WAITER_BTN_INLINE} !min-h-0 px-2.5 py-1.5 text-xs`}
          >
            <Copy className="h-3.5 w-3.5 shrink-0" aria-hidden />
            {copied ? "Скопировано" : "Копировать"}
          </button>
          <a
            href={payLink}
            target="_blank"
            rel="noopener noreferrer"
            className={`${CABINET_WAITER_BTN_INLINE} cabinet-card-btn-link !min-h-0 px-2.5 py-1.5 text-xs`}
          >
            <ExternalLink className="h-3.5 w-3.5 shrink-0" aria-hidden />
            Открыть
          </a>
        </div>
        <Link
          href="/cabinet/link"
          onClick={onNavigate}
          className="text-center text-[0.6875rem] font-medium text-[var(--color-text)]/80 underline-offset-2 hover:text-[var(--color-text)] hover:underline"
        >
          QR и подробнее
        </Link>
      </div>
    </div>
  );
}
