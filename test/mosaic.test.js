import test from "node:test";
import assert from "node:assert/strict";

import { clampBlockSize, getMosaicScale } from "../src/shared/mosaic.js";

test("clampBlockSize keeps mosaic blocks in the supported editor range", () => {
  assert.equal(clampBlockSize(1), 4);
  assert.equal(clampBlockSize(24), 24);
  assert.equal(clampBlockSize(96), 72);
});

test("getMosaicScale converts block size to a stable downsample ratio", () => {
  assert.equal(getMosaicScale(4), 0.25);
  assert.equal(getMosaicScale(24), 1 / 24);
  assert.equal(getMosaicScale(72), 1 / 72);
});

