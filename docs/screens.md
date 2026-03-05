# Uwazi Screens — Import CSV Feature

## Main Design
File: `/Users/juanmnl/Documents/Claude/figma/import_csv.pen`

## Rebrand Exploration
File: `/Users/juanmnl/Documents/Claude/uwazi_2026/import_csv_rebrand.pen`

All screens: 1440x900, `clip: true`, `fill: $bg-primary`

## Screen Index

| # | Name | ID | Layout |
|---|---|---|---|
| 1 | Import CSV - Empty State | `gndE9` | flexbox (vertical) |
| 2 | Import CSV - New Import Modal | `LjGDa` | absolute (none) |
| 3 | Import CSV - New Import Modal (Select) | `V9dgd` | absolute (none) |
| 4 | Import CSV - New Import Modal (Filled) | `tvhgo` | absolute (none) |
| 5 | Import CSV - List | `mAMpe` | flexbox (vertical) |
| 6 | Import CSV - Detail | `BF81N` | flexbox (vertical) |
| 7 | Import CSV - Detail (Uploading) | `eSfvY` | flexbox (vertical) |
| 8 | Import CSV - Detail (Processing) | `UvtaS` | flexbox (vertical) |
| 9 | Import CSV - Detail (Failed) | `Mtrlp` | flexbox (vertical) |
| 10 | Import CSV - Detail (Warnings) | `goOiO` | flexbox (vertical) |
| 11 | Import CSV - List (Selected) | `HtgFH` | flexbox (vertical) |

Note: Modal screens (2-4) use `layout: none` for overlay positioning. IDs are shared across both files.

## Screenshots
Directory: `/Users/juanmnl/Documents/Claude/uwazi_2026/images/screens/import_csv/`

| File | Screen |
|---|---|
| `001 Import CSV - Empty State.png` | Empty State |
| `002 Import CSV - New Import Modal.png` | New Import Modal |
| `003 Import CSV - New Import Modal (Select).png` | New Import Modal (Select) |
| `004 Import CSV - New Import Modal (Filled).png` | New Import Modal (Filled) |
| `005 Import CSV - Detail (Uploading).png` | Detail (Uploading) |
| `006 Import CSV - Detail (Processing).png` | Detail (Processing) |
| `007 Import CSV - Detail.png` | Detail (Completed) |
| `008 Import CSV - Detail (Warnings).png` | Detail (Warnings) |
| `009 Import CSV - Detail (Failed).png` | Detail (Failed) |
| `010 Import CSV - List.png` | List |
| `011 Import CSV - List (Selected).png` | List (Selected) |

## Shared Page Structure (all screens)
```
Screen (frame, 1440x900)
  Navbar (frame, fill_container x 64)
    navLeft (frame) — logo wordmark (100x24 in rebrand, icon+text in original)
    navRight (frame) — book-open icon + settings icon
  Body (frame, fill_container x fill_container)
    Sidebar (frame, 250 x fill_container)
      Metadata section label
      Metadata list (Templates, Metadata Extraction, Thesauri, Relationship Types)
      Tools section label (border-top divider)
      Tools list (Processes, Import CSV [active], Activity Log, Global CSS, Uploads)
    Main Content (frame, fill_container x fill_container)
      Content area
      Action Bar (bottom, 58px height)
```

## Screen-Specific Details

### 1. Empty State (`gndE9`)
- Breadcrumb + Import Card with table header + centered empty state
- Empty state: document icon (on Vellum circle) + "No CSVs yet" + descriptive text
- Action bar: "New Import" button

### 2. New Import Modal (`LjGDa`)
- Background: List screen (with data)
- Modal overlay: `#00000066` backdrop
- Dialog (`HT20z`, width 560): header + body (dropzone + template/language selects) + footer

### 3. New Import Modal - Select (`V9dgd`)
- Same as #2 but with dropdown open showing template options

### 4. New Import Modal - Filled (`tvhgo`)
- Same as #2 but with form fields populated

### 5. List (`mAMpe`)
- Breadcrumb + Import Card with tabs (Total imports, Processing, Completed, Failed)
- Dashboard stats bar (`#FCFAF8` in rebrand)
- Table with 5 rows: status badge, file, template, progress bar, entities, errors, date, View action
- Table header row (`#FCFAF8` in rebrand)
- Table footer: pagination

### 6. Detail (`BF81N`)
- Breadcrumb: Import CSV > cases.csv
- Status badge: COMPLETED
- Metadata row: template, created by, started, duration, source
- Stats cards (5): Entities Created, Rows Processed, Rows Failed, Thesauri Touched, Relationships
- Progress bar (full, green)
- Extraction Details section
- Action bar: "Back to list" (secondary) + "Delete Import" (danger)

### 7. Detail - Uploading (`eSfvY`)
- Upload stepper (Upload → Process → Complete)
- Stats cards (empty/placeholder)
- Progress bar (Carbon blue, animated)
- Action bar: "Back to list" + "Cancel Upload"

### 8. Detail - Processing (`UvtaS`)
- Same stepper, Process step active
- Stats populating (412 entities, 412 rows)
- Progress bar (Carbon blue, partial)
- Action bar: "Back to list" + "Cancel Import"

### 9. Detail - Failed (`Mtrlp`)
- Same structure as Detail but showing failed import state

### 10. Detail - Warnings (`goOiO`)
- Layout matches Failed: alert first → stats → progress → table
- COMPLETED WITH WARNINGS badge (amber)
- Amber warning alert banner (top of body)
- Stats cards including "Rows With Warnings" (amber border)
- Warnings table (12 rows with field/warning/action columns), clips at Detail Card
- Action bar: "Back to list" + "Accept & Continue" (green)

### 11. List - Selected (`HtgFH`)
- Same as List but with row selection active (checkbox filled)
- Action bar: tinted bg + "Delete" danger button + "Selected 1 of 5" text
