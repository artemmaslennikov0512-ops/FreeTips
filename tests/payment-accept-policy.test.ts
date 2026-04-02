import test from "node:test";
import assert from "node:assert/strict";
import { recipientCanAcceptIncomingTips } from "../lib/payment-accept-policy";

const base = {
  globalPaymentsDisabled: false,
  paymentWhitelistUserIds: [] as string[],
  paymentBlacklistUserIds: [] as string[],
};

test("normal mode: everyone accepts except blacklist", () => {
  const uid = "user-a";
  assert.equal(recipientCanAcceptIncomingTips(uid, { ...base, paymentBlacklistUserIds: [] }), true);
  assert.equal(recipientCanAcceptIncomingTips(uid, { ...base, paymentBlacklistUserIds: ["user-a"] }), false);
  assert.equal(recipientCanAcceptIncomingTips(uid, { ...base, paymentBlacklistUserIds: ["other"] }), true);
});

test("global stop: only whitelist accepts", () => {
  const uid = "user-a";
  assert.equal(
    recipientCanAcceptIncomingTips(uid, {
      ...base,
      globalPaymentsDisabled: true,
      paymentWhitelistUserIds: [],
    }),
    false,
  );
  assert.equal(
    recipientCanAcceptIncomingTips(uid, {
      ...base,
      globalPaymentsDisabled: true,
      paymentWhitelistUserIds: ["user-a"],
    }),
    true,
  );
  assert.equal(
    recipientCanAcceptIncomingTips("other", {
      ...base,
      globalPaymentsDisabled: true,
      paymentWhitelistUserIds: ["user-a"],
    }),
    false,
  );
});

test("global stop + whitelist wins over blacklist semantics", () => {
  const uid = "user-a";
  assert.equal(
    recipientCanAcceptIncomingTips(uid, {
      globalPaymentsDisabled: true,
      paymentWhitelistUserIds: ["user-a"],
      paymentBlacklistUserIds: ["user-a"],
    }),
    true,
  );
});
