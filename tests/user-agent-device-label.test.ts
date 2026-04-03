/**
 * Разбор User-Agent для экрана сессий
 */

import assert from "node:assert/strict";
import { test } from "node:test";
import { describeSessionDevice, summarizeUserAgent } from "../lib/user-agent-device-label";

const chromeWin =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

test("describeSessionDevice: Windows Chrome", () => {
  const d = describeSessionDevice(chromeWin);
  assert.match(d.platformLabel, /Компьютер.*Windows 10\/11/);
  assert.equal(d.browserLabel, "Chrome 131");
});

test("describeSessionDevice: iPhone Safari", () => {
  const ua =
    "Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1";
  const d = describeSessionDevice(ua);
  assert.match(d.platformLabel, /Телефон.*iOS/);
  assert.ok(d.browserLabel?.includes("Safari"));
});

test("summarizeUserAgent combines platform and browser", () => {
  const s = summarizeUserAgent(chromeWin);
  assert.ok(s.includes("Chrome 131"));
  assert.ok(s.includes("Windows"));
});
