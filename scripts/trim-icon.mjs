import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const OUTPUT_SIZE = 1024;
const ALPHA_THRESHOLD = 8;
const CROP_MARGIN_RATIO = 0.14;
const CRC_TABLE = Array.from({ length: 256 }, (_, index) => {
  let value = index;

  for (let bit = 0; bit < 8; bit += 1) {
    value = value & 1 ? 0xedb88320 ^ (value >>> 1) : value >>> 1;
  }

  return value >>> 0;
});

const [inputPath, outputPath] = process.argv.slice(2);

if (!inputPath || !outputPath) {
  console.error("Usage: node scripts/trim-icon.mjs <input.png> <output.png>");
  process.exit(1);
}

const source = readPng(inputPath);
const bounds = getAlphaBounds(source);
const icon = renderTrimmedIcon(source, bounds);

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, encodePng(OUTPUT_SIZE, OUTPUT_SIZE, icon));

console.log(
  JSON.stringify({
    source: { width: source.width, height: source.height },
    bounds,
    output: { width: OUTPUT_SIZE, height: OUTPUT_SIZE },
  }),
);

function readPng(filePath) {
  const buffer = fs.readFileSync(filePath);

  if (!buffer.subarray(0, PNG_SIGNATURE.length).equals(PNG_SIGNATURE)) {
    throw new Error("Input is not a PNG file.");
  }

  let offset = PNG_SIGNATURE.length;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const data = buffer.subarray(offset + 8, offset + 8 + length);

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
      interlace = data[12];
    }

    if (type === "IDAT") {
      idat.push(data);
    }

    if (type === "IEND") {
      break;
    }

    offset += length + 12;
  }

  if (bitDepth !== 8 || interlace !== 0) {
    throw new Error("Only non-interlaced 8-bit PNG files are supported.");
  }

  const channels = getChannelCount(colorType);
  const inflated = zlib.inflateSync(Buffer.concat(idat));
  const scanlineLength = width * channels;
  const raw = Buffer.alloc(width * height * channels);
  let sourceOffset = 0;
  let targetOffset = 0;
  let previous = Buffer.alloc(scanlineLength);

  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    const row = Buffer.from(inflated.subarray(sourceOffset, sourceOffset + scanlineLength));
    sourceOffset += scanlineLength;
    unfilterRow(row, previous, channels, filter);
    row.copy(raw, targetOffset);
    previous = row;
    targetOffset += scanlineLength;
  }

  return { width, height, data: toRgba(raw, colorType, width, height) };
}

function getChannelCount(colorType) {
  if (colorType === 0) {
    return 1;
  }

  if (colorType === 2) {
    return 3;
  }

  if (colorType === 4) {
    return 2;
  }

  if (colorType === 6) {
    return 4;
  }

  throw new Error(`Unsupported PNG color type: ${colorType}`);
}

function unfilterRow(row, previous, bytesPerPixel, filter) {
  for (let x = 0; x < row.length; x += 1) {
    const left = x >= bytesPerPixel ? row[x - bytesPerPixel] : 0;
    const up = previous[x] || 0;
    const upLeft = x >= bytesPerPixel ? previous[x - bytesPerPixel] || 0 : 0;

    if (filter === 1) {
      row[x] = (row[x] + left) & 0xff;
    } else if (filter === 2) {
      row[x] = (row[x] + up) & 0xff;
    } else if (filter === 3) {
      row[x] = (row[x] + Math.floor((left + up) / 2)) & 0xff;
    } else if (filter === 4) {
      row[x] = (row[x] + paeth(left, up, upLeft)) & 0xff;
    } else if (filter !== 0) {
      throw new Error(`Unsupported PNG filter: ${filter}`);
    }
  }
}

function paeth(left, up, upLeft) {
  const estimate = left + up - upLeft;
  const leftDistance = Math.abs(estimate - left);
  const upDistance = Math.abs(estimate - up);
  const upLeftDistance = Math.abs(estimate - upLeft);

  if (leftDistance <= upDistance && leftDistance <= upLeftDistance) {
    return left;
  }

  return upDistance <= upLeftDistance ? up : upLeft;
}

function toRgba(raw, colorType, width, height) {
  const rgba = Buffer.alloc(width * height * 4);
  const channels = getChannelCount(colorType);

  for (let sourceIndex = 0, targetIndex = 0; sourceIndex < raw.length; sourceIndex += channels, targetIndex += 4) {
    if (colorType === 0) {
      rgba[targetIndex] = raw[sourceIndex];
      rgba[targetIndex + 1] = raw[sourceIndex];
      rgba[targetIndex + 2] = raw[sourceIndex];
      rgba[targetIndex + 3] = 255;
    } else if (colorType === 2) {
      rgba[targetIndex] = raw[sourceIndex];
      rgba[targetIndex + 1] = raw[sourceIndex + 1];
      rgba[targetIndex + 2] = raw[sourceIndex + 2];
      rgba[targetIndex + 3] = 255;
    } else if (colorType === 4) {
      rgba[targetIndex] = raw[sourceIndex];
      rgba[targetIndex + 1] = raw[sourceIndex];
      rgba[targetIndex + 2] = raw[sourceIndex];
      rgba[targetIndex + 3] = raw[sourceIndex + 1];
    } else {
      rgba[targetIndex] = raw[sourceIndex];
      rgba[targetIndex + 1] = raw[sourceIndex + 1];
      rgba[targetIndex + 2] = raw[sourceIndex + 2];
      rgba[targetIndex + 3] = raw[sourceIndex + 3];
    }
  }

  return rgba;
}

