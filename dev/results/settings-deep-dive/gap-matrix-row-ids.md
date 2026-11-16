# Gap matrix with row ids

Companion to gap-matrix.md. Row id = page code + 1-based position of the row in that page's main table (prototype-only tables are not numbered). Used by acceptance-checklist.md.

## Account

Note: in Uwazi, Account has no API keys and no way for a user to turn 2FA off. The prototype has both (see Prototype-only).

ACC-01 | Username shown read-only (disabled input). `Account.tsx:75-80` | partial: editable, but no Save exists (B2) | `1:1` read-only; editing identity is an admin task in Users | D1d | S 
ACC-02 | User Role shown read-only, raw string, not translated. `Account.tsx:83-89` | missing: no role field | `1:1` read-only; translate the role label (Uwazi shows raw `admin`) | D1d | S 
ACC-03 | Email editable; required; error "A valid email is required" for empty or bad format. `Account.tsx:91-106` | partial: editable, no Save, no validation (QA) | `1:1` with the same message | D1d, DRAFT | S 
ACC-04 | New password plus Confirm; mismatch error "Passwords do not match"; blank password is dropped; no strength rule. `Account.tsx:113-133` | partial: mismatch message works, own Update button, fields clear (QA) | `1:1` fields and message, no strength rule (none in Uwazi); folded into the single page save | DRAFT | S 
ACC-05 | One footer "Update", disabled until dirty; probably stays enabled after save (assumed). `Account.tsx:61-229` | no-op: Profile has no footer; password Update is a mid-page green button (B2) | `improved (Design: form page, one save in footer, Discard, commit resets after save)` | DRAFT, PAT | S 
ACC-06 | Update opens a confirm modal asking the current password; Accept disabled until non-empty; server checks bcrypt. `Account.tsx:211-227` | missing: no current-password check (QA) | `1:1` as a `Modal`; mock check (accepts any non-empty, no real auth) | PAT | S 
ACC-07 | Success "Account updated", then password fields reset; errors "An error occurred" with server detail. `Account.tsx:61-229` | partial: toast only, nothing stored (B2) | `1:1` through notify; add a failure path (Design: no page simulates failure) | NOTIFY | S 
ACC-08 | 2FA card: "Enable" opens a panel with QR, secret key, 6-digit token field, Enable. `TwoFactorSetup.tsx:127-155` | partial: inline code field, Verify, grey "QR" box (QA) | `1:1` in a `Modal` with a mock secret and a drawn QR placeholder | PAT, DATA | M 
ACC-09 | Wrong token shows "The token does not validate against the secret key!". No digit mask in Uwazi. `TwoFactorSetup.tsx:139-155` | partial: input sanitised to 6 digits, no error path | `1:1` message against a mock secret; keep the digit sanitiser (better than Uwazi) | - | S 
ACC-10 | Secret key shown in a copy input with a "keep this secret" line. `TwoFactorSetup.tsx:127-138` | missing: no secret to copy; the existing Copy key button is a no-op (QA) | `1:1` with real clipboard write | - | S 
ACC-11 | After enabling, card shows "Activated" (disabled button); users cannot disable 2FA, only an admin can (Reset 2FA). `Account.tsx:61-229` | partial: badge works, Disable has no confirm and is not in Uwazi (QA) | `1:1` (no self-disable); admin reset in Users clears the flag the badge reads | STORE, D1d | S 
ACC-12 | Footer "Logout" link (red outline) on Account. `Account.tsx:61-229` | missing: not covered by QA | `1:1`; sign-out returns to the login view | - | S 
ACC-13 | Dirty guard: none on Account in Uwazi. `Account.tsx:61-229` | no-op: none (B1) | `improved (Design: form page, dirty guard registered on every form page)` | DRAFT | S 
ACC-14 | Page visible to any logged-in role; server allows self-edit only. `Account.tsx:15-232` | missing: not covered by QA | `defer`: no role-aware rail yet; do with the rail/role dispatch | - | S 
ACC-15 | Field width: form fills the pane (Design: "Current password" spans 1,158px). `Account.tsx:61-229` | works: single column, phone fits | `improved (Design: form page, fields capped near 40rem)` | PAT | S 
ACC-16 | Loader error goes to the route error boundary; loading uses the global loader. `createAccountLoader.ts:12-19` | missing | `defer`: no backend, nothing can fail on load | - | S 

Prototype-only (not in Uwazi):

| Control | Keep or drop | Why |
| API keys (Generate, Copy, Revoke, masked key) | keep (proto-only) pending Juan | Uwazi has no per-user keys. If kept: show the full key once with a "you won't see this again" line, ConfirmDialog on Revoke, real clipboard copy (Design) |
| Disable 2FA button | drop | Uwazi lets only an admin reset 2FA; self-disable also had no confirm |
| Inline "Update password" green button | drop | Replaced by the single footer save |
| Editable Username | drop | Uwazi shows it read-only |


## Users & Groups

Note: Uwazi edits users and groups in a sidepanel over the table. The prototype opens a full editor page; keep it (shared Settings editor pattern, Design pattern 3).

USR-01 | Tabs Users and Groups; switching clears selections. `Users.tsx:118-162` | works: tabs with counts | `1:1`; counts derived from the store (not stored `memberCount`, M6) | STORE | S 
USR-02 | Users table: Username (locked row red with lock icon), Protection pill, Role pill, Group pills, sortable. `TableComponents.tsx:99-127` | partial: columns from seed; no locked state; Admin pill is seal tint (Design) | `1:1`; Admin pill in ink or vellum (seal is danger only); lock state needs a seeded locked user | STORE, DATA | M 
USR-03 | No search or filter in Uwazi; table sort only. `Users.tsx:118-162` | missing | `improved UX1` search, plus role and group filters; status and last login need new seed data | STORE, DATA | M 
USR-04 | Add user opens form: Username (3-50, no spaces, unique), Role, Email (unique), Password, Groups. `UserFormSidepanel.tsx:229-358` | no-op: "Invite user" toasts, user not listed (B2) | `1:1` fields and validation messages; commit "Add" (Design verbs); user appears in list | STORE, DRAFT | M 
USR-05 | Blank password on create: server generates one and emails a welcome mail; blank on edit leaves it unchanged. `UserFormSidepanel.tsx:288-302` | missing: no password field | `1:1` as a mock (notify "welcome email sent"); Design adds "invited or active" status and resend, not in Uwazi | NOTIFY, DATA | S 
USR-06 | Role select with "?" help opening a Permissions matrix modal (3 roles x 15 actions, hard-coded copy). `PermissionsListModal.tsx:24-130` | partial: role radios work as form state; no matrix (QA) | `1:1` matrix in a `Modal` `lg`; keep as static copy | PAT | S 
USR-07 | Groups multi-select (placeholder "Nothing selected"); admin only. `UserFormSidepanel.tsx:347-358` | partial: bordered checkbox cards; state works, Save discards (QA) | `improved (Design: Users page, groups as a searchable multi-select, cards do not scale to 30 groups)`; membership by id (H1) | STORE | M 
USR-08 | Saving a user needs the admin's current password in a modal. `Users.tsx:254-274` | missing | `1:1` mock modal (any non-empty accepted); Juan to confirm worth the friction in a prototype | PAT | S 
USR-09 | Edit: "Reset Password" (no confirm) emails a 24h link; "Reset 2FA" and "Unlock account" via password modal. `UserFormSidepanel.tsx:157-191` | no-op: Reset 2FA toasts, list unchanged (QA); others absent | `1:1`: Reset 2FA clears the flag the list and Account read; add confirm to Reset Password (Design: destructive confirms) | STORE, NOTIFY, DATA | M 
USR-10 | Bulk footer when users selected: Reset Password, Reset 2FA (danger modal lists names), Delete. `Users.tsx:254-274` | missing: no selection (QA) | `improved UX2` selection action bar with count slot; add "Add to group" and "Change role" (Design) | STORE, PAT | M 
USR-11 | Delete users: danger modal with names and password; server blocks self, last admin, system user. `DeleteUsers.ts:23-56` | partial: single delete via ConfirmDialog works in list only; self and last admin deletable (H2) | `improved UX4` guarded delete: block self and last admin on the client (Uwazi only fails on the server), show group memberships removed | STORE, USAGE | M 
USR-12 | Client duplicate checks are stricter than the server (case-insensitive; username vs email). `UserFormSidepanel.tsx:43-85` | missing | `1:1` client rule, case-insensitive username and email uniqueness | STORE | S 
USR-13 | Groups table: Name (sortable), Members as username pills. `TableComponents.tsx:129-147` | partial: count "1 members" not pluralised; reads seeds (M6) | `1:1` with member pills, correct plural | STORE | S 
USR-14 | Group form: Name (3-50, unique case-insensitive), Members multi-select; no password needed. `GroupFormSidepanel.tsx:118-157` | no-op: Create toasts, not listed; membership state works (QA) | `1:1`; member picker gains search and select-all (Design) | STORE, DRAFT | M 
USR-15 | Delete groups: danger modal, no password; users untouched. `Users.tsx:254-274` | partial: delete works in list; member chips stay on users (H2) | `1:1` plus impact line "N members lose this group" | STORE, USAGE | S 
USR-16 | Group members stored as user refs; delete user pulls it from all groups. `DeleteUsers.ts:23-56` | partial: membership by group name (H1) | `1:1` ids, derived counts; rename group keeps members | STORE | S 
USR-17 | Success toasts per action ("Added new user", "Deleted user group", ...); errors "An error occurred". `UserFormSidepanel.tsx:157-191` | partial: toasts only, nothing written (B2) | `1:1` copy via notify, with a failure path | NOTIFY | S 
USR-18 | Closing the panel or switching tab discards edits silently; no guard in Uwazi. `Users.tsx:118-162` | no-op: silent discard (B1) | `improved (Design: editor pattern, dirty guard on Back, Cancel, rail)` | DRAFT | S 
USR-19 | Empty table text "NO DATA AVAILABLE". `DefaultNoDataMessage.tsx:4-8` | partial: generic "Nothing here yet." | `improved (Design: list page, EmptyState with create action)` | PAT | S 
USR-20 | Table is wide; no phone layout in Uwazi (not specified). `TableComponents.tsx:99-127` | partial: 656px table, Groups and actions off screen (QA) | `improved UX12` list rows: name, email, role pill | PHONE | M 
USR-21 | Row action: "Edit" ghost button per row. `TableComponents.tsx:99-127` | partial: hand-rolled pencil and trash, name announced twice (M3) | `improved (Design: list page, row actions revealed on hover, pencil redundant with row target)` using `RowActions` | PAT | S 

Prototype-only (not in Uwazi):

| Control | Keep or drop | Why |
| Full editor page instead of sidepanel | keep (proto-only) | Same pattern as every Settings editor |
| "Invite user" wording | drop | Uwazi creates the account; use "Add user" (Design verbs) |
| Stored `memberCount` field | drop | Derive from membership (M6) |


## Dashboard

Note: Uwazi's Dashboard has four read-only cards and no actions. The prototype swaps two of them and adds a table.

DSH-01 | Users card: total, then counts per role (Admins, Editors, Collaborators). `Dashboard.tsx:32-49` | partial: "Users 5" from seed, no role split, does not change after add/delete (QA, B7) | `1:1` derived from the users store, with role split | STORE | S 
DSH-02 | Storage card: files plus database plus search-index size, formatted (e.g. 1.5 GB); caption says "Files and database usage". `Dashboard.tsx:50-60` | missing | `1:1` with a mock figure from seed file sizes; caption says what it sums | DATA | S 
DSH-03 | Entities card: distinct entities; caption "across all languages" (it counts distinct ids). `Dashboard.tsx:61-71` | partial: live `entities.length` (104) but ignores overlay and corpus (B7) | `1:1`; count from the entity overlay and the active corpus | STORE | S 
DSH-04 | Files card: total files (main documents, supporting files, uploads). `Dashboard.tsx:72-82` | missing | `1:1` counting document, files and Uploads atoms | DATA, STORE | S 
DSH-05 | Cards are read-only; no buttons, links or refresh. `Dashboard.tsx:21-88` | works: 2-up cards, 0 interactive controls (QA) | `improved (Design: Dashboard, cards open their page, e.g. Users opens Users)` | - | S 
DSH-06 | Numbers read at navigation, no live update (assumed). `Dashboard.tsx:21-88` | partial: static seeds | `1:1` but derived at render from stores, so it updates after edits | STORE | S 
DSH-07 | Loader ignores errors: failed load shows empty numbers and "0 Bytes". `Dashboard.tsx:16,23-24` | missing: no loading or error state | `improved (Design: loading shows skeleton, not empty or zero)`; do not copy the silent zeros | - | S 
DSH-08 | Admin only (client guard and `GET /api/stats`). `Dashboard.tsx:13-90` | missing: not covered by QA | `defer`: no role model in the rail yet | - | S 
DSH-09 | Layout: 2-column grid, 1 column on small screens, no footer. `Dashboard.tsx:21-88` | works: 2-up on phone, table scrolls without focus (axe `scrollable-region-focusable`) | `1:1` grid; make the table scroller focusable or replace it with rows | PHONE | S 

Prototype-only (not in Uwazi):

| Control | Keep or drop | Why |
| Relationships card (sum of fake usage counts) | keep (proto-only) | The prototype is about relationships; derive from `referencesAtom` references, not seed `usageCount` (B5) |
| Languages card | drop | Uwazi has none; the Languages page shows it. Frees the slot for Storage and Files |
| Recent activity table (5 seed rows) | keep (proto-only) | Useful; read from the D4 activity log so it shows what you just did, and link to Activity log. Uwazi has no such table |
| CEJIL activity paragraph about the data source | drop | Prototype plumbing showing in the UI (Design) |


## Collection

Note: Uwazi saves the whole settings document in one POST (can overwrite Languages, Filters set in another tab, assumed impact). The prototype stores per slice and does not copy that.

COL-01 | Collection name, required; used in page title, email sender and 2FA label; error is red styling only. `Collection.tsx:191-196` | partial: editable, toast, reverts, navbar and login ignore it (QA) | `1:1` plus message text; wire to the navbar crumb and login | D1d, DRAFT | M 
COL-02 | Custom favicon picker (images from Uploads only, square 16 to 512 px, strict); shown when theming is off. `Collection.tsx:198-211` | missing | `1:1` picker `Modal` over the Uploads store; set the document icon; size rule needs image dimensions | D1d, PAT, DATA | M 
COL-03 | Theme and branding card opens a large panel: presets, accessibility checks, 7 or 13 colours, light and dark logos and favicons; gated by `themeCustomization`. `ThemeSelectionCard.tsx:22-119` | missing | `defer`: tenant-flag feature, new component family, overlaps the prototype's own tokens | PAT | L 
COL-04 | Default view select: Cards, Map, Table. `Collection.tsx:224-234` | partial: select saves nothing, Library does not read it (QA) | `1:1`; Library opens in this view on load | D1d | S 
COL-05 | Default date format select, six patterns shown with today's date. `Collection.tsx:235-242` | missing | `1:1`; metadata date display and pickers read it | D1d | M 
COL-06 | Custom landing page: relative URL; invalid or empty falls back to the library; supports `/page/`, `/entity/`, `/library/`. `Collection.tsx:243-253` | partial: free text, no validation (Design) | `1:1` field with relative-URL validation (Uwazi has none on the form); opening on it `defer` (no router) | D1d | S 
COL-07 | Public instance toggle; stored inverted as `private`. `Collection.tsx:254-262` | partial: "Private instance" toggle saves nothing; nothing gates on it (QA) | `1:1` label "Public instance", store non-inverted; do not copy the inversion | D1d | S 
COL-08 | Hide restricted relationships from public. `Collection.tsx:263-273` | missing | `1:1` toggle stored; reading it in the Relationships panel is `defer` (no public view) | D1d | S 
COL-09 | Show cookie policy toggle; adds a cookie popup and footer link. `Collection.tsx:274-284` | partial: toggle saves nothing; no popup | `1:1` toggle; popup `defer` (no public site) | D1d | S 
COL-10 | Global JS toggle: enables the JS tab in Global CSS & JS and the nav label. `Collection.tsx:285-291` | missing | `1:1`; the Global CSS & JS page reads it | D1d | S 
COL-11 | Non-latin characters toggle: one-way, rewrites property names, only a tooltip warns, no confirm dialog. `Collection.tsx:292-304` | missing | `defer`: only meaningful once templates render the schema; then add a confirm Uwazi lacks | SCHEMA, PAT | S 
COL-12 | Analytics: Google tracking id and Matomo config text fields. `Collection.tsx:307-334` | missing | `1:1` stored fields, no effect | D1d | S 
COL-13 | Services card: OCR toggle, shown only if the server has an OCR URL. `Collection.tsx:335-349` | missing | `drop`: no OCR service; the card is not shown in Uwazi without one | - | S 
COL-14 | Forms and email: sender email, contact form email (no format check), public form URL. `Collection.tsx:353-378` | missing | `1:1` fields; add an email-format check Uwazi lacks | D1d | S 
COL-15 | Public forms: captcha bypass toggle, whitelisted templates multi-select. `Collection.tsx:379-402` | missing | `defer`: the prototype has no public submission form; picker would read D1a templates | D1a | S 
COL-16 | Map: provider (Mapbox or Google), API key (letters, digits, dot, underscore), layers (cannot be empty). `Collection.tsx:408-446` | missing | `1:1`; show the error text Uwazi does not render (key pattern, "Map layers cannot be empty") | D1d | S 
COL-17 | Map starting point: click map plus Latitude and Longitude; 0 is treated as unset (bug). `Collection.tsx:447-459` | missing | `1:1` with a map picker; accept 0 (do not copy the bug) | D1d, DATA | M 
COL-18 | One Save for the page, whole-document POST, no dirty guard, no Discard. `Collection.tsx:132-143` | partial: Save stays enabled after saving (H3) | `improved (Design: form page, ghost Discard plus commit, resets after save, dirty guard)`; per-slice store | DRAFT, D1d, PAT | S 
COL-19 | Notifications "Settings updated" / "An error occurred"; no field messages. `Collection.tsx:132-143` | partial: toast on Save | `1:1` via notify; error path and field messages added | NOTIFY | S 
COL-20 | Help "?" tooltip on most settings (long copy for landing page and non-latin). `collectionSettingsTips.tsx:5-195` | missing | `improved (Design: SettingsField description, keyboard-reachable)`; reuse Uwazi copy | PAT | M 
COL-21 | Cards: General, Analytics, Services, Forms and email, Map; two-column grid. `Collection.tsx:182-472` | partial: one short list, thinner than Uwazi (Design) | `1:1` sections; 40rem form width; single column on phone | PAT, PHONE | S 
COL-22 | Image upload inside the picker writes immediately, independent of Save. `Collection.tsx:124-129` | missing | `1:1` via the Uploads store (a file added stays even if the form is discarded) | D1d | S 
COL-23 | Other open sessions get the change over a socket. `Collection.tsx:132-143` | no-op | `drop`: single-user prototype | - | S 

