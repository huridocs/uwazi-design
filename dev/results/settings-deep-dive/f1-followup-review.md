# Settings F1 follow-up: adversarial review

Commits `52576f9f`, `d8cd00d4`, `4d7cd191`, `67df5b47` (base `570c1921`) on local `playground`, clean
tree. Static reading. Paths are relative to `app/src/`.

## Findings, ranked

### 1. High. The Library's Template facet is empty on Travesía and Artworks

`atoms/settingsSingletons.ts:100-109`: the Filters seed is CEJIL's for `cejil` and the **Sample's**
for every other corpus (`seedFilterConfig`, ids `person`, `court_case`, …).
`components/library/LibraryFilters.tsx:187-196` now shows only types that appear in those rows
(`shownOrder.has(t.id)`). Travesía's template ids (Mongo `_id`s) and Artworks' (`artwork`, `artist`,
`data/artworks/typesAdapter.ts:11-12`) never match.

Failure: switch the collection to Artworks or Travesía and open Library filters. The Template facet
lists nothing, so there is no way to filter by type. Before `4d7cd191` every type was listed.
Settings › Filters on those corpora also edits Sample rows that don't apply (review H4).

Fix direction: seed Filters per corpus from that corpus's types (`corpusTypes`), all active. Or
treat a seed with no matching ids as "show every type", which is Uwazi's fallback when
`settings.filters` is empty (inventory Part 3, `libraryTypeFilters.ts`).

### 2. Medium. Sample Library now hides Document and Organization by default

The same reader, on the Sample: `data/settings.ts:356-360` seeds `active: false` for `document` and
`organization`. Those defaults were demo data for a Filters page that nothing read. Now they remove
two templates from the Library's Template facet, including Document from the Documents card.

A type filter that was set before the type was hidden stays applied, with no checkbox in the facet
to clear it. Pick deliberate defaults (all active), and clear `libraryTypeFiltersAtom` entries for
types that leave the facet.

### 3. Medium-low. Window title names the Sample's collection on Artworks and Travesía

`atoms/settingsSingletons.ts:36-37`: the Collection seed name is CEJIL's or "Inter-American Human
Rights Archive" for every other corpus. `App.tsx` puts it in `document.title`, so the Artworks and
Travesía tabs read "Inter-American Human Rights Archive · Uwazi". Give each corpus its own seed
name.

### 4. Medium-low. An admin can demote themselves out of Settings with no warning

`atoms/users.ts` `roleChangeBlock` only protects the last admin. With two admins, the signed-in admin
can set their own role to Editor or Collaborator in `UserEditor` and save. Role gating
(`atoms/settings.ts` `settingsSectionAllowed`) then removes Users & Groups and the whole System
group mid-session: `SettingsView` falls back to Account, and the rail and navbar shrink. There is no
confirm and no message. A confirm ("You will lose access to System settings") would cover it.

### 5. Low. Role gating gaps and inconsistencies

- `views/SettingsView.tsx:32-35` renders Account when the stored section is not allowed, but
  `settingsSectionAtom` keeps the old value. `SettingsNav` compares with the stored value, so nothing
  in the rail is marked current (`aria-current` missing) while Account shows.
- Import CSV is a top-level view (`appView "import-csv"`, persisted in sessionStorage,
  `atoms/navigation.ts:16`). It is hidden from collaborators in the Tools menu and the rail, but the
  view itself is not gated: a session restored on `import-csv` renders it for any role. This is
  narrow, since login always lands on Library. Gate it in `App.tsx` with `settingsSectionAllowed`.
- No path reaches an editor through a stored editing id: every list keeps `editing` in `useState`
  (not persisted), so a collaborator cannot land in an editor.

### 6. Low. "Rules in the atoms" has one bypass: Account

`components/settings/pages/AccountPage.tsx:45,58` patches the user through `users.patchAtom`
directly, not `saveUserAtom`. The UI checks `userIdentityBlock` first (`:52-53`), so it is correct
today. The atom-level guarantee in the commit message holds only for `saveUserAtom` and
`deleteUserAtom`. No import or bulk path writes users (grep: only `saveUserAtom`, `deleteUserAtom`,
`saveGroupAtom`, `deleteGroupAtom` and Account touch the store).

### 7. Low. Import-cycle safety depends on every store passing `isRecord`

`67df5b47` fixes the crash by putting the registry in a module with no imports
(`atoms/settingsReset.ts`). `settingsCollection.ts` imports it first, and the function declarations
it exports are hoisted. One trap remains:
- `createSettingsCollection`'s default `isRecord = hasId` (`atoms/settingsCollection.ts:112`) reads
  a `const` export.
- A store that is evaluated inside the `dataSource` cycle before `settingsCollection`'s body has run,
  and omits `isRecord`, throws a TDZ ReferenceError on load.
- Users and groups pass `isRecord`, so they are safe.

Fix: make `hasId` a function declaration, or default inside the body.

Checked the other registrants (`thesauri.ts`, `sitePages.ts`, `activityLog.ts`, `users.ts`,
`settingsSingletons.ts`). All reach `registerSettingsReset` either directly or through the
re-export, which resolves to `settingsReset` (already evaluated). Reset order is right: the users
store registers before its "signed-in user still exists" check (`atoms/users.ts:81`).

### 8. Low. Versioned keys drop v1 data cleanly but leave it in sessionStorage

v1 keys (`uwazi:settings:users:global`, …) are no longer read and never removed: there is no
migration and no cleanup, which is harmless. A tab signed in as a v1-created user falls back to the
first admin through `signedInUserAtom`, silently. `uwazi:settings:activity` is not versioned; its
entries are filtered per field, which is fine.

## Checked and clean

- `cleanOverlay` (`settingsCollection.ts:52-60`): each created record, patch and deleted id is
  checked on its own, and a bad one is dropped without a throw. A patch that breaks the shape is
  ignored (`:128-132`). `isUser` covers every field read on first render.
- Deleting a created record no longer grows `deleted` (`:160-168`).
- `userIdentityBlock` (trimmed, case-insensitive, self excluded) runs in `UserEditor`, Account and
  `saveUserAtom`. `saveUserAtom` also refuses a last-admin demotion and a missing id.
  `deleteUserAtom` refuses self and the last admin. `saveGroupAtom` refuses a deleted group.
- MissingRecord: the User and Group editors show it and keep Save off when the record is gone.
- Membership compares as sorted sets, so F1 finding 4 is fixed.
- `deepEqual`: Dates by time, Maps and Sets structurally, prototypes compared.
- Guard dialog names every dirty draft (`dirtyGuard.ts` `joinLabels`).
- Singletons:
  - Per-field validation with seed fallback.
  - Collection, Filters and Customisation save and then `markSaved(value)` from the stored value,
    so F1 finding 1 is fixed.
  - The Library default view applies until the reader picks one (`viewModeChosenAtom`); "table"
    maps to "list".
  - The CEJIL Template facet keeps its groups, now from the saved Filters.
