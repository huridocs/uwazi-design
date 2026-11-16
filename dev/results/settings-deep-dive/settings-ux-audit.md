# Settings deep dive, phase 1: UX audit

Date: 2026-10-04. Branch: `origin/playground` at `f4d0d5b5`, served from a clean export on port 1439. No code was changed.

## What was checked

- **Pages and editors.** All 18 Settings pages in `components/settings/pages/`. Opened in the browser: the editors for templates (with the property dialog), thesauri, users, groups, menu links, pages (the code page editor and the "New page" picker), translations, extractors and Preserve sources, plus the Install language dialog and the delete confirmation. ParagraphJobEditor could not be opened by script, so it was reviewed in code only.
- **Viewports and themes.** Every page at 1440×900 and 390×844, in light and dark (72 captures). The editors were captured in light, and the template editor, property dialog, thesaurus editor, install dialog and confirm dialog in dark too.
- **States.**
  - Empty, loading and overflow: Travesía corpus opened straight into Settings (loading, read as empty), and its 2,443-value "Municipios" thesaurus on desktop and phone.
  - Save feedback: Collection saved, Beacon readout watched.
  - Dirty-state guard: template name edited, then a rail click and Back.
  - Write-back: user edited, then saved.
  - Gutters: `window.__gutter()` on seven pages.
- **Code review.** `SettingsContent`, `SettingsNav`, `SettingsTable`, `SettingsButton`, `RowActions`, `DragGrip`, `useReorder`, `ConfirmDialog`, `Modal`, `warmButton.ts`. A reader agent did a per-file pass on the remaining pages; its file:line claims were spot-checked against the code, and the visible ones against the screenshots.
- **Figma.** "Uwazi v3 — Screens" (`5VSISGr1dSEKi1dGG5Noft`) now has one page, "Design System". It holds no Settings screens. The comparison below uses its components: ToolsSidebar, ToolsActionBar, Dialog, EmptyState, Button. Exports are in `figma/`.

Screenshots are in `raw/` (`<page>-<desk|phone>-<light|dark>.png` and `flow-*.png`) and `crops/`.

---

## Summary: what to fix first

These are ordered by how much they cost an admin.

1. **Editors lose work without warning.** No Settings editor registers with the dirty guard (`useRegisterDirtyForm` is used nowhere in `components/settings`). I renamed a template, then clicked "Thesauri" in the rail. The app navigated away and the edit was gone, with no dialog (`raw/flow-dirty-guard-light.png`). Back and Cancel do the same.
2. **Most saves do not save.** UserEditor, GroupEditor, TranslationEditor, MenuLinkEditor, RelationTypeEditor, PreserveTokenEditor, ExtractorEditor and ParagraphJobEditor show a toast, close, and write nothing back.
   - Verified: I renamed `mlopez` to `mlopez2` and saved. The toast said saved, but the list still says `mlopez`.
   - TemplateEditor saves the name and colour only, not the properties.
   - Only CodePageEditor and ThesaurusEditor persist.
   - For a prototype this matters because every demo of an edit flow ends in a visible contradiction.
3. **Destructive actions with no confirmation**, in a product where the data is legal evidence:
   - deleting a template property, which in Uwazi deletes that value on every entity of the template
   - removing a thesaurus value or group
   - removing a filter group
   - removing a menu sub-link
   - revoking an API key
   - disabling 2FA
   - Reset in Global CSS & JS
   - Discard in the page editor
   - "Accept all" in an extractor
   - changing the default language

   Deleting a whole template or thesaurus is confirmed; the finer-grained deletes are not.
4. **Phone breaks the two most important editors.**
   - In the template editor at 390px the property-name column collapses to zero width. The table shows Type / Required / Filter / Cards with no property names (`crops/phone-property-name-collapsed.png`). The cause is `PROPERTY_COLUMNS` = `minmax(0,1fr) 8rem 5rem 3.5rem 3.5rem 4rem`, which leaves the first track nothing on a phone.
   - Every SettingsTable scrolls sideways on a phone (the Users table is 656px wide on a 390px screen), so Delete and the right-hand columns sit off-screen.
