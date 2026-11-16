# Language audit: code, comments, docs, UI copy

**Scope:** playground `04d8f506`. §2 was re-checked on `962922e5`, Operator's CLAUDE.md fix, which only touches that file. Read-only; no files were edited.
**Standard:** `~/.claude/CLAUDE.md` "Prose". State the fact, the reason and the consequence in plain English. No metaphors, aphorisms, flourishes, "the X is the Y" framings or dramatic one-liners.
**Method:** CLAUDE.md, handoff/ and docs/ were read and their claims checked against the code. Code comments, identifiers and UI copy were scanned by script. Every file:line below was re-checked with `sed`/`grep` on this commit, and the headline claims were spot-checked a second time.

---

## 1. Findings, ranked by impact

| # | Finding | Where | Impact |
|---|---|---|---|
| 1 | CLAUDE.md still states things the code no longer does after `962922e5` (list in §2.2). Agents follow the spec, so they write code for components and props that do not exist. | CLAUDE.md | High |
| 2 | One concept has three names in the UI. The tab says "Relationships", the Library column, sort, dashboard and Bert say "Connections", and bulk delete and a tooltip say "References". `AggregateRow.tsx:98` tells the user to "View evidence in References", which is a place that does not exist. | UI copy | High |
| 3 | `EntityOverlay` is two unrelated things: a type in `data/entityOverlay.ts:51` (the session's write layer over the corpora) and a component in `components/relationships/EntityOverlay.tsx` (the entity slide-over). Same identifier, about 15 files. | identifiers | High |
| 4 | Every clickable row in the Settings tables is announced as "Open row". `SettingsTable.tsx:20-35` passes `onRowClick` without `rowAriaLabel`, so `DataTable.tsx:225` falls back to the generic label. | a11y copy | High (a11y) |
| 5 | Comments are 18.2% of non-blank lines (13,415 of 73,775), and 169 comment blocks run over 12 lines. The dominant pattern narrates the previous implementation ("used to" ×79, "no longer" ×23) instead of stating the current rule. | app/src | Medium–High |
| 6 | Five comments cite identifiers that do not exist (§4.5). CLAUDE.md repeats one of them (`pageJumpAtom`). | comments + CLAUDE.md | Medium |
| 7 | The same entity-view tab has two ids: `"relationships"` (`utils/entityTabs.ts:18`) and `"connections"` (`views/EntityView.tsx:124`, `MetadataView.tsx:1685`, `ReferencePanel.tsx:24`). | identifiers | Medium |
| 8 | Templates are called "type" in code (`typeId` 437 occurrences in 80 files, `EntityType`, `getEntityType`) and in the Library UI ("Type" facet and sort). Uwazi calls them templates and uses "type" for relationship types and property types. | identifiers + copy | Medium (largest rename) |
| 9 | The i18n layer is partial. Only 12 of 289 `.tsx` files call `t()`, 58 of 77 keys have no translation row, and about 250 aria/title/placeholder literals are hardcoded. The key is the English string, so every copy fix also changes a key. | UI copy | Medium (sets the batch order) |
| 10 | handoff/ ports stale values to the real repo: `70%` label mix (PATTERNS.md:213, PILOT-COMPONENTS.md:105; the current value is `--label-mix: 55%` in `tokens.css:38`), and `GroupByControl.tsx` (COMPONENT-INVENTORY.md:104, README.md:47), which no longer exists. | handoff, README | Medium (these docs leave the repo) |
| 11 | docs/ is from March 2026 and the .pen era, and paths point at `~/Documents/Claude/...pen` (screens.md:4,7). It duplicates memory files (`brand-colors.md`, `components.md`, `screens.md`, `design-system.md`), and repo-root `memory/text-references-feature.md` duplicates the auto-memory file of the same name. | docs/, memory/ | Low–Medium |
| 12 | Casing and punctuation drift. Title Case outliers are concentrated in Import CSV, Relationships bulk delete, ToC and two Settings headings. "..." appears 8×, while "…" appears about 50×. | UI copy | Low (easy) |
| 13 | Dead code: `views/CreateRefView.tsx` is imported nowhere, and `relationshipsViewModeAtom` (`atoms/filters.ts:217`) is reported unused. | code | Low |

---

## 2. CLAUDE.md (repo root)

### 2.1 Size and shape
**Size:** 813 lines on `962922e5` (816 on `04d8f506`), about 8,400 words. For comparison, AGENTS.md is 33 lines and defers to CLAUDE.md, which is correct.

**Largest sections (lines):**

| Section | Lines |
|---|---|
| Library search | 131 |
| Style rules that bite | 87 |
| Relationship & inherited metadata | 77 |
| Connections panel | 70 |
| Library card thumbnails (incl. "what fills the slot") | 65 |
| Notifications | 54 |
| A11y patterns | 48 |

**Duplication:**
- The Relationships count rule appears twice: "The tab strip is the only place…" (l.215) and "Still no count in the toolbar" (Connections panel).
- `EntityOverlay` is described in "The entity preview panel" and again in "Relationship & inherited metadata" (l.~560).
- The `bg-parchment` selected state is stated 5 times (Style rules, Files view, Don't ×2, Card-row). The var-fallback rule is stated 2 times (CSS tokens, Don't). The whole "Don't" list restates earlier rules.
- The toast→beacon consolidation is described inside Notifications and implied again in Beacon pill.
- Memory's `MEMORY.md` "Style Rules" block repeats CLAUDE.md's style rules.

**History that belongs in git or memory (still present on `962922e5`):**
- "post-audit, 2026-07" in a heading.
- "moved 70 → 65 → 55" (l.71).
- "the chip shipped the raw colour precisely because…" (l.67).
- "no longer primes" (l.693).
- The CEJIL recovery pilot figures (about l.650-670: bytes, 5,245 records, 101MB, 26 docs/19.9MB).
- Per-keystroke perf measurements (l.685 settle 5,379ms → 2,990ms, l.695 heap 434.8 → 326.2MB).

These figures justify the rules. They do not state the rules, so they belong in memory (`session-cejil-recovery-thumbs.md` already has them) or in the commit messages.

**Prose:**
- Headings use framings: "Style rules that bite", "one record, two projections", "one body, two hosts", "where the evidence lives", "the thing that bites" (TOKENS-MAPPING).
- Bodies use flourishes ("A bare drag is how people READ"), all-caps emphasis in about 40 places, and 50 "never/don't" lines.
- The emphasis inflation matters because the file uses bold/caps to mean "important", and when most lines are marked, none stand out.

### 2.2 Stale facts (verified against the code, line numbers from `962922e5`)

`962922e5` already fixed three things: `FiltersRow` → `CollapseControls`, the toolbar snippet, and the memory handoff pointer. It also removed the history wording at about l.215, 389, 411, 470, 557, 599, 632, 688 and 743. None of that is re-proposed here. What remains:

| CLAUDE.md says | Code says |
|---|---|
| File tree lists `GroupByControl.tsx` (l.242) | The file does not exist; grouping lives in `RelationshipsDisplayMenu.tsx`. `RelationshipsToolbar.tsx`, `RelationshipsDisplayMenu.tsx`, `RelationshipsActionBar.tsx`, `DrawerActionBar.tsx` and `MobileOverlayStack.tsx` are missing from the tree. |
| `<RelationshipRow kind="reference" ref={ref} …>` (l.284) | The prop is `reference` (`RelationshipRow.tsx:9`). `ref` would hit React's ref. |
| Click-to-fill uses "the `pageJumpAtom` idiom" (l.468), and "would make the mode frightening to leave on" (l.466) | No `pageJumpAtom` exists. The idiom is `scrollToPageAtom` / `pageJumpStateAtom` (`atoms/selection.ts:44-64`). "Frightening" is a flourish; the same sentence also appears in `FloatingMenu.tsx:33`. |
| Metadata drawer tabs "Document → Connections → Files → Template" (l.448) | The label is "Relationships" and the id is `"connections"` (`MetadataView.tsx:1685-1686`). |
| Beacon: "same fill as the bottom `ActionBar` buttons, which … carry the `WARM_EDGE` inset ring" (Notifications) | This contradicts the file's own action-bar rule: "Action-bar buttons carry no border, ring or edge". `warmButton.ts:25-37` agrees with the action-bar rule. |
| Type-label mix "number moved 70 → 65 → 55", implied to be in `typeColor.ts` | The value is a CSS token, `--label-mix: 55%` (`tokens.css:38`). `typeColor.ts:49` reads `var(--label-mix)`. |
| "Used by ConfirmDialog, AgentModal, NotificationsDrawer…" for `useFocusTrap` | `ConfirmDialog` is now a `Modal` wrapper (`ConfirmDialog.tsx:3,34`). It gets the trap from Modal, not directly. |
| Mobile: "`AdaptiveSplitView` swaps to `MobileBottomSheet`… follow-ups in `pending.md`" | This is two lines for a surface that grew a sheet stack in the last five commits (`atoms/sheetStack.ts`, `useSheetLayer`, "nested views are bottom sheets that stack"). `pending.md` is dated 2026-03-20. |
| Dev: `npm run dev` → `:5173` | This is true by default, but every session here runs on an Operator-reserved port. One line should say so. |

**Also on main:** main's CLAUDE.md (784 lines) carries the same stale file tree, `pageJumpAtom` and the tab rows (3 matching hits). It differs mainly in the thumbnails section ("one treatment").

### 2.3 Proposed outline (target: ~300 lines, ~3,500 words, about 40% of today)

**Rules for what stays:**
- Keep a line only if it states a rule, a location, or a trap that the code does not make obvious.
- Replace file trees with one line per directory.
- Move history, measurements and incident accounts to memory. Git already holds them.
- Section bodies are bullet rules of one or two lines, each with its reason.

**Outline:**
```
# Uwazi 2026 prototype                                       (5)
## Stack and commands            dev/port, tsc, build, storybook, branches   (12)
## Working with Juan             terse, visual, brand terms, playground-first (8)
## Data model
   - Reference vs Relationship (table kept, prose cut)                        (25)
   - Relationship fields and inheritance (resolver, provenance, reduce)       (25)
   - Documents: file _id addressing, renditions, language                    (15)
## Layout and style
   - Gutter hosts and stack (rule + __gutter(); tiers as a table)             (20)
   - Tokens (the table) and the no-fallback rule                              (20)
   - Buttons: warm button, action-bar ladder, Modal (one section)             (25)
   - Layout stability (no shift on state change)                              (5)
## Accessibility                 rows, inert, focus trap, hover reveal, SVG, type labels, live regions (30)
## Surfaces (one short block each: files, key atoms, 3–6 rules)
   - Relationships panel         (25)
   - Entity preview (drawer + slide-over)   (15)
   - Metadata view + click-to-fill           (20)
   - Library: search/Results, TimeSpine, thumbnails, recent searches  (40)
   - Notifications (Beacon + drawer), Bert   (20)
   - Import CSV, Files, Catalog, Mobile (sheet stack)   (20)
## Performance traps             filterState memo, EntityCard query prop, recovery-script caps (10)
## Where context lives           memory index, handoff/, Figma, screenshots   (6)
```
The standalone "Don't" list is dropped, because each item already appears once under its section. The glossary in §6 of this report goes in as a short "Vocabulary" section (about 12 lines), so new code uses one term.

---

## 3. handoff/, README, docs/

| File | Lines | Issues |
|---|---|---|
| PATTERNS.md | 693 | Stale `70%` mix (l.213) and `"Open row"` in its example (l.36). "non-negotiable", "The easing vocabulary", "signature easings" (GLOBAL-STYLES). It overlaps CLAUDE.md's A11y section almost line for line. **Keep PATTERNS as the external copy and have CLAUDE.md link to it.** |
| PILOT-COMPONENTS.md | 467 | Stale `70%` (l.105). Last touched 2026-08-11, so its specs predate the action-bar ladder and Modal rules. |
| COMPONENT-INVENTORY.md | 202 | Lists `GroupByControl.tsx` (l.104), which is missing. The headline is a framing ("the surfaces have converged more than … implied"). |
| DATA-SEAMS.md | 282 | Titles are framings ("One record, three projections"; "Two surfaces, one engine"). It says three projections while CLAUDE.md says two, so pick one. Last touched 2026-07-21, before per-scope panel state and hubs-with-one-member. |
| TOKENS-MAPPING.md | 176 | "The two-layer rule (the thing that bites)". The `px-3.5` history (l.132) can go. |
| TYPOGRAPHY.md | 199 | "what makes the prototype look the way it does", "Rules that carry the feel". |
| GLOBAL-STYLES.md | 150 | "brand-defining". |
| PR-BODY.md | 46 | One-off from 2026-07-06. Archive it or delete it. |
| README.md | 237 | The structure tree lists `GroupByControl`, and `ToastContainer` under `views/`. Check the tree against `ls` whenever a batch renames files. |
| docs/*.md | 7 files | Five of them are March-era .pen notes that duplicate memory. Move them to `ui/archive/` or delete them. Keep `uwazi-product.md` and `uwazi-navigation.md` (domain facts). `relationship-chain-filters.md` is a July proposal; mark it as a proposal or archive it. |

**Also on main:** main has the same handoff files. They differ only in COMPONENT-INVENTORY (8 lines) and TYPOGRAPHY (2 lines), so the stale `70%` and `GroupByControl` rows are on main too.

---

## 4. Code comments (app/src)

### 4.1 Size
13,415 comment lines against 60,360 code lines, which is 18.2%. There are 169 blocks over 12 lines.

**Most comment lines:**

| File | Comment lines | Code lines |
|---|---|---|
| `views/LibraryView.tsx` | 472 | 1,249 |
| `atoms/library.ts` | 412 | 541 |
| `views/MetadataView.tsx` | 394 | 1,290 |
| `utils/librarySnippets.ts` | 365 | 496 |
| `library/EntityCard.tsx` | 342 | 507 |
| `ResultsSnippets/ResultsMainView.tsx` | 320 | 1,083 |
| `library/TimeSpine.tsx` | 239 | 345 |

**Highest comment ratio:**
- `utils/thumbFrame.ts` 53%
- `shared/DocPlaceholder.tsx` 47%
- `hooks/useDrawerWidth.ts` 47%
- `atoms/filters.ts` 46%

**Longest blocks:**

| Lines | Location |
|---|---|
| 74 | `utils/copyFrom.ts:6` |
| 48 | `shared/SectionLabel.tsx:3` |
| 45 | `views/LibraryView.tsx:1155` (above one span) |
| 45 | `shared/TabCount.tsx:1` (for a function of about 10 lines) |
| 36 | `utils/gutterCheck.ts:1` |
| 35 | `library/EntityThumbnail.tsx:150` |

### 4.2 Narrated history (175 hits, concentrated in the Library)
- `atoms/library.ts:165` "DECISION (2026-07-21): these are a real FILTER…"
- `atoms/library.ts:750` and `library/EntityCard.tsx:72-73`: "Small was cut once, c8e52fbc, and is back"
- `library/EntitySelectBox.tsx:65` "NOT DRAWN (Juan, 2026-09-21): …"
- `library/EntityThumbnail.tsx:119` "RE-TUNED with the band (2026-09-10). The plaque was 34%…"
- `atoms/library.ts:26`, `:629`; `utils/pdfThumb.ts:30`; `utils/flash.ts:8`; `layout/DrawerTabs.tsx:53`; `layout/SplitView.tsx:120`: "used to…"
- `layout/DocMeta.tsx:34-52`: an 18-line account of two past captioning bugs
- `shared/SectionLabel.tsx:7` "There were FOUR of these…"

### 4.3 Metaphors and flourishes
- `viewer/FloatingMenu.tsx:33` "frightening to leave on"
- `utils/copyFrom.ts:61` "a lie that the next render overwrites"
- `library/EntityCard.tsx:554` "a lie about what full size means"; `:757` "a poorer thing than a picture and an honest one"
- `library/EntityThumbnail.tsx:96` "a grey speck adrift"; `:126-127` "a poster … a speck"
- `import-csv/ImportCSVLayout.tsx:14` "wore this one's clothes"
- `settings/SettingsNav.tsx:20` "was scenery"
- `layout/Navbar.tsx:490` "Two doors, two destinations"
- `shared/TabCount.tsx:14` "THE GROUND IS A TINT, AND THE WEIGHT IS THE WHOLE QUESTION."
- `shared/ThemeEffect.tsx:34` "a wash of mismatched surfaces"
- `layout/DocMeta.tsx:57` "an honest blank beats a confident wrong one"
- `entity/EntityDetailBody.tsx:149` "tells the truth about"
- `utils/mockTranslate.ts:16` "Better an honest echo than invented words"
- `library/TimeSpine.tsx:228` "the case that bites"

"honest" or "truth" appears about 15 times. The literal uses of "silently" (for example `utils/dateValue.ts:10`) are accurate and should stay.

### 4.4 Comments that restate the code
These comments sit above an element whose `data-part` or `id` already names it, so they can be deleted:
- `import-csv/ImportTable.tsx:146,172` `{/* Header */}` / `{/* Rows */}`
- `EntitiesTable.tsx:28,78` and `IssuesTable.tsx:27,78`
- `ImportDetailView.tsx:170,213`
- `catalog/StyleGuide.tsx:182-246` (5 of them)
- `settings/pages/AccountPage.tsx:144,160`
- `PreserveTokenEditor.tsx:247`

### 4.5 Stale comments (identifier cited but not present)

| Location | Cites | Should cite |
|---|---|---|
| `shared/DocPlaceholder.tsx:6` | `DocumentPreview` | `PdfPageThumb` |
| `utils/librarySnippets.ts:395-396` | `cejilDocPagesFor` | `cejilRenderedDoc` (`data/cejil/profile.ts:333`) |
| `utils/bulkEdit.ts:201` | `choiceByLanguage` | `labelForKey` (:297, :313) |
| `atoms/fillTarget.ts:34`, `atoms/library.ts:200` | "`pageJumpAtom` idiom" | `scrollToPageAtom` |
| `layout/DocMeta.tsx:45` | `isMain` | no such identifier exists |

**Also on main:** the long-comment habit predates the fork. `copyFrom.ts`, `DocMeta.tsx` and `ToCPanel.tsx` exist on main. `TabCount.tsx` and `SettingsTable.tsx` are playground-only. Most of the Library essay comments are playground-only, because main is reduced.

---

## 5. UI copy

### 5.1 Same action, different words
**Opening an entity:**
- "Open" is used 26 times, "View" 26 times and "Preview" 2 times.
- Import CSV is the only surface that says "View": `EntitiesTable.tsx:42,66`, `ImportTable.tsx:118` and `FileDrawer.tsx:389`.

**Making something:**
- Add vs Create for the same action: "Add relationship" (`DrawerActionBar.tsx:102`) vs "Create relationship" (`FloatingMenu.tsx:88`, `RelationshipsActionBar.tsx:157`).
- "New Import" is a CTA (`ToolsActionBar.tsx:73`), while elsewhere "New X" is only a page title.

**Show more / less:** "Show less" (`LibraryTimelineView.tsx:352`) vs "Show fewer" (`ResultsMainView.tsx:589`).

**Clearing:** "Clear search text" (`LibraryView.tsx:1133`) vs "Clear search" (9 other places).

**Delete vs Remove:** `MenuPage.tsx:77-78` has the title "Delete menu link" and the body "Remove … from the navigation menu?".

**Two confirmation styles:**
- Short: "Delete this reference? This cannot be undone." (`RelationshipsActionBar.tsx:130`)
- Long: "Are you sure you want to delete this reference? This action cannot be undone." (`RelationshipsToolbar.tsx:107`, `ImportCSVView.tsx:184,194`)

**Toast word order:**
- Noun first: "Reference deleted" (`RelationshipsToolbar.tsx:97`)
- Verb first: "Deleted N references" (`RelationshipsActionBar.tsx:87`)

### 5.2 Casing
Title Case outliers, in an app that otherwise uses sentence case:
- "New Import" and "Delete Import(s)" (`ToolsActionBar.tsx:73`, `NewImportModal.tsx:73`, `ImportEmptyState.tsx:21`, `ImportCSVView.tsx:183,193`)
- The 11 detail labels at `ImportDetailView.tsx:163-192` ("Rows Processed", "Thesauri Touched"…)
- "Delete Reference(s)" (`RelationshipsActionBar.tsx:126`, `RelationshipsToolbar.tsx:106`)
- "Collapse All / Expand All" (`ToCPanel.tsx:101,109`)
- "Last Edited" (`DocumentCard.tsx:73`), "Map Preview" (`MetadataView.tsx:1072`)
- "Metadata Extraction" / "Paragraph Extraction" (`MetadataExtractionPage.tsx:51`, `ParagraphExtractionPage.tsx:28`)

### 5.3 Terminology in copy
**Relationships / Connections / References:** see finding 2. "Connections" appears at `EntityCard.tsx:268`, `ChangeTemplateDialog.tsx:169`, `BulkEditBody.tsx:476`, `AgentModal.tsx:200` and `RelationTypesPage.tsx:75`. `ManageRelationTypesModal.tsx:106` counts the same deletion as "references".

**Relationship type:**
- "Relationship type" is used in Settings.
- "Relation type" at `TemplateEditor.tsx:430`.
- "relation type label" at `ManageRelationTypesModal.tsx:136`.

**Template / Type:**
- "Template" is used in Settings, Import and Extractors.
- "Type" in the Library facet and sort (`LibraryFilters.tsx:293,355`).
- "of this type" at `CopyFromPicker.tsx:273`.

**Record:** "record" leaks into copy at `EntityCard.tsx:844,859`.

### 5.4 Tone and punctuation
- `ToCPanel.tsx:70-72`: "No ToC" / "Well, just a table of contents (ToC)" is a joke and an unexplained abbreviation, and it is also on main.
- "..." appears at `NewImportModal.tsx:163,177`, `CreateRelationshipModal.tsx:218,231`, `DocumentViewer.tsx:483`, `ActionBar.tsx:115` and `MetadataView.tsx:993`.
- Straight quotes appear at `ImportEmptyState.tsx:21`, `SearchBar.tsx:60`, `CreateRelationshipModal.tsx:148`, `ManageRelationTypesModal.tsx:106` and `AddFileModal.tsx:240`.
- "Click" at `ImportEmptyState.tsx:21`.
- "Please retry" at `atoms/notifications.ts:94`.
- There are no exclamation marks. First person appears only in Bert's replies, which is acceptable.

### 5.5 aria-labels
**Vague labels:**
- "Open row" on every Settings table row (finding 4).
- `aria-label="Show"` (`NotificationsDrawer.tsx:201`).
- "Help" ×2 (`DrawerActionBar.tsx:87`, `TemplateStructure.tsx:189`).
- A bare "Dismiss" ×3 and a bare "Close" ×5 (`TemplateEditor.tsx:397`, `LanguagesPage.tsx:238`, `NotificationsDrawer.tsx:193`, `MobileBottomSheet.tsx:237`, `AgentModal.tsx:330`).
- "Toggle evidence" (`AggregateRow.tsx:98`).
- "Auth" (`PreserveTokenEditor.tsx:211`).

**Label-in-name failure (WCAG 2.5.3):** `ComponentCatalog.tsx:394,401`, where the aria-label is "Go to page 14" and the visible text is "Document". This is catalog only.

---

## 6. Glossary: one term per concept

| Concept | Term | Retire / restrict | Uwazi v2 |
|---|---|---|---|
| One stored edge between two entities, optionally anchored to text | **reference** (code) | "link", "rel" in exported names | stored as `relationship` |
| Aggregate of references by (target, type) | **relationship** (code and UI) | "connection" in the UI | — |
| Entity-view tab and panel for both | **Relationships** (id `"relationships"`) | tab id `"connections"`, UI "Connections", UI "References" | Relationships |
| Kind of relationship | **relationship type** | "relation type" in the UI (`relationType` in code can stay) | relationship type |
| Metadata property that links to entities | **relationship field** | "connection" (`ConnectionGroupCard`, `connectionKey`) | relationship property |
| Number of references behind a relationship | **evidence count** | — | — |
| An entity's schema | **template** | "type" and "entity type" for templates | template |
| The session's in-memory writes over the corpora | **change layer** | "overlay" for data | — |
| Docked, resizable right pane | **drawer** | "panel" for it (`ReferencePanel`) | — |
| Transient panel that slides over a pane | **slide-over** | "drawer" (Filters, Notifications), "overlay" (EntityOverlay) | — |
| Mobile bottom panel | **sheet** | "sheet" for desktop blocks (`ActiveFiltersSheet`) | — |
| Entity shown beside other content | **preview** | — | — |
| The entity a view is about | **focused** | "focused" for scroll-to or open | — |
| Item shown in a drawer or preview | **open** | "selected" for single-open (`librarySelectedEntityIdAtom`) | — |
| Checkbox set | **selected** | — | — |
| Jump or highlight target | **active** | "active" for tabs, applied filters, collections | — |
| Filters that are on | **applied** | "active filters" (code) | — |
| Filter dimension / applied value | **facet** / **filter** | — | filters |
| Clickable entity token / removable or toggle control / static label / number | **pill** / **chip** / **tag** / **badge** | `EntityTypeChip` next to `EntityTypeTag` | — |
| Top-level mode of a surface / sub-arrangement / row size | **view** / **layout** / **density** | `Zoom` for density | — |
| Page of the app | **page** (`appViewAtom` can stay) | — | — |
| In-flight background job | **task** | "activity" (`activitiesAtom`) | — |
| Log entry in the notifications drawer | **notification** | "toast" outside the catalog | notifications |
| The assistant | **Bert** in the UI, `agent*` in code | — (already consistent) | — |

The first three rows collide partly with Uwazi, because Uwazi's stored record is a `relationship`. The CLAUDE.md "Reference vs Relationship" table already documents this, so keep it and point the handoff docs at it.

---

## 7. Style guide

### 7.1 Code comments
1. **Say why, not what.** Write a comment only for a constraint, a trap or a non-obvious reason. If a `data-part`, `id` or name already says what the code is, write nothing.
2. **State the current rule.** Do not narrate past versions. "Used to", dates, commit hashes and names go in the commit message.
3. **One to three lines.** A module header can run to about 8. Anything longer belongs in handoff/ or memory, with a one-line pointer in the code.
4. **Plain words.** No metaphors, no "honest/lie/truth", no all-caps shouting. Keep "silently" only where it is literal.
5. **Name real identifiers.** A backticked name must exist, and a rename updates its comments in the same commit.

**Before / after (from this repo):**

`shared/TabCount.tsx:14`
> Before: `THE GROUND IS A TINT, AND THE WEIGHT IS THE WHOLE QUESTION.` plus about 40 lines of three design passes.
> After: `// bg-ink/4, rounded-full, min-w = height: a faint tint that reads on paper and vellum in both themes.`

