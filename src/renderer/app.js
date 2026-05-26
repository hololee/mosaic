import { createProject, parseProject, serializeProject } from "../shared/project.js";
import { clampBlockSize } from "../shared/mosaic.js";
import { getSelectionBlockSize, updateSelectedBlockSize } from "../shared/mask-settings.js";
import { getDeleteControlRect, getResizeCursor, getResizeHandleHit, pointInRect } from "../shared/mask-controls.js";
import { resizeMask } from "../shared/mask-transform.js";
import { getContrastingGrayRGBA, getMaskBounds, getRelativeLuminance } from "../shared/outline.js";
import { getWheelZoomFactor } from "../shared/zoom.js";

const api = window.mosaicAPI ?? {
  openDialog: async () => ({ canceled: true }),
  readClipboardImage: async () => {
    throw new Error("Clipboard images are available in the Electron app.");
  },
  saveProject: async () => ({ canceled: true }),
  exportImage: async () => ({ canceled: true }),
  writeClipboardImage: async () => ({ ok: false }),
  onMenuCommand: () => {},
};

const canvas = document.querySelector("#canvas");
const ctx = canvas.getContext("2d");
const emptyOpenButton = document.querySelector("#emptyOpenButton");
const statusText = document.querySelector("#statusText");
const documentText = document.querySelector("#documentText");
const blockSizeInput = document.querySelector("#blockSize");
const blockSizeValue = document.querySelector("#blockSizeValue");
const tooltip = document.querySelector("#tooltip");

const ACTIVE_MASK_OUTLINE = "#3b82f6";
const RESIZE_HANDLE_TOLERANCE = 7;

const state = {
  project: null,
  image: null,
  tool: "rectangle",
  blockSize: 24,
  zoom: 1,
  pan: { x: 0, y: 0 },
  masks: [],
  selectedIds: new Set(),
  hoveredId: null,
  history: [],
  future: [],
  draft: null,
  action: null,
  pointer: null,
  blockSizeEditOriginalMasks: null,
  spacePressed: false,
  exportQuality: 0.92,
};

const mosaicCache = new Map();
const adaptiveOutlineCache = new Map();
let imageSampleCanvas = null;
let imageSampleContext = null;

setTool("rectangle");
resizeCanvas();
setupTooltips();
draw();

window.addEventListener("resize", () => {
  resizeCanvas();
  draw();
});

document.querySelector("#openButton").addEventListener("click", openFromDialog);
document.querySelector("#clipboardOpenButton").addEventListener("click", newFromClipboard);
emptyOpenButton.addEventListener("click", openFromDialog);
document.querySelector("#saveButton").addEventListener("click", () => saveProject(false));
document.querySelector("#exportButton").addEventListener("click", exportImage);
document.querySelector("#clipboardButton").addEventListener("click", exportToClipboard);
document.querySelector("#undoButton").addEventListener("click", undo);
document.querySelector("#redoButton").addEventListener("click", redo);
document.querySelector("#fitButton").addEventListener("click", fitToScreen);
document.querySelector("#actualButton").addEventListener("click", () => setZoom(1));

document.querySelectorAll("[data-tool]").forEach((button) => {
  button.addEventListener("click", () => setTool(button.dataset.tool));
});

function setupTooltips() {
  document.querySelectorAll("[data-tooltip]").forEach((target) => {
    target.addEventListener("pointerenter", () => showTooltip(target));
    target.addEventListener("focus", () => showTooltip(target));
    target.addEventListener("pointerleave", hideTooltip);
    target.addEventListener("blur", hideTooltip);
    target.addEventListener("click", hideTooltip);
  });

  window.addEventListener("resize", hideTooltip);
}

function showTooltip(target) {
  const text = target.dataset.tooltip;

  if (!text) {
    return;
  }

  tooltip.textContent = text;
  tooltip.hidden = false;
  positionTooltip(target);
}

function hideTooltip() {
  tooltip.hidden = true;
  tooltip.textContent = "";
}

function positionTooltip(target) {
  const gap = 8;
  const margin = 8;
  const targetRect = target.getBoundingClientRect();
  const tooltipRect = tooltip.getBoundingClientRect();
  const maxLeft = window.innerWidth - tooltipRect.width - margin;
  const left = Math.min(maxLeft, Math.max(margin, targetRect.left + targetRect.width / 2 - tooltipRect.width / 2));
  const bottomTop = targetRect.bottom + gap;
  const top =
    bottomTop + tooltipRect.height <= window.innerHeight - margin
      ? bottomTop
      : Math.max(margin, targetRect.top - tooltipRect.height - gap);

  tooltip.style.left = `${Math.round(left)}px`;
  tooltip.style.top = `${Math.round(top)}px`;
}

blockSizeInput.addEventListener("input", applyBlockSizeInput);
blockSizeInput.addEventListener("change", finishBlockSizeEdit);
blockSizeInput.addEventListener("blur", finishBlockSizeEdit);

