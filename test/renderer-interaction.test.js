import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("renderer checks delete and existing-mask interactions before shape drawing", async () => {
  const source = await fs.readFile(new URL("../src/renderer/app.js", import.meta.url), "utf8");

  const deleteHitIndex = source.indexOf("const deleteHit = getDeleteControlHit(event);");
  const resizeHitIndex = source.indexOf("const resizeHit = getResizeControlHit(event);");
  const existingHitIndex = source.indexOf("const existingMask = hitTest(imagePoint);");
  const drawIndex = source.indexOf('state.action = "draw";');

  assert.ok(deleteHitIndex > -1, "pointer down should check the hover delete control");
  assert.ok(resizeHitIndex > -1, "pointer down should check resize handles");
  assert.ok(existingHitIndex > -1, "pointer down should hit-test existing masks for any drawing tool");
  assert.ok(deleteHitIndex < resizeHitIndex, "delete affordance should take priority over resizing");
  assert.ok(resizeHitIndex < existingHitIndex, "resize handles should take priority over move selection");
  assert.ok(existingHitIndex < drawIndex, "existing masks should take priority over starting a new shape");
  assert.match(source, /if \(existingMask && state\.tool !== "eraser"\)/);
});

test("renderer applies resize actions during pointer movement", async () => {
  const source = await fs.readFile(new URL("../src/renderer/app.js", import.meta.url), "utf8");

  assert.match(source, /state\.action === "resize"/);
  assert.match(source, /resizeMask\(/);
  assert.match(source, /getResizeCursor\(resizeHit\.handle\)/);
});

test("renderer draws and clears the hover delete control", async () => {
  const source = await fs.readFile(new URL("../src/renderer/app.js", import.meta.url), "utf8");

  assert.match(source, /drawDeleteControl\(hoveredMask,\s*view\);/);
  assert.match(source, /canvas\.addEventListener\("pointerleave", clearHoverState\);/);
});

test("renderer syncs block size controls with selected masks", async () => {
  const source = await fs.readFile(new URL("../src/renderer/app.js", import.meta.url), "utf8");

  assert.match(source, /function syncBlockSizeControl\(\)/);
  assert.match(source, /getSelectionBlockSize\(state\.masks,\s*state\.selectedIds\)/);
  assert.match(source, /updateSelectedBlockSize\(state\.masks,\s*state\.selectedIds,\s*nextBlockSize\)/);
});

test("renderer scales wheel zoom by input delta", async () => {
  const source = await fs.readFile(new URL("../src/renderer/app.js", import.meta.url), "utf8");

  assert.match(source, /getWheelZoomFactor\(event\.deltaY,\s*event\.deltaMode\)/);
});
