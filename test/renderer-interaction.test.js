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
  assert.match(source, /if \(existingMask\)/);
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

test("renderer starts with rectangle as the active tool", async () => {
  const source = await fs.readFile(new URL("../src/renderer/app.js", import.meta.url), "utf8");

  assert.match(source, /tool:\s*"rectangle"/);
  assert.match(source, /setTool\("rectangle"\)/);
});

test("renderer supports the pan hand tool", async () => {
  const source = await fs.readFile(new URL("../src/renderer/app.js", import.meta.url), "utf8");
  const resizeHitIndex = source.indexOf("const resizeHit = getResizeControlHit(event);");
  const existingHitIndex = source.indexOf("const existingMask = hitTest(imagePoint);");
  const panToolIndex = source.lastIndexOf('if (state.tool === "pan" && event.button === 0)');

  assert.match(source, /h:\s*"pan"/);
  assert.doesNotMatch(source, /v:\s*"move"/);
  assert.match(source, /state\.tool === "pan"/);
  assert.match(source, /return "grab";/);
  assert.ok(resizeHitIndex < panToolIndex, "pan tool should allow boundary resize before panning");
  assert.ok(existingHitIndex < panToolIndex, "pan tool should allow mask selection before panning");
});

test("renderer no longer exposes brush or eraser as selectable tools", async () => {
  const source = await fs.readFile(new URL("../src/renderer/app.js", import.meta.url), "utf8");

  assert.doesNotMatch(source, /b:\s*"brush"/);
  assert.doesNotMatch(source, /e:\s*"eraser"/);
  assert.doesNotMatch(source, /state\.tool === "brush"/);
  assert.doesNotMatch(source, /state\.tool === "eraser"/);
  assert.doesNotMatch(source, /state\.tool !== "eraser"/);
  assert.doesNotMatch(source, /state\.action === "erase"/);
});

test("renderer shows custom tooltips immediately", async () => {
  const source = await fs.readFile(new URL("../src/renderer/app.js", import.meta.url), "utf8");

  assert.match(source, /document\.querySelectorAll\("\[data-tooltip\]"\)/);
  assert.match(source, /addEventListener\("pointerenter",/);
  assert.match(source, /function showTooltip\(target\)/);
  assert.match(source, /function positionTooltip\(target\)/);
});

test("renderer opens clipboard images from the toolbar", async () => {
  const source = await fs.readFile(new URL("../src/renderer/app.js", import.meta.url), "utf8");

  assert.match(source, /document\.querySelector\("#clipboardOpenButton"\)\.addEventListener\("click", newFromClipboard\);/);
});