canvas.addEventListener("pointerdown", onPointerDown);
canvas.addEventListener("pointermove", onPointerMove);
canvas.addEventListener("pointerup", onPointerUp);
canvas.addEventListener("pointercancel", onPointerUp);
canvas.addEventListener("pointerleave", clearHoverState);
canvas.addEventListener("wheel", onWheel, { passive: false });

document.addEventListener("keydown", onKeyDown);
document.addEventListener("keyup", (event) => {
  if (event.code === "Space") {
    state.spacePressed = false;
  }
});
document.addEventListener("paste", onPaste);

window.addEventListener("dragover", (event) => event.preventDefault());
window.addEventListener("drop", onDrop);

api.onMenuCommand(async (command, payload) => {
  try {
    await handleMenuCommand(command, payload);
  } catch (error) {
    showStatus(error.message || String(error));
  }
});

async function handleMenuCommand(command, payload) {
  switch (command) {
    case "open":
      await openFromDialog();
      break;
    case "new-from-clipboard":
      await newFromClipboard();
      break;
    case "save":
      await saveProject(false);
      break;
    case "save-as":
      await saveProject(true);
      break;
    case "export-image":
      await exportImage();
      break;
    case "export-clipboard":
      await exportToClipboard();
      break;
    case "undo":
      undo();
      break;
    case "redo":
      redo();
      break;
    case "delete-selection":
      deleteSelection();
      break;
    case "select-all":
      selectAllMasks();
      break;
    case "deselect":
      state.selectedIds.clear();
      syncBlockSizeControl();
      draw();
      break;
    case "tool":
      setTool(payload.tool);
      break;
    case "zoom-in":
      setZoom(state.zoom * 1.15);
      break;
    case "zoom-out":
      setZoom(state.zoom / 1.15);
      break;
    case "zoom-fit":
      fitToScreen();
      break;
    case "zoom-actual":
      setZoom(1);
      break;
  }
}

async function openFromDialog() {
  const result = await api.openDialog();

  if (result.canceled) {
    return;
  }

  if (result.kind === "project") {
    await loadProjectContent(result.content);
    showStatus("Project opened");
    return;
  }

  await loadImageDocument(result);
  showStatus("Image opened");
}

async function newFromClipboard() {
  const image = await api.readClipboardImage();
  await loadImageDocument(image);
  showStatus("Clipboard image opened");
}

async function loadProjectContent(content) {
  const project = parseProject(content);
  const image = await loadImage(project.source.dataUrl);
  state.project = project;
  state.image = image;
  state.masks = cloneMasks(project.masks);
  state.blockSize = clampBlockSize(project.settings.blockSize);
  state.exportQuality = project.settings.exportQuality || 0.92;
  state.history = [];
  state.future = [];
  state.selectedIds.clear();
  state.hoveredId = null;
  clearImageCaches();
  syncBlockSizeControl();
  resetView();
  syncDocumentText();
  draw();
}

async function loadImageDocument(source) {
  const image = await loadImage(source.dataUrl);
  state.project = createProject({
    dataUrl: source.dataUrl,
    width: image.naturalWidth,
    height: image.naturalHeight,
    name: source.name || "Untitled",
  });
  state.image = image;
  state.masks = [];
  state.history = [];
  state.future = [];
  state.selectedIds.clear();
  state.hoveredId = null;
  clearImageCaches();
  syncBlockSizeControl();
  resetView();
  syncDocumentText();
  draw();
}

function loadImage(dataUrl) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Could not load image."));
    image.src = dataUrl;
  });
}

async function saveProject(saveAs) {
  ensureDocument();
  syncProject();
  const content = serializeProject(state.project);
  const result = await api.saveProject({ project: state.project, content, saveAs });

  if (!result.canceled) {
    showStatus(`Saved ${result.path}`);
  }
}

async function exportImage() {
  ensureDocument();
  const result = await api.exportImage({
    pngDataUrl: renderExportDataUrl("image/png"),
    jpegDataUrl: renderExportDataUrl("image/jpeg"),
    defaultName: defaultExportName(),
  });

  if (!result.canceled) {
    showStatus(`Exported ${result.path}`);
  }
}

async function exportToClipboard() {
  ensureDocument();
  await api.writeClipboardImage(renderExportDataUrl("image/png"));
  showStatus("Exported image to clipboard");
}

function applyBlockSizeInput() {
  const nextBlockSize = clampBlockSize(blockSizeInput.value);
  state.blockSize = nextBlockSize;
  blockSizeValue.value = String(nextBlockSize);

  if (state.selectedIds.size) {
    if (!state.blockSizeEditOriginalMasks) {
      state.blockSizeEditOriginalMasks = cloneMasks(state.masks);
    }

    state.masks = updateSelectedBlockSize(state.masks, state.selectedIds, nextBlockSize);
    syncProject();
    draw();
    return;
  }

  if (state.project) {
    state.project.settings.blockSize = nextBlockSize;
  }
}

