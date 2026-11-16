## Account

Note: in Uwazi, Account has no API keys and no way for a user to turn 2FA off. The prototype has both (see Prototype-only).

| Uwazi behaviour (short, with inventory-cited repo file) | Prototype today | Target in prototype | Depends on | Size |
|---|---|---|---|---|
| Username shown read-only (disabled input). `Account.tsx:75-80` | partial: editable, but no Save exists (B2) | `1:1` read-only; editing identity is an admin task in Users | D1d | S |
| User Role shown read-only, raw string, not translated. `Account.tsx:83-89` | missing: no role field | `1:1` read-only; translate the role label (Uwazi shows raw `admin`) | D1d | S |
| Email editable; required; error "A valid email is required" for empty or bad format. `Account.tsx:91-106` | partial: editable, no Save, no validation (QA) | `1:1` with the same message | D1d, DRAFT | S |
| New password plus Confirm; mismatch error "Passwords do not match"; blank password is dropped; no strength rule. `Account.tsx:113-133` | partial: mismatch message works, own Update button, fields clear (QA) | `1:1` fields and message, no strength rule (none in Uwazi); folded into the single page save | DRAFT | S |
| One footer "Update", disabled until dirty; probably stays enabled after save (assumed). `Account.tsx:61-229` | no-op: Profile has no footer; password Update is a mid-page green button (B2) | `improved (Design: form page, one save in footer, Discard, commit resets after save)` | DRAFT, PAT | S |
| Update opens a confirm modal asking the current password; Accept disabled until non-empty; server checks bcrypt. `Account.tsx:211-227` | missing: no current-password check (QA) | `1:1` as a `Modal`; mock check (accepts any non-empty, no real auth) | PAT | S |
| Success "Account updated", then password fields reset; errors "An error occurred" with server detail. `Account.tsx:61-229` | partial: toast only, nothing stored (B2) | `1:1` through notify; add a failure path (Design: no page simulates failure) | NOTIFY | S |
| 2FA card: "Enable" opens a panel with QR, secret key, 6-digit token field, Enable. `TwoFactorSetup.tsx:127-155` | partial: inline code field, Verify, grey "QR" box (QA) | `1:1` in a `Modal` with a mock secret and a drawn QR placeholder | PAT, DATA | M |
| Wrong token shows "The token does not validate against the secret key!". No digit mask in Uwazi. `TwoFactorSetup.tsx:139-155` | partial: input sanitised to 6 digits, no error path | `1:1` message against a mock secret; keep the digit sanitiser (better than Uwazi) | - | S |
| Secret key shown in a copy input with a "keep this secret" line. `TwoFactorSetup.tsx:127-138` | missing: no secret to copy; the existing Copy key button is a no-op (QA) | `1:1` with real clipboard write | - | S |
| After enabling, card shows "Activated" (disabled button); users cannot disable 2FA, only an admin can (Reset 2FA). `Account.tsx:61-229` | partial: badge works, Disable has no confirm and is not in Uwazi (QA) | `1:1` (no self-disable); admin reset in Users clears the flag the badge reads | STORE, D1d | S |
| Footer "Logout" link (red outline) on Account. `Account.tsx:61-229` | missing: not covered by QA | `1:1`; sign-out returns to the login view | - | S |
| Dirty guard: none on Account in Uwazi. `Account.tsx:61-229` | no-op: none (B1) | `improved (Design: form page, dirty guard registered on every form page)` | DRAFT | S |
| Page visible to any logged-in role; server allows self-edit only. `Account.tsx:15-232` | missing: not covered by QA | `defer`: no role-aware rail yet; do with the rail/role dispatch | - | S |
| Field width: form fills the pane (Design: "Current password" spans 1,158px). `Account.tsx:61-229` | works: single column, phone fits | `improved (Design: form page, fields capped near 40rem)` | PAT | S |
| Loader error goes to the route error boundary; loading uses the global loader. `createAccountLoader.ts:12-19` | missing | `defer`: no backend, nothing can fail on load | - | S |

Prototype-only (not in Uwazi):