Prototype-only (not in Uwazi):

| Control | Keep or drop | Why |
| "Public sharing toggles" (QA does not name them) | check, then drop if no Uwazi counterpart | Map to "Public instance", "Hide restricted relationships" or captcha bypass; extras have no Uwazi equivalent |
| Options order Cards, Table, Map | drop (cosmetic) | Uwazi order is Cards, Map, Table |


## Menu

Note: Uwazi saves the whole menu tree with one page-level Save (edits are local until then) and guards navigation. The prototype edits one item and discards the rest. Target is the Uwazi model: list-level draft, Save in the footer (Juan to confirm).

MEN-01 | Table: checkbox, drag handle, Label, URL, Edit; groups expand to show their links as sub-rows. `MenuConfig.tsx:131-173` | partial: flat rows; every group shows the same two sample sub-links (M7) | `improved UX9` tree list (group, then its links) with grip and keyboard reorder, as visitors see the menu | STORE, DRAFT, PAT | L 
MEN-02 | Footer "Add link" and "Add group"; type is fixed by the button, not editable later. `MenuConfig.tsx:52-60` | no-op: "Add link / Add item" toasts; Link/Group switch in editor | `1:1` two buttons, no type switch; verbs per Design ("Add") | STORE, PAT | S 
MEN-03 | Link form: Title required, URL required (no format check), Group select with "No Group". `MenuForm.tsx:204-227` | partial: fields work as form state; Save is a no-op (B2) | `1:1`; show error text under empty Title and URL (Uwazi uses red only) | DRAFT | S 
MEN-04 | Info band "Using URLs": external URL fully formed, internal relative. `MenuForm.tsx:163-192` | missing | `1:1` as the URL field description | PAT | S 
MEN-05 | Group form: Title only; a group has no URL. Server rejects URL on a group and sub-links on a link. `menuItems.ts:30-66` | partial: group editor edits sub-links inline (fake for existing groups) | `1:1` model: items have `parentId` (M7); validation messages for the 4 server rules | STORE | M 
MEN-06 | Sub-link lists inside an item editor do not exist; links choose a parent group. `MenuForm.tsx:220-227` | partial: inline sub-link add, delete, reorder work as form state | `keep (proto-only)` as a second way to edit a group's links; writes the same `parentId` model | STORE | M 
MEN-07 | Footer Delete for selected rows (and group sub-rows); no confirm; local until Save. `MenuConfig.tsx:131-173` | partial: per-row delete with ConfirmDialog works in list only | `improved UX2` selection bar plus Delete; no dialog (local draft), with `improved UX5` undo in the Beacon | DRAFT, NOTIFY, PAT | M 
MEN-08 | "Selected N of M" count; M counts an empty group as 2 (bug). `MenuConfig.tsx:144-146` | missing | `improved UX2` count in a fixed slot; count real rows | PAT | S 
MEN-09 | Drag reorder: links move between top level and groups; a group cannot enter a group; keyboard sensor on. `MenuConfig.tsx:131-173` | partial: sub-link reorder in the editor only; top level cannot be reordered (Design) | `improved UX9` grip plus up/down buttons for links and groups | DRAFT, PAT | M 
MEN-10 | Footer Save, disabled while the tree equals the loaded one; reordering back disables it. `MenuConfig.tsx:62-77` | no-op: Save toasts, list unchanged (B2) | `improved UX11` ink commit in the footer plus "Saved ..." line; dirty compared with stored value | DRAFT, PAT | S 
MEN-11 | Leaving with changes opens "Discard changes?" (Cancel does not reset the blocker, assumed risk). `MenuConfig.tsx:43,99-103` | missing: silent discard (B1) | `1:1` through the shared dirty guard; Cancel keeps the draft | DRAFT | S 
MEN-12 | Save reconciles the "Menu" translation context: renamed titles rename keys, deleted titles drop. `SettingsTranslationService.ts:82-100` | missing: Translations has no link to Menu | `1:1` Menu context derived from the menu store | D1c, STORE | M 
MEN-13 | Public navbar renders the saved links. `MenuConfig.tsx:20-27` | no-op: navbar items are hard-coded (B7) | `1:1` navbar reads the store | D1d | M 
MEN-14 | Server needs unique persistent ids; new items get temporary ids until saved. `MenuConfig.tsx:62-77` | missing | `1:1` stable ids from the collection store (H1 collision fix) | STORE | S 
MEN-15 | Empty table "NO DATA AVAILABLE"; loader error also shows empty. `MenuConfig.tsx:131-173` | partial: generic empty text | `improved (Design: list page, EmptyState offering Add link)`; add an error state | PAT | S 
MEN-16 | Notifications "Updated" after save, "An error occurred" on failure; local state kept. `MenuConfig.tsx:62-77` | partial: toast only | `1:1` via notify with a failure path | NOTIFY | S 
MEN-17 | Table has a 440px minimum and sub-link inputs truncate on phone (QA). `MenuConfig.tsx:131-173` | partial: table scrolls, editor inputs truncate | `improved UX12` list rows with indent for sub-links; editing in a sheet | PHONE | M 

Prototype-only (not in Uwazi):

| Control | Keep or drop | Why |
| Link/Group switch inside the editor | drop | Type is fixed by the Add button in Uwazi; two entry points avoid ambiguity |
| `SAMPLE_SUBLINKS` (same two sub-links on every group) | drop | Fake data; sub-links come from the real item model |
| Sub-link editing inside the group editor | keep (proto-only) | Easier on phone and keyboard; same data model |
| "Label" vs "Title" vs "Add item" vs "Add link" naming | drop | Use Uwazi's "Title" and "Add link" / "Add group" (Design) |


## Pages (list + editor)

Cite paths are under `app/react/V2/Routes/Settings/Pages/` unless shown. Prototype files: `PagesPage.tsx`, `site/CodePageEditor.tsx`, `atoms/sitePages.ts`. QA: the most functional Settings page. Review: H5 (list and code docs disagree), B1 (no guard), H2 (no usage check).

PAG-01 | List: table with row checkboxes, title, URL `/page/<id>/<slug>`, View and Edit per row, footer "Add page". `PagesList.tsx:83-126`, `PageListTable.tsx:14-45` | partial: list works, list entry lost on leaving (B3, H5) | `1:1` columns; list title read from the page doc, not a copy (H5); `improved UX1` search box | STORE, PHONE | M 
PAG-02 | Add page: footer link opens an empty editor, title "New page" in every language; nothing is stored until first Save. `pageEditorForm.ts:36-54`, `PageEditor.tsx:196-230` | partial: picker adds the row before saving, Cancel leaves orphan | `improved (Design: Pages finding)`: keep the starter picker, create the page only on first Save | STORE, DRAFT | S 
PAG-03 | Select rows, footer shows "Selected N of M" and "Delete". `PagesList.tsx:83-126` | missing: only per-row trash | `improved UX2`: selection action bar in the footer ladder (`BAR_DANGER` Delete) | PAT, STORE | M 
PAG-04 | Delete confirm lists page titles; server refuses (409) if a template uses it as entity view page; UI shows only "An error occurred" (Uwazi bug). `PagesList.tsx:46-52,128-139` | partial: confirm works, no usage check (H2) | `improved UX4`: dialog lists menu links to `/page/<slug>` and templates using it; do not copy the hidden error | USAGE, STORE, PAT | S 
PAG-05 | Row "View": opens the public page in a new tab; disabled for entity-view pages. `PageListTable.tsx:14-32` | missing: preview exists only inside the editor | `1:1`: opens the published rendering in `PublicPreview` | STORE | S 
PAG-06 | Title field per language; required for the active language, "This field is required". `PageEditor.tsx:345-353` | partial: title saved in doc, list row stays stale | `1:1`; list reads the doc title | STORE, DRAFT | S 
PAG-07 | URL: read-only copy field `/<lang>/page/<sharedId>/<kebab-title>` plus "View page"; slug is display-only, not stored. `PageEditor.tsx:355-374`, `pageUrls.ts:3-12` | partial: editable URL field, value not saved | `1:1`: read-only derived URL with copy; drop the editable slug | STORE | S 
PAG-08 | Language selector shown only with 2 or more languages; HTML, JS and CSS are per language. `PageEditorLanguageSelector.tsx:33` | works: EN/ES/FR/AR switch, fixed constants | `1:1` with installed languages (QA: Languages page does not propagate) | D1c | S 
PAG-09 | Tabs Configuration / HTML / Javascript / CSS in Monaco; HTML banner about embeddable components, JS banner "With great power comes great responsibility!". `PageEditorCodeTabs.tsx:50-132` | works: HTML/CSS/JS textareas, Tab inserts 2 spaces | `1:1` tabs and both banners; no Monaco (plain code area, shared with Customisation, one font size, Design) | PAT | S 
PAG-10 | Entity view toggle (page-wide); blocked while templates use it; disables View and Save and Preview. `PageEditor.tsx:336-343`, `pageSchemaValidator.ts:11-37` | missing | `defer`: needs templates that point at a page and an entity view that renders it | SCHEMA | L 
PAG-11 | Markdown support: hidden flag, deprecation banner, "This page does not need Markdown". `PageEditorComponents.tsx:62-86` | missing | `drop`: deprecated in Uwazi (2027), no legacy pages here | - | S 
PAG-12 | Save writes all languages in one request, no release; first save moves to the edit URL; Save disabled until dirty. `PageEditor.tsx:196-230`, `pageEditorForm.ts:70-98` | works: "Save draft" persists in session atom | `1:1`; draft kept in the pages store, dirty compared to stored value | STORE, DRAFT | S 
PAG-13 | "Save & Preview" saves then opens the draft page in a new tab. `PageEditor.tsx:232-246` | partial: live preview iframe with Draft/Published toggle instead | `keep (proto-only)`: inline preview replaces the new tab | - | S 
PAG-14 | Publish: modal "Publish release", required "Release message"; stores a snapshot (all languages) with version, user, date. `PageReleaseModal.tsx:33-52`, `PublishPageRelease.ts:22-44` | partial: Publish works, no message or version history | `1:1`: `Modal` with required message; releases stored per page | STORE, PAT, DATA | M 
PAG-15 | Restore previous version: modal lists releases of the active language (message, date), single select; overwrites the draft of all languages, no extra confirm. `PageRestoreModal.tsx:29-83`, `Page.ts:151-166` | missing | `improved (Design: Pages finding, destructive overwrite)`: restore as in Uwazi, plus a confirm that all languages are overwritten | STORE, PAT, DATA | M 
PAG-16 | Public site shows the last release, or the draft if never published (so unreleased pages are already public). `pageContent.ts:38-67` | partial: Draft / Published / "Published · edited" status | `improved (Design: Pages finding)`: keep the clearer status; one wording in list and editor; do not copy the "never released is public" quirk | - | S 
PAG-17 | Dirty guard on Back, Cancel, rail: `useBlocker(isDirty && !isSubmitting)`, "Discard changes?". `PageEditor.tsx:166-172,510-515` | missing: back arrow discards silently (B1, H5) | `1:1` | DRAFT | S 
PAG-18 | Cancel and Discard return to the list through the guard. `PageEditor.tsx:458-462` | partial: Discard reverts at once, no confirm | `improved (Design: Pages finding)`: confirm Discard when dirty | DRAFT, PAT | S 
PAG-19 | Empty list "NO DATA AVAILABLE"; editor "Loading" until languages exist. `PagesList.tsx:87-98`, `PageEditor.tsx:316-319` | missing: generic "Nothing here yet." | `improved (Design: list-page empty and loading states)`: named empty state with "Add page" | PAT | S 
PAG-20 | Notifications "Saved successfully.", "Deleted successfully.", "Page published successfully.", "Draft restored from release."; errors show server detail. `PageEditor.tsx:174-186,265,286` | partial: hand-pushed toasts, no error path (M4) | `1:1` via shared notify; add error path | NOTIFY | S 
PAG-21 | Language side effects: adding a language copies the default locale into every page; removing drops it (never the last). `AddLanguageToPages.ts:37`, `RemoveLanguageFromPages.ts:19-33` | missing | `1:1` once languages are a store | D1c, STORE | S 

**Prototype-only (not in Uwazi)**

| Control | keep / drop | Why |
| Starter template picker (8 site types) | keep | Gives a first page without a blank editor; make creation happen on first Save |
| Insert component palette (`Modal`) | keep | Uwazi only links to docs for embeddable components; palette is the useful version |
| Copy from language (`Modal`) | keep | Translators need it; add a confirm because it overwrites the target draft (Design) |
| Live preview iframe with Draft / Published toggle, phone Code/Preview switch | keep | Replaces Save and Preview; works on phone |
| Status column in the list (Draft / Published / Published · edited) | keep | Uwazi list has no status |
| Editable URL field | drop | Uwazi derives the slug and does not store it |

---


## Data visualizations

No prototype page exists. Cite paths are under `app/react/V2/Dataviz/` (`DV/`) and `Routes/Settings/Dataviz/` (`S/`), server `DZ/`. Every row below is **missing**; targets assume a build.

