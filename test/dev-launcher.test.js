import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("development launcher prepares and starts a Mosaic app bundle", async () => {
  const source = await fs.readFile(new URL("../scripts/start-dev.mjs", import.meta.url), "utf8");

  assert.match(source, /const APP_NAME = "Mosaic";/);
  assert.match(source, /const DEV_APP_DIR = "\.dev";/);
  assert.match(source, /const DEV_APP_NAME = `\$\{APP_NAME\}\.app`;/);
  assert.match(source, /verbatimSymlinks: true/);
  assert.match(source, /fs\.rmSync\(devAppPath/);
  assert.match(source, /fs\.cpSync\(electronAppPath, devAppPath/);
  assert.match(source, /fs\.lstatSync\(executablePath\)/);
  assert.match(source, /fs\.unlinkSync\(executablePath\)/);
  assert.match(source, /setPlistValue\(plist, "CFBundleExecutable", APP_NAME\)/);
  assert.match(source, /spawn\(executablePath, args/);
});
