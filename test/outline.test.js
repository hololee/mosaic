import test from "node:test";
import assert from "node:assert/strict";

import {
  getContrastingGrayRGBA,
  getContrastingGrayOutline,
  getMaskBounds,
  getMaskSamplePoint,
  getRelativeLuminance,
} from "../src/shared/outline.js";

test("getRelativeLuminance converts rgb to perceived grayscale brightness", () => {
  assert.equal(getRelativeLuminance([0, 0, 0]), 0);
  assert.equal(getRelativeLuminance([255, 255, 255]), 255);
  assert.equal(getRelativeLuminance([255, 0, 0]), 54);
});

test("getContrastingGrayOutline switches grayscale outline against background brightness", () => {
  assert.equal(getContrastingGrayOutline(24), "rgba(245, 245, 245, 0.72)");
  assert.equal(getContrastingGrayOutline(232), "rgba(18, 18, 18, 0.72)");
});

test("getContrastingGrayRGBA returns per-pixel grayscale channels for canvas image data", () => {
  assert.deepEqual(getContrastingGrayRGBA(24), [245, 245, 245, 184]);
  assert.deepEqual(getContrastingGrayRGBA(232), [18, 18, 18, 184]);
});

test("getMaskBounds returns the image-space extent of shapes and point paths", () => {
  assert.deepEqual(getMaskBounds({ type: "ellipse", x: 10, y: 20, width: 80, height: 40 }), {
    x: 10,
    y: 20,
    width: 80,
    height: 40,
  });
  assert.deepEqual(getMaskBounds({ type: "brush", radius: 8, points: [{ x: 10, y: 20 }, { x: 60, y: 40 }] }), {
    x: 2,
    y: 12,
    width: 66,
    height: 36,
  });
});

test("getMaskSamplePoint samples the center of shape and path masks", () => {
  assert.deepEqual(
    getMaskSamplePoint({ type: "rectangle", x: 10, y: 20, width: 80, height: 40 }, 200, 200),
    { x: 50, y: 40 },
  );
  assert.deepEqual(
    getMaskSamplePoint({ type: "lasso", points: [{ x: 10, y: 20 }, { x: 60, y: 40 }, { x: 30, y: 80 }] }, 200, 200),
    { x: 35, y: 50 },
  );
});
