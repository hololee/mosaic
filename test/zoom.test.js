import test from "node:test";
import assert from "node:assert/strict";

import { getWheelZoomFactor, normalizeWheelDelta } from "../src/shared/zoom.js";

test("trackpad-sized wheel deltas produce gentle zoom changes", () => {
  assert.ok(getWheelZoomFactor(1) > 0.99);
  assert.ok(getWheelZoomFactor(1) < 1);
  assert.ok(getWheelZoomFactor(-1) > 1);
  assert.ok(getWheelZoomFactor(-1) < 1.01);
});

test("large wheel deltas are capped to avoid runaway zooming", () => {
  assert.equal(normalizeWheelDelta(600), 60);
  assert.equal(normalizeWheelDelta(-600), -60);
  assert.equal(getWheelZoomFactor(600), getWheelZoomFactor(60));
});

test("line-mode wheel deltas are converted to pixel-like deltas", () => {
  assert.equal(normalizeWheelDelta(3, 1), 48);
});
