# Uwazi Brand Colors — Future/Alternative Theme

Status: **Explored** in `import_csv_rebrand.pen` — not applied to main design file.

## Palette

| Name | Hex | Role |
|---|---|---|
| Seal | `#E8432A` | The stamp — marks, alerts, actions |
| Carbon | `#00B4F0` | The copy — links, data, marks |
| Ink | `#1A1A1A` | The letterpress — text, headers |
| Vellum | `#F5EED7` | Warm stock — nav hover, empty state icon circle, pending badge |
| Parchment | `#F5F0E8` | Cool stock — page grounds |
| Paper | `#FFFFFF` | The margin — cards, sidebar, modals, open space |

## Variable Mapping

| Variable | Value | Brand Color |
|---|---|---|
| `$accent-primary` | `#1A1A1A` | Ink — primary buttons, main actions |
| `$accent-blue` | `#00B4F0` | Carbon — secondary accent |
| `$bg-primary` | `#F5F0E8` | Parchment — page background |
| `$bg-surface` | `#FFFFFF` | Paper — cards, sidebar, modals |
| `$bg-muted` | `#F5EED7` | Vellum — muted backgrounds |
| `$border-primary` | `#E0D9C8` | Warm neutral border |
| `$text-primary` | `#1A1A1A` | Ink |
| `$text-secondary` | `#333333` | Ink (lighter) |
| `$text-tertiary` | `#6B6B6B` | Warm gray |
| `$text-muted` | `#9A9A9A` | Warm gray (lighter) |

## Accent Usage

**Seal (`#E8432A`):**
- Delete/danger buttons
- Failed error counts & stat values
- FAILED badge text

**Carbon (`#00B4F0`):**
- Breadcrumb links
- Processing stat values
- PROCESSING badge text
- Progress bars (uploading/processing states)

**Ink (`#1A1A1A`):**
- Primary CTA buttons (fill)
- All headings and body text
- Sidebar active item text (on Vellum bg)
- Cancel/secondary action buttons
- "View" table action button text
- File uploaded icon
- Empty state document icon

**Vellum (`#F5EED7`):**
- Sidebar nav active/hover background
- Empty state icon background circle
- PENDING badge background

**Parchment (`#F5F0E8`):**
- Page background

**Parchment Light (`#FCFAF8` — HSL lightness ~98%, derived from Parchment):**
- Table header rows
- Dashboard stats bar
- Table footer rows
- Dropzone background
- Search input background
- File uploaded area background
- Selected row highlight

## Derived Colors (hardcoded)

| Hex | Usage |
|---|---|
| `#FCFAF8` | Light warm bg — headers, stats bars, footers, dropzone, search, file uploaded |
| `#E0D9C8A3` | Border primary at 64% opacity |
| `#D4CDB8A3` | Secondary borders at 64% opacity (checkboxes, dropzone stroke, pagination) |
| `#F0EDED` | Selection action bar bg, pagination active |
| `#333333` | Text secondary |
| `#6B6B6B` | Text tertiary |
| `#9A9A9A` | Text muted |
| `#00000066` | Modal overlay |
| `#DDF3FD` | Processing badge bg (Carbon tint) |

## Design Decisions
- Ink is primary, not Seal — keeps the UI calm and editorial
- Sidebar active state: Ink text on Vellum bg (no color accent, bg alone signals state)
- Seal and Carbon are used sparingly as semantic accents, not primary UI chrome
- Amber/yellow warning colors kept as semantic (not rebranded)
- Green success colors kept as semantic (not rebranded)
- New logo (nu-logo.png) replaces old icon+text — 100x24 wordmark with Seal/Carbon marks built in
- Light backgrounds use solid `#FCFAF8` (Parchment at HSL ~98% lightness) instead of opacity — no transparency
- Borders use 64% opacity (`A3` suffix) for softness while remaining functional
- Warning detail layout matches Failed layout: alert first → stats → progress → table
- Detail cards use `clip: true` — tables grow naturally and clip at card boundary
