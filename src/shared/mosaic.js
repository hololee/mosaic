const MIN_BLOCK_SIZE = 4;
const MAX_BLOCK_SIZE = 72;

export function clampBlockSize(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 24;
  }

  return Math.min(MAX_BLOCK_SIZE, Math.max(MIN_BLOCK_SIZE, Math.round(numeric)));
}

export function getMosaicScale(blockSize) {
  return 1 / clampBlockSize(blockSize);
}

