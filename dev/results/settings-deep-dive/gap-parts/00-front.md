# Settings gap matrix: Uwazi vs the prototype

Phase 2 of the settings deep dive. Read only; no prototype code changed. 2026-10-04.

Inputs: `uwazi-settings-inventory.md` (Research), `prototype-settings-state.md` (QA, `playground` f4d0d5b5), `settings-architecture-review.md` (Review), `settings-ux-audit.md` (Design). Everything stays in `dev/results/settings-deep-dive/`.

## How to read the tables

One table per Uwazi settings page, one row per Uwazi field or action. Columns:

| Column | Values |
|---|---|
| Uwazi behaviour | short statement with the Uwazi repo file (from the inventory) |
| Prototype today | `works`, `partial`, `no-op`, `missing` (QA's words), then why. `B*`, `H*`, `M*` are Review findings, `QA n` / `Design n` are items in those reports |
| Target in prototype | `1:1`; `improved UX<n>` (Design's "Improvements beyond 1:1 parity", n = 1 to 12); `improved (Design: <finding>)`; `keep (proto-only)`; `drop`; `defer`. Deliberate departures from Uwazi (a Uwazi bug not worth copying) are said in the cell |
| Depends on | tags below |
| Size | S under about 1 h of coding, M 1 to 3 h, L over 3 h or a new component family. Counted with the foundation already in place |

UX1 search on lists and long editors, UX2 bulk selection with selection bar, UX3 CSV import and export (thesauri, translations), UX4 impact before delete, UX5 undo in the Beacon for child deletes, UX6 thesaurus editor as a tree, UX7 property-to-card link, UX8 untranslated-only and progress, UX9 keyboard reorder, UX10 rail grouped by task, UX11 last-saved line, UX12 phone rows and sheets instead of wide tables.

Depends-on tags:

| Tag | Meaning | Foundation dispatch |
|---|---|---|
| STORE | per-collection store (seed plus created/patched/deleted overlay, stable ids) | F1 (Review D1-generic) |
| D1a, D1b, D1c, D1d | domain stores: templates, relation types, languages and translations, singleton settings (Collection, Filters, Menu, Customisation, Uploads, Account) | T1, R1, L1/L2, C1 |
| DRAFT | edit-session hook with dirty guard, Save resets baseline, Cancel and rail/back/corpus-switch go through the guard | F2 (Review D2) |
| USAGE | usage query and guarded delete dialog showing counts | F3 (Review D3) |
| NOTIFY | one notify helper (success and error) plus append to an activity-log atom | F3 (Review D4) |
| PAT | pattern pass: `SettingsButton` ladder, `Modal` for the two hand-rolled dialogs, `RowActions`, list-page shell (search row, empty and loading states, selection bar) | F4 (Review D5, Design list pattern) |
| SCHEMA | only meaningful if a template's property list becomes the schema the entity form renders (Review B6 / D7) | T3 |
| PHONE | phone list rows or sheet instead of a wide table | phone pattern in F4, then per page |
| DATA | needs new seed or mock data, or a reader elsewhere in the app | per page |

Page tables: `g1` Account, Users & Groups, Dashboard, Collection, Menu; `g2` Pages, Data visualizations, Global CSS & JS, Uploads, Preserve, Import CSV, Activity log; `g3` Templates list, Template editor, Filters; `g4` Thesauri, Relationship types, Languages, Translations; `g5` Metadata extraction, Paragraph extraction, New Relationships Migration, Feature toggles and nav gating. Row counts: 423 rows over 22 page sections (S 289, M 116, L 18); New Relationships Migration has one recommendation line instead of rows.

## Decisions that block or shape the work (for Juan)

| # | Decision | Blocks | Research recommendation |
|---|---|---|---|
| 1 | **Template schema (D7).** Does a template's property list become the schema the entity edit form renders (Uwazi's model), or stay a display-level editor? | T3 and 22 SCHEMA rows; size of T1/T2 | Build display-level first (T1, T2). Decide before T3, which is 3 or more sessions across four corpora |
| 2 | Commit colour: ink everywhere or green on Save only; rail active state (vellum or warm); rail scope (all groups visible or one) | F4 (pattern pass), nav rows | Ink commit, `bg-warm` active, all groups visible (Design's recommendation) |
| 3 | Per-corpus or global rule for each settings domain (Review H4) | F1 | Settings is collection-level in Uwazi: global store per domain, seeded from the active corpus once; record the rule in CLAUDE.md |
| 4 | Account API keys: keep or drop (Uwazi has none); self-disable of 2FA (Uwazi has none) | Account | Drop self-disable. Keep API keys only if Juan wants them; if kept, show the full key once and confirm Revoke |
| 5 | Relationship type inverse name (Uwazi stores one `type`) | R1 | Drop; CLAUDE.md lists "no inverse labels" as a known gap |
| 6 | Relationship type delete while references use it: refuse (Uwazi) or reassign to `no_label` and delete (the Relationships panel modal today) | R1 | Refuse in Settings with the count; keep reassign inside the panel modal. One registry either way |
| 7 | Are CSV import and export for thesauri and translations in scope (UX3)? Uwazi has thesaurus CSV import only; translation import covers the System context only | P2, L2 | Thesaurus import yes (S to M); translations defer |
| 8 | Do installed languages and Translations edits change the live UI language pickers and `t()` strings (today fixed to EN/ES/FR/AR)? | L1, L2 | Settings drives the Translations grid and the language list only; leave the header picker on the four renditions |
| 9 | Preserve: keep the capture-sources list (not in Uwazi) below a token card, or drop | R2 | Drop the schedule and authentication editor; token card only |
| 10 | Global CSS: apply in the admin shell, or only in the Pages preview and the public preview; JS stored but not run | C1 | Preview only; never inject into the admin shell |
| 11 | Menu: one footer Save for the whole tree (Uwazi) instead of item-by-item | C2 | Whole tree, Uwazi's model |
| 12 | Extractors: does Accept write to the entity overlay; drop Reject, segmentation and min-characters (not in Uwazi) | X1 | Accept writes the overlay; drop the extras |
| 13 | Filters page keeps its Properties table (view over the template `filter` flags) or drops it | F5 | Keep as a read view over template flags, one source |
| 14 | Data visualizations (21 rows, 5 L, no prototype page) and New Relationships Migration | backlog | Defer Data visualizations; drop the migration page |
| 15 | Mock the current-password modal for user and account saves | P1 | Mock it; it is Uwazi's real flow |

## Prototype pages and actions Uwazi does not have

Each page section ends with its own "Prototype-only" table. The ones that change scope:

| Prototype element | Keep / drop | Why |
|---|---|---|
| Template property inline Required / Filter / Cards checkboxes, live card preview | keep | quick path; same store fields; preview becomes UX7 target |
| Filters Properties table and "Group" column | keep table as read view (decision 13); drop the empty Group column | one source for filter flags |
| Pages starter-template picker, component palette, copy-from-language, live preview, status column | keep | Uwazi has none; useful. Copy-from-language needs a confirm |
| Pages editable URL field | drop | Uwazi derives the slug |
| Thesauri item counts in the list | keep, derive from the store | list and editor disagree today (M5) |
| Relationship type `inverseName`, usage counts from seeds | drop inverse; derive counts from `referencesAtom` | decisions 5 and 6 |
| Uploads grid view, search, type filter | keep | Uwazi has none |
| Import CSV bulk delete of history, "Completed with warnings", created-entities table | keep first two; created-entities table only with real data | fabricated names must not look real |
| Activity log synthesised "Request" line | drop | fabricated data in an evidence product |
| Account API keys, self-disable 2FA, inline "Update password" | decisions 4; drop the other two | Uwazi has none |
| Dashboard Relationships card and recent activity table | keep, derive from stores | Uwazi has stats only; the Languages card is dropped |
| Menu Link/Group switch, `SAMPLE_SUBLINKS` | drop | fake data; Uwazi fixes the type by the Add button |
| Extractors Reject, Accept all, Find suggestions reseed | drop Reject; replace Accept all with Accept selected | not in Uwazi |
| Paragraph job editor segmentation settings and "Run extraction" | drop | Uwazi's PX has create and delete only |

## Build order

Rule used: each dispatch is about one Code session. "Rows" are gap rows closed. Foundation first, then pages in Juan's demo order where dependencies allow. Sizes inside a dispatch are the row sizes from the tables.

### Foundation (before any page work)

| ID | Dispatch | Closes | Notes |
|---|---|---|---|
| **F1** | Settings collection store helper (`createSettingsCollection`, plus a singleton variant for D1d) extracted from `atoms/thesauri.ts`; the per-corpus or global rule (decision 3) | STORE rows (87), Review B3, H1 | Port Users and Groups as the proof: ids not names for membership, derived member counts. Fix the three id generators (H1) |
| **F2** | Edit-session hook `useSettingsDraft` with dirty guard (`useRegisterDirtyForm`): dirty compared with the stored value, clears after Save, Cancel, back arrow, breadcrumb, mobile drill-out and corpus switch go through the guard | DRAFT rows (56), Review B1, H3 | Runs in parallel with F1 (different files) |
| **F3** | Usage queries and guarded delete (`utils/settingsUsage.ts`, `DeleteWithUsageDialog` on `Modal`) plus notify and activity log (`useSettingsNotify`, `activityLogAtom`, ids with sequence) | USAGE (23), NOTIFY (46), Review H2, M4 | After F1. Rewrite every delete message to say what the code does |
| **F4** | Pattern pass with Design: `SettingsButton` ladder mapping, the two hand-rolled dialogs onto `Modal`, `RowActions` everywhere, list-page shell (always-mounted search row, `EmptyState` with action, loading rows, selection action bar, hover row actions), phone list-row component | PAT (105), PHONE (27), Review M1 to M3, Design 4 to 7 | Needs decision 2 first. Visible on every page: show Juan Users, Templates and Thesauri before it spreads. Can overlap F3 |

### Demo pages, in order

| ID | Dispatch | Closes | Depends on | Needs SCHEMA decision |
|---|---|---|---|---|
| **T1** | **Templates**: template store that `libraryTypesAtom`, `corpusTypes` and `CreateRelationshipModal` also read; list (entity count, default star, bulk delete with USAGE guards, delete side effects on filters and other templates); editor save of name, colour, common rows, property list and flags; dirty guard; property panel on `Modal`; rename and colour reach Library types, cards and facets | Templates list 18 rows, Template editor display-level subset (about 30 rows), Review B4 | F1, F2, F3, F4 | No. Display-level only |
| **P2** | **Thesauri**: usage-guarded delete, duplicate and blank validation, group rules, search, move-to-group, long-list handling (2,443 values), tree editor (UX6), CSV import (decision 7), phone rows, divider fix, list count equals editor count | Thesauri 22 rows | F1 to F4 | One row (template property dialog lists live thesauri) overlaps T2 |
| **T2** | **Template property types and options** (display level): per-type option matrix as one constant, live pickers by id (thesauri, templates, relation types), thesaurus binding write, same-label table, priority sorting, property search, keyboard reorder, card link (UX7), phone rows, add-thesaurus and add-relation-type modals | rest of Template editor rows that are not SCHEMA | T1, P2, R1 | No |
| **P1** | **Users & Groups and Account**: write-back, search and role/group filters, bulk selection, delete guards (self, last admin, group members), mocked password modal, group membership by id, Account footer Save with real baseline, 2FA enable | Users 21 rows, Account 16 rows | F1 to F4 | No |
| **F5** | **Filters**: filter store, group CRUD with rules (no group in group), Cancel and Save baseline, rename and delete reconcile by template id, Library Type facet reads the store (L row) | Filters 18 rows | T1, D1d store from F1 | No |
| **R1** | **Relationship types**: one registry (`relationTypesAtom` through the code `ManageRelationTypesModal` uses), real usage counts from `referencesAtom`, refuse or reassign (decision 6), drop inverse (decision 5), editor from the item's data | Relationship types 15 rows | F1 to F4 | No |
| **C1** | **Collection and Global CSS**: singleton store; every Uwazi field (site name, home page, default view, public instance, date format, map, analytics, contact emails, cookie policy, theming fields); readers: navbar crumb and login read the name, Library reads the default view, date format reaches date display; CSS applied in previews only (decision 10) | Collection 23 rows, Global CSS 13 rows | F1, F2, F4 | 1 row (Non-latin characters toggle) |
| **L1** | **Languages**: languages store keyed by `atoms/language.ts` codes; install with task progress in the Beacon, default with confirm, reset with confirmation word, uninstall guard (default, installing, content in that language) | Languages 15 rows | F1 to F4 | No |
| **L2** | **Translations**: contexts derived from templates, thesauri, menu and filters, per-key edit across installed languages with write-back, search and untranslated-only (UX8), per-context Save with dirty guard; import and export per decision 7 | Translations 20 rows | L1, T1, P2 | 1 row (template property labels as keys) |

### Next, lower demo priority

| ID | Dispatch | Closes | Depends on |
|---|---|---|---|
| **C2** | Menu (parent ids, whole-tree Save, reorder, navbar reads it, translation context) plus Pages list store (title and slug from the document, no orphan row on Cancel, delete checks menu links) plus Uploads (file picker mock, delete checks references, real rename) | Menu 17, Pages 21, Uploads 13 rows | F1 to F4, C1 |
| **A1** | Activity log and Dashboard: both read the activity atom from F3; date range, export, pagination; real request fields instead of the fabricated line; dashboard cards derived from stores | Activity log 19, Dashboard 9 rows | F3 |
| **N1** | Navigation: rail grouped by task (UX10), active state, role switcher and role gating, extraction items behind a feature flag | Feature toggles and nav gating 19 rows | F4, decision 2 |
| **X1** | Metadata extraction and Paragraph extraction (store, Accept writes the overlay, PX create and delete only) | 28 + 20 rows | F1 to F4, T1 |
| **R2** | Preserve (token card), Import CSV review | 9 + 17 rows | decisions 9 |
| Backlog | Data visualizations (21 rows, 5 L; no prototype page), New Relationships Migration (drop) | | decision 14 |

### Needs the template-schema decision (T3, 3 or more sessions)

Do not start until decision 1 is made. 22 rows:

- Template editor, 14 rows: Title options (generated ID), Remove properties (entities lose values impact), Property type select (shared 16-type vocabulary, L), Text/Rich text/Numeric, the four date types, Multiple select, Relationship with inherit property (L), Link, Image/Preview/Media, Geolocation, Generated ID, Hide label, Required, Rename effects (property rename migrating values).
- Other pages, 8 rows: Collection "Non-latin characters" toggle (rewrites property names); Pages entity-view toggle (L); Thesauri propagation to the template property dialog and library filters; Translations template context keys; Preserve first-token template and thesaurus creation; Import CSV header rules (L); Data visualizations filters and dimensions (2 L).

What T3 needs from earlier dispatches: T1 and T2 already store type config by property id with one vocabulary, so T3 is the entity form reading it (Review B6: form fields built from the template, CEJIL adapter stops flattening `multiselect`, `multidate`, `daterange`).

### Parallelism and conflicts

- F1 and F2 touch different files and can run together. F3 follows F1. F4 touches every page's chrome, so run it before the page dispatches or on a branch that pages rebase onto.
- T1 and T2 both change `TemplateEditor`; run T1 then T2. P2 can run beside T1. R1 can run beside P1.
- F5 needs T1 (template ids). L2 needs L1 and T1.
- Each page dispatch should end with the QA check QA proposed: edit, Save, leave, return, and the template to Library propagation check.

---

# Page tables
