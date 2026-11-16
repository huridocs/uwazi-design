# Prototype Settings: what it does today (phase 1)

QA, 2026-10-04. Code under test: `origin/playground` f4d0d5b5, served from my own detached worktree
on port 1438 (Vite dev server, mock "Sample" data source). No code was changed.

## How this was checked

- **D** = driven in headless Chromium with Playwright (desktop 1280×800, phone 390×844 with touch emulation). Scripts are in my scratchpad, screenshots in `dev/results/settings-deep-dive/shots/`.
- **C** = read in code only. Where a row says C, I did not drive it.
- axe-core ran on every page at both sizes (scoped to the Settings pane). Keyboard: Tab order, names and focus styles on Account, Languages, Filters, Templates only; the other pages are code read for keyboard.
- Not covered: dark mode, RTL, the CEJIL/Artworks/Travesía data sources (pages re-seed per source; I only tested "Sample"), drag-and-drop with a mouse (reorder by Move up/down buttons was driven), real file pickers, screen reader output.

Legend for the result column: **works** = does what its label says inside the page; **partial**; **no-op** (toast or nothing); **missing**.
Legend for persistence: **none** = lost when the page unmounts (switching rail item, or reload); **session atom** = survives rail navigation, lost on reload; **storage** = survives reload.

## F1 re-verification (playground 952ba19d; a6b6aca3, faf68858, 66e721c7, 952ba19d)

Re-run 2026-10-04 in my own detached worktree at 952ba19d, port 1438, headless Chromium at 1280×800 and 390×844. All D (driven). Rows below that F1 changed are marked **[F1]** in the page tables further down; the phase-1 text of those rows is kept and struck through where F1 replaced it.

| F1 claim | Result | Evidence |
|---|---|---|
| Users: create persists, with role and group | PASS | New user "newbie" listed with Editor + Litigation; Users tab count 5→6 |
| Users: edit persists | PASS | mlopez renamed to mlopez2, row updated |
| Users: delete persists | PASS | tbuergenthal removed, list 5 rows |
| Persist across rail navigation and reload | PASS | Dashboard → Users and a full page reload both keep created, edited and deleted users (sessionStorage overlay) |
| Dashboard "Users" stat follows the store | PASS | 5 after +1 −1 (was a static 5 in phase 1) |
| Membership by id | PASS | Renaming group Litigation to Lit2 left all 3 members in it; group list shows "Lit2 3"; group editor ticks 3 |
| Groups: create, delete | PASS | "QA team" created with jnkemba as member and chip shown on the user; deleting the group removed the chip, user kept |
| Delete yourself blocked | PASS | Dialog "Can't delete this user: You can't delete the account you're signed in with."; admin still listed |
| Last admin protected | PASS | Admin editor disables the Editor and Collaborator radios with "This is the last admin, so the role stays Admin". Signed in as editor jnkemba (the row shows "(you)"), Delete on admin opened the dialog "Can't delete this user: This is the last admin. Make another user an admin first." (OK only); admin stayed listed |
| Login lists new user, drops deleted | PASS | newbie2 (created in Settings) signs in; afarah (deleted) cannot |
| Share dialog lists new user, drops deleted | PASS | Court Case Share: "newbie2" found and added as a member; "afarah" → "No user or group found" |
| "Reset demo data" in Dashboard | PASS | Confirm dialog; Cancel keeps edits; Reset restores 5 seed users (afarah back, newbie2 gone), the Case status thesaurus count 6→5, and the About page's draft edit; signed-in marker returns to admin |
| Discard prompt: rail navigation | PASS | All 11 editors and 4 form pages that have rail siblings, dirty → "Discard unsaved changes?"; Keep editing stays with the edit retained, Discard leaves |
| Discard prompt: Back arrow and breadcrumb | PASS | 11 editors (user, group, menu link, template, thesaurus, translation, relationship type, extractor, paragraph job, preserve, pages code editor) |
| Discard prompt: mobile back chevron | PASS | Collection, Global CSS & JS, Filters, Account (clean → no dialog; dirty → dialog; Keep editing stays; Discard → rail) |
| Discard prompt: mobile Back arrow | PASS | User editor, Template editor, Pages editor at 390×844 |
| Discard prompt: corpus switch | PASS | All 15 pages: dialog shown, Keep editing leaves "Collection: Sample" and the settings view. Discard switches to CEJIL and opens the Library. Clean switch: no dialog. Not driven: corpus switch from the phone menu sheet (screenshots only) |
| Not asked when clean | PASS | Every page: no beforeunload, rail nav goes straight through |
| Dirty clears after Save | PASS | Collection, Global CSS & JS, Filters, Account (Save profile), Pages editor (Save draft): after Save, no beforeunload and rail nav without a dialog. The other 11 editors close on Save with no dialog |
| Dirty clears after an unchanged dialog | PASS | Template editor: open a property's edit dialog and Save with no change, or Esc: still clean. Toggling a property checkbox and toggling it back by hand also reads clean |
| Dirty clears when an edit is undone by hand | PASS | User editor username; Account password and profile fields |
| beforeunload prompt while dirty | PASS | A cancelable `beforeunload` event is prevented on all 15 dirty pages and not on clean ones. I dispatched the event and read `defaultPrevented`; I did not drive a native browser prompt, which headless Chromium does not show |
| Cancel is an explicit discard | PASS | All 10 editors that close on Save: Cancel returns to the list with no dialog |

Wording note: the dialog title is "Discard unsaved changes?" (message names the form, e.g. "User edits haven't been saved"), not "Discard changes?". The Discard / Keep editing buttons match.

Three of my first-run assertions failed and passed on re-run with a settle wait (undo-by-hand on the user editor, Account password cleared, corpus switch + Discard); those were test timing, not product behaviour.

### What F1 did not change (still true from phase 1)

