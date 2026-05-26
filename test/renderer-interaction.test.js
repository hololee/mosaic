import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("renderer checks delete and existing-mask interactions before shape drawing", async () => {
  const source = await fs.readFile(new URL("../src/renderer/app.js", import.meta.url), "utf8");

  const deleteHitIndex = source.indexOf("const deleteHit = getDeleteControlHit(event);");
  const existingHitIndex = source.indexOf("const existingMask = hitTest(imagePoint);");
  const drawIndex = source.indexOf('state.action = "draw";');

  assert.ok(deleteHitIndex > -1, "pointer down should check the hover delete control");
  assert.ok(existingHitIndex > -1, "pointer down should hit-test existing masks for any drawing tool");
  assert.ok(deleteHitIndex < existingHitIndex, "delete affordance should take priority over move selection");
  assert.ok(existingHitIndex < drawIndex, "existing masks should take priority over starting a new shape");
  assert.match(source, /if \(existingMask && state\.tool !== "eraser"\)/);
});

test("renderer draws and clears the hover delete control", async () => {
  const source = await fs.readFile(new URL("../src/renderer/app.js", import.meta.url), "utf8");

  assert.match(source, /drawDeleteControl\(hoveredMask,\s*view\);/);
  assert.match(source, /canvas\.addEventListener\("pointerleave", clearHoverState\);/);
});
