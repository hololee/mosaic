import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("README links to platform build wiki pages", async () => {
  const readme = await fs.readFile(new URL("../README.md", import.meta.url), "utf8");

  assert.match(readme, /macOS build guide/);
  assert.match(readme, /https:\/\/github\.com\/hololee\/mosaic\/wiki\/macOS-Build/);
  assert.match(readme, /Windows build guide/);
  assert.match(readme, /https:\/\/github\.com\/hololee\/mosaic\/wiki\/Windows-Build/);
});
