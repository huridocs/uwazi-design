# Settings P2: adversarial review

Design's P2 (`9d87dcad..d7f1ff9e`) plus Operator's `00c157b4`, on local `playground` at HEAD (which
also carries `b49e45c3`, `4ceda398`, `b6f672a2`, `f3b94c47` and M1/M2). Static reading. Paths are
relative to `app/src/`.

## Method: behaviour markers before and after the rebuild

For every file in `components/settings/pages/`, I counted the calls that carry F1/F3/R1 behaviour at
`c5ab1ce6` and at HEAD: `record(`, `markSaved`, `useSettingsDraft`, `LastSavedLine`, `offerUndo`,
`useSettingsUndo`, `.end()`, `log: false`, the usage atoms, `useRegisterDirtyForm`, store
`saveAtom`s and `fail(`. **No page lost any of them.**

The only differences:
- `ConfirmDialog` became `ConfirmDelete` in Account, Customisation, Dashboard, Languages and
  UserEditor.
- RelationTypesPage dropped its page-owned Undo (`00c157b4`). The delete's own notification now
  carries a store-owned Undo (`atoms/settingsUndo.ts` `registerStoreUndo`).

I also read the following directly and found them intact:
- Filters' `offerUndo.end()` on save (`FiltersPage.tsx:119`).
- The singleton saves (Collection, Customisation, Filters) with `markSaved(value)`.
- Account's single save through `saveUserAtom`, which refuses a duplicate.
- RelationTypeEditor's `relationTypeNameIssue` on Save.
- MissingRecord and `valid` on every editor.
- The guarded header back.
- Role gating through `effectiveSettingsSectionAtom`.

## Findings, ranked

### 1. Medium-low. Translations editor: a row vanishes while you type in it when a search is active

`components/settings/pages/TranslationEditor.tsx:50` searches the term **and its values**
(`${r.key} ${Object.values(r.values).join(" ")}`) over the live draft (`search.rows`, `:117`).
Editing a value changes the text the search matches.

Failure: search "Biblioteca" and clear the Spanish cell to retype it. The row no longer matches, so
it unmounts with its input, focus drops to `<body>`, and the edit can't continue. Fix: search the
saved rows (the baseline), or match on the term key only, or keep the row whose input has focus.

### 2. Medium-low. The "didn't load" banner outlives a collection switch

`hooks/useSettingsCorpus.ts:47-58` sets `settingsCorpusErrorAtom` on failure and clears it only when
a new load starts. Switch from a CEJIL page whose load failed to the Sample (nothing to load): the
banner "The collection's records did not load…" stays above every Sample page
(`views/SettingsView.tsx:89`). Fix: key the error by corpus, or clear it when the source changes.

### 3. Low-medium. Thesaurus editor has no value search and re-renders every value per keystroke

`components/settings/pages/ThesaurusEditor.tsx` renders every value as an input with drag handlers
and compares the whole draft with `deepEqual` on each render. CEJIL's Descriptores has about 2,443
values. P2 added search to every list page and to the Translations editor, but not here, where the
list is longest: finding "Tortura" means scrolling, and each keystroke in any value re-renders and
re-compares all of them.

This predates P2, but the P2 brief named it. Suggest `SettingsToolbar` search over values (with
removal and Undo by id, not index; the current Undo uses `index` into the unfiltered list, so it must
stay unfiltered or switch to ids) and windowing or memoised rows.

### 4. Low. Discard on Filters keeps the removed group's Undo live

`SettingsFormPage` Discard calls `discard()` only (`components/settings/SettingsEditor.tsx:159`).
FiltersPage ends its undo on Save, not on Discard (`FiltersPage.tsx:119`, `:206`). Remove a group,
Discard, then press Undo in the Beacon: the group comes back into a now-clean draft and dirties it.
Fix: end the owner's undo in Discard too (or have `SettingsFormPage` take an `onDiscard` that pages
compose with `offerUndo.end`).

### 5. Low. A store-owned relationship-type Undo can recreate a duplicate name

`atoms/settingsUndo.ts:31-59`: the relationship-type Undo now lives until the next removal, from
anywhere. `restoreRelationTypeAtom` doesn't check `relationTypeNameIssue`.

