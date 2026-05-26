import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("renderer draws inactive mask outlines separately from selected outlines", async () => {
  const source = await fs.readFile(new URL("../src/renderer/app.js", import.meta.url), "utf8");

  assert.match(source, /const ACTIVE_MASK_OUTLINE = "#68d391";/);
  assert.match(source, /drawMaskOutline\(mask,\s*view,\s*getInactiveMaskOutline\(mask\),\s*1\.25\);/);
  assert.match(source, /drawMaskOutline\(mask,\s*view,\s*ACTIVE_MASK_OUTLINE,\s*2\);/);
});
