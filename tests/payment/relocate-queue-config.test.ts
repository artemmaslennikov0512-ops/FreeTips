import { test } from "node:test";
import assert from "node:assert/strict";
import {
  getPaygineRelocateQueueConcurrency,
  getWebhookRateLimitPerMinute,
  resetConfigCache,
} from "@/lib/config";

test("getWebhookRateLimitPerMinute defaults and clamps", () => {
  const prev = process.env.WEBHOOK_RATE_LIMIT_MAX;
  try {
    delete process.env.WEBHOOK_RATE_LIMIT_MAX;
    resetConfigCache();
    assert.equal(getWebhookRateLimitPerMinute(), 600);
    process.env.WEBHOOK_RATE_LIMIT_MAX = "29";
    assert.equal(getWebhookRateLimitPerMinute(), 600);
    process.env.WEBHOOK_RATE_LIMIT_MAX = "1200";
    assert.equal(getWebhookRateLimitPerMinute(), 1200);
    process.env.WEBHOOK_RATE_LIMIT_MAX = "999999";
    assert.equal(getWebhookRateLimitPerMinute(), 20000);
  } finally {
    if (prev === undefined) delete process.env.WEBHOOK_RATE_LIMIT_MAX;
    else process.env.WEBHOOK_RATE_LIMIT_MAX = prev;
    resetConfigCache();
  }
});

test("getPaygineRelocateQueueConcurrency defaults and clamps", () => {
  const prev = process.env.PAYGINE_RELOCATE_QUEUE_CONCURRENCY;
  try {
    delete process.env.PAYGINE_RELOCATE_QUEUE_CONCURRENCY;
    resetConfigCache();
    assert.equal(getPaygineRelocateQueueConcurrency(), 4);
    process.env.PAYGINE_RELOCATE_QUEUE_CONCURRENCY = "0";
    assert.equal(getPaygineRelocateQueueConcurrency(), 4);
    process.env.PAYGINE_RELOCATE_QUEUE_CONCURRENCY = "8";
    assert.equal(getPaygineRelocateQueueConcurrency(), 8);
    process.env.PAYGINE_RELOCATE_QUEUE_CONCURRENCY = "99";
    assert.equal(getPaygineRelocateQueueConcurrency(), 4);
  } finally {
    if (prev === undefined) delete process.env.PAYGINE_RELOCATE_QUEUE_CONCURRENCY;
    else process.env.PAYGINE_RELOCATE_QUEUE_CONCURRENCY = prev;
    resetConfigCache();
  }
});
