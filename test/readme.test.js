import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("README starts with the banner and release badge", async () => {
  const readme = await fs.readFile(new URL("../README.md", import.meta.url), "utf8");

  assert.match(readme, /^<p align="center">\n  <img src="assets\/readme-banner.svg"/);
  assert.match(readme, /https:\/\/img\.shields\.io\/github\/v\/release\/hololee\/mosaic\?label=release/);
  assert.match(readme, /https:\/\/github\.com\/hololee\/mosaic\/releases\/latest/);
});

test("README links to platform build wiki pages", async () => {
  const readme = await fs.readFile(new URL("../README.md", import.meta.url), "utf8");

  assert.match(readme, /macOS build guide/);
  assert.match(readme, /https:\/\/github\.com\/hololee\/mosaic\/wiki\/macOS-Build/);
  assert.match(readme, /Windows build guide/);
  assert.match(readme, /https:\/\/github\.com\/hololee\/mosaic\/wiki\/Windows-Build/);
});

test("README documents update checks and release metadata", async () => {
  const readme = await fs.readFile(new URL("../README.md", import.meta.url), "utf8");

  assert.match(readme, /Mosaic checks GitHub Releases for updates after launch/);
  assert.match(readme, /latest\.yml/);
  assert.match(readme, /latest-mac\.yml/);
  assert.match(readme, /Check for Updates: `CmdOrCtrl\+Alt\+U`/);
});
