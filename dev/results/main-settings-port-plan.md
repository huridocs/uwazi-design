# Port plan: Settings from playground to main, in stages

Read-only research. Nothing was changed in any checkout.

Compared: local `main` cd13a82a (origin/main is b8b69cc0; cd13a82a is 1 commit ahead and unpushed) against
`playground` 8c5f5597 (= origin/playground). Merge base f398b77c (2026-09-08). Main has 104 non-merge commits of its own
since then (and 7 merges), playground 408 non-merge commits. `git diff --stat main playground -- app/src` is 490 files.

## 0. How the numbers were produced, and their limits

- Exports of main (cd13a82a), the base (f398b77c) and playground into a scratch directory, then a three-way
  classification per file (unchanged / only playground changed / only main changed / both changed / added on one
  side / added on both), with `git merge-file` run on every file both sides changed to count conflict hunks.
  Whole tree: 566 files on playground, 192 only on playground, 28 deleted on playground, 122 changed on both
  sides (103 of them conflict in a three-way merge, 455 hunks), 112 changed only on playground.
- An import graph of `app/src` on both trees, to find what each stage needs from outside its own files.
- The main-only commits that touch each stage's files, from `git log f398b77c..main --name-only`.
- Main's `CLAUDE.md` "What main does not have" section, the auto-memory notes (`feedback-playground-is-default`,
  `feedback-mobile-to-main`, `operator-session-2026-10-05-settings`, `operator-session-2026-09-10`) and
  `dev/results/settings-deep-dive/template-schema-spec.md`.
- Limits: the merge-file conflict counts use the 09-08 base. Where main ported a playground change by hand, the
  same hunk shows as a conflict although both sides intend the same thing; the counts overstate real conflicts in
  those files. Line counts are diff lines (changed files) or file lines (new files); they size effort, not
  difficulty. Nothing was compiled: I did not try any port, so "tsc green" is a prediction, not a result.
- Main's worktree `~/.operator/worktrees/uwazi_app-729900-main` has uncommitted edits (`App.tsx`, `MainTabs.tsx`,
  `MobileBottomSheet.tsx` and others) from the lane porting the published view and maps. I did not read them. The
  analysis used `git archive cd13a82a`, so it does not include that work.

## 1. Findings that change the suggested order

1. **Settings itself is mostly new files, with few collisions.** Of the 48 Settings store, hook and
   dialog files (the groups for stages 1b, 3 and 4), 45 are new on playground. In the Settings-only stages (1b, 1c, 3a–3d, 4) main's own
   commits touch 1–9 of them each, and they are copy, aria-label and gutter edits that playground already
   contains (language audit B5/B6/B7, the gutter port, "log in" copy). Three-way conflicts there total 12 hunks
   or fewer per stage. The hard ground is outside Settings: shared Modal/Select/DataTable (stage 1a) and the
   template schema's readers (stage 2: 22 files, 174 conflict hunks, led by `views/LibraryView.tsx` 41,
   `views/MetadataView.tsx` 37, `ResultsMainView.tsx` 26, `EntityCard.tsx` 23, `atoms/library.ts` 16).
2. **The stores-first order does not hold for two pieces.** `atoms/settingsUsage.ts` and
   `components/shared/SettingsDeletes.tsx` import the template store, relationship-type registry, languages,
   menu and pages stores, and the entity change layer (their import closure is 134 files). `atoms/settings.ts`
   (role gating, the "Global CSS" rail label) imports `atoms/settingsSingletons.ts`. So: usage and the delete
   dialogs move to stage 2/3 as their stores arrive (only the user and group usage queries go in stage 1);
   `settingsSingletons` goes in stage 1b.
3. **`Modal.tsx` on playground imports `SettingsBarContext` from `settings/SettingsButton.tsx`.** The shared
   Modal upgrade therefore cannot land before the new Settings button. Stage 1a ships both.
4. **Old and new Settings primitives can coexist by name.** Main has `Button`/`Field`/`Table`; playground renamed
   them `SettingsButton`/`SettingsField`/`SettingsTable` (rename tier 2, 58f57bc6). Main's 28/15/19 importers are
   all Settings pages plus the catalog. So pages migrate in groups; the old three files are deleted when the last
   page that uses them (Import CSV, extraction, Preserve; stage 4) moves.
5. **`views/SettingsView.tsx` imports every page.** Each stage edits its section map; sections not yet migrated
   keep pointing at main's current page.
6. **Settings never needs the login screen, Red Travesía, the timeline, or the When view.** But the data layer
   it reads does import Travesía (about 30 non-Travesía files mention `travesia`, mostly `data/*` and
   `atoms/dataSource.ts`), `data/docPages.ts` (seeded document-page images, 3.2 MB in `public/doc-pages`) and
   `utils/timeline.ts`. Each is handled in section 4 (strip, stub, or port the small piece).
7. **The language-audit code renames (B8–B10) are not needed.** Settings code imports exactly two renamed
   modules: `entityChanges` (was `entityOverlay`) and `FiltersSlideOver` (was `FiltersDrawer`, used by the three
   extraction pages). Settings stores use only the `Corpus` type from it. Adapt those imports to main's names.
   Taking the renames would touch 25 non-Settings importers and is not needed to land Settings.
8. **Playground's own history is not a usable staging path.** The Settings commits are interleaved: stores,
   old-primitive page edits, then the P2 primitives rewrite (9d87dcad, 393c3287, …) that replaced those page
   edits. The plan therefore copies final file state (squashed) and lists the commits only for provenance and
   reading.
9. **Playground carries known failures.** Acceptance run 2 on 956db631 was 461 PASS / 179 FAIL of 708 rows
   (worst THS 29, USR 26, FLT 22, REL 20; `dev/results/settings-deep-dive/acceptance-run-2.md`). Later commits
   changed some of those. A port ships what playground has. The per-stage check is "no worse than playground on
   the same row prefixes", not "all rows pass".

## 2. Port recipe, same for every stage

1. Branch from `origin/main` (after the in-flight published-view/maps port lands, see section 6) in a throwaway
   worktree: `git worktree add --detach <scratch> origin/main`, symlink `app/node_modules` (never commit it;
   see the 10-05 `app/node_modules` gotcha), do not touch the dev server's checkout.