function finishBlockSizeEdit() {
  if (!state.blockSizeEditOriginalMasks) {
    return;
  }

  if (JSON.stringify(state.blockSizeEditOriginalMasks) !== JSON.stringify(state.masks)) {
    state.history.push(state.blockSizeEditOriginalMasks);
    state.future = [];
  }

  state.blockSizeEditOriginalMasks = null;
  syncProject();
}

function syncBlockSizeControl() {
  const selectedBlockSize = getSelectionBlockSize(state.masks, state.selectedIds);
  const controlBlockSize = selectedBlockSize ?? state.blockSize;

  blockSizeInput.value = String(controlBlockSize);
  blockSizeValue.value = selectedBlockSize === null && state.selectedIds.size ? "Mixed" : String(controlBlockSize);
}

function renderExportDataUrl(type) {
  const output = document.createElement("canvas");
  output.width = state.image.naturalWidth;
  output.height = state.image.naturalHeight;
  const outputCtx = output.getContext("2d");
  drawFlattened(outputCtx);
  return output.toDataURL(type, state.exportQuality);
}

function drawFlattened(targetCtx) {
  targetCtx.clearRect(0, 0, state.image.naturalWidth, state.image.naturalHeight);
  targetCtx.drawImage(state.image, 0, 0);

  for (const mask of state.masks) {
    targetCtx.save();
    pathMask(targetCtx, mask);
    targetCtx.clip();
    targetCtx.drawImage(getMosaicCanvas(mask.blockSize), 0, 0);
    targetCtx.restore();
  }
}

function draw() {
  const { width, height } = getCanvasSize();
  ctx.setTransform(window.devicePixelRatio || 1, 0, 0, window.devicePixelRatio || 1, 0, 0);
  ctx.clearRect(0, 0, width, height);

  emptyOpenButton.classList.toggle("hidden", Boolean(state.image));

  if (!state.image) {
    syncDocumentText();
    return;
  }

  const view = getView();
  ctx.save();
  ctx.fillStyle = "#0f1117";
  ctx.shadowColor = "rgba(0, 0, 0, 0.35)";
  ctx.shadowBlur = 24;
  ctx.fillRect(view.x - 1, view.y - 1, view.width + 2, view.height + 2);
  ctx.shadowBlur = 0;
  ctx.drawImage(state.image, view.x, view.y, view.width, view.height);
  ctx.restore();

  for (const mask of state.masks) {
    drawMaskMosaic(mask, view);
  }

  for (const mask of state.masks) {
    if (!state.selectedIds.has(mask.id)) {
      drawAdaptiveMaskOutline(mask, view, 1.25);
    }
  }

  if (state.draft) {
    drawDraft(state.draft, view);
  }

  for (const mask of state.masks) {
    if (state.selectedIds.has(mask.id)) {
      drawMaskOutline(mask, view, ACTIVE_MASK_OUTLINE, 2);
    }
  }

  const hoveredMask = state.hoveredId ? state.masks.find((mask) => mask.id === state.hoveredId) : null;
  if (hoveredMask && !state.action) {
    drawDeleteControl(hoveredMask, view);
  }

  syncDocumentText();
}

function drawMaskMosaic(mask, view) {
  ctx.save();
  ctx.translate(view.x, view.y);
  ctx.scale(state.zoom, state.zoom);
  pathMask(ctx, mask);
  ctx.clip();
  ctx.drawImage(getMosaicCanvas(mask.blockSize), 0, 0);
  ctx.restore();
}

function drawDraft(mask, view) {
  ctx.save();
  ctx.translate(view.x, view.y);
  ctx.scale(state.zoom, state.zoom);
  pathMask(ctx, mask);
  ctx.fillStyle = "rgba(59, 130, 246, 0.18)";
  ctx.strokeStyle = ACTIVE_MASK_OUTLINE;
  ctx.lineWidth = 2 / state.zoom;
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawMaskOutline(mask, view, color, lineWidth) {
  ctx.save();
  ctx.translate(view.x, view.y);
  ctx.scale(state.zoom, state.zoom);
  pathMask(ctx, mask);
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth / state.zoom;
  ctx.setLineDash([6 / state.zoom, 4 / state.zoom]);
  ctx.stroke();
  ctx.restore();
}

function drawAdaptiveMaskOutline(mask, view, lineWidth) {
  const outline = getAdaptiveMaskOutline(mask, lineWidth);

  if (!outline) {
    return;
  }

  ctx.save();
  ctx.translate(view.x, view.y);
  ctx.scale(state.zoom, state.zoom);
  ctx.drawImage(outline.canvas, outline.x, outline.y);
  ctx.restore();
}

function drawDeleteControl(mask, view) {
  const control = getDeleteControlForMask(mask, view);
  const radius = 5;
  const pad = 6;

  ctx.save();
  pathRoundedRect(ctx, control.x, control.y, control.width, control.height, radius);
  ctx.fillStyle = "rgba(17, 19, 24, 0.9)";
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.82)";
  ctx.lineWidth = 1;
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(control.x + pad, control.y + pad);
  ctx.lineTo(control.x + control.width - pad, control.y + control.height - pad);
  ctx.moveTo(control.x + control.width - pad, control.y + pad);
  ctx.lineTo(control.x + pad, control.y + control.height - pad);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.96)";
  ctx.lineWidth = 2;
  ctx.lineCap = "round";
  ctx.stroke();
  ctx.restore();
}