DVZ-01 | List: Name, Chart, Refresh (Live / Snapshot), Last updated, Edit; checkboxes; footer "Create visualization". `DatavizList.tsx:90-128`, `TableComponents.tsx:23-67` | missing: no page | `1:1` list on the list-page pattern, with `improved UX1` search | STORE, PAT, PHONE | M 
DVZ-02 | Bulk and editor Delete, confirm "This action cannot be undone"; does not check pages embedding the chart. `DatavizList.tsx:129-142`, `DeleteDataviz.ts:17-26` | missing | `improved UX4`: dialog lists pages that embed `<Dataviz id>`; `improved UX2` selection bar | USAGE, PAT, STORE | S 
DVZ-03 | Editor layout: config panel (Info / Data / Chart / Appearance / Refresh) beside preview (Preview / Advanced / Data / Query). `DatavizEditor.tsx:103-163` | missing | `1:1` two-pane editor; phone: config in a sheet, preview above (`improved UX12`) | PHONE, PAT | L 
DVZ-04 | Name: required, unique across charts (409), error jumps to Info tab. `InfoTab.tsx:13-28`, `CreateDataviz.ts:33-36` | missing | `1:1` | STORE, DRAFT | S 
DVZ-05 | Embed snippets: `<Dataviz id height="320"/>` and external iframe; "Allow public embedding" on private instances. `EmbedPanel.tsx:38-104` | missing | `defer`: needs the Pages editor to render the tag and a public site | STORE, D1d | M 
DVZ-06 | Input type Query or Manual; Manual = pasted chart JSON with "Load example", live parse error. `DataSourceKindSection.tsx:10-62`, `ManualDataEditor.tsx:17-88` | missing | `1:1` for Manual (only source that needs no entity query) | DATA | M 
DVZ-07 | Entity scope: all entities or only public. `EntityScopeSection.tsx:14-60` | missing | `defer`: needs a publish flag on entities | DATA | S 
DVZ-08 | Data sources: one or more templates (searchable modal), alias from 2 sources, join mode compare/union. `sources/*.tsx`, `JoinModeSection.tsx:11-47` | missing | `defer`: query builder over real entities | D1a, DATA | L 
DVZ-09 | Filters: property, operator by type (eq, in, between, contains), value. `data/filters/*.tsx`, `filterOperators.ts:6-34` | missing | `defer` with the query builder | D1a, SCHEMA | L 
DVZ-10 | Primary and second dimension, aggregation (sum/avg/min/max/count), date interval, max buckets. `DimensionSection.tsx:23-240` | missing | `defer` with the query builder | D1a, SCHEMA | L 
DVZ-11 | Chart type grid: pie, donut, bar, horizontal bar, stacked bar, line, area, list, gauge, metric, scatter, heatmap; unsupported types disabled with reason. `ChartTab.tsx:49-90` | missing | `1:1` for the types the chart library supports; `improved (Design: dataviz skill palette)` | DATA | L 
DVZ-12 | Chart options: legend, tooltip, labels, empty values, exclude zero, empty label, pie slices and "Others" label. `ChartTab.tsx:92-213` | missing | `1:1` | - | M 
DVZ-13 | ECharts override JSON ("Advanced" tab). `ChartAdvancedSection.tsx:74-107` | missing | `drop`: prototype has no ECharts | - | S 
DVZ-14 | Colour mode (palette, template colours, custom per value) and theme (transparent, background, foreground). `ColorModeSelect.tsx:9-79`, `ThemeColorsSection.tsx:12-57` | missing | `improved (Design: tokens)`: palette from tokens, dark-mode safe; custom colours kept | - | M 
DVZ-15 | Refresh mode Live / Snapshot manual / Snapshot scheduled; Live blocked by joins, 2 dimensions, over 10,000 entities; silently falls back. `RefreshTab.tsx:173-282`, `useLiveRefreshGuard.ts:35-42` | missing | `drop`: no backend; show every chart as live | - | S 
DVZ-16 | Schedule (daily / weekly / monthly, time in UTC) and "Update from collection". `RefreshTab.tsx:43-171,284-324` | missing | `drop`: no jobs in the prototype | - | S 
DVZ-17 | Preview debounced 300 ms; spinner, error, "Configure data source and dimension to see a preview."; footer "N entities · generated <datetime>". `useDatavizPreview.ts:13`, `DatavizPreviewPanel.tsx:72-101` | missing | `1:1` states | PAT | M 
DVZ-18 | Preview "Data", "Query" tabs and copy buttons for JSON. `JsonCopyPanel.tsx` | missing | `defer`: only useful with the query builder | - | S 
DVZ-19 | Save runs the query and stores a snapshot; first save moves to edit URL; "Saving" label. `CreateDataviz.ts:30-74`, `httpDatavizApi.ts:26-31` | missing | `1:1` without snapshots (store the definition) | STORE, DRAFT | S 
DVZ-20 | No dirty guard; Cancel discards silently (Uwazi gap). `DatavizEditor.tsx:74-80` | missing | `improved UX2`: register with the dirty guard; do not copy the gap | DRAFT | S 
DVZ-21 | Empty list "NO DATA AVAILABLE"; errors "An error occurred" with no code. `DatavizList.tsx:30-33`, `mapDatavizHttpErrors.ts:11-38` | missing | `improved (Design: list-page empty state)` | PAT, NOTIFY | S 

**Prototype-only (not in Uwazi):** none.

**Recommendation: defer, size L** (new component family: chart renderer, editor, manual-data path; the query builder needs template and entity stores, so build it only after D1a). If Juan wants a demo slice later: Manual data + chart type + options + preview, also L.

---


## Global CSS & JS (Customisation)

Cite paths are under `app/react/V2/Routes/Settings/Customization/` unless shown. Prototype: `CustomisationPage.tsx`. QA: Save is a toast, CSS not injected, JS not run, textarea has no accessible name (axe critical). Review: B2, H3. Design: gutter fails, Reset is a raw button.

CSS-01 | Title and nav label "Global CSS & JS" when `allowcustomJS` is on, else "Global CSS" and no JS tab. `Customization.tsx:59`, `SettingsNavigation.tsx:111-120` | partial: fixed label, JS tab always shown | `1:1`; flag is the Collection toggle "Global JS"; Design: use one name for page and file | D1d | S 
CSS-02 | Custom CSS editor (Monaco), prefilled from settings; no validation, no help text. `Customization.tsx:68-79,98-108` | partial: textarea with line count; no accessible name | `1:1` with a labelled code area (shared with Pages); no Monaco | PAT | S 
CSS-03 | Custom JS editor (Monaco), tab only when flag on; both editors stay mounted. `Customization.tsx:81-92` | partial: same as CSS | `1:1` | PAT, D1d | S 
CSS-04 | Save: disabled until changed; sends only edited slices in one request. `Customization.tsx:40-54` | no-op: toast only, text reverts on leaving (B2) | `1:1`; stored in the settings singleton | D1d, STORE | S 
CSS-05 | After save the baseline resets, Save disables again. `Customization.tsx:48-52` | partial: Save stays enabled (H3) | `1:1` | DRAFT | S 
CSS-06 | Dirty guard: `useBlocker(hasChanges)`, "Discard changes?". `Customization.tsx:31-38,120-122` | missing (B1) | `1:1` | DRAFT | S 
CSS-07 | Applied site-wide: CSS in `<style>` in the head of every page; JS in `<script>` only when the flag is on. `Root.jsx:145-166` | no-op: CSS not injected, JS not run | `improved (decision)`: inject CSS only into `PublicPreview` and the Pages preview, not the admin shell; store JS and do not run it | D1d, STORE | M 
CSS-08 | Notifications: "Saved successfully."; error "An error occurred" with server detail. `Customization.tsx:47-51` | partial: success toast, no error path | `1:1` | NOTIFY | S 
CSS-09 | Activity log stores the whole request body, so full CSS and JS text. `activitylogMiddleware.ts:42-58` | missing: nothing logged | `improved`: log "Updated custom CSS" with line counts, not the text (do not copy) | NOTIFY | S 
CSS-10 | Public read: CSS, JS and flag are readable by anyone through `GET /api/settings`. `publicSettings.ts:7-35` | n/a | `drop`: no server | - | S 
CSS-11 | Monaco failure renders an empty div; a failed load returns `{}` and a save would overwrite (assumed). `CodeEditorComponent.tsx:142-144` | n/a | `drop`: no Monaco, store always has a value | - | S 
CSS-12 | Layout: editor box starts at 28px against a 16px host gutter; code text `text-sm` against `text-[12px]` on Pages (Design) | partial: fails `window.__gutter()` | `improved (Design: Customisation finding)`: one shared code area on the gutter | PAT | S 
CSS-13 | Phone: editor works, 20rem min height. QA | works | `1:1` | PHONE | S 

**Prototype-only (not in Uwazi)**

| Control | keep / drop | Why |
| Reset per tab (raw button, immediate) | keep, with confirm and on the bar ladder | Handy; Design: no confirm, off the ladder |
| Line count and tinted toolbar | keep | Cheap orientation aid |
| Cascading-styles warning line | keep | Design: good, should stay |

---


## Uploads

Cite paths are under `app/react/V2/Routes/Settings/CustomUploads/` unless shown. Prototype: `UploadsPage.tsx`. QA: upload is a no-op, Edit copies the URL, thumbnails are icons. Review: B2, M3, H2.

UPL-01 | Table: Preview (icon or image thumbnail), Name (sortable), URL `/assets/<filename>`, Action. `UploadsTable.tsx:57-87` | partial: grid and list work; icons only, URL prefix `/uploads/` | `1:1` with real image thumbnails and `/assets/` URL | STORE, DATA, PHONE | M 
UPL-02 | "Import asset": modal with multi-file dropzone, Cancel / Add. `DropzoneModal.tsx:42-78` | no-op: toast, no file input | `improved (Design: Uploads finding)`: real file input plus drag-and-drop onto the page and the modal | STORE, PAT | M 
UPL-03 | Files upload one at a time with per-file progress line "Uploading... file N% (M remaining files)". `DropzoneModal.tsx:29-40`, `UploadService.ts:39-86` | missing | `1:1` as a Beacon task | NOTIFY | S 
UPL-04 | No client or server size or type limit (assumed proxy limit). `UploadMiddleware.ts:70` | missing | `keep (proto-only)`: cap per file (for example 2 MB), because files live in browser memory | STORE | S 
UPL-05 | URL cell is plain text, no copy. `UploadsTable.tsx` | works: Copy URL puts the path on the clipboard | `keep (proto-only)`: copy is better than Uwazi; give it its own action (UX5) | PAT | S 
UPL-06 | Row "Edit": side panel "Edit File", "File name" required, extension re-appended, URL unchanged. `EditFileSidepanel.tsx:20-82` | missing: list pencil copies the URL (M3) | `1:1` as a `Modal`; remove the mislabelled pencil | STORE, PAT | S 
UPL-07 | Delete (row and footer bulk): confirm lists file names, Cancel / Accept. `CustomUploads.tsx:157-166` | partial: confirm works, no usage check | `improved UX4`: dialog lists pages and CSS that reference the file | USAGE, STORE | S 
UPL-08 | Row checkboxes, footer shows "Delete" when rows are selected. `CustomUploads.tsx:107-148` | missing | `improved UX2`: selection action bar | PAT | S 
UPL-09 | Notifications "Uploaded custom file", "File updated", "Deleted custom file"; mixed results give both success and error. `CustomUploads.tsx:68-83` | partial: toasts, no error path | `1:1` | NOTIFY | S 
UPL-10 | Leaving during an upload asks "Discard changes?" (guard reads a non-reactive value, assumed flaky). `CustomUploads.tsx:56-66` | missing | `drop`: mock uploads finish in the session; revisit if progress is kept across navigation | - | S 
UPL-11 | Empty table "NO DATA AVAILABLE". `CustomUploads.tsx` | partial: "No assets match your search." even with zero files (Design) | `improved (Design: list-page empty state)`: separate "no uploads yet" and "no match" | PAT | S 
UPL-12 | Assets are usable from Pages and CSS through `/assets/<filename>` (public, no auth). `routes.ts:20` | missing: nothing reads uploads | `1:1`: preview and Pages resolve `/assets/<name>` to the stored file | STORE, D1d | M 
UPL-13 | Phone: grid 2-up works, list view table scrolls sideways. QA | partial | `improved UX12`: list rows, not a wide table | PHONE | S 

**Prototype-only (not in Uwazi)**

| Control | keep / drop | Why |
| Grid / List toggle | keep | Grid is the useful view for images |
| Search by name or URL, type filter | keep | `improved UX1`; Uwazi has none; use `TextInput` as Activity log does (Design) |
| Copy URL action | keep | See row above |

---


## Preserve

Cite paths are under `app/react/V2/Routes/Settings/Preserve/` and `app/api/preserve/`. **The Uwazi page is a single card with one extension token, not a list.** The prototype builds a list of capture sources with schedule and authentication, which the inventory does not show in Uwazi. Prototype: `PreservePage.tsx`, `PreserveTokenEditor.tsx`. QA: New token and Save are no-ops, no token is generated, existing sources open blank.

PRV-01 | Nav link shown only with `features.preserve.host`; route itself is not gated. `SettingsNavigation.tsx:92-100` | n/a: page always shown | `drop`: no feature flags in the prototype | - | S 
PRV-02 | Card "Preserve Extension": step 1 install the extension, step 2 request and copy the token into the extension settings; no link to the extension. `Preserve.tsx:30-79` | missing: page is a list of tokens | `1:1` card at the top of the page. The shipped CSV text for step 2 may differ from the inline text (assumed) | - | S 
PRV-03 | "Extension Token": read-only field with copy button, the current user's token. `Preserve.tsx:21-28,62-66` | partial: list "Copy token" shows a toast, copies nothing | `1:1` with a working clipboard copy | D1d | S 
PRV-04 | "Request token" (only when no token): calls the Preserve host for a token and stores it per user. `Preserve.tsx:15-19`, `preserve.ts:16-43` | no-op: not listed, no token generated | `1:1` mocked: generate a token, store it per user; second call returns the same token | D1d, STORE | S 
PRV-05 | First token creates a "Preserve" thesaurus and a "Preserve" template with Url (link) and Source (select). `preserve.ts:45-101` | missing | `defer`: needs the templates and thesauri stores | D1a, D1d, SCHEMA | M 
PRV-06 | Failed request (no config 402, host unreachable, bad master token) is an unhandled rejection; no loading or error UI. `Preserve.tsx:15-19` | missing | `improved (Design: shared states)`: busy state on the button and an error notification (do not copy the gap) | NOTIFY | S 
PRV-07 | No confirmation, not a form, no dirty guard. `Preserve.tsx` | partial: editor has Save and Cancel with no guard (B1) | `1:1` for the token card; guard only if the sources editor stays | DRAFT | S 
PRV-08 | Token and masterToken exposed to all admin sessions (Uwazi quirk). `publicSettings.ts:38-47` | n/a | `drop`: do not show other users' tokens | - | S 
PRV-09 | Captured pages become entities of the "Preserve" template (extension-side). `preserve.ts:78-101` | missing | `defer` with the template row | D1a, DATA | S 

**Prototype-only (not in Uwazi)**

| Control | keep / drop | Why |
| Source list (name, URL, schedule, last run, status) and Source editor (name, URL, authentication, schedule) | decision for Juan: keep below the token card, or drop | Not in the inventory; Uwazi has no source or schedule UI. QA: existing sources open blank (Review finding 9) |
| Capture now, captures table, View / Re-capture, filter | same as above | Mock only |
| Revoke token (confirm) | keep as proposal | Uwazi has no revoke or regenerate; needs server support, so flag as a proposal |
| "New token" / "New capture source" / "Add source" wording | drop | Design: one noun; use "source" only if the list stays |

---


## Import CSV

Not a Settings page in the prototype: a separate top-level view (`views/ImportCSVView.tsx`, `components/import-csv/*`, seed in `data/imports.ts`), reached from the Tools menu and the Library "Import CSV". **QA did not drive it; the "Prototype today" column is from reading the code.** It keeps its list in `useState` and a `setInterval` that simulates progress inside the view, so leaving the view loses the list and stops the simulation. No entities are written. Cite paths are under `app/react/V2/Routes/Settings/CSVUpload/` (`S/CSV`) and `app/api/csv.v2/`.

