import test from "node:test";
import assert from "node:assert/strict";

import {
  getDeleteControlCorner,
  getDeleteControlRect,
  getResizeCursor,
  getResizeHandleHit,
  pointInRect,
} from "../src/shared/mask-controls.js";

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
    x: 60,
    y: 85,
    width: 20,
    height: 20,
    corner: "top-left",
  });

  assert.deepEqual(getDeleteControlRect(bounds, view, 2, "Win32", 20), {
    x: 220,
    y: 85,
    width: 20,
    height: 20,
    corner: "top-right",
  });
});

test("delete control stays clear of the resize corner", () => {
  const bounds = { x: 20, y: 30, width: 100, height: 50 };
  const view = { x: 10, y: 15, width: 400, height: 300 };

  assert.equal(pointInRect({ x: 50, y: 75 }, getDeleteControlRect(bounds, view, 2, "MacIntel", 20)), false);
  assert.equal(pointInRect({ x: 250, y: 75 }, getDeleteControlRect(bounds, view, 2, "Win32", 20)), false);
});

test("pointInRect treats the delete control bounds as clickable", () => {
  const rect = { x: 40, y: 65, width: 20, height: 20 };

  assert.equal(pointInRect({ x: 40, y: 65 }, rect), true);
  assert.equal(pointInRect({ x: 60, y: 85 }, rect), true);
  assert.equal(pointInRect({ x: 39.9, y: 75 }, rect), false);
  assert.equal(pointInRect({ x: 50, y: 85.1 }, rect), false);
});

test("resize handle hit testing favors corners and edges around mask bounds", () => {
  const bounds = { x: 20, y: 30, width: 100, height: 50 };
  const view = { x: 10, y: 15, width: 400, height: 300 };

  assert.equal(getResizeHandleHit(bounds, { x: 50, y: 75 }, view, 2, 6), "nw");
  assert.equal(getResizeHandleHit(bounds, { x: 250, y: 75 }, view, 2, 6), "ne");
  assert.equal(getResizeHandleHit(bounds, { x: 250, y: 175 }, view, 2, 6), "se");
  assert.equal(getResizeHandleHit(bounds, { x: 50, y: 175 }, view, 2, 6), "sw");
  assert.equal(getResizeHandleHit(bounds, { x: 150, y: 75 }, view, 2, 6), "n");
  assert.equal(getResizeHandleHit(bounds, { x: 250, y: 125 }, view, 2, 6), "e");
  assert.equal(getResizeHandleHit(bounds, { x: 150, y: 125 }, view, 2, 6), null);
});

test("resize cursors map handles to native cursor directions", () => {
  assert.equal(getResizeCursor("n"), "ns-resize");
  assert.equal(getResizeCursor("s"), "ns-resize");
  assert.equal(getResizeCursor("e"), "ew-resize");
  assert.equal(getResizeCursor("w"), "ew-resize");
  assert.equal(getResizeCursor("nw"), "nwse-resize");
  assert.equal(getResizeCursor("se"), "nwse-resize");
  assert.equal(getResizeCursor("ne"), "nesw-resize");
  assert.equal(getResizeCursor("sw"), "nesw-resize");
});
