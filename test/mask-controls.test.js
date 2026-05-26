import test from "node:test";
import assert from "node:assert/strict";

import { getDeleteControlCorner, getDeleteControlRect, pointInRect } from "../src/shared/mask-controls.js";

test("delete control uses the platform-specific top corner", () => {
  assert.equal(getDeleteControlCorner("MacIntel"), "top-left");
  assert.equal(getDeleteControlCorner("Mac OS"), "top-left");
  assert.equal(getDeleteControlCorner("Win32"), "top-right");
  assert.equal(getDeleteControlCorner("Linux x86_64"), "top-right");
});

test("delete control rect follows the mask corner in canvas coordinates", () => {
  const bounds = { x: 20, y: 30, width: 100, height: 50 };
  const view = { x: 10, y: 15, width: 400, height: 300 };

  assert.deepEqual(getDeleteControlRect(bounds, view, 2, "MacIntel", 20), {
    x: 40,
    y: 65,
    width: 20,
    height: 20,
    corner: "top-left",
  });

  assert.deepEqual(getDeleteControlRect(bounds, view, 2, "Win32", 20), {
    x: 240,
    y: 65,
    width: 20,
    height: 20,
    corner: "top-right",
  });
});

test("pointInRect treats the delete control bounds as clickable", () => {
  const rect = { x: 40, y: 65, width: 20, height: 20 };

  assert.equal(pointInRect({ x: 40, y: 65 }, rect), true);
  assert.equal(pointInRect({ x: 60, y: 85 }, rect), true);
  assert.equal(pointInRect({ x: 39.9, y: 75 }, rect), false);
  assert.equal(pointInRect({ x: 50, y: 85.1 }, rect), false);
});
