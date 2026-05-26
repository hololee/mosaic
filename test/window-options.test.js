import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";

import { getAppIconPath, getInitialWindowBounds } from "../src/main/window-options.js";

test("initial app window opens at minimum width with proportional height", () => {
  const bounds = getInitialWindowBounds();

  assert.equal(bounds.width, 860);
  assert.equal(bounds.minWidth, 860);
  assert.equal(bounds.height, 578);
  assert.equal(bounds.minHeight, 578);
});

test("window options expose the app icon path", () => {
  const iconPath = getAppIconPath();

  assert.equal(path.basename(iconPath), "icon.png");
  assert.match(iconPath, /assets[/\\]icon\.png$/);
});
