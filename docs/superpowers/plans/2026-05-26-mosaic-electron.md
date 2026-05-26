# Mosaic Electron Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a working Electron desktop mosaic editor with editable `.msc` projects and flattened image/clipboard export.

**Architecture:** Electron owns native menus, file dialogs, filesystem access, and clipboard integration. The renderer is a dependency-light web canvas app that owns editing state, mask geometry, undo/redo, and export rasterization. Shared pure modules hold project validation and mosaic rendering helpers so they can be tested with Node's built-in test runner.

**Tech Stack:** Electron, plain HTML/CSS/JavaScript ES modules, Node built-in test runner, Canvas 2D API.

---

## File Map

- `package.json`: scripts and Electron dependency.
- `src/main/main.js`: Electron lifecycle, menu, dialogs, file IO, clipboard IPC.
- `src/main/preload.js`: safe renderer API bridge.
- `src/shared/project.js`: `.msc` project creation, validation, and serialization helpers.
- `src/shared/mosaic.js`: pure mosaic block calculation helpers.
- `src/renderer/index.html`: app document shell.
- `src/renderer/styles.css`: app layout and canvas/editor styling.
- `src/renderer/app.js`: editor state, tools, canvas drawing, shortcuts, IPC handlers.
- `test/project.test.js`: project serialization tests.
- `test/mosaic.test.js`: mosaic helper tests.

## Tasks

- [x] Write product spec and implementation plan documents.
- [x] Initialize npm and Git project metadata.
- [x] Write failing tests for `.msc` project helpers and mosaic helper behavior.
- [x] Implement shared project and mosaic helpers.
- [x] Add Electron main process, preload bridge, and native menu shortcuts.
- [x] Add renderer UI, canvas, toolbar, tool state, and drawing behavior.
- [x] Wire open, save, save-as, export image, clipboard import, and clipboard export.
- [x] Run tests, run Electron smoke checks where possible, and commit by logical unit.
