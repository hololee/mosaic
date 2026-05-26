const LIGHT_GRAY_OUTLINE = "rgba(245, 245, 245, 0.72)";
const DARK_GRAY_OUTLINE = "rgba(18, 18, 18, 0.72)";

export function getRelativeLuminance(rgb) {
  const [red, green, blue] = rgb;
  return Math.round(red * 0.2126 + green * 0.7152 + blue * 0.0722);
}

export function getContrastingGrayOutline(luminance) {
  return luminance >= 150 ? DARK_GRAY_OUTLINE : LIGHT_GRAY_OUTLINE;
}

export function getMaskSamplePoint(mask, imageWidth, imageHeight) {
  const bounds = getMaskBounds(mask);

  return {
    x: clamp(Math.round(bounds.x + bounds.width / 2), 0, imageWidth - 1),
    y: clamp(Math.round(bounds.y + bounds.height / 2), 0, imageHeight - 1),
  };
}

function getMaskBounds(mask) {
  if (mask.type === "rectangle" || mask.type === "ellipse") {
    return {
      x: mask.x,
      y: mask.y,
      width: mask.width,
      height: mask.height,
    };
  }

  const radius = mask.type === "brush" ? mask.radius || 0 : 0;
  const points = mask.points || [];
  const xs = points.map((point) => point.x);
  const ys = points.map((point) => point.y);

  return {
    x: Math.min(...xs) - radius,
    y: Math.min(...ys) - radius,
    width: Math.max(...xs) - Math.min(...xs) + radius * 2,
    height: Math.max(...ys) - Math.min(...ys) + radius * 2,
  };
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}

