import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");
const sourceIconPath = path.join(rootDir, "assets", "icon.png");
const macIconPath = path.join(rootDir, "assets", "icon.icns");
const winIconPath = path.join(rootDir, "assets", "icon.ico");
const outputIconPaths = [macIconPath, winIconPath];
const workDir = path.join(rootDir, ".dev", "build-icons");

if (process.platform !== "darwin") {
  ensureCommittedIconsExist();
  console.log("Using committed build icons.");
  process.exit(0);
}

if (!needsIconRefresh()) {
  console.log("Build icons are up to date.");
  process.exit(0);
}

fs.rmSync(workDir, { recursive: true, force: true });
fs.mkdirSync(workDir, { recursive: true });

generateIcns();
generateIco();

console.log("Build icons prepared.");

function needsIconRefresh() {
  if (!fs.existsSync(sourceIconPath)) {
    throw new Error(`Missing source icon: ${sourceIconPath}`);
  }

  return outputIconPaths.some((outputPath) => {
    if (!fs.existsSync(outputPath)) {
      return true;
    }

    return fs.statSync(sourceIconPath).mtimeMs > fs.statSync(outputPath).mtimeMs;
  });
}

function ensureCommittedIconsExist() {
  const missingIconPath = outputIconPaths.find((outputPath) => !fs.existsSync(outputPath));

  if (missingIconPath) {
    throw new Error(`Missing committed build icon: ${missingIconPath}`);
  }
}

function generateIcns() {
  const images = [
    ["icp4", 16],
    ["icp5", 32],
    ["icp6", 64],
    ["ic07", 128],
    ["ic08", 256],
    ["ic09", 512],
    ["ic10", 1024],
  ].map(([type, size]) => {
    const outputPath = path.join(workDir, `icns-${size}.png`);
    resizePng(size, outputPath);

    return {
      type,
      bytes: fs.readFileSync(outputPath),
    };
  });

  fs.writeFileSync(macIconPath, createIcns(images));
}

function generateIco() {
  const images = [16, 24, 32, 48, 64, 128, 256].map((size) => {
    const outputPath = path.join(workDir, `icon-${size}.png`);
    resizePng(size, outputPath);

    return {
      size,
      bytes: fs.readFileSync(outputPath),
    };
  });

  fs.writeFileSync(winIconPath, createIco(images));
}

function resizePng(size, outputPath) {
  run("sips", ["-z", String(size), String(size), sourceIconPath, "--out", outputPath]);
}

function createIco(images) {
  const headerSize = 6;
  const entrySize = 16;
  const header = Buffer.alloc(headerSize);
  const entries = Buffer.alloc(entrySize * images.length);
  let imageOffset = headerSize + entries.length;

  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(images.length, 4);

  images.forEach((image, index) => {
    const offset = index * entrySize;

    entries.writeUInt8(image.size === 256 ? 0 : image.size, offset);
    entries.writeUInt8(image.size === 256 ? 0 : image.size, offset + 1);
    entries.writeUInt8(0, offset + 2);
    entries.writeUInt8(0, offset + 3);
    entries.writeUInt16LE(1, offset + 4);
    entries.writeUInt16LE(32, offset + 6);
    entries.writeUInt32LE(image.bytes.length, offset + 8);
    entries.writeUInt32LE(imageOffset, offset + 12);

    imageOffset += image.bytes.length;
  });

  return Buffer.concat([header, entries, ...images.map((image) => image.bytes)]);
}

function createIcns(images) {
  const chunks = images.map((image) => {
    const chunkHeader = Buffer.alloc(8);
    chunkHeader.write(image.type, 0, "ascii");
    chunkHeader.writeUInt32BE(image.bytes.length + chunkHeader.length, 4);

    return Buffer.concat([chunkHeader, image.bytes]);
  });
  const header = Buffer.alloc(8);
  const totalSize = header.length + chunks.reduce((size, chunk) => size + chunk.length, 0);

  header.write("icns", 0, "ascii");
  header.writeUInt32BE(totalSize, 4);

  return Buffer.concat([header, ...chunks]);
}

function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit" });

  if (result.status !== 0) {
    throw new Error(`${command} failed.`);
  }
}
