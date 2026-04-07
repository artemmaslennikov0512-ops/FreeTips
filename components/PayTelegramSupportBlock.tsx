/** Блок «проблема с оплатой» + явная кнопка перехода в Telegram поддержки. */

export const PAY_SUPPORT_TELEGRAM_URL = "https://t.me/SupporFT_SD";

type Props = {
  className?: string;
  /** Внутри страницы /pay/[slug] (стили .pay-page). */
  variant?: "embedded" | "result";
};

export function PayTelegramSupportBlock({ className = "", variant = "embedded" }: Props) {
  const titleId =
    variant === "embedded" ? "pay-telegram-support-title" : "pay-telegram-support-title-result";

  const inner = (
    <>
      <h2 id={titleId} className="pay-support-callout-title">
        Проблема с оплатой?
      </h2>
      <p>
        Если списалась неверная сумма, платёж прошёл дважды или что-то пошло не так — напишите нам в Telegram. Мы
        проверим операцию в системе и быстро приведём всё в порядок: вернём лишнее, скорректируем сумму или подскажем
        следующий шаг. Работаем круглосуточно, 24/7.
      </p>
      <a
        href={PAY_SUPPORT_TELEGRAM_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="pay-support-telegram-btn"
      >
        Написать нам в Telegram
      </a>
    </>
  );

  if (variant === "result") {
    return (
      <section
        className={`pay-support-result-box w-full ${className}`.trim()}
        aria-labelledby={titleId}
      >
        {inner}
      </section>
    );
  }

  return (
    <section className={`pay-support-callout w-full ${className}`.trim()} aria-labelledby={titleId}>
      {inner}
    </section>
  );
}
