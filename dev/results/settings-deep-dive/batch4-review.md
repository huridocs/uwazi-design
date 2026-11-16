# Settings batch 4: adversarial review

Range `b0ebbde3..c5ab1ce6` (12 commits) on local `playground`, clean tree. Static reading, plus file
sizes from `public/`. Paths are relative to `app/src/`.

## Earlier findings: closed or not

### f3-review.md

| # | Finding | Status | Evidence |
|---|---|---|---|
| 1 | CEJIL usage read `searchFields` (pa_s, descriptores, media, geo = 0) | **Closed** | `atoms/settingsUsage.ts` `readerAtom`: raw `cejilEsBySid().get(id).metadata[name]` (`heldFromRaw`), and Settings now loads CEJIL (`hooks/useSettingsCorpus.ts:40-41`) |
| 2 | Sample usage ignored session records | **Closed** | `heldFromRecord` reads `libraryEntityOverlayAtom[...].records` first |
| 3 | Relationship types list was local state, matched by label | **Closed** | `atoms/relationTypes.ts` `settingsRelationTypesAtom` / `relationTypesOfAtom`, by id |
| 4 | Move and delete not undoable | **Closed** (one gap, finding 4 below) | `restoreRelationTypeAtom`; Undo offered by the Settings page and Manage types |
| 5 | Last-saved crossed collections | **Closed** | `atoms/activityLog.ts` `scope` and the `scope:domain:id` key, `scopeOfDomain` (users and groups global) |
| 6 | Non-persisting saves logged | **Closed** | `record({ log: false })` on Template, Menu, Translations, Languages, Pages, Uploads, Extractors, Preserve and the template delete; persisting stores still log |
| 7 | Undo live after Save | **Closed** | `offerUndo.end()` on Filters save (`FiltersPage.tsx:119`); other undo owners close on Save |
| 8 | Sample inherited-property refusal can't fire | **Open, as expected** | Still label-matched (B6); waits for the template-schema work |
| 9 | Seed request lines, log growth, string family keys, 2FA self-disable | **Closed** | `isSeedEntry`, `LOG_CAP = 500`, string-keyed families, self-disable removed |

### r1-review.md

| # | Finding | Status | Evidence |
|---|---|---|---|
| 1 | v4 relationship fields not template use | **Closed** | `utils/settingsUsage.ts` `sampleSchema` adds `V4_FIELDS` |
| 2 | `relationLabel` cached at load | **Closed for its callers** | `utils/inheritance.ts:24-25` looks up at call time. **But see finding 1**: the panel's own rows don't use it |
| 3 | CEJIL usage 0 unless the Library loaded it; errors swallowed | **Closed** | Settings loads CEJIL and Travesía, `settingsCorpusErrorAtom` and `SettingsCorpusError` with Retry, "pending" lines and `null` value counts. **But see findings 2 and 3** |
| 4 | Manage types had its own rules | **Closed** | `ManageRelationTypesModal.tsx` uses `relationTypeNameIssue`, `saveRelationTypeAtom`, `deleteRelationTypeAtom` (template-field refusal through `relationTypeUsageInAtom`), Undo and the log. **But see finding 4** (double notification) |
| 5 | Sample registry not reset, not persisted | **Closed** | `data/sampleRelationTypesStore.ts` (sessionStorage), applied at load in `atoms/references.ts`; reset registered in `atoms/relationTypes.ts` |
| 6 | Travesía edited the Sample's types; CEJIL renames didn't propagate | **Closed for Settings; partly open for the panel** | Travesía has its own store (`DUMP_TYPES`). Renames reach `relationLabel`, but not panel rows (finding 1) |
| 7 | Stale type filter, all-unticked, fallback section, 2FA | **Closed** | `deleteRelationTypeAtom` clears `relTypeFiltersAtom`. "None ticked = all" is now deliberate, with a footer message. `effectiveSettingsSectionAtom` is derived, not written. Account reports a refused save |

## New findings, ranked

### 1. Medium. CEJIL and Travesía renames don't reach the Relationships panel's list, tree, groups, chips or filter

The rename reaches only `relationLabel()` (`utils/inheritance.ts:24-25`, which reads the dump-name
reader registered in `atoms/relationTypes.ts:62-71`). The panel resolves labels itself, with
`relationTypes.find((r) => r.id === …)` on the Sample's static mirror:
- `components/relationships/rows/ReferenceRow.tsx:52`
- `rows/AggregateRow.tsx:61`
- `rows/HubRow.tsx:28`
- `utils/connectionGrouping.ts:62` (group headers in list and tree)
- `ActiveFilterChips.tsx:109`
- `RelationshipsFilterSlideOver.tsx:281`

CEJIL and Travesía references carry the dump **name** as `relationType`, which is not in that
mirror, so these all print the dump name.

