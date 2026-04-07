import test from "node:test";
import assert from "node:assert/strict";
import { pendingCreatedLowerBound, pendingFreshnessMinutesForLimits } from "../lib/recipient-pay-limits";

test("pendingFreshnessMinutesForLimits: без интервала в настройках → 5", () => {
  assert.equal(
    pendingFreshnessMinutesForLimits({
      recipientMaxIncomingKopPerMskDay: null,
      recipientMaxConcurrentPendingPayments: null,
      recipientMinMinutesBetweenPayInits: null,
      recipientMaxPayInitsPerDay: null,
    }),
    5,
  );
});

test("pendingFreshnessMinutesForLimits: из настроек", () => {
  assert.equal(
    pendingFreshnessMinutesForLimits({
      recipientMaxIncomingKopPerMskDay: null,
      recipientMaxConcurrentPendingPayments: null,
      recipientMinMinutesBetweenPayInits: 7,
      recipientMaxPayInitsPerDay: null,
    }),
    7,
  );
});

test("pendingCreatedLowerBound: граница = max(полночь МСК, now − N мин)", () => {
  const moscowDay = new Date("2026-04-07T00:00:00+03:00");
  const now = new Date("2026-04-07T12:00:00+03:00");
  const lim = pendingCreatedLowerBound(
    moscowDay,
    {
      recipientMaxIncomingKopPerMskDay: null,
      recipientMaxConcurrentPendingPayments: null,
      recipientMinMinutesBetweenPayInits: 5,
      recipientMaxPayInitsPerDay: null,
    },
    now,
  );
  assert.equal(lim.toISOString(), new Date("2026-04-07T11:55:00+03:00").toISOString());
});
