const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("mosaicAPI", {
  openDialog: () => ipcRenderer.invoke("open-dialog"),
  decodeGif: (dataUrl) => ipcRenderer.invoke("decode-gif", dataUrl),
  encodeGif: (payload) => ipcRenderer.invoke("encode-gif", payload),
  readClipboardImage: () => ipcRenderer.invoke("read-clipboard-image"),
  saveProject: (payload) => ipcRenderer.invoke("save-project", payload),
  exportImage: (payload) => ipcRenderer.invoke("export-image", payload),
  writeClipboardImage: (dataUrl) => ipcRenderer.invoke("write-clipboard-image", dataUrl),
  onMenuCommand: (callback) => {
    ipcRenderer.on("menu-command", (_event, command, payload) => callback(command, payload));
  },
});