5. **Long lists are not workable.** The 2,443-value thesaurus renders 2,443 inline inputs with no search, no sort, no jump-to-letter, no collapse and no import (`raw/flow-thesaurus-long-desk-light.png`). "Add item" appends at the bottom, 2,443 rows below the button. No list page has search, except Activity log, Uploads and the language picker. No page has bulk selection.
6. **Action bars are off the ladder.** `SettingsButton` gives `primary` and `secondary` the same `WARM_BUTTON`, which includes `WARM_EDGE`. As a result:
   - Every footer lead ("Add user", "Add template") is a warm button with an inset ring. The ladder in `warmButton.ts` says bar buttons carry no ring, and a lead with no commit is `BAR_LEAD`.
   - Commits are green `success` everywhere, including "Create template", "Invite user", "Add property" and "Add item". `warmButton.ts` allows green only on a Save, and the shared Modal commits in ink.
   - So one Settings flow can show green, ink and seal commits within two clicks: the property dialog, then ConfirmDialog, then the "New page" picker.
7. **Two hand-rolled overlays bypass `Modal`.** PropertyDialog (`TemplateEditor.tsx`, 26rem, which is not on the width scale) and the Install language dialog (`LanguagesPage.tsx`). Neither traps focus, registers a sheet layer or goes full screen on a phone, and both handle Escape on `window`. The property dialog on a phone is a centred card, not a sheet (`raw/flow-property-dialog-phone-light.png`).
8. **Loading reads as empty.** Opening Settings on Travesía before the corpus loads shows "Nothing here yet." on Thesauri, where the corpus has 98 thesauri. An admin would believe the data is gone.

---

## Shared patterns every page should use

Settings has three kinds of page. Each kind should look and behave the same everywhere.

### 1. List page (Templates, Thesauri, Users, Relationship types, Menu, Pages, Preserve, Metadata extraction, Paragraph extraction, Languages, Translations, Uploads)

- **Header.** 3rem `SettingsContent.Header`, title only, as now. The one-line description moves into the header as an inline subtitle (the `Modal` header pattern), or stays as the first body line, but in one place on every page. Today Templates, Thesauri, Filters and others put it in the body. Users and Dashboard have none.
- **Toolbar row, always mounted.** A `SearchBar` on the left. On the right, filters where they mean something (role and group for users; type for translations; status for extractors). The row's height is fixed whether or not it holds anything.
- **Table.** `SettingsTable` with:
  - a checkbox column for bulk selection
  - a row target that opens the editor (exists)
  - row actions on hover with `group-focus-within`. Today pencil and trash show on every row at all times; that is twelve icons on Templates.
  - The pencil is redundant with the row target. Keep only the overflow or trash.
- **Footer (action bar).** The lead create action is `BAR_LEAD` ("Add template"). When rows are selected, the bar switches to the selection state: a count in a fixed slot, then `BAR_GHOST` actions, `BarDivider`, and `BAR_DANGER` "Delete". This is the Figma ToolsActionBar/Selection pattern, restyled to the current ladder.
- **Empty state.** Every list passes an `emptyState` that names the object and offers the create action ("No thesauri yet. Add one to give a property a fixed list of values."). "Nothing here yet." is the generic fallback seen today.
- **Loading state.** Skeleton rows at the table's row height while a corpus loads. The empty message waits for the data.

### 2. Form page (Account, Collection, Filters, Global CSS & JS)

- **Width.** Fields capped at a readable width, about 40rem for the form column. On Account and Collection, fields share the full 1,158px host; "Current password" alone spans all of it (`raw/account-desk-light.png`).
- **Sections.** Each one is h3 + one-line description + fields, separated by a soft rule. This exists and is good.
- **One save per page**, in the footer: ghost "Discard changes", then the commit. The commit is enabled only when dirty and resets after save.
  - Account breaks this. It has four inline save buttons, and Profile has none, so username and email edits cannot be saved at all.
  - Collection, Filters and Customisation compare dirty state with the seed, so Save stays enabled after saving. Verified on Collection.