| Control | Keep or drop | Why |
|---|---|---|
| API keys (Generate, Copy, Revoke, masked key) | keep (proto-only) pending Juan | Uwazi has no per-user keys. If kept: show the full key once with a "you won't see this again" line, ConfirmDialog on Revoke, real clipboard copy (Design) |
| Disable 2FA button | drop | Uwazi lets only an admin reset 2FA; self-disable also had no confirm |
| Inline "Update password" green button | drop | Replaced by the single footer save |
| Editable Username | drop | Uwazi shows it read-only |

## Users & Groups

Note: Uwazi edits users and groups in a sidepanel over the table. The prototype opens a full editor page; keep it (shared Settings editor pattern, Design pattern 3).

| Uwazi behaviour (short, with inventory-cited repo file) | Prototype today | Target in prototype | Depends on | Size |
|---|---|---|---|---|
| Tabs Users and Groups; switching clears selections. `Users.tsx:118-162` | works: tabs with counts | `1:1`; counts derived from the store (not stored `memberCount`, M6) | STORE | S |
| Users table: Username (locked row red with lock icon), Protection pill, Role pill, Group pills, sortable. `TableComponents.tsx:99-127` | partial: columns from seed; no locked state; Admin pill is seal tint (Design) | `1:1`; Admin pill in ink or vellum (seal is danger only); lock state needs a seeded locked user | STORE, DATA | M |
| No search or filter in Uwazi; table sort only. `Users.tsx:118-162` | missing | `improved UX1` search, plus role and group filters; status and last login need new seed data | STORE, DATA | M |
| Add user opens form: Username (3-50, no spaces, unique), Role, Email (unique), Password, Groups. `UserFormSidepanel.tsx:229-358` | no-op: "Invite user" toasts, user not listed (B2) | `1:1` fields and validation messages; commit "Add" (Design verbs); user appears in list | STORE, DRAFT | M |
| Blank password on create: server generates one and emails a welcome mail; blank on edit leaves it unchanged. `UserFormSidepanel.tsx:288-302` | missing: no password field | `1:1` as a mock (notify "welcome email sent"); Design adds "invited or active" status and resend, not in Uwazi | NOTIFY, DATA | S |
| Role select with "?" help opening a Permissions matrix modal (3 roles x 15 actions, hard-coded copy). `PermissionsListModal.tsx:24-130` | partial: role radios work as form state; no matrix (QA) | `1:1` matrix in a `Modal` `lg`; keep as static copy | PAT | S |
| Groups multi-select (placeholder "Nothing selected"); admin only. `UserFormSidepanel.tsx:347-358` | partial: bordered checkbox cards; state works, Save discards (QA) | `improved (Design: Users page, groups as a searchable multi-select, cards do not scale to 30 groups)`; membership by id (H1) | STORE | M |
| Saving a user needs the admin's current password in a modal. `Users.tsx:254-274` | missing | `1:1` mock modal (any non-empty accepted); Juan to confirm worth the friction in a prototype | PAT | S |
| Edit: "Reset Password" (no confirm) emails a 24h link; "Reset 2FA" and "Unlock account" via password modal. `UserFormSidepanel.tsx:157-191` | no-op: Reset 2FA toasts, list unchanged (QA); others absent | `1:1`: Reset 2FA clears the flag the list and Account read; add confirm to Reset Password (Design: destructive confirms) | STORE, NOTIFY, DATA | M |
| Bulk footer when users selected: Reset Password, Reset 2FA (danger modal lists names), Delete. `Users.tsx:254-274` | missing: no selection (QA) | `improved UX2` selection action bar with count slot; add "Add to group" and "Change role" (Design) | STORE, PAT | M |
| Delete users: danger modal with names and password; server blocks self, last admin, system user. `DeleteUsers.ts:23-56` | partial: single delete via ConfirmDialog works in list only; self and last admin deletable (H2) | `improved UX4` guarded delete: block self and last admin on the client (Uwazi only fails on the server), show group memberships removed | STORE, USAGE | M |
| Client duplicate checks are stricter than the server (case-insensitive; username vs email). `UserFormSidepanel.tsx:43-85` | missing | `1:1` client rule, case-insensitive username and email uniqueness | STORE | S |
| Groups table: Name (sortable), Members as username pills. `TableComponents.tsx:129-147` | partial: count "1 members" not pluralised; reads seeds (M6) | `1:1` with member pills, correct plural | STORE | S |
| Group form: Name (3-50, unique case-insensitive), Members multi-select; no password needed. `GroupFormSidepanel.tsx:118-157` | no-op: Create toasts, not listed; membership state works (QA) | `1:1`; member picker gains search and select-all (Design) | STORE, DRAFT | M |
| Delete groups: danger modal, no password; users untouched. `Users.tsx:254-274` | partial: delete works in list; member chips stay on users (H2) | `1:1` plus impact line "N members lose this group" | STORE, USAGE | S |
| Group members stored as user refs; delete user pulls it from all groups. `DeleteUsers.ts:23-56` | partial: membership by group name (H1) | `1:1` ids, derived counts; rename group keeps members | STORE | S |
| Success toasts per action ("Added new user", "Deleted user group", ...); errors "An error occurred". `UserFormSidepanel.tsx:157-191` | partial: toasts only, nothing written (B2) | `1:1` copy via notify, with a failure path | NOTIFY | S |
| Closing the panel or switching tab discards edits silently; no guard in Uwazi. `Users.tsx:118-162` | no-op: silent discard (B1) | `improved (Design: editor pattern, dirty guard on Back, Cancel, rail)` | DRAFT | S |
| Empty table text "NO DATA AVAILABLE". `DefaultNoDataMessage.tsx:4-8` | partial: generic "Nothing here yet." | `improved (Design: list page, EmptyState with create action)` | PAT | S |
| Table is wide; no phone layout in Uwazi (not specified). `TableComponents.tsx:99-127` | partial: 656px table, Groups and actions off screen (QA) | `improved UX12` list rows: name, email, role pill | PHONE | M |
| Row action: "Edit" ghost button per row. `TableComponents.tsx:99-127` | partial: hand-rolled pencil and trash, name announced twice (M3) | `improved (Design: list page, row actions revealed on hover, pencil redundant with row target)` using `RowActions` | PAT | S |

