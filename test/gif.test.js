import test from "node:test";
import assert from "node:assert/strict";

import {
  decodeGifDataUrl,
  encodeGifDataUrl,
  isGifDataUrl,
} from "../src/main/gif.js";

test("GIF helpers identify GIF data URLs", () => {
  assert.equal(isGifDataUrl("data:image/gif;base64,R0lGODlh"), true);
  assert.equal(isGifDataUrl("data:image/png;base64,abc"), false);
});

test("GIF helpers encode and decode animated frame data", () => {
  const red = new Uint8ClampedArray([
    255, 0, 0, 255,
    255, 0, 0, 255,
  ]);
  const blue = new Uint8ClampedArray([
    0, 0, 255, 255,
    0, 0, 255, 255,
  ]);

  const dataUrl = encodeGifDataUrl({
    width: 2,
    height: 1,
    frames: [
      { data: red, delay: 80 },
      { data: blue, delay: 120 },
    ],
  });
  const decoded = decodeGifDataUrl(dataUrl);

  assert.match(dataUrl, /^data:image\/gif;base64,/);
  assert.equal(decoded.width, 2);
  assert.equal(decoded.height, 1);
  assert.equal(decoded.frames.length, 2);
  assert.equal(decoded.frames[0].delay, 80);
  assert.equal(decoded.frames[1].delay, 120);
  assert.ok(decoded.frames[0].data instanceof ArrayBuffer);
});
