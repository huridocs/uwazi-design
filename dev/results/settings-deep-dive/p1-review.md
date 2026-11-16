# Settings P1 + rail regrouping: adversarial review

Commits on local `playground`: `c4cc779d` (bar ladder), `3418f136` (dialogs on Modal, phone property
rows), `aa58a2a5` (SettingsTable phone rows, loading rows, `hooks/useSettingsCorpus.ts`), `218b468f`
(rail regrouping). The working tree is clean now (the cherry-pick is finished). Static reading; I did
not run the app. Findings marked PLAUSIBLE follow from the event and render model but were not
reproduced, and need a QA pass. Paths are relative to `app/src/`.

## Cherry-pick resolutions in `c4cc779d`: correct

All eight editor footers (`ExtractorEditor`, `GroupEditor`, `MenuLinkEditor`, `PreserveTokenEditor`,
`RelationTypeEditor`, `TemplateEditor`, `ThesaurusEditor`, `UserEditor`) keep F1's `disabled` logic
(`!dirty || !x.trim()`, `!dirty || !valid`) and take P1's `variant={isNew ? "commit" : "success"}`.
`CodePageEditor` takes `commit` for Publish and keeps `disabled={state === "published" && !unsaved}`.
`SettingsContent.Footer` wraps its children in `SettingsBarContext.Provider` and keeps the F1 header
guard. No F1 behaviour was lost.

## Findings, ranked

### 1. Medium. Install language: after an install, focus drops to `<body>` and Escape stops working

`components/settings/pages/LanguagesPage.tsx` `installLanguage` (around `:68-80`) adds the language,
so its row leaves `installable` and the focused "Install" button unmounts. Focus falls to `<body>`.
`Modal` handles Escape only in the panel's `onKeyDown` (`components/shared/Modal.tsx:160-166,202`),
and `useFocusTrap` only listens for Tab on the document (`hooks/useFocusTrap.ts:129`), so nothing
moves focus back.

Failure: open Install language, press Enter on "Install" for Deutsch, then press Escape. Nothing
happens. A screen reader is also left at the document root. Before the migration, the hand-rolled
dialog listened for Escape on `window`, so this is a regression.

Fix direction: after an install, move focus to the next row's Install button, or to the search box
when the list empties. Alternatively, have Modal pull stray focus back into the panel.

### 2. Medium. Loading rows stay forever when Travesía fails to load, and replace real empty states on global tables (PLAUSIBLE for the network case)

- `hooks/useSettingsCorpus.ts:29-32`: a rejected `loadTravesiaData()` is swallowed (`() => {}`), so
  `travesiaReadyAtom` never flips. There is no error state, no retry and no timeout. Every empty
  SettingsTable on Travesía then shows skeleton rows and announces "Loading…" indefinitely.
- `components/settings/SettingsTable.tsx:48`: `loading = useSettingsCorpusLoading() &&
  data.length === 0` applies to **every** SettingsTable, including global, non-corpus tables. Account
  › API keys (`AccountPage`), Users, and Activity log with a filter that matches nothing all show
  skeletons instead of their empty state while Travesía loads.

Failure: Collection is Travesía, data not loaded yet. Account › revoke every API key: the table
shows loading bars, not "No access keys yet". If the fetch fails, it never resolves.

Fix direction: opt in per table (a `corpusScoped` prop, or pass `loading` from the page), and give
the loader an error state.

On the question asked: on a corpus that is already loaded there is no flash. `travesiaReadyAtom` is
set once and stays true across corpus switches, and the other corpora are never "loading".

### 3. Low-medium. Phone: Escape in a property-dialog Select sheet closes the whole dialog (PLAUSIBLE)

`components/settings/pages/TemplateEditor.tsx:463-477` gives the four dialog Selects a
`sheetTitle`, so on phones each opens a `MobileBottomSheet`. That sheet is a portal created inside
the Modal panel's React tree. Its Escape handler is a native `document` listener
(`components/layout/MobileBottomSheet.tsx:108-113`). React dispatches the key event through the
React tree first, so the event reaches the Modal panel's `onKeyDown`. The Select's new guard skips
sheets (`components/shared/Select.tsx:120`, `!asSheet`). Modal's handler checks `defaultPrevented`
but not `layer.isTop` (`Modal.tsx:160-161`), so it closes the dialog, and the property draft with it.

This only matters for a phone-width window with a keyboard (a narrow desktop window, a tablet with a
keyboard). Android Back goes through the sheet stack, not Escape. Fix direction: return early from
Modal's `onKeyDown` when `!layer.isTop`. That fix also covers every other sheet-in-modal. Verify in
a browser at 390px.

### 4. Low-medium. Phone: navbar group entries now open the full rail at the top, and the comment that justifies them is stale

`components/layout/Navbar.tsx:137-146` `openSettingsList`: "The rail lists the current section's
group, so this sets the section to the group's entry". Since `218b468f`
(`components/settings/SettingsNav.tsx:52`, `settingsGroups.map`), the rail lists every group.

