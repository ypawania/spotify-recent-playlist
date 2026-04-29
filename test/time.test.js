import test from "node:test";
import assert from "node:assert/strict";
import { parseLocalTime } from "../src/time.js";

test("parseLocalTime accepts explicit timezone", () => {
  const parsed = parseLocalTime("2026-04-29 09:30-04:00");
  assert.equal(parsed.toISOString(), "2026-04-29T13:30:00.000Z");
});

test("parseLocalTime expands today", () => {
  const now = new Date("2026-04-29T16:00:00.000Z");
  const parsed = parseLocalTime("today 09:30-04:00", now);
  assert.equal(parsed.toISOString(), "2026-04-29T13:30:00.000Z");
});
