import { app, BrowserWindow, Menu, clipboard, dialog, ipcMain, nativeImage } from "electron";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getAppIconPath, getInitialWindowBounds } from "./window-options.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow;
let currentProjectPath = null;

const imageExtensions = new Set([".png", ".jpg", ".jpeg", ".webp"]);

function createWindow() {
  mainWindow = new BrowserWindow({
    ...getInitialWindowBounds(),
    icon: getAppIconPath(),
    title: "Mosaic",
    backgroundColor: "#15171d",
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadFile(path.join(__dirname, "../renderer/index.html"));
  mainWindow.on("closed", () => {
    mainWindow = null;
  });
}

function sendMenuCommand(command, payload = {}) {
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("menu-command", command, payload);
  }
}

function buildMenu() {
  return Menu.buildFromTemplate([
    ...(process.platform === "darwin"
      ? [
          {
            label: app.name,
            submenu: [{ role: "about" }, { type: "separator" }, { role: "quit" }],
          },
        ]
      : []),
    {
      label: "File",
      submenu: [
        {
          label: "Open...",
          accelerator: "CmdOrCtrl+O",
          click: () => sendMenuCommand("open"),
        },
        {
          label: "New from Clipboard",
          accelerator: "CmdOrCtrl+Alt+V",
          click: () => sendMenuCommand("new-from-clipboard"),
        },
        { type: "separator" },
        {
          label: "Save",
          accelerator: "CmdOrCtrl+S",
          click: () => sendMenuCommand("save"),
        },
        {
          label: "Save As...",
          accelerator: "CmdOrCtrl+Shift+S",
          click: () => sendMenuCommand("save-as"),
        },
        { type: "separator" },
        {
          label: "Export Image...",
          accelerator: "CmdOrCtrl+Shift+E",
          click: () => sendMenuCommand("export-image"),
        },
        {
          label: "Export to Clipboard",
          accelerator: "CmdOrCtrl+Alt+C",
          click: () => sendMenuCommand("export-clipboard"),
        },
        { type: "separator" },
        { role: "close" },
      ],
    },
    {
      label: "Edit",
      submenu: [
        {
          label: "Undo",
          accelerator: "CmdOrCtrl+Z",
          click: () => sendMenuCommand("undo"),
        },
        {
          label: "Redo",
          accelerator: "CmdOrCtrl+Shift+Z",
          click: () => sendMenuCommand("redo"),
        },
        { type: "separator" },
        {
          label: "Delete Selection",
          accelerator: "Backspace",
          click: () => sendMenuCommand("delete-selection"),
        },
        {
          label: "Select All Masks",
          accelerator: "CmdOrCtrl+A",
          click: () => sendMenuCommand("select-all"),
        },
        {
          label: "Deselect",
          accelerator: "Escape",
          click: () => sendMenuCommand("deselect"),
        },
      ],
    },
    {
      label: "Tools",
      submenu: [
        { label: "Rectangle", accelerator: "R", click: () => sendMenuCommand("tool", { tool: "rectangle" }) },
        { label: "Ellipse", accelerator: "O", click: () => sendMenuCommand("tool", { tool: "ellipse" }) },
        { label: "Lasso", accelerator: "L", click: () => sendMenuCommand("tool", { tool: "lasso" }) },
        { label: "Brush", accelerator: "B", click: () => sendMenuCommand("tool", { tool: "brush" }) },
        { label: "Eraser", accelerator: "E", click: () => sendMenuCommand("tool", { tool: "eraser" }) },
        { label: "Pan", accelerator: "H", click: () => sendMenuCommand("tool", { tool: "pan" }) },
      ],
    },
    {
      label: "View",
      submenu: [
        { label: "Zoom In", accelerator: "CmdOrCtrl+Plus", click: () => sendMenuCommand("zoom-in") },
        { label: "Zoom Out", accelerator: "CmdOrCtrl+-", click: () => sendMenuCommand("zoom-out") },
        { label: "Fit to Screen", accelerator: "CmdOrCtrl+0", click: () => sendMenuCommand("zoom-fit") },
        { label: "Actual Size", accelerator: "CmdOrCtrl+1", click: () => sendMenuCommand("zoom-actual") },
        { type: "separator" },
        { role: "togglefullscreen" },
      ],
    },
  ]);
}

app.whenReady().then(() => {
  Menu.setApplicationMenu(buildMenu());
  app.dock?.setIcon(getAppIconPath());
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

ipcMain.handle("open-dialog", async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ["openFile"],
    filters: [
      { name: "Images and Mosaic Projects", extensions: ["png", "jpg", "jpeg", "webp", "msc"] },
      { name: "Images", extensions: ["png", "jpg", "jpeg", "webp"] },
      { name: "Mosaic Projects", extensions: ["msc"] },
    ],
  });

  if (result.canceled || !result.filePaths[0]) {
    return { canceled: true };
  }

  return readOpenFile(result.filePaths[0]);
});