Menu, Templates, Filters, Languages, Translations, Relationship types, Pages list, Collection, Uploads, Customisation, Activity log and the three ML/Preserve pages still keep their lists in local state and re-seed when you leave them; their editors still do not write back (only the guard changed). Persisting those is not in F1 (the store exists, only users and groups use it). Template, Filters and Languages still propagate nowhere.

### Regressions

None found. I re-ran the phase-1 sweep (all 18 pages, desktop and phone): same titles, same table widths (Users 656px etc.), no new horizontal page overflow, no console errors beyond the existing jotai `atomFamily` deprecation. One new axe hit: **Account now shows a "2FA Enabled" badge on load** (the seed admin has 2FA), and that green-on-tint badge fails contrast at 3.32:1, the same pattern as phase 1 finding 7. Not a new defect type, but it is the first thing on that page.

New small observations on F1 (not failures):
- The signed-in user's row now shows "(you)" and Account's profile Save writes to the users store (the Users list showed the new email). Disabling 2FA on Account also clears the shield in the Users list.
- The dialog for blocked deletes has only "OK"; the editor disables the other roles for the last admin but gives no way to see why before hovering the radios (the hint text is under the Role section).

## F1 follow-up verification [F1b] (playground b0ebbde3; 52576f9f, d8cd00d4, 4d7cd191, 67df5b47, a8f591a9, 7cbe4201, 94c7e577, b0ebbde3)

Re-run 2026-10-04 on b0ebbde3 in my own detached worktree, port 1438, headless Chromium. D = driven. Everything below passes unless marked.

| Check | Result | Evidence |
|---|---|---|
| Collection, Global CSS & JS, Filters persist across rail navigation and reload | PASS | Saved on Sample: name "Sample QA", default view Table, CSS, Filters (Person unchecked, order changed). Same values after Dashboard/Menu and back, and after a full reload. Storage keys: `uwazi:settings:v2:collection:<corpus>`, `…:customisation:<corpus>` (and `…:filters:<corpus>`), versioned |
| Per corpus (switch and back) | PASS | CEJIL's Collection page opens on its own name and CSS (not Sample's); saving "CEJIL QA" leaves Sample's "Sample QA"; Filters on Sample, Artworks, Travesía and CEJIL each survive a corpus switch and back, and a reload |
| Window title `<collection name> · Uwazi` | PASS | Sample "Inter-American Human Rights Archive · Uwazi", CEJIL "CEJIL · Uwazi", Best Artworks "Best Artworks · Uwazi", Red Travesía "Red Travesía · Uwazi"; after a save: "Sample QA · Uwazi", "CEJIL QA · Uwazi"; Sample's title returns when switching back |
| Library opens on the saved default view until you pick one | PASS | Default Table → Library shows "List"; picking Cards keeps Cards after Settings later saves "Map"; after a reload (pick forgotten) it opens on Map |
| Library Template facet on Sample | PASS (9 types, not 11) | Default: Person, Country, Violation, Right, Organization, Hearing, plus Documents ▸ Court Case, Judgment, Document. That is all 9 entity types and all 9 templates in Settings; the Sample has no 11. Hiding Court Case removes it; Documents-bearing types stay in the Documents card, in Filters order within each card |
| Template facet on Artworks, Travesía, CEJIL | PASS | Artworks: Artwork, Artist. Travesía: 15 types (ALBERGUE … BD Importación). CEJIL: Causa, Medida Provisional, Documentos ▸ …, Juez y/o Comisionado. On each: hiding one type removes it, moving a row changes the order, both survive reload. CEJIL groups: renaming "Documentos" to "Docs QA" shows in the facet; setting a type to "No group" takes it out of the group |
| Roles: editor (jnkemba) | PASS | Rail: Account, Metadata extraction, Paragraph extraction. Settings menu: User settings only (no System settings). Tools: Metadata extraction, Paragraph extraction. A stored section "users" falls back to Account, and the stored value is rewritten to "account" so the rail marks Account current. Import CSV deep link renders the Library |
| Roles: collaborator (afarah) | PASS | Rail: Account only. No Tools button. No System settings. Import CSV deep link renders the Library |
| Roles: admin | PASS | All sections; Tools lists Preserve, Activity log, Global CSS & JS, Uploads, Import CSV, Metadata extraction, Paragraph extraction; Import CSV opens |
| Duplicate username/email refused, case-insensitive | PASS | Create with "ADMIN", " Mlopez " (trim + case) or "M.LOPEZ@CEJIL.ORG": "Already exists" under the field, Invite disabled, nothing added. Edit: another user's username or email (any case) refused; your own username in another case is allowed |
| Cannot delete yourself; cannot demote the last admin | PASS | "You can't delete the account you're signed in with." Last admin's Editor and Collaborator radios are disabled. A non-self last-admin delete cannot be reached from the UI now (only an admin can open Users & Groups) |
| Admin demoting themselves asks first | PASS | With a second admin, Admin → Editor on your own record: "Change your own role. You will be an Editor as soon as this saves, and lose access to System settings and most Tools." Cancel keeps Admin; "Change my role" saves and Settings falls back to Account with a reduced rail |
| Corrupt sessionStorage overlay does not crash | PASS | 9 corruptions (not JSON, null, string, array, overlay missing fields, user without groupIds, user with an invalid role, a patch that invalidates a user, singleton fields of the wrong kind) on users, groups, collection, customisation, filters, relationship types, the activity log and the signed-in user, plus an old unversioned key: the app loads, Users shows the 5 seed rows (invalid records dropped), Collection, Filters, Global CSS & JS, Dashboard, Relationship types, Activity log and the Library all render, no page errors |
| Reset demo data | PASS | Dialog lists users, groups, thesauri, collection settings, filters, global CSS and JS and the activity log. Signed in as a user created this visit (admin role): "Demo data reset. newadm no longer exists, so you are signed in as admin." Title, Filters, CSS, CEJIL name, created users and all 6 settings storage keys are back to the seed. As the seed admin: plain "Demo data reset" |

