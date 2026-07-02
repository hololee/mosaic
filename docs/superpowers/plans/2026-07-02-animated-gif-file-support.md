# Animated GIF File Support Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add animated GIF support for file dialog open, drag-and-drop open, preview, and animated GIF export.

**Architecture:** Extend the existing file/image pipeline instead of adding a separate document type. The main process accepts `.gif` files and saves GIF export data; the renderer owns GIF decode, preview frame scheduling, per-frame mask rendering, and GIF encode.

**Tech Stack:** Electron, plain renderer JavaScript modules, Canvas 2D API, Node test runner, lightweight GIF decode/encode packages.

---

### Task 1: Tests And Metadata

**Files:**
- Modify: `test/main-menu.test.js`
- Modify: `test/renderer-interaction.test.js`
- Modify: `test/readme.test.js`
- Modify: `test/package-metadata.test.js`
- Modify: `package.json`
- Modify: `package-lock.json`

- [ ] Add failing tests that assert GIF file filters, GIF MIME handling, renderer GIF decode/export wiring, and README support text.
- [ ] Add GIF decode/encode dependencies.
- [ ] Bump the app version for release.

### Task 2: Main Process GIF File Handling

**Files:**
- Modify: `src/main/main.js`

- [ ] Add `.gif` to supported image extensions and dialog filters.
- [ ] Return `image/gif` for GIF data URLs.
- [ ] Add a GIF save filter and write `gifDataUrl` when the user selects a `.gif` export path.

### Task 3: Renderer GIF Preview And Export

**Files:**
- Modify: `src/renderer/app.js`

- [ ] Decode GIF data URLs into full-frame canvases and frame delays.
- [ ] Track whether the current document is static or animated.
- [ ] Drive preview redraws with GIF frame timing while preserving existing static-image behavior.
- [ ] Render mosaic masks against each GIF frame.
- [ ] Encode animated GIF export data and include it in the export payload.

### Task 4: Documentation, Verification, Release

**Files:**
- Modify: `README.md`

- [ ] Document GIF file open, drag-and-drop, and export behavior.
- [ ] Run `npm test`.
- [ ] Run the release build script.
- [ ] Commit the implementation.
- [ ] Publish release artifacts if local credentials and network access are available.