Prototype-only (not in Uwazi):

| Control | Keep or drop | Why |
|---|---|---|
| Full editor page instead of sidepanel | keep (proto-only) | Same pattern as every Settings editor |
| "Invite user" wording | drop | Uwazi creates the account; use "Add user" (Design verbs) |
| Stored `memberCount` field | drop | Derive from membership (M6) |

## Dashboard

Note: Uwazi's Dashboard has four read-only cards and no actions. The prototype swaps two of them and adds a table.

| Uwazi behaviour (short, with inventory-cited repo file) | Prototype today | Target in prototype | Depends on | Size |
|---|---|---|---|---|
| Users card: total, then counts per role (Admins, Editors, Collaborators). `Dashboard.tsx:32-49` | partial: "Users 5" from seed, no role split, does not change after add/delete (QA, B7) | `1:1` derived from the users store, with role split | STORE | S |
| Storage card: files plus database plus search-index size, formatted (e.g. 1.5 GB); caption says "Files and database usage". `Dashboard.tsx:50-60` | missing | `1:1` with a mock figure from seed file sizes; caption says what it sums | DATA | S |
| Entities card: distinct entities; caption "across all languages" (it counts distinct ids). `Dashboard.tsx:61-71` | partial: live `entities.length` (104) but ignores overlay and corpus (B7) | `1:1`; count from the entity overlay and the active corpus | STORE | S |
| Files card: total files (main documents, supporting files, uploads). `Dashboard.tsx:72-82` | missing | `1:1` counting document, files and Uploads atoms | DATA, STORE | S |
| Cards are read-only; no buttons, links or refresh. `Dashboard.tsx:21-88` | works: 2-up cards, 0 interactive controls (QA) | `improved (Design: Dashboard, cards open their page, e.g. Users opens Users)` | - | S |
| Numbers read at navigation, no live update (assumed). `Dashboard.tsx:21-88` | partial: static seeds | `1:1` but derived at render from stores, so it updates after edits | STORE | S |
| Loader ignores errors: failed load shows empty numbers and "0 Bytes". `Dashboard.tsx:16,23-24` | missing: no loading or error state | `improved (Design: loading shows skeleton, not empty or zero)`; do not copy the silent zeros | - | S |
| Admin only (client guard and `GET /api/stats`). `Dashboard.tsx:13-90` | missing: not covered by QA | `defer`: no role model in the rail yet | - | S |
| Layout: 2-column grid, 1 column on small screens, no footer. `Dashboard.tsx:21-88` | works: 2-up on phone, table scrolls without focus (axe `scrollable-region-focusable`) | `1:1` grid; make the table scroller focusable or replace it with rows | PHONE | S |