### Relationship types as one registry (7cbe4201)

| Check | Result | Evidence |
|---|---|---|
| Settings list | CHANGED | 12 types of the Sample's real registry (Mentions 100, Relates to 123, Cites 97, Refers to 95, Victim 6, Petitioner 4, Respondent State 5, Judgment 4, Signed by 11, Nationality 9, Member of 4, Hearing 48) with a Templates column (Relates to and Cites: Court Case). "Represented by" and the inverse-name field are gone; "No label" is not listed |
| Create reaches the panel and template fields | PASS | "QA type" (0 references) appears in the entity's Manage relationship types modal and in the template editor's relationship field type picker. A second "qa TYPE " is refused ("Already exists") |
| Rename reaches the panel; keeps usage | PASS | Cites → "Cites QA": 97 references unchanged; the entity's Relationships panel group reads "Cites QA 2" (same count); Manage modal shows the new name |
| Delete with references moves them, for real | PASS | Delete Refers to (95): dialog "Its 95 references move to the type you choose, then the type is deleted. Undo in the notifications puts both back."; Move to Cites QA: Settings Cites QA 97 → 192, Refers to gone; on the Court Case entity the panel shows "Cites QA 3" and no "Refers to" (Cites 2 + Refers to 1 before) |
| Undo | PASS, with a limit | The Beacon Undo restores the type and its references (counts back to 95 / 97) while you are still on the page. After you leave the page the Undo is disabled with a reason, so "Undo in the notifications puts both back" holds only until you leave |
| Delete refusals | PASS | Relates to: "Cannot delete type being used in templates: Court Case" with the fields named; a new unused type deletes plainly; panel Manage modal drops the deleted type |
| CEJIL registry | PASS | CEJIL's own types (Relacionado a 203, CorteIDH 2,302, CIDH 668, Votos separados 262, Paises 47, Jueces intervinientes 0 …, with the templates using each). Rename "Relacionado a" → "Relacionado a QA" keeps 203 references and survives a reload |
| CEJIL usage counts for País and Descriptores | PARTLY | País template: 30 entities, plus "Relationship properties in Organismo, Resolución de la CorteIDH, Informe de admisibilidad and 12 more link to it". Descriptores thesaurus: "Used by 2 properties in 2 templates" (Causa, Medida Provisional). **Defect:** with Settings opened directly on CEJIL, **no thesaurus dialog shows the entity count and no template-property removal notice shows "N entities hold a value"** (Estado, País, Descriptores, Title all blank), even 15 s later. After visiting the Library once the same dialogs read "397 entities hold one of its values" (Descriptores) and "337 entities hold a value for it" (Estado). The record data the counts read is only loaded by the Library, and until then the usage reads as zero rather than unknown |

## F3 verification (playground 570c1921; 9 commits 21156f2e..570c1921 on 218b468f, with Design's P1 and the rail regrouping)

Re-run 2026-10-04 in my own detached worktree at 570c1921, port 1438, headless Chromium at 1280×800 and 390×844. D = driven, C = code read. Rows changed by F3 are marked **[F3]** in the page tables below.

### Delete dialogs: usage and refusals

| Claim | Result | Evidence |
|---|---|---|
| Template delete shows impact; Uwazi refusals | PASS | Person: "13 entities use this template. Move or delete them first." + "Used by 13 entities." + "Relationship properties in Court Case link to it. They are not changed." (OK only). Court Case: "This is the default template. Set another template as default first." Hearing: 48 entities, refused. A new template with no entities: Cancel / Delete, deleted |
| Thesaurus used by a template is refused | PASS | Case status: "Court Case uses this thesaurus. Unlink that property first. Used by 1 property in 1 template: Status. 5 entities hold one of its values." Regions: "Country and Court Case use this thesaurus…". Violation types (unused): "Delete the Violation types thesaurus and its 24 values? No template uses it." with Delete |
| Property inherited by another template is refused | PASS (CEJIL only) | CEJIL: Geolocalización de los hechos del caso › Ubicación geográfica → "Remove property. Causa inherits this property. Remove the inheritance there first." (OK only). **Not reachable in Sample**: the Sample Template editor's property labels (Person: Full name, Date of birth, Nationality, Photo) do not match the inherited fields (country, region), so no Sample property triggers it |
| Relationship type with references: count + reassign | PASS | Mentions: "100 references use this type. Move references to [Choose a type]", Move and delete stays disabled until a target is chosen; options Relates to, Cites, Refers to, No label. Relates to and Cites are refused ("A relationship field uses this type. Change those fields first.", names Court Case › People involved/Role and Related cases/Rights invoked). Represented by (0 references): plain Delete |
| The move really happens | PASS | Mentions 100 → Refers to; list counts before {Mentions 100, Relates to 123, Cites 97, Refers to 95, Represented by 0}, after {Relates to 123, Cites 97, Refers to 195, Represented by 0}. The Beacon entry carries "100 references moved to Refers to." The counts come from the same references store the Relationships panel reads; I confirmed no "Mentions" type label on an entity's Relationships tab afterwards, but did not compare per-reference labels |
| Users and groups | PASS | admin: "You can't delete the account you're signed in with." OK only. mlopez: "Delete mlopez? They can no longer sign in to this collection. Member of Litigation." Group Litigation: "2 members lose this group: mlopez and jnkemba." |
| Language uninstall typed CONFIRM | PASS | Spanish: "101 entities have a version in this language. Interface translated: 100%. Type CONFIRM to continue"; Uninstall stays disabled until the exact word (lowercase "confirm" keeps it disabled); default English has no Uninstall control |
| Page delete names menu links | PASS | About this collection: "Linked from the menu: About. The link stays and will lead nowhere."; Partners: plain |
| Not covered by F3 | NOTE | Menu item, upload, extractor and Preserve token deletes still use the earlier plain confirm (no usage line) |

### Undo in the Beacon for removed children

