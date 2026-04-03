import { test } from "node:test";
import assert from "node:assert/strict";
import {
  RELOCATE_CLAIM_ALERT_AFTER_MS,
  RELOCATE_CLAIM_STALE_MS,
} from "@/lib/payment/relocate-constants";

test("RELOCATE_CLAIM_ALERT_AFTER_MS > RELOCATE_CLAIM_STALE_MS", () => {
  assert.ok(RELOCATE_CLAIM_ALERT_AFTER_MS > RELOCATE_CLAIM_STALE_MS);
});