Failure: on a phone, open Tools from the navbar. The rail opens at Account (User), with Preserve
highlighted far below the fold, and nothing scrolls to it (no `scrollIntoView` in `SettingsNav`).
"User settings", "System settings" and "Tools" now open the same list. On desktop the Tools
dropdown goes straight to a page and is unaffected. `settingsEntryOf("system")` still returns
`dashboard`, and `settingsToolsItems()` is unchanged.

Fix direction: scroll the active item into view on mount (phone), or scroll to the entered group.

### 5. Low. Rail heading outline: the System shelves sit under the "User" heading

`atoms/settings.ts:57-59`: the System group dropped its label, so it renders no `h2`
(`SettingsNav.tsx` renders `SectionLabel as="h2"` only when `group.label` is set). Its shelves are
`h3` (Collection, Content model, Languages, People), so in a heading list they nest under "User".
The `Collection` shelf holds a `Collection` item and the `Languages` shelf a `Languages` item, which
makes those labels ambiguous when heard out of context. Fix: keep an `h2` (it can be `sr-only`
"System") so the outline stays User › System › Tools.

### 6. Low. Phone list rows: progress bars collapse; a page's loading tables announce twice

- `SettingsTable.tsx:134-144`: meta cells render inside `dd.flex.items-center` with no width. The
  Languages Translations cell is `div.flex-1 > ProgressBar` (`LanguagesPage.tsx:120-128`), so the bar
  gets 0 width on phones and only "%" shows (PLAUSIBLE; check at 390px). Other meta cells are text or
  chips and are fine.
- `SettingsTable.tsx:178-180`: each loading table has its own `role="status"` "Loading…". Filters
  has two tables, so it is announced twice.
- Actions and labels: nothing is lost. `actions` columns and `mobile: "actions"` columns (Languages
  Reset, Uninstall) trail the row with their `aria-label`s. Meta items carry their header as `<dt>`.
  The stretched row button keeps `rowAriaLabel`. Row controls that need it stop propagation
  (`RowActions`, the Users buttons, Translations' "Translate"). Languages' "Set" button has no
  `aria-label` (it predates P1); on phones its `<dt>Default</dt>` now gives it context.

### 7. Low. `SettingsBarContext`: what it does and where it can leak

Its role: inside `SettingsContent.Footer`, `primary` becomes `BAR_LEAD`, `secondary` becomes
`BAR_GHOST` and `danger` becomes `BAR_DANGER`, all without an edge. In a page body the same variants
keep `WARM_BUTTON` (with `WARM_EDGE`) and the seal fill. That matches `warmButton.ts`: no edge in
bars, at most one lead, ink commit or a green Save. PropertyDialog's footer sets the context itself
(`TemplateEditor.tsx`, `footer={<SettingsBarContext.Provider value={true}>…}`), which is right for a
modal footer.

The risk: React context passes through portals. Any `SettingsButton` inside a Modal, Select sheet or
popover **opened from a component inside a footer** renders with bar styling. Nothing does this
today (every footer holds only buttons and `StatusLine`). The first footer menu or popover will pick
up bar styling in its body. Consider resetting the context to `false` inside `Modal`'s body.

Ladder spot checks, all consistent:
- Every list footer has one lead (`primary` → `BAR_LEAD`).
- Editors have Cancel as ghost and Create as ink or Save as green.
- `CodePageEditor`: Discard ghost, Save draft ghost, Publish ink.
- Two notes: TranslationsPage's only footer action, "Import translations", is `secondary` (renders
  as a ghost); as the bar's only action the ladder makes it the lead. Dashboard's "Reset demo data"
  is a ghost; it is destructive, and `danger` (`BAR_DANGER`) would say so.

## Checked and clean

- PropertyDialog on desktop: a focus trap, focus restored to the trigger, and an open list's Escape
  is claimed by the Select (`Select.tsx:117-123`, `preventDefault`), so the dialog stays open. The
  layer stack is registered (`useOverlayLayer` in Modal). Label `autoFocus` and the
  `FieldMessage reserve` row are kept. The footer matches `MODAL_BUTTON` sizing. Disabled commit
  equals `MODAL_COMMIT_DISABLED`.
- Install dialog: `ModalSearchRow` with autofocus, `ModalList`/`ModalListRow`, `ModalStatus` for the
  empty states, and a fixed height. "Install Spanish" contains the visible "Install" (label-in-name).
- Template property rows on phones: the header row becomes `sr-only` below `md`, so columns stay
  announced. Each flag is a `<label>` with a visible `aria-hidden` word, and the checkbox keeps its
  `ariaLabel`.
- `settingsEntryOf` (user → account, system → dashboard, tools → preserve), `settingsToolsItems`,
  `settingsItemsById` and `ImportCSVLayout`'s rail (`activeId="import-csv"`) all still work.