| Claim | Result | Evidence |
|---|---|---|
| Template property | PASS | Delete Date of birth in Person's editor: no dialog; Beacon: "Date of birth removed. 13 entities hold a value for it. Nothing is saved until you save the template." + Undo; Undo restores it at its index (list identical to before) and the editor reads clean again |
| One level; ends with the editor | PASS | Removing Nationality then Photo: the Nationality undo is disabled, the Photo one live. After Cancel, the Photo undo is disabled ("The editor closed or a later removal replaced this undo") |
| Thesaurus value and group | PASS | Case status value removed and restored at its index; Violation types group (8 rows → 4) removed and restored with its children |
| Filter group | PASS | Group G1 with one type: "G1 removed. 1 filter moves out of the group. Nothing is saved until you save the filters."; Undo restores group and member |
| Menu sub-link | PASS | Sub-link removed with no dialog; Undo restores order |

### Confirms on the remaining destructive actions

| Action | Result | Dialog text |
|---|---|---|
| Revoke API key | PASS | "Revoke this key? Anything that signs in with it stops working."; Cancel keeps it, Revoke removes it |
| Disable 2FA | PASS | "Disable two-factor authentication? Signing in will need only your password."; Cancel keeps it enabled |
| Reset CSS/JS | PASS | "Discard your unsaved CSS changes? The last saved version comes back." |
| Discard page draft | PASS | "Discard your unsaved changes to this page? The last saved draft comes back."; Keep keeps the edit |
| Accept all suggestions | PASS | "Accept 11 suggestions? Each one replaces the entity's current value." Cancel changes nothing; single Accept has no dialog. Note: the sentence says the entity's value is replaced, but accepted values are still written to no entity (phase 1), so it states more than the code does |
| Change default language | PASS | "Make Spanish the default language? It is shown to users who haven't chosen a language."; Cancel keeps English |
| Uninstall language | PASS | typed CONFIRM, see above |

### Beacon notification AND Activity log entry

PASS for every action I drove except the three listed below (36 create/save/delete actions across 17 pages in one pass, plus Account, Translations, language reset, paragraph re-run in a second pass; each gave one Beacon notification plus one log entry signed by the signed-in user): template, thesaurus, relationship type, user, group, menu item (create, save, delete each); filters save; language install, set default, uninstall, reset; page draft save, publish and delete; collection save; Global CSS & JS save; upload delete; Preserve create and revoke; extractor create, delete; paragraph job start and re-run; Translations save; Account profile save, API key generate and revoke, 2FA enable and disable, password change. Log lines read "Created template “QA tpl” [admin]" etc.

Gaps (a Beacon toast but **no log entry**): Translations "Import translations (CSV)" and Uploads "Upload file" (both are still no-ops that report success: "Translations imported", "File uploaded"), and Accept all suggestions.

| Claim | Result | Evidence |
|---|---|---|
| Activity log lists them | PASS | 7 seed + 6 session entries shown newest first, with user and time; search "thesaurus" → 2 events; expanded row now shows Action/Summary/User/Time (the fabricated request line is gone) |
| Dashboard shows them | PASS | Recent activity lists the latest session entries first |
| Editor footers "Saved N min ago by <user>" | PASS (8 editors) | Template, thesaurus, relationship type, user, menu item, extractor: empty before the first save of a new record, "Saved just now by admin" after a save, "Saved 5 min ago by admin" after I aged the stored entries by 5 min. Thesaurus Violation types shows its seed entry before any save: "Saved on Jun 13, 2026 by jnkemba". Missing: **Preserve token editor, Paragraph job editor, Pages code editor** (the Pages editor keeps its own publish status line) |
| Reset demo data clears the log | PASS | Stored session log 0 entries; Activity log back to the 7 seed events; Dashboard back to seed; footers empty again |

### P1 and rail spot-checks

| Check | Result | Evidence |
|---|---|---|
| Buttons on the bar ladder | PASS | Footer "Add template" is the lead (no fill, no border, ink), Cancel and Add property are ghosts (no fill, no border, ink-secondary), Save is the green commit when dirty (rgb(5,150,105) on white) and a flat vellum chip when clean |
| Property dialog is a Modal | PASS | `role=dialog`, named "Edit property", traps focus (25 Tabs), Esc closes and focus returns to the edit button |
| Install language is a Modal | PASS (with one defect) | `role=dialog`, named, traps focus (45 Tabs); opening then Esc closes and focus returns to "Install language". **Defect:** after clicking an Install row the row disappears, focus drops to `<body>` and **Esc no longer closes the dialog** (scrim click and the Close button still do). Phase 1 and F1 closed with Esc after an install |
| Phone list rows | PASS | All 13 list pages at 390×844: no sideways scroll, no off-screen controls, edit/delete icons visible on every row; the phase-1 axe `empty-table-header` and `scrollable-region-focusable` hits on phone are gone. Languages shows "Default" twice per row (badge and meta) |
| Rail groups | PASS | Rail lists every group: User, Collection (Dashboard, Collection, Menu, Pages), Content model (Templates, Thesauri, Relationship types, Filters), Languages (Languages, Translations), People (Users & Groups), Tools, ML tools. No "System" heading. From Templates the rail reaches Metadata extraction and Account directly; the active item has `aria-current`. The shelf labels "Collection" and "Languages" repeat the item names under them. Phone rail shows all groups |

### Regressions

None beyond the Install language Esc defect above. The sweep of all 18 pages shows no desktop change vs F1, no console errors beyond the jotai deprecation, and (phone) the table-scroll problems are gone. Status-pill contrast failures remain (phase 1 finding 7).

### Still true after F3

Menu, Templates, Filters (apart from guard), Languages, Translations, Relationship types lists, Pages list, Uploads, Customisation, extraction and Preserve pages still keep their lists in local state, except where F3 wired the new log. A renamed template saved in the editor reaches the list only until you leave the page; Template property edits are still dropped on reopen; Library, filters and the edit form still do not follow Templates or Filters. The template delete dialog repeats itself when blocked ("13 entities use this template…" then "Used by 13 entities.").

