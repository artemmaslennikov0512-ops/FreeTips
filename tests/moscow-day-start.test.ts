import test from "node:test";
import assert from "node:assert/strict";
import { getMoscowDayStart } from "../lib/payout-limits";

test("getMoscowDayStart: instant is midnight in Europe/Moscow", () => {
  const start = getMoscowDayStart();
  const hm = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Moscow",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(start);
  assert.equal(hm, "00:00");
});

test("getMoscowDayStart: not after now", () => {
  const now = new Date();
  assert.ok(getMoscowDayStart(now).getTime() <= now.getTime());
});
