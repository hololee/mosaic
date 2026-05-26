const DEFAULT_DELETE_CONTROL_SIZE = 20;
const DELETE_CONTROL_GAP = 10;
const DEFAULT_RESIZE_TOLERANCE = 7;

export function getDeleteControlCorner(platform = "") {
  return String(platform).toLowerCase().includes("mac") ? "top-left" : "top-right";
}

export function getDeleteControlRect(maskBounds, view, zoom, platform, size = DEFAULT_DELETE_CONTROL_SIZE) {
  const corner = getDeleteControlCorner(platform);
  const left = view.x + maskBounds.x * zoom;
  const top = view.y + maskBounds.y * zoom;
  const right = view.x + (maskBounds.x + maskBounds.width) * zoom;
  const rawX =
    corner === "top-left"
      ? left + DELETE_CONTROL_GAP
      : right - size - DELETE_CONTROL_GAP;
  const rawY = top + DELETE_CONTROL_GAP;

  return {
    x: clamp(rawX, view.x, Math.max(view.x, view.x + view.width - size)),
    y: clamp(rawY, view.y, Math.max(view.y, view.y + view.height - size)),
    width: size,
    height: size,
    corner,
  };
}

export function pointInRect(point, rect) {
  return point.x >= rect.x && point.x <= rect.x + rect.width && point.y >= rect.y && point.y <= rect.y + rect.height;
}

export function getResizeHandleHit(maskBounds, point, view, zoom, tolerance = DEFAULT_RESIZE_TOLERANCE) {
  const left = view.x + Math.min(maskBounds.x, maskBounds.x + maskBounds.width) * zoom;
  const right = view.x + Math.max(maskBounds.x, maskBounds.x + maskBounds.width) * zoom;
  const top = view.y + Math.min(maskBounds.y, maskBounds.y + maskBounds.height) * zoom;
  const bottom = view.y + Math.max(maskBounds.y, maskBounds.y + maskBounds.height) * zoom;

  const withinExpandedBounds =
    point.x >= left - tolerance && point.x <= right + tolerance && point.y >= top - tolerance && point.y <= bottom + tolerance;

  if (!withinExpandedBounds) {
    return null;
  }

  const nearLeft = Math.abs(point.x - left) <= tolerance;
  const nearRight = Math.abs(point.x - right) <= tolerance;
  const nearTop = Math.abs(point.y - top) <= tolerance;
  const nearBottom = Math.abs(point.y - bottom) <= tolerance;

  if ((nearTop || nearBottom) && (nearLeft || nearRight)) {
    return `${nearTop ? "n" : "s"}${nearLeft ? "w" : "e"}`;
  }

  if (nearTop) {
    return "n";
  }

  if (nearRight) {
    return "e";
  }

  if (nearBottom) {
    return "s";
  }

  if (nearLeft) {
    return "w";
  }

  return null;
}

export function getResizeCursor(handle) {
  if (handle === "n" || handle === "s") {
    return "ns-resize";
  }

  if (handle === "e" || handle === "w") {
    return "ew-resize";
  }

  if (handle === "nw" || handle === "se") {
    return "nwse-resize";
  }

  return "nesw-resize";
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