function getAlphaBounds(image) {
  let minX = image.width;
  let minY = image.height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < image.height; y += 1) {
    for (let x = 0; x < image.width; x += 1) {
      const alpha = image.data[(y * image.width + x) * 4 + 3];

      if (alpha > ALPHA_THRESHOLD) {
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x);
        maxY = Math.max(maxY, y);
      }
    }
  }

  if (maxX < minX || maxY < minY) {
    throw new Error("No visible pixels found in input image.");
  }

  return { minX, minY, maxX, maxY, width: maxX - minX + 1, height: maxY - minY + 1 };
}

function renderTrimmedIcon(source, bounds) {
  const output = Buffer.alloc(OUTPUT_SIZE * OUTPUT_SIZE * 4);
  const contentSide = Math.max(bounds.width, bounds.height);
  const cropSide = contentSide * (1 + CROP_MARGIN_RATIO);
  const centerX = (bounds.minX + bounds.maxX) / 2;
  const centerY = (bounds.minY + bounds.maxY) / 2;
  const cropLeft = centerX - cropSide / 2;
  const cropTop = centerY - cropSide / 2;

  for (let y = 0; y < OUTPUT_SIZE; y += 1) {
    for (let x = 0; x < OUTPUT_SIZE; x += 1) {
      const sourceX = cropLeft + ((x + 0.5) / OUTPUT_SIZE) * cropSide - 0.5;
      const sourceY = cropTop + ((y + 0.5) / OUTPUT_SIZE) * cropSide - 0.5;
      const pixel = sampleBilinear(source, sourceX, sourceY);
      const index = (y * OUTPUT_SIZE + x) * 4;

      output[index] = pixel[0];
      output[index + 1] = pixel[1];
      output[index + 2] = pixel[2];
      output[index + 3] = pixel[3];
    }
  }

  return output;
}

function sampleBilinear(image, x, y) {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const xWeight = x - x0;
  const yWeight = y - y0;
  const top = mixPixels(getPixel(image, x0, y0), getPixel(image, x0 + 1, y0), xWeight);
  const bottom = mixPixels(getPixel(image, x0, y0 + 1), getPixel(image, x0 + 1, y0 + 1), xWeight);

  return mixPixels(top, bottom, yWeight);
}

function getPixel(image, x, y) {
  if (x < 0 || y < 0 || x >= image.width || y >= image.height) {
    return [0, 0, 0, 0];
  }

  const index = (y * image.width + x) * 4;
  return [
    image.data[index],
    image.data[index + 1],
    image.data[index + 2],
    image.data[index + 3],
  ];
}

function mixPixels(a, b, weight) {
  const inverse = 1 - weight;

  return [
    Math.round(a[0] * inverse + b[0] * weight),
    Math.round(a[1] * inverse + b[1] * weight),
    Math.round(a[2] * inverse + b[2] * weight),
    Math.round(a[3] * inverse + b[3] * weight),
  ];
}

function encodePng(width, height, rgba) {
  const rowLength = width * 4;
  const filtered = Buffer.alloc((rowLength + 1) * height);

  for (let y = 0; y < height; y += 1) {
    filtered[y * (rowLength + 1)] = 0;
    rgba.copy(filtered, y * (rowLength + 1) + 1, y * rowLength, (y + 1) * rowLength);
  }

  return Buffer.concat([
    PNG_SIGNATURE,
    createChunk("IHDR", createIhdr(width, height)),
    createChunk("IDAT", zlib.deflateSync(filtered, { level: 9 })),
    createChunk("IEND", Buffer.alloc(0)),
  ]);
}

function createIhdr(width, height) {
  const buffer = Buffer.alloc(13);
  buffer.writeUInt32BE(width, 0);
  buffer.writeUInt32BE(height, 4);
  buffer[8] = 8;
  buffer[9] = 6;
  buffer[10] = 0;
  buffer[11] = 0;
  buffer[12] = 0;
  return buffer;
}

function createChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  const crc = Buffer.alloc(4);

  length.writeUInt32BE(data.length, 0);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);

  return Buffer.concat([length, typeBuffer, data, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;

  for (const byte of buffer) {
    crc = CRC_TABLE[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  }

  return (crc ^ 0xffffffff) >>> 0;
}
