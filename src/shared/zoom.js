const WHEEL_DELTA_LIMIT = 60;
const LINE_DELTA_SCALE = 16;
const PAGE_DELTA_SCALE = 240;
const WHEEL_ZOOM_SENSITIVITY = 0.0013;

export function normalizeWheelDelta(deltaY, deltaMode = 0) {
  const modeScale = deltaMode === 1 ? LINE_DELTA_SCALE : deltaMode === 2 ? PAGE_DELTA_SCALE : 1;
  const scaledDelta = deltaY * modeScale;

  return Math.min(WHEEL_DELTA_LIMIT, Math.max(-WHEEL_DELTA_LIMIT, scaledDelta));
}

export function getWheelZoomFactor(deltaY, deltaMode = 0) {
  return Math.exp(-normalizeWheelDelta(deltaY, deltaMode) * WHEEL_ZOOM_SENSITIVITY);
}
