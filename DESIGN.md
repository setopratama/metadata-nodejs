# Design System

## Philosophy
- Industrial minimalism.
- Functional first.
- No decorative noise.
- Sharp edges, clean hierarchy, document-like feel.

## Core Visual Rules
- No rounded corners unless unavoidable.
- Use warm monochrome stone palette.
- Use uppercase labels with wide letter spacing.
- Keep borders visible and subtle.
- Prefer low-shadow or no-shadow surfaces.
- Use monospace for IDs, invoices, currency, bank data, and numeric tables.

## Color System
### Base
- `stone-50` / `#fafaf9` for app background.
- `white` for cards and surfaces.
- `stone-900` / `#1c1917` for primary text and primary actions.
- `stone-200` / `#e7e5e4` for borders.
- `stone-400` / `#a8a29e` and `stone-500` / `#78716c` for secondary text.

### Semantic Colors
- `emerald-*` for paid/success states.
- `blue-*` for sent/info states.
- `red-*` for overdue/destructive states.
- Keep semantic color use minimal.

## Typography
### Fonts
- `Inter` for body, headings, UI text.
- `IBM Plex Mono` for numbers and technical data.

### Usage
- Page titles: large, bold, uppercase, tight tracking.
- Section labels: small, bold, uppercase, wide tracking.
- Table headers: very small, bold, uppercase, wide tracking.
- Numbers and invoice codes: monospace.

## Spacing
- Page padding: `p-6 md:p-10`.
- Card padding: `p-6` or `p-8`.
- Major section gap: `gap-10`.
- Form label-to-field gap: `space-y-2`.
- Table cell padding: `px-6 py-4`.

## Component Patterns
### Card
- `bg-white border border-stone-200 shadow-sm`
- Sharp edges only.

### Button
- Primary: `bg-stone-900 text-white uppercase tracking-widest`
- Secondary: bordered, neutral, minimal hover state.
- Destructive: red hover/text only when needed.

### Input
- Underline style preferred.
- Full border only for search or special fields.
- Focus state: `border-stone-900`.

### Table
- Soft row hover.
- Neutral headers.
- Strong alignment for numeric columns.

### Badge
- Uppercase.
- Small font.
- Border-based styling.

## Layout
- Top navbar, left sidebar, scrollable main content.
- Sidebar is fixed-width and hidden on mobile.
- Use clean content sections separated by whitespace and borders.

## Invoice Preview
- Treat as print-first layout.
- Keep content clean for PDF export.
- Use dark ink-like text, light paper-like surfaces.
- Keep print output stable and predictable.

## Custom Utility
- `.font-mono-industrial` for `IBM Plex Mono`.

## Do / Don't
### Do
- Keep UI restrained.
- Use consistent stone palette.
- Prefer precise alignment and clear hierarchy.
- Keep forms and tables readable.

### Don't
- Add gradients.
- Add colorful decoration.
- Add large border radius.
- Use heavy shadows.
- Mix too many font styles.