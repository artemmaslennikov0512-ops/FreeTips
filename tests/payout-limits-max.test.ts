import test from "node:test";
import assert from "node:assert/strict";
import { computeEffectiveMaxPayoutPerRequestKop } from "../lib/payout-limits";
import { PAYOUT_MAX_AMOUNT_KOP } from "../lib/payout-amount-bounds";

test("computeEffectiveMaxPayoutPerRequestKop caps by daily remainder", () => {
  const max = computeEffectiveMaxPayoutPerRequestKop({
    autoConfirmPayoutThresholdKop: null,
    dailyLimitKop: BigInt(500_000), // 5 000 ₽
    todayCompletedSumKop: BigInt(0),
    monthlyLimitKop: null,
    monthCompletedSumKop: BigInt(0),
  });
  assert.equal(max, BigInt(500_000));
});

test("computeEffectiveMaxPayoutPerRequestKop uses global max when daily allows", () => {
  const max = computeEffectiveMaxPayoutPerRequestKop({
    autoConfirmPayoutThresholdKop: null,
    dailyLimitKop: BigInt(50_000_000),
    todayCompletedSumKop: BigInt(0),
    monthlyLimitKop: null,
    monthCompletedSumKop: BigInt(0),
  });
  assert.equal(max, BigInt(PAYOUT_MAX_AMOUNT_KOP));
});

test("computeEffectiveMaxPayoutPerRequestKop respects auto-confirm threshold", () => {
  const max = computeEffectiveMaxPayoutPerRequestKop({
    autoConfirmPayoutThresholdKop: BigInt(200_000), // 2 000 ₽
    dailyLimitKop: BigInt(10_000_000),
    todayCompletedSumKop: BigInt(0),
    monthlyLimitKop: null,
    monthCompletedSumKop: BigInt(0),
  });
  assert.equal(max, BigInt(200_000));
});

test("computeEffectiveMaxPayoutPerRequestKop takes minimum of daily and monthly remainder", () => {
  const max = computeEffectiveMaxPayoutPerRequestKop({
    autoConfirmPayoutThresholdKop: null,
    dailyLimitKop: BigInt(500_000),
    todayCompletedSumKop: BigInt(0),
    monthlyLimitKop: BigInt(300_000),
    monthCompletedSumKop: BigInt(0),
  });
  assert.equal(max, BigInt(300_000));
});