Prototype-only (not in Uwazi):

| Control | Keep or drop | Why |
|---|---|---|
| Relationships card (sum of fake usage counts) | keep (proto-only) | The prototype is about relationships; derive from `referencesAtom` references, not seed `usageCount` (B5) |
| Languages card | drop | Uwazi has none; the Languages page shows it. Frees the slot for Storage and Files |
| Recent activity table (5 seed rows) | keep (proto-only) | Useful; read from the D4 activity log so it shows what you just did, and link to Activity log. Uwazi has no such table |
| CEJIL activity paragraph about the data source | drop | Prototype plumbing showing in the UI (Design) |

## Collection

Note: Uwazi saves the whole settings document in one POST (can overwrite Languages, Filters set in another tab, assumed impact). The prototype stores per slice and does not copy that.

| Uwazi behaviour (short, with inventory-cited repo file) | Prototype today | Target in prototype | Depends on | Size |
|---|---|---|---|---|
| Collection name, required; used in page title, email sender and 2FA label; error is red styling only. `Collection.tsx:191-196` | partial: editable, toast, reverts, navbar and login ignore it (QA) | `1:1` plus message text; wire to the navbar crumb and login | D1d, DRAFT | M |
| Custom favicon picker (images from Uploads only, square 16 to 512 px, strict); shown when theming is off. `Collection.tsx:198-211` | missing | `1:1` picker `Modal` over the Uploads store; set the document icon; size rule needs image dimensions | D1d, PAT, DATA | M |
| Theme and branding card opens a large panel: presets, accessibility checks, 7 or 13 colours, light and dark logos and favicons; gated by `themeCustomization`. `ThemeSelectionCard.tsx:22-119` | missing | `defer`: tenant-flag feature, new component family, overlaps the prototype's own tokens | PAT | L |
| Default view select: Cards, Map, Table. `Collection.tsx:224-234` | partial: select saves nothing, Library does not read it (QA) | `1:1`; Library opens in this view on load | D1d | S |
| Default date format select, six patterns shown with today's date. `Collection.tsx:235-242` | missing | `1:1`; metadata date display and pickers read it | D1d | M |
| Custom landing page: relative URL; invalid or empty falls back to the library; supports `/page/`, `/entity/`, `/library/`. `Collection.tsx:243-253` | partial: free text, no validation (Design) | `1:1` field with relative-URL validation (Uwazi has none on the form); opening on it `defer` (no router) | D1d | S |
| Public instance toggle; stored inverted as `private`. `Collection.tsx:254-262` | partial: "Private instance" toggle saves nothing; nothing gates on it (QA) | `1:1` label "Public instance", store non-inverted; do not copy the inversion | D1d | S |
| Hide restricted relationships from public. `Collection.tsx:263-273` | missing | `1:1` toggle stored; reading it in the Relationships panel is `defer` (no public view) | D1d | S |
| Show cookie policy toggle; adds a cookie popup and footer link. `Collection.tsx:274-284` | partial: toggle saves nothing; no popup | `1:1` toggle; popup `defer` (no public site) | D1d | S |
| Global JS toggle: enables the JS tab in Global CSS & JS and the nav label. `Collection.tsx:285-291` | missing | `1:1`; the Global CSS & JS page reads it | D1d | S |
| Non-latin characters toggle: one-way, rewrites property names, only a tooltip warns, no confirm dialog. `Collection.tsx:292-304` | missing | `defer`: only meaningful once templates render the schema; then add a confirm Uwazi lacks | SCHEMA, PAT | S |
| Analytics: Google tracking id and Matomo config text fields. `Collection.tsx:307-334` | missing | `1:1` stored fields, no effect | D1d | S |
| Services card: OCR toggle, shown only if the server has an OCR URL. `Collection.tsx:335-349` | missing | `drop`: no OCR service; the card is not shown in Uwazi without one | - | S |
| Forms and email: sender email, contact form email (no format check), public form URL. `Collection.tsx:353-378` | missing | `1:1` fields; add an email-format check Uwazi lacks | D1d | S |
| Public forms: captcha bypass toggle, whitelisted templates multi-select. `Collection.tsx:379-402` | missing | `defer`: the prototype has no public submission form; picker would read D1a templates | D1a | S |
| Map: provider (Mapbox or Google), API key (letters, digits, dot, underscore), layers (cannot be empty). `Collection.tsx:408-446` | missing | `1:1`; show the error text Uwazi does not render (key pattern, "Map layers cannot be empty") | D1d | S |
| Map starting point: click map plus Latitude and Longitude; 0 is treated as unset (bug). `Collection.tsx:447-459` | missing | `1:1` with a map picker; accept 0 (do not copy the bug) | D1d, DATA | M |
| One Save for the page, whole-document POST, no dirty guard, no Discard. `Collection.tsx:132-143` | partial: Save stays enabled after saving (H3) | `improved (Design: form page, ghost Discard plus commit, resets after save, dirty guard)`; per-slice store | DRAFT, D1d, PAT | S |
| Notifications "Settings updated" / "An error occurred"; no field messages. `Collection.tsx:132-143` | partial: toast on Save | `1:1` via notify; error path and field messages added | NOTIFY | S |
| Help "?" tooltip on most settings (long copy for landing page and non-latin). `collectionSettingsTips.tsx:5-195` | missing | `improved (Design: SettingsField description, keyboard-reachable)`; reuse Uwazi copy | PAT | M |
| Cards: General, Analytics, Services, Forms and email, Map; two-column grid. `Collection.tsx:182-472` | partial: one short list, thinner than Uwazi (Design) | `1:1` sections; 40rem form width; single column on phone | PAT, PHONE | S |
| Image upload inside the picker writes immediately, independent of Save. `Collection.tsx:124-129` | missing | `1:1` via the Uploads store (a file added stays even if the form is discarded) | D1d | S |
| Other open sessions get the change over a socket. `Collection.tsx:132-143` | no-op | `drop`: single-user prototype | - | S |

