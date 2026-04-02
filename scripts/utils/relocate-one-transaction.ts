/**
 * Ручной перелив на постоянную кубышку для одной транзакции (статус PENDING после оплаты).
 * Используйте, если вебхук не смог выполнить SDRelocateFunds (код 133, таймаут, ответ без APPROVED).
 *
 * Запуск из корня проекта:
 *   npx tsx scripts/utils/relocate-one-transaction.ts <transactionId>
 *   npx tsx scripts/utils/relocate-one-transaction.ts --external-id <paygineOrderId>
 *   npx tsx scripts/utils/relocate-one-transaction.ts --amount <amountKop>
 *     — последняя PENDING-транзакция с такой суммой и заданным paygineOrderSdRef.
 *   Флаг --allow-failed — если в БД уже FAILED (перелив упал), но в ЛК Paygine деньги ещё на кубышке заказа.
 *
 * При успехе: в БД выставляется SUCCESS и сбрасывается relocateStartedAt.
 * При заданном PAYGINE_SD_REF_LEGAL и feeKop у транзакции: комиссия → ЮЛ, остаток → официант.
 * Требуется: .env (DATABASE_URL), scripts/.env или корневой .env (PAYGINE_*, опционально PAYGINE_SD_REF_LEGAL).
 *
 * Запуск с хоста сервера (как раньше): npx tsx scripts/utils/relocate-one-transaction.ts <args>
 * Prisma читает пароль из строки DATABASE_URL. Если обновил только POSTGRES_PASSWORD — для localhost/127.0.0.1
 * скрипт подставит его в URL (отключить: RELOCATE_SKIP_DATABASE_URL_PASSWORD_SYNC=1).
 * Порт на хосте к Docker-БД: из POSTGRES_PORT или 15432; localhost с 5432/без порта — ремап (отключить: DATABASE_URL_NO_DOCKER_HOST_PORT_REMAP=1).
 * Опечатка localhost15432 без «:» — исправляется автоматически.
 */

import "dotenv/config";
import { loadScriptsEnv } from "./load-env";
import { createHash } from "crypto";
import { PrismaClient } from "@prisma/client";

/** Порт `db` на хосте в docker-compose (127.0.0.1:15432:5432). */
const DOCKER_COMPOSE_DB_PUBLISHED_PORT = "15432";

/** `...@localhost15432:5432/...` (забыли `:`) → localhost + порт из суффикса. */
function fixDatabaseUrlLocalhostPortGluedTypo(): void {
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return;
  }
  const host = u.hostname.toLowerCase();
  const m = /^localhost(\d+)$/.exec(host);
  if (!m) return;
  u.hostname = "localhost";
  u.port = m[1];
  process.env.DATABASE_URL = u.toString();
}

function remapDatabaseUrlLocalhostToDockerPublishedPort(): void {
  if (process.env.DATABASE_URL_NO_DOCKER_HOST_PORT_REMAP === "1") return;
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return;
  }
  const host = u.hostname.toLowerCase();
  if (host !== "localhost" && host !== "127.0.0.1") return;
  const p = u.port;
  if (p !== "" && p !== "5432") return;
  const published = process.env.POSTGRES_PORT?.trim() || DOCKER_COMPOSE_DB_PUBLISHED_PORT;
  u.port = published;
  process.env.DATABASE_URL = u.toString();
}

/** Один источник пароля: POSTGRES_PASSWORD в .env, а в DATABASE_URL забыли обновить — только для localhost. */
function syncDatabaseUrlPasswordFromPostgresEnv(): void {
  if (process.env.RELOCATE_SKIP_DATABASE_URL_PASSWORD_SYNC === "1") return;
  const pw = process.env.POSTGRES_PASSWORD;
  if (pw === undefined || pw === "") return;
  const raw = process.env.DATABASE_URL?.trim();
  if (!raw) return;
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return;
  }
  const host = u.hostname.toLowerCase();
  if (host !== "localhost" && host !== "127.0.0.1") return;
  u.password = pw;
  const user = process.env.POSTGRES_USER?.trim();
  if (user) u.username = user;
  process.env.DATABASE_URL = u.toString();
}

