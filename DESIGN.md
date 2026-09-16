# Design System

## Philosophy
- Industrial minimalism.
- Functional first.
- No decorative noise.
- Sharp edges, clean hierarchy, document-like feel.

## Core Visual Rules
- No rounded corners (`border-radius: 0`) unless unavoidable.
- Use warm monochrome stone palette.
- Use uppercase labels with wide letter spacing (`tracking-widest`).
- Keep borders visible and subtle (`border-stone-200` / `#e7e5e4`).
- Prefer low-shadow or no-shadow surfaces (`shadow-none` / `shadow-sm`).
- Use monospace for IDs, dimensions, file paths, parameters, coordinates, and numeric tables.

## Color System
### Base
- `stone-50` / `#fafaf9` for app background.
- `white` / `#ffffff` for cards and surfaces.
- `stone-900` / `#1c1917` for primary text and primary actions.
- `stone-200` / `#e7e5e4` for borders.
- `stone-400` / `#a8a29e` and `stone-500` / `#78716c` for secondary text.

### Semantic Colors
- `emerald-*` (`#10b981` / `#059669`) for success states and ready status.
- `blue-*` (`#3b82f6` / `#2563eb`) for info states, export actions, and vector badges.
- `amber-*` (`#f59e0b` / `#d97706`) for warnings and skipped items.
- `red-*` (`#ef4444` / `#dc2626`) for error states, failed items, and strip actions.
- Keep semantic color use minimal and functional.

## Typography
### Fonts
- `Inter` for body, headings, UI text.
- `IBM Plex Mono` for numbers, code, metadata tokens, file names, and technical data.

### Usage
- Page titles: large, bold, uppercase, tight tracking.
- Section labels: small, bold, uppercase, wide tracking (`text-xs font-bold uppercase tracking-wider`).
- Table headers: very small, bold, uppercase, wide tracking (`text-xs font-semibold uppercase text-stone-500`).
- Numbers and technical data: monospace (`font-mono-industrial`).

## Spacing
- Page padding: `p-6 md:p-10`.
- Card padding: `p-4`, `p-6` or `p-8`.
- Major section gap: `gap-6` to `gap-10`.
- Form label-to-field gap: `space-y-2`.
- Table cell padding: `px-4 py-3` / `px-6 py-4`.

## Component Patterns
### Card
- `bg-white border border-stone-200 shadow-none`
- Sharp edges only (`border-radius: 0`).

### Button
- Primary: `bg-stone-900 text-white uppercase tracking-wider hover:bg-stone-800`
- Secondary / Outline: bordered, neutral (`border border-stone-300 text-stone-700 hover:bg-stone-100`), minimal hover state.
- Special Action (Export / Vector): `bg-stone-800 text-white border border-stone-700` with subtle accent indicator.
- Destructive: `border border-red-200 text-red-700 hover:bg-red-50` only when needed.

### Input & Select
- Form input: `border border-stone-300 bg-white text-stone-900 focus:border-stone-900 focus:ring-0 text-sm`.
- Monospace textarea: `font-mono-industrial text-xs leading-relaxed`.
- Range Slider: crisp industrial track with precise numeric badges.

### Table
- Soft row hover (`hover:bg-stone-50`).
- Neutral sticky headers.
- Strong alignment for numeric and status columns.

### Badge & Status Indicator
- Format Badges: `.badge-jpg`, `.badge-png`, `.badge-svg`, `.badge-eps` (monochrome/subtle border, uppercase, monospace, sharp edges).
- Process Status: `READY`, `SKIPPED`, `SUCCESS`, `FAILED` with bordered badge styling.
- Live Parameter Badge (`.vector-badge`): compact mono chips showing active vector profile and settings summary.

### Modal & Dialog
- High-contrast modal overlay (`bg-stone-900/60 backdrop-blur-none` or subtle blur).
- Modal box: `bg-white border-2 border-stone-900 max-w-2xl w-full p-6 shadow-2xl sharp-edges`.
- Dual-column parameter controls for vector tracing: presets (Microstock, Flat, Pixel, Photo, B&W), layer structure (Cutout/Stacked), sliders (Simplify, Max Colors, Speckle).

### Docked Terminal / Activity Console
- Fixed bottom or dedicated pane with toggle drawer.
- Dark stone background (`bg-stone-950 text-stone-100 font-mono-industrial`).
- Clear timestamped logs with colored operation tags (`[AUTO]`, `[RENAME]`, `[VECTOR]`, `[JPEG]`, `[STRIP]`).

## Metadata & File Preview
- Treat as document/archive layout with high readability.
- Visual diff format: old name `->` new name with distinct status badges.
- Dual layout mode: Comparative Data Table and Photo Gallery Card Grid (supporting SVG vector rendering & JPEG/PNG thumbnails).
- Detailed Inspection Modal: complete EXIF, IPTC, Adobe XMP Dublin Core, SVG/EPS BoundingBox, and quick single-file export actions.

## Custom Utility
- `.font-mono-industrial` for `IBM Plex Mono`.
- `.sharp-edges` for zero border-radius enforcement.

## Do / Don't
### Do
- Keep UI restrained and functional.
- Use consistent warm stone palette.
- Prefer precise alignment and clear hierarchy.
- Keep forms, tables, and modal dialogs readable and dense.

### Don't
- Add colorful rainbow gradients.
- Add decorative animations or noise.
- Add large border radii (pill buttons, rounded cards).
- Use heavy, blurry drop-shadows.
- Mix unrelated font styles.