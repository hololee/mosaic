import { clampBlockSize } from "./mosaic.js";

export function getSelectionBlockSize(masks, selectedIds) {
  const selectedMasks = masks.filter((mask) => selectedIds.has(mask.id));

  if (!selectedMasks.length) {
    return null;
  }

  const firstBlockSize = clampBlockSize(selectedMasks[0].blockSize);
  const hasMixedBlockSizes = selectedMasks.some((mask) => clampBlockSize(mask.blockSize) !== firstBlockSize);

  return hasMixedBlockSizes ? null : firstBlockSize;
}

export function updateSelectedBlockSize(masks, selectedIds, blockSize) {
  const nextBlockSize = clampBlockSize(blockSize);

  return masks.map((mask) => (selectedIds.has(mask.id) ? { ...mask, blockSize: nextBlockSize } : mask));
}
