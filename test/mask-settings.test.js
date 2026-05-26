import test from "node:test";
import assert from "node:assert/strict";

import { getSelectionBlockSize, updateSelectedBlockSize } from "../src/shared/mask-settings.js";

test("getSelectionBlockSize returns the selected mask block size", () => {
  const masks = [
    { id: "a", type: "rectangle", blockSize: 12 },
    { id: "b", type: "rectangle", blockSize: 32 },
  ];

  assert.equal(getSelectionBlockSize(masks, new Set(["b"])), 32);
  assert.equal(getSelectionBlockSize(masks, new Set()), null);
});

test("getSelectionBlockSize returns null for mixed selected values", () => {
  const masks = [
    { id: "a", type: "rectangle", blockSize: 12 },
    { id: "b", type: "rectangle", blockSize: 32 },
  ];

  assert.equal(getSelectionBlockSize(masks, new Set(["a", "b"])), null);
});

test("updateSelectedBlockSize only changes selected masks", () => {
  const masks = [
    { id: "a", type: "rectangle", blockSize: 12 },
    { id: "b", type: "ellipse", blockSize: 32 },
  ];

  assert.deepEqual(updateSelectedBlockSize(masks, new Set(["a"]), 40), [
    { id: "a", type: "rectangle", blockSize: 40 },
    { id: "b", type: "ellipse", blockSize: 32 },
  ]);
});
