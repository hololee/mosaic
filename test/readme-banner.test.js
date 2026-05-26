import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("README banner asset presents Mosaic branding", async () => {
  const banner = await fs.readFile(new URL("../assets/readme-banner.svg", import.meta.url), "utf8");

  assert.match(banner, /<svg/);
  assert.match(banner, /viewBox="0 0 1776 899"/);
  assert.match(banner, /Mosaic/);
  assert.match(banner, /Editable mosaic redaction/);
});
