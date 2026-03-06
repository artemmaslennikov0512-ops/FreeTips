/**
 * Отправка тестовых писем на указанный email (все 4 шаблона).
 * Запуск из корня проекта: TEST_EMAIL=your@mail.ru npx tsx scripts/send-test-emails.ts
 * Требуется в .env: настроенная почта (SMTP_* или RESEND_*) и TEST_EMAIL — адрес получателя.
 */

import dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.join(process.cwd(), ".env") });

const TEST_EMAIL = process.env.TEST_EMAIL?.trim();
if (!TEST_EMAIL) {
  console.error("Укажите TEST_EMAIL в .env или в переменных окружения (адрес для тестовых писем).");
  process.exit(1);
}

async function main() {
  const { sendEmail } = await import("../lib/email/send");
  const {
    templatePasswordReset,
    templateEmailVerificationCode,
    templateRegistrationLinkFromRequest,
    templateInviteEmployee,
  } = await import("../lib/email/templates");

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") || "https://free-tips.ru";

  const cases: { name: string; subject: string; html: string }[] = [
    {
      name: "1. Подтверждение почты (код)",
      ...templateEmailVerificationCode({ code: "847291" }),
    },
    {
      name: "2. Восстановление пароля",
      ...templatePasswordReset({
        resetLink: `${baseUrl}/reset-password?token=test-token-placeholder`,
      }),
    },
    {
      name: "3. Ссылка регистрации (после одобрения заявки)",
      ...templateRegistrationLinkFromRequest({
        link: `${baseUrl}/register?token=test-reg-token`,
        fullName: "Тестовый Пользователь",
        expiresAt: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000),
      }),
    },
    {
      name: "4. Приглашение официанта",
      ...templateInviteEmployee({
        link: `${baseUrl}/register?token=test-invite-token`,
        employeeName: "Иван",
        expiresAt: new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000),
      }),
    },
  ];

  console.log(`Отправка тестовых писем на ${TEST_EMAIL}...\n`);

  for (const { name, subject, html } of cases) {
    process.stdout.write(`${name} (${subject})... `);
    const result = await sendEmail({ to: TEST_EMAIL, subject, html });
    if (result.ok) {
      console.log("OK");
    } else {
      console.log("Ошибка:", result.error);
    }
  }

  console.log("\nГотово. Проверьте почту (и папку «Спам»).");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
