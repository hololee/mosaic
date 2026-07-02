import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("package metadata exposes Mosaic as the product name", async () => {
  const packageJson = JSON.parse(await fs.readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.equal(packageJson.productName, "Mosaic");
});

test("package metadata is versioned for the auto update release", async () => {
  const packageJson = JSON.parse(await fs.readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.equal(packageJson.version, "0.1.5");
});

test("start script uses the Mosaic-named development launcher", async () => {
  const packageJson = JSON.parse(await fs.readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.equal(packageJson.scripts.start, "node scripts/start-dev.mjs");
});

test("package scripts expose dmg and exe distribution builds", async () => {
  const packageJson = JSON.parse(await fs.readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.equal(packageJson.scripts["prepare-build-assets"], "node scripts/prepare-build-assets.mjs");
  assert.equal(packageJson.scripts["dist:mac"], "npm run prepare-build-assets && electron-builder --mac dmg zip");
  assert.equal(packageJson.scripts["dist:win"], "npm run prepare-build-assets && electron-builder --win nsis --x64");
  assert.equal(packageJson.scripts.dist, "npm run dist:mac && npm run dist:win");
  assert.equal(packageJson.scripts["publish:github"], "npm run prepare-build-assets && electron-builder --mac dmg zip --win nsis --x64 --publish always");
  assert.ok(packageJson.devDependencies["electron-builder"]);
});

test("electron-builder is configured for Mosaic dmg and Windows exe artifacts", async () => {
  const packageJson = JSON.parse(await fs.readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.equal(packageJson.build.appId, "com.hololee.mosaic");
  assert.equal(packageJson.build.productName, "Mosaic");
  assert.equal(packageJson.build.directories.output, "release");
  assert.equal(packageJson.build.mac.icon, "assets/icon.icns");
  assert.equal(packageJson.build.mac.target[0].target, "dmg");
  assert.equal(packageJson.build.mac.target[1].target, "zip");
  assert.equal(packageJson.build.win.icon, "assets/icon.ico");
  assert.equal(packageJson.build.win.target[0].target, "nsis");
  assert.equal(packageJson.build.nsis.artifactName, "${productName}-${version}-Setup.${ext}");
  assert.deepEqual(packageJson.build.publish, [
    {
      provider: "github",
      owner: "hololee",
      repo: "mosaic",
      releaseType: "release",
    },
  ]);
});

test("electron-updater is packaged as an app dependency", async () => {
  const packageJson = JSON.parse(await fs.readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.ok(packageJson.dependencies["electron-updater"]);
});

test("GIF decode and encode libraries are packaged with the app", async () => {
  const packageJson = JSON.parse(await fs.readFile(new URL("../package.json", import.meta.url), "utf8"));

  assert.ok(packageJson.dependencies["gifuct-js"]);
  assert.ok(packageJson.dependencies["gifenc"]);
});
