import test from "node:test";
import assert from "node:assert/strict";

import {
  createProject,
  parseProject,
  serializeProject,
} from "../src/shared/project.js";

test("createProject stores source image metadata and defaults", () => {
  const project = createProject({
    dataUrl: "data:image/png;base64,abc",
    width: 640,
    height: 480,
    name: "capture.png",
  });

  assert.equal(project.version, 1);
  assert.equal(project.source.width, 640);
  assert.equal(project.source.height, 480);
  assert.equal(project.source.name, "capture.png");
  assert.deepEqual(project.masks, []);
  assert.equal(project.settings.blockSize, 24);
  assert.equal(project.settings.exportQuality, 0.92);
});

test("serializeProject and parseProject preserve editable masks", () => {
  const project = createProject({
    dataUrl: "data:image/png;base64,abc",
    width: 320,
    height: 240,
    name: "clip.png",
  });

  project.masks.push({
    id: "mask-1",
    type: "rectangle",
    x: 12,
    y: 18,
    width: 80,
    height: 42,
    blockSize: 18,
  });

  const parsed = parseProject(serializeProject(project));

  assert.equal(parsed.source.dataUrl, "data:image/png;base64,abc");
  assert.equal(parsed.masks.length, 1);
  assert.equal(parsed.masks[0].type, "rectangle");
  assert.equal(parsed.masks[0].blockSize, 18);
});

test("parseProject rejects unsupported project content", () => {
  assert.throws(
    () => parseProject(JSON.stringify({ version: 99 })),
    /Unsupported .msc project/,
  );
});