`library/EntitySelectBox.tsx:65`
> Before: `NOT DRAWN (Juan, 2026-09-21): the Library selects by modifier click…`
> After: `// Not rendered in the Library: selection uses Cmd/Ctrl- and Shift-click.`

`utils/pdfThumb.ts:30`
> Before: `It used to be (url, width) alone…`
> After: `// Cache key includes every input that changes the bitmap: url, width, frame, fit.`

`viewer/FloatingMenu.tsx:33`
> Before: `…would make the mode frightening to leave on.`
> After: `…would overwrite a field every time the user selects text to read it.`

`layout/DocMeta.tsx:57`
> Before: `an honest blank beats a confident wrong one.`
> After: `// Show "Unknown entity" rather than another document's name.`

### 7.2 Docs (CLAUDE.md, handoff/, README)
1. **Headings name the topic.** Write "Relationships panel", not "refs and rels are one surface".
2. **Rules as bullets.** Each bullet gives the rule and its reason in one sentence. The consequence gets a second sentence only if it is not obvious.
3. **No history.** Measurements and incident accounts go in memory, and a doc links to them when a rule needs its evidence.
4. **One home per rule.** Other places link to it.
5. **Emphasis is scarce.** Bold at most once per section. No all-caps.

**Before / after (from CLAUDE.md l.66-73):**
> Before: "Type labels never use the raw type colour … — the chip shipped the raw colour precisely because it carried its own copy. Measure new type colours against the 22-colour PALETTE … That assumption is why this number moved 70 → 65 → 55: 70 missed #2563EB (4.34:1), and 65 was still tuned…"
> After: "Type labels mix the type colour toward ink by `--label-mix` (55%, `tokens.css`) via `typeLabelColor`. One implementation serves every label. Check new colours against the 22-colour palette in `data/cejil/typesAdapter.ts`, in dark mode, which is the binding case."

