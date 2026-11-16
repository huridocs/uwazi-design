# Type roles audit — playground 956db631

Read-only. Scope: every `text-*` / `font-*` / colour on text in `app/src` (stories, `views/catalog`,
`views/ComponentCatalog`, `components/catalog` excluded). Spec compared: `handoff/TYPOGRAPHY.md`.
Method: grep plus a small script that reads each JSX opening tag and tallies size / weight / colour
per role (buttons, inputs, uppercase labels, headings, badges, menu items, empty states). Nothing was
rendered; line numbers are from the checkout as of this run.

## 1. Headline

1. The size scale is clean. There are no bracket sizes left in code. The 4 "off-scale" items are not 4 real problems:
   - `text-[0.6875rem]` and `text-[0.8125rem]` appear only inside a comment, `app/src/index.css:41`. They are not used anywhere.
   - `text-[0.85em]` ×2 is `views/catalog/Markdown.tsx:192` and `:200` (inline code in the dev catalog's Markdown renderer). It is relative to the surrounding paragraph, so it cannot be a step on the scale. Leave it; note the exemption in the spec.
   - Real sizes below the 11px floor that the grep for brackets misses: `components/shared/FiltersButton.tsx:49` (`fontSize: 9` on the active-filter count) and `components/library/LibraryMapView.tsx:219` (`fontSize: 7 / zoom`, SVG pin count). `RelationshipsGraphView.tsx:74` `LABEL_PX = 11` is on the floor and fine. `utils/sitePageRender.ts` (12/13/14px, rem headings) styles the published-site preview document, not the app UI; out of scope.
2. What Juan sees is the same role at different sizes, weights and colours. The worst ones, in order of how often a user meets them:
   - **Table cell text**: `text-sm` in Settings tables, `text-xs` in Files and Import tables (§3.8).
   - **Input text**: `text-sm` in page forms, `text-xs` in every modal (§3.6).
   - **Empty / "No …" messages**: three sizes, three colours, five weights (§3.12).
   - **Badges**: Settings status pills are `font-semibold`; every other badge is `font-medium` (§3.10).
   - **Stat figures**: `text-lg`, `text-xl`, `text-2xl`, `text-sm` for the same role (§3.11).
   - **Titles**: `text-sm`, `text-base`, `text-tab`, `text-xs`, with `font-bold` / `semibold` / `medium` (§3.1–3.2).
   - **Hint / meta text in `text-ink-muted`**: about 90 text sites use a colour that fails AA (3.95:1 on parchment, 4.23:1 in dark on `#242424`). The spec itself names muted for captions. See §5.
3. The spec (`handoff/TYPOGRAPHY.md`) is stale and contradicts the code in places. Several "deviations" are the code being right and the spec being wrong. See §2.

## 2. Where the spec should change (instead of the code)

| # | Spec says | Code does / reason | Change the spec to |
|---|---|---|---|
| S1 | Bracket sizes `text-[10px]`, `[11px]`, `[13px]` throughout §3 | Zero brackets left. `--text-meta` 11px, `--text-tab` 13px are tokens (`index.css:43-44`). The 11px floor was set 2026-08-18 | Rewrite the table and combos with `text-meta` / `text-tab`. |
| S2 | `section label text-[10px] … tracking-wide` | No 10px exists. `SectionLabel` is 11px (`group`) and 12px (`section`) (`SectionLabel.tsx:12-15`) | Section label = `text-meta font-semibold uppercase tracking-wider text-ink-tertiary`. Delete the 10px row. |
| S3 | `section label` wide and `table header` wider are different recipes | Both are now 11px semibold uppercase tertiary; they differ only in tracking. Tracking-wider is the majority (about 20 sites vs 12) | One recipe, "caps label": `text-meta font-semibold uppercase tracking-wider text-ink-tertiary`. Table header, group label, stat label, caps field label are all this. |
| S4 | `dialog heading text-base font-semibold` and "`text-base` and up: view titles" | `Modal.tsx:265` is `text-sm font-semibold` (3rem header), as are the Settings page title, `MobileBottomSheet`, `LibraryBulkEditDrawer`, `EntityIdentity`. `text-base` is used in product only by Bert, the Notifications drawer and the CSV detail title (3 sites, all fixable). | Title (page bar, dialog, drawer, sheet) = `text-sm font-semibold text-ink`. `text-base` unused in product. `text-2xl` is for the login page only. |
| S5 | `caption text-xs text-ink-muted` | Muted on parchment is 3.95:1 (AA needs 4.5). `SectionLabel.tsx` already states this. | Caption / hint / empty-line = `text-xs text-ink-tertiary`. Reserve `-muted` for placeholders, disabled text and icons. |
| S6 | `badge / chip text-[11px] font-medium` | Settings status pills (~20 sites) are `font-semibold`; tinted fills at 11px need the weight. Interactive chips and filter toggles are `font-medium` | Two rows: **status badge** `text-meta font-semibold` (non-interactive, tinted fill); **chip** `text-meta font-medium` (toggle, filter, removable). |
| S7 | `empty title text-sm font-medium text-ink-secondary` | Correct, but the shared primitive `SettingsEmptyState.tsx:52` uses `text-ink` | Keep the spec; fix the primitive. |
| S8 | `form label`, `field value`, `button` | Match the code (xs medium secondary; sm medium ink; xs medium) | No change. |
| S9 | No row for stat figure, breadcrumb, menu item, tooltip, intro, field help, table cell, modal subtitle | Each exists in code with its own recipe | Add rows from §3 below. |
| S10 | `font-bold` "scarcer than the table suggests" | About 19 sites outside the dev catalog. 10 are headings, stat figures or badges and are in the fix list. The rest are chart labels (`LibraryTimelineView.tsx:549`, `RefMinimap.tsx:452`), document content (`DocumentRendition.tsx:46`) and inline emphasis (`DrawerFilesBody.tsx:212,246`, `TemplateStructure.tsx:184`, `ToCPanel.tsx:210`) | Say bold is for chart labels, document content and inline emphasis only; UI text tops out at `font-semibold`. |

## 3. Role by role

Counts are tags I could classify by reading and the tally script; they are "about" figures where noted.
"Rec." is the one recipe I recommend. Colours: `i` = `text-ink`, `i2` = `-secondary`, `i3` = `-tertiary`, `im` = `-muted`.

### 3.1 Page / panel / dialog title
- Spec: dialog `base semibold`; view titles `base+`.
- Code, dominant (Settings page bar, Modal, sheet, bulk-edit drawer, entity identity): `text-sm font-semibold i`.
  - `SettingsContent.tsx:169` (the h2 has no size of its own; it inherits `text-sm` from the wrapper at `:141`)
  - `Modal.tsx:265`
  - `MobileBottomSheet.tsx:271`
  - `LibraryBulkEditDrawer.tsx:37`
  - `EntityIdentity.tsx:55`
  - `ImagePickerModal.tsx:161`
- Deviations:
  - `import-csv/ImportListView.tsx:61` `sm` **bold**.
  - `import-csv/ImportDetailView.tsx:98` `base` **bold** mono.
  - `layout/NotificationsSlideOver.tsx:172` `base` semibold.
  - `agent/AgentModal.tsx:337` `base` semibold (Bert's own modal).
  - `views/LoginView.tsx:175` `2xl` semibold tracking-tight. Deliberate (full-page form); keep.
- **Rec.: `text-sm font-semibold text-ink`, truncating.** Spec S4.

### 3.2 Section heading and sub-heading (inside a body)
- Section heading, dominant `text-sm font-semibold i`: `SettingsSection.tsx:67`, `TemplateCardPreview.tsx:114`, `account/TwoFactorSetupModal.tsx:62`, `ImportDetailView.tsx:172,185`, `DrawerFilesBody.tsx:138`, `ToCPanel.tsx:92`, `BulkEditBody.tsx:177`.
- Deviations: `relationships/when/WhenBody.tsx:89,141` `sm medium`.
- Sub-heading (title inside a card or popover), `text-xs font-semibold i`: `TemplatePropertyPanel.tsx:411`, `relationships/SearchBar.tsx:103`. Deviation: `files/FileDrawer.tsx:290` `xs medium i2`.
- Facet heading in the Library filter panel: `text-tab font-bold i` at `LibraryFilters.tsx:459,575,783,919`; `text-tab font-semibold i2` at `shared/FacetSection.tsx:215`. Two weights and two colours for one role.
- **Rec.: section `text-sm font-semibold text-ink`; sub-heading `text-xs font-semibold text-ink`; facet heading `text-tab font-semibold text-ink` (so `bold` goes, and FacetSection:215 moves from `i2` to `i`).**

### 3.3 Caps label (section label, table header, stat label)
- Spec: section label 10px wide; table header 11px wider (S2, S3).
- Dominant (meta, semibold, uppercase, tertiary): `DataTable.tsx:123`, `SettingsTable.tsx:313`, `ImportTable.tsx:149`, `EntitiesTable.tsx:39`, `IssuesTable.tsx:30`, `SectionLabel` `group`, `NavMenuLinks.tsx:132`, `CreateEntityButton.tsx:109`, `TemplateSelect.tsx:263,269`, `ConnectionCardStack.tsx:62,92`, `RelationshipFieldEditor.tsx:78`, `EntityCard.tsx:599`.
- Deviations:
  - Size: `settings/SettingsSection.tsx:107` (SettingsStat label) `text-xs`; `SectionLabel` `section` level is `text-xs` (7 uses: `ImportDetailView.tsx:197,202`, `FileDetailEditor.tsx:146,257`, `FilesView.tsx:131,168`, `MetadataRecord.tsx:281`).
  - Weight: `StatsCard.tsx:31` medium; `ActivityLogPage.tsx:264` caption medium; `FileDetailEditor.tsx:279,380` medium; `HubRow.tsx:110`, `MatchModeToggle.tsx:71` normal.
  - Colour: `MetadataCard.tsx:64` `i2` (documented there as deliberate); `FileDetailEditor.tsx:279,380` `im`.
  - Tracking `wide` instead of `wider`: `SectionLabel.tsx:13`, `TemplateEditor.tsx:471`, `TemplatePropertyPanel.tsx:414`, `site/CodePageEditor.tsx:639`, `MatchedTerms.tsx:46`, `MediaFieldValue.tsx:57`, `FileDetailEditor.tsx:279,380`, `HubRow.tsx:110`, `MatchModeToggle.tsx:71`, `ActiveFiltersSheet.tsx:51`, `ManageRelationTypesModal.tsx:154`. `EntityTypeTag.tsx:48` uses `tracking-[0.08em]` (the only arbitrary tracking).
- **Rec.: `text-meta font-semibold uppercase tracking-wider text-ink-tertiary` for every caps label. Retire `SectionLabel` `section` level (12px) or map it to `group`.** Keep `MetadataCard:64` (`i2`) if Juan wants card headers one step darker; it is the only documented exception.

### 3.4 Field label (form)
- Spec and code agree: `text-xs font-medium text-ink-secondary` (`SettingsField.tsx:59`, `ModalParts.tsx:27`, `EditInput.tsx:38`, `CollectionPage.tsx:606,666`, `TemplatePropertyPanel.tsx:207,240`, `TemplateEditor.tsx:757`, `PreserveTokenEditor.tsx:271`, `ConfirmDelete.tsx:147`). Error variant swaps to `text-seal-label`.
- Deviations (filter-bar labels): `ActivityLogPage.tsx:179,201` `xs i3`; `:204,208` `xs i2` normal weight.
- Read-only field label (`MetadataCard.tsx:94`) is `xs i3` normal: a different role (display label), fine.
- **Rec.: no change; fix the 4 ActivityLog labels (`font-medium text-ink-secondary`).**

### 3.5 Intro, section description, field help, field message
- Intro (`SettingsIntro`, `SettingsListPage.tsx:26`), section description (`SettingsSection.tsx:71`), field description (`SettingsField.tsx:61`), toggle-card help (`CollectionPage.tsx:188,637`): all `text-xs i3`. Good.
- Deviations (`text-meta i3` where the others are `xs`): `TemplatePropertyPanel.tsx:94,234`, `CollectionPage.tsx:634` (caption), `ModalParts.tsx:259` (`ModalField` hint).
- `FieldMessage.tsx:51` (hint swapped with validation message on one line): `text-meta leading-4`. This is a validation/hint line, not help text. Fine.
- **Rec.: persistent help text = `text-xs text-ink-tertiary`; validation / swapped hint = `text-meta` (`FieldMessage`). Move the 4 listed `meta` help lines to `xs`.**

### 3.6 Input text
- Page forms: `text-sm` (`SettingsField.tsx:148,153,161`, `EditInput.tsx:50`, `MetadataView.tsx:615`, `MediaFieldEditor.tsx:227`, `BulkEditBody.tsx:250`, `TranslationEditor.tsx:158`, `ThesaurusEditor.tsx:680,748`, `LoginView` via `FORM_INPUT_LG`).
- Modals and toolbars: `text-xs` (`MODAL_INPUT` `ModalParts.tsx:20`, 52 uses; `MODAL_TEXTAREA`, `ModalSearchField:65`, `ActivityLogPage.tsx:161`, `FacetSection.tsx:260`, `BatchEntryModal.tsx:445`).
- Mixed: `font-medium` on some inline text inputs (`FiltersPage.tsx:231`, `TemplateEditor.tsx:455`, `LibraryFilters.tsx:821`, `DocumentSearchBody.tsx:105`, `AgentModal.tsx:582`, `SearchBar.tsx:62`).
- Field values are shown at `text-sm font-medium` in records (`MetadataCard.tsx:100`, `items.tsx:159`); typing into the same field at `xs` in a modal changes the size under the user's eyes.
- **Rec.: `text-sm` for every field input, weight normal, `text-ink`. Change `MODAL_INPUT` and `MODAL_TEXTAREA` to `text-sm` and raise `h-8` to `h-9`. Search inputs inside toolbars and facet lists stay `text-xs` (role "search input", denser by design).** Trade-off: modal list rows are `xs` (`ModalParts.tsx:125`), so a modal's field will be one step larger than its list. If Juan wants modals to stay dense, the alternative is the reverse: `text-xs` for all inputs, which changes 38 `SettingsField` uses and the entity edit form, which I do not recommend.

### 3.7 Table header
Consistent (§3.3). Only fix: nested tables `TemplateEditor.tsx:471`, `TemplatePropertyPanel.tsx:414` use `tracking-wide`.

### 3.8 Table cell, secondary cell, row title
- Rows are `text-sm` in `DataTable.tsx:201` ("Compact does NOT shrink the type", `DataTable.tsx:25`) and `SettingsTable.tsx:235`.
- Primary cell, Settings: `text-sm font-medium i` (`AccountPage.tsx:158`, `ExtractorEditor.tsx:167`, `ParagraphJobEditor.tsx:148`, `TemplatesPage.tsx:157`, `ThesauriPage.tsx:41`, `RelationTypesPage.tsx:35`, `UploadsPage.tsx:278`).
- Primary cell, Files / Import / Library: `FileTable.tsx:296` `xs medium`, `ImportTable.tsx:214` `xs medium`, `EntitiesTable.tsx:65` `xs medium`, `IssuesTable.tsx:57` `xs medium` mono. List-mode title in the same Files table is `sm medium` (`FileTable.tsx:234`; `ImportTable.tsx:91`). `FiltersPage.tsx:130,180` `sm` normal weight. `library/listColumns.tsx:71,221` inherits `sm medium`.
- Secondary cell: `xs i3` (about 15 sites: `FiltersPage.tsx:141`, `ExtractorEditor.tsx:190`, `PreserveTokenEditor.tsx:182`, `PreservePage.tsx:34`, `ActivityLogPage.tsx:381`, `UsersPage.tsx:105`, `PagesPage.tsx:69`, `MenuPage.tsx:211`, `UploadsPage.tsx:149,167`, `FileTable.tsx:302-321`, `ImportTable.tsx:215-238`, `EntitiesTable.tsx:66,67`, `IssuesTable.tsx:70`).
- Count cells at `sm i2 tabular`: `TemplatesPage.tsx:174`, `ThesauriPage.tsx:49`, `RelationTypesPage.tsx:49`, `ParagraphJobEditor.tsx:154`. `ActivityLogPage.tsx:379` user cell `xs i2`. `IssuesTable.tsx:58` issue text `xs i2`.
- **Rec.: primary cell `text-sm font-medium text-ink`; secondary / numeric cell `text-xs text-ink-tertiary tabular-nums` (the 4 count cells move to this).** Files and Import tables move their primary cells from `xs` to `sm` (rows are already `h-11`).

### 3.9 Row meta (line under a title)
- Dominant `text-meta i3` (`ListInfoRow.tsx:35`, `EntityCard.tsx:327`, `FileTable.tsx:237`, `ImportTable.tsx:94,105`, `NotificationsSlideOver.tsx:423`, `AggregateRow.tsx:231`).
- Deviations: `im` in `FileTable.tsx:244`, `FileDrawer.tsx:376,379,418,421,422`, `NotificationsSlideOver.tsx:318`, `DrawerFilesBody.tsx:271`, `HoverExpand.tsx:23`.
- **Rec.: `text-meta text-ink-tertiary`.** (`im` sites: appendix.)

### 3.10 Badge, pill, chip, count badge
- Status badge, tinted fill:
  - `text-meta font-semibold`, about 20 sites in Settings (`StatusPill.tsx:17`, `UsersPage.tsx:115,143,147`, `LanguagesPage.tsx:98,103,108`, `TemplatesPage.tsx:155`, `TemplateEditor.tsx:674`, `MenuPage.tsx:209`, `TranslationsPage.tsx:74`, `TranslationEditor.tsx:107`, `ExtractorEditor.tsx:197`, `ParagraphJobEditor.tsx:161`, `PreserveTokenEditor.tsx:172`, `ActivityLogPage.tsx:41`, `DashboardPage.tsx:102`, `IssuesTable.tsx:61`) and `files/FileDrawer.tsx:366`, `FileViewerModal.tsx:46`.
  - `text-meta font-medium`: `shared/StatusBadge.tsx:20`, `DocumentGroupCard.tsx:47,51`, `FileDetailEditor.tsx:260,354`, `PageHighlights.tsx:197`.
- Neutral tag (no tint weight): `text-meta` normal `i2` (`UsersPage.tsx:129`, `TemplateEditor.tsx:681`, `CardValue.tsx:62`, `NotificationsSlideOver.tsx:414`). Fine.
- Chip, interactive: `text-meta font-medium` (`ToggleChip.tsx:52`, `ActiveFilterChip.tsx:20`, about 40 sites). Fine.
- Count badge: `CountBadge.tsx:13` `text-xs font-medium` (spec: identity pills xs). `TabCount.tsx:14` `xs semibold`. `FacetSection.tsx:221` `meta semibold carbon`. `NotificationsSlideOver.tsx:174` `meta bold`.
- **Rec.: status badge `text-meta font-semibold`; chip `text-meta font-medium`; count badge `text-xs font-medium`.** Spec S6. Fix: `StatusBadge.tsx:20`, `DocumentGroupCard.tsx:47,51`, `FileDetailEditor.tsx:260,354`, `PageHighlights.tsx:197` to semibold; `TabCount.tsx:14` to medium; `NotificationsSlideOver.tsx:174` bold to semibold.

### 3.11 Stat number and label
- Number: `StatsCard.tsx:44` `xl semibold` (Dashboard, 4 uses); `SettingsSection.tsx:108` `lg semibold` (7 uses); `ImportDetailView.tsx:247` `2xl bold`; `ImportListView.tsx:130` `sm semibold`.
- Label: `StatsCard.tsx:31` meta medium caps; `SettingsSection.tsx:107` xs medium caps; `ImportDetailView.tsx:246` meta normal not caps.
- **Rec.: number `text-xl font-semibold text-ink tabular-nums`; label = caps label (§3.3). Fix `SettingsSection.tsx:107-108`, `StatsCard.tsx:31`, `ImportDetailView.tsx:246-247`, `ImportListView.tsx:130` (keep `sm` there only if it is an inline count in a toolbar; it is, so leave it).** `StatsCard.tsx:44` colours the value `-tertiary` when there is no accent or caption; keep that.

### 3.12 Empty state
- Block empty with title: `sm medium` with `i` (`SettingsEmptyState.tsx:52`), `i2` (`ImportEmptyState.tsx:17`, `FileDrawer.tsx:133`, `NotificationsSlideOver.tsx:336`). Spec: `i2`.
- Block empty with no weight: `text-sm i3` (`RelationshipsPanelBody.tsx:79`, `RelationshipsTreeView.tsx:81`, `RelationshipsGraphView.tsx:529`, `WhenBody.tsx:76`, `site/shared.tsx:199`); `text-sm im` (`LibraryView.tsx:1253,1263,1272,1318,1347`, `LibraryTimelineView.tsx:93`, `FileViewerModal.tsx:154`, `DocumentViewer.tsx:577,582`, `EntityDrawer.tsx:101`).
- Empty hint: `xs i3` (`SettingsEmptyState.tsx:56`); `xs im` (`FileDrawer.tsx:134`, `NotificationsSlideOver.tsx:339`).
- One-line "No …": `xs i3` (14: `ThesaurusEditor.tsx:520`, `CodePageEditor.tsx:577`, `DashboardPage.tsx:97`, `ActivityLogPage.tsx:283`, …); `xs im` (about 25: `SettingsTable.tsx:219`, `DataTable.tsx:264`, `TemplateEditor.tsx:545`, `NewImportModal.tsx:180`, `AgentModal.tsx:588`, `LibraryDisplayMenu.tsx:154`, `LibraryFilters.tsx:840`, `FacetSection.tsx:281`, …); `meta im` (`LibraryTimelineView.tsx:765`, `ResultsMainView.tsx:380,1014`, `MatchOrigin.tsx:319`).
- **Rec.: block empty title `text-sm font-medium text-ink-secondary`; hint `text-xs text-ink-tertiary`; one-line empty `text-xs text-ink-tertiary`.** Fix list below moves every `im` / unweighted case.

### 3.13 Button, link-button, nav button, tab, segmented control
- Button: `text-xs font-medium` is the rule (95 plain, plus `MODAL_BUTTON` `Modal.tsx:325`, `FOOTER_BUTTON` `LibraryFilters.tsx:549`, `SettingsButton` `sm`). Match.
- Deviations:
  - `settings/SettingsButton.tsx:52` `md` `text-sm` (used once).
  - `import-csv/ImportTable.tsx:120,250` `meta medium` bordered buttons (row actions): a chip-sized button with a border, a third button look.
  - `shared/SheetDone.tsx:7`, `LoginView.tsx:270`, `Navbar.tsx:563,656,688,696,704` are `sm medium`: phone sheet / login / mobile menu (touch sizes). Keep; add "touch button" to the spec.
- Nav button (navbar, settings rail, nav menu): `text-tab font-medium` (`Navbar.tsx:218-449`, `SettingsNav.tsx:118,198`, `NavMenuLinks.tsx:57,91`). Consistent.
- Tab strip: `TAB_BUTTON` `text-tab font-medium` (`tabStrip.ts:23`). `files/FileDrawer.tsx:112` is a copy of it (`px-3 py-1.5 text-tab font-medium`) rather than the constant. Segmented control: `xs medium` (`SegmentedTabs.tsx:24`, `SegmentedControl.tsx:57`). Fine.
- Link-style button: `xs i2 underline` (`CodePageEditor.tsx:309`, `FacetSection.tsx:360,370`); `ToCPanel.tsx:100` `xs i3` no underline. Fine.
- **Rec.: no change to the button recipe. Make `FileDrawer.tsx:112` use `TAB_BUTTON`.**

### 3.14 Menu item
- Popover item: `text-xs`, `i2` hover `i`, normal weight (`FileTable.tsx:478`, `DocMeta.tsx:134`, `CreateEntityButton.tsx:114`, `SelectionActionsMenu.tsx:50`, `AgentModal.tsx:601`, `LibraryDisplayMenu.tsx:222`). Selected: `font-semibold` (`DocMeta.tsx:136`, `Select.tsx:259`).
- Deviations: `MobileActionMenu.tsx:182,199` `xs medium`; `AgentModal.tsx:377,628` `xs medium`. Phone sheets use `sm` (`Select.tsx:219` selected `sm semibold`, `LibraryDisplayMenu.tsx:222` mobile `text-sm`). Intentional.
- **Rec.: `text-xs text-ink-secondary` (hover `text-ink`), selected `font-semibold text-ink`; phone sheet items `text-sm`.** Fix: weights at the 4 sites.

### 3.15 Modal subtitle, modal body text
- Subtitle `text-meta i3` truncating, inline after the title (`Modal.tsx:272`). Match.
- Body message: `sm i` (`ConfirmDelete.tsx:130`, `TypedConfirmModal.tsx:77`); `sm i2` (`ConfirmDialog.tsx:69`). Impact list `sm i2` (`ConfirmDelete.tsx:136`, `TypedConfirmModal.tsx:83`). Rows in modal lists `xs` (`ModalParts.tsx:125`).
- **Rec.: confirm message `text-sm text-ink`; supporting list `text-sm text-ink-secondary`. Fix `ConfirmDialog.tsx:69` to `text-ink`.**

### 3.16 Breadcrumb
- Settings: `text-sm`, `i3` links, `i3` current, separator `im` (`SettingsContent.tsx:141-163`); title beside it `semibold`.
- Layout (`Breadcrumb.tsx:10-19`, used by Import): `text-tab font-medium`, links `text-carbon`, current `text-carbon`, ancestors `i3`.
- Two sizes and the Import one uses carbon for a plain link (carbon is the data accent in CLAUDE.md).
- **Rec.: `text-sm` in the 3rem title bar, ancestors `text-ink-tertiary`, hover `text-ink`; Import uses the same. Change `Breadcrumb.tsx:10` to `text-sm` and `:16,:18` to `text-ink-tertiary` / `text-ink`.** If Juan prefers the 13px look, the other way is `text-tab` in Settings; the 3rem bar title is 14px so `sm` keeps one baseline.

### 3.17 Tooltip
- `Hint.tsx:111`: `text-meta font-normal`, `text-paper` on `bg-ink`. `share/ShareEntityModal.tsx:41` is a second tooltip style (`meta medium i`, bordered paper). `MatchOrigin.tsx:238` role=tooltip carries no size of its own. HTML tooltips in the graph (`RelationshipsGraphView.tsx`) not read in detail.
- **Rec.: `Hint` is the tooltip; `ShareEntityModal.tsx:41` should use it or document why not.** Size already right.

### 3.18 Card title, field value, prose, caption
- Card title `text-sm font-semibold i leading-snug`: `EntityCard.tsx:324,517`, `EntityIdentity.tsx:55`, `DrawerFilesBody.tsx:138`. Match.
- Field value `text-sm font-medium i`: `MetadataCard.tsx:100`, `items.tsx:159`. Match.
- Deviations: `files/FileDrawer.tsx:374,416` file title `xs medium` (§3.8 says `sm medium`); `relationships/RelatedDocCard.tsx:19` `sm` normal; `layout/NotificationsSlideOver.tsx:306,394` `text-tab font-medium`.
- `AggregateRow.tsx:164` (`xs medium`) and `:199,217` (`sm medium`) vary with the Relationships zoom setting. Intentional; leave.
- **Rec.: unchanged; fix `FileDrawer.tsx:374,416` → `text-sm font-medium`, `RelatedDocCard.tsx:19` → `font-medium`, `NotificationsSlideOver.tsx:306,394` → `text-sm font-semibold`.**

### 3.19 Roles I did not enumerate to the line
Bert message bubbles (`sm`), Beacon (`xs medium` / `meta semibold`), Library result snippets, relationships graph labels, viewer ActionBar. They sit within the scale; I sampled, not exhaustively. `viewer/ActionBar.tsx:98,102,133` use `text-tab font-semibold` for page numbers and `:122,128,142` `tab medium` for prev/next, which differs from the `meta` page tag (`PageTag`) used elsewhere; flag for Juan, not changed here.

## 4. Fix list by file (for one implementer)

Group A is mechanical (no judgement). Group B changes sizes in a visible way and wants a screenshot pass. Line numbers are current.

### Group A — weight, colour, tracking
- `components/shared/SectionLabel.tsx:13` — `group`: `tracking-wide` → `tracking-wider`. `:14` `section`: `text-xs` → `text-meta` (or remove the level and map its 7 callers to `group`).
- `components/shared/StatsCard.tsx:31` — label `font-medium` → `font-semibold`.
- `components/shared/StatusBadge.tsx:20` — `font-medium` → `font-semibold`.
- `components/shared/TabCount.tsx:14` — `font-semibold` → `font-medium`.
- `components/shared/FacetSection.tsx:215` — `font-semibold text-ink-secondary` → `font-semibold text-ink`.
- `components/shared/ConfirmDialog.tsx:69` — `text-ink-secondary` → `text-ink`.
- `components/settings/SettingsEmptyState.tsx:52` — `text-ink` → `text-ink-secondary`.
- `components/settings/SettingsContent.tsx:169` — add `text-sm` to the h2 (it inherits it from `:141`).
- `components/settings/pages/TemplateEditor.tsx:471` and `TemplatePropertyPanel.tsx:414` — `tracking-wide` → `tracking-wider`.
- `components/settings/pages/site/CodePageEditor.tsx:639` — `tracking-wide` → `tracking-wider`.
- `components/settings/pages/ActivityLogPage.tsx:179,201` — `text-xs text-ink-tertiary` → `text-xs font-medium text-ink-secondary`; `:204,208` add `font-medium`; `:264` caption `font-medium` → `font-semibold`.
- `components/import-csv/ImportListView.tsx:61` — `font-bold` → `font-semibold`.
- `components/import-csv/ImportDetailView.tsx:98` — `text-base font-bold` → `text-sm font-semibold`; `:246` label → caps label recipe; `:247` `text-2xl font-bold` → `text-xl font-semibold`.
- `components/layout/NotificationsSlideOver.tsx:172` — `text-base` → `text-sm`; `:174` `font-bold` → `font-semibold`; `:306,394` `text-tab font-medium` → `text-sm font-semibold`; `:318,339` `text-ink-muted` → `text-ink-tertiary`.
- `components/library/LibraryFilters.tsx:459,575,783,919` — `font-bold` → `font-semibold`; `:716` `font-bold` (when `bold`) → `font-semibold`.
- `components/shared/MatchModeToggle.tsx:44` — `font-bold` → `font-semibold`; `:71` add `font-semibold`, `tracking-wide` → `tracking-wider`.
- `components/files/DocumentGroupCard.tsx:47,51` and `FileDetailEditor.tsx:260,354` and `viewer/PageHighlights.tsx:197` — badge `font-medium` → `font-semibold`.
- `components/files/FileDetailEditor.tsx:279,380` — `font-medium text-ink-muted … tracking-wide` → `font-semibold text-ink-tertiary … tracking-wider`.
- `components/relationships/rows/HubRow.tsx:110`, `components/metadata/MediaFieldValue.tsx:57`, `components/library/MatchedTerms.tsx:46`, `components/library/ActiveFiltersSheet.tsx:51`, `components/relationships/ManageRelationTypesModal.tsx:154` — `tracking-wide` → `tracking-wider` (add `font-semibold` and `text-meta` where missing: HubRow, MatchModeToggle).
- `components/layout/MobileActionMenu.tsx:182,199`, `components/agent/AgentModal.tsx:377,628` — menu item `font-medium` → normal weight.
- `components/files/FileDrawer.tsx:112` — use `TAB_BUTTON` (`layout/tabStrip.ts:23`) instead of the copied string.
- `components/relationships/when/WhenBody.tsx:89,141` — `font-medium` → `font-semibold`.
- `components/relationships/RelatedDocCard.tsx:19` — add `font-medium`.
- `components/relationships/RelationshipsPanelBody.tsx:79`, `RelationshipsTreeView.tsx:81`, `RelationshipsGraphView.tsx:529`, `relationships/when/WhenBody.tsx:76`, `settings/pages/site/shared.tsx:199` — empty message `text-sm text-ink-tertiary` → `text-sm font-medium text-ink-secondary`.
- Table first cells that lack weight: `settings/pages/FiltersPage.tsx:130,180` add `font-medium`.
- Count cells → secondary cell: `TemplatesPage.tsx:174`, `ThesauriPage.tsx:49`, `RelationTypesPage.tsx:49`, `ParagraphJobEditor.tsx:154` — `text-sm text-ink-secondary tabular-nums` (or inherited) → `text-xs text-ink-tertiary tabular-nums`.
- Help text → xs: `TemplatePropertyPanel.tsx:94,234`, `CollectionPage.tsx:634`, `ModalParts.tsx:259` — `text-meta` → `text-xs`.
- Stat: `settings/SettingsSection.tsx:107` → `text-meta font-semibold uppercase tracking-wider text-ink-tertiary`; `:108` `text-lg` → `text-xl`.
- Breadcrumb: `layout/Breadcrumb.tsx:10` `text-tab` → `text-sm`; `:16,18` `text-carbon` → `text-ink-tertiary` (link, hover `text-ink`) / `text-ink` (current).

### Group B — size changes, check visually
- `components/shared/ModalParts.tsx:20` `MODAL_INPUT`: `h-8 px-2.5 text-xs` → `h-9 px-2.5 text-sm`; `:30` `MODAL_TEXTAREA` `text-xs` → `text-sm`. Affects 52 call sites; inputs only, not search inputs (`ModalSearchField:65` stays `xs`). Check `BatchEntryModal.tsx:445` grid cells separately (keep `xs`).
- `components/files/FileTable.tsx:296`, `components/import-csv/ImportTable.tsx:214`, `EntitiesTable.tsx:65`, `IssuesTable.tsx:57` — primary cell `text-xs font-medium` → `text-sm font-medium`; `components/files/FileDrawer.tsx:374,416` file title `text-xs` → `text-sm`.
- `components/agent/AgentModal.tsx:337` — `text-base` → `text-sm` (optional; Bert is the documented modal exception).
- `components/import-csv/ImportTable.tsx:120,250` — row action button `text-meta font-medium` with border → decide: `text-xs font-medium BAR_GHOST` (matches buttons) or keep as chip. I recommend the bar-ladder button.
- `components/shared/FiltersButton.tsx:49` — `fontSize: 9` → 11 (size the badge to `minWidth: 16, height: 16`).
- `components/library/LibraryMapView.tsx:219` — `7 / zoom`: this is the pin cluster count on a map; leave if pins are too small for 11px, otherwise raise. Needs Juan's call.

### Group C — retire `text-ink-muted` for text
See §5 and the appendix. Replace `text-ink-muted` with `text-ink-tertiary` at every listed site except placeholders, disabled text and icons.

## 5. Colour: muted text

- `--text-muted` is `#777777` (light) and `#8A857C` (dark). Contrast: 3.95:1 on parchment `#F5F0E8`, 4.48:1 on white; dark: 4.75:1 on `#1A1A1A`, 4.23:1 on `#242424`. All fail AA (4.5:1) for normal-size text in at least one common ground.
- `text-ink-muted` occurs 262 times in non-catalog code. Excluding placeholders and icons, 89 are text sites at `meta`, `xs`, `sm` or `tab` (list below). `-tertiary` is `#555555` (6.57:1 on parchment) and is already what 14 of the one-line empty states use.
- **Rec.: text never uses `-muted`. It stays for `placeholder:`, disabled controls and icon strokes.** Spec S5.

Text sites using `text-ink-muted` (line numbers with the size class on that line):

```
components/agent/AgentModal.tsx: 339(meta), 457(xs), 588(xs)
components/files/AddFileDropArea.tsx: 182(xs)
components/files/AddFileModal.tsx: 283(xs), 300(xs)
components/files/DrawerFilesBody.tsx: 211(xs), 271(meta)
components/files/FileDetailEditor.tsx: 279(meta), 380(meta)
components/files/FileDrawer.tsx: 134(xs), 284(xs), 376(meta), 379(meta), 418(meta), 421(meta), 422(meta)
components/files/FileTable.tsx: 244(meta), 258(xs)
components/files/FileViewerModal.tsx: 154(sm)
components/import-csv/EntitiesTable.tsx: 86(xs)
components/import-csv/IssuesTable.tsx: 78(xs)
components/import-csv/NewImportModal.tsx: 180(xs)
components/layout/NotificationsSlideOver.tsx: 292(meta), 318(meta), 339(xs)
components/layout/ThemeToggle.tsx: 32(meta)
components/library/BatchEntryModal.tsx: 651(meta), 824(meta)
components/library/LibraryDisplayMenu.tsx: 154(xs)
components/library/LibraryFilters.tsx: 840(xs)
components/library/LibrarySelectionBar.tsx: 272(meta)
components/library/LibraryTimelineView.tsx: 93(sm), 114(meta), 739(meta), 765(meta), 848(meta), 852(meta), 910(meta)
components/library/MatchOrigin.tsx: 319(meta)
components/library/ResultsSnippets/ResultsBody.tsx: 166(sm), 180(sm), 195(xs)
components/library/ResultsSnippets/ResultsMainView.tsx: 235(sm), 241(sm), 255(xs), 380(meta), 597(xs), 705(meta), 706(meta), 1014(meta), 1135(meta), 1157(meta)
components/library/SelectionActionsMenu.tsx: 76(meta)
components/library/TimeBrush.tsx: 208(meta)
components/metadata/CopyFromPicker.tsx: 390(xs)
components/metadata/InheritedValue.tsx: 106(sm)
components/metadata/MetadataRecord.tsx: 236(xs)
components/metadata/RelationshipFieldEditor.tsx: 96(xs), 182(xs)
components/relationships/CreateRelationshipModal.tsx: 320(xs)
components/relationships/EntityDrawer.tsx: 101(sm)
components/relationships/TemplateStructure.tsx: 37(xs), 42(meta)
components/search/DocumentSearchBody.tsx: 126(xs)
components/settings/SettingsTable.tsx: 219(xs)
components/settings/pages/CollectionPage.tsx: 226(xs)
components/settings/pages/CustomisationPage.tsx: 125(sm)
components/settings/pages/FiltersPage.tsx: 151(xs)
components/settings/pages/TemplateEditor.tsx: 545(xs)
components/settings/pages/languages/InstallLanguagesModal.tsx: 43(xs)
components/settings/pages/site/CodePageEditor.tsx: 257(sm)
components/shared/DataTable.tsx: 264(xs), 273(xs)
components/shared/FacetSection.tsx: 281(xs)
components/shared/TemplateSelect.tsx: 231(sm), 275(xs)
components/viewer/DocumentViewer.tsx: 577(sm), 582(sm)
components/viewer/HoverExpand.tsx: 23(meta)
views/LibraryView.tsx: 1253(sm), 1263(sm), 1272(sm), 1318(sm), 1347(sm)
views/MetadataView.tsx: 944(sm), 955(xs), 1019(xs), 1597(sm)
```

(Some of these are decorative or a file-extension glyph such as `ThemeToggle.tsx:32` and `AgentModal.tsx:339` (keyboard shortcut); keep those if the tint is intended as quiet.)

## 6. What I verified and what I assume

Verified by reading the code at 956db631:
- The off-scale facts in §1 (grep of every `text-[` form and every `fontSize` / `font-size`).
- Every size / weight / colour I cite with a line number.
- The contrast ratios (computed from `tokens.css` values).
- Counts for buttons, inputs, headings, uppercase labels, badges, menu items, empty states: from the tag-reading script (the counts say "about" where a few tags were unclassifiable).

Not verified:
- Nothing was rendered; I did not check how any change looks or where a size change would reflow a row or a truncating header.
- Library, Bert, Beacon, relationships and viewer surfaces were sampled, not read to the last line (§3.19).
- Whether Juan wants modal inputs at 14px (§3.6) is a design call, not a bug; the alternative is stated there.
- The tooltip survey (§3.17) covers `Hint` and the Share modal only.
- `utils/sitePageRender.ts` (published-site CSS) was excluded as a separate document.