Prototype-only (not in Uwazi):

| Control | Keep or drop | Why |
|---|---|---|
| "Public sharing toggles" (QA does not name them) | check, then drop if no Uwazi counterpart | Map to "Public instance", "Hide restricted relationships" or captcha bypass; extras have no Uwazi equivalent |
| Options order Cards, Table, Map | drop (cosmetic) | Uwazi order is Cards, Map, Table |

## Menu

Note: Uwazi saves the whole menu tree with one page-level Save (edits are local until then) and guards navigation. The prototype edits one item and discards the rest. Target is the Uwazi model: list-level draft, Save in the footer (Juan to confirm).

| Uwazi behaviour (short, with inventory-cited repo file) | Prototype today | Target in prototype | Depends on | Size |
|---|---|---|---|---|
| Table: checkbox, drag handle, Label, URL, Edit; groups expand to show their links as sub-rows. `MenuConfig.tsx:131-173` | partial: flat rows; every group shows the same two sample sub-links (M7) | `improved UX9` tree list (group, then its links) with grip and keyboard reorder, as visitors see the menu | STORE, DRAFT, PAT | L |
| Footer "Add link" and "Add group"; type is fixed by the button, not editable later. `MenuConfig.tsx:52-60` | no-op: "Add link / Add item" toasts; Link/Group switch in editor | `1:1` two buttons, no type switch; verbs per Design ("Add") | STORE, PAT | S |
| Link form: Title required, URL required (no format check), Group select with "No Group". `MenuForm.tsx:204-227` | partial: fields work as form state; Save is a no-op (B2) | `1:1`; show error text under empty Title and URL (Uwazi uses red only) | DRAFT | S |
| Info band "Using URLs": external URL fully formed, internal relative. `MenuForm.tsx:163-192` | missing | `1:1` as the URL field description | PAT | S |
| Group form: Title only; a group has no URL. Server rejects URL on a group and sub-links on a link. `menuItems.ts:30-66` | partial: group editor edits sub-links inline (fake for existing groups) | `1:1` model: items have `parentId` (M7); validation messages for the 4 server rules | STORE | M |
| Sub-link lists inside an item editor do not exist; links choose a parent group. `MenuForm.tsx:220-227` | partial: inline sub-link add, delete, reorder work as form state | `keep (proto-only)` as a second way to edit a group's links; writes the same `parentId` model | STORE | M |
| Footer Delete for selected rows (and group sub-rows); no confirm; local until Save. `MenuConfig.tsx:131-173` | partial: per-row delete with ConfirmDialog works in list only | `improved UX2` selection bar plus Delete; no dialog (local draft), with `improved UX5` undo in the Beacon | DRAFT, NOTIFY, PAT | M |
| "Selected N of M" count; M counts an empty group as 2 (bug). `MenuConfig.tsx:144-146` | missing | `improved UX2` count in a fixed slot; count real rows | PAT | S |
| Drag reorder: links move between top level and groups; a group cannot enter a group; keyboard sensor on. `MenuConfig.tsx:131-173` | partial: sub-link reorder in the editor only; top level cannot be reordered (Design) | `improved UX9` grip plus up/down buttons for links and groups | DRAFT, PAT | M |
| Footer Save, disabled while the tree equals the loaded one; reordering back disables it. `MenuConfig.tsx:62-77` | no-op: Save toasts, list unchanged (B2) | `improved UX11` ink commit in the footer plus "Saved ..." line; dirty compared with stored value | DRAFT, PAT | S |
| Leaving with changes opens "Discard changes?" (Cancel does not reset the blocker, assumed risk). `MenuConfig.tsx:43,99-103` | missing: silent discard (B1) | `1:1` through the shared dirty guard; Cancel keeps the draft | DRAFT | S |
| Save reconciles the "Menu" translation context: renamed titles rename keys, deleted titles drop. `SettingsTranslationService.ts:82-100` | missing: Translations has no link to Menu | `1:1` Menu context derived from the menu store | D1c, STORE | M |
| Public navbar renders the saved links. `MenuConfig.tsx:20-27` | no-op: navbar items are hard-coded (B7) | `1:1` navbar reads the store | D1d | M |
| Server needs unique persistent ids; new items get temporary ids until saved. `MenuConfig.tsx:62-77` | missing | `1:1` stable ids from the collection store (H1 collision fix) | STORE | S |
| Empty table "NO DATA AVAILABLE"; loader error also shows empty. `MenuConfig.tsx:131-173` | partial: generic empty text | `improved (Design: list page, EmptyState offering Add link)`; add an error state | PAT | S |
| Notifications "Updated" after save, "An error occurred" on failure; local state kept. `MenuConfig.tsx:62-77` | partial: toast only | `1:1` via notify with a failure path | NOTIFY | S |
| Table has a 440px minimum and sub-link inputs truncate on phone (QA). `MenuConfig.tsx:131-173` | partial: table scrolls, editor inputs truncate | `improved UX12` list rows with indent for sub-links; editing in a sheet | PHONE | M |

Prototype-only (not in Uwazi):

| Control | Keep or drop | Why |
|---|---|---|
| Link/Group switch inside the editor | drop | Type is fixed by the Add button in Uwazi; two entry points avoid ambiguity |
| `SAMPLE_SUBLINKS` (same two sub-links on every group) | drop | Fake data; sub-links come from the real item model |
| Sub-link editing inside the group editor | keep (proto-only) | Easier on phone and keyboard; same data model |
| "Label" vs "Title" vs "Add item" vs "Add link" naming | drop | Use Uwazi's "Title" and "Add link" / "Add group" (Design) |
