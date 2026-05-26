import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

test("app icon is a square png asset", async () => {
  const icon = await fs.readFile(new URL("../assets/icon.png", import.meta.url));

  assert.deepEqual(icon.subarray(0, PNG_SIGNATURE.length), PNG_SIGNATURE);
  assert.equal(icon.readUInt32BE(16), 1024);
  assert.equal(icon.readUInt32BE(20), 1024);
  assert.equal(icon[25], 6);
});