- **Dirty guard** registered on every form page.

### 3. Editor (list → detail)

- **Header.** Breadcrumb + title, back arrow (exists).
- **Footer.** `BAR_GHOST` Cancel, then the commit. Secondary actions such as "Add property" belong to the section they act on, as "Add sub-link" and "Add item" already are, not to the bar.
- **Save writes back** to the list, then returns to the list with the row briefly highlighted.
- **Dirty guard** on Back, Cancel, rail clicks and navbar clicks, through `useRegisterDirtyForm`. The guard already exists for the entity edit form.
- **Child objects** (a property, a link, a value) edit in a `Modal` (`md`, full screen on phones), never a hand-rolled overlay.

### Across all three

| Rule | Today | Should be |
|---|---|---|
| Commit button | green `success` for every commit; ink in shared Modals | One rule. Recommendation: ink (`COMMIT_FILL`) for every commit, matching Modal and Figma's Dialog. Green only if Juan wants Save to stay green, and then only on "Save". |
| Lead action | `WARM_BUTTON` + inset ring | `BAR_LEAD`, no ring |
| Destructive | trash icon → ConfirmDialog for whole objects only; immediate for children | ConfirmDialog for anything that deletes stored data. Child rows inside an unsaved editor may delete immediately if Undo is offered in the Beacon. |
| Save feedback | Beacon readout "Collection settings saved" (works, `raw/flow-save-feedback-light.png`) | Keep. Add an error path: no page simulates a failed save. |
| Rail active item | `bg-vellum` + semibold (`SettingsNav.tsx`) | CLAUDE.md says active sidebar = `bg-warm text-ink`. One of them changes; vellum reads yellow next to parchment rows. |
| Inline-style borders | `style={{ borderTop: "1px solid var(--border-soft)" }}` in most pages | `border-t border-border-soft` |
| Drag reorder | HTML5 drag only, no keyboard, unreliable on touch (`useReorder`) | Grip + up/down buttons, as Filters already does, or a keyboard-operable sortable. Needed for templates, thesauri, menu and filters. |
| Create verbs | Add / New / Create / Install mixed in one flow (Pages: "Add page" → "New page" → "Create page") | "Add <object>" on the bar, "New <object>" as the editor title, "Add" or "Save" as the commit |

---

## Per-page findings

### Navigation (`SettingsNav`, `atoms/settings.ts`)
- **The rail shows one group: the one you came in through.**
  - Account sits alone in a 250px rail with nothing else (`raw/account-desk-light.png`).
  - Moving from Users to Uploads means going back to the navbar Tools menu.
  - Juan has accepted this before, but admins move between Templates, Thesauri and Filters constantly, which works, and between Templates and Metadata extraction, which does not, because they sit in different groups.
- **System is a flat list of 11 items.** Grouping into Collection (Collection, Menu, Pages, Uploads, Global CSS & JS), Content model (Templates, Thesauri, Relationship types, Filters), Languages (Languages, Translations) and People (Users & Groups) would match how an admin thinks. Figma's ToolsSidebar already groups "Metadata" apart from "Tools".
- **Labels.**
  - "Users & Groups" and "Global CSS & JS" use ampersands. Elsewhere copy is plain sentence case.
  - The file is `CustomisationPage` and the label is "Global CSS & JS". One name is enough.
- **Phone.** The rail-first drill-in works (`raw/flow-rail-phone-light.png`). The back chevron is in the header.

### Account
- Profile has editable username and email with no save.
- Password, 2FA and keys each have their own inline button. "Update password" in green sits mid-page.
- "Disable" 2FA is an immediate seal-filled button with no confirm.
- Revoke key has no confirm.
- A generated key shows masked (`uwz_live_••••3f9a`). Real key creation shows the full token once, with a copy action and a "you won't see this again" line.
- "Current password" spans the full 1,158px.

