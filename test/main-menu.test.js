import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("application menu exposes the pan hand tool shortcut", async () => {
  const source = await fs.readFile(new URL("../src/main/main.js", import.meta.url), "utf8");

  assert.match(source, /label:\s*"Pan"/);
  assert.match(source, /accelerator:\s*"H"/);
  assert.match(source, /tool:\s*"pan"/);
});
