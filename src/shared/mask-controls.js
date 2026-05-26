const DEFAULT_DELETE_CONTROL_SIZE = 20;

export function getDeleteControlCorner(platform = "") {
  return String(platform).toLowerCase().includes("mac") ? "top-left" : "top-right";
}

export function getDeleteControlRect(maskBounds, view, zoom, platform, size = DEFAULT_DELETE_CONTROL_SIZE) {
  const corner = getDeleteControlCorner(platform);
  const rawX =
    corner === "top-left"
      ? view.x + maskBounds.x * zoom - size / 2
      : view.x + (maskBounds.x + maskBounds.width) * zoom - size / 2;
  const rawY = view.y + maskBounds.y * zoom - size / 2;

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

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