## Cross-cutting findings (apply to every page below)

1. **Almost nothing persists.** *(F1: users and groups now do, in a sessionStorage-backed store.)* Every page keeps its list in `useState`, seeded from `data/settings.ts`. Leaving the page (any rail click) re-seeds it. Only two things survive rail navigation: thesauri (`atoms/thesauri.ts` overlay) and Pages code documents (`atoms/sitePages.ts`). Nothing but the active section, the mobile drill state and the data source is in browser storage. [D]
2. **Editors do not write back to their list.** In Users, Groups, Menu, Relation types, Translations, Metadata extraction, Paragraph extraction and Preserve, Save/Create shows a success toast and closes, but the list row is unchanged and a new item is not added. Templates writes back name and colour only. Thesauri is the one editor that writes through a store. [D]
3. **Settings is mostly disconnected from the app.** The app reads `seedUsers`/`seedGroups` (login, share dialog, default access members) and the thesaurus store. Nothing reads Settings templates, filters, languages, menu, collection name, relation types, pages or custom CSS/JS. [C: grep of `data/settings` consumers; D for templates, filters, thesauri, relation types]
4. **[F1: fixed, see the F1 table] ~~No dirty guard in Settings.~~** Phase-1 finding: No editor calls `useRegisterDirtyForm`. Cancel with edits, or clicking another rail item with an unsaved editor open, discards silently with no dialog. [D on Users; C for the rest]
5. **Two hand-rolled dialogs bypass `Modal`**: the Languages install dialog and the Templates property dialog. Neither traps focus (Tab leaves to the navbar), neither restores focus on close (focus lands on `body`/navbar), and the property dialog has no `role="dialog"`, `aria-modal` or accessible name. The Pages palette and copy-from dialogs and every ConfirmDialog use the shared components and are fine. [D]
6. **Phone tables scroll sideways with no cue.** `DataTable` keeps a fixed minimum width (Users 656px, Languages 704, Preserve 784, Metadata extraction 688, Pages 612, Filters 580, Translations 564, Templates 548, Account 520; viewport pane is 358px). Row actions (edit/delete) sit in the last column, off screen. On Users the email text overflows into the Role pill. Only Paragraph extraction has a phone layout. [D]
7. **Status pills fail contrast** (axe, serious): carbon on carbon-tint 2.08:1 (Users "Editor", Translations "System", Languages "Default", Dashboard/Activity "UPDATE"), amber on amber-tint 1.92:1 (Paragraph "Processing", Activity "MIGRATE"), green on green-tint 3.32:1 (StatusPill "Ready"). Light mode only. [D]
8. **Row edit buttons are announced twice.** Every clickable row has a stretched "Edit X" button plus a pencil also named "Edit X". [D]
9. **Empty column header** (axe minor, `empty-table-header`) on every table with an actions column. [D]
10. **Mouse and keyboard row opening both work** (row click opens the editor, Enter on the stretched button opens it). Escape inside an editor does nothing; the only way back is the back arrow or Cancel. [D]

## Account (User group)

| Control | Result | Persists | Propagates | Notes |
|---|---|---|---|---|
| Username, Email fields | **[F1: works]** new "Save profile" button writes the signed-in user's record; the Users list shows the new email; dirty-guarded | session | yes (users store, login) | D |
| Change password (3 fields, mismatch message, Update) | works as UI: mismatch message, button enables on match, fields clear, toast | none | no | D. No strength rule, no current-password check. |
| Enable 2FA, code field, Verify, Disable | works; **[F1]** state now lives on the user record (seed admin starts Enabled; Disable clears the shield in the Users list). Disable still has no confirm | session | yes (Users list) | D |
| Generate key, Revoke | works: list grows/shrinks; Revoke has no confirm | none | no | D. Key is random hex, shown in full always (masked by bullets). |
| Copy key | **no-op** (toast "Key copied", nothing written to the clipboard) | n/a | n/a | C |
| a11y | Tab order OK, all 19 stops named, focus visible. Empty header cell. | | | D |
| Phone | works; keys table 520px wide, scrolls sideways | | | D |

## Dashboard (System)

| Control | Result | Persists | Propagates | Notes |
|---|---|---|---|---|
| Stat cards (Entities, Relationships, Users, Languages) | read-only. Entities = `entities.length` (104). Relationships = sum of seed usage counts (326, not the real reference count). **[F1: Users follows the store (5 after +1 −1).]** Languages 5 still static. | n/a | Users: yes; others still seeds | D |
| **[F1] Reset demo data** (new footer button) | works: confirm dialog, Cancel keeps edits, Reset restores users, groups, thesauri, Pages docs and the signed-in user | n/a | resets every store that registers | D |
| Recent activity table | read-only; first 5 seed rows | n/a | does not include anything done this session | D |
| Interactive controls | none (0 buttons/links in the body) | | | D |
| Phone | cards 2-up, table 488px scrolls; axe `scrollable-region-focusable` (the scroller is not keyboard focusable) | | | D |

## Users & Groups (UsersPage, UserEditor, GroupEditor)

