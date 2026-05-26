import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("toolbar can wrap without being clipped by the page grid", async () => {
  const css = await fs.readFile(new URL("../src/renderer/styles.css", import.meta.url), "utf8");

  assert.match(css, /grid-template-rows:\s*auto\s+minmax\(0,\s*1fr\)\s+28px;/);
  assert.match(css, /\.toolbar,\s*\n\.statusbar\s*{[^}]*align-items:\s*center;/s);
  assert.match(css, /\.toolbar\s*{[^}]*flex-wrap:\s*wrap;/s);
  assert.match(css, /\.toolbar\s*{[^}]*min-height:\s*48px;/s);
});