2. Files new on playground: `git show playground:<path> > <scratch>/<path>`, then fix imports (rename
   `entityChanges` to main's names, drop `travesia`, etc.).
3. Files changed on both sides: start from main's file, apply playground's hunks by hand. A starting point:
   `git merge-file -p main_file base_f398b77c_file playground_file` and resolve; for a file main ported from
   playground, use the playground commit named in main's commit message as the base instead.
4. Each new shared primitive gets its story and `CatalogEntry` (main's `CLAUDE.md` rule); move the catalog
   entries over in the same stage.
5. Gates: `cd app && npx tsc --noEmit && npm run build`, storybook build and `check:stories` no worse, then the
   stage's checklist below. Fast-forward `main` without switching the checkout, push, watch the deploy.
6. Update the vault hub note and `MEMORY.md` with main's new SHA.

## 3. Stages

Sizes are in lane sessions, one session being what the schema spec calls a Code dispatch (about one session each).

### Stage 1a: shared UI foundation (small)

- **Why first:** every Settings dialog and table sits on it, and `Modal` needs `SettingsButton`.
- **Playground commits (provenance):** bd760488 one shared Modal; d639d8b6 ModalParts; 24017ce8 five width
  tiers; 8ce7ba82 press inside the dialog keeps focus; c4cc779d Settings buttons on the bar ladder; 3418f136
  Settings dialogs on Modal; 81300389 phone confirms as bottom sheets with 44px buttons; 7056b489 and fc679326
  status-pill tokens (`-label` colours, dark success tint); the type-role pass 94e279a7, bac7e06d, 2bf6ba24,
  7438252c, bef794d0 (only the files in this stage; section 4 item 11 covers the rest).
- **Files:** 24. New: `Dropzone`, `SettingsButton.tsx` (listed with 1c's primitives; it ships here), `useWindowedRows`.
  Changed on playground only (10): `StatusBadge`, `CountBadge`, `StatsCard`, `Checkbox`, `RadioGroup`, `ProgressBar`,
  `FieldMessage`, `AlertBanner`, `UnsavedChangesGuard`, `useNotify`. Changed on both sides (11): `Modal`
  (273 diff lines, mostly the wrapper re-indent; real changes are the `grid` size, `SettingsBarContext`, a small
  dialog as a phone bottom sheet, `tabIndex={-1}`, a `layer.isTop` guard), `ModalParts`, `warmButton`, `Hint`,
  `Select`, `DataTable`, `ConfirmDialog`, `SectionLabel`, `atoms/notifications.ts`, `atoms/dirtyGuard.ts`,
  `hooks/useFocusTrap.ts`.
- **Main's own changes on these files (15 commits):** the layer stack and sheet stacking in `Modal` (b8b69cc0,
  bb7c881a, 93245ce1, 6158a595, 5cc63ee1), `Select` as a phone sheet (bd70f588, dec42204), `notifications.ts`
  Undo action and copy (9f64a90c, 130d2606), `dirtyGuard` and `DataTable` selection (092680dc, 43ec6953), the bar
  ladder and warm edge in `warmButton`/`ConfirmDialog` (d5ac9725, efc29a92, 71f4e94f). Keep every one of these;
  the playground versions are the same ideas in different text.
- **Dependencies on playground-only features:** `Modal` and `Select` import `MobileBottomSheet`/`SheetDone`
  (both exist on main, both changed on both sides: keep main's). Leave out: the `data/imports.ts` seed change
  (belongs to stage 4).
- **Risk:** medium-low. `Modal.tsx` is used by 12+ dialogs on main; a regression shows everywhere. The type-role
  pass changes class strings only.
- **Verify:** tsc, build, storybook build, `check:stories`; open every dialog family on desktop and a phone
  viewport (Create entity, Copy From, Share, Change template, Bulk edit, Import CSV modal, ConfirmDialog, Bert);
  Escape and click-outside act only in the top layer; dark mode contrast of the status badges; the Library
  selection bar and Notifications Undo still work.
- **Size:** 0.5 session. About 0.5k changed lines plus the `Modal` reconciliation.

### Stage 1b: settings stores, hooks, shared dialogs (medium)

- **Playground commits:** a6b6aca3 shared collection store, draft hook, guarded exits; faf68858 Users & Groups
  store; 66e721c7 editors on one draft; 952ba19d, 570c1921, cf3dc21f CLAUDE.md (docs go in stage 5);
  2236163b ConfirmDelete, notify, activity log, Undo for child removals; 772b5835 every save through
  `useSettingsNotify`; 52576f9f per-record validation, versioned keys, `deepEqual`; d8cd00d4 gating by signed-in
  role and the dirty-draft dialog; 4d7cd191 Collection / Global CSS & JS / Filters per corpus; 67df5b47 reset
  registry in its own module; b0ebbde3, a8ccf3bd role and store edges; 8f6a6599 Uwazi's unsaved-changes wording;
  ee5fe1ea notification texts from one table; b89e11b1 stores for Menu, Pages, Uploads, Languages (the stores
  themselves go in 3b/3c).
- **Files (17, all but 2 new):** `atoms/settingsCollection.ts` (262 lines), `settingsReset.ts`,
  `settingsSingletons.ts` (207), `settingsUndo.ts`, `users.ts` (270), `activityLog.ts` (140), `featureFlags.ts`,
  `hooks/useSettingsDraft.ts`, `useSettingsNotify.ts`, `useSettingsUndo.ts`, `utils/deepEqual.ts`,
  `data/settingsNotices.ts`, `data/settings.ts` (279 diff lines, playground only), `atoms/settings.ts` (98 diff
  lines; role gating, derived visible groups), `components/shared/{ConfirmDelete,TypedConfirmModal,
  PasswordConfirmModal,LastSavedLine}.tsx`. About 1.8k lines.
- **Main's own changes:** one commit, 130d2606 (copy in `atoms/settings.ts`), already on playground.
- **Dependencies and decisions:**
  - `settingsCollection`/`settingsSingletons` import `type Corpus` from `data/entityChanges`: import it from
    main's `data/entityOverlay` instead (port with the type under main's name).
  - `settingsSingletons` imports `utils/dateFormat.ts` (new, 87 lines, port), `data/cejil/settingsAdapt.ts`
    (changed on playground only, 66 lines, port) and `entityTypes` (exists on main).
  - `atoms/dataSource.ts`: no change in this stage; the `travesia` value of `DataSource` does not enter main.
  - The signed-in user is `signedInUserIdAtom` (session storage, default seed admin). **Leave out** the login
    screen, sign-in art, `appView = "login"`, "Sign out leads to login" (see section 5). Role gating works
    without them: the Dev panel (stage 3d) switches roles, and a collaborator or editor view is reachable that way.
  - Users/groups usage queries only: take the `userUsageAtom`/`groupUsageAtom` part of `atoms/settingsUsage.ts`
    and add `removeAccessMemberAtom` (about 20 lines) to main's `atoms/entityOverlay.ts`, which already holds the
    access store. The rest of `settingsUsage` waits for stage 2.
- **Adoption in this stage (so it is not dead code):** none visible except the dirty guard wording
  (`UnsavedChangesGuard`, from 1a). The stores are exercised by 1c.
- **Risk:** low for conflicts, medium for cycles: commit 67df5b47 fixed an import-cycle crash on load
  (`settingsReset` in its own module; `dataSource` leads back through a cycle). Port the import order as it is.
- **Verify:** tsc, build; app loads with no console error; storybook for `ConfirmDelete`, `TypedConfirmModal`,
  `PasswordConfirmModal`; `registerSettingsReset` runs (Dashboard "Reset demo data" is stage 3d, so test from the
  console or a story); sessionStorage keys are per corpus.
- **Size:** 1 session, 1.8k lines, almost entirely copy.

### Stage 1c: Settings shells, primitives, rail, people pages (large)

- **Playground commits:** 9d87dcad primitives and shells (list page, toolbar, empty state, section, editor, form
  page); fc7aff4d selection bar, keyboard reorder, editor Cancel/status; d7f1ff9e stories and catalog entries;
  218b468f rail with every group visible; aa58a2a5 SettingsTable list rows on phones; 0ea4a7dc people pages on
  the shells; 25709453 Users bulk selection; 48b32d8e Account to Uwazi's form, 2FA setup, API keys store;
  733e75dd locked accounts; 40852b7b Protection column; c195a10e role gating says why; 81300389; 59ed2665
  tables span their pane, forms cap fields at 40rem; b02f6d58, b49e45c3 review fixes.
- **Files (37):** new (27): `SettingsEditor`, `SettingsListPage`, `SettingsSection`, `SettingsField`,
  `SettingsTable`, `SettingsEmptyState`, `SettingsSelectionBar`, `ReorderControls`, `BulkPickModal`,
  `TranslationProgress`, `atoms/apiKeys.ts`, `pages/account/TwoFactorSetupModal`, `MissingRecord`, and the
  stories; changed (10): `SettingsContent`, `SettingsNav`, `RowActions`, `StatusPill`, `AccountPage`,
  `UsersPage`, `UserEditor`, `GroupEditor`, `views/SettingsView`. About 3.2k lines plus 0.6k of changed files.
- **Main's own changes (4 commits):** `AccountPage` copy (2c640e8c), `UsersPage` aria (2ac6ef37), the `SettingsNav`
  rail border on the inline end (6dabaf27), the gutter port (d1e45799). All four exist on playground. Conflicts:
  `SettingsContent` 4, `SettingsNav` 5, `AccountPage` 2, `UsersPage` 1.
- **Dependencies:**
  - `SettingsSelectionBar` imports `ActionsSheet` from `components/library/LibrarySelectionBar.tsx`, which is
    both-changed (main ported the selection bar). Verified: main's version exports `ActionsSheet` (line 220), so
    it can be used as it is.
  - `UsersPage` imports `DrawerTabs` (for a Users / Groups tab strip). On playground `DrawerTabs` pulls
    `useStripFold` and `useDrawerWidth` (and `atoms/session.ts`). Main already has `DrawerTabs` with its own fold
    (ported adapted, 6915520a/557e2ffa). Keep main's `DrawerTabs`; do not take `useDrawerWidth`/`session.ts`.
  - `views/SettingsView.tsx`: map `account`, `users` to the new pages; every other section keeps main's page on
    the old `Button`/`Field`/`Table` until its stage. `useSettingsCorpus` and `SettingsCorpusError` (the shell's
    load-error banner) are needed by `SettingsTable`; port them in a reduced form (corpus load state for CEJIL
    only; the Travesía branch is dropped).
  - `UserDelete`/`GroupDelete` from `SettingsDeletes`: port only those two components in this stage.
  - Phone: main's 1c7218f0 (Settings on phones open their own lists) lives in `Navbar.tsx`, not in these files.
- **Risk:** medium. The shell change alters every page's chrome the moment `SettingsContent` and the rail change,
  and half the pages are still on the old primitives. Check the unmigrated pages keep working inside the new
  `SettingsContent` (body padding, `data-measure`, `data-table` exemption).
- **Verify:** tsc, build, storybook (`SettingsEditor`, `SettingsListPage`, `SettingsSection`, `SettingsEmptyState`,
  `SettingsSelectionBar`, `ReorderControls`, `RowActions`); `window.__gutter()` on Settings; acceptance rows
  `USR-*`, `ACC-*`, `NAV-*`, `X-*` (cross-cutting) from `acceptance-checklist.md`, desktop and a 390px phone, light
  and dark; keyboard path through the rail; blocked section for a collaborator; unsaved-changes dialog on rail
  click, breadcrumb and the phone back chevron.
- **Size:** 1.5 sessions.

### Stage 2: template schema M1–M9 and everything that reads templates (the large one; six sub-stages)

The schema moves the source of truth from `data/settings.ts` (`templatePropertiesByTemplate`, `seedTemplates`)
and `data/*` type lists to one per-corpus template store, with entity values keyed by property name and every
reader projecting from it. Whole stage: 115 files, 12.1k new lines (about 1k of that is Travesía data to drop),
1.2k lines changed on playground only, and 25 contested files with 7.6k lines between main and playground.

Playground commits for the whole stage, in order: 00b450d6 "Show in cards" flag; 80ea4e94 Filters properties;
fa8c5e7c thesaurus store; 02dfe04e Sample v4 seed; 21156f2e, a8f591a9, b374a36c, cc8887f7, b6f672a2, 1df1b784
usage queries; 9701b90f, f24d8390, 4ceda398, 00c157b4, 353e5257 guarded deletes; 7cbe4201, fcf891f9, edceef5c,
a138cc66, f3b94c47 relationship-type registry and panel labels; c9a55088 M1; 73a13827 M2; cf4ce3e5 M3; f6230e40
M3b; efcda5e1 M4; 657e6045 M5; 2ddeec87 M6; cf01f6ef M7; 66961cb5, f6b751b8, a1ee3125, f2c3bba5, 8084a7c3,
9f9d0443, b2fd41bd, fc1ac675 follow-ups; 09083aac, ab44e4f4, bcaccb93 M8 parts 1–3; 22795879, 11543277, 78e255aa,
a992c67d, ca5014d6 propagation; 2b8e9d27 M9; 2c1225a5 DATA-SEAMS.

Dependencies that apply to the whole stage:
- **Red Travesía: leave out.** The corpus is a fourth `DataSource`, its data is 1.8 MB of JSON plus about 1k lines
  of adapter, and 30 files mention it. Strip every `travesia` branch at port time. Consequence: Settings stores
  have three corpora (Sample, CEJIL, Artworks) and the Paragraph extraction demo has no corpus with a rich text
  and a numeric property (main's `CLAUDE.md` says the Sample then starts empty, as the wizard explains).
- **Sample v4 seed (decision, see section 4):** `data/sample/typeFields.ts` imports `V4_DATES` from
  `data/sampleSeedV4.ts`, and `data/entities.ts` appends `V4_ENTITIES` (new Sample records and hubs).
  Port or adapt: section 4, item 2.
- **Published view:** the in-flight main port reads a flag that playground stores on the template
  (`TemplateDef.publishedView`). The stage 2a `TemplateDef` type should carry the same optional field under the
  same name, or the two ports will conflict in the seed files.

#### 2a: template types, store, seeds (read-only), relationship-type registry (M1)
- **Files (30, all new, about 3.2k lines, about 2.2k after dropping Travesía):** `data/templates/{types,mirror}.ts`,
  `atoms/templates.ts`, `atoms/templateActions.ts` (rules only; the editor comes in 2f), `data/sample/*`,
  `data/artworks/{templates,thesauri}.ts`, `data/cejil/{templatesSeed,placeKey}.ts`, `utils/{propertyKind,
  propertyValues,templateRules,dateFormat,geoFormat}.ts`, `atoms/relationTypes.ts` (281),
  `data/sampleRelationTypesStore.ts`.
- **Wiring on main:** `atoms/dataSource.ts` takes the type lists from `templateTypesMirror(corpus)` (this file
  has 5 conflict hunks and carries main's cd13a82a and 33d72d83 changes: keep those).
- **Risk:** low if the read-only property holds ("the type lists as its projection" must equal today's lists).
  Add a one-off comparison (the spec's `check:templates` script, `app/scripts/check-template-coverage.ts`).
- **Verify:** tsc, build; `npm run check:templates`; Library type filter, Create entity template list and the
  Template facet list the same types in the same order as before the stage, for each of the three corpora.
- **Size:** 1 session.

#### 2b: projection for blank forms and records (M2, M3)
- **Files (36):** `utils/templateProjection.ts` (348), `data/entityProfiles.ts`, `data/cejil/{profile,adapt,load}.ts`,
  `data/artworks/{profile,adapt}.ts`, `data/metadata.ts`, `data/entityMetadata.ts`, `data/entities.ts`,
  `atoms/{entityMetadata,entities,references,thesauri}.ts`, `utils/{entityFields,inheritance,connectionGrouping,
  countryFlag}.ts`, the record components under `components/metadata/` (`MetadataRecord`, `MetadataCard`,
  `items.tsx`, `ConnectionGroupCard`, `ConnectionCardStack`, `RelationshipFieldCard`, `InheritedValue`,
  `RecordFooter`), `data/entityChanges.ts` (as main's `entityOverlay`), `MissingRecord`.
- **Main's own changes:** template-order record and edit-form ports (25d99f4d, aa689dcf, 05fe54d4, 0e550c6d),
  the forms layer (092680dc, which changed `atoms/thesauri.ts`, `adapt.ts` and 10 more). `MetadataRecord` has
  6 conflict hunks, `data/entities.ts` 6, `atoms/references.ts` 2.
- **Dependencies:** `data/entities.ts` imports `docPages` (seeded page images): **stub** (keep main's images;
  `public/doc-pages` stays off). `V4_*` seed: item 2 in section 4. `atoms/entityChanges.ts` (698 lines on
  playground) is main's `atoms/entityOverlay.ts` plus about 190 diff lines (typed values, records laid over the
  current template): port the additions into main's file, keep its name.
- **Risk:** high. Records for every corpus read through the projection; a miss drops values (the spec's section 4.3
  lists the CEJIL flags the dump lost). Compare record contents before/after per corpus.
- **Verify:** tsc, build; `npm run check:templates`; for 5 CEJIL, 3 Sample and 3 Artworks entities, the metadata
  record shows the same fields and values as on current main; relationship and inherited fields keep template
  order; the edit form opens with the same fields.
- **Size:** 1.5 sessions.

#### 2c: typed editors and value writes (M3b)
- **Files (22):** new `TypedFieldEditors`, `MediaFieldEditor`, `MediaFieldValue`, `utils/{typedValues,mediaValue}.ts`,
  `DateInput`, `MapPointPicker`, `ImagePickerModal`, `ImageLightbox`; changed on both sides:
  `views/MetadataView.tsx` (37 conflict hunks, 756 diff lines), `MultiLanguageField`, `EditInput`,
  `ThesaurusPicker`, `BulkEditBody`, `BulkFieldRow`, `CopyFromPicker`, `RelationshipFieldEditor`,
  `utils/{createEntity,bulkEdit,copyFrom,changeTemplate,entityEdit}.ts` (these five were also added on main by
  its own ports: main's forms layer, create flow, Copy From, bulk edit).
- **Main's own changes:** the largest cluster in the repo: create flow (d19783b2, 4b073b5f, 496b2e5e, 5cf6331d,
  7873f4b4), Copy From (4f46906e), single-entity bars (23cfeacf), selection actions (71f4e94f), forms layer
  (092680dc). These are the reason this is hunk-level work.
- **Dependencies:** `MapPointPicker`/`PointPickerMap`/`useLeafletMap` need Leaflet, which the in-flight main port
  adds. Land after it, or stub the geolocation editor as two coordinate inputs until it does.
  `ImageLightbox`: main has none ("main has EntityOverlay.tsx, no lightbox" per the 10-02 note); port, since the
  image editor uses it. Media editor and in-record player (about 500 lines): port with the editor, since
  `media` is a property type the template editor offers; the alternative is a plain URL editor for `media`.
  `useDrawerWidth`/`session.ts`: not needed here.
- **Risk:** high. `MetadataView` carries the edit form, Create entity draft and Copy From.
- **Verify:** tsc, build; storybook for the typed editors; create, edit and save one entity per property type;
  Copy From, bulk edit and Change template still work; generated IDs are drawn once for a new entity and left
  out of bulk edit (b2fd41bd).
- **Size:** 2 sessions.

#### 2d: Sample and Artworks onto templates (M4)
- **Files:** the Sample and Artworks `values.ts`, `typeFields.ts`, adapters (most are in 2a/2b).
  This step is mainly the data cutover; if the Sample v4 decision is "port", the seed data lands here.
- **Risk:** medium. Visible change in the Sample corpus if v4 is ported (new hubs and fields on main's Sample).
- **Verify:** `check:templates` for both corpora; Sample entities keep their card lines and records.
- **Size:** 0.5–1 session.

#### 2e: Library cards, columns, filters from templates (M5, M6, M7 and follow-ups)
- **Files (11):** `components/library/{EntityCard,CardValue,listColumns,LibraryFilters,LibraryDisplayMenu,
  BatchEntryModal}.tsx`, `atoms/library.ts`, `data/libraryDisplay.ts`, `utils/{libraryFacets,libraryFilter}.ts`,
  `views/LibraryView.tsx`. Contested lines main↔playground: 3.4k.
- **Main's own changes:** 36 commits touch these (stacked-only cards with a Thumbnail frame, multi-selection,
  the drawer Results, bulk actions, create flow, phone Library). Conflicts: `LibraryView` 41, `EntityCard` 23,
  `atoms/library.ts` 16, `LibraryFilters` 9, `libraryDisplay` 7.
- **Dependencies, all playground-only features main deliberately lacks (leave out, port only the template hunks):**
  the timeline/time strip (`LibraryTimelineView`, `TimeBrush`, `TimeSpine`; `utils/timeline.ts` is not
  needed by cards, but `components/site/useSiteData.ts` in 3b imports `entityTime` from it: port only that
  function, 6 lines); thumbnail size/frame/fit config and the Columns setting; Side-layout cards; the card
  hover loupe (`docPeek`, `PageLoupe`); `BatchEntryModal` (main has a single Create button); results ranking.
  So: cards read `showInCard` in template order; list columns by property name; facets by `filter`/
  `defaultfilter`/`prioritySorting`, without touching the cut features. Relationship panel labels through
  `relationLabel` (f3b94c47) go here, because the registry from 2a feeds them.
- **Risk:** highest of the stage. A whole-file copy would bring back every cut feature. Do hunk by hunk.
- **Verify:** tsc, build; the Library grid, list, map and drawer Results render the same entities; a card's
  lines follow a template's `showInCard`; list columns offer the selected templates' properties; property
  facets follow "default filters, or what every selected template shares"; Display menu unchanged on main
  (no thumbnail fit, no timeline); the Library perf traps in `CLAUDE.md` still hold (`filterState` memo,
  `ResultsBody` callbacks).
- **Size:** 2 sessions.

#### 2f: Settings › Templates, template editor, usage queries, guarded deletes (M8, M9)
- **Files (11):** `pages/TemplatesPage`, `pages/TemplateEditor` (1,194 diff lines), `pages/TemplatePropertyPanel`
  (new), `propertyTypeIcons.ts`, `TemplateCardPreview`, the rest of `atoms/settingsUsage.ts` and
  `utils/settingsUsage.ts` (342), `components/shared/SettingsDeletes.tsx` (355), `hooks/useRelationTypeUndo.ts`,
  `hooks/useSettingsCorpus.ts`. About 1.6k new lines.
- **Main's own changes:** two aria/copy commits (2ac6ef37, 35a164e7), both on playground.
- **Dependencies:** 3a's `ThesauriPage` and the relationship-type page use the same usage queries; ship the
  families the template editor needs (template, property, relationship type) now and add the others in 3a/3b/3c.
  M9 removes `data/settings.ts` `PropertyType`/`templatePropertiesByTemplate`/`seedTemplates`: do it only after
  every main reader is moved (2b–2e) and the old Settings pages that read them (Filters, Thesauri on main) are
  moved in 3a; otherwise keep the old shapes until then.
- **Risk:** medium. Editing a template rewrites records, cards, columns and the edit form (M8 part 3).
- **Verify:** tsc, build; acceptance rows `TPL-*` (30) and `TED-*` (115; the template editor's own matrix);
  add a property, rename, reorder, delete, change a flag and watch the Library card, a column, the facets, a
  record and the edit form follow; the delete is refused with the usage text when it should be.
- **Size:** 2 sessions.

### Stage 3: the other Settings pages, in four groups

Each group needs stages 1 and 2 only through the stores it names; each is pushable alone.

#### 3a: content model pages (small-medium)
- **Pages:** Thesauri (list and editor as a tree, A–Z, move, keyboard reorder, CSV import/export), Relationship
  types (list, editor, usage, references movable), Filters (properties table reads the templates' filter flags).
- **Playground commits:** 393c3287; 8a289dd1 thesaurus tree (UX6); 4e2bf69f thesaurus CSV (UX3); 74fe6bc0
  keyboard reorder; e4b639b8 thesaurus on a missing id; 66961cb5 Filters page; f24d8390; 7cbe4201.
- **Files (8):** `ThesauriPage`, `ThesaurusEditor` (902 diff lines), `RelationTypesPage`, `RelationTypeEditor`,
  `FiltersPage`, `utils/thesaurus{Tree,Csv}.ts`, `ThesaurusImportModal`.
- **Main's own changes:** the forms layer touched `ThesauriPage` and `ThesaurusEditor` (092680dc; main's
  `atoms/thesauri.ts` is "both added" with 45 diff lines against playground's), plus aria/copy (2ac6ef37,
  35a164e7). Conflicts: `ThesaurusEditor` 5, `ThesauriPage` 3, `RelationTypesPage` 2.
- **Dependencies:** the relationship-type registry (2a), the template store (2a), usage queries (2f).
  `FiltersPage` is meaningful only after 2e. The panel's "Manage relationship types" modal already goes through
  the registry (a138cc66; hunks in `ManageRelationTypesModal.tsx`, 4 conflicts; do these in 2e or here).
- **Risk:** medium (thesaurus store reconciliation).
- **Verify:** acceptance `THS-*` (42), `REL-*` (24), `FLT-*` (27); the entity edit form's thesaurus picker still
  reads the same store; thesaurus import/export round trip.
- **Size:** 1 session.

#### 3b: collection pages (medium)
- **Pages:** Collection, Global CSS & JS, Menu, Pages (code editor A with live preview), Uploads.
- **Playground commits:** f0a9a734; 4d7cd191 singletons (in 1b); 7ff6a5bc Menu on one tree; aaaaa070 Pages on one
  store; b2180b0d Pages code editor (09-28); 1cf3a325 Uploads; 194e2f6b, c6ca4c8f, 02a7cf80 Collection and its
  rules; 956db631 seed pages in every language; b89e11b1; 3e92ed8d.
- **Files (23):** `CollectionPage` (702 lines), `CustomisationPage`, `MenuPage`, `MenuLinkEditor`, `PagesPage`,
  `UploadsPage`, `pages/site/*` (5 files, 1.1k lines), `components/site/{PublicPreview,useSiteData}`,
  `atoms/{siteMenu,sitePages,uploads}.ts`, `data/sitePages.ts` (543), `utils/{collectionRules,menuTree,
  sitePageRender}.ts`, `hooks/useUploadFiles.ts`, `shared/map/*`.
- **Main's own changes:** aria and copy only (2ac6ef37, 130d2606). Conflicts: `MenuPage` 2, `PagesPage` 1.
- **Dependencies and decisions:**
  - Collection's map point and favicon picker: `shared/map/PointPickerMap.tsx` + `useLeafletMap` need Leaflet:
    wait for the in-flight maps port, or hide the map-point field until it lands.
  - **Navbar menu links stay out.** 7ff6a5bc put the saved menu in the app navbar (`NavMenuLinks`); Juan had it
    removed on 10-05 (b59c668d). Do not port that part (`feedback-scope-creep-on-landing`). Check the diff of
    `layout/Navbar.tsx` before landing.
  - `components/site/useSiteData.ts` imports `utils/timeline.ts` (`entityTime`): port that one function (6
    lines), not the file (200 lines of buckets).
  - Pages editor B (`sites/`, branch `design/pages-editor-2`) is a separate app directory, not part of this
    port. Page A (Settings › Pages) goes here.
  - `Dropzone` (stage 1a) and `ImagePickerModal` (2c) are used by Uploads and Collection.
  - Window title and the Library's default view read the Collection singleton (`App.tsx` hunk, and 4 small
    changes in `LibraryView`/`atoms/library.ts`; the latter two are the contested files, take only the reads).
- **Risk:** medium. `App.tsx` and `LibraryView` hunks sit in files the in-flight lane is editing.
- **Verify:** acceptance `COL-*` (38), `MEN-*` (20), `PAG-*` (33), `UPL-*` (18), `CSS-*` (18); Collection save
  changes the window title; Pages preview never runs page JS; the app bar is unchanged.
- **Size:** 1.5 sessions.

#### 3c: languages and translations (small)
- **Pages:** Languages (install modal, type-CONFIRM uninstall, default language), Translations (412 shipped
  System keys, per-language progress, Untranslated only), Translation editor.
- **Playground commits:** 89ab3897; c747a4b3; 4d235480; a76ab6b0; a009e643; 5eeb6618; 26d0c6f0.
- **Files (6):** `LanguagesPage`, `TranslationsPage`, `TranslationEditor`, `languages/InstallLanguagesModal`,
  `atoms/{languages,translations}.ts`, `data/uwaziUiKeys.ts` (about 3k lines of keys).
- **Main's own changes:** aria (2ac6ef37). Conflicts: one hunk each in `LanguagesPage` and `TranslationsPage`.
- **Dependencies:** `settingsUsage` language family (2f); `atoms/siteMenu` for the Menu context (3b); main's
  `MobileActionMenu` is imported by the languages page (both-changed: keep main's).
- **Verify:** acceptance `LNG-*` (20), `TRN-*` (23).
- **Size:** 0.5–1 session.

#### 3d: dashboard, activity log, Dev panel (small)
- **Pages:** Dashboard (four cards from the stores, Reset demo data), Activity log (filters, sort, pages,
  export), Placeholder, and the Dev panel (role and feature switches, failure injection, slow load, zero rows;
  inert in production builds).
- **Playground commits:** 7ec6b6e8; 4f1c50e0; 8a5b8ad2; b60b6e2d; 4b9c92cf; e32e10db; 4e3e8275.
- **Files (7):** `DashboardPage`, `ActivityLogPage`, `PlaceholderPage`, `atoms/{dashboardStats,devSwitches,
  apiKeys}.ts`, `views/catalog/DevPanel.tsx`.
- **Main's own changes:** one copy edit (35a164e7). One conflict hunk in `DashboardPage`.
- **Dependencies:** `devSwitches` imports the extraction and paragraph-extraction stores (stage 4) and the
  template and relationship-type stores; port it with those inert switches or only the switches that exist by
  then. `dashboardStats` reads every store: it can land only after 2–3c, so this group is last of stage 3.
- **Verify:** acceptance `DSH-*` (15), `ACT-*` (20), `SD-*` (8), `NAV-*` (17).
- **Size:** 0.5–1 session.

### Stage 4: Import CSV, metadata and paragraph extraction, Preserve (large)

- **Playground commits:** f18040fa tools pages on the shells; 94d58879 Import CSV on the shells (csv.v2);
  50866f51 Metadata extraction (IXE); 52db5fe5 Paragraph extraction (PXE); d9020f23 Preserve token card (G9);
  b0ebbde3 Import CSV gated by role; c195a10e collaborators get no Import CSV; the CSV runner in `App`.
- **Files (34):** new `ImportList`, `ImportStatusPage`, `importFormat.ts`, `atoms/{csvImports,extraction,
  paragraphExtraction,preserve}.ts`, `data/{extraction,paragraphs}.ts`, `pages/{extraction,paragraphs}/*`,
  `hooks/useRegisterCsvImport.ts`; 10 main files removed (`ImportDetailView`, `ImportListView`, `ImportTable`,
  `EntitiesTable`, `IssuesTable`, `ImportEmptyState`, `ToolsActionBar`, `ExtractorEditor`, `ParagraphJobEditor`,
  `PreserveTokenEditor`, `PageEditor`, `ImportTable.stories`); changed on both sides: `ImportCSVView`,
  `ImportCSVLayout`, `NewImportModal`, the two extraction pages, `PreservePage`. About 3.3k new lines.
- **Main's own changes (9 commits):** phone fixes for Import CSV and Paragraph Extraction (12bf62e7, dd7ff3db),
  touch targets (62b1d4b4), the gutter, the warm edge, the Library footer's import action (5f5c1325), copy and
  aria (130d2606, 2ac6ef37, 35a164e7). Conflicts: `NewImportModal` 4, `ParagraphExtractionPage` 3, others 1 each.
  The phone behaviour of main's Import CSV list (M10) and Paragraph Extraction rows (M26) must be re-checked on
  the new shells, since the replaced files carried it.
- **Dependencies:** `useCsvImportRunner` mounted in `App.tsx` (a hunk in a file the in-flight lane edits);
  `FiltersSlideOver` rename: the three extraction pages import it, use main's `FiltersDrawer`; extraction
  `Accept` writes the entity through the change layer (`atoms/entityChanges` API: main's `entityOverlay`
  needs the matching action, about 30 lines); Paragraph extraction needs a corpus with a rich text and numeric
  property (Travesía only: **stub**, the wizard already says what a target needs). The Library footer's
  "Import CSV" opens `NewImportModal` on arrival (`openNewImportOnArrivalAtom` in `atoms/navigation.ts`, which
  also gains the `"login"` AppView on playground: take the atom only).
  After this stage, delete `settings/Button.tsx`, `Field.tsx`, `Table.tsx`.
- **Risk:** medium-high: it replaces a working main surface (Import CSV is also reachable from the Library
  footer, which main made functional on 09-23) and relies on timers with Beacon tasks.
- **Verify:** acceptance `CSV-*` (24), `IXE-*` (22), `PXE-*` (15), `PRV-*` (13); the Library footer's Import CSV
  and "Upload PDF" still work; a running import survives navigation (Beacon task per import); Import CSV is
  admin only; phone viewport for the CSV list and the paragraph job rows.
- **Size:** 2 sessions.

### Stage 5: docs (small)

- **Playground commits:** 952ba19d, 570c1921, cf3dc21f (CLAUDE.md Settings sections), 2c1225a5 (DATA-SEAMS:
  templates as the schema), 7438252c (TYPOGRAPHY.md role table), bef794d0 (muted is not a text colour in
  `TOKENS-MAPPING`, `PILOT-COMPONENTS`), 4a17dec7 (CLAUDE.md rewrite; main already has its own version).
- **Files:** `CLAUDE.md` (main 322 lines, playground 385), `handoff/TYPOGRAPHY.md` (209 diff lines),
  `handoff/DATA-SEAMS.md` (86), `handoff/{COMPONENT-INVENTORY,PATTERNS,PILOT-COMPONENTS,TOKENS-MAPPING}.md`,
  `handoff/uwazi-semantic-tokens.css`, `README.md`.
- **What to carry by hand (not copy):** the "Settings stores" and "Type roles" paragraphs, the shells paragraph
  (`SettingsListPage`/`SettingsEditor`/`SettingsFormPage`, `data-measure`), per-corpus vs global scope, role gating,
  usage and guarded deletes, the Import CSV / extraction / paragraph extraction store paragraphs, the data-model
  paragraph on templates as the schema. Keep main's "What main does not have" section and add the Travesía,
  login and Sample v4 lines if those stay out. Do not copy playground's text for the timeline, When view,
  per-scope Relationships panel or thumbnail controls.
- **Timing:** write each section in the stage that lands its code (stage 1 → stores, stage 3 → shells), so the
  doc never describes code main lacks. This stage is the final reconciliation and the `handoff/` files.
- **Verify:** every file path and identifier a paragraph names exists on main; `handoff/TYPOGRAPHY.md` role
  table matches the classes in the ported files.
- **Size:** 0.5 session.

### Summary

| Stage | Files | New lines | Contested (conflict hunks) | Size | Depends on |
|---|---|---|---|---|---|
| 1a shared UI | 24 | ~0.3k | 11 files (9) | 0.5 | none |
| 1b stores, hooks | 17 | 1.8k | 1 (0) | 1 | 1a |
| 1c shells + people pages | 37 | 3.2k | 4 (12) | 1.5 | 1a, 1b |
| 2a store + seeds | 30 | ~2.2k | 0 | 1 | 1b |
| 2b projection | 36 | 1.4k (+0.9k changed) | 13 (≈15) | 1.5 | 2a |
| 2c typed editors | 22 | 1.5k | 13 (≈50) | 2 | 2b, maps port |
| 2d Sample/Artworks | (in 2a/2b) | — | — | 0.5–1 | 2b, v4 decision |
| 2e cards/columns/filters | 11 | 1.4k | 6 files (≈100) | 2 | 2b |
| 2f Templates + editor | 11 | 1.6k | 2 (≈3) | 2 | 2b–2e |
| 3a content pages | 8 | 0.6k | 3 (10) | 1 | 2f |
| 3b collection pages | 23 | 2.9k | 2 (3) | 1.5 | 1c, 2f, maps port |
| 3c languages/translations | 6 | 0.6k (+3k keys) | 2 (2) | 0.5–1 | 3b |
| 3d dashboard/log/dev | 7 | 0.4k | 1 (1) | 0.5–1 | 3a–3c, 4 for switches |
| 4 import/extraction/Preserve | 34 | 3.3k | 6 (11) | 2 | 1c, 2f |
| 5 docs | 9 | — | CLAUDE.md | 0.5 | all |

Total about 18–20 lane sessions, of which stage 2 is 9–10.

## 4. Playground-only features the stages need: port, stub, or leave out

| # | Item | Needed by | Recommendation | Why | Cost if wrong |
|---|---|---|---|---|---|
| 1 | Red Travesía corpus | Settings per-corpus code, M3, PX demo | Leave out; strip `travesia` branches | Fourth data source, 1.8 MB JSON, adapters, Navbar corpus option; not named for main | 30 files edited at port time; Paragraph extraction demo lacks a valid corpus |
| 2 | Sample v4 seed (hubs, fields, `published` flag) | Sample templates (`typeFields` reads `V4_DATES`) | **Decision for Juan.** Default: adapt, i.e. write main-specific Sample template seeds from main's current Sample types | Porting v4 changes the Sample corpus on main (new records, hubs, `data/references.ts` +1.1k lines) | Port: visible Sample change on main. Adapt: 170 lines of hand-written seed, risk of a mismatch with main's current Sample fields |
| 3 | Login screen, sign-in art, mock auth | Users store's "signed in" | Leave out; keep the default signed-in admin and the Dev panel role switch | Not Settings; 3.9 MB of art; `appView = "login"` | None for Settings; Account page has no sign-out |
| 4 | Leaflet maps | Collection map point, `MapPointPicker`, geolocation editor | Wait for the in-flight maps port (approved 10-05) | Same dependency set (`leaflet`, `leaflet.markercluster`, `vite.config.ts` optimizeDeps) | If the lane slips, hide the map-point field and use two coordinate inputs |
| 5 | Published view and `TemplateDef.publishedView` | `TemplateDef` shape | Port the field name with the type in 2a; the view itself comes from the in-flight lane | Avoid two ports editing the same seed files | Seed-file conflicts |
| 6 | Seeded document-page images (`data/docPages`, `public/doc-pages` 3.2 MB) | `data/entities.ts` | Stub: keep main's images | Cosmetic; not Settings | None |
| 7 | Media editor and in-record player | `media` property type, typed editors | Port with 2c (about 500 lines) | The template editor offers `media`; a plain URL editor is the fallback | Fallback loses chapters editing |
| 8 | `utils/timeline.ts` | `components/site/useSiteData.ts` (`entityTime`) | Port the one function only | Timeline is a cut feature | None |
| 9 | `useDrawerWidth`, `session.ts`, `useSettledWidth`, `settleScroll` | `DrawerTabs` on playground | Leave out; use main's adapted `DrawerTabs` | Main ported only the fold and the 360 minimum | None |
| 10 | Code renames B8–B10 (`entityChanges`, `*SlideOver`, `ChangeLayer`, atoms moved) | Settings imports `entityChanges`, `FiltersSlideOver` | Leave out; adapt the imports | Touches 25 non-Settings files | Future ports from playground need the same adaptation each time |
| 11 | Type-role pass on non-Settings files | none | Apply only to ported files | 47 of the 91 files that pass touched are outside the Settings stages | Settings and the rest of main differ in type roles until Juan decides |
| 12 | `ImageLightbox`, `PageLoupe` | Image editor, card hover | Port `ImageLightbox` in 2c; leave out `PageLoupe` | Loupe belongs to the card hover feature | None |

## 5. Playground-only features that are not Settings and must stay off main

Source: main's `CLAUDE.md` "What main does not have", the auto-memory notes, and the playground-only file
list (190 files). None of these is needed by a Settings stage.

1. **The five Playground Split cuts** (2026-09-08): the Library's chronology (`LibraryTimelineView`,
   `TimeBrush`, `TimeSpine`, `BucketBreakdown`, `utils/timeline.ts`, the Results spine layout); thumbnail
   size / frame / fit controls; the Metadata drawer's Template tab (`TemplateStructure`) and Document tab; file
   re-ranking and the Files drawer's Translations tab.
2. **Other playground-only Library work:** the card Columns setting and Auto column count (baaea098, c43622be),
   the card hover page lift and loupe (c4f87062, cd111a59, 0abbf4b6, 94cad049, f4d0d5b5, `docPeek`,
   `PageLoupe`), Side-layout cards (main kept stacked only), portrait Size steps (8edd0c19), batch entry
   (7d1e2d8d, 6ca12872, c619371f; main has a single Create button), Results rework (relevance score,
   passages, `MatchedTerms`, `AlsoUnder`, 28dbeb8f, 2dd63b31, 08292717 and the other 09-21 Results commits),
   AND/OR/NOT and wildcard search (811e1437, d56c863a).
3. **Relationships:** the When view (`when/*`, `entityDates`, c8bffa85, ebbb2196, b8350b8a, d0ee17f7), per-scope
   panel state, Anchoring and Direction facets, "Most evidence" sort, one-member hubs as plain rows (2ce08617,
   df98f1c0, 3cc37d83, 34528a10).
4. **Login screen and sign-in art** (e0af1078, c5edd598, 6f8d98b5, 091360f3's screen; the "log in" account copy
   is already on main), `Wordmark`, `public/login-art`.
5. **Red Travesía** corpus (23e647de, 92c22dee) and its scripts.
6. **The `sites/` site builder** (b5a4e466 and the 09-29 commits) and the Settings › Pages editor B comparison;
   it is a separate directory and branch (`design/pages-editor-2`).
7. **Markup and a11y passes that touched the whole app** (09-16 landmarks and headings, 1be2f622,
   `useFocusTrap` inert fix fd21bbb4) except where a ported file already carries them.
8. **Entity-view internals with playground-only code:** `useDrawerWidth`, `session.ts`, the pane divider
   (6b62054e), `TabCount` (f1680b3e and follow-ups), `settleScroll`, the Metadata record as file-details
   panel (d8cc35e7, then rolled back 989ca942).
9. **Already approved separately and not part of this plan:** the Library/CEJIL landing (cd13a82a), the published
   view, and the Leaflet maps (Code, `uwazi_app-729900-main`).

## 6. Coordination and sequencing risks

- **Main's tip is moving.** Local `main` cd13a82a is unpushed and origin/main is b8b69cc0; the lane in
  `uwazi_app-729900-main` has uncommitted edits to `App.tsx`, `MainTabs.tsx`, `MobileBottomSheet.tsx`. Start
  stage 1a after that lane's push; `App.tsx` is touched by 1c/3b/4 hunks (window title, CSV runner) and by that
  lane.
- **Branch from origin/main after it is pushed, and re-diff then.** The three-way tables above are for cd13a82a.
  Main's own commits keep landing (mobile ports follow the "mobile fixes go to main too" rule), so each stage
  should re-run the conflict check on its file list before starting.
- **`ComponentCatalog.tsx`** (925 diff lines, 5 conflict hunks) and `views/catalog/*` take entries in every
  stage; add them hunk by hunk. `settingsDemos.tsx`, `collectionDemos.tsx`, `DevPanel.tsx` are new.
- **Per-stage rule from 10-05:** before landing a lane's commits, read `git show --stat` for files outside the
  stage (navbar items slipped in once) and for `app/node_modules` (a lane's symlink once replaced Juan's
  install).
- **sessionStorage keys are shared between branches on `huridocs.github.io`.** Main and playground deploy to the
  same origin, so Settings stores written by playground (`uwazi:…` keys, versioned keys from 52576f9f) can be
  read by main's build and vice versa. After stage 1b, a visitor who used playground first brings its stored
  Settings state into main. Versioned keys exist for this; confirm that main ignores keys it does not know,
  and that an old main reading a new shape does not crash. (I did not test this; it is the 09-26 gotcha,
  "main and playground share storage".)
- **The acceptance rows for `X-*`** (cross-cutting: unsaved-changes guard, destructive confirms, phone, a11y,
  contrast, activity log) apply to each stage as soon as one migrated page exists.

## 7. What I did not verify

- No stage was tried; every "tsc green" is an expectation. Cycles in the stores (see 1b) are the likeliest
  surprise.
- The import closure was computed from static `import` statements only; dynamic imports and string-keyed
  registries (`registerSettingsReset`, `CatalogEntry`) are not in it.
- Whether main's `DrawerTabs` accepts the props `UsersPage` passes, and how main's `Navbar.tsx` opens Settings,
  are expected from the diffs but not read. (`ActionsSheet` on main's `LibrarySelectionBar` was checked and exists.)
- Size figures for 2a include Travesía files that are dropped; sub-stage splits inside stage 2 are by file path
  patterns I chose, not by playground commit boundaries (those cross stages).
- The in-flight published-view and maps port was not read.