| Control | Result | Persists | Propagates | Notes |
|---|---|---|---|---|
| Users/Groups tabs with counts | works | none | n/a | D |
| Add user → Invite user | **[F1: works]** listed with role and groups, count 6, survives rail nav and reload, can sign in, appears in Share. ~~no-op~~ | **session (sessionStorage)** | **yes: login, Share dialog, Dashboard count** | D |
| Edit user → change username → Save | **[F1: works]** row updates, persists across rail nav and reload | session | yes | D |
| Role radios, Group checkboxes in editor | **[F1: work and save]**; last admin's other roles are disabled with a reason | session | yes (Share dialog reads the store) | D |
| Reset 2FA (editor) | not re-driven in F1 (editor body unchanged apart from the draft hook) | | | |
| Delete user (ConfirmDialog) | **[F1: persists]** row removed; deleting yourself or the last admin is blocked with a dialog | session | yes: deleted user cannot sign in and is not found in Share | D |
| Add group → Create group | **[F1: works]** listed with member count; members get the group chip | session | yes (Share finds groups by name) | D |
| Edit group → membership checkboxes | **[F1: saves]** membership is by id (rename keeps members); count derived | session | yes | D |
| Delete group (ConfirmDialog) | **[F1: works]** removes the group and the chip from members; members keep accounts | session | yes | D |
| Dirty cancel / leave editor | **[F1: asks "Discard unsaved changes?"]** on rail, Back, breadcrumb, mobile back and corpus switch; Cancel is the explicit discard | | | D |
| a11y | Row and pencil buttons still have the same name (twice). Pill contrast still fails. "1 member" pluralisation was fixed in 952ba19d (code, not re-driven). | | | D |
| Phone | table 656px: Groups, 2FA and the edit/delete icons are off screen; email overlaps the Role pill. Editor itself is fine (single column). | | | D, screenshots `users-mobile.png`, `m-user-editor.png` |

## Collection

| Control | Result | Persists | Propagates | Notes |
|---|---|---|---|---|
| Collection name | partial: editable, Save toasts | none (reverts after leaving) | no (navbar crumb and login do not show it) | D |
| Custom landing page | partial (same) | none | no | D |
| Default library view (Cards/Table/Map) | partial | none | **no**: Library default view is not read | C |
| Private instance, cookie policy, public sharing toggles | partial | none | no (nothing gates on them) | D (toggle/Save), C (consumers) |
| Save | toast; **stays enabled after saving** (no new baseline) | | | D |
| a11y | 0 axe violations. 6 targets under 24px (checkboxes). | | | D |
| Phone | works, single column | | | D |

## Menu (MenuPage, MenuLinkEditor)

| Control | Result | Persists | Propagates | Notes |
|---|---|---|---|---|
| List of links and groups | works | none | **no**: the navbar has its own hard-coded items; Menu is not read | D, C |
| Add link / Add item | **no-op**: toast, nothing listed | none | no | D |
| Edit → rename → Save | **no-op**: list shows the old label | none | no | D |
| Link/Group switch, URL, sub-links add/delete/reorder | work as form state | none | no | D |
| Sub-links of an existing group | **fake**: every existing group shows the same two sample sub-links (Methodology, Partners), not its own | | | D, C (`SAMPLE_SUBLINKS`) |
| Delete (ConfirmDialog) | works in list | none | no | D |
| Phone | table 440px; editor sub-link inputs truncate ("/page/metho…") | | | D |

## Pages (PagesPage, site/CodePageEditor)

The most functional page. It is the one place with a real working editor and a store.

| Control | Result | Persists | Propagates | Notes |
|---|---|---|---|---|
| List with Draft / Published / "Published · edited" status | works; status reads the saved docs | status from session atom | no public site exists | D |
| Add page → template picker (8 site types) → editor | works; page appears in the list | **list entry: none** (gone after leaving); its code doc stays in the atom | no | D |
| Code editor: HTML/CSS/JS tabs, language switch (EN/ES/FR/AR), live preview iframe, Draft/Published preview toggle | works | session atom | preview only | D |
| Save draft, Discard, Publish | work; status line and buttons update | session atom (survives leaving and reopening) | no | D |
| Title and URL fields | partial: title persists in the code doc, but the **list row keeps the old title and slug**; URL field is not saved (reopens as "about") | title: atom; URL: none | no | D |
| Insert component palette, Copy from language | work (shared `Modal`) | | | D |
| Delete page (ConfirmDialog) | works in list | none | menu links are not checked | D |
| Tab key in code area | inserts two spaces (traps Tab by design; Escape leaves) | | | C |
| a11y | textareas are labelled ("HTML · English"); code gutter is `aria-hidden` | | | D |
| Phone | Code/Preview segmented switch; works | | | D, `m-pages-editor.png` |

## Languages

| Control | Result | Persists | Propagates | Notes |
|---|---|---|---|---|
| Install language (32-language catalog, search) | works in list: row added with 0%, dialog stays open for more | none | **no**: header/interface language pickers use constants (`LANGUAGES`, `UI_LANGUAGES`); the Translations editor uses `seedLanguages`, so the new language has no column | D (list, Translations), C (pickers) |
| Set default | **[F3]** now confirms ("Make Spanish the default language?"); logged | none | no (Library default language unchanged) | D |
| Reset language | **[F3]** confirm, then toast + log entry; percentage still unchanged | n/a | n/a | D |
| Uninstall | **[F3]** dialog with entity count and translation %, typed CONFIRM; logged; default has no uninstall | none | no | D |
| a11y | install dialog: no focus trap, no focus restore, Esc works via a window listener. "Set" buttons have no per-language label (all read "Set"). | | | D |
| Phone | table 704px, Reset/Uninstall off screen | | | D |

## Translations (TranslationsPage, TranslationEditor)

| Control | Result | Persists | Propagates | Notes |
|---|---|---|---|---|
| Context list (System/Template/Thesaurus/Menu) | works; counts are seed numbers | n/a | no link to real templates or thesauri | D |
| Translate → term × language grid | works as form (source column read-only, others editable, RTL `dir`) | **none**: an edit then Save then reopen shows the old value | no (the UI strings are not read from here) | D |
| Context rows shown for terms | contexts without seeded terms show generated "<name> term N" rows (max 10) | | | C |
| Import translations (CSV) | **no-op** (toast, no file picker) | | | D |
| Phone | grid shows only Term + English; other languages need sideways scroll with no cue | | | D, `m-translation-editor.png` |

## Filters

