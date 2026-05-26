import { getMaskBounds } from "./outline.js";

export const MIN_RESIZE_SIZE = 24;

export function resizeMask(mask, handle, startPoint, currentPoint, minSize = MIN_RESIZE_SIZE) {
  const originalBounds = getMaskBounds(mask);
  const nextBounds = resizeBounds(originalBounds, handle, currentPoint.x - startPoint.x, currentPoint.y - startPoint.y, minSize);

  if (mask.type === "rectangle" || mask.type === "ellipse") {
    return {
      ...mask,
      ...nextBounds,
    };
  }

  return resizePointMask(mask, originalBounds, nextBounds);
}

function resizeBounds(bounds, handle, dx, dy, minSize) {
  let left = bounds.x;
  let top = bounds.y;
  let right = bounds.x + bounds.width;
  let bottom = bounds.y + bounds.height;

  if (handle.includes("w")) {
    left += dx;
  }
  if (handle.includes("e")) {
    right += dx;
  }
  if (handle.includes("n")) {
    top += dy;
  }
  if (handle.includes("s")) {
    bottom += dy;
  }

  if (right - left < minSize) {
    if (handle.includes("w")) {
      left = right - minSize;
    } else {
      right = left + minSize;
    }
  }

  if (bottom - top < minSize) {
    if (handle.includes("n")) {
      top = bottom - minSize;
    } else {
      bottom = top + minSize;
    }
  }

  return {
    x: left,
    y: top,
    width: right - left,
    height: bottom - top,
  };
}

function resizePointMask(mask, originalBounds, nextBounds) {
  const scaleX = originalBounds.width ? nextBounds.width / originalBounds.width : 1;
  const scaleY = originalBounds.height ? nextBounds.height / originalBounds.height : 1;

  const points = (mask.points || []).map((point) => ({
    x: nextBounds.x + (point.x - originalBounds.x) * scaleX,
    y: nextBounds.y + (point.y - originalBounds.y) * scaleY,
  }));

  if (mask.type !== "brush") {
    return {
      ...mask,
      points,
    };
  }

  const radiusScale = Math.max(0.1, Math.sqrt(Math.abs(scaleX * scaleY)));
  return {
    ...mask,
    points,
    radius: Math.max(1, mask.radius * radiusScale),
  };
}
