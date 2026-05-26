import test from "node:test";
import assert from "node:assert/strict";

import { MIN_RESIZE_SIZE, resizeMask } from "../src/shared/mask-transform.js";

test("resizeMask changes rectangle bounds from the dragged edge", () => {
  const mask = { id: "a", type: "rectangle", x: 20, y: 30, width: 100, height: 50, blockSize: 24 };

  assert.deepEqual(resizeMask(mask, "e", { x: 20, y: 30 }, { x: 45, y: 40 }), {
    ...mask,
    width: 125,
  });

  assert.deepEqual(resizeMask(mask, "nw", { x: 20, y: 30 }, { x: 10, y: 20 }), {
    ...mask,
    x: 10,
    y: 20,
    width: 110,
    height: 60,
  });
});

test("resizeMask keeps rectangles above a minimum size", () => {
  const mask = { id: "a", type: "ellipse", x: 20, y: 30, width: 100, height: 50, blockSize: 24 };

  assert.deepEqual(resizeMask(mask, "w", { x: 20, y: 30 }, { x: 250, y: 30 }, 8), {
    ...mask,
    x: 112,
    width: 8,
  });
});

test("resizeMask uses a selectable default minimum size", () => {
  const mask = { id: "a", type: "rectangle", x: 20, y: 30, width: 100, height: 50, blockSize: 24 };

  assert.equal(MIN_RESIZE_SIZE, 24);
  assert.deepEqual(resizeMask(mask, "se", { x: 120, y: 80 }, { x: 25, y: 35 }), {
    ...mask,
    width: 24,
    height: 24,
  });
});

test("resizeMask scales point masks within their original bounds", () => {
  const mask = {
    id: "lasso",
    type: "lasso",
    points: [
      { x: 20, y: 30 },
      { x: 120, y: 30 },
      { x: 120, y: 80 },
      { x: 20, y: 80 },
    ],
    blockSize: 24,
  };

  assert.deepEqual(resizeMask(mask, "se", { x: 120, y: 80 }, { x: 220, y: 130 }), {
    ...mask,
    points: [
      { x: 20, y: 30 },
      { x: 220, y: 30 },
      { x: 220, y: 130 },
      { x: 20, y: 130 },
    ],
  });
});
