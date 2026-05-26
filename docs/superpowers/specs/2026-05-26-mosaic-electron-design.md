# Mosaic Electron App Design

## Goal

Build a desktop Electron app that opens images from files or the clipboard, lets the user mark regions with rectangle, ellipse, lasso, brush, or eraser tools, applies mosaic rendering non-destructively, and saves either an editable `.msc` project or a flattened PNG/JPG export.

## Product Shape

The app opens to an empty canvas with a centered open affordance. Users can open an image from the app menu, toolbar, drag-and-drop, or paste an image from the clipboard. A macOS-style "New from Clipboard" command creates a new document from the clipboard image.

The top toolbar contains tool selection, undo/redo, mosaic block size, zoom controls, save, export, and clipboard export. The native menu bar exposes the same major actions with shortcuts.

## Shortcut Policy

General commands use `CmdOrCtrl`. Clipboard-special commands use `Alt/Option` to avoid existing Shift-based clipboard tool conflicts. `Save As` keeps the standard `CmdOrCtrl+Shift+S` shortcut.

- Open: `CmdOrCtrl+O`
- New from Clipboard: `CmdOrCtrl+Alt+V`
- Paste image: `CmdOrCtrl+V`
- Save `.msc`: `CmdOrCtrl+S`
- Save As `.msc`: `CmdOrCtrl+Shift+S`
- Export Image: `CmdOrCtrl+Shift+E`
- Export to Clipboard: `CmdOrCtrl+Alt+C`
- Undo/Redo: `CmdOrCtrl+Z`, `CmdOrCtrl+Shift+Z`
- Tools: `V`, `R`, `O`, `L`, `B`, `E`

## Project Format

The `.msc` file is a JSON project document:

- `version`: project format version
- `source`: original image data URL, width, height, and optional file name
- `masks`: ordered editable mask list
- `settings`: active mosaic block size and export quality

This keeps version 1 dependency-light while preserving the main promise: existing mosaic areas can be edited, deleted, strengthened, or restored by removing masks.

## Rendering Model

The renderer keeps the original image intact. A composite canvas draws the original image, then clips each mask path and applies a pixelated mosaic generated from the original pixels. Export flattens the composite result into PNG or JPG.

## Error Handling

The app shows concise status messages for unsupported files, empty clipboard reads, save failures, and export failures. Native dialogs handle file selection and overwrite confirmation.

## MVP Scope

- Electron app shell with native menu shortcuts
- Empty canvas open state
- File open, drag-and-drop, paste, and New from Clipboard
- Rectangle, ellipse, lasso, brush, eraser, selection, and basic move behavior
- Mosaic block size control
- Undo/redo for mask changes
- `.msc` save/open/save-as
- PNG/JPG export dialog
- Export flattened PNG to clipboard