Failure: on CEJIL, rename "Firmante" in Settings. A Sentencia's connection cards and the When view
say the new name, but the Relationships tab's rows, group headers, the type filter and its chip say
"Firmante". The commit says "labels live everywhere". Fix: route those six sites through
`relationLabel()`. For the Sample they would then also stop depending on a re-render, since
`relationLabel` reads at call time.

### 2. Medium-low. Settings now downloads all of CEJIL on every Settings page, and the Library then skips its search warm-up

- `hooks/useSettingsCorpus.ts:40-41` calls `loadCejilData()` whenever Settings is open on CEJIL,
  including Account, Users and Activity log. That fetches `entities.json` (16.6 MB), `fullText.json`
  (5.5 MB), `relationships.json` (2.3 MB) and `files.json` (1.7 MB), about 26 MB, only so usage
  counts can be exact.
- `views/LibraryView.tsx:168-176` runs `warmSearchScan()` only in its own load callback, which runs
  only when `!cejilReady`. If Settings loaded the corpus first, the Library finds it ready and never
  warms the full-text caches, so the first full-text keystroke on CEJIL is cold (CLAUDE.md
  performance traps).

Fix: load lazily when a usage dialog or a usage column needs it (or after idle), and move
`warmSearchScan()` to whoever flips `cejilReadyAtom` (or into the loader).

### 3. Medium-low. On Travesía, a relationship type can be deleted while its references are still loading

`atoms/settingsUsage.ts:243-246`: before `travesiaReadyAtom`, `references` is `0`. There is no
"pending" line (unlike templates and thesauri), so `relationTypeUsage` sees no references, does not
apply Uwazi's "Cannot delete type being used in relationships", and the delete goes through. The
type list itself is static (`travesiaRelationTypes`), so it renders at once, before the load.

Failure: open Settings › Relationship types on Travesía (first visit, about 1.5 MB to fetch), delete
a type immediately: it is deleted without the refusal. Fix: treat "not ready" as pending and refuse
(or disable Delete) until the count is known.

### 4. Low-medium. A relationship-type delete produces two notifications, and Undo leaves the log saying "Deleted"

`components/shared/SettingsDeletes.tsx` relationship delete calls `record(...)` (toast "X deleted"
plus a log entry) and then the page's `offerUndo(...)` (a second toast "X deleted" with Undo).
`ManageRelationTypesModal.tsx:89-104` does the same. The Beacon shows two cards for one action, and
after Undo the Activity log still says "Deleted relationship type X" with nothing for the restore.

Fix: pass the Undo `action` through `record` (it accepts `action`) instead of a second toast, and log
the restore as an UPDATE (or drop the delete entry).

### 5. Low. Smaller items

- `atoms/references.ts` (saved registry at load) unregisters every seed type missing from the saved
  list. A seed type added in a later build is silently dropped for a tab that has a v2 saved
  registry, and its references then show raw ids. Bump the key when the seed changes, or merge new
  seed ids in.
- `atoms/relationTypes.ts:65-71`: the label reader resolves dump names against the **Library's**
  collection (`dataSourceAtom`). An entity view of another collection's entity (still open after a
  collection switch) shows dump names. This is a narrow case.
- `relationTypeUsageInAtom` for Travesía filters all relationships per type row (1,277
  relationships times about 30 types). That is cheap and recomputes only on load. Fine.

## Checked and clean (no regressions found)

- **Relationships panel, Sample:**
  - Create relationship lists `relationTypesAtom` (Settings-created types included, `no_label`
    last).
  - Filter by type: a deleted type's filter is cleared.
  - Rows, groups, tree and graph labels read the mirror, which rename updates. A Settings rename
    happens while the panel is unmounted, and Manage types does not rename, so nothing on screen goes
    stale.
- **When view:** `WhenBody.tsx:43` through `relationLabel`, so it follows renames on every
  collection.
- **Undo (Sample move):** restores the type at its index, in the atom and the mirror, and moves back
  only references still on the target. The saved registry and `moved` map are rewritten on every
  action. Reset restores seed types, labels and reference types and clears storage.
- **Usage:**
  - String-keyed families, so lookups no longer scan earlier keys.
  - Pending lines for templates and thesauri.
  - Value counts are `null` until the corpus loads.
  - No per-render corpus scans. List rows are per type, on references (Sample), baked counts
    (CEJIL) or 1,277 relationships (Travesía).
- **Library on CEJIL and Travesía:** the Template facet uses the "none ticked = all" rule plus the
  earlier no-match fallback. No new per-keystroke work. The only performance regression is the
  warm-up skip in finding 2.
- **Role section:** derived (`effectiveSettingsSectionAtom`), used by the outlet and the rail. The
  stored value is no longer overwritten, so an admin returns to their last section.