ipcMain.handle("read-clipboard-image", async () => {
  const image = clipboard.readImage();

  if (image.isEmpty()) {
    throw new Error("Clipboard does not contain an image.");
  }

  return {
    dataUrl: image.toDataURL(),
    width: image.getSize().width,
    height: image.getSize().height,
    name: "Clipboard Image",
  };
});

ipcMain.handle("save-project", async (_event, payload) => {
  const saveAs = Boolean(payload.saveAs);
  let targetPath = saveAs ? null : currentProjectPath;

  if (!targetPath) {
    const result = await dialog.showSaveDialog(mainWindow, {
      defaultPath: getDefaultProjectName(payload.project),
      filters: [{ name: "Mosaic Project", extensions: ["msc"] }],
    });

    if (result.canceled || !result.filePath) {
      return { canceled: true };
    }

    targetPath = ensureExtension(result.filePath, ".msc");
  }

  await fs.writeFile(targetPath, payload.content, "utf8");
  currentProjectPath = targetPath;
  return { canceled: false, path: targetPath };
});

ipcMain.handle("export-image", async (_event, payload) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: payload.defaultName || "mosaic-export.png",
    filters: [
      { name: "PNG Image", extensions: ["png"] },
      { name: "JPG Image", extensions: ["jpg", "jpeg"] },
    ],
  });

  if (result.canceled || !result.filePath) {
    return { canceled: true };
  }

  const targetPath = result.filePath;
  const ext = path.extname(targetPath).toLowerCase();
  const dataUrl = ext === ".jpg" || ext === ".jpeg" ? payload.jpegDataUrl : payload.pngDataUrl;
  await fs.writeFile(targetPath, dataUrlToBuffer(dataUrl));

  return { canceled: false, path: targetPath };
});

ipcMain.handle("write-clipboard-image", async (_event, dataUrl) => {
  const image = nativeImage.createFromDataURL(dataUrl);

  if (image.isEmpty()) {
    throw new Error("Could not create clipboard image.");
  }

  clipboard.writeImage(image);
  return { ok: true };
});

function getDefaultProjectName(project) {
  const sourceName = project?.source?.name || "Untitled";
  const parsed = path.parse(sourceName);
  return `${parsed.name || "Untitled"}.msc`;
}

async function readOpenFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();

  if (ext === ".msc") {
    currentProjectPath = filePath;
    return {
      kind: "project",
      content: await fs.readFile(filePath, "utf8"),
      path: filePath,
    };
  }

  if (!imageExtensions.has(ext)) {
    throw new Error("Unsupported file type.");
  }

  const buffer = await fs.readFile(filePath);
  currentProjectPath = null;

  return {
    kind: "image",
    dataUrl: `data:${mimeForExtension(ext)};base64,${buffer.toString("base64")}`,
    name: path.basename(filePath),
    path: filePath,
  };
}

function dataUrlToBuffer(dataUrl) {
  const base64 = dataUrl.split(",")[1];
  return Buffer.from(base64, "base64");
}

function ensureExtension(filePath, extension) {
  return path.extname(filePath) ? filePath : `${filePath}${extension}`;
}

function mimeForExtension(extension) {
  if (extension === ".jpg" || extension === ".jpeg") {
    return "image/jpeg";
  }

  if (extension === ".webp") {
    return "image/webp";
  }

  return "image/png";
}
