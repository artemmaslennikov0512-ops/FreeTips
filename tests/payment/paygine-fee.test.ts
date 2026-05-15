import test from "node:test";
import assert from "node:assert/strict";
import { feeKopForPayout, feeKopForIncoming, guestChargedKopForIncomingCardOrder, FEE_MIN_PAYOUT_KOP } from "../../lib/payment/paygine-fee";

test("feeKopForPayout: 0 или невалидно → 0", () => {
  assert.equal(feeKopForPayout(0), 0);
  assert.equal(feeKopForPayout(-100), 0);
  assert.equal(feeKopForPayout(Number.NaN), 0);
});

test("feeKopForPayout: 1% ниже минимума → минимум 30 ₽", () => {
  assert.equal(feeKopForPayout(10_000), FEE_MIN_PAYOUT_KOP);
});

test("feeKopForPayout: 1% выше минимума → процент", () => {
  assert.equal(feeKopForPayout(500_000), 5_000);
});

test("guestChargedKopForIncomingCardOrder: 121 ₽ чаевых + 2.5% комиссии", () => {
  assert.equal(feeKopForIncoming(12_100, "card"), 303);
  assert.equal(
    Number(guestChargedKopForIncomingCardOrder(BigInt(12_100), null)),
    12_100 + 303,
  );
});

test("guestChargedKopForIncomingCardOrder: feeKop 0 в БД — всё равно добавляем расчётную комиссию (пуш totalGuestPaidTipsKop)", () => {
  assert.equal(Number(guestChargedKopForIncomingCardOrder(BigInt(5_000), BigInt(0))), 5_000 + 125);
});

test("guestChargedKopForIncomingCardOrder: положительный feeKop в БД — не пересчитываем", () => {
  assert.equal(Number(guestChargedKopForIncomingCardOrder(BigInt(5_000), BigInt(99))), 5_000 + 99);
});
