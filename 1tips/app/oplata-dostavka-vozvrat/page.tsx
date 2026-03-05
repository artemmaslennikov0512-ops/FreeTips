import type { Metadata } from "next";
import Link from "next/link";
import { site } from "@/config/site";

export const metadata: Metadata = {
  title: "Оплата, доставка и возврат — FreeTips",
  description: "Способы оплаты, особенности оказания услуг и порядок возврата средств.",
};

export default function OplataDostavkaVozvratPage() {
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-12 sm:px-6 sm:py-16 xl:max-w-4xl 2xl:max-w-5xl">
      <h1 className="text-3xl font-bold text-[var(--color-text)] sm:text-4xl">
        Оплата, доставка и возврат
      </h1>
      <p className="mt-4 text-[var(--color-muted)]">
        Условия оплаты услуг сервиса {site.name}, оказание услуг в электронной форме и порядок возврата денежных средств.
      </p>

      <div className="mt-12 space-y-8 text-[var(--color-text-secondary)]">
        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Оплата</h2>
          <div className="mt-2 space-y-2">
            <p>
              Оплата чаевых осуществляется банковскими картами платёжных систем Visa, MasterCard и МИР, а также с использованием систем мобильных платежей (Apple Pay, Google Pay, Samsung Pay). Приём платежей обеспечивает процессинговый центр Paygine. Платежи совершаются в режиме реального времени через защищённое соединение.
            </p>
            <p>
              Подробные требования к безопасности платежей изложены в <Link href="/politika-bezopasnosti" className="text-[var(--color-accent-gold)] hover:opacity-90 hover:underline">Политике безопасности платежей</Link>.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Доставка</h2>
          <div className="mt-2 space-y-2">
            <p>
              Сервис {site.name} оказывает услуги в электронной форме: приём и перечисление безналичных чаевых. Доставка в физическом смысле не осуществляется — услуга считается оказанной в момент зачисления денежных средств на счёт Получателя чаевых в соответствии с регламентом платёжной системы и Сервиса.
            </p>
          </div>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[var(--color-text)]">Возврат</h2>
          <div className="mt-2 space-y-2">
            <p>
              Возврат денежных средств при оплате банковской картой производится на ту же карту, с которой был совершён платёж. Срок зачисления средств при возврате зависит от банка-эмитента карты и может составлять до 10–30 рабочих дней.
            </p>
            <p>
              Для инициации возврата необходимо направить заявку на адрес электронной почты: <a href="mailto:yeup.ukpukp@mail.ru" className="text-[var(--color-accent-gold)] hover:opacity-90 hover:underline">yeup.ukpukp@mail.ru</a>. В заявке укажите дату и сумму перевода, способ перевода (карта / мобильный платёж) и причину возврата. Оператор рассмотрит обращение в срок до 10 рабочих дней и сообщит о решении.
            </p>
            <p>
              В случае признания возврата обоснованным (ошибочный платёж, двойное списание, иные основания в соответствии с законодательством и офертой) средства будут возвращены в согласованный срок.
            </p>
          </div>
        </section>
      </div>

      <div className="mt-12">
        <Link href="/" className="text-[var(--color-accent-gold)] font-medium hover:opacity-90 hover:underline">← На главную</Link>
      </div>
    </article>
  );
}
