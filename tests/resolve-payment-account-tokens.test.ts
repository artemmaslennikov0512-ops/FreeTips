import test from "node:test";
import assert from "node:assert/strict";
import {
  extractPaySlugFromToken,
  tokenLooksLikePayPageUrl,
} from "../lib/resolve-payment-account-tokens";

test("tokenLooksLikePayPageUrl: absolute URL and /pay/ path", () => {
  assert.equal(tokenLooksLikePayPageUrl("https://free-tips.ru/pay/000-001"), true);
  assert.equal(tokenLooksLikePayPageUrl("HTTP://x/PAY/a"), true);
  assert.equal(tokenLooksLikePayPageUrl("free-tips.ru/pay/abc"), true);
  assert.equal(tokenLooksLikePayPageUrl("ivanov"), false);
});

test("extractPaySlugFromToken: slug without query", () => {
  assert.equal(extractPaySlugFromToken("https://free-tips.ru/pay/000-001"), "000-001");
  assert.equal(extractPaySlugFromToken("https://free-tips.ru/pay/000-001/"), "000-001");
  assert.equal(extractPaySlugFromToken("https://free-tips.ru/pay/000-001?utm=1"), "000-001");
  assert.equal(extractPaySlugFromToken("/pay/my-code"), "my-code");
});

test("extractPaySlugFromToken: no pay segment", () => {
  assert.equal(extractPaySlugFromToken("https://example.com/"), null);
  assert.equal(extractPaySlugFromToken(""), null);
});