### Dashboard
- Stat cards and a recent activity table. It reads well in both themes.
- The cards are not links. "Users 5" should open Users.
- On CEJIL the activity block becomes a paragraph about the data source. That is prototype plumbing showing in the UI.

### Users & Groups (`UsersPage`, `UserEditor`, `GroupEditor`)
- **Tabs and table.**
  - The Users/Groups tabs are a segmented control on paper. That is fine.
  - Role badges: Admin uses the seal tint. Seal is for danger only, and admin is not danger. Use ink or vellum.
  - Row actions are hand-rolled copies of `RowActions`.
- **Missing for an admin:** search, filter by role or group, bulk select (delete, add to group, change role), last login and status (invited or active), resend invitation. With 200 users this page is a scroll.
- **UserEditor.**
  - Save does not write back (verified).
  - Groups are big bordered cards. Fine at 3 groups, not at 30.
  - "Reset" 2FA has no confirm.
- **GroupEditor.** The member list renders every user as a card, with no search and no select-all.
- **Phone.** The table scrolls sideways and Groups is cut off (`raw/users-phone-light.png`).

### Collection
- Thinner than Uwazi's real Collection page, which also covers logo, favicon, date format, map provider and default map position, contact and sender emails, analytics, allowed public-form templates and OCR.
- "Custom landing page" is free text with no validation.
- Save stays enabled after saving (verified). There is no Discard.

### Menu (`MenuPage`, `MenuLinkEditor`)
- Top-level links cannot be reordered. Reordering is the main thing a menu admin does.
- Groups show as flat rows, with sub-links only inside the editor. A tree (group → links) on the list itself would show the menu as visitors see it.
- The editor seeds every group with the same two hardcoded sub-links.
- Removing a sub-link is immediate. Sub-link drag has no keyboard path.
- "Label" at the top and "Title" in sub-rows name the same field. "Add link" and "Add item" also name the same thing.

### Pages (`PagesPage`, `site/CodePageEditor`)
- The strongest editor in Settings. It persists, tracks dirty state, has the Draft/Published status, per-language tabs and a live preview (`raw/flow-page-editor-light.png`). The "New page" picker uses `Modal` correctly.
- **Problems.**
  - A page chosen in the picker is added to the list before saving, so Cancel leaves an orphan row.
  - Slug edits are not saved.
  - Discard reverts immediately.
  - "Copy from…" overwrites the target language's draft with no confirm.
  - Status reads "Published · edited" in the list and "Published · draft has changes" in the editor.
  - `text-[12px]` code text, while Global CSS & JS uses `text-sm`, so the two code editors differ.
- **Footer.** Three commit levels (Discard, Save draft, Publish), the only footer with more than one commit. That is right for publishing, but Save draft needs the ghost rung and Publish the ink rung.

### Languages
- **Columns.** "Default", "Reset" and "Uninstall" are action columns with a header each. "Set" in carbon text is the action to make a language default.
  - Better: one row menu with "Make default", "Reset translations", "Uninstall", and the default shown as a badge.
  - "English English" repeats when the native name equals the English name.
- **Behaviour.**
  - Changing the default language is immediate, with no confirm, though it changes what every visitor sees.
  - Install opens a hand-rolled overlay (`raw/flow-language-install-light.png`). It looks right but is not `Modal`.
  - The dialog title "Install predefined language" and the button "Install language" differ.

### Translations (`TranslationsPage`, `TranslationEditor`)
- **List.**
  - "Import translations (CSV)" is a toast only. There is no Export, though export-translate-import is how translators work.
  - The "Translate" row button duplicates the row click.
  - The "System" badge is carbon while the other types are warm.
- **Editor.**
  - A grid of terms × languages (`raw/flow-translation-editor-light.png`). Good shape.
  - Save does not write back.
  - Capped at 10 generated rows. The real User Interface context has hundreds of keys, so it needs search and an "Untranslated only" filter.
  - The list calls them "Keys", the editor "Term".

