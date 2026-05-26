import test from "node:test";
import assert from "node:assert/strict";

import { getInitialWindowBounds } from "../src/main/window-options.js";

test("initial app window opens at minimum width with proportional height", () => {
  const bounds = getInitialWindowBounds();

  assert.equal(bounds.width, 860);
  assert.equal(bounds.minWidth, 860);
  assert.equal(bounds.height, 578);
  assert.equal(bounds.minHeight, 578);
});

