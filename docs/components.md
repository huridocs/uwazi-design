# Uwazi UI Components

No formal reusable components in the .pen file — all built inline.
These are the recurring patterns extracted from the screens.

## Navbar
- Height: 64px, fill: `$bg-surface`, border-bottom: `$border-primary` 1px
- Padding: `[0, 20]`, justify: `space_between`, align: center
- Left: hamburger icon (lucide `menu`, 20x20) + "UWAZI" (Roboto Mono, 16px, bold)
- Right: `book-open` (24x24) + `settings` (24x24), gap 12px
- Left gap: 16px

## Sidebar
- Width: 250px, height: fill_container
- Fill: `$bg-surface`, border-right: `$border-primary` 1px
- Padding: `[16, 12, 40, 12]`, gap: 16px, layout: vertical

### Sidebar Section
- Section label: Inter 14px weight 500, fill `$text-tertiary`
- List gap: 6px
- Item: frame, padding 8px, width fill_container
- Item text: Inter 14px weight 500, fill `$text-primary`
- Active item: cornerRadius 6, fill `#EBE9F7`, text fill `$accent-primary`
- Tools section: border-top `$border-primary` 1px, padding-top 20px

### Sidebar Menu Items
**Metadata**: Templates, Metadata Extraction, Thesauri, Relationship Types
**Tools**: Processes, Import CSV, Activity Log, Global CSS, Uploads

## Action Bar
- Height: 58px, fill: `$bg-surface`, border-top: `$border-primary` 1px
- Padding: `[0, 20]`, align: center
- Variants:
  - **Default**: Single CTA button (right-aligned implied)
  - **Detail**: Back button (left) + Delete button (right), justify `space_between`
  - **Selection**: Fill `#EEF2FF`, Delete button + "Selected X of Y" text, gap 16px

## Buttons

### Primary Button (CTA)
- Fill: `$accent-primary`, cornerRadius: 8
- Padding: `[8, 20]`, justify: center, align: center
- Text: Inter 14px weight 500, fill `#FFFFFF`
- Optional icon: 16x16, fill `#FFFFFF`, gap 8

### Secondary Button
- No fill, stroke: `#E5E7EB` 1px, cornerRadius: 8
- Padding: `[8, 20]`, justify: center, align: center
- Text: Inter 14px weight 500, fill `#1F2A37`
- Optional icon: 16x16, fill `#1F2A37`, gap 8

### Danger Button
- Fill: `#C81E1E`, cornerRadius: 8
- Padding: `[8, 20]`, justify: center, align: center
- Text: Inter 14px weight 500, fill `#FFFFFF`
- Optional icon (trash-2): 16x16, fill `#FFFFFF`, gap 8

### Small Danger Button (selection bar)
- Fill: `#C81E1E`, cornerRadius: 8
- Padding: `[8, 12]`
- Text: Inter 12px weight 500, fill `#FFFFFF`

## Card
- Fill: `$bg-surface`, cornerRadius: 8
- Shadow (single): `blur: 3, color: #0000001A, offset: {0, 1}`
- Shadow (double): above + `blur: 2, color: #0000001A, offset: {0, 1}, spread: -1`
- Layout: vertical, width/height: fill_container

## Modal / Dialog
- Overlay: frame, fill `#00000066`, width 1440, height 900, justify center, align center
- Dialog: fill `$bg-surface`, cornerRadius 12, width 560, clip true
- Shadow: `blur: 24, color: #00000033, offset: {0, 4}`
- Header: padding `[20, 24]`, border-bottom, justify `space_between`
  - Title: Inter 18px weight 600, fill `$text-primary`
  - Close: lucide `x`, 20x20, fill `$text-muted`
- Body: padding 24, gap 20, layout vertical
- Footer: padding 16, gap 16, border-top
  - Buttons: width `fill_container` each (cancel + confirm side by side)

## Dropzone (inside modal)
- Fill: `#F9FAFB` (original) / `#FCFAF8` (rebrand), cornerRadius: 12
- Stroke: `#D1D5DB` (original) / `#D4CDB8A3` (rebrand), 2px
- Height: 180px, width: fill_container
- Layout: vertical, justify center, align center, gap 12
- Icon: lucide `cloud-upload`, 36x36, fill `$accent-primary`
- Text: "Click to upload or drag and drop" + file size hint

## File Uploaded (inside modal, rebrand)
- Fill: `#FCFAF8`, cornerRadius: 12, stroke: `#E0D9C8A3` 1px
- Padding: 16, gap: 12
- Icon bg: 40x40, cornerRadius 8, fill `#E0D9C8`
- File icon: lucide `file`, 20x20, fill `#1A1A1A` (Ink)
- File name + size text, remove `x` icon

## Dropdown
- Fill: `$bg-surface`, cornerRadius: 8, clip true
- Stroke: `#E2E8F0` 1px
- Shadow: `blur: 12, color: #0000001A, offset: {0, 4}`
- Layout: vertical, width: 248px
- Option: frame, padding `[10, 12]`, width fill_container, align center
- Active option: fill `#EEF2FF`

## Table
- Inside a Card frame
- Header: padding 16, border-bottom, justify `space_between`
- Stats bar: fill `#F9FAFB` (original) / `#FCFAF8` (rebrand), padding `[12, 20]`, gap 24, border-bottom
- Rows: layout vertical, fill_container
- Footer: height 50, padding `[0, 20]`, border-top, justify `space_between`

## Breadcrumb
- Frame, gap 8, align center
- Active/link text: Inter 14px weight 500, fill `$accent-primary`
- Separator: lucide `chevron-right`, 16x16, fill `$text-muted`
- Current page: Inter 14px weight 500, fill `$text-tertiary`

## Status Badges (observed in table)
- COMPLETED: green tones
- PROCESSING: blue tones
- FAILED: red tones
- PENDING: gray tones
(Exact badge colors to be extracted from table row nodes if needed)
