import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("package metadata exposes Mosaic as the product name", async () => {
  const packageJson = JSON.parse(await fs.readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.equal(packageJson.productName, "Mosaic");
});

test("start script uses the Mosaic-named development launcher", async () => {
  const packageJson = JSON.parse(await fs.readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.equal(packageJson.scripts.start, "node scripts/start-dev.mjs");
});
