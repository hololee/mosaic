export const GITHUB_RELEASES_URL = "https://github.com/hololee/mosaic/releases/latest";
export const STARTUP_UPDATE_CHECK_DELAY_MS = 3000;

export function createUpdateController({
  app,
  autoUpdater,
  dialog,
  shell,
  getWindow,
  setTimeoutFn = setTimeout,
  logger = console,
}) {
  let manualCheckPending = false;
  let checking = false;

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on("checking-for-update", () => {
    checking = true;
  });

  autoUpdater.on("update-available", async (info) => {
    checking = false;

    if (manualCheckPending) {
      await showUpdateAvailableDialog(dialog, getWindow(), info);
    }
  });

  autoUpdater.on("update-not-available", async () => {
    checking = false;

    if (manualCheckPending) {
      manualCheckPending = false;
      await dialog.showMessageBox(getWindow(), {
        type: "info",
        buttons: ["OK"],
        defaultId: 0,
        message: "Mosaic is up to date.",
        detail: `You are running version ${app.getVersion()}.`,
      });
    }
  });

  autoUpdater.on("update-downloaded", async (info) => {
    checking = false;
    manualCheckPending = false;
    await showUpdateDownloadedDialog({ autoUpdater, dialog, getWindow, info });
  });

  autoUpdater.on("error", async (error) => {
    checking = false;
    const wasManual = manualCheckPending;
    manualCheckPending = false;

    if (!wasManual) {
      logger.warn?.("Auto update check failed", error);
      return;
    }

    await showUpdateErrorDialog({ dialog, shell, getWindow, error });
  });

  async function checkForUpdates({ manual = false } = {}) {
    if (!canUseAutoUpdater(app)) {
      if (manual) {
        await dialog.showMessageBox(getWindow(), {
          type: "info",
          buttons: ["OK"],
          defaultId: 0,
          message: "Update checks are available in the packaged app.",
          detail: "Build and install Mosaic to test updates from GitHub Releases.",
        });
      }

      return { skipped: true };
    }

    if (checking) {
      if (manual) {
        await dialog.showMessageBox(getWindow(), {
          type: "info",
          buttons: ["OK"],
          defaultId: 0,
          message: "Mosaic is already checking for updates.",
        });
      }

      return { checking: true };
    }

    manualCheckPending = manual;
    checking = true;
    try {
      await autoUpdater.checkForUpdates();
    } catch (error) {
      checking = false;
      const wasManual = manualCheckPending;
      manualCheckPending = false;

      if (wasManual) {
        await showUpdateErrorDialog({ dialog, shell, getWindow, error });
      } else {
        logger.warn?.("Auto update check failed", error);
      }

      return { error: true };
    }

    return { checking: true };
  }

  function scheduleStartupCheck() {
    setTimeoutFn(() => {
      checkForUpdates().catch((error) => logger.warn?.("Auto update check failed", error));
    }, STARTUP_UPDATE_CHECK_DELAY_MS);
  }

  return {
    checkForUpdates,
    scheduleStartupCheck,
  };
}

function canUseAutoUpdater(app) {
  if (process.env.MOSAIC_ENABLE_DEV_UPDATER === "1") {
    return true;
  }

  return Boolean(app.isPackaged && app.getAppPath?.().endsWith(".asar"));
}

async function showUpdateAvailableDialog(dialog, window, info) {
  await dialog.showMessageBox(window, {
    type: "info",
    buttons: ["OK"],
    defaultId: 0,
    message: `Mosaic ${info.version} is available.`,
    detail: "The update is downloading in the background. Mosaic will ask before installing it.",
  });
}

async function showUpdateDownloadedDialog({ autoUpdater, dialog, getWindow, info }) {
  const result = await dialog.showMessageBox(getWindow(), {
    type: "info",
    buttons: ["Install and Restart", "Later"],
    defaultId: 0,
    cancelId: 1,
    message: `Mosaic ${info.version} is ready to install.`,
    detail: "Restart Mosaic now to finish the update, or install it the next time you quit the app.",
  });

  if (result.response === 0) {
    autoUpdater.quitAndInstall(false, true);
  }
}

async function showUpdateErrorDialog({ dialog, shell, getWindow, error }) {
  const result = await dialog.showMessageBox(getWindow(), {
    type: "warning",
    buttons: ["OK", "Open Releases"],
    defaultId: 0,
    cancelId: 0,
    message: "Could not check for updates.",
    detail: error?.message || String(error),
  });

  if (result.response === 1) {
    await shell.openExternal(GITHUB_RELEASES_URL);
  }
}