| Control | Result | Persists | Propagates | Notes |
|---|---|---|---|---|
| Types: show/hide checkbox, group select, Move up/down, drag grip | work as form state; footer count updates ("13 filters shown") | none; Save toasts and stays enabled | **no**: Library "Template" filter still lists Person after hiding it; "My group" never appears. Library has its own "Documents" group the Settings page does not show. | D |
| New group, rename, remove | work as form state | none | no | D |
| Properties: show/hide, Move up/down | work as form state | none | no | D |
| "Group" column on Properties | placeholder "—" only | | | C |
| a11y | 48 targets under 24px (checkbox + drag grip + chevrons); Move up/down give a keyboard path for reordering. | | | D |
| Phone | table 580px; works with sideways scroll | | | D |

## Templates (TemplatesPage, TemplateEditor)

| Control | Result | Persists | Propagates | Notes |
|---|---|---|---|---|
| Template list, Add, Delete (confirm) | work in list | none | no | D |
| Edit name, colour (11 swatches + custom) → Save | works for the **list row** (name, colour) | list state only (none after leaving) | **no**: renaming Person to "ZZ-Renamed" left the Library Template filter and cards on "Person" | D |
| Property table: required / filter / cards checkboxes, delete, reorder | work as form state | **none**: after Save and reopen the property list is the seed again; the list's property count does not change | no | D |
| Add / edit property dialog (type, thesaurus, related template, relationship type) | works as form | none | the thesaurus and relation-type option lists are **static seeds**, so a thesaurus created in Settings is not offered | C (`THESAURUS_OPTIONS`, `RELATION_OPTIONS` read at module load) |
| Delete property | immediate, no confirm | | | D |
| Card preview | works (live) | | | D |
| Name validation | required-name error on Save attempt, `role=alert` summary | | | C |
| Data mismatch | the editor's schema is not the schema the app renders. Court Case in Settings has Summary and Location; the entity has Region, Petition filed, Submitted to the Court and no Summary/Location. List says Person has 8 properties, editor shows 4. | | | D |
| a11y | property dialog has no dialog role or focus trap (cross-cutting 5). Colour swatches are named by hex only. | | | D |
| Phone | **the Property-name column collapses to 0px width**, so rows show only Type/Required/Filter; names and the edit/delete actions are not visible. Card preview text overlaps ("Sample person" over "FULL NAME"). | | | D, `m-template-editor.png` |

## Thesauri (ThesauriPage, ThesaurusEditor)

| Control | Result | Persists | Propagates | Notes |
|---|---|---|---|---|
| List, Add, Edit, Delete (confirm) | work | **session atom** (survives rail navigation) | see below | D |
| Edit items: add/remove/reorder, groups with children | work; blank rows dropped on save; counts update (24→25) | session atom | yes, below | D |
| Rename thesaurus | works in the atom | session atom | | C |
| Propagation: new value → entity edit form | **works**: value added in Settings appeared in the Case status picker on a Court Case edit form | | **yes** | D |
| Propagation: new value → Library filters | not shown: Library facets come from entity data, not the thesaurus | | no | C |
| Propagation: new thesaurus → template property dialog | **no**: option list is a static seed | | no | C |
| Deleting a thesaurus | removes it from the store; properties are told they "fall back to free text" but nothing changes them | | partial | C |
| a11y | item inputs labelled "Item label" (all identical); drag-only reorder inside groups (no buttons) | | | D, C |
| Phone | table 424px (fits nearly); editor works | | | D |

## Relationship types (RelationTypesPage, RelationTypeEditor)

| Control | Result | Persists | Propagates | Notes |
|---|---|---|---|---|
| List, Delete (confirm) | **[F1b]** list is the shared registry (12 Sample types with a Templates column; CEJIL its own) | session (Sample: memory; CEJIL: sessionStorage) | **yes: panel, Manage types, template fields** | D |
| Add type → Create | **[F1b] works**: listed, offered by template fields and Manage types; duplicates refused case-insensitively | session | yes | D |
| Edit name → Save | **[F1b] works**: rename keeps usage and reaches the panel; inverse name removed | session | yes | D |
| Usage counts ("142 relationships") | seed numbers, unrelated to the actual references | | | C |
| Two sources of truth | the Relationships panel has its own working registry (`relationTypesAtom` + "Manage relationship types" modal, includes `no_label`, V4 types). Settings lists 5 different seed types (it has "Represented by"; the app registry has no_label and extra types). Changes in either do not reach the other, nor `RelationshipFieldEditor`/template dialog. | | | C |
| Phone | table 440px; editor fine | | | D |

## Uploads

| Control | Result | Persists | Propagates | Notes |
|---|---|---|---|---|
| Grid/List toggle, search by name/URL, type filter | work | none | n/a | D |
| Upload file | **no-op** (toast "File uploaded", no file input, nothing added) | | | D |
| Copy URL | works (clipboard gets `/uploads/logo-iachr.svg`) | n/a | n/a | D |
| List view pencil | labelled "Edit <file>" but **copies the URL** (no editor exists) | | | D |
| Delete (confirm) | works in list | none | pages and CSS that reference the URL are not checked | D |
| Thumbnails | placeholder icons only | | | C |
| a11y | 0 axe violations; icon buttons named | | | D |
| Phone | grid 2-up works; list view table scrolls | | | D |

## Global CSS & JS (CustomisationPage)

| Control | Result | Persists | Propagates | Notes |
|---|---|---|---|---|
| CSS/JS tabs, line count, Reset (per tab) | work | none | | D |
| Save | toast only | **none**: leaving the page restores the sample text | **no**: the CSS is not injected anywhere (body colour unchanged, no `<style>`); JS is not run | D |
| a11y | **textarea has no accessible name** (axe critical `label`); gutter hidden OK. Tab leaves the textarea (no indent). | | | D |
| Phone | works; editor min height 20rem | | | D |

## Activity log

