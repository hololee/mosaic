import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("build asset preparation reuses committed icons outside macOS", async () => {
  const source = await fs.readFile(new URL("../scripts/prepare-build-assets.mjs", import.meta.url), "utf8");

  assert.match(source, /process\.platform !== "darwin"/);
  assert.match(source, /Using committed build icons\./);
  assert.match(source, /Missing committed build icon/);
});
