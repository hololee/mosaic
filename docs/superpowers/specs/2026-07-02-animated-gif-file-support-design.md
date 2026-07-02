# Animated GIF File Support Design

## Goal

Add animated GIF support for file-based workflows: open from the file dialog, open by drag-and-drop, preview with fixed-position masks, and export an animated GIF with the same mask geometry applied to every frame.

## Scope

- Support `.gif` in the open dialog and drag-and-drop path.
- Decode animated GIF files in the renderer so the editor can preview frame animation.
- Keep mask geometry fixed across frames. Per-frame mask tracking is out of scope.
- Add an animated GIF export path alongside the existing PNG/JPG export.
- Preserve existing `.msc`, PNG, JPG, WebP, and clipboard behavior.

## Non-Goals

- Animated GIF clipboard import/export.
- Per-frame mask editing, keyframes, motion tracking, or timeline UI.
- Audio/video formats.
- Palette-perfect GIF preservation. Export may re-encode frames with a generated palette.

## Architecture

Main process file handling treats `.gif` as a supported image extension and passes the source bytes as a data URL, matching the existing image path. The renderer detects GIF data URLs, decodes the frames, composites them into full-frame canvases, and uses a timer-driven render loop for preview. Static images continue to use the existing `Image` path.

Export remains renderer-owned. PNG/JPG exports render the current static composite, while GIF export renders each decoded frame through the existing mask pipeline and encodes the result as an animated GIF data URL. The main process save dialog gains a GIF filter and writes the GIF data when the selected path ends in `.gif`.

## Error Handling

If GIF decode or encode fails, the renderer reports a concise status message using the existing status bar path. If a GIF has no usable frames, loading fails with `Could not load GIF.` Existing unsupported-file errors remain unchanged.

## Testing

Tests cover `.gif` in file dialog filters, MIME detection, renderer GIF code paths, export payload wiring, and README documentation. Shared unit tests remain on Node's built-in test runner.