| Control | Result | Persists | Propagates | Notes |
|---|---|---|---|---|
| Search, Action filter, User filter, expand row | work (6 events → 1 for "thesaurus"); count line updates | n/a | | D |
| Request line in expanded row | **[F3] gone**: expanded row shows Action, Summary, User, Time | | | D |
| Records what you do in Settings | **[F3] yes**: every save/delete listed (not Import CSV, Upload file, Accept all) | session | Dashboard recent activity too | D |
| Export, pagination, date filter | **missing** | | | D |
| a11y | rows are `aria-expanded` buttons; contrast fails on method pills | | | D |
| Phone | works; user and time columns hidden below breakpoints | | | D |

## Metadata extraction (MetadataExtractionPage, ExtractorEditor)

| Control | Result | Persists | Propagates | Notes |
|---|---|---|---|---|
| List with status pill, documents, accuracy | works (seed) | | | D |
| Delete (confirm) | works in list | none | | C |
| Create extractor | form works (template select, property text, type select) but **Create is a no-op**: not listed | none | no (property is free text, not a template property picker) | D |
| Edit extractor | property type always shows "Text" (even for "Date filed"); template/property edits not written back | none | no | D |
| Accept / Reject / Accept all, Find suggestions, filter | work as mock: stats update (accuracy reaches 100%), "Find suggestions" **reseeds the same 12 rows** | none | accepted values are not written to any entity | D |
| a11y | accept/reject buttons named per entity | | | D |
| Phone | table shows only Entity and Current value; Suggested, Score, State and the accept/reject buttons are off screen | | | D, `m-extractor-editor.png` |

## Paragraph extraction (ParagraphExtractionPage, ParagraphJobEditor)

| Control | Result | Persists | Propagates | Notes |
|---|---|---|---|---|
| List (3 jobs), phone single-column layout | works | | | D |
| Open job: stats, Run extraction, per-document table, filter, per-row re-run | **no-op** buttons (toasts); table is generated, not the job's documents | | | D |
| Re-run / Start extraction | toast, closes; list status unchanged, new job not added | none | no | D |
| Min characters | digits only (sanitised) | none | | D |
| Delete a job | **missing** (no control) | | | D |
| a11y | contrast fails on "Processing" pill | | | D |
| Phone | the only page with a purpose-built phone table | | | D |

## Preserve (PreservePage, PreserveTokenEditor)

| Control | Result | Persists | Propagates | Notes |
|---|---|---|---|---|
| List of tokens, Revoke (confirm) | work in list | none | | D |
| New token → Add source | **no-op**: not listed; **no token is generated** | none | | D |
| Edit source: name, URL, auth, schedule, Save | **no-op**; for an existing source the Source URL is blank and auth/schedule are defaults, not the source's data | none | | D |
| Capture now | works as mock: a Pending row appears at the top | none | | D |
| Copy token, View/Re-capture per row | toasts only | | | C |
| Phone | table 784px, mostly off screen; editor fine | | | D |

## Placeholder pages

None reachable. Every section in the rail has a page; `PlaceholderPage` is only the `default` branch of `SettingsView`. "Import CSV" in Tools navigates to the Import view, and "Documentation" is an external link (`uwazi.io/page/9852italrtk/support`). [C, rail clicked for Tools on D]

## Worst gaps, in order

1. **Saving does nothing durable.** Most pages show "saved" for a change that is lost when you leave the page, and most editors do not update their own list (new user/group/menu item/relation type/extractor/token never appears). A tester will read this as broken. Fix lives in one place: a shared settings store (like `atoms/thesauri.ts`) that pages read and editors write.
2. **Templates, Filters, Languages, Menu, Collection and Relationship types change nothing elsewhere.** Template rename or property edits do not reach Library cards, filters or the entity edit form; the Settings template schema does not match what entities render. Installed languages do not reach any picker or the Translations grid. Menu and Collection name do not reach the navbar. Settings relation types and the Relationships panel registry are two unrelated lists.
3. **Only thesauri propagate** (value appears in the edit form picker). But the Template property dialog still offers the static seed thesaurus list.
4. **No unsaved-changes guard** in any Settings editor (Cancel, rail click and Navbar all discard silently).
5. **Phone layouts of data pages**: tables scroll sideways with no cue and hide row actions (Users, Languages, Preserve, Extractor suggestions, Translations grid); the Template editor property names collapse to 0 width, so the property list is unreadable on a phone.
6. **Custom dialogs without focus handling** (Languages install, Template property dialog) and a Customisation textarea with no accessible name.
7. **Status pills fail contrast** in light mode (carbon 2.08:1, amber 1.92:1, green 3.32:1).
8. **Fake or inert controls**: Upload file, Import translations, Copy key, Reset language, Reset 2FA, Paragraph/Metadata run buttons, Uploads "Edit" (copies URL), Activity log request lines.
9. **Existing-item editors open with defaults instead of the item's data** (Preserve URL/auth/schedule, Extractor type, Menu group sub-links, Relation type inverse).

## What works well

- Pages editor (draft/publish, preview, palette, copy-from-language) is real and persists for the session.
- Thesaurus store with propagation to the edit form.
- Validation idiom on template name; `SettingsField` labels/descriptions are linked; row targets and Tab order on Account, Languages, Filters and Templates are keyboard-reachable with visible focus.
- ConfirmDialog on every delete except removing a template property, an Account key, a Metadata-extraction suggestion, or disabling 2FA.

## Suggested owners (recommendation only)

- Findings 1, 4, 9: Code (shared settings store, dirty guard registration, seed editors from the item).
- Finding 2: needs Operator/Juan to decide what Settings should drive first (templates → Library/filters/edit form is the largest) before Code starts.
- Findings 5, 7: Design (phone table pattern, pill token pairs).
- Findings 6: Code.
- QA follow-up once any of this lands: add Playwright specs for "edit → Save → leave → return" per page and the template → Library propagation check I ran by hand (`t8.mjs` in my scratchpad).