function pathRoundedRect(targetCtx, x, y, width, height, radius) {
  const corner = Math.min(radius, width / 2, height / 2);

  targetCtx.beginPath();
  targetCtx.moveTo(x + corner, y);
  targetCtx.lineTo(x + width - corner, y);
  targetCtx.quadraticCurveTo(x + width, y, x + width, y + corner);
  targetCtx.lineTo(x + width, y + height - corner);
  targetCtx.quadraticCurveTo(x + width, y + height, x + width - corner, y + height);
  targetCtx.lineTo(x + corner, y + height);
  targetCtx.quadraticCurveTo(x, y + height, x, y + height - corner);
  targetCtx.lineTo(x, y + corner);
  targetCtx.quadraticCurveTo(x, y, x + corner, y);
}

function getAdaptiveMaskOutline(mask, lineWidth) {
  const imageLineWidth = lineWidth / state.zoom;
  const bounds = getOutlineBounds(mask, imageLineWidth);

  if (bounds.width <= 0 || bounds.height <= 0) {
    return null;
  }

  const cacheKey = `${mask.id}:${state.zoom.toFixed(3)}:${lineWidth}:${JSON.stringify(mask)}:${bounds.x},${bounds.y},${bounds.width},${bounds.height}`;

  if (adaptiveOutlineCache.has(cacheKey)) {
    return adaptiveOutlineCache.get(cacheKey);
  }

  const alphaCanvas = document.createElement("canvas");
  alphaCanvas.width = bounds.width;
  alphaCanvas.height = bounds.height;
  const alphaContext = alphaCanvas.getContext("2d");
  alphaContext.translate(-bounds.x, -bounds.y);
  pathMask(alphaContext, mask);
  alphaContext.strokeStyle = "white";
  alphaContext.lineWidth = imageLineWidth;
  alphaContext.setLineDash([6 / state.zoom, 4 / state.zoom]);
  alphaContext.stroke();

  const alphaData = alphaContext.getImageData(0, 0, bounds.width, bounds.height);
  const imageData = getImageSampleContext().getImageData(bounds.x, bounds.y, bounds.width, bounds.height);
  const outlineData = new ImageData(bounds.width, bounds.height);

  for (let index = 0; index < alphaData.data.length; index += 4) {
    const alpha = alphaData.data[index + 3];

    if (!alpha) {
      continue;
    }

    const red = imageData.data[index];
    const green = imageData.data[index + 1];
    const blue = imageData.data[index + 2];
    const [outlineRed, outlineGreen, outlineBlue, outlineAlpha] = getContrastingGrayRGBA(getRelativeLuminance([red, green, blue]));

    outlineData.data[index] = outlineRed;
    outlineData.data[index + 1] = outlineGreen;
    outlineData.data[index + 2] = outlineBlue;
    outlineData.data[index + 3] = Math.round((alpha / 255) * outlineAlpha);
  }

  const outlineCanvas = document.createElement("canvas");
  outlineCanvas.width = bounds.width;
  outlineCanvas.height = bounds.height;
  outlineCanvas.getContext("2d").putImageData(outlineData, 0, 0);

  const outline = { canvas: outlineCanvas, x: bounds.x, y: bounds.y };
  adaptiveOutlineCache.set(cacheKey, outline);
  return outline;
}

function getImageSampleContext() {
  if (!imageSampleCanvas) {
    imageSampleCanvas = document.createElement("canvas");
    imageSampleCanvas.width = state.image.naturalWidth;
    imageSampleCanvas.height = state.image.naturalHeight;
    imageSampleContext = imageSampleCanvas.getContext("2d");
    imageSampleContext.drawImage(state.image, 0, 0);
  }

  return imageSampleContext;
}

function clearImageCaches() {
  mosaicCache.clear();
  adaptiveOutlineCache.clear();
  imageSampleCanvas = null;
  imageSampleContext = null;
}

function getOutlineBounds(mask, imageLineWidth) {
  const bounds = getMaskBounds(mask);
  const pad = Math.ceil(imageLineWidth + 2);
  const x = clampNumber(Math.floor(bounds.x - pad), 0, state.image.naturalWidth);
  const y = clampNumber(Math.floor(bounds.y - pad), 0, state.image.naturalHeight);
  const right = clampNumber(Math.ceil(bounds.x + bounds.width + pad), 0, state.image.naturalWidth);
  const bottom = clampNumber(Math.ceil(bounds.y + bounds.height + pad), 0, state.image.naturalHeight);

  return {
    x,
    y,
    width: Math.max(0, right - x),
    height: Math.max(0, bottom - y),
  };
}

