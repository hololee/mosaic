import test from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";

import { GITHUB_RELEASES_URL, STARTUP_UPDATE_CHECK_DELAY_MS, createUpdateController } from "../src/main/updater.js";

function createHarness({ isPackaged = true, dialogResponse = 1 } = {}) {
  const updater = new EventEmitter();
  const calls = [];
  updater.checkForUpdates = async () => {
    calls.push(["checkForUpdates"]);
  };
  updater.quitAndInstall = (...args) => {
    calls.push(["quitAndInstall", ...args]);
  };

  const dialog = {
    showMessageBox: async (_window, options) => {
      calls.push(["showMessageBox", options]);
      return { response: dialogResponse };
    },
  };

  const shell = {
    openExternal: async (url) => {
      calls.push(["openExternal", url]);
    },
  };

  const scheduled = [];
  const controller = createUpdateController({
    app: {
      isPackaged,
      getVersion: () => "0.1.2",
      getAppPath: () => "/Applications/Mosaic.app/Contents/Resources/app.asar",
    },
    autoUpdater: updater,
    dialog,
    shell,
    getWindow: () => ({ id: 1 }),
    setTimeoutFn: (callback, delay) => {
      scheduled.push({ callback, delay });
      return scheduled.length;
    },
    logger: {
      info: (...args) => calls.push(["info", ...args]),
      warn: (...args) => calls.push(["warn", ...args]),
      error: (...args) => calls.push(["error", ...args]),
    },
  });

  return { controller, updater, calls, scheduled };
}

test("update controller configures automatic downloads", () => {
  const { updater } = createHarness();

  assert.equal(updater.autoDownload, true);
  assert.equal(updater.autoInstallOnAppQuit, true);
});

test("manual update checks are skipped in unpackaged builds with a helpful dialog", async () => {
  const { controller, calls } = createHarness({ isPackaged: false });

  const result = await controller.checkForUpdates({ manual: true });

  assert.equal(result.skipped, true);
  assert.deepEqual(calls.map((call) => call[0]), ["showMessageBox"]);
  assert.match(calls[0][1].message, /packaged app/);
});

test("update checks are skipped for packaged development launchers without app-update metadata", async () => {
  const { calls } = createHarness();

  const updater = new EventEmitter();
  updater.checkForUpdates = async () => {
    calls.push(["checkForUpdates"]);
  };
  const dialog = {
    showMessageBox: async (_window, options) => {
      calls.push(["showMessageBox", options]);
      return { response: 0 };
    },
  };
  const devController = createUpdateController({
    app: {
      isPackaged: true,
      getVersion: () => "0.1.2",
      getAppPath: () => "/Users/hololee/Desktop/projects/mosaic",
    },
    autoUpdater: updater,
    dialog,
    shell: { openExternal: async () => {} },
    getWindow: () => null,
  });

  const result = await devController.checkForUpdates({ manual: true });

  assert.equal(result.skipped, true);
  assert.deepEqual(calls.map((call) => call[0]), ["showMessageBox"]);
});

test("startup update checks are scheduled silently", async () => {
  const { controller, scheduled, calls } = createHarness();

  controller.scheduleStartupCheck();
  assert.equal(scheduled[0].delay, STARTUP_UPDATE_CHECK_DELAY_MS);

  await scheduled[0].callback();
  assert.deepEqual(calls, [["checkForUpdates"]]);
});

test("downloaded updates can be installed and restarted from the prompt", async () => {
  const { updater, calls } = createHarness({ dialogResponse: 0 });

  updater.emit("update-downloaded", { version: "0.1.3" });
  await Promise.resolve();

  assert.deepEqual(calls.map((call) => call[0]), ["showMessageBox", "quitAndInstall"]);
  assert.deepEqual(calls[1], ["quitAndInstall", false, true]);
});

test("manual update errors can open the GitHub releases page", async () => {
  const { controller, updater, calls } = createHarness({ dialogResponse: 1 });

  await controller.checkForUpdates({ manual: true });
  updater.emit("error", new Error("network failed"));
  await Promise.resolve();

  assert.deepEqual(calls.map((call) => call[0]), ["checkForUpdates", "showMessageBox", "openExternal"]);
  assert.equal(calls[2][1], GITHUB_RELEASES_URL);
});

test("checkForUpdates handles rejected updater checks for manual fallback", async () => {
  const updater = new EventEmitter();
  updater.checkForUpdates = async () => {
    throw new Error("missing app-update.yml");
  };
  const calls = [];
  const controller = createUpdateController({
    app: {
      isPackaged: true,
      getVersion: () => "0.1.2",
      getAppPath: () => "/Applications/Mosaic.app/Contents/Resources/app.asar",
    },
    autoUpdater: updater,
    dialog: {
      showMessageBox: async (_window, options) => {
        calls.push(["showMessageBox", options]);
        return { response: 1 };
      },
    },
    shell: {
      openExternal: async (url) => calls.push(["openExternal", url]),
    },
    getWindow: () => null,
  });

  const result = await controller.checkForUpdates({ manual: true });

  assert.equal(result.error, true);
  assert.deepEqual(calls.map((call) => call[0]), ["showMessageBox", "openExternal"]);
});
