import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  normalizePaygineOrderStateToken,
  parsePaygineOrderResponseXml,
  isPaygineOrderPaidInOrderResponse,
} from "@/lib/payment/paygine/client";

describe("normalizePaygineOrderStateToken", () => {
  it("maps numeric Paygine order_state 2 to COMPLETED", () => {
    assert.equal(normalizePaygineOrderStateToken("2"), "COMPLETED");
    assert.equal(normalizePaygineOrderStateToken(" 2 "), "COMPLETED");
  });

  it("maps COMPLETE to COMPLETED", () => {
    assert.equal(normalizePaygineOrderStateToken("complete"), "COMPLETED");
  });

  it("passes through COMPLETED and APPROVED", () => {
    assert.equal(normalizePaygineOrderStateToken("COMPLETED"), "COMPLETED");
    assert.equal(normalizePaygineOrderStateToken("approved"), "APPROVED");
  });
});

describe("parsePaygineOrderResponseXml", () => {
  it("detects paid order when only order_state is numeric 2", () => {
    const xml = `<?xml version="1.0"?><order><id>999</id><order_state>2</order_state></order>`;
    const p = parsePaygineOrderResponseXml(xml);
    assert(p);
    assert.equal(p.orderState, "COMPLETED");
    assert.equal(p.operationState, null);
    assert.equal(isPaygineOrderPaidInOrderResponse(p.orderState, p.operationState), true);
  });

  it("detects paid order from doc-style order + operations", () => {
    const xml = `<?xml version="1.0"?>
<order>
 <id>441</id>
 <state>REGISTERED</state>
 <operations number="1">
 <operation>
 <type>PURCHASE</type>
 <state>APPROVED</state>
 </operation>
 </operations>
</order>`;
    const p = parsePaygineOrderResponseXml(xml);
    assert(p);
    assert.equal(p.orderState, "REGISTERED");
    assert.equal(p.operationState, "APPROVED");
    assert.equal(isPaygineOrderPaidInOrderResponse(p.orderState, p.operationState), true);
  });

  it("detects COMPLETED text in order_state tag", () => {
    const xml = `<order><order_state>COMPLETED</order_state></order>`;
    const p = parsePaygineOrderResponseXml(xml);
    assert(p);
    assert.equal(isPaygineOrderPaidInOrderResponse(p.orderState, p.operationState), true);
  });
});