CSV-01 | Admin-only; nav "Import CSV" in Tools and a link in the Library footer. `SettingsNavigation.tsx:124-126` | works: Tools link and Library link (opens New import) | `keep (proto-only)`: separate view, not a Settings page | - | S 
CSV-02 | List header counters: Total, Processing, Completed, Failed (Failed includes Cancelled). `ImportsTable.tsx:307-363` | partial: Total, Processing, Completed shown; no Failed | `1:1` add Failed | - | S 
CSV-03 | Columns: Status, File, Template, Progress current/total, Entities created, Entities updated, Failed, Date, View; default sort Date descending. `ImportsTable.tsx:118-160` | partial: no "updated" column; phone list layout exists | `1:1` add Updated | DATA, PHONE | S 
CSV-04 | "Import CSV" opens a modal: one file (CSV or ZIP), Template select (first template preselected); Accept disabled without a file. `UploadFileModal.tsx:71-131` | partial: file is simulated (no real picker), template picker with search, none preselected | `1:1` with a real file input and ZIP accepted; keep the searchable picker | PAT | S 
CSV-05 | Template list comes from the templates cache; a deleted template shows its raw id. `ImportsTable.tsx:162-166` | partial: static `templates` from `data/imports.ts` | `1:1` read the templates store | D1a | S 
CSV-06 | Registering the import creates a task in the header Beacon ("CSV Import: Queued — file") and a notification on completed, failed, cancelled; user can leave the page. `CsvImportTasksSubscriber.tsx:86-168` | missing: no Beacon task; progress runs only while the view is open | `1:1` through the tasks store; move the simulation out of the view | NOTIFY, STORE | M 
CSV-07 | Pipeline stages with titles: Queued, Validating, Extracting files, Scanning, Creating thesauri, Creating relationships, Creating entities, Retrying, Completed, Failed, Cancelled, Completed with errors. `statusMessages.ts:9-82` | partial: uploading / processing / pending / completed (+ warnings, errors) and a short Stepper | `1:1` stage names and descriptions in the Stepper | - | S 
CSV-08 | Status page: file name, status pill, "Template / Date / Last updated". `UploadStatus.tsx:90-275` | works: title, status badge, source kind, created by, time | `1:1` | - | S 
CSV-09 | Six stat cards: Entities created, Entities updated, Rows processed, Rows failed, Thesauri values created, Related entities created ("-" for zero). `UploadStatus.tsx` | partial: Entities created and more, seed has thesauri and relationship counts | `1:1` full six | DATA | S 
CSV-10 | "Failure details" card (message, Stage, Code, Retryable) only when Failed. `UploadStatus.tsx` | partial: failed state shows a note, no stage, code or retryable | `1:1` | DATA | S 
CSV-11 | Row error table: Row (spreadsheet row number), Property, Message. `ErrorsTable.tsx:12-48` | partial: Issues table has field, issue, type, date; no row number | `1:1` add Row column | DATA | S 
CSV-12 | "Download failed rows" streams a CSV of failed rows. `DownloadCsvImportFailedRowsCsvController.ts:14-49` | missing | `1:1`: generate the CSV from the issues | - | S 
CSV-13 | Cancel import: modal "Canceling", text says created entities stay; button disabled for terminal states; task relabelled "Cancelled". `CancelProcessModal.tsx:42-76` | missing: only Delete exists | `1:1` with `Modal` and `BAR_DANGER` | PAT, NOTIFY | S 
CSV-14 | Empty state "No CSVs yet" with the hint to select Import CSV. `ImportsTable.tsx:279-304` | works: `ImportEmptyState` | `1:1` | - | S 
CSV-15 | Header rules: `id` column updates an existing entity; language columns `title__es`; messages such as `Column "X" does not exist in template "T".` `CsvHeaderAnalyzer.ts:5,74-186` | missing: no parsing | `defer`: needs templates schema and an entity write path; simulate with seeded issues | SCHEMA, D1a | L 
CSV-16 | Created entities appear in the Library. `CsvImportEntitiesJob.ts:102-125` | missing: no entity is written (code read) | `defer`: needs a write path to the entity overlay | STORE, DATA | M 
CSV-17 | Not a form; closing the modal discards the file; no guard. Live status updates by socket. `UploadFileModal.tsx`, `ImportsTable.tsx:211-277` | works: modal state resets; timer updates rows | `1:1` | - | S 

**Prototype-only (not in Uwazi)**

| Control | keep / drop | Why |
| Delete selected and Delete current (confirm, removes the list entry only) | keep | Uwazi keeps an import history with no delete; list hygiene is useful. Make clear that created entities stay |
| Row checkboxes and select all | keep | Needed for the delete above |
| "Completed with warnings" status and warning-type issues | keep | Uwazi has only "Completed with errors"; warnings cover truncation notices |
| Created-entities table in the detail view (names generated from a pool) | keep only with real data, else drop | Uwazi has none; fabricated names must not look real in an evidence product |
| `ToolsActionBar` list and detail modes | keep | Matches Figma ToolsActionBar |

---


## Activity log

Cite paths are under `app/react/V2/Routes/Settings/ActivityLog/` unless shown. Prototype: `ActivityLogPage.tsx` on `seedActivityLog`. QA: search, action filter, user filter and row expand work; request line is fabricated; no logging of Settings actions; export, pagination, date filter missing. Review: M4, B7.

ACT-01 | Table with footer "Showing X-Y of N" and paginator, 100 per page. `ActivityLog.tsx:75-129`, `ActivityLogLoader.ts:14,62` | missing: no footer, no pagination | `improved (Design: Activity log finding, add a footer)`; paginate when over a page | PAT | S 
ACT-02 | Columns: Action pill, User, Description (tooltip with Query and Body), Timestamp "DATE_MED - TIME_24", View. `TableElements.tsx:114-145` | works: pills fail contrast (carbon, amber); phone hides user and time | `1:1` columns; fix pill token pairs | PAT, PHONE | S 
ACT-03 | Action filter: multi-select CREATE, UPDATE, DELETE, MIGRATE, WARNING; WARNING matches nothing stored (assumed). `FiltersSidePanel.tsx:18-21,65-74`, `activityLogFilter.ts:150-166` | partial: single-select, 4 methods, upper-case labels | `improved (Design: Activity log finding)`: sentence-case labels, multi-select; `drop` WARNING | - | S 
ACT-04 | User filter: text, case-insensitive substring; "anonymous" matches entries with no user. `activityLogFilter.ts:203-214` | works: select from users in the log | `keep (proto-only)`: select instead of free text | - | S 
ACT-05 | Search: placeholder "by ids, methods, keywords, etc."; matches readable descriptions, then method, url, query, body. `activityLogFilter.ts:168-185` | works: matches summary text | `1:1` | - | S 
ACT-06 | Date range From / To with Today and Clear; `to` inclusive. `FiltersSidePanel.tsx:98-140` | missing | `1:1` | - | M 
ACT-07 | Filters in a side panel with Apply and Clear all; state kept in the URL; count pill on the button. `ActivityLog.tsx:42-44` | partial: inline live filters, no URL | `keep (proto-only)`: inline live filters (no router) | - | S 
ACT-08 | Sort by Action (HTTP method), User, Timestamp; default time descending. `ActivityLogLoader.ts:26,47-48` | missing: QA lists no sort | `1:1`; Action sorts by displayed label, not by HTTP method | - | S 
ACT-09 | Row "View" opens the "ACTIVITY" panel: description, pill, User card, raw Query and Body. `ActivityLogSidePanel.tsx:12-76` | partial: expandable row with a synthesised request line | `improved UX4`: expanded row shows what changed (fields, before and after) from the stored entry; any synthetic value labelled "example" | NOTIFY, DATA | M 
ACT-10 | Logs every non-GET `/api/*` request except an ignore list and 404s, including 400/401/500; only `password` is masked. `activitylogMiddleware.ts:33-78` | missing: seed rows only, no Settings action is logged | `improved UX4`: each Settings create, update, delete and import appends an entry (domain events, not HTTP) | NOTIFY | M 
ACT-11 | Descriptions from a lookup ("Updated settings", "Created page", ...); unmapped requests show as RAW `<METHOD> <url>`. `activitylogParser.ts:5-241` | partial: free-text summary per seed row | `1:1` summaries from the notify helper; `drop` RAW rows | NOTIFY | S 
ACT-12 | Dataviz, CSV import, Preserve and menu-link saves have no parsed description (RAW). `activitylogParser.ts` | n/a | `improved`: every logged action gets a summary; no RAW fallback | NOTIFY | S 
ACT-13 | Retention one year by TTL index; migration entries never expire. `activitylogMiddleware.ts:44` | n/a | `drop`: no server | - | S 
ACT-14 | Read-only: entries cannot be edited or deleted. `routes.js:7-18` | works | `1:1` | - | S 
ACT-15 | No export in Uwazi (inventory). | missing | `improved (Design: Activity log finding)`: CSV export in the page footer | PAT | S 
ACT-16 | API error: table is not rendered and no message is shown. `ActivityLogLoader.ts:105-113` | missing | `improved (Design: states)`: visible error with retry (do not copy the gap) | PAT | S 
ACT-17 | Empty result "NO DATA AVAILABLE", footer "Showing 1-0 of 0" (assumed). `PaginationState.tsx:13-24` | partial: count line updates | `improved (Design: list-page empty state)`: names the filters, offers "Clear filters" | PAT | S 
ACT-18 | "Last saved" line in editor footers ("Saved 2 min ago by admin"), read from this log; Dashboard "Recent activity" reads it too (Review D4). | missing | `improved UX11` | NOTIFY, DRAFT | S 
ACT-19 | Phone: user and time columns hidden below breakpoints. QA | works | `improved UX12`: list rows with user and time on a second line | PHONE | S 

**Prototype-only (not in Uwazi)**

| Control | keep / drop | Why |
| Synthesised "Request" line (`POST /api/entities { sharedId: "<fake hex>" … }`) | drop | Fabricated data in an evidence product; replace by real changed fields (Design) |
| Inline filter row and expand-in-place detail | keep | Fits the pane pattern; no side panel needed |



## Templates list

Note: Uwazi has no inputs on this page. It is one table with row actions and a footer. The prototype list lives in `TemplatesPage.tsx` (local state, B3) and the Review's B4 (templates in three stores) applies to every row that reads or writes the list.

TPL-01 | **Template table.** One table, default sort by name asc, columns Name, Translation, Entities, Set as default, Action. `Templates.tsx:69-81` | partial: lists seed, lost on leave (B3, B4) | 1:1, read from the template store that Library also reads | STORE, D1a | S 
TPL-02 | **Name link.** Name opens the editor; blue "Default" pill on the default template. `TemplatesTableComponents.tsx:13-31` | works: row click opens editor | 1:1; render the Default badge in ink/vellum, not carbon (improved (Design: Templates list finding "Default is carbon")) | PAT | S 
TPL-03 | **Translation column.** Template name in the current UI language, sortable. `TemplatesTableComponents.tsx:33-35` | missing: no link to translation contexts (B7) | defer: needs template translation contexts; add the column once they exist | D1c | S 
TPL-04 | **Entities column.** Distinct entity count per template, abbreviated 1.2k, sortable. `MongoEntitiesDAO.ts:313-323` | missing: shows property count only (H2) | 1:1, counted from the entity overlay; the same count feeds the delete guard | D1a, USAGE | S 
TPL-05 | **Set as default (star).** Moves the single default flag; disabled on the current default. Toast "Default template set successfully." `SetTemplateAsDefault.ts:18-34` | partial: `isDefault` exists, no set action reported (H2) | 1:1; one default at all times; star also pre-selects the template in new-entity creation (assumed Uwazi effect: default template used for new entities, not in inventory) | D1a, NOTIFY | S 
TPL-06 | **Edit button.** Ghost "Edit" next to the name link; both go to the editor. `TemplatesTableComponents.tsx:71-77` | partial: pencil duplicates the row target (QA 8) | improved (Design: list-page pattern, hover-only row actions, drop the redundant pencil) | PAT | S 
TPL-07 | **Add template.** Footer button, visible only with no selection, opens `/templates/new`. `Templates.tsx:85-91` | partial: adds a row; id collision (H1) | 1:1: opens the editor in new mode with a random preset colour; footer lead on `BAR_LEAD` (no edge) | D1a, PAT | S 
TPL-08 | **Row selection.** Checkbox per row; disabled with tooltip reasons: default / has entities / synced. `RowSelectComponents.tsx:19-41` | missing: no selection anywhere in Settings | improved UX2: selection action bar with fixed count slot; disabled rows carry the same two reasons | USAGE, PAT | M 
TPL-09 | **Selected count.** Footer "Selected n of total"; Add template is replaced by Delete. `Templates.tsx:92-100` | missing | improved UX2: count in a fixed slot, `BAR_DANGER` Delete, no tint | PAT | S 
TPL-10 | **Delete confirm.** Danger modal "Do you want to delete the following items?" with name list; buttons Delete / Cancel. `DeleteTemplatesConfirmationModal.tsx:22-37` | partial: single ConfirmDialog, no usage check (H2) | improved UX4: dialog lists the impact (other templates losing a relationship property, filter entries removed) instead of a bare list | USAGE, PAT | M 
TPL-11 | **Delete blocked.** Server refuses the default template and any template with entities (HTTP 400, messages in `errors.ts:261-277`). `DeleteTemplate.ts:33-42` | missing: default template can be deleted (H2) | 1:1: block both, and say which rule applies; the in-app message names the rule | USAGE | S 
TPL-12 | **Delete side effects.** Removes relationship properties in other templates that point at it, its translation context, and its entry in `settings.filters`. `DeleteTemplate.ts:27-95` | missing: nothing happens outside the page (B4) | 1:1 against the store: strip relationship properties pointing to it, drop its filter entry, drop its translation context | D1a, D1d, D1c, USAGE | M 
TPL-13 | **Bulk delete atomicity.** One DELETE per id in parallel; first error aborts, earlier deletions are not rolled back. `HttpTemplatesService.ts:14-21` | missing | drop: Uwazi gap, not worth copying; run the whole selection as one store action, all-or-nothing | STORE | S 
TPL-14 | **Synced template.** "Synced Template" column, plain-text name, disabled actions; only the UI blocks it, server does not. `TemplatesTableComponents.tsx:122-131` | missing | drop: no sync feature in the prototype | - | S 
TPL-15 | **Empty state.** "NO DATA AVAILABLE". `DefaultNoDataMessage.tsx` | partial: generic "Nothing here yet" | improved (Design: list-page EmptyState naming the object plus an "Add template" action) | PAT | S 
TPL-16 | **Outcome feedback.** Toasts "Template(s) deleted successfully." and error "An error occurred" with detail; activity log "Deleted template", "Set default template". `activitylogParser.ts:132` | partial: hand-rolled toasts, no log entry (M4) | 1:1 through the notify hook, each action appended to the activity log | NOTIFY | S 
TPL-17 | **Search and sort.** No search on this page (Uwazi); columns sort. `Templates.tsx:72-81` | missing: no search, no column sort reported | improved UX1: search row above the table (always mounted); column sort kept | PAT | S 
TPL-18 | **Phone.** Not specified in Uwazi (desktop table). | partial: 548px table scrolls sideways | improved UX12: list rows with name, colour dot, default badge, entity count | PHONE | S 

### Prototype-only (not in Uwazi)

| Control or element | Keep or drop | Why |
| Property count column | keep | Useful at a glance, but derive it from the store (list says 8, editor shows 4: Review B6) |
| Carbon "Default" badge | drop (restyle) | Carbon is the data accent; ink or vellum for status (Design) |
| Pencil and trash visible on every row | drop (move to hover/overflow) | Twelve icons on screen; row target already opens the editor |


## Template editor

Note: Uwazi saves the whole template in one request and then runs a background job over entities. The prototype has no search index or job queue, so rows about reindexing are `drop` or `defer`. Rows tagged SCHEMA only matter if the template property list becomes the schema the entity edit form renders (Review B6/D7).