### Filters
- **Strengths.**
  - The only page with a keyboard alternative to drag: up/down buttons.
  - Types and properties are shown with counts.
  - The footer count "14 filters shown" in a fixed slot is the right pattern.
- **Problems.**
  - "New group" sits top-right in the body. Every other page creates from the footer.
  - Removing a group is immediate.
  - The Properties table has a "Group" column that is always "—".
  - "Types" and "entity types" should be "templates" per the vocabulary table.
  - Save stays enabled after saving.

### Templates (`TemplatesPage`, `TemplateEditor`)
- **List.**
  - Clean in both themes.
  - In dark, the last row's bottom rule stops short of the table edge (`crops/dark-last-row-rule.png`).
  - "Default" is a carbon badge. Carbon is a data accent. Ink or vellum is calmer for a status.
- **Editor, data and layout.**
  - The list says Court Case has 12 properties; the editor shows 6.
  - The card preview's title overlaps its first field label ("Sample court case" over "CASE NUMBER", `crops/card-preview-overlap.png`), in light and dark, desktop and phone.
  - Phone: the property names disappear (see Summary 4).
- **Editor, behaviour.**
  - Deleting a property has no confirm, though in Uwazi it deletes that value on every entity of the template.
  - "Add property" sits on the footer as a warm button next to Cancel and Save. It belongs above the property table.
  - The property dialog is hand-rolled (see Summary 7).
- **Property types.** The prototype offers 8. Uwazi has text, numeric, select, multiselect, relationship, date, date range, multi-date, multi-date range, rich text, link, image, preview, media, geolocation, generated ID and nested. Multiselect and link are the two most used that are missing.
- **Missing common properties and options:**
  - title, creation date and edit date, with their label and "priority sorting" settings
  - "Use as default template" and "Entity view page"
  - per-property "hide label", "full width" and "priority sorting"
- **Missing for templates with many properties:**
  - no search in the property list
  - no way to see which entities use a property before deleting it

### Thesauri (`ThesauriPage`, `ThesaurusEditor`)
- **List.** Fine. The "Items" count is in tabular numerals.
- **Editor, 2,443 values** (`raw/flow-thesaurus-long-desk-light.png`, phone variant beside it):
  - Every value is a live text input, with no search, sort, A–Z jump or collapse of groups.
  - "Add item" appends at the end.
  - No CSV import or export. Uwazi has thesaurus import, and admins build large vocabularies in spreadsheets.
- **Editor, other problems.**
  - The dividers between values are drawn in ink, not `border-soft` (`crops/thesaurus-ink-dividers.png`). The cause is `divide-y` with `borderColor` set on the `ul`, which does not reach the children, so Tailwind v4 falls back to `currentColor`. It shows on every thesaurus in light mode.
  - A value cannot be moved into or out of a group except by delete and retype.
  - Deleting a value is immediate.
  - Sub-item drag has no keyboard path.

### Relationship types (`RelationTypesPage`, `RelationTypeEditor`)
- The delete confirmation explains the consequence well.
- **Vocabulary.**
  - The description says "connecting entities", "connections" and "unlabeled".
  - The column says "relationships". The editor says "Used by N connections".
  - Per the vocabulary table these are references (stored edges) or relationships (aggregates). "Used by 142 references" is the accurate count.
- **Other.**
  - Save does not write back.
  - "Add type" (bar) vs "Create type" (commit).
  - `inverseName` is an extension Uwazi does not have. CLAUDE.md lists "no inverse labels" as a known gap, so flag it as a proposal, not parity.

### Preserve (`PreservePage`, `PreserveTokenEditor`)
- **Naming.** "New token" on the list, "New capture source" and "Add source" in the editor. One noun is enough; "source" is clearer to an admin.
- **Editor.**
  - Schedule, URL and authentication never load from the record, so an existing source opens blank.
  - "Copy" token does not copy.
  - There is no revoke or regenerate for the token inside the source.
  - "Capture now" uses the same warm style as the footer.
- **List.** The row trash opens "Revoke token", which is a different verb from the icon's.

