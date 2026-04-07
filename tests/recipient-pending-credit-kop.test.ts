import test from "node:test";
import assert from "node:assert/strict";
import {
  pendingNetCreditToRecipientKop,
  projectedNetCreditForNewTipKop,
} from "../lib/recipient-pending-credit-kop";

test("projectedNetCreditForNewTipKop: no split — сумма заказа без вычета комиссии (комиссия у плательщика сверху)", () => {
  const net = projectedNetCreditForNewTipKop({
    amountKop: BigInt(10_000),
    tipSplit: null,
  });
  assert.equal(net, BigInt(10_000));
});

test("projectedNetCreditForNewTipKop: доля заведения от полной суммы заказа", () => {
  const net = projectedNetCreditForNewTipKop({
    amountKop: BigInt(10_000),
    tipSplit: { establishmentSharePercent: 10 },
  });
  const share = (BigInt(10_000) * BigInt(1000)) / BigInt(10_000);
  assert.equal(net, BigInt(10_000) - share);
});

test("pendingNetCreditToRecipientKop: карта, feeKop null — не вычитаем оценочную комиссию", () => {
  const net = pendingNetCreditToRecipientKop({
    amountKop: BigInt(5000),
    feeKop: null,
    establishmentShareKop: null,
    paymentMethod: "card",
    payerInfo: null,
  });
  assert.equal(net, BigInt(5000));
});

test("pendingNetCreditToRecipientKop: uses stored fee and share", () => {
  const net = pendingNetCreditToRecipientKop({
    amountKop: BigInt(5000),
    feeKop: BigInt(100),
    establishmentShareKop: BigInt(500),
    paymentMethod: "card",
    payerInfo: null,
  });
  assert.equal(net, BigInt(4400));
});

test("pendingNetCreditToRecipientKop: infers share from payerInfo", () => {
  const net = pendingNetCreditToRecipientKop({
    amountKop: BigInt(10_000),
    feeKop: BigInt(250),
    establishmentShareKop: null,
    paymentMethod: "card",
    payerInfo: JSON.stringify({
      tipSplit: { poolUserId: "x", establishmentSharePercent: 20 },
    }),
  });
  const afterFee = BigInt(9750);
  const share = (afterFee * BigInt(2000)) / BigInt(10_000);
  assert.equal(net, afterFee - share);
});
