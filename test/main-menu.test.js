import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("main process uses Mosaic as the application name", async () => {
  const source = await fs.readFile(new URL("../src/main/main.js", import.meta.url), "utf8");

  assert.match(source, /const APP_NAME = "Mosaic";/);
  assert.match(source, /app\.setName\(APP_NAME\)/);
  assert.match(source, /label:\s*APP_NAME/);
});

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

test("application menu no longer exposes brush or eraser tools", async () => {
  const source = await fs.readFile(new URL("../src/main/main.js", import.meta.url), "utf8");

  assert.doesNotMatch(source, /label:\s*"Brush"/);
  assert.doesNotMatch(source, /label:\s*"Eraser"/);
  assert.doesNotMatch(source, /tool:\s*"brush"/);
  assert.doesNotMatch(source, /tool:\s*"eraser"/);
  assert.doesNotMatch(source, /accelerator:\s*"B"/);
  assert.doesNotMatch(source, /accelerator:\s*"E"/);
});

test("main process applies the app icon to windows and macOS dock", async () => {
  const source = await fs.readFile(new URL("../src/main/main.js", import.meta.url), "utf8");

  assert.match(source, /icon:\s*getAppIconPath\(\)/);
  assert.match(source, /app\.dock\?\.setIcon\(getAppIconPath\(\)\)/);
});

test("application menu exposes manual update checks", async () => {
  const source = await fs.readFile(new URL("../src/main/main.js", import.meta.url), "utf8");

  assert.match(source, /label:\s*"Check for Updates\.\.\."/);
  assert.match(source, /accelerator:\s*"CmdOrCtrl\+Alt\+U"/);
  assert.match(source, /updateController\.checkForUpdates\(\{\s*manual:\s*true\s*\}\)/);
});

test("main process accepts GIF files and can export animated GIF data", async () => {
  const source = await fs.readFile(new URL("../src/main/main.js", import.meta.url), "utf8");

  assert.match(source, /imageExtensions = new Set\(\[[^\]]*"\.gif"/s);
  assert.match(source, /extensions:\s*\[[^\]]*"gif"/s);
  assert.match(source, /name:\s*"GIF Image"/);
  assert.match(source, /payload\.gifDataUrl/);
  assert.match(source, /return "image\/gif";/);
});