### Activity log
- **Strengths.**
  - Search plus Action and User filters, and expandable rows.
  - A good base for an audit log.
- **Problems.**
  - No date range, export or pagination.
  - No footer, unlike every other page. Export would live there.
  - Filter options are upper case (CREATE, UPDATE) next to "All actions".
  - The expanded "Request" detail is synthesised (`synthesizeRequest`). In an evidence product a fabricated request body must not look real, even in a prototype; label it "example".

### Global CSS & JS (`CustomisationPage`)
- Fails `__gutter()`: the editor box starts at 28px against the host's 16px.
- The toolbar is a tinted vellum bar.
- Reset discards immediately. "Reset" is a raw button, not on the ladder.
- Save stays enabled after saving. There is no Discard.
- The warning line about cascading styles is good and should stay.

### Uploads
- **Strengths.** Grid and list views, type filter, search.
- **Problems.**
  - "Upload file" is a toast with no file picker.
  - In list view the row "Edit" action copies the URL.
  - "No assets match your search." shows even when there are no uploads.
  - The search field is a raw `<input>`, while Activity log uses `TextInput`.
  - No drag-and-drop onto the page, though Figma has a Dropzone component.

### Metadata extraction (`MetadataExtractionPage`, `ExtractorEditor`)
- **Strengths.** The suggestions table with Matches / Empty / Mismatch states and per-row accept/reject is the right shape (`raw/flow-extractor-editor-light.png`).
- **Problems.**
  - "Property" is free text. It should be a select of the chosen template's properties.
  - "Accept all" writes every row with no confirm.
  - Reject removes the row with no undo.
  - Save loses accepted and rejected decisions.
  - "Score", "Accuracy" and "Confidence" are used for related numbers. Pick two and define them.

### Paragraph extraction (`ParagraphExtractionPage`, `ParagraphJobEditor`)
- No delete on the list.
- The editor has "Run extraction" in the body and "Re-run" in the footer for the same action.
- Segmentation settings are not saved. "Last run" is hardcoded.

### Placeholder page
- The copy "part of the cloning roadmap" is internal prototype language. Every section is now built, so this only shows for unknown ids. Say "This page is not available."

### Typography rule check
I found no stray word after a full stop in Settings display copy at either width. Headings are single phrases. Descriptions that wrap (Filters, Pages) wrap mid-sentence, not after a period.

---

## Where the prototype departs from Figma

The live Figma file has no Settings frames, so this compares components only.

| Figma component | Figma | Prototype | Note |
|---|---|---|---|
| ToolsSidebar (`figma/tools-sidebar.png`) | Two labelled groups (METADATA: Templates, Metadata Extraction, Thesauri, Relationship Types; TOOLS: Processes, Import CSV, Activity Log, Global CSS, Uploads). Title Case labels. Active = faint warm row. | Three groups, one shown at a time. Metadata items moved into System. Extraction moved to Tools ▸ ML tools. Sentence case. Active = vellum + semibold. | Figma's "Metadata" grouping is the better model and should come back as a subgroup of System. Sentence case is correct per the language audit. |
| ToolsActionBar/Selection (`figma/action-bar-selection.png`) | Tinted bar with a top rule, "Selected 1 of 5" count, red-filled Delete, bordered "+ New Import". | No selection state anywhere in Settings. | Bring in the pattern with today's rules: untinted bar, count in a fixed slot, `BAR_DANGER` Delete, `BAR_LEAD` create. |
| Dialog (`figma/dialog.png`) | Title, ×, body, footer with outlined Cancel and ink Confirm, rules between parts. | `Modal`/`ConfirmDialog` match, except Cancel is ghost and the danger confirm is seal. The property dialog and install dialog are hand-rolled lookalikes. Settings editors commit in green. | Ink commit is Figma's and Modal's. Settings is the outlier. |
| EmptyState (`figma/empty-state.png`) | Vellum circle, bold title, one-line hint. | Settings lists show "Nothing here yet." or a page-specific line, with no title and no circle. The PlaceholderPage is the only one with an icon tile. | Use the EmptyState shape, plus a create action, for every list. |
| Button/Primary · Secondary · Danger | Ink primary, outlined secondary, seal danger. | SettingsButton: primary = secondary = warm with an inset ring; danger = seal fill; success = green. | `SettingsButton` should map to the ladder: primary → ink commit, secondary → `BAR_GHOST`, a new `lead` → `BAR_LEAD`, danger → `BAR_DANGER` in bars and `MODAL_DANGER` in dialogs. |
| Dropzone, Stepper | Present. | Unused in Settings. Uploads has no drop target. Thesaurus and translation import have no flow. | Dropzone + Stepper is the import flow Settings needs (see below). |

