import { spawn, spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import electronPath from "electron";

const APP_NAME = "Mosaic";
const BUNDLE_IDENTIFIER = "com.hololee.mosaic.dev";
const DEV_APP_DIR = ".dev";
const DEV_APP_NAME = `${APP_NAME}.app`;
const COPY_OPTIONS = { recursive: true, verbatimSymlinks: true };
const args = process.argv.slice(2);

const executablePath = ensureDevAppBundle();
const child = spawn(executablePath, args.length ? args : ["."], {
  stdio: "inherit",
  windowsHide: false,
});

let childClosed = false;

child.on("close", (code, signal) => {
  childClosed = true;

  if (code === null) {
    console.error(`${executablePath} exited with signal ${signal}`);
    process.exit(1);
  }

  process.exit(code);
});

for (const signal of ["SIGINT", "SIGTERM", "SIGUSR2"]) {
  process.on(signal, () => {
    if (!childClosed) {
      child.kill(signal);
    }
  });
}

function ensureDevAppBundle() {
  if (process.platform !== "darwin") {
    return electronPath;
  }

  const electronAppPath = getElectronAppPath();
  const devAppPath = path.resolve(DEV_APP_DIR, DEV_APP_NAME);
  const contentsPath = path.join(devAppPath, "Contents");
  const macOsPath = path.join(contentsPath, "MacOS");
  const sourceExecutablePath = path.join(macOsPath, path.basename(electronPath));
  const executablePath = path.join(macOsPath, APP_NAME);

  if (shouldRefreshDevAppBundle(devAppPath)) {
    fs.rmSync(devAppPath, { recursive: true, force: true });
  }

  if (!fs.existsSync(devAppPath)) {
    fs.mkdirSync(path.dirname(devAppPath), { recursive: true });
    fs.cpSync(electronAppPath, devAppPath, COPY_OPTIONS);
  }

  ensureRegularExecutable(sourceExecutablePath, executablePath);

  updateBundleMetadata(path.join(contentsPath, "Info.plist"));
  signBundle(devAppPath);

  return executablePath;
}

function getElectronAppPath() {
  const macOsPath = path.dirname(electronPath);
  const contentsPath = path.dirname(macOsPath);
  return path.dirname(contentsPath);
}

function shouldRefreshDevAppBundle(devAppPath) {
  if (!fs.existsSync(devAppPath)) {
    return false;
  }

  const frameworkLinkPath = path.join(
    devAppPath,
    "Contents",
    "Frameworks",
    "Electron Framework.framework",
    "Electron Framework",
  );

  try {
    const stat = fs.lstatSync(frameworkLinkPath);
    return stat.isSymbolicLink() && path.isAbsolute(fs.readlinkSync(frameworkLinkPath));
  } catch (error) {
    if (error.code === "ENOENT") {
      return true;
    }

    throw error;
  }
}

function ensureRegularExecutable(sourceExecutablePath, executablePath) {
  let shouldCopy = true;

  try {
    const stat = fs.lstatSync(executablePath);

    if (stat.isSymbolicLink()) {
      fs.unlinkSync(executablePath);
    } else if (stat.isFile()) {
      shouldCopy = false;
    } else {
      throw new Error(`${executablePath} exists but is not an executable file.`);
    }
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }

  if (shouldCopy) {
    fs.copyFileSync(sourceExecutablePath, executablePath);
    fs.chmodSync(executablePath, 0o755);
  }
}

function updateBundleMetadata(plistPath) {
  let plist = fs.readFileSync(plistPath, "utf8");

  plist = setPlistValue(plist, "CFBundleName", APP_NAME);
  plist = setPlistValue(plist, "CFBundleDisplayName", APP_NAME);
  plist = setPlistValue(plist, "CFBundleExecutable", APP_NAME);
  plist = setPlistValue(plist, "CFBundleIdentifier", BUNDLE_IDENTIFIER);

  fs.writeFileSync(plistPath, plist);
}

function setPlistValue(plist, key, value) {
  const escapedKey = escapeRegex(key);
  const existingValue = new RegExp(`(<key>${escapedKey}</key>\\s*<string>)([^<]*)(</string>)`);

  if (existingValue.test(plist)) {
    return plist.replace(existingValue, `$1${escapePlistValue(value)}$3`);
  }

  return plist.replace(
    /(\s*)<\/dict>/,
    `$1<key>${key}</key>\n$1<string>${escapePlistValue(value)}</string>\n$1</dict>`,
  );
}

function signBundle(devAppPath) {
  const result = spawnSync("codesign", ["--force", "--deep", "--sign", "-", devAppPath], {
    stdio: "inherit",
  });

  if (result.status !== 0) {
    throw new Error(`Unable to sign ${devAppPath}.`);
  }
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function escapePlistValue(value) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
