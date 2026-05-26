const DESIGN_WIDTH = 1280;
const DESIGN_HEIGHT = 860;
const MIN_WIDTH = 860;

export function getInitialWindowBounds() {
  const scale = MIN_WIDTH / DESIGN_WIDTH;
  const proportionalHeight = Math.round(DESIGN_HEIGHT * scale);

  return {
    width: MIN_WIDTH,
    height: proportionalHeight,
    minWidth: MIN_WIDTH,
    minHeight: proportionalHeight,
  };
}