TED-01 | **Template name.** Required; unique case-insensitive on client; empty shows red state with no message. `TemplateMetadata.tsx:60-72` | partial: required-name error only (QA) | 1:1 with a message for the empty case too (improved over Uwazi's silent state); trim; whitespace-only counts as empty (H3) | D1a, DRAFT | S 
TED-02 | **Colour.** 15 preset swatches plus custom colour; new template gets a random preset; no validation. `TemplateMetadata.tsx:53-59` | works: 11 swatches plus custom; list row only (B4) | 1:1 behaviour, keep the prototype palette; colour must reach Library type dot, cards and facets | D1a | S 
TED-03 | **Entity view page.** Checkbox plus Select of pages flagged `entityView`; unchecking clears it; hint when no page qualifies. `TemplateMetadata.tsx:74-99` | missing (Design) | defer: pages have no entity-view flag, and entity detail has no page-render path; revisit with the Pages store | D1d, DATA | M 
TED-04 | **Common property rows.** Title, Date added, Date modified always present, lock icon, not draggable or removable, always on top. `helpers.ts:78-84` | missing: no common rows (Design) | 1:1: three locked rows at the top of the table | D1a | S 
TED-05 | **Title options.** Label editable; Generated ID checkbox ("A generated ID will be the default title"). `GeneratedIdField.tsx` | missing | 1:1: label editable; generated-ID only if the entity form can auto-fill the title, so SCHEMA | D1a, SCHEMA | M 
TED-06 | **Date added / modified.** Label input disabled; only Priority sorting editable. `LabelField.tsx:28` | missing | 1:1 (read-only label, sorting flag only) | D1a | S 
TED-07 | **Priority sorting.** Custom: only with filter on and type text, numeric, select or date; common: always. Tooltip copy in inventory. `PrioritySortingField.tsx` | missing | 1:1 flag in the store; Library default sort reads it (Library has its own sort today, so wiring is part of the row) | D1a, DATA | M 
TED-08 | **Property table.** Columns drag, checkbox, Property, Type, Options; options shown as read-only pills (Show in cards, Required, Fill/Fit, thesaurus name). `TemplateEditorTableComponents.tsx:82-151` | partial: inline required/filter/cards checkboxes; names collapse on phone | 1:1 pills for the full option set; keep inline checkboxes as a fast path (proto-only) | D1a, PHONE | M 
TED-09 | **Add property.** Footer button opens the panel in new mode; local until Save. `TemplatesEditor.tsx:230,338` | partial: footer warm button; ids collide (H1) | improved (Design: Templates editor finding "Add property belongs above the table, not in the bar"); stable ids | D1a, PAT | S 
TED-10 | **Edit property.** Row button or label click opens the panel with the row; commit merges into the row. `TemplatesEditor.tsx:263-266` | partial: dialog opens with defaults, not the saved config (B6) | 1:1: panel loads the property's real type config; unchanged Save does not mark dirty (H3) | D1a, DRAFT | M 
TED-11 | **Property panel container.** Large right sidepanel with overlay; "NEW PROPERTY"/"EDIT PROPERTY"; Cancel and Add property/Save. `ConfigPropertyPanel.tsx` | partial: hand-rolled dialog, no focus trap or role (M1) | improved UX12: shared `Modal` (md), full-screen sheet on phone; Escape in a Select closes only the Select | PAT, PHONE | M 
TED-12 | **Remove properties.** Footer Remove on selection, no confirmation; on Save the missing properties are deleted with all their values on every entity. `TemplatesEditor.tsx:259-261`, `TemplateDiff.ts:112-130` | partial: immediate delete, no confirm (Design 3) | improved UX5 and UX4: remove from draft with undo in the Beacon; at Save show "N entities lose this value" | USAGE, DRAFT, NOTIFY, SCHEMA | M 
TED-13 | **Inherited property guard.** Deleting a property that another template inherits is refused with the property names. `UpdateTemplate.ts:66-73` | missing | 1:1: block removal and name the template(s) that inherit it | USAGE, D1a | S 
TED-14 | **Reorder.** Drag handle; order = array order; common rows stay on top. `Table.tsx:215-217` | partial: reorder works as form state, drag only | improved UX9: drag plus up/down buttons (the Filters pattern) | PAT | S 
TED-15 | **Multi-select and bulk remove.** Checkbox column, "Selected n" in footer replaces the add buttons. `TemplatesEditorFooter.tsx:24-59` | missing | improved UX2: selection bar with count slot and `BAR_DANGER` Remove | PAT | S 
TED-16 | **Property search.** None in Uwazi. | missing | improved UX1: search above the property table (templates with many properties) | PAT | S 
TED-17 | **Property to card link.** None in Uwazi (cards read `showInCard`). `cardModel.ts:153-202` | partial: live card preview, no row link; text overlaps (Design) | improved UX7: hover or focus a property row highlights its place on the card preview; fix the overlap | D1a | M 
TED-18 | **Property type select.** 16 types (17 with Violated articles); read-only box on edit, so type never changes after create. `PropertyTypeField.tsx:16-38` | partial: 8 types with its own vocabulary (B6) | 1:1 list of 16, type locked after create; one vocabulary shared with the entity form | D1a, SCHEMA | L 
TED-19 | **Label.** Required; unique per template (case/trim-insensitive); default text is the capitalised type name; changing type resets the label. `LabelField.tsx:36-50`, `ConfigPropertyPanel.tsx:126-133` | partial: form works, uniqueness not reported | 1:1 required and unique; deviate: empty default (Uwazi default collides with an existing "Text"), and a type change keeps typed text | D1a | S 
TED-20 | **Text, Rich text, Numeric.** Plain value types; filter and default filter allowed; priority sorting for text and numeric only. `ConfigPropertyPanel.tsx:56-72` | partial: text, numeric, markdown exist | 1:1 | D1a, SCHEMA | S 
TED-21 | **Date, Multiple dates, Date range, Multiple date ranges.** Four date types; filter allowed; priority sorting for date only. | partial: only date; CEJIL adapter flattens the others to date (B6) | 1:1: add the three missing types; stop the adapter collapsing them | D1a, SCHEMA, DATA | M 
TED-22 | **Select.** Thesaurus picker, required; options are thesauri of type not-template, sorted by label. `ThesaurusField.tsx` | partial: static seed list by name; no binding written (B6) | 1:1 against the live thesauri store; picking one writes the binding the entity form resolves | D1a, STORE | M 
TED-23 | **Multiple select.** Same thesaurus picker; filter allowed, no priority sorting. | missing (Design: most used missing type) | 1:1; form renders multiselect for it | D1a, SCHEMA | M 
TED-24 | **Relationship.** Relationship type (required), Entities (any template except this one, default "Any entity"), Inherit property (only when a template is chosen). `RelationshipFields.tsx:38-144` | partial: related template and type from static seeds; no inherit control (B5, B6) | 1:1 against the single relation-type registry and live templates; inherit picker lists the target's custom properties; do not copy the likely inherit-clearing defect on open (assumed) | D1a, D1b, SCHEMA | L 
TED-25 | **Link.** Plain value type, no filter or style options. `ExpressTemplateMapper.ts:51-93` | missing | 1:1 | D1a, SCHEMA | S 
TED-26 | **Image, Preview, Media.** Style Fill/Fit radio (tooltips in inventory), Full width checkbox; no filter. `StyleField.tsx`, `FullWidthField.tsx` | partial: image only; no style or full width | 1:1: add Preview and Media, Fill/Fit and Full width, rendered by the entity view | D1a, SCHEMA | M 
TED-27 | **Geolocation.** Plain value type, no filter. | partial: type exists | 1:1 | D1a, SCHEMA | S 
TED-28 | **Generated ID.** Type that auto-fills a short id; filter allowed. `GenerateIdProperty` | missing | 1:1: id is generated on entity create, only if the form reads the schema | D1a, SCHEMA | M 
TED-29 | **Violated articles (nested).** Offered only for project `cejil`; server refuses elsewhere; sub-properties have no UI. `PropertyTypeField.tsx:36-38` | missing | drop: single-project type with no editor UI; the CEJIL corpus keeps its own display | - | S 
TED-30 | **Hide label.** Checkbox `noLabel` for non-common properties. `HideLabelField.tsx` | missing | 1:1: record view hides the label | D1a, SCHEMA | S 
TED-31 | **Required.** Checkbox; entity save is refused when empty. `RequiredField.tsx` | partial: checkbox works as form state, not persisted | 1:1: edit form refuses an empty value and marks the field | D1a, SCHEMA | M 
TED-32 | **Show in cards.** Checkbox; Library cards read it. `ShowInCardsField.tsx` | partial: checkbox and card preview work; Library ignores it (B7) | 1:1: Library cards show flagged properties | D1a, DATA | M 
TED-33 | **Use as filter.** Checkbox for filterable types only; unchecking forces Default filter and Priority sorting off. `FilterField.tsx`, `ConfigPropertyPanel.tsx:145-150` | partial: checkbox works as form state | 1:1: Library facets read it; same-name same-type properties combine into one facet (Uwazi tooltip) | D1a, D1d | M 
TED-34 | **Default filter.** Checkbox shown only when Use as filter is on. `DefaultFilterField.tsx` | missing | 1:1 | D1a | S 
TED-35 | **Per-type option matrix.** Which controls appear per type (link, image, preview, media, geolocation get no filter; only text, numeric, select, date get priority sorting). `ConfigPropertyPanel.tsx:56-72` | partial: partial type set | 1:1 as one constant table that drives the panel | D1a | S 
TED-36 | **Same-label table.** Read-only table of same-label properties in other templates; mismatch cells red and Save disabled with no text. `MatchingPropertiesTable.tsx` | missing | 1:1 with a visible error line (Uwazi shows red cells only); use the stricter client rule (exact type, same thesaurus/relation) and drop the server's compatible-type pairs | D1a | M 
TED-37 | **Reserved and derived names.** `name` is derived from the label on every save; non-ASCII letters become `_`; label "Title" collides with the common property. `propertyNameGeneration.ts:5-15` | missing | drop name derivation (stable property ids); reject labels equal to a common property label (Uwazi checks only `title`, assumed) | D1a | S 
TED-38 | **Add thesaurus modal.** Name field, duplicate check, creates an empty thesaurus and adds it to the list. `AddThesaurusModal.tsx:30-51` | missing | 1:1 on the thesauri store; modal stays open on a duplicate name | STORE, PAT | S 
TED-39 | **Add relationship type modal.** Same shape; creates a type and adds it to the picker. `AddRelationshipTypeModal.tsx` | missing | 1:1 into the single registry | D1b, PAT | S 
TED-40 | **Save.** Disabled without changes; writes the whole template; toasts "Template saved successfully."; error "Error saving template."; activity log entry. `TemplatesEditor.tsx:339` | partial: saves name and colour only; dirty flag wrong (B2, H3) | 1:1 full save from the draft; dirty compares with the stored value and clears after save | D1a, DRAFT, NOTIFY | M 
TED-41 | **Dirty guard.** Blocks navigation except edit-to-edit; no `beforeunload`. `TemplatesEditor.tsx:147-150` | missing: none in Settings (B1) | improved (Design: shared editor pattern): guard Back, Cancel, rail, navbar, corpus switch, including edit-to-edit; no `beforeunload` (state is in memory only) | DRAFT | S 
TED-42 | **Cancel.** Link to the list, blocked by the guard when changed. `TemplatesEditorFooter.tsx` | partial: discards silently | 1:1 through the guard; `BAR_GHOST` | DRAFT, PAT | S 
TED-43 | **After save.** New template navigates to its edit page; existing stays. `TemplatesEditor.tsx:208-212` | partial: toasts then closes | improved (Design: editor pattern, save writes back and returns to the list with the row highlighted) | D1a | S 
TED-44 | **Rename effects.** Template and property label renames update translation keys and the filter entry (top-level only; a template inside a group keeps its old name). `ReconcileFiltersOnTemplateChange.ts:42-49` | missing: rename reaches nothing (B4) | 1:1 plus fix: filters hold template ids, names read from the store, so groups update too | D1a, D1d, SCHEMA | M 
TED-45 | **Reindex confirm.** Over 3000 entities every save asks "Lengthy reindex process"; HTTP 409 opens "Template conflict" with a full reindex option. `TemplatesEditor.tsx:244-249` | missing | drop: no search index in the prototype; revisit only if a mock job is added | - | S 
TED-46 | **Processing state.** Header progress bar "Updating template properties across n entities..."; edits refused while processing. `Template.ts:255-260` | missing | drop: store updates are instant; if needed show a task in the Beacon after a property delete or rename | NOTIFY | M 
TED-47 | **Unknown template id.** Loader falls back to an empty new template, and Save creates it. `createTemplatesEditorLoader.ts:35-45` | missing | drop (Uwazi defect): show "Template not found" and return to the list | - | S 
TED-48 | **Last saved.** None in Uwazi (activity log keeps "Created template"). | missing | improved UX11: "Saved 2 min ago by admin" in the editor footer, fed by the activity log | NOTIFY | S 
TED-49 | **Phone.** Not specified in Uwazi. | partial: Property column collapses to 0 (QA, Design 4) | improved UX12: property rows with name, type badge and flag icons; panel as a sheet | PHONE, PAT | M 

### Prototype-only (not in Uwazi)

| Control or element | Keep or drop | Why |
| Live card preview beside the properties | keep | Shows `showInCard` effect; becomes the target of D7; fix the title/label overlap |
| Inline Required / Filter / Cards checkboxes in the property table | keep | Quick toggle without opening the panel; must write the same store fields |
| Static thesaurus, template and relation-type option lists (`THESAURUS_OPTIONS`, `RELATION_OPTIONS`) | drop | Replace with live stores (B6) |
| Name-validation `role=alert` summary | keep | Accessible error line; reuse for all validations |
| Footer "Add property" as a warm button | drop (move above the table) | Design: belongs to the section, not the bar |

### Display-level subset

Can be built without the SCHEMA decision (template is a display record: name, colour, flags, lists):
- Template name, Colour, Template table (list side), Common property rows (display), Date added/modified rows, Priority sorting (flag only), Property table and Options pills, Add property, Edit property, Property panel container, Reorder, Multi-select and bulk remove (without data-loss claims), Property search, Property to card link, Label, Same-label table, Select (thesaurus binding via `thesaurusBindingsAtom`), Show in cards, Use as filter, Default filter, Per-type option matrix, Reserved and derived names (stable ids), Add thesaurus modal, Add relationship type modal, Save, Dirty guard, Cancel, After save, Last saved, Phone, Inherited property guard.
- Relationship picks (type and target template from live stores) can also be built at display level; the Inherit property step is display-only until the form reads it.

Need SCHEMA (useful only when the property list drives the entity form):
- Title options (generated ID), Remove properties (the "entities lose values" impact), Property type select (shared 16-type vocabulary), Text/Rich text/Numeric, the four date types, Multiple select, Relationship (with inherit), Link, Image/Preview/Media, Geolocation, Generated ID, Hide label, Required, Rename effects (property rename migrating values).
- Not tagged SCHEMA but gated on other work: Entity view page (pages store, DATA), Translation column (D1c).


## Filters

Note: Uwazi's `settings.filters` is an ordered list of templates and groups, edited locally and written by one Save. It only sets which templates and groups appear in the Library "Type" facet; it does not filter search results server-side. `FiltersTable.tsx:121`

FLT-01 | **Page intro.** Banner "Filters configuration" explains order by drag and grouping by "Add group". `FiltersTable.tsx:164-189` | works: description text present | 1:1 meaning; use "templates", not "types" or "entity types" (vocabulary table) | - | S 
FLT-02 | **Template rows.** Ordered list of templates in `settings.filters`; templates not listed disappear from the Type facet once any filter exists. `libraryTypeFilters.ts:12-44` | partial: all types listed with show/hide; form state only | keep the show/hide model (hidden = absent); a new template starts hidden, which makes the Uwazi gotcha visible | D1d, D1a | M 
FLT-03 | **Add entity type modal.** Multiselect with search of templates not yet used; Add disabled when empty. `AddTemplatesModal.tsx` | missing (show checkbox replaces it) | drop: the show/hide checkbox covers it | - | S 
FLT-04 | **Add group.** Sidepanel with Name (required) and Entity types multiselect; group appended at the end. `FiltersSidepanel.tsx:94-139` | partial: "New group" button top-right, inline rename | 1:1 outcome; move the create action to the footer (improved (Design: Filters finding "New group sits in the body")) | D1d, PAT | S 
FLT-05 | **Edit group.** Edit button on the group row; members removed return to the pool, not re-added at top level. `helpers.ts:49-65` | partial: rename and group select per row, form state | 1:1: rename plus members; removed members become hidden templates | D1d | S 
FLT-06 | **Group name validation.** Required, "This field is required". `FiltersSidepanel.tsx:94-105` | partial: whitespace-only name accepted (H3) | 1:1 with trim; same message | DRAFT | S 
FLT-07 | **Reorder and nest.** Drag to reorder; drop onto a group to nest; drag out; a group cannot go inside a group. `Table/helpers.ts:26-110` | partial: drag grip, Move up/down, group select | improved UX9: keep Move up/down and group select as the keyboard path; forbid group-in-group | D1d, PAT | S 
FLT-08 | **Group rows.** Collapsible group with its members; empty group shows "Empty group. Drop here to add". `DnDComponents.tsx:148-163` | partial: groups as chips and a select | 1:1 empty-group hint; group rows collapsible | D1d | S 
FLT-09 | **Delete.** Checked rows (templates or groups with members) removed locally, no confirm. `FiltersTable.tsx:98-116` | partial: remove group is immediate (Design 3) | improved UX5: remove with undo in the Beacon, since changes stay local until Save | NOTIFY, DRAFT | S 
FLT-10 | **Save.** `POST` settings with only `filters`; empty groups dropped; toast "Filters saved"; error toast. `FiltersTable.tsx:121`, `helpers.ts:88-108` | no-op: toast only, stays enabled (B2, H3) | 1:1: write the filters store, drop empty groups, reset dirty after save, error path | D1d, DRAFT, NOTIFY | M 
FLT-11 | **Cancel.** Footer Cancel reverts to the loaded filters. `FiltersTable.tsx:87-91` | missing: no baseline to revert to (H3) | 1:1 (`BAR_GHOST`) | DRAFT, PAT | S 
FLT-12 | **Dirty guard.** `useBlocker(hasChanges)` blocks all navigation; modal "Discard changes?". `FiltersTable.tsx:54` | missing (B1) | 1:1 through the shared guard | DRAFT | S 
FLT-13 | **Library Type facet.** Facet built from `settings.filters`; group rows expand, group count is the sum of members, ticking a group toggles all; empty config falls back to all templates by name. `TypeFacet.tsx:36-107` | no-op: Library facets hard-coded; Person still shows after hiding; "My group" never appears (B7, QA) | 1:1: `LibraryFilters` reads the store; seed it from the Library's own "Documents" group | D1d, D1a, DATA | L 
FLT-14 | **Template rename and delete.** Rename updates top-level entries only (a template inside a group keeps its old name); delete removes it recursively but leaves empty groups until next Save. `settingsTree.ts:50-71` | missing: nothing reaches the page (B4) | 1:1 with fix: filters store template ids and reads names from the template store; empty groups dropped on delete | D1a, D1d | S 
FLT-15 | **Group label translation.** Group names live in the "Filters" translation context, reconciled on Save. `SettingsTranslationService.ts:104-125` | missing | defer: needs the translations store | D1c | S 
FLT-16 | **Empty state.** "NO DATA AVAILABLE". `DefaultNoDataMessage.tsx` | partial: generic line | improved (Design: list-page EmptyState with an action) | PAT | S 
FLT-17 | **Search.** None in Uwazi (Add modal has search). | missing | defer: list is short; Add-modal search not needed with the show/hide model | - | S 
FLT-18 | **Phone.** Not specified in Uwazi. | partial: 580px table scrolls sideways | improved UX12: list rows with show toggle, group chip and move buttons | PHONE | S 

### Prototype-only (not in Uwazi)

| Control or element | Keep or drop | Why |
| Properties table (show/hide, Move up/down per property) | keep, decision needed | Uwazi sets property filters in the Template editor (`filter` flag) and has no order control; keep only as a view over the template `filter`/`defaultfilter` flags (one source), or drop |
| "Group" column on Properties (always "—") | drop | Placeholder; no data behind it (QA, Design) |
| Footer count "13 filters shown" | keep | Fixed-slot count, the right pattern (Design) |
| Show/hide checkbox per template | keep | Replaces Uwazi's Add entity type modal and Delete |
| Move up/down buttons | keep | Keyboard path for reorder (Design 9); needed on touch |
| "Types" label | drop (rename to "Templates") | Vocabulary table |


## Thesauri (list and editor)

Note: the prototype's thesaurus store (`atoms/thesauri.ts`) is the model D1-generic copies. "Prototype today" for Thesauri is mostly correct; the gaps are validation, usage checks, search/import and the guard.

THS-01 | List table: Label (sortable, name asc), Templates column with pills of templates whose property uses it. `ThesauriList.tsx:14`, `TableComponents.tsx:126` | partial: name and item count; no Templates pills | `1:1` Templates pills from the live template store; add search (improved UX1) | STORE, D1a, PAT | S 
THS-02 | Add thesaurus (footer) opens empty editor; Edit per row opens editor. `ThesauriList.tsx:72`, `EditThesaurus.tsx:36` | works | `1:1`; footer lead action on the bar ladder | PAT | S 
THS-03 | Name: required, trimmed, unique (exact, case-sensitive); client shows only a red input, no message. `ThesaurusForm.tsx:84`, `Thesaurus.ts:64` | partial: whitespace-only name accepted, no uniqueness (H3) | improved (Design: form pattern): case-insensitive unique check with an inline message (Uwazi gives none) | DRAFT | S 
THS-04 | Items: add one or many via side panel; typing in last card adds another; empty cards dropped; labels whitespace-collapsed. `ThesauriValueFormSidepanel.tsx:40` | works: inline inputs, blank rows dropped on save | improved UX6: tree with click-to-edit, Add item inserts at cursor or top, labels sanitised the same way | DRAFT | M 
THS-05 | Groups: one level, group needs at least one item; edit group via panel; "Empty group. Drop here to add". `ThesauriGroupFormSidepanel.tsx:85`, `DnDComponents.tsx:159` | partial: groups with children work; empty group can be saved (M5) | `1:1` (reject empty group); improved UX6 "move to group" (Uwazi cannot move between groups) | DRAFT | M 
THS-06 | Reorder by drag (mouse and keyboard sensors); a row stays inside its parent. `Table.tsx:214`, `helpers.ts:53` | partial: drag only; no buttons inside groups | improved UX9: grip plus Move up/down, same parent rule | PAT | M 
THS-07 | Sort button sorts root values and each group's children by label; result becomes saved order. `helpers.ts:108` | missing | `1:1` (use locale-aware compare; Uwazi uses lodash default) | DRAFT | S 
THS-08 | Collapse all / Expand all in the editor table header. `Table.tsx:274` | missing | `1:1`; also collapsed by default for groups above ~50 items | - | S 
THS-09 | Duplicate and blank validation: create rejects duplicate labels per level and empty labels; update skips validation (inferred). `Thesaurus.ts:64`, `Thesaurus.ts:216` | partial: blanks dropped; duplicates accepted (M5); form dedupes by `foldLabel` | improved (Design: validation): enforce on every save, same `foldLabel` rule as `addThesaurusValueAtom`; same label under different groups stays allowed | DRAFT, STORE | S 
THS-10 | Remove selected values (tick, footer "Remove"); confirm only if used by a template and value is saved; last child removes the group. `EditThesaurus.tsx:105`, `ThesaurusActions.tsx:13` | partial: per-row delete, no confirm, no bulk | improved UX2 and UX4: bulk select with count bar; confirm shows entity count using the value | USAGE, PAT, DATA | M 
THS-11 | Value delete effect on entities: async job rebuilds entities, removed values dropped (inferred). `DenormalizeThesaurusEntities.ts:22` | no-op: entity values keep the id and print label or raw id | `1:1` drop value from entities on save, after the confirm | STORE, USAGE | M 
THS-12 | Rename value: same id, new label; entities and per-language translation keys follow. `ThesauriService.ts:68` | works for the edit-form picker (ids, not labels) | `1:1`; also renames the key in the Translations context | STORE, D1c | S 
THS-13 | Save: one Save for name and values; toasts "Thesauri added." / "Thesauri updated."; new thesaurus stays on editor. `ThesaurusForm.tsx:44` | works: writes the store (session atom) | `1:1`; Save disabled until dirty, dirty compared with stored value | DRAFT, NOTIFY | S 
| Propagation to entity edit form (select and multiselect read the thesaurus). `EditEntity.tsx:60` | works: new value shows in the Case status picker | `1:1` (keep) | STORE | - |
THS-14 | Propagation to template property dialog (lists live thesauri) and to library filters. `filterableProperties.ts:1` | no-op: dialog uses static `seedThesauri` by name; facets read entity data (B6) | `1:1` dialog lists live thesauri by id and writes `thesaurusBindingsAtom`; library facets defer (facets are built from entity data) | D1a, SCHEMA | M 
THS-15 | Delete from list: tick rows, bulk "Delete"; checkbox disabled when a template uses it, no tooltip; server refuses with count. `ThesauriList.tsx:34`, `DeleteThesaurus.ts:17` | partial: delete with confirm works; no in-use check; "fall back to free text" claim is false (H2) | improved UX4: refuse while a template uses it and name those templates (Uwazi shows no reason); bulk delete via UX2 bar | USAGE, PAT | M 
THS-16 | Import CSV: appends values, `-` prefix means child, `,` or `;`, language columns become translations; saves form first, no preview. `importThesauri.ts` | missing (no CSV flow) | improved UX3: Dropzone, preview of values to add and duplicates skipped, then apply; add Export CSV | PAT, DATA, STORE | L 
THS-17 | Long lists: no search, filter or jump in Uwazi (2,443-value case in prototype). `Table.tsx` | missing: 2,443 inline inputs | improved UX1 and UX6: search, A-Z jump, collapsible groups, virtualised rows | STORE | M 
THS-18 | Translation pill beside each label when translated name differs. `TableComponents.tsx:11` | missing | defer: show once the Translations store exists | D1c | S 
THS-19 | Leave with unsaved edits: "Discard changes?" modal; no `beforeunload`; edit-to-edit paths not blocked (Uwazi bug). `EditThesaurus.tsx:78` | missing: Back, Cancel and rail clicks discard silently (B1) | `1:1` through `useDirtyGuard`; also guard edit-to-edit and corpus switch | DRAFT | S 
THS-20 | Empty and loading: "NO DATA AVAILABLE"; global loading bar, no skeleton. `DefaultNoDataMessage.tsx:6` | partial: "Nothing here yet."; corpus loading reads as empty | improved (Design: list-page empty and loading states): named empty state with Add action, skeleton rows while loading | PAT | S 
THS-21 | Errors and toasts: "Error updating thesauri.", server details such as in-use and duplicate name. `ThesauriList.tsx:52` | missing: no failure path | `1:1` success and error notifications; simulate in-use and duplicate failures | NOTIFY | S 
THS-22 | Phone: wide table with drag, checkbox and Edit columns. `ThesaurusForm.tsx:77` | partial: list fits; editor works | improved UX12: value rows with edit sheet, no table | PHONE, PAT | M 

**Prototype-only (not in Uwazi)**

| Control or element | Keep or drop | Why |
| Item count column in the list | keep | Quick size cue; derive from `countItems(values)` so it matches the editor (M5: 24 vs 9) |
| Per-corpus overlay and seed (CEJIL, Travesía thesauri) | keep (proto-only) | Prototype has several data sources; Uwazi has one collection |
| Inline text inputs for every value | drop | Replaced by the tree (D6); inputs cause mistyping and slowness at 2,443 rows |

**Uwazi things the prototype lacks entirely**: none beyond the rows above.


## Relationship types

Note: Uwazi stores only `id` and `name` per type (`RelationshipType.ts:1`). The prototype has three registries (B5); D1b moves Settings onto `relationTypesAtom`.

REL-01 | List table: Label (translated name plus raw name in brackets), Templates pills, sortable by label; rows sorted by translated name. `RelationshipTypes.tsx:57`, `TableComponents.tsx:26` | partial: seed rows with fake usage count (B5) | `1:1` from `relationTypesAtom`; show raw name only when it differs from the translation | STORE, D1b | S 
REL-02 | Templates column: templates with a relationship property using the type (client side from templates). `RelationshipTypes.tsx:40` | missing: shows seed "N relationships" | `1:1` pills from the template store; add a references count column (Design: vocabulary says "references") | D1a, USAGE | S 
REL-03 | Add relationship type: panel with Name; footer lead action. `RelationshipTypes.tsx:70` | no-op: Create toasts, type not listed (B2) | `1:1` write to the registry via `registerRelationType`; label "Add relationship type" on the bar, "Add" as commit | D1b, DRAFT, PAT | S 
REL-04 | Name rules: required; client "Already exists" is case-sensitive and untrimmed; server is case-insensitive and trimmed and returns HTTP 500 on case-only duplicate (bug). `Form.tsx:29`, `CreateRelationshipType.ts:19` | missing: no validation | improved (Design: validation): check trimmed, case-insensitive on the client; do not copy the 500 | DRAFT | S 
REL-05 | Edit name: renames the type and its translation key; ids unchanged so nothing else is rewritten. `UpdateRelationshipType.ts:18` | no-op: list shows old name | `1:1` rename in registry; references and template properties follow by id | D1b, STORE | S 
REL-06 | Inverse name: not in Uwazi (model is `id` and `name`); CLAUDE.md lists "no inverse labels" as a known gap. `RelationshipType.ts:1` | partial: field exists, never stored, blank for seeds | drop (proposal): nothing reads it, so it repeats the fake-save problem. Decision for Juan: if kept, it must be stored on the type and read by the Relationships panel | D1b | S 
REL-07 | Delete: tick rows, "Delete"; checkbox disabled when a template uses it. Server also refuses if used by relationships or saved queries. `DeleteRelationshipType.ts:21`, `RelationshipTypes.tsx:54` | partial: row removed locally; reference types stay (B5) | improved UX4: refuse when a template property uses it and name the templates; when only references use it show the count and offer "Delete and set those references to no label" (the panel modal's behaviour). Decision for Juan: Uwazi refuses both cases | USAGE, D1b, PAT | M 
REL-08 | Delete confirm: "Do you want to delete the following items?" with bullet list. `RelationshipTypes.tsx:180` | partial: ConfirmDialog, text describes a reassign the code does not do (H2) | improved UX4: dialog states counts and the exact effect, rewritten to match the code | USAGE, PAT | S 
REL-09 | Multi-select with "Selected N of M" bar and bulk delete. `RelationshipTypes.tsx:54` | missing | improved UX2 (same bar as other lists) | PAT | S 
REL-10 | Search and sort: Uwazi has sort only. `RelationshipTypes.tsx:57` | missing | improved UX1: search row (small list, low priority) | PAT | S 
REL-11 | Save model: panel Save and Cancel per type, toast "Updated", no dirty guard; loader revalidates. `RelationshipTypes.tsx:75` | partial: toast and close, no write-back (B2) | `1:1` write then return to list with row highlighted; add dirty guard on Cancel and Back (improved over Uwazi) | DRAFT, NOTIFY | S 
REL-12 | Type name translated in context "Relationship Type"; translating happens in Translations. `RelationshipTypeTranslationService.ts:18` | missing | defer: appears automatically as a Translations context once D1c derives contexts | D1c | S 
REL-13 | Create inline from the template property dialog ("Add relationship type" modal) and from entity view. `AddRelationshipTypeModal.tsx:12` | partial: panel has a manage modal; template dialog uses static seeds | `1:1` one registry shared by Settings, panel modal and template dialog | D1b, D1a | M 
REL-14 | Empty state "NO DATA AVAILABLE"; error toast "An error occurred" with server detail. `RelationshipTypes.tsx:111` | missing | improved (Design: list-page empty state) with Add action; error path for in-use delete | PAT, NOTIFY | S 
| No socket: other sessions see changes on next load. `sockets.js` | n/a | drop: single-user prototype | - | - |
REL-15 | Phone: three-column table with Edit. `RelationshipTypes.tsx:17` | partial: 440px table; editor fine | improved UX12: list rows with name and usage, edit in a sheet | PHONE | S 

**Prototype-only (not in Uwazi)**

| Control or element | Keep or drop | Why |
| Inverse name field | drop (proposal) | Not in Uwazi v2; no reader; Juan to confirm |
| "Usage" column with seed counts | drop, replace | Seed numbers match no reference; replace with real counts |
| `no_label` and V4 types in the panel registry | keep (hidden, not deletable) | Fallback when a type is deleted; Uwazi has no such type |
| "Manage relationship types" modal in the Relationships panel | keep | Already does real CRUD; must share the registry with Settings |

**Uwazi things the prototype lacks entirely**: none beyond the rows above.


## Languages

Note: Uwazi writes languages through dedicated endpoints and has no form, so every action is immediate after its modal. Install and uninstall run background jobs.

LNG-01 | List "Active languages": `<label> (<key>)`, sortable, plus Default, Reset, Uninstall columns. `LanguagesList.tsx:37`, `toTableLanguages.ts:5` | works: native name repeats ("English English"), 4 action columns | improved (Design: Languages finding): one row menu (Make default, Reset, Uninstall), Default shown as badge | D1c, PAT | S 
LNG-02 | Install modal: size lg, search (English label), multi-select, `*` marks available default translation, legend, "Install (N)" disabled until one ticked. `InstallLanguagesModal.tsx:22` | partial: hand-rolled dialog, adds one row per click, no focus trap (M1) | `1:1` on `Modal` with `ModalSearchRow` and `ModalList`; multi-select, "Install (N)", closes on commit | PAT, D1c | M 
LNG-03 | Note in modal: "This action may take some time while we add the extra language to the entire collection." `InstallLanguagesModal.tsx:22` | missing | `1:1` | - | S 
LNG-04 | Catalog: about 186 installable languages; 11 have a predefined UI file (ar, el, en, es, fr, ko, my, ru, th, tr, uk). `availableLanguages.ts`, `defaultTranslations.ts:21` | partial: 32 languages, no "has translation" flag | `1:1` for the flag with the same 11; keep 32-language catalog (defer the rest: no extra value in a prototype) | DATA | S 
LNG-05 | Install effect: language marked `installing`; translations cloned from the default language (untranslated); predefined System strings loaded; entities cloned by job. `AddLanguage.ts:23`, `CloneLanguageEntitiesJob.ts:45` | no-op: row added at 0%; Translations has no column for it (B7) | `1:1` for translations: new column starts as a copy of the default; entity cloning defer (prototype renditions are fixed to 4 languages) | D1c, DATA | M 
LNG-06 | Installing state: task "Installing languages", toast "Languages installed successfully"; table shows no installing state; Uninstall on it returns 409. `LanguagesList.tsx`, `sockets.js:139` | missing | improved (Design: states): row shows "Installing" with a task in the Beacon for a few seconds (mock), Uninstall disabled meanwhile; add the error end state Uwazi never emits | D1c, NOTIFY | M 
LNG-07 | Set default: star button, no confirmation; moves `default` flag only; default is clone source and reference for "untranslated". `SetDefaultLanguage.ts:23` | partial: badge moves; Library default unchanged | improved (Design: confirm on default change): confirm dialog naming the effect; Translations reads the new default | D1c, PAT | S 
LNG-08 | Default language drives visible UI (header and interface pickers). `atoms/language.ts:3` | no-op: pickers use fixed EN/ES/FR/AR constants (B7) | defer: decision for Juan (pickers tied to the 4 renditions); Settings list and Translations use the store | D1c | M 
LNG-09 | Reset: only shown when a predefined file exists; overwrites existing System keys with non-empty CSV text; toast "Language reset success". `PopulateTranslationsController.ts:8` | no-op: toast only | `1:1` against seeded System strings (mock "predefined" set); only System context changes | D1c, DATA | M 
LNG-10 | Reset and Uninstall confirm: "Are you sure?", red "Other users will be affected by this action!", type `CONFIRM`, accept disabled until typed. `LanguagesList.tsx:68`, `ConfirmationModal.tsx:67` | partial: uninstall has plain confirm; reset has none | `1:1` type-the-word variant on `Modal`; improved UX4: show content counts in the dialog | PAT, USAGE | M 
LNG-11 | Uninstall: hidden for default; refused while installing; deletes translations and, by job, entities and pages; task "Uninstalling language". `DeleteLanguage.ts:20` | partial: row removed, default has no button | `1:1` removes the language column in Translations and per-language data; entity deletion defer with the clone | D1c, NOTIFY | M 
LNG-12 | Per-language content counts before delete (Uwazi shows none). `DeleteLanguage.ts:20` | missing | improved UX4: dialog lists records and translated keys in that language | USAGE | S 
LNG-13 | Toasts: "Default language change success", "Language reset success", "Language uninstalled successfully", error "An error occurred". `useApiCaller.ts:18` | partial: hand-rolled toasts | `1:1` through `useSettingsNotify`; log to Activity log | NOTIFY | S 
| Save model: no form, no dirty guard; each action immediate. `LanguagesList.tsx` | works | `1:1` | - | - |
LNG-14 | Propagation: language list feeds Translations columns, Dashboard count, Pages. `sockets.js:82` | no-op: Dashboard and Translations read `seedLanguages` (B7) | `1:1` one languages store read by Translations, Dashboard and Pages | D1c, STORE | M 
LNG-15 | Phone: 704px table with Reset and Uninstall off screen. `LanguagesList.tsx` | partial: sideways scroll, actions hidden | improved UX12: list rows with badge and row menu | PHONE, PAT | S 

**Prototype-only (not in Uwazi)**

| Control or element | Keep or drop | Why |
| Translated-percentage column (0% on install) | keep | Matches Design item 8 (per-language progress); derive from the Translations store, no stored number |
| "Set" text button and separate Default badge | drop | Replaced by the row menu and badge |
| Per-language native name next to English name | keep | Helps pick a language; hide when equal |

**Uwazi things the prototype lacks entirely**: "Uninstall blocked while installing (HTTP 409)" is covered in the Installing row; nothing else.


## Translations (list and editor)

Note: Uwazi cannot add or delete keys here. Keys come from the sources (templates, thesauri, relationship types, menu, filters, System CSV), so the prototype must derive contexts, not store them.

TRN-01 | List in two tables: "System translations" (User Interface, Menu, Filters) and "Content translations" (templates, thesauri, relationship types). Name sortable, Type pill, "Translate". `TranslationsList.tsx:35` | partial: one list with seed contexts and fake counts | `1:1` two groups, built from real stores; Type pill warm for all (Design: "System" carbon is off) | D1c, D1a, D1b, D1d | M 
TRN-02 | Contexts with no keys are skipped; a context missing from the first language is hidden (inferred). `TranslationsList.tsx:35` | no-op: contexts show generated "<name> term N" rows | `1:1` skip empty contexts; drop generated rows | D1c | S 
TRN-03 | Template context keys: template name, title label, each property label. `TemplateTranslationService.ts:11` | missing: no link to templates | `1:1` derived from template store; property labels depend on the UX7 decision | D1a, SCHEMA | M 
TRN-04 | Thesaurus context keys: thesaurus name and every value label; created on create, kept in sync on save. `ThesaurusTranslationService.ts:59` | missing: no link to thesauri | `1:1` derived from thesaurus store; renamed value keeps other-language text | STORE, D1c | M 
TRN-05 | Relationship type context: one key, the name. Menu context: link titles. Filters context: group names. `SettingsTranslationService.ts:78`, `RelationshipTypeTranslationService.ts:18` | missing | `1:1` derived from registry, menu and filters stores | D1b, D1d, D1c | M 
TRN-06 | System ("User Interface") keys: from repo CSVs, hundreds of keys; code strings absent from CSV never appear. `updateTranslationsDB.js:46` | partial: seed list capped at 10 generated rows | `1:1` seed 100-200 real UI strings from the prototype's `t()` dictionary as System keys | DATA | M 
TRN-07 | Editor: one table per key, rows are languages (autonym, code pill, value input with clear-X). `EditTranslations.tsx:351` | works as form: term by language grid, source column read-only | keep (proto-only layout: grid is better for scanning, Design agrees); add search, sticky header | D1c | M 
TRN-08 | Value rules: required, "This field is required"; any string accepted; no length rule. `EditTranslations.tsx:351` | missing | `1:1` required per cell; Save blocked with a count of empty cells | DRAFT | S 
TRN-09 | Language pill status: default (primary), untranslated (yellow, value equals default text), translated (gray). `LanguagePill.tsx:11` | missing | `1:1` status per cell; improved UX8: per-language progress in the header (a proper noun counts as untranslated in Uwazi; allow "same as source" mark instead) | D1c | S 
TRN-10 | Toggle "Untranslated Terms": shows keys where some language is untranslated; hides all keys with one language. `EditTranslations.tsx:174` | missing | improved UX8: toggle plus per-language filter and counts | D1c | S 
TRN-11 | Search by key: none in Uwazi. `EditTranslations.tsx` | missing | improved UX1: search keys and values | D1c | S 
TRN-12 | Save: one Save per context, N per-language requests in parallel (partial save possible); then loader revalidates. `EditTranslations.tsx:253`, `SaveLocaleTranslations.ts:23` | no-op: toast, edits lost on reopen (B2) | `1:1` one Save for the context, applied all at once (do not copy the partial save); toast "Translations saved" only after the write | STORE, DRAFT, NOTIFY | M 
TRN-13 | Dirty guard: `useBlocker(isDirty && !submitting)`, "Discard changes?"; no `beforeunload`. `EditTranslations.tsx:219` | missing (B1) | `1:1` through `useDirtyGuard` for Back, Cancel, rail and corpus switch | DRAFT | S 
TRN-14 | Save propagates: thesaurus context edits re-label entity values in that language (async). `PropagateThesaurusTranslationService.ts:43` | missing: UI strings not read from here (B7) | defer: needs entity display per language. Decision for Juan: should System edits change the live `t()` strings for the 4 UI languages | D1c | L 
TRN-15 | Import CSV (System only): `Key` column plus language-name columns; only existing keys with non-empty cells; no confirm, no dirty check. `csvLoader.ts:61`, `EditTranslations.tsx:393` | no-op: toast, no file picker | improved UX3: Dropzone and preview of changed cells before applying; available for every context | PAT, DATA, STORE | L 
TRN-16 | Export CSV: none in Uwazi. `routes.ts` | missing | improved UX3: export a context to CSV (translators work in spreadsheets) | PAT | M 
TRN-17 | Live translate: header language menu, admin only, modal edits one key across languages. `TranslateModal.tsx:27` | missing | defer: outside Settings; needs click targets on every `t()` string | D1c | L 
TRN-18 | Empty editor: info box "There are no untranslated terms" (also when no keys). `EditTranslations.tsx:379` | missing | `1:1` with two distinct messages for "no keys" and "all translated" | - | S 
TRN-19 | Large contexts rendered lazily (`RenderIfVisible`). `EditTranslations.tsx` | partial: 10 rows only | `1:1` virtualised rows for the System context | - | S 
TRN-20 | Phone: grid of key tables. `EditTranslations.tsx` | partial: grid shows Term and English only, sideways scroll | improved UX12: one card per key, language rows stacked, status dot per row | PHONE | M 

**Prototype-only (not in Uwazi)**

| Control or element | Keep or drop | Why |
| Key count and "Keys" column in the list | keep | Useful size cue; derive from contexts; add per-language progress (D8). Editor calls them "Term": use "key" in both |
| "Translate" button beside a clickable row | drop | Duplicates the row target (Design); Uwazi has the button, prototype row click is enough |
| Term by language grid (one table) | keep | Faster to scan than Uwazi's one table per key |
| Generated "<name> term N" rows, 10 max | drop | Fabricated data; replaced by derived keys |

**Uwazi things the prototype lacks entirely**: Machine translation is not on this page in Uwazi (entity editor only, behind a feature flag), so out of scope here.


## Metadata extraction


### Extractors dashboard

IXE-01 | Route is admin+editor. Rail link needs the `metadata-extraction` flag. All `/api/ixextractors` answer 404 unless `metadataExtraction.url` is set. `Routes.tsx:394-404`, `serviceMiddleware.ts:4-13` | missing: rail item always shown, no role or flag (own code check) | `1:1` through the nav-gating table below. Show it to editors too (Uwazi probably hides it from them, see Feature toggles) | D1d | S 
IXE-02 | Table columns: Extractor Name, Property (type icon + label), Source (PDF, Title or a property), Template(s) pills, "Review" button. `IX/components/TableElements.tsx:329-355` | partial: Property+template, Status, Documents, Accuracy; no name, source or multi-template | `1:1` columns. Keep Status and Accuracy as extra columns (see prototype-only) | STORE, D1a | S 
IXE-03 | Extractor name is required; no uniqueness check, error is a red field with no message. `IX/components/ExtractorModal.tsx:201-211` | missing: no name field, property text acts as the name | `1:1` plus a visible message; also reject duplicate names (Uwazi does not) | DRAFT | S 
IXE-04 | Step 1 "Properties by template": foldable multiselect with search; types text, numeric, date, select, multiselect, relationship, markdown, plus Title. After the first pick only same-named properties stay. `ExtractorModal.tsx:19-94` | partial: template select + free-text property (QA, Design) | `improved (Design: Metadata extraction, property is a select of the template's properties)`, multi-template as in Uwazi | D1a | M 
IXE-05 | Step 2 shows Input and Selected templates, then "Common sources" radio: PDF, Title, or text/markdown property common to all templates. `ExtractorModal.tsx:227-259`, `IX/helpers/helpers.ts:90-165` | missing: no source choice | `1:1` | D1a | M 
IXE-06 | Create and edit use one 2-step modal (Cancel/Next, Back/Create or Update), size xxl. `ExtractorModal.tsx:194-293` | partial: full-page editor mixes config and review | `1:1` as a shared `Modal` (`xl`, full screen on phones); review moves to its own page | PAT, PHONE | S 
IXE-07 | Server checks: at least one template, property exists with an allowed type, source is pdf or an existing property; 422 with English codes. `ixextractors.ts:57-126` | missing | `1:1` as inline field errors; one message per rule, no codes | DRAFT | S 
IXE-08 | "Edit Extractor" appears only when one row is selected. Changing the property deletes all suggestions and recreates blanks; changing templates adds or removes their suggestions. `IXDashboard.tsx:140-144`, `ixextractors.ts:128-157` | partial: pencil opens editor; type always "Text"; save writes nothing (QA, B2) | `improved UX4`: the Edit modal states how many suggestions the change discards (Uwazi gives no warning) | STORE, USAGE, DRAFT | M 
IXE-09 | Footer swaps "Create Extractor" for "Delete" (and "Edit Extractor" when one row) once rows are checked. `IXDashboard.tsx:140-177` | missing: per-row pencil and trash, no selection | `improved UX2`: checkbox column and selection action bar (Edit when 1 selected, Delete, count in a fixed slot) | PAT | M 
IXE-10 | Delete confirm "Delete extractors", bullet list of names, Cancel/Accept (danger); also deletes the extractors' suggestions. `IXDashboard.tsx:163-177`, `ixextractors.ts:159-181` | partial: confirm works, row removed, not stored (B3) | `improved UX4`: confirm names the suggestion count and accepted values that stay on entities | STORE, USAGE, PAT | S 
IXE-11 | Empty table reads "NO DATA AVAILABLE". Success: "Saved successfully.", "Extractor/s deleted". Error: "An error occurred"; the modal closes on failure and loses input. `IXDashboard.tsx:93-115` | partial: toasts only; generic empty text | `improved (Design: shared list pattern, empty state names the object and offers Create)`. Keep the modal open on error (Uwazi bug, not copied) | NOTIFY, PAT | S 
IXE-12 | Dashboard has no search. | missing | `improved UX1` only if the list passes about 10 extractors; otherwise `defer` (few rows) | - | S 
IXE-13 | Phone: table scrolls sideways; Review and checkboxes off screen (inventory silent; QA for prototype). | partial: only Entity and Current visible, actions off screen (QA) | `improved UX12`: list rows with name, property, template chips, status; Review on tap | PHONE | S 

### Suggestions page (one extractor)

IXE-14 | Breadcrumb "Metadata extraction > name". Table title: property icon, label, "for", template pills. Button "Stats & Filters" with active-filter badge. `IX/IXSuggestions.tsx:334-374` | partial: one editor page, config on top | `1:1` as a separate suggestions view reached by "Review" (list to detail) | STORE | S 
IXE-15 | Columns: Name (link, language), Context (highlighted segment or "No context"), Current Value/Suggestion (green match, amber mismatch, "Error", "(obsolete)"), Use for training, Accept, Open. `TableElements.tsx:98-327` | partial: Entity, Current, Suggested, Score, State, accept/reject; no context (QA) | `1:1`: add Context and "Use for training" toggle; keep State pill (Matches, Empty, Mismatch, Accepted) for scanning | DATA | M 
IXE-16 | 100 rows per page, "Showing a-b of N", server-side sort by column header; no search. `IXSuggestions.tsx:375-396` | missing: 12 mock rows, no sort | `improved UX1`: search by entity name; sort yes; paging `defer` (mock sets stay small) | DATA | S 
IXE-17 | "Stats & Filters" panel: counts and 9 flags (Labeled, Non-labeled, Use for training; Non processed, Obsolete, Error; Match, Mismatch, No context) combined with OR, plus Accuracy with tooltip. `FiltersSidepanel.tsx:99-232` | partial: one segmented filter (All, Pending, Mismatch, Empty, Accepted) and a stats strip | `1:1` as a slide-over; keep the segmented filter as the quick path | STORE | M 
IXE-18 | "Accept" per row sends the value, notify "Suggestions sent", socket later confirms "Suggestions updated". Disabled for rows with no suggestion, obsolete or error. Writes the value to the entity in all languages. `TableElements.tsx:173-217`, `suggestions.ts:181-203` | partial: row flips to Accepted, value not written to any entity (QA) | `1:1`; write the accepted value to the entity overlay (Juan to confirm, see summary). Show the two notify steps via the Beacon | NOTIFY, STORE | M 
IXE-19 | No bulk accept for selected rows; the only bulk accept is "Auto-accept suggestions" in the Process modal. `IXSuggestions.tsx:400-457` | partial: "Accept all" with no confirm (Design) | `improved UX2`: select rows, "Accept selected" in the action bar, confirm shows the count. Deliberately more than Uwazi | PAT | M 
IXE-20 | "Use for training" toggle per row; set automatically when a sidepanel field is edited. `TrainingSetController.ts`, `PDFSidepanel.tsx:118-122` | missing | `1:1` | STORE | S 
IXE-21 | "Open" row action: PDF sidepanel with highlight, "Click to fill", Clear, "Use for training" and Accept; or a property sidepanel for property-source extractors. `PDFSidepanel.tsx:118-186` | missing | `defer`: needs PDF text selection inside the settings drawer. Later reuse `DocumentViewer` and the existing click-to-fill signal | DATA | L 
IXE-22 | "Train model" modal: Training sample radio (marked only, or marked plus labeled), "Find suggestions after training", Amount (default 1000), info banner. `TrainModelModal.tsx:32-146` | missing: only "Find suggestions", which reseeds the same 12 rows | `1:1` as a `Modal`; start a mock task | NOTIFY, PAT | M 
IXE-23 | "Process extractor" / "Process selected" modal: Find (filters Non processed, Obsolete, Error; amount), Auto-accept (source previous or all; overwrite blank only or all). `ProcessExtractorModal.tsx:46-288` | missing | `1:1`. Add a confirm line when Overwrite is "For all entities" (Uwazi has none) | NOTIFY, PAT | M 
IXE-24 | Run status in the footer: "Sending labeled data...", "Training model...", "Finding suggestions..." with processed/total, "Accepting suggestions...", "Canceling...". "Cancel" replaces "Train model" while busy. Beacon tasks. `IXSuggestions.tsx:53-61,142-254`, `taskProgress.ts:26-102` | missing | `1:1` with the existing `tasksAtom` and a timer. Layout stays fixed while status text changes | NOTIFY | M 
IXE-25 | Error states: "Error" row value, server texts (no segments, no labeled files), 409 model not ready, status `failed` shows no text in Uwazi. `ixMaterials.ts:49-71`, `IX/types.ts:72-80` | missing | `improved (Design: Save feedback, add an error path)`: show Error state with a message and Retry; do not copy the `failed` gap | NOTIFY | S 
IXE-26 | Obsolete rows appear when the entity or file changed after the suggestion; shown "(obsolete)" and not acceptable. `getIXSuggestionState.ts:71-110` | missing | `defer`: needs entity-edit listeners; seed one obsolete row for display | DATA | S 
IXE-27 | No confirm on Accept, Train, Process or Cancel. Entity sidepanels discard on Escape; no dirty guard. `IXSuggestions.tsx:124-254`, `Sidepanel.tsx:41` | partial: accept/reject decisions are lost on leave (QA, B1) | `improved (Design: Metadata extraction, confirm bulk actions)`: decisions persist in the store; dirty guard only on the config modal | DRAFT, STORE | S 
IXE-28 | Phone: not covered by Uwazi docs; wide table. | partial: Suggested, Score, State and accept/reject off screen (QA) | `improved UX12`: each suggestion a row (entity, current to suggested, state, Accept button) | PHONE | M 

Prototype-only (not in Uwazi)

| Control or element | Keep or drop | Why |
| Status pill column on the list (Ready, Training, Processing, Error) | keep (proto-only) | Uwazi shows run state only inside the suggestions page; one glance on the list is useful; derive it from the task state |
| Documents and Accuracy columns on the list | keep (proto-only) | Accuracy exists in Uwazi's Stats panel; both help a demo; compute from the store |
| Score (confidence) column on suggestions | keep (proto-only) | Uwazi has no per-row score; Design asks to define Score, Accuracy and Confidence and use two terms |
| Reject (removes the row, no undo) | drop | Uwazi has no reject; an unaccepted row simply stays. Juan may want it kept, then add Beacon undo (`improved UX5`) |
| "Accept all" | drop | Replaced by "Accept selected" (`improved UX2`) |
| "Find suggestions" single button | drop | Replaced by Train model and Process extractor |
| Property type select in the editor (always "Text") | drop | Type comes from the chosen property |
| Reviewed/pending/accuracy stats strip in the editor | keep (proto-only) | Cheap summary above the table; Uwazi puts accuracy in the filters panel |


## Paragraph extraction

Uwazi has three screens (extractors, entities of one extractor, paragraphs of one entity) and no edit flow. The prototype has two (list, one job editor) and a different model (one template per job, segmentation settings). Target is Uwazi's model.

### Extractors dashboard

PXE-01 | Route admin+editor. Rail link needs the `paragraphExtraction` tenant flag. All 7 API endpoints 403 without it. `Routes.tsx:414-423`, `PXRoutes.ts:15-62` | missing: always shown, no role or flag | `1:1` through the nav-gating table | D1d | S 
PXE-02 | Table: Source Template pill, Target Template pill, Entities (count plus "N New" pill), "View". `PX/components/extractors/TableElements/columns.tsx:11-40` | partial: Template, Status, Paragraphs; one template per job | `1:1`: a job becomes source template, target template, entity count, new count | STORE, D1a | S 
PXE-03 | Add extractor wizard, 3 steps. Step 1 target template: only templates with a rich text and a numeric property. `steps/TargetTemplate/*`, `filterPXQualifiedTemplates.ts:3-5` | partial: form with one template select; "Start extraction" no-op (QA) | `1:1` as a `Modal` wizard (`xl`, steps shown as dots) | D1a, PAT | M 
PXE-04 | Step 2 source template: any template except the target and except templates already a source elsewhere. `steps/SourceTemplate/Body.tsx:18-27` | missing | `1:1` | D1a | S 
PXE-05 | Step 3: paragraph text property (rich text), paragraph number property (numeric), target and source relationship types (each excludes the other). `steps/ExtractionConfiguration/Body.tsx:69-142` | missing | `1:1`; relationship types from the single registry (the label typo "Paragrap" is not copied) | D1a, D1b | M 
PXE-06 | Server checks: same source and target relationship type, extractor already exists for the source, wrong property types. 422 English messages. `PXCreateExtractor.ts` | missing | `1:1` as inline step errors | DRAFT | S 
PXE-07 | Empty template lists show nothing; the "No qualified templates" messages exist but are not used. `Dialog.tsx:31` | missing | `improved (Design: shared list pattern, empty state)`: say which property types a target template needs | PAT | S 
PXE-08 | No edit flow: only create and delete. `ParagraphExtraction.tsx` (inventory 2a Save model) | partial: job editor opens, Save toasts | `1:1`: no edit; row opens the entities page | - | S 
PXE-09 | Delete bulk: "Are you sure?", "Only the extractor will be deleted, all created entities will remain on the library.", No, cancel / Delete. `DeleteDialog/index.tsx:45-57` | missing: no delete control (QA) | `improved UX4`: confirm also gives the status rows removed and paragraph entities that stay; selection bar `improved UX2` | STORE, USAGE, PAT | S 
PXE-10 | Empty "NO EXTRACTORS."; success "Paragraph Extractor added", "Extractor/s deleted"; failure "An error occurred". `NoDataCell.tsx:4-8`, `Footer.tsx:35-54` | partial: toasts, generic empty | `improved (Design: shared list pattern)` | NOTIFY | S 
PXE-11 | Phone: not described for Uwazi. | works: only page with a phone layout (QA) | `keep`; reuse as the phone pattern for `improved UX12` | PHONE | S 

### Entities and paragraphs

PXE-12 | Entities table: Entity, Language(s) pills, Paragraphs count, Status pill, "View"; 30 per page; "Showing a-b of N". `PX/PXEntities.tsx:27-158`, `entities/TableElements/columns.tsx:11-42` | partial: per-document table generated, not the job's documents (QA) | `1:1` using real entities of the source template; `improved UX1` adds a title search | DATA | M 
PXE-13 | Status pills: New, Processing, Obsolete, Error, Processed (check). Filters panel by status with counts. `PXEntityStatus.tsx:7-34`, `EntityFilterSidepanel.tsx:48-110` | partial: Done, Queued, Skipped; filter exists; "Processing" pill fails contrast (QA) | `1:1` vocabulary; fix pill colours | DATA | S 
PXE-14 | "Extract new paragraphs" (all `new` entities, not only the loaded page) with an "N New" pill; with rows selected "Extract paragraphs". `PXEntities.tsx:40-70,120-153` | no-op: Run extraction and per-row re-run only toast (QA) | `1:1` with a mock task; status moves New to Processing to Processed. Count across all pages (Uwazi counts only the loaded page) | NOTIFY, DATA | M 
PXE-15 | Confirm before re-extract: "All of the previously created paragraphs will be deleted and recreated after the process." No, cancel / Continue. `ExtractEntitiesDialog/index.tsx:72-83` | missing | `1:1` | PAT | S 
PXE-16 | Status re-read every 25 s; only row statuses patched in place. Errors from the call can still show a success toast. `PXEntities.tsx:25,93-101` | missing | `1:1` with a mock timer; toast on success only (Uwazi bug not copied); an Error row offers Retry | NOTIFY | S 
PXE-17 | Paragraphs page, read only: grouped rows (main language row, sub-rows for other languages), Paragraph #, Language, Text cut at 200 characters. `PX/PXParagraphs.tsx:14-70`, `paragraphs/Table.tsx:51-67` | missing: job editor shows snippets per document, no paragraph page | `1:1` with seeded paragraphs for two or three entities | DATA | M 
PXE-18 | "View" slide panel: entity and template pill, language, document name, paragraph number, text, "View entity". `ViewParagraph.tsx:24-47` | missing | `1:1` as a slide-over | PAT | S 
PXE-19 | "Open PDF" panel shows the main-language PDF. `PDFSidepanel.tsx:14-45` | missing | `defer`: reuse `DocumentViewer` once paragraph seeds exist | DATA | M 
PXE-20 | Paragraphs become entities of the target template, linked to the source with the two chosen relationship types. `PXCreateParagraphsBatch.ts:111-124` | missing | `defer`: mock shows the paragraph table only; creating entities and references is out of scope for the demo | DATA | L 
| No paragraph delete: dialog exists but is unused and its API is a stub. `DeleteDialog` (inventory 2b) | missing | `drop`: not in Uwazi | - | - |

Prototype-only (not in Uwazi)

| Control or element | Keep or drop | Why |
| Segmentation select (By paragraph, By page, By heading) | drop | Uwazi segmentation is done by an external service, not a setting here |
| Min characters field | drop | Not in Uwazi |
| "Run extraction" in the body and "Re-run" in the footer for one action | drop | Duplicate (Design); replaced by "Extract paragraphs" |
| Per-row re-run on the document table | drop | Replaced by row selection plus "Extract paragraphs" |
| Job stats strip (documents, paragraphs) | keep (proto-only) | Derived from entity and paragraph counts; Uwazi shows counts in the table and filter panel |
| "Last run" (hardcoded) | drop | Not in Uwazi; fake data (Design) |


## New Relationships Migration

| One-off admin tool to convert V1 connection hubs to V2 relationships: plan table, "Dry Run", "Migrate" (deletes all V2 relationships first), "Test One Hub". Legacy markup, untranslated. Rail link needs `newRelationships`. `relV2MigrationDashboard.tsx:98-515`, `SettingsNavigation.tsx:102-109` | missing: no page and no rail item | `drop`. The prototype already stores V2-shaped references (`data/references.ts`), so there is nothing to migrate. Keep only the gated rail entry in the nav table below, off by default, if a demo of flag gating needs it | - | - |

Prototype-only (not in Uwazi): none.


## Feature toggles and nav gating

Uwazi has no UI for feature flags. They are set in the settings document, by tenant CLI, or by env (`settingsType.ts:101-140`, `featureFlags.ts:7-29`). Rail source: `S/SettingsNavigation.tsx:21-137`. Uwazi groups: Settings, Metadata, Tools. Prototype today (own check of `atoms/settings.ts` and `components/settings/*`; QA and Review say nothing on roles): groups User, System, Tools (with a "ML tools" subgroup), one group shown at a time, no role field and no flag field on any item, so every item is always visible. Roles exist only on seed users.

NAV-01 | Role model: admin, editor, collaborator. Client guard redirects to `/login`; server answers 401. Only Account is open to all; editor adds Metadata and Paragraph extraction. `ProtectedRoute.tsx:6-34`, `authMiddleware.ts:14-24` | missing: no role gating in nav or pages | `1:1` simplified: a current-role value from the signed-in user, a `roles` list per item, hidden items not rendered. A blocked section shows "This page is not available." instead of a login redirect | STORE, D1d | M 
NAV-02 | Account (Settings group): any signed-in role, no flag. `Routes.tsx:324-325` | works: User group; shown to everyone | `1:1`; a collaborator sees only this item | STORE | S 
NAV-03 | Dashboard, Users & Groups, Collection, Menu, Pages (Settings group): admin only, no flag. Collection's `themeCustomization` flag changes page controls, not the nav. `SettingsNavigation.tsx:30-38` | partial: all shown, no gating | `1:1` admin only | STORE | S 
| Data visualizations (Settings group): admin only, no flag. `SettingsNavigation.tsx:38` | missing: no rail item, no page | `defer`: not part of the pages in this table; decide with whoever owns the Dataviz row | - | - |
NAV-04 | Languages, Translations, Filters (Settings group): admin only, no flag. `SettingsNavigation.tsx:30-43` | partial: shown to all | `1:1` admin only | STORE | S 
NAV-05 | Templates, Thesauri, Relationship types (Metadata group): admin only, no flag. `SettingsNavigation.tsx:53-62` | partial: in System, shown to all | `1:1` admin only; group with the extraction items (see grouping row) | STORE | S 
NAV-06 | Metadata Extraction (Metadata group): route admin+editor; rail link behind `metadata-extraction` plus admin+editor; the route and the API check a different key (`metadataExtraction.url`). `SettingsNavigation.tsx:65-73`, `Routes.tsx:394-404` | missing: always shown, under Tools ▸ ML tools | `1:1` gate on one key (not two). Editors see it. Uwazi likely hides it from editors because `features` is sent to admins only (assumed from code, VERIFIED path, not run); not copied | STORE, D1d | S 
NAV-07 | Paragraph Extraction (Metadata group): admin+editor; rail link behind tenant flag `paragraphExtraction`; API 403 without it. `SettingsNavigation.tsx:74-81`, `PXRoutes.ts:15-62` | missing: always shown | `1:1` gate | STORE, D1d | S 
NAV-08 | Preserve (Tools): admin only; rail link behind `preserve.host`; the route itself has no flag check. `SettingsNavigation.tsx:92-101`, `Routes.tsx:346` | missing: always shown | `1:1` rail gate; also gate the page (Uwazi's URL stays open) | STORE, D1d | S 
NAV-09 | New Relationships Migration (Tools): rail link admin plus `newRelationships`; route has only the flag check and shows an error page when off. `SettingsNavigation.tsx:102-109`, `Routes.tsx:502-507` | missing: no item, no page | `drop` the page (see section above). If a flag demo needs it, a disabled-by-default item opening the unavailable page | D1d | S 
NAV-10 | Activity log, Uploads, Import CSV (Tools): admin only, no flag. `SettingsNavigation.tsx:110-126` | partial: shown to all; Import CSV opens its own view | `1:1` admin only | STORE | S 
NAV-11 | Global CSS (Tools): label is "Global CSS & JS" only when `allowcustomJS` is on, else "Global CSS". `SettingsNavigation.tsx:111-120`, `Customization.tsx:59` | partial: label fixed "Global CSS & JS"; no such flag on Collection (QA) | `improved (Design: Navigation, one name for this page)`: keep "Global CSS & JS" and show the JS tab only when the flag is on; flag moves into the Collection page | D1d | S 
NAV-12 | Uwazi Docs (Tools): external link, any role, new tab. | works: "Documentation" pinned at the rail bottom, external icon | `1:1` (check the link target: prototype points to a uwazi.io support page, Uwazi to `docs.uwazi.io`; Juan to confirm) | - | S 
NAV-13 | Group headings are shown to every signed-in user; an editor or collaborator sees "Tools" with only Docs under it. `SettingsNavigation.tsx:84-136` | partial: groups always full | Not copied: hide a group heading when it has no visible item | STORE | S 
NAV-14 | `FeatureToggle` reads dotted paths in `settings.features`; missing means off; an object value counts as on. Two keys for one feature exist (`metadata-extraction`, `metadataExtraction`). `FeatureToggle.tsx:6-18` | missing | `1:1` for the dotted-path check, one boolean per feature; do not copy the duplicate key | D1d | S 
NAV-15 | Features can only be set in the DB, CLI or env, with no settings page. `settingsType.ts:101-140` | missing | `keep (proto-only)` a dev panel in the component catalog to flip each flag and the current role, default all on | D1d | S 
NAV-16 | Rail grouping. Design improvement 10: five groups (Collection, Content model, Languages, People, Tools), all visible in the rail; Figma's ToolsSidebar groups Metadata apart from Tools. UX audit, Navigation | partial: three groups (User, System, Tools); System is a flat list of 11 | `improved UX10`. Put Metadata extraction and Paragraph extraction in Content model next to Templates (Uwazi's Metadata group) and drop the "ML tools" subgroup | - | M 
NAV-17 | Rail scoping (Design finding): the prototype shows only the group you entered through, so Account sits alone in a 250px rail and Users to Uploads needs the navbar Tools menu. Uwazi shows all items in one rail. | partial: one group at a time (Design) | `improved (Design: Navigation, show every group)`. Juan has not decided; recommended yes, together with UX10 | - | S 
NAV-18 | Phone: below `md` the rail is the page and each child shows a back chevron. `Settings.tsx:11-27`, `SettingsContent.tsx:57-86` | works: rail-first drill-in, chevron in header (Design, QA) | `1:1` | PHONE | S 
NAV-19 | A page the user may not open: Uwazi redirects to `/login`, or shows `GeneralError` for `newRelationships`. `ProtectedRoute.tsx:6-34`, `Routes.tsx:502-507` | partial: `PlaceholderPage` with "part of the cloning roadmap" copy (Design) | `improved (Design: Placeholder page)`: "This page is not available." with a link to the first allowed item | PAT | S 

Prototype-only (not in Uwazi)

| Control or element | Keep or drop | Why |
| "User", "System", "Tools" group labels and three navbar entry points (account menu, Settings, Tools dropdown) | drop | Replaced by `improved UX10` and one Settings entry; Uwazi has one rail |
| "ML tools" subgroup under Tools | drop | Moves to Content model with Templates under D10 |
| Active item `bg-vellum` + semibold | defer | CLAUDE.md says active = `bg-warm text-ink`; Juan to decide (Design question) |
| Import CSV rail item that opens its own view and shares the rail | keep (proto-only) | The Import view reuses the same rail; one list of tools to maintain |
| Rail `badge` support | drop | No item uses it |
| Dev panel for flags and current role (target row above) | keep (proto-only) | Lets a demo show editor and flag-off views without a backend |


