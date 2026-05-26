import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("renderer draws inactive mask outlines separately from selected outlines", async () => {
  const source = await fs.readFile(new URL("../src/renderer/app.js", import.meta.url), "utf8");

  assert.match(source, /const INACTIVE_MASK_OUTLINE = "rgba\(238, 242, 247, 0\.42\)";/);
  assert.match(source, /const ACTIVE_MASK_OUTLINE = "#68d391";/);
  assert.match(source, /drawMaskOutline\(mask,\s*view,\s*INACTIVE_MASK_OUTLINE,\s*1\);/);
  assert.match(source, /drawMaskOutline\(mask,\s*view,\s*ACTIVE_MASK_OUTLINE,\s*2\);/);
});

