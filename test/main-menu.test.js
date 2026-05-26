import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("application menu exposes the pan hand tool shortcut without a separate move tool", async () => {
  const source = await fs.readFile(new URL("../src/main/main.js", import.meta.url), "utf8");

  assert.match(source, /label:\s*"Pan"/);
  assert.match(source, /accelerator:\s*"H"/);
  assert.match(source, /tool:\s*"pan"/);
  assert.doesNotMatch(source, /label:\s*"Move"/);
  assert.doesNotMatch(source, /accelerator:\s*"V"/);
});

test("application menu lists rectangle as the first drawing tool", async () => {
  const source = await fs.readFile(new URL("../src/main/main.js", import.meta.url), "utf8");

  const rectangleIndex = source.indexOf('label: "Rectangle"');
  const panIndex = source.indexOf('label: "Pan"');

  assert.ok(rectangleIndex > -1, "rectangle should be in the tools menu");
  assert.ok(panIndex > -1, "pan should be in the tools menu");
  assert.ok(rectangleIndex < panIndex, "rectangle should appear before pan");
});

test("main process applies the app icon to windows and macOS dock", async () => {
  const source = await fs.readFile(new URL("../src/main/main.js", import.meta.url), "utf8");

  assert.match(source, /icon:\s*getAppIconPath\(\)/);
  assert.match(source, /app\.dock\?\.setIcon\(getAppIconPath\(\)\)/);
});