---

## Improvements beyond 1:1 parity

Each one says why it is worth making.

1. **Search on every list and inside every long editor** (thesaurus values, template properties, translation terms, group members). Real Uwazi instances have thesauri in the thousands and UI contexts with hundreds of keys, and scrolling is the only tool today.
2. **Bulk selection with a selection action bar** on Users, Thesaurus values, Translations, Uploads and extractor suggestions. These are the tasks an admin repeats dozens of times in a row: assign a group, delete stale values, accept suggestions.
3. **CSV import and export for thesauri and translations**, using the existing Import CSV stepper and Dropzone. Vocabularies and translations are built and reviewed in spreadsheets by people who never open Settings.
4. **Show impact before deleting a property, value, relationship type or template** ("Used by 412 entities in 3 templates"), inside the ConfirmDialog. The admin's real question is "what breaks", and the data to answer it is already in the prototype's counts.
5. **Undo in the Beacon for child deletions inside an unsaved editor**, instead of a dialog per row. It keeps fast editing fast while still preventing silent loss.
6. **A thesaurus editor that reads as a tree, not a form:**
   - values as text with inline edit on click
   - groups collapsible
   - A–Z jump
   - "move to group"

   2,443 live inputs is slow to scan and easy to mistype into.
7. **Template property list with a card-preview link**: hovering a property highlights where it appears on the card. The preview exists, but nothing connects a property row to its place on the card.
8. **"Untranslated only" and per-language progress in Translations.** Translators work through gaps, not through the whole list.
9. **Keyboard reordering everywhere**, from the Filters page pattern. Drag-only reorder fails keyboard users and is unreliable on touch, and menus, filters and properties all depend on order.
10. **Rail grouped by task (Collection, Content model, Languages, People, Tools), with every group visible in the rail.** It removes the trip back to the navbar between related pages and matches Figma's Metadata grouping.
11. **Last-saved line in each editor footer** ("Saved 2 min ago by admin"), fed by the Activity log. Several admins edit the same instance, and today nothing tells them someone else changed a template.
12. **Phone: property and value editing as a sheet, with list rows instead of tables.**
    - Each property becomes a row: name, type badge, flags as small icons.
    - Each user becomes a row: name, email, role.

    Wide tables that scroll sideways hide the delete action and, in the template editor, the property names.

---

## Recommended next steps (for the coordinator)

- **Code lane, playground, one batch: "Settings correctness".**
  - dirty guard in every editor and form
  - every save writes back
  - Save resets after save
  - confirms on the destructive actions listed in Summary 3
  - the thesaurus divider colour
  - the card-preview overlap
  - the phone property column
  - the 12-vs-6 property count
  - PropertyDialog and Install language moved onto `Modal`
  - loading vs empty on corpus switch

  These are bugs, not design choices.
- **Design (this lane), after Juan picks the commit colour.**
  - The `SettingsButton` → ladder mapping.
  - The list-page template: toolbar row, selection bar, empty and loading states, hover row actions.
  - Applied first to Users, Templates and Thesauri as the reference pages. This is a visible change, so it should be shown on those three before it spreads.
- **Juan to decide:**
  - Commit colour: ink everywhere, or green on Save only.
  - Rail active state: vellum or warm.
  - Rail scoping: one group, or all groups visible.
  - Whether CSV import/export for thesauri and translations is in scope for the prototype.