loadScriptsEnv();
fixDatabaseUrlLocalhostPortGluedTypo();
remapDatabaseUrlLocalhostToDockerPublishedPort();
syncDatabaseUrlPasswordFromPostgresEnv();

const prisma = new PrismaClient();
const CURRENCY_RUB = 643;

/** Как в lib/payment/paygine/client.ts: база уже с суффиксом /webapi. */
function normalizePaygineWebapiBase(raw: string): string {
  const t = raw.trim().replace(/\/$/, "");
  if (!t) return "";
  return t.endsWith("/webapi") ? t : `${t}/webapi`;
}
const DELAY_MS = Number(process.env.PAYGINE_RELOCATE_DELAY_MS) || 3_000;
const RETRY_DELAY_MS = Number(process.env.PAYGINE_RELOCATE_RETRY_MS) || 8_000;

function sign(tagValues: string[], password: string): string {
  const str = tagValues.join("") + password;
  const hex = createHash("sha256").update(str, "utf8").digest("hex").toLowerCase();
  return Buffer.from(hex, "utf8").toString("base64");
}

async function main(): Promise<void> {
  const argv = process.argv.slice(2);
  const allowFailed = argv.includes("--allow-failed");
  const args = argv.filter((a) => a !== "--allow-failed");
  const byExternalId = args[0] === "--external-id" && args[1];
  const byAmount = args[0] === "--amount" && args[1];
  const txId = !byExternalId && !byAmount ? args[0]?.trim() : null;
  const externalIdArg = byExternalId ? args[1].trim() : null;
  const amountArg = byAmount ? args[1].trim() : null;

  const pendingOrFailed = allowFailed ? ({ in: ["PENDING", "FAILED"] } as const) : ("PENDING" as const);

  if (!txId && !byExternalId && !byAmount) {
    console.error("Usage: npx tsx scripts/utils/relocate-one-transaction.ts <transactionId> [--allow-failed]");
    console.error("       npx tsx scripts/utils/relocate-one-transaction.ts --external-id <paygineOrderId> [--allow-failed]");
    console.error("       npx tsx scripts/utils/relocate-one-transaction.ts --amount <amountKop> [--allow-failed]");
    process.exit(1);
  }

  let tx: {
    id: string;
    status: string;
    amountKop: bigint;
    feeKop: bigint | null;
    paymentMethod: string | null;
    paygineOrderSdRef: string | null;
    recipientId: string;
  } | null = null;

  if (byExternalId) {
    tx = await prisma.transaction.findFirst({
      where: { externalId: externalIdArg!, status: pendingOrFailed, paygineOrderSdRef: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, amountKop: true, feeKop: true, paymentMethod: true, paygineOrderSdRef: true, recipientId: true },
    });
  } else if (byAmount) {
    const amountKop = BigInt(amountArg!);
    if (amountKop < 1n) {
      console.error("Сумма в копейках должна быть положительной (211100 = 2111 ₽).");
      process.exit(1);
    }
    tx = await prisma.transaction.findFirst({
      where: { status: pendingOrFailed, amountKop, paygineOrderSdRef: { not: null } },
      orderBy: { createdAt: "desc" },
      select: { id: true, status: true, amountKop: true, feeKop: true, paymentMethod: true, paygineOrderSdRef: true, recipientId: true },
    });
  } else {
    tx = await prisma.transaction.findUnique({
      where: { id: txId! },
      select: { id: true, status: true, amountKop: true, feeKop: true, paymentMethod: true, paygineOrderSdRef: true, recipientId: true },
    });
  }

  if (!tx) {
    const hint = byExternalId
      ? `externalId=${externalIdArg} (колбэк Paygine мог не прийти — попробуйте --amount <копейки>)`
      : byAmount
        ? `amountKop=${amountArg}`
        : `id=${txId}`;
    console.error("Транзакция не найдена.", hint);
    process.exit(1);
  }
  const okStatus = tx.status === "PENDING" || (allowFailed && tx.status === "FAILED");
  if (!okStatus) {
    const failedHint =
      tx.status === "FAILED" && !allowFailed
        ? " Добавьте --allow-failed, если в ЛК Paygine средства ещё на кубышке заказа (не на официанте)."
        : "";
    console.error(
      "Ожидается PENDING" +
        (allowFailed ? " или FAILED (с --allow-failed)." : " (оплата в ПЦ прошла, перелив в БД не завершён).") +
        " Сейчас:",
      tx.status +
        (tx.status === "SUCCESS"
          ? " — перелив в приложении уже учтён; скрипт не нужен."
          : "") +
        failedHint,
    );
    process.exit(1);
  }
  if (tx.status === "FAILED" && allowFailed) {
    console.error(
      "ВНИМАНИЕ: в БД FAILED — приложение уже получило ошибку перелива. Повтор возможен только если в Paygine деньги ещё на paygineOrderSdRef заказа, а не на кубышке официанта.",
    );
  }
  const orderSdRef = tx.paygineOrderSdRef?.trim();
  if (!orderSdRef) {
    console.error("У транзакции нет paygineOrderSdRef (кубышка заказа).");
    process.exit(1);
  }

  const recipient = await prisma.user.findUnique({
    where: { id: tx.recipientId },
    select: { paygineSdRef: true },
  });
  const waiterSdRef = recipient?.paygineSdRef?.trim();
  if (!waiterSdRef) {
    console.error("У получателя не задан paygineSdRef (кубышка официанта).");
    process.exit(1);
  }
  if (orderSdRef === waiterSdRef) {
    console.error("Кубышка заказа совпадает с кубышкой официанта — перелив не нужен.");
    process.exit(1);
  }

  const baseUrl = normalizePaygineWebapiBase(process.env.PAYGINE_BASE_URL?.trim() ?? "");
  const sector = process.env.PAYGINE_SECTOR?.trim();
  const password = process.env.PAYGINE_PASSWORD;
  if (!baseUrl || !sector || !password) {
    console.error("Задайте PAYGINE_BASE_URL (как в приложении, с /webapi), PAYGINE_SECTOR, PAYGINE_PASSWORD в .env");
    process.exit(1);
  }

  const isSbp = tx.paymentMethod === "sbp";
  const companySdRef = process.env.PAYGINE_SD_REF_LEGAL?.trim();
  const amountKopNum = Number(tx.amountKop);
  const feeKopNum = Number(tx.feeKop ?? 0);
  const toWaiterKop = isSbp && companySdRef && feeKopNum > 0 ? amountKopNum - feeKopNum : amountKopNum;

  const doOneRelocate = async (
    amount: number,
    toSdRef: string,
    desc: string
  ): Promise<{ ok: boolean; orderId?: string }> => {
    const ref = `relocate-${tx.id}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const regSig = sign([sector, String(amount), String(CURRENCY_RUB)], password);
    const regBody = new URLSearchParams({
      sector,
      amount: String(amount),
      currency: String(CURRENCY_RUB),
      reference: ref,
      description: desc.slice(0, 1000),
      url: "https://example.com/ok",
      failurl: "https://example.com/fail",
      signature: regSig,
      mode: "1",
    });
    const regRes = await fetch(`${baseUrl}/Register`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: regBody.toString(),
    });
    const regText = await regRes.text();
    if (!regRes.ok) {
      console.error("Register HTTP", regRes.status, regText.slice(0, 300));
      return { ok: false };
    }
    const orderIdMatch = regText.trim().match(/^\d+$/) || regText.match(/<id>(\d+)<\/id>/);
    if (!orderIdMatch) {
      console.error("Register: неверный ответ", regText.slice(0, 300));
      return { ok: false };
    }
    const orderId = orderIdMatch[1] ?? regText.trim();
    const relSig = sign([sector, orderId, orderSdRef, toSdRef], password);
    const relBody = new URLSearchParams({
      sector,
      id: orderId,
      from_sd_ref: orderSdRef,
      to_sd_ref: toSdRef,
      signature: relSig,
    });
    let relRes = await fetch(`${baseUrl}/b2puser/sd-services/SDRelocateFunds`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: relBody.toString(),
    });
    let relText = await relRes.text();
    if (relText.match(/<code>133<\/code>/)) {
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS));
      relRes = await fetch(`${baseUrl}/b2puser/sd-services/SDRelocateFunds`, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: relBody.toString(),
      });
      relText = await relRes.text();
    }
    const ok =
      /<state>\s*APPROVED\s*<\/state>/i.test(relText) ||
      /<order_state>\s*COMPLETED\s*<\/order_state>/i.test(relText);
    if (!ok) {
      console.error("SDRelocateFunds: ответ ПЦ (фрагмент):", relText.slice(0, 600));
    }
    return ok ? { ok: true, orderId } : { ok: false };
  };

  console.error("Транзакция:", tx.id, "сумма:", amountKopNum, "коп.", feeKopNum > 0 ? `fee: ${feeKopNum} коп.` : "");
  if (isSbp && companySdRef && feeKopNum > 0) {
    console.error("СБП: комиссия", feeKopNum, "коп. → ЮЛ,", toWaiterKop, "коп. → официант");
  } else {
    console.error("С кубышки заказа:", orderSdRef, "→ официант:", waiterSdRef, toWaiterKop, "коп.");
  }
  console.error("Ожидание", DELAY_MS / 1000, "с перед Register...");
  await new Promise((r) => setTimeout(r, DELAY_MS));

  if (isSbp && companySdRef && feeKopNum > 0) {
    const rFee = await doOneRelocate(feeKopNum, companySdRef, `Комиссия ЮЛ (чаевые ${tx.id})`);
    if (!rFee.ok) {
      await prisma.transaction.updateMany({
        where: { id: tx.id, status: "PENDING" },
        data: { relocateStartedAt: null },
      });
      console.error("Ошибка перевода комиссии на ЮЛ.");
      process.exit(1);
    }
    console.error("Комиссия переведена на кубышку ЮЛ:", companySdRef);
  }

  if (toWaiterKop < 1) {
    console.error("Сумма официанту 0 (вся ушла в комиссию).");
    await prisma.transaction.update({
      where: { id: tx.id },
      data: { status: "SUCCESS", relocateStartedAt: null },
    });
    console.log(JSON.stringify({ ok: true, transactionId: tx.id, feeToLegalKop: feeKopNum, dbStatus: "SUCCESS" }, null, 2));
    await prisma.$disconnect();
    process.exit(0);
  }

  const rWaiter = await doOneRelocate(toWaiterKop, waiterSdRef, `Перевод чаевых → ${waiterSdRef}`);
  if (!rWaiter.ok) {
    console.error("Ошибка перевода на кубышку официанта.");
    await prisma.transaction.updateMany({
      where: { id: tx.id, status: "PENDING" },
      data: { relocateStartedAt: null },
    });
    console.error("relocateStartedAt сброшен — можно повторить позже или вызвать POST /api/pay/sync-transaction");
    process.exit(1);
  }
  console.error("Перелив выполнен успешно.");
  await prisma.transaction.update({
    where: { id: tx.id },
    data: { status: "SUCCESS", relocateStartedAt: null },
  });
  console.log(
    JSON.stringify(
      {
        ok: true,
        transactionId: tx.id,
        toSdRef: waiterSdRef,
        amountKop: toWaiterKop,
        dbStatus: "SUCCESS",
        ...(isSbp && companySdRef && feeKopNum > 0 ? { feeToLegalKop: feeKopNum } : {}),
      },
      null,
      2
    )
  );

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
