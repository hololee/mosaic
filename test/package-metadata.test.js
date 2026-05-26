import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("package metadata exposes Mosaic as the product name", async () => {
  const packageJson = JSON.parse(await fs.readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.equal(packageJson.productName, "Mosaic");
});

test("package metadata is versioned for the keychain prompt patch release", async () => {
  const packageJson = JSON.parse(await fs.readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.equal(packageJson.version, "0.1.1");
});

test("start script uses the Mosaic-named development launcher", async () => {
  const packageJson = JSON.parse(await fs.readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.equal(packageJson.scripts.start, "node scripts/start-dev.mjs");
});

test("package scripts expose dmg and exe distribution builds", async () => {
  const packageJson = JSON.parse(await fs.readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.equal(packageJson.scripts["prepare-build-assets"], "node scripts/prepare-build-assets.mjs");
  assert.equal(packageJson.scripts["dist:mac"], "npm run prepare-build-assets && electron-builder --mac dmg");
  assert.equal(packageJson.scripts["dist:win"], "npm run prepare-build-assets && electron-builder --win nsis --x64");
  assert.equal(packageJson.scripts.dist, "npm run dist:mac && npm run dist:win");
  assert.ok(packageJson.devDependencies["electron-builder"]);
});

test("electron-builder is configured for Mosaic dmg and Windows exe artifacts", async () => {
  const packageJson = JSON.parse(await fs.readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.equal(packageJson.build.appId, "com.hololee.mosaic");
  assert.equal(packageJson.build.productName, "Mosaic");
  assert.equal(packageJson.build.directories.output, "release");
  assert.equal(packageJson.build.mac.icon, "assets/icon.icns");
  assert.equal(packageJson.build.mac.target[0].target, "dmg");
  assert.equal(packageJson.build.win.icon, "assets/icon.ico");
  assert.equal(packageJson.build.win.target[0].target, "nsis");
  assert.equal(packageJson.build.nsis.artifactName, "${productName}-${version}-Setup.${ext}");
});