### 7.3 UI copy
1. **Sentence case everywhere.** Capitalise only proper nouns (Bert, Uwazi, CSV).
2. **One verb per action:**

   | Verb | Meaning |
   |---|---|
   | Open | navigate to something |
   | Preview | show beside |
   | Go to | jump to a location |
   | Delete | destroy |
   | Remove | detach |
   | Clear | reset an input or set |
   | Cancel | abandon a form |
   | Close | exit a view |
   | Dismiss | remove a notice |
   | Save | commit |
   | Create X | the button |
   | New X | the dialog or page title only |
   | Add X | attach to an existing parent |
   | Show more / Show less | expand or shorten a list |

3. **aria-labels give the verb and the object:** "Close notifications", "Dismiss notification", "Open ${title}".
4. **Confirmations:** title "Delete <object>?", body "<consequence>. This can't be undone." Do not use "Are you sure".
5. **Toasts:** object then past participle: "Reference deleted", "3 references deleted".
6. **Punctuation:** use "…" and curly quotes. No "!" and no "please". Write "Select", not "Click".

---

## 8. Batch plan

**Gates for every batch:**
- `cd app && npx tsc --noEmit && npm run build`.
- The Storybook a11y run for batches that touch components.
- `window.__gutter()` is not needed, because no layout changes.

