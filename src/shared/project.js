const PROJECT_VERSION = 1;

export function createProject(source) {
  assertSource(source);

  return {
    version: PROJECT_VERSION,
    source: {
      dataUrl: source.dataUrl,
      width: source.width,
      height: source.height,
      name: source.name || "Untitled",
    },
    masks: [],
    settings: {
      blockSize: 24,
      exportQuality: 0.92,
    },
  };
}

export function serializeProject(project) {
  validateProject(project);
  return `${JSON.stringify(project, null, 2)}\n`;
}

export function parseProject(content) {
  let parsed;

  try {
    parsed = JSON.parse(content);
  } catch (error) {
    throw new Error("Unsupported .msc project: invalid JSON");
  }

  validateProject(parsed);
  return parsed;
}

export function validateProject(project) {
  if (!project || project.version !== PROJECT_VERSION) {
    throw new Error("Unsupported .msc project: incompatible version");
  }

  assertSource(project.source);

  if (!Array.isArray(project.masks)) {
    throw new Error("Unsupported .msc project: masks must be an array");
  }

  if (!project.settings || typeof project.settings !== "object") {
    throw new Error("Unsupported .msc project: missing settings");
  }
}

function assertSource(source) {
  if (!source || typeof source !== "object") {
    throw new Error("Unsupported .msc project: missing source");
  }

  if (!isDataUrl(source.dataUrl)) {
    throw new Error("Unsupported .msc project: missing source image");
  }

  if (!Number.isFinite(source.width) || source.width <= 0) {
    throw new Error("Unsupported .msc project: invalid source width");
  }

  if (!Number.isFinite(source.height) || source.height <= 0) {
    throw new Error("Unsupported .msc project: invalid source height");
  }
}

function isDataUrl(value) {
  return typeof value === "string" && value.startsWith("data:image/");
}

