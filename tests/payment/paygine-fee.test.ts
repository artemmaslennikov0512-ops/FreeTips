import test from "node:test";
import assert from "node:assert/strict";
import { feeKopForPayout, FEE_MIN_PAYOUT_KOP } from "../../lib/payment/paygine-fee";

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
