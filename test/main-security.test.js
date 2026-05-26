import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("main window uses a temporary renderer session", async () => {
  const source = await fs.readFile(new URL("../src/main/main.js", import.meta.url), "utf8");

  assert.match(source, /const RENDERER_SESSION_PARTITION = "mosaic-temporary";/);
  assert.match(source, /partition:\s*RENDERER_SESSION_PARTITION/);
  assert.doesNotMatch(source, /persist:mosaic-temporary/);
});