function clampNumber(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

function getMosaicCanvas(blockSize) {
  const size = clampBlockSize(blockSize);
  const key = `${state.project.source.dataUrl.length}:${size}`;

  if (mosaicCache.has(key)) {
    return mosaicCache.get(key);
  }

  const small = document.createElement("canvas");
  small.width = Math.max(1, Math.ceil(state.image.naturalWidth / size));
  small.height = Math.max(1, Math.ceil(state.image.naturalHeight / size));
  const smallCtx = small.getContext("2d");
  smallCtx.imageSmoothingEnabled = true;
  smallCtx.drawImage(state.image, 0, 0, small.width, small.height);

  const full = document.createElement("canvas");
  full.width = state.image.naturalWidth;
  full.height = state.image.naturalHeight;
  const fullCtx = full.getContext("2d");
  fullCtx.imageSmoothingEnabled = false;
  fullCtx.drawImage(small, 0, 0, full.width, full.height);

  mosaicCache.set(key, full);
  return full;
}

function onPointerDown(event) {
  if (!state.image) {
    return;
  }

  const imagePoint = screenToImage(event);

  if (event.button === 1 || state.spacePressed) {
    startPanning(event);
    return;
  }

  const deleteHit = getDeleteControlHit(event);
  if (deleteHit) {
    deleteMask(deleteHit.id);
    return;
  }

  const resizeHit = getResizeControlHit(event);
  if (resizeHit) {
    canvas.setPointerCapture(event.pointerId);
    startResizingMask(resizeHit.mask, resizeHit.handle, imagePoint);
    draw();
    return;
  }

  if (!pointInImage(imagePoint)) {
    if (state.tool === "pan" && event.button === 0) {
      startPanning(event);
    }
    return;
  }

  canvas.setPointerCapture(event.pointerId);

  const existingMask = hitTest(imagePoint);
  if (existingMask) {
    startMovingMask(existingMask, imagePoint);
    draw();
    return;
  }

  if (state.tool === "pan" && event.button === 0) {
    startPanning(event);
    return;
  }

  state.action = "draw";
  state.pointer = { start: imagePoint, last: imagePoint };
  state.draft = createDraftMask(imagePoint, imagePoint);
  draw();
}

function onPointerMove(event) {
  if (!state.image) {
    return;
  }

  if (!state.action) {
    updateHoverState(event);
    return;
  }

  if (state.action === "pan") {
    state.pan.x = state.pointer.pan.x + event.clientX - state.pointer.x;
    state.pan.y = state.pointer.pan.y + event.clientY - state.pointer.y;
    draw();
    return;
  }

  const imagePoint = screenToImage(event);

  if (state.action === "move") {
    const dx = imagePoint.x - state.pointer.last.x;
    const dy = imagePoint.y - state.pointer.last.y;
    moveSelectedMasks(dx, dy);
    state.pointer.last = imagePoint;
    state.pointer.changed = true;
    draw();
    return;
  }

  if (state.action === "resize") {
    resizeSelectedMask(imagePoint);
    state.pointer.changed =
      imagePoint.x !== state.pointer.start.x || imagePoint.y !== state.pointer.start.y;
    draw();
    return;
  }

  if (state.action === "draw") {
    state.pointer.last = imagePoint;
    if (state.tool === "lasso") {
      state.draft.points.push(imagePoint);
    } else {
      state.draft = createDraftMask(state.pointer.start, imagePoint);
    }
    draw();
  }
}

function onPointerUp(event) {
  if (!state.action) {
    return;
  }

  if (state.action === "draw" && state.draft && isUsableMask(state.draft)) {
    const mask = { ...normalizeMask(state.draft), id: crypto.randomUUID() };
    commitMasks([...state.masks, mask], [mask.id]);
    syncBlockSizeControl();
  }

  if (state.action === "move" && state.pointer.changed) {
    state.history.push(state.pointer.originalMasks);
    state.future = [];
  }

  if (state.action === "resize" && state.pointer.changed) {
    state.history.push(state.pointer.originalMasks);
    state.future = [];
  }

  state.action = null;
  state.pointer = null;
  state.draft = null;
  canvas.releasePointerCapture(event.pointerId);
  syncProject();
  updateHoverState(event);
  draw();
}

function startMovingMask(mask, imagePoint) {
  finishBlockSizeEdit();
  if (!state.selectedIds.has(mask.id)) {
    state.selectedIds.clear();
    state.selectedIds.add(mask.id);
    syncBlockSizeControl();
  }

  state.action = "move";
  state.pointer = {
    last: imagePoint,
    originalMasks: cloneMasks(state.masks),
    changed: false,
  };
}

function startPanning(event) {
  canvas.setPointerCapture(event.pointerId);
  state.action = "pan";
  state.pointer = { x: event.clientX, y: event.clientY, pan: { ...state.pan } };
  canvas.style.cursor = "grabbing";
}

function startResizingMask(mask, handle, imagePoint) {
  finishBlockSizeEdit();
  state.selectedIds.clear();
  state.selectedIds.add(mask.id);
  syncBlockSizeControl();
  state.hoveredId = mask.id;
  state.action = "resize";
  state.pointer = {
    targetId: mask.id,
    handle,
    start: imagePoint,
    originalMasks: cloneMasks(state.masks),
    changed: false,
  };
}

function resizeSelectedMask(imagePoint) {
  const { targetId, handle, start, originalMasks } = state.pointer;

  state.masks = originalMasks.map((mask) => {
    if (mask.id !== targetId) {
      return mask;
    }

    return resizeMask(mask, handle, start, imagePoint);
  });
}

function updateHoverState(event) {
  const deleteHit = getDeleteControlHit(event);
  if (deleteHit) {
    canvas.style.cursor = "pointer";
    return;
  }

  const previousHoveredId = state.hoveredId;
  const resizeHit = getResizeControlHit(event);
  if (resizeHit) {
    state.hoveredId = resizeHit.mask.id;
    canvas.style.cursor = getResizeCursor(resizeHit.handle);
    if (previousHoveredId !== state.hoveredId) {
      draw();
    }
    return;
  }

  const imagePoint = screenToImage(event);
  const hoveredMask = pointInImage(imagePoint) ? hitTest(imagePoint) : null;
  const nextHoveredId = hoveredMask?.id || null;

  state.hoveredId = nextHoveredId;
  canvas.style.cursor = getCanvasCursor(hoveredMask);

  if (previousHoveredId !== state.hoveredId) {
    draw();
  }
}

function clearHoverState() {
  if (!state.hoveredId) {
    return;
  }

  state.hoveredId = null;
  canvas.style.cursor = "";
  draw();
}

function getCanvasCursor(hoveredMask) {
  if (hoveredMask) {
    return "move";
  }

  if (state.spacePressed || state.tool === "pan") {
    return "grab";
  }

  return "crosshair";
}

function getDeleteControlHit(event) {
  if (!state.hoveredId) {
    return null;
  }

  const hoveredMask = state.masks.find((mask) => mask.id === state.hoveredId);
  if (!hoveredMask) {
    return null;
  }

  return pointInRect(getCanvasPoint(event), getDeleteControlForMask(hoveredMask, getView())) ? hoveredMask : null;
}

function getDeleteControlForMask(mask, view) {
  return getDeleteControlRect(getMaskBounds(mask), view, state.zoom, navigator.platform);
}

function getResizeControlHit(event) {
  const canvasPoint = getCanvasPoint(event);
  const view = getView();

  for (const mask of [...state.masks].reverse()) {
    const handle = getResizeHandleHit(getMaskBounds(mask), canvasPoint, view, state.zoom, RESIZE_HANDLE_TOLERANCE);

    if (handle) {
      return { mask, handle };
    }
  }

  return null;
}

function getCanvasPoint(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function onWheel(event) {
  if (!state.image) {
    return;
  }

  event.preventDefault();
  const factor = getWheelZoomFactor(event.deltaY, event.deltaMode);
  setZoom(state.zoom * factor);
}

function onKeyDown(event) {
  if (event.code === "Space") {
    state.spacePressed = true;
    event.preventDefault();
    return;
  }

  if (event.metaKey || event.ctrlKey || event.altKey) {
    return;
  }

  const key = event.key.toLowerCase();
  const tools = {
    h: "pan",
    r: "rectangle",
    o: "ellipse",
    l: "lasso",
  };

  if (tools[key]) {
    setTool(tools[key]);
  } else if (event.key === "Backspace" || event.key === "Delete") {
    deleteSelection();
  } else if (event.key === "Escape") {
    state.selectedIds.clear();
    syncBlockSizeControl();
    draw();
  }
}

async function onPaste(event) {
  const file = [...(event.clipboardData?.files || [])].find((item) => item.type.startsWith("image/"));

  if (!file) {
    return;
  }

  event.preventDefault();
  const dataUrl = await readFileAsDataUrl(file);
  await loadImageDocument({ dataUrl, name: file.name || "Clipboard Image" });
  showStatus("Pasted image from clipboard");
}

async function onDrop(event) {
  event.preventDefault();
  const file = event.dataTransfer.files[0];

  if (!file) {
    return;
  }

  if (file.name.toLowerCase().endsWith(".msc")) {
    await loadProjectContent(await file.text());
    showStatus("Project opened");
    return;
  }

  if (!file.type.startsWith("image/")) {
    showStatus("Drop an image or .msc project");
    return;
  }

  await loadImageDocument({ dataUrl: await readFileAsDataUrl(file), name: file.name });
  showStatus("Dropped image opened");
}

function createDraftMask(start, current) {
  if (state.tool === "lasso") {
    return { type: "lasso", points: [start, current], blockSize: state.blockSize };
  }

  return {
    type: state.tool,
    x: start.x,
    y: start.y,
    width: current.x - start.x,
    height: current.y - start.y,
    blockSize: state.blockSize,
  };
}

function normalizeMask(mask) {
  if (mask.type === "rectangle" || mask.type === "ellipse") {
    const x = Math.min(mask.x, mask.x + mask.width);
    const y = Math.min(mask.y, mask.y + mask.height);
    return {
      ...mask,
      x,
      y,
      width: Math.abs(mask.width),
      height: Math.abs(mask.height),
    };
  }

  return mask;
}

function isUsableMask(mask) {
  if (mask.type === "rectangle" || mask.type === "ellipse") {
    return Math.abs(mask.width) > 3 && Math.abs(mask.height) > 3;
  }

  return mask.points && mask.points.length > 2;
}

function pathMask(targetCtx, mask) {
  targetCtx.beginPath();

  if (mask.type === "rectangle") {
    targetCtx.rect(mask.x, mask.y, mask.width, mask.height);
    return;
  }

  if (mask.type === "ellipse") {
    targetCtx.ellipse(
      mask.x + mask.width / 2,
      mask.y + mask.height / 2,
      Math.abs(mask.width / 2),
      Math.abs(mask.height / 2),
      0,
      0,
      Math.PI * 2,
    );
    return;
  }

  if (mask.type === "brush") {
    pathBrush(targetCtx, mask.points, mask.radius);
    return;
  }

  drawPointPath(targetCtx, mask.points);
  targetCtx.closePath();
}

function drawPointPath(targetCtx, points) {
  if (!points.length) {
    return;
  }

  targetCtx.moveTo(points[0].x, points[0].y);
  for (const point of points.slice(1)) {
    targetCtx.lineTo(point.x, point.y);
  }
}

function pathBrush(targetCtx, points, radius) {
  if (!points.length) {
    return;
  }

  for (let index = 0; index < points.length; index += 1) {
    const point = points[index];
    targetCtx.moveTo(point.x + radius, point.y);
    targetCtx.arc(point.x, point.y, radius, 0, Math.PI * 2);

    if (index > 0) {
      const previous = points[index - 1];
      const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
      const steps = Math.max(1, Math.ceil(distance / Math.max(1, radius)));

      for (let step = 1; step < steps; step += 1) {
        const t = step / steps;
        const x = previous.x + (point.x - previous.x) * t;
        const y = previous.y + (point.y - previous.y) * t;
        targetCtx.moveTo(x + radius, y);
        targetCtx.arc(x, y, radius, 0, Math.PI * 2);
      }
    }
  }
}

function hitTest(point) {
  for (const mask of [...state.masks].reverse()) {
    if (maskContainsPoint(mask, point)) {
      return mask;
    }
  }

  return null;
}

function maskContainsPoint(mask, point) {
  if (mask.type === "rectangle") {
    return point.x >= mask.x && point.x <= mask.x + mask.width && point.y >= mask.y && point.y <= mask.y + mask.height;
  }

  if (mask.type === "ellipse") {
    const rx = mask.width / 2;
    const ry = mask.height / 2;
    const cx = mask.x + rx;
    const cy = mask.y + ry;
    return ((point.x - cx) ** 2) / rx ** 2 + ((point.y - cy) ** 2) / ry ** 2 <= 1;
  }

  if (mask.type === "brush") {
    return distanceToPolyline(point, mask.points) <= mask.radius;
  }

  return pointInPolygon(point, mask.points);
}

function pointInPolygon(point, points) {
  let inside = false;

  for (let i = 0, j = points.length - 1; i < points.length; j = i++) {
    const pi = points[i];
    const pj = points[j];
    const intersects = pi.y > point.y !== pj.y > point.y && point.x < ((pj.x - pi.x) * (point.y - pi.y)) / (pj.y - pi.y) + pi.x;
    if (intersects) {
      inside = !inside;
    }
  }

  return inside;
}

function distanceToPolyline(point, points) {
  let min = Number.POSITIVE_INFINITY;

  for (let index = 1; index < points.length; index += 1) {
    min = Math.min(min, distanceToSegment(point, points[index - 1], points[index]));
  }

  return min;
}

function distanceToSegment(point, start, end) {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = dx * dx + dy * dy || 1;
  const t = Math.max(0, Math.min(1, ((point.x - start.x) * dx + (point.y - start.y) * dy) / length));
  const x = start.x + t * dx;
  const y = start.y + t * dy;
  return Math.hypot(point.x - x, point.y - y);
}

function moveSelectedMasks(dx, dy) {
  const ids = state.selectedIds;

  state.masks = state.masks.map((mask) => {
    if (!ids.has(mask.id)) {
      return mask;
    }

    if (mask.points) {
      return { ...mask, points: mask.points.map((point) => ({ x: point.x + dx, y: point.y + dy })) };
    }

    return { ...mask, x: mask.x + dx, y: mask.y + dy };
  });
}

function commitMasks(nextMasks, selectedIds = []) {
  finishBlockSizeEdit();
  state.history.push(cloneMasks(state.masks));
  state.future = [];
  state.masks = cloneMasks(nextMasks);
  state.selectedIds = new Set(selectedIds);
  syncBlockSizeControl();
  if (state.hoveredId && !state.masks.some((mask) => mask.id === state.hoveredId)) {
    state.hoveredId = null;
  }
  syncProject();
  draw();
}

function undo() {
  if (!state.history.length) {
    return;
  }

  state.future.push(cloneMasks(state.masks));
  state.masks = state.history.pop();
  state.selectedIds.clear();
  state.hoveredId = null;
  syncBlockSizeControl();
  syncProject();
  draw();
}

function redo() {
  if (!state.future.length) {
    return;
  }

  state.history.push(cloneMasks(state.masks));
  state.masks = state.future.pop();
  state.selectedIds.clear();
  state.hoveredId = null;
  syncBlockSizeControl();
  syncProject();
  draw();
}

function deleteSelection() {
  if (!state.selectedIds.size) {
    return;
  }

  commitMasks(
    state.masks.filter((mask) => !state.selectedIds.has(mask.id)),
    [],
  );
}

function deleteMask(maskId) {
  commitMasks(
    state.masks.filter((mask) => mask.id !== maskId),
    [],
  );
  showStatus("Mosaic area deleted");
}

function selectAllMasks() {
  state.selectedIds = new Set(state.masks.map((mask) => mask.id));
  syncBlockSizeControl();
  draw();
}

function setTool(tool) {
  state.tool = tool;
  document.querySelectorAll("[data-tool]").forEach((button) => {
    button.classList.toggle("active", button.dataset.tool === tool);
  });
  showStatus(`${tool[0].toUpperCase()}${tool.slice(1)} tool`);
}

function fitToScreen() {
  if (!state.image) {
    return;
  }

  const { width, height } = getCanvasSize();
  const scaleX = (width - 80) / state.image.naturalWidth;
  const scaleY = (height - 80) / state.image.naturalHeight;
  state.zoom = Math.max(0.05, Math.min(1, scaleX, scaleY));
  state.pan = { x: 0, y: 0 };
  draw();
}

function setZoom(value) {
  state.zoom = Math.max(0.05, Math.min(8, value));
  draw();
}

function resetView() {
  fitToScreen();
}

function getView() {
  const { width, height } = getCanvasSize();
  const imageWidth = state.image.naturalWidth * state.zoom;
  const imageHeight = state.image.naturalHeight * state.zoom;

  return {
    x: (width - imageWidth) / 2 + state.pan.x,
    y: (height - imageHeight) / 2 + state.pan.y,
    width: imageWidth,
    height: imageHeight,
  };
}

function screenToImage(event) {
  const rect = canvas.getBoundingClientRect();
  const view = getView();

  return {
    x: (event.clientX - rect.left - view.x) / state.zoom,
    y: (event.clientY - rect.top - view.y) / state.zoom,
  };
}

function pointInImage(point) {
  return point.x >= 0 && point.y >= 0 && point.x <= state.image.naturalWidth && point.y <= state.image.naturalHeight;
}

function resizeCanvas() {
  const rect = canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  canvas.width = Math.max(1, Math.floor(rect.width * ratio));
  canvas.height = Math.max(1, Math.floor(rect.height * ratio));
}

function getCanvasSize() {
  const rect = canvas.getBoundingClientRect();
  return { width: rect.width, height: rect.height };
}

function syncProject() {
  if (!state.project) {
    return;
  }

  state.project.masks = cloneMasks(state.masks);
  state.project.settings.blockSize = state.blockSize;
  state.project.settings.exportQuality = state.exportQuality;
}

function syncDocumentText() {
  if (!state.project) {
    documentText.textContent = "No document";
    return;
  }

  const source = state.project.source;
  documentText.textContent = `${source.name} · ${source.width}×${source.height} · ${state.masks.length} masks · ${Math.round(state.zoom * 100)}%`;
}

function showStatus(message) {
  statusText.textContent = message;
}

function ensureDocument() {
  if (!state.project || !state.image) {
    throw new Error("Open an image first.");
  }
}

function defaultExportName() {
  const name = state.project?.source?.name || "mosaic-export";
  const base = name.replace(/\.[^.]+$/, "");
  return `${base}-mosaic.png`;
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Could not read file."));
    reader.readAsDataURL(file);
  });
}

function cloneMasks(masks) {
  return JSON.parse(JSON.stringify(masks));
}