Failure: delete "Cites", create a new "Cites", press the old Undo. Two types named "Cites" exist,
which the name rule exists to prevent. Fix: refuse the restore with a message, or restore under
"Cites (restored)".

### 6. Low. `useSettingsSearch` memo

`components/settings/SettingsListPage.tsx:9-19`: `textOf` is not a dependency (on purpose). Every
call site passes a freshly filtered array (`roleFilter ? users.filter(...) : users`, Uploads, Activity
log, Translations), so the memo recomputes every render anyway. There is no correctness bug today.
A caller whose `textOf` reads outside data (a group-name map) would go stale, because the dependency
list hides it. Either drop the memo or take the dependency.

## Primitive API: what will fight M8 (the template editor)

1. **`SettingsEditor` merges Cancel and Back** (`onBack` is both; `SettingsEditor.tsx:100`). M8's
   editor needs Cancel to discard the draft and stay or leave explicitly, with Back guarded. That
   works today only because every editor closes on Cancel. Keep `onCancel` separate (default:
   `onBack`).
2. **No selection-mode footer.** Uwazi's template editor (inventory Part 3) swaps the footer to
   "Remove" plus "Selected n" while property rows are checked. `SettingsEditor`'s footer is fixed
   (`footerStart`, `footerStatus`, Cancel, commit). M8 needs either a `footer` override or a
   `selection` prop.
3. **No header slot for processing state.** Uwazi shows "Updating template properties across n
   entities…" with a progress bar in the header. `SettingsContent.Header` takes path, title and back
   only. Add a `status` slot before M8 needs it.
4. **`valid` is a boolean.** M8 needs reasons per property (the same-name conflicts with other
   templates, a missing thesaurus) and the footer summary. `footerStatus` can carry one line;
   `saveBlocked` plus `aria-disabled` is good. It would help if the shell took `issues: string[]` and
   rendered `blockingSummary` itself, so every editor doesn't hand-roll it as TemplateEditor does
   (`TemplateEditor.tsx` `footerStatus`).
5. **`SettingsForm` caps at 40rem unless `wide`.** The template editor is `wide`, and its own row
   wrapper puts the card preview beside the table (`TemplateEditor.tsx:405-420`). Fine. But
   `SettingsSection` children are always a single column (`flex-col gap-3`), so the property table
   and preview can't be two sections side by side. That is acceptable; noting it so M8 doesn't fight
   it.
6. **`SettingsListPage` has no row selection.** Uwazi's Templates list has checkboxes, a footer
   "Delete" and "Selected n of m". Not M8, but the Templates list rebuild after M8 will need it.

## Checked and clean

- **Deletes:**
  - Every list page still routes through `SettingsDeletes` (usage-checked, `ConfirmDelete`).
  - Menu, upload, extractor and Preserve deletes are on `ConfirmDelete`.
  - Relationship-type delete: one card, with a store-owned Undo and the restore logged.
- **Guards:** each editor's `useSettingsDraft` is kept. Page Cancel is the explicit discard; the
  header back and breadcrumb are guarded.
- **Notify and log:** `record(` counts unchanged per page; `log: false` kept on non-persisting
  pages.
- **LastSavedLine:** present on the same editors as before (now through `footerStart` or
  `footerStatus`).
- **Corpus states:**
  - `corpusScoped` is set on exactly the per-corpus tables (Templates, Thesauri, Relationship types,
    Filters, Menu, Pages, Languages, Translations). Global tables show their own empty state.
  - One "Loading…" per page (`useAnnounceLoading`).
  - CEJIL loads only on Templates and Thesauri.
- **Phone rows:** `SettingsList` unchanged. `RowActions` is opacity-only on `md` and always visible
  on phones and `hover:none`. Row targets replace per-row Edit buttons, as CLAUDE.md requires.
- **Install language** keeps focus after an install. Modal ignores Escape when it is not the top
  layer and resets the bar context. These close P1 findings 1, 3 and 7.
- **Search** is in place on every list page (substring, case-insensitive). Empty states take the
  query and offer Clear.
