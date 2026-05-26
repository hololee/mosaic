import path from "node:path";
import { fileURLToPath } from "node:url";

const DESIGN_WIDTH = 1280;
const DESIGN_HEIGHT = 860;
const MIN_WIDTH = 860;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

export function getAppIconPath() {
  return path.join(__dirname, "../../assets/icon.png");
}
