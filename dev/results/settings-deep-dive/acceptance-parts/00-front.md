# Settings acceptance checklist

Goal this checklist decides: every Settings page and action is at least 1:1 with current Uwazi (`production` v1.229.224), and improved where possible. A page passes when every in-scope check below passes on `playground` at the commit under test, on desktop and phone.

Inputs: `gap-matrix.md` (rows; ids in `gap-matrix-row-ids.md`), `page-briefs.md` (verbatim copy, validation, sequences; Decisions G1 to G15 and S1 to S5 as adopted by Operator), `template-schema-spec.md` (migration steps M1 to M9), `settings-ux-audit.md` (UX1 to UX12). Written 2026-10-04. Read only; nothing was run.

## How to read a check

| Column | Meaning |
|---|---|
| Id | `<PAGE>-<nn>` unique in this file |
| Tag | `[1:1]` matches Uwazi. `[UX n]` is a Design improvement layered on top (UX1 search, UX2 bulk selection, UX3 CSV, UX4 impact before delete, UX5 undo in the Beacon, UX6 thesaurus tree, UX7 property-to-card link, UX8 untranslated-only, UX9 keyboard reorder, UX10 rail grouping, UX11 last-saved line, UX12 phone rows and sheets). `[PO]` is a prototype-only element that Decisions keep |
| GM | gap-matrix row id: page code plus the 1-based position of the row in that page's main table (`gap-matrix-row-ids.md`). `X-nn` rows are the cross-cutting checks below |
| Pre → Action → Expect | precondition, steps a QA agent can drive in a browser, and the observable result. Quoted text is verbatim Uwazi English from `page-briefs.md` |
| Needs | `—` = testable now. `M<n>` = needs that step of the template-schema migration (`template-schema-spec.md` section 7) to have landed. `F<n>` = needs that foundation dispatch (`gap-matrix.md` build order). A check with a Needs entry is skipped, not failed, until that step lands |

Page codes: ACC Account, USR Users & Groups, DSH Dashboard, COL Collection, CSS Global CSS & JS, MEN Menu, PAG Pages, UPL Uploads, PRV Preserve, CSV Import CSV, ACT Activity log, TPL Templates list, TED Template editor and property dialog, FLT Filters, THS Thesauri, REL Relationship types, LNG Languages, TRN Translations, IXE Metadata extraction, PXE Paragraph extraction, NAV navigation and role gating.

Template-schema steps in short: M1 template types, store and seeds (read only); M2 blank forms from the template; M3a records for CEJIL and Travesía read the template; M3b typed editors and value writes; M4 Sample and Artworks onto templates; M5 cards from `showInCard`; M6 list columns by property name; M7 library filters from `filter` / `defaultfilter`; M8 Settings › Templates on the store; M9 cleanup.

## Test setup

- Dev server on the reserved port; open the app, then Settings (Tools menu or the Settings entry). Data source "Sample" unless a check names another. Settings content is per data source (G3); users, groups and the account are global.
- Viewports: desktop 1280×800, phone 390×844 with touch. Light mode; repeat the pages marked in X-08 in dark mode.
- Start each page's checks from clean state: Settings › Dashboard › "Reset demo data" (clears every settings store). Settings stores persist in sessionStorage, so "survives reload" means reload the tab, not close it.
- Console must show no errors during any check. `window.__gutter()` must report no violations on Settings panes.
- Notifications appear in the Beacon list (not as toasts): open the Beacon drawer to read them. Success text is quoted in each check.

## X: cross-cutting checks (apply to every page that has the element)

Each page's own section says which X checks apply and adds the page-specific ones. A page cannot pass with an X check failing on it.

| Id | Tag | Pre → Action → Expect | Needs |
|---|---|---|---|
| X-01 | [1:1] | Persistence. Edit a record on any list/editor page, Save → click another rail item → come back → the saved value is shown. Reload the tab → still shown. "Reset demo data" brings the seed back | F1 |
| X-02 | [UX editor pattern] | Dirty guard. Open an editor or form page, change a field, then click a rail item, the back arrow, the breadcrumb, the mobile back chevron, a navbar link, or switch the data source → the "Discard changes?" dialog opens with body "You have unsaved changes. Do you want to continue?" and buttons "Cancel" and "Discard changes". Cancel keeps the edit and the page; "Discard changes" navigates and the edit is gone on return. With no change, no dialog | F2 |
| X-03 | [UX editor pattern] | Save resets the baseline. After a successful Save the Save button is disabled (or the form reads clean) and a rail click shows no dialog. Editing again re-enables it | F2 |
| X-04 | [1:1] | Notifications. Every Save, delete and action adds one entry to the Beacon list with the page's quoted text; a failure adds one error entry with title "An error occurred" (never two for the same failure) | F3 |
| X-05 | [UX 4] | Guarded delete. Deleting an object that something uses opens the delete dialog with usage counts (for example "Used by 412 entities") and either blocks the delete with the Uwazi reason or states what will change. Deleting an unused object states that nothing else changes | F3 |
| X-06 | [UX 12] | Phone 390×844. The page has no horizontal scroll that hides row actions; list pages show rows (name, key facts, actions) instead of a wide table; editors are single column; dialogs are sheets or full screen; every action reachable by touch | F4 |
| X-07 | [1:1] | Accessibility. axe-core on the page and on every dialog opened: no serious or critical violations. Dialogs trap focus, restore focus to the opener on close, name themselves (`role="dialog"`, accessible name), close on Escape only the top layer. Row buttons have unique accessible names. Every input has a label | F4 |
| X-08 | [1:1] | Dark mode. Status pills and badges (Default, role, status) meet contrast 4.5:1 in light and dark | F4 |
| X-09 | [1:1] | Activity log. Each Save, create, delete and bulk action appears on Activity log with an Uwazi-style description (for example "Deleted template") and the acting user | F3 |
| X-10 | [1:1] | Empty state. A list with zero rows shows a title naming the object, a one-line hint and the create action (for example "No thesauri yet" with an "Add thesaurus" action), not the generic "Nothing here yet." | F4 |
| X-11 | [UX 1] | Search row. List pages have a search field in a row that stays mounted at a fixed height; typing filters rows; clearing restores them | F4 |
| X-12 | [UX 2] | Selection bar. Selecting rows replaces the lead action in the footer with a fixed-width "Selected n of total" and the bulk actions; clearing selection restores the lead action. No tint, no border | F4 |
| X-13 | [1:1] | Corpus scope. Content pages (Templates, Thesauri, Relationship types, Filters, Menu, Pages, Translations, Languages) show the active data source's records; switching the data source switches the list; users, groups and the account do not change | F1 |

---
