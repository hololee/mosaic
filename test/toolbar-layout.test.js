import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("toolbar can wrap without being clipped by the page grid", async () => {
  const css = await fs.readFile(new URL("../src/renderer/styles.css", import.meta.url), "utf8");
  const html = await fs.readFile(new URL("../src/renderer/index.html", import.meta.url), "utf8");

  assert.match(css, /grid-template-rows:\s*auto\s+minmax\(0,\s*1fr\)\s+28px;/);
  assert.match(css, /\.toolbar,\s*\n\.statusbar\s*{[^}]*align-items:\s*center;/s);
  assert.match(css, /\.toolbar\s*{[^}]*flex-wrap:\s*wrap;/s);
  assert.match(css, /\.toolbar\s*{[^}]*min-height:\s*48px;/s);
  assert.match(html, /<div class="toolbar-group toolbar-file">[\s\S]*id="openButton"[\s\S]*<\/div>/);
  assert.match(html, /<div class="toolbar-group toolbar-tools">[\s\S]*data-tool="move"[\s\S]*data-tool="pan"[\s\S]*data-tool="eraser"[\s\S]*<\/div>/);
  assert.match(html, /<div class="toolbar-group toolbar-history">[\s\S]*id="undoButton"[\s\S]*id="redoButton"[\s\S]*<\/div>/);
  assert.match(html, /<div class="toolbar-group toolbar-mosaic">[\s\S]*id="blockSize"[\s\S]*<\/div>/);
  assert.match(html, /<div class="toolbar-group toolbar-view">[\s\S]*id="fitButton"[\s\S]*id="actualButton"[\s\S]*<\/div>\s*<div class="toolbar-group toolbar-output">[\s\S]*id="saveButton"[\s\S]*id="clipboardButton"[\s\S]*<\/div>/);
  assert.doesNotMatch(html, /class="toolbar-tail"/);
  assert.doesNotMatch(css, /\.toolbar-tail/);
  assert.doesNotMatch(css, /margin-left:\s*auto;/);
  assert.doesNotMatch(html, /class="spacer"/);
});

test("toolbar buttons expose native tooltips", async () => {
  const html = await fs.readFile(new URL("../src/renderer/index.html", import.meta.url), "utf8");
  const buttons = [...html.matchAll(/<button\b[^>]*>/g)].map((match) => match[0]);

  assert.ok(buttons.length > 0);
  for (const button of buttons) {
    assert.match(button, /\btitle="/, `${button} should have a title tooltip`);
    assert.match(button, /\baria-label="/, `${button} should have an accessible label`);
  }
});
