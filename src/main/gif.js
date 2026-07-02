import { decompressFrames, parseGIF } from "gifuct-js";
import gifenc from "gifenc";

const { GIFEncoder, applyPalette, quantize } = gifenc;
const DEFAULT_FRAME_DELAY = 100;
const MIN_FRAME_DELAY = 20;

export function isGifDataUrl(dataUrl) {
  return typeof dataUrl === "string" && /^data:image\/gif[,;]/i.test(dataUrl);
}

export function decodeGifDataUrl(dataUrl) {
  if (!isGifDataUrl(dataUrl)) {
    throw new Error("Could not load GIF.");
  }

  const parsed = parseGIF(dataUrlToArrayBuffer(dataUrl));
  const rawFrames = decompressFrames(parsed, true);
  const width = parsed.lsd.width;
  const height = parsed.lsd.height;

  if (!width || !height || !rawFrames.length) {
    throw new Error("Could not load GIF.");
  }

  return {
    width,
    height,
    frames: compositeGifFrames(rawFrames, width, height),
  };
}

export function encodeGifDataUrl({ width, height, frames }) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0 || !Array.isArray(frames) || !frames.length) {
    throw new Error("Could not export GIF.");
  }

  const gif = GIFEncoder();

  frames.forEach((frame) => {
    const rgba = toRgba(frame.data);
    const palette = quantize(rgba, 256);
    const indexed = applyPalette(rgba, palette);

    gif.writeFrame(indexed, width, height, {
      palette,
      delay: clampDelay(frame.delay),
      repeat: 0,
    });
  });

  gif.finish();
  return `data:image/gif;base64,${Buffer.from(gif.bytes()).toString("base64")}`;
}

function compositeGifFrames(rawFrames, width, height) {
  const canvas = new Uint8ClampedArray(width * height * 4);
  const output = [];
  let previousFrame = null;
  let restoreBuffer = null;

  for (const frame of rawFrames) {
    applyDisposal(canvas, previousFrame, restoreBuffer, width, height);
    restoreBuffer = frame.disposalType === 3 ? canvas.slice() : null;
    drawPatch(canvas, frame, width, height);

    const rendered = canvas.slice();
    output.push({
      data: rendered.buffer,
      delay: clampDelay(frame.delay),
    });

    previousFrame = frame;
  }

  return output;
}

function applyDisposal(canvas, frame, restoreBuffer, width, height) {
  if (!frame) {
    return;
  }

  if (frame.disposalType === 2) {
    clearFrameRect(canvas, frame.dims, width, height);
    return;
  }

  if (frame.disposalType === 3 && restoreBuffer) {
    canvas.set(restoreBuffer);
  }
}

function drawPatch(canvas, frame, width, height) {
  const { left, top, width: patchWidth, height: patchHeight } = frame.dims;
  const patch = frame.patch;

  for (let patchY = 0; patchY < patchHeight; patchY += 1) {
    const targetY = top + patchY;
    if (targetY < 0 || targetY >= height) {
      continue;
    }

    for (let patchX = 0; patchX < patchWidth; patchX += 1) {
      const targetX = left + patchX;
      if (targetX < 0 || targetX >= width) {
        continue;
      }

      const patchIndex = (patchY * patchWidth + patchX) * 4;
      const alpha = patch[patchIndex + 3];
      if (!alpha) {
        continue;
      }

      const targetIndex = (targetY * width + targetX) * 4;
      canvas[targetIndex] = patch[patchIndex];
      canvas[targetIndex + 1] = patch[patchIndex + 1];
      canvas[targetIndex + 2] = patch[patchIndex + 2];
      canvas[targetIndex + 3] = alpha;
    }
  }
}

function clearFrameRect(canvas, dims, width, height) {
  const { left, top, width: patchWidth, height: patchHeight } = dims;
  const startX = Math.max(0, left);
  const endX = Math.min(width, left + patchWidth);
  const startY = Math.max(0, top);
  const endY = Math.min(height, top + patchHeight);

  if (startX >= endX || startY >= endY) {
    return;
  }

  for (let y = startY; y < endY; y += 1) {
    const rowStart = (y * width + startX) * 4;
    canvas.fill(0, rowStart, rowStart + (endX - startX) * 4);
  }
}

function dataUrlToArrayBuffer(dataUrl) {
  const base64 = dataUrl.split(",")[1];
  const buffer = Buffer.from(base64, "base64");
  return buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength);
}

function toRgba(data) {
  if (data instanceof Uint8ClampedArray) {
    return data;
  }

  if (data instanceof Uint8Array) {
    return new Uint8ClampedArray(data.buffer, data.byteOffset, data.byteLength);
  }

  if (data instanceof ArrayBuffer) {
    return new Uint8ClampedArray(data);
  }

  throw new Error("Could not export GIF.");
}

function clampDelay(delay) {
  const numeric = Number(delay);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return DEFAULT_FRAME_DELAY;
  }

  return Math.max(MIN_FRAME_DELAY, Math.round(numeric));
}