**Order:** comments and docs first, because they carry no runtime risk. UI copy comes before any `STRINGS` translation rows are added, because keys are the English strings.

| Batch | Content | Type | Size | Risk | Main? |
|---|---|---|---|---|---|
| **B1** | Rewrite CLAUDE.md, starting from `962922e5`, to the §2.3 outline. Fix every remaining §2.2 stale fact and move history to memory. Update AGENTS.md if needed. | docs | 813 → ~300 lines | none (no code) | Yes: main's copy has the same stale file tree, `pageJumpAtom` and tab rows. Port by hand, because the thumbnails sections differ. |
| **B2** | handoff/ fixes: the `70%` → `--label-mix` 55%, `GroupByControl`, `"Open row"` example, DATA-SEAMS "two vs three projections", heading framings. README tree. Archive docs/ .pen files and PR-BODY.md. Remove repo-root `memory/` duplicate. | docs | ~8 files, ~150 lines touched | none | Yes (identical files) |
| **B3** | Comments, Library cluster: `atoms/library.ts`, `EntityCard`, `LibraryView`, `EntityThumbnail`, `ResultsMainView`, `librarySnippets`, `TimeSpine`. Cut history, dates, hashes and metaphors, and trim blocks >12 lines to the rule. | comments only | 7 files, about −900 comment lines | none (tsc gate catches stray edits) | mostly playground-only |
| **B4** | Comments, remaining: the §4.3 list, the §4.4 restating comments, the §4.5 stale identifiers, `TabCount`, `SectionLabel`, `copyFrom.ts` header, `DocMeta`, `SettingsNav`, `ImportCSVLayout`, `Navbar`. | comments only | ~30 files, about −600 lines | none | partly (copyFrom, DocMeta, Navbar, ToCPanel exist on main; check each) |
| **B5** | UI copy, no concept change: casing (§5.2), "..." → "…", straight → curly quotes, "Click", "Please", "Show fewer", "Clear search text", confirmation and toast forms, the ToC empty state. | copy (`t()` keys change where wrapped) | ~25 files, ~60 strings | low; grep tests/stories for changed strings | Yes: Import CSV, ToC and Relationships strings are on main |
| **B6** | aria-labels: `SettingsTable` `rowAriaLabel`, bare Close/Dismiss/Help/Show/Auth, "Toggle evidence", catalog label-in-name. | copy + one prop | ~12 files | low; run the a11y addon | Only the parts whose files exist on main (`SettingsTable` is playground-only) |
| **B7** | Terminology in copy: "Connections"/"References" → "Relationships", "Relation type" → "Relationship type", Library "Type" → "Template", "View" → "Open" in Import CSV, Add vs Create relationship. | copy | ~15 files, ~30 strings | low–medium. The Library "Type" facet may be a decision for Juan; confirm first. | Yes (where present) |
| **B8** | Low-risk renames: tab id `"connections"` → `"relationships"`, delete `CreateRefView.tsx` and `relationshipsViewModeAtom`, catalog `Isolated*` → `*Demo`, `librarySelectedEntityIdAtom` → `libraryOpenEntityIdAtom`, `resultsActivePageAtom` → `resultsCurrentPageAtom`, `recordSearchAtom` → `logSearchAtom`. | code renames | ~35 files | low–medium; tsc catches all but the string tab id. Grep `"connections"` separately; persisted `sessionStorage` tab values may hold the old id. | tab id and `CreateRefView` exist on main |
| **B9** | Name collisions: the data `EntityOverlay` type → `ChangeLayer` (`data/entityOverlay.ts`, `atoms/entityOverlay.ts` → `entityChanges.ts`). Component `EntityOverlay` → `EntityPreviewSlideOver`, `overlayEntityIdAtom` → `previewEntityIdAtom`. `FiltersDrawer` / `NotificationsDrawer` / `RelationshipsFilterDrawer` → `*SlideOver`. `ReferencePanel` → `EntityDrawer`. `EntityTypeChip` merged into `EntityTypeTag`. | code renames + CLAUDE.md/handoff sync | ~50 files | medium: widely imported, type-checked. One commit per rename. | Yes: `data/entityOverlay.ts` is on main |
| **B10** | Module structure: split `atoms/references.ts` (toasts, drawer tab, doc search, overlay id), prefix the bare relationships-panel atoms in `atoms/filters.ts` (`relViewAtom`…), `Activity` → `Task`, move `toastsAtom` to `atoms/notifications.ts`. | code moves | ~65 importers | medium; mechanical, but `relAtomFor`'s scope map must follow | decide separately; high churn on main for little gain |
| **B11** | `typeId`/`EntityType`/`getEntityType` → template names, including seed data and `typesAdapter.ts`. | code rename | ~85-90 files | highest: it touches `Entity`, profiles and all seed data. Do it alone, last, and only if Juan wants Uwazi alignment in the prototype. | recommend playground only |

B1–B4 change no runtime behaviour and can go in any order. B5–B7 are user-visible, so each needs a visual check. B8–B11 are renames; do one per commit and keep the tsc and build gates green.

**Who should do it (recommendation to the coordinator):**
- Code lane: B3–B11.
- Operator or Code: B1–B2, with Juan reviewing the CLAUDE.md rewrite before it lands.
- Juan decides B7's "Type" → "Template" facet label and whether B11 happens at all.
