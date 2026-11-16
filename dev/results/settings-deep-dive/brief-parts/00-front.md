# Settings page briefs: what Code needs to match Uwazi 1:1

Read only. Research, 2026-10-04. Reference: `huridocs/uwazi` `production` v1.229.224 at `/Users/juanmnl/Developer/huridocs/uwazi-ref`. All cites are `uwazi-ref` repo-relative `path:line`. Strings are copied from the code or from `contents/ui-translations/en.csv`; `(unverified)` marks anything not confirmed in code.

Companion files in this folder: `uwazi-settings-inventory.md` (behaviour), `gap-matrix.md` (row-level gaps and the build order), `settings-ux-audit.md` (UX1 to UX12), `template-schema-spec.md` (template as schema), `prototype-settings-state.md`.

## How to use a brief

Each page section has the same eleven parts: screen map, fields, row and bulk actions, dialogs, empty/loading/error states, save sequence, dirty guard, sort/filter/search, propagation, improvements to layer on, and Uwazi defects not to copy. Build the 1:1 behaviour first (parts 1 to 9), then layer the improvements (part 10), then check the list in part 11 so a Uwazi defect is not copied. A "UX<n>" tag is a Design improvement from `settings-ux-audit.md` (1 search, 2 bulk selection, 3 CSV import/export, 4 impact before delete, 5 undo in the Beacon, 6 thesaurus tree, 7 property-to-card link, 8 untranslated-only, 9 keyboard reorder, 10 rail grouping, 11 last-saved line, 12 phone rows and sheets).

Already decided elsewhere and not repeated per page: settings stores per corpus for content and global for people (CLAUDE.md "Settings stores"); the template property list is the schema the entity form renders (Juan, `template-schema-spec.md`); the commit button is solid ink and the lead action is `BAR_LEAD` (see decision 2).

## Decisions

Resolving the 15 open questions in `gap-matrix.md` and the 5 in `template-schema-spec.md`. Operator adopts these unless Juan overrides. A recommendation is the answer to the question as asked.

### From gap-matrix.md

| # | Question | Recommendation | Reason |
|---|---|---|---|
| G1 | Does a template's property list become the entity form's schema? | Yes (already Juan's call). Build in the `template-schema-spec.md` order M1 to M9; the Settings editor is M8 | One vocabulary (Uwazi's types) removes B6 and makes every Template editor row buildable |
| G2 | Commit colour; rail active state; rail scope | Commit in ink (`COMMIT_FILL`), green nowhere; rail active `bg-warm text-ink`; all rail groups visible | Matches `Modal`, Figma's Dialog and CLAUDE.md ("Active sidebar item: `bg-warm text-ink`"); one rail removes the trip back to the navbar |
| G3 | Per-corpus or global store per settings domain | Content per corpus (templates, thesauri, relation types, filters, menu, pages, translations, languages); people global (users, groups, account) | Already written in CLAUDE.md "Settings stores" |
| G4 | Account API keys and self-disable of 2FA | Keep API keys as a prototype-only block (full key shown once, confirm on Revoke, real clipboard copy); drop the self-disable 2FA button | Keys are built and cheap; Uwazi has neither, so mark keys prototype-only in the handoff. Uwazi 2FA is turned off only by an admin reset |
| G5 | Relationship type inverse name | Drop it from Settings | Uwazi v2 stores one `type`; CLAUDE.md lists "no inverse relationship-type labels" as a known gap; nothing reads it |
| G6 | Delete a relationship type that references use | Settings refuses with the count (Uwazi); the Relationships panel's "Manage relationship types" modal keeps "reassign to no_label" and says so in its confirm | Settings matches Uwazi; the panel modal already exists and is the explicit migration path. Both go through the one registry |
| G7 | CSV import/export for thesauri and translations | Thesaurus value import: yes (Uwazi has it). Translations CSV: defer | Uwazi's Translations page has no import or export; only Reset (System context) |
| G8 | Do installed languages and Translations edits change the live language pickers and `t()` strings | No. Settings drives the language list and the Translations grid only | The header picker is tied to the four renditions (Review B7); revisit when UI strings come from the store |
| G9 | Preserve capture-sources list | Drop; token card only | Not in Uwazi; sources open blank today (QA). Preserve is not a demo page |
| G10 | Where custom CSS applies | Pages preview and public preview only; JS stored, never run; never injected into the admin shell | Injecting into the admin shell can break the app being demonstrated |
| G11 | Menu save model | One footer Save for the whole tree (Uwazi), with a dirty guard | Matches Uwazi and the shared editor pattern |
| G12 | Extractors: what Accept does; Reject, segmentation, min characters | Accept writes the entity overlay; drop Reject, segmentation and min-characters fields; replace "Accept all" with "Accept selected" | Not in Uwazi (its only accept-all is the Process modal's auto-accept); not a demo page |
| G13 | Filters Properties table | Keep as a read view over the template `filter` / `defaultfilter` flags; drop the empty Group column | One source of truth: the template flags |
| G14 | Data visualizations; New Relationships Migration | Defer Data visualizations (21 rows, 5 L); drop the migration page | Neither is a demo page; the migration page is a one-off admin tool behind a feature flag |
| G15 | Mock the current-password modal | Yes, on user create/edit, password change and bulk user actions | It is Uwazi's real flow (`Authorization: Basic`, 403 "Password error") |

### From template-schema-spec.md (section 9)

| # | Question | Recommendation | Reason |
|---|---|---|---|
| S1 | CEJIL flags: re-import from the dump, or keep heuristics | Keep the heuristic flags now; re-import when the dump is available | M3a should not wait; the flags are data, so replacing them later does not change code |
| S2 | Sample `bench` | Markdown text now | Seven judge entities do not exist; converting to a relationship later is a data change |
| S3 | Sample `country` on `e3` | Select bound to a new Countries thesaurus | Keeps the flag and needs no connections (the spec's recommendation) |
| S4 | Rename keeps the property `name` | Accept the divergence: the `name` stays stable on rename | Stable names keep entity values valid; Uwazi re-derives the name and migrates values in a job, which the prototype does not have |
| S5 | Template labels per language | Out of scope for the template store: English labels in the seed; per-language labels belong to Translations (L2) | Keeps the template model single-language until Translations exists |

## Page briefs

The sections below are in demo order: Templates (list and editor), the property dialog, Thesauri, Users & Groups with Account, Collection with Global CSS, Filters, Relationship types, Languages, Translations.
