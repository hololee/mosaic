import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

test("main window uses a temporary renderer session", async () => {
  const source = await fs.readFile(new URL("../src/main/main.js", import.meta.url), "utf8");

  assert.match(source, /const RENDERER_SESSION_PARTITION = "mosaic-temporary";/);
  assert.match(source, /partition:\s*RENDERER_SESSION_PARTITION/);
  assert.doesNotMatch(source, /persist:mosaic-temporary/);
});

test("macOS build avoids Chromium Keychain prompts for unused web credentials", async () => {
  const source = await fs.readFile(new URL("../src/main/main.js", import.meta.url), "utf8");

  assert.match(source, /process\.platform === "darwin"/);
  assert.match(source, /app\.commandLine\.appendSwitch\("use-mock-keychain"\)/);
  assert.ok(
    source.indexOf('app.commandLine.appendSwitch("use-mock-keychain")') < source.indexOf("app.whenReady()"),
    "Chromium switches must be configured before Electron is ready",
  );
});
