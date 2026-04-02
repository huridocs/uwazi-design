# Import CSV — Product Requirements

## Overview

Bulk-import entities into Uwazi from CSV files. Aimed at admins and editors migrating data from external sources (spreadsheets, other databases, legacy systems) into a structured Uwazi collection.

Lives at **Settings > Tools > Import CSV** (`/settings/import-csv`).

## Problem

Uwazi users frequently need to ingest hundreds or thousands of entities at once — court cases, testimonies, incident reports. Creating these one-by-one through the UI is impractical. The current import flow is minimal: a single upload action with no visibility into progress, errors, or history.

## Goals

1. Give users confidence that their import is progressing and will complete correctly.
2. Surface errors and warnings *before* they corrupt data — let users fix issues at the CSV level.
3. Maintain a history of imports so users can audit, retry, or roll back.
4. Handle large files (10k+ rows) without blocking the UI.

## User Stories

**As an admin**, I want to upload a CSV and map it to a template so that entities are created with the correct metadata structure.

**As an admin**, I want to see real-time progress of my import so I know whether to wait or move on to other work.

**As an admin**, I want to see which rows failed and why so I can fix my CSV and re-import.

**As an admin**, I want to review warnings (e.g. missing thesaurus values) before accepting the import so I don't create incomplete entities.

**As an admin**, I want to manage past imports (view, delete) so I can keep my import history clean.

## Screens

| # | Screen | File | Purpose |
|---|--------|------|---------|
| 1 | Empty State | `gndE9` | First-time view, prompt to start |
| 2 | New Import Modal | `LjGDa` | Upload CSV, pick template + language |
| 3 | Modal (Select open) | `V9dgd` | Template selector dropdown |
| 4 | Modal (Filled) | `tvhgo` | File uploaded, template selected, ready to go |
| 5 | List | `mAMpe` | All imports with status, progress, date |
| 6 | Detail | `BF81N` | Completed import — stats and extraction details |
| 7 | Detail (Uploading) | `eSfvY` | Upload in progress — stepper + progress bar |
| 8 | Detail (Processing) | `UvtaS` | Server processing rows — live stat updates |
| 9 | Detail (Failed) | `Mtrlp` | Import failed — error info + retry path |
| 10 | Detail (Warnings) | `goOiO` | Completed with warnings — review table |
| 11 | List (Selected) | `HtgFH` | Bulk selection for deletion |
| 12 | Detail (Warnings & Errors) | `fO0qX` | Mixed warnings + errors — review + download |

## Flow

```
Empty State
  └─ "New Import" → Modal
       ├─ Upload CSV (drag-and-drop or click)
       ├─ Select template (searchable dropdown)
       ├─ Select language
       └─ "Start Import" → Detail (Uploading)
              └─ Upload complete → Detail (Processing)
                     ├─ Success → Detail (Completed)
                     ├─ Partial → Detail (Warnings) or Detail (Warnings & Errors)
                     └─ Failure → Detail (Failed)

List view always accessible via breadcrumb.
```

## Import States

| State | Badge | Progress Bar | Actions |
|-------|-------|-------------|---------|
| Uploading | — | Blue, animated | Cancel Upload |
| Processing | PROCESSING | Blue, partial | Cancel Import |
| Completed | COMPLETED | Green, full | Delete Import |
| Warnings | COMPLETED WITH WARNINGS | Green, full | Accept & Continue, Download warnings |
| Errors | COMPLETED WITH ERRORS | Red/amber, partial | Accept warnings, Download issues |
| Failed | FAILED | Red, partial | Delete Import |
| Pending | PENDING | Empty | — |

## Detail Stats

Five stat cards appear on every detail screen:

| Stat | Color | Description |
|------|-------|-------------|
| Entities Created | Default (ink) | Successfully created entities |
| Rows Processed | Default | Total rows the server has read |
| Rows Failed | Red border | Rows that errored out |
| Rows With Warnings | Amber border | Rows with non-fatal issues |
| Relationships | Default | Auto-created relationship connections |

## CSV Requirements

- **Required column**: `title` (entity title)
- **Multi-value delimiter**: pipe `|` (e.g. `tag1|tag2|tag3`)
- **Multilingual**: `property__lang` suffix (e.g. `title__en`, `title__es`)
- **Dates**: ISO 8601 or `MM/DD/YYYY`
- **Relationships**: Target entity title or ID
- **Geolocation**: `lat|lon` format
- **Max file size**: 50 MB (shown in dropzone hint)

## Warning & Error Handling

**Warnings** (non-fatal, entity still created):
- Thesaurus value not found — entity created, property left empty
- Date format ambiguous — best-guess parse applied
- Relationship target not found — connection skipped

**Errors** (fatal, row skipped):
- Required property missing
- Data type mismatch (text in numeric field)
- Duplicate entity (if dedup enabled)

Users can:
- Review warnings/errors in-screen via a paginated table
- Download a CSV of problem rows for offline fixing
- Accept warnings to finalize the import
- Re-upload a corrected CSV as a new import

## List View

- Dashboard stats bar: Total imports, Processing, Completed, Failed
- Table columns: Status badge, File, Template, Progress, Entities, Errors, Date, Action
- Pagination (full variant with page buttons)
- Row selection with bulk delete

## Technical Notes

- Import runs as a background job (queue-based, non-blocking)
- Progress updates via polling or WebSocket
- Import metadata stored in MongoDB (not the entity collection)
- CSV parsing happens server-side (Node.js stream for large files)
- Uploaded CSV stored in Minio, referenced by import record
- Deleting an import removes the record but does NOT delete created entities

## Out of Scope

- Column mapping UI (CSV columns must match template property names exactly)
- CSV preview / data table before import
- Import scheduling / recurring imports
- ZIP file support (handled by separate upload flow)
- Undo / rollback of created entities
