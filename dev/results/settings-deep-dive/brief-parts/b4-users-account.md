# Brief part b4: Users & Groups, Account

Source: huridocs/uwazi `production` v1.229.224 at `/Users/juanmnl/Developer/huridocs/uwazi-ref`. All strings and rules were read in code unless marked (unverified). Nothing was run.

Citation aliases (all repo-relative): `R/` = `app/react/V2/Routes/Settings/`, `C/` = `app/react/V2/Components/`, `API/` = `app/api/core/`, `en.csv` = `contents/ui-translations/en.csv`.
UX numbers = the "Improvements beyond 1:1 parity" list in settings-ux-audit.md: UX1 search, UX2 bulk selection bar, UX3 CSV, UX4 impact before delete, UX5 undo in Beacon, UX6 tree editor, UX7 card link, UX8 untranslated filter, UX9 keyboard reorder, UX10 grouped rail, UX11 last-saved line, UX12 phone list rows. "Design pattern" = settings-ux-audit.md shared patterns 1 to 3. Gap rows are named by their first words in gap-matrix.md.

Shared mechanics used by both pages:
- Header title is a breadcrumb with one item (no path): `R/Users/Users.tsx:115`, `R/Account/Account.tsx:64`; rendered by `C/Layouts/SettingsContent.tsx:57-86`. On phones a back chevron (sr-only `Navigate back`, en.csv:782) goes to `/settings` (`SettingsContent.tsx:62-67`).
- Footer is sticky, `px-4 py-3`, top border (`SettingsContent.tsx:95-113`). Body has `px-4`.
- Nav: Account link for every logged-in user; Users & Groups only for `admin` (`R/SettingsNavigation.tsx:30,34`). Route guards: see Users section item 1.
- Notifications go to the Beacon list via `notify(type, title, message?, details?)` (`app/react/V2/atoms/requestStatusAtom.ts:144-154`). Success = title only. Error = title `An error occurred` + detail.
- Every failed `apiClient` request also raises its own notification `An error occurred` + detail (except status 401/404) and 409 raises a warning titled with the error code (`app/react/V2/api/policies.ts:39-72`, wired at `app/react/V2/api/client.ts:6-10`). Both pages also call `notify` themselves, so one failure yields two entries (code-read, not run).
- Error detail text = `body.prettyMessage ?? body.message ?? body.error ?? statusText` (`app/shared/apiClient/normalizeError.ts:91`). 401 from any request does `window.location.assign('/login')` (`policies.ts:74-83`).
- Server status map: DomainError 400 (`app/api/utils/handleError.js:142-144`), Zod 422 (`:120-127`), UnauthorizedError 401 (`:150-152`), `needsAuthorization` failure 401 `{error:'Unauthorized', message:'Unauthorized'}` (`app/api/auth/authMiddleware.ts:18-19`).
- Password re-entry: the client sends the typed password as `Authorization: Basic base64(password)` (`app/react/V2/api/users/index.ts:20-31`). Middleware returns 403 `{ error: 'Password error', message: 'Forbidden' }` when missing or wrong (`API/infrastructure/express/users/ValidatePasswordMiddleWare.ts:18-32`); the compared account is the logged-in user (`ValidateCurrentPassword.ts:7-18`). The notification detail is `Forbidden`.
- Form styling classes in this repo are the old Uwazi theme; rebuild with prototype tokens. Only structure, copy and rules matter.

---

### Users & Groups

**1. Screen map**

Route `/settings/users`. Admin only: client `adminsOnlyRoute` (`app/react/Routes.tsx:341-345`), rail link hidden for others (`R/SettingsNavigation.tsx:34`); server list below. Non-admin on the route: redirect to `/login` (`app/react/ProtectedRoute.tsx:6-34`).

Top to bottom:
1. Header: breadcrumb title `Users & Groups` (`R/Users/Users.tsx:115`, en.csv:1484).
2. Tab strip (2/3 width on md+, full width on phones, `Users.tsx:120`): tab 1 `Users` (default active, `Users.tsx:34,129`, en.csv:1483), tab 2 `Groups` (`Users.tsx:146`, en.csv:568). Inactive tab is unmounted (`C/UI/Tabs/Tabs.tsx:29` default `unmountTabs = true`). Switching tab clears both selections and the sidepanel record (`Users.tsx:122-127`).
3. Table card with its own header row showing the tab name: `Users` or `Groups`, `text-base font-semibold` (`Users.tsx:133-137,150-154`). Rows have a leading checkbox column (`enableSelections`, `Users.tsx:138,155`). Header cells render uppercase through CSS (`C/UI/Table/Table.tsx:302` `uppercase`), so on screen: `USERNAME`, `PROTECTION`, `ROLE`, `GROUP`, and `NAME`, `MEMBERS`. Header checkbox has sr-only `Select all` (en.csv:1149); row checkbox sr-only `Select` (en.csv:1144) (`C/UI/Table/RowSelectComponents.tsx:36,69`).
4. Sticky footer (see item 3 for the exact states).
5. Overlay sidepanel (user or group form, item 4 of this section's fields) and modals.

Users table columns, in order (`R/Users/components/TableComponents.tsx:99-127`):

| # | Header (verbatim) | Sortable | Cell | Cite |
|---|---|---|---|---|
| 1 | checkbox (sr-only `Select all`) | no | row selection | `Table.tsx:131-138` |
| 2 | `Username` (width 1/3) | yes, default sort ascending (`Users.tsx:142`) | username text; when `accountLocked`: text in error colour plus a lock icon with tooltip `Account locked` (en.csv:24) | `TableComponents.tsx:13,69-81,100-104` |
| 3 | `Protection` (en.csv:1009) | yes | green pill `Password + 2fa` (en.csv:934) when `using2fa`, else gray pill `Password` (en.csv:933) | `TableComponents.tsx:15,21-34,105-109` |
| 4 | `Role` (en.csv:1096) | yes | pill, `admin` = primary colour, others gray; text is the raw lowercase role value passed through `Translate`: `admin`, `editor`, `collaborator` (lowercase `admin` and `collaborator` have no en.csv entry, `editor` en.csv:447) | `TableComponents.tsx:16,36-45,110-114` |
| 5 | `Group` (singular, en.csv:561; width 2/3) | yes by default (array value; sort order (unverified)) | gray pills, one per group name | `TableComponents.tsx:17,57-67,115-119` |
| 6 | sr-only `Action` (en.csv:29) | no | ghost button `Edit` (en.csv:435), opens the sidepanel for that row | `TableComponents.tsx:19,83-97,120-126` |

There is no Email column and no search box.

Groups table columns (`TableComponents.tsx:129-147`): checkbox; `Name` (en.csv:773; width 1/4; sortable; default ascending, `Users.tsx:159`); `Members` (en.csv:743; width 3/4; not sortable; gray pill per member username); sr-only `Action` with ghost `Edit`.

User sidepanel (`R/Users/components/UserFormSidepanel.tsx`). Right-docked overlay with a dimmed backdrop, 500px wide on md+, full width on phones (`C/UI/Sidepanel.tsx:71,209-255`). Header: title `New user` (en.csv:798) or `Edit user` (en.csv:444) (`UserFormSidepanel.tsx:218`), close X (sr-only `Close`, en.csv:220). Body, top to bottom:
1. Card `General Information` (en.csv:553): `Username`, `User Role` (select plus "?" help button), `Email`.
2. Card `Security` (en.csv:1143): `Password`; then a row of buttons: `Reset Password`, `Reset 2FA` (edit mode only), `Unlock account` (only when the user is locked). On md+ the buttons sit in one row; on phones they stack (`:304`).
3. Groups block (no card title; a header bar with label `Groups`, en.csv:568, and a plus-circle button with sr-only `Select`, en.csv:1144, that opens a popover of checkboxes, one per group name; chosen groups appear below as gray pills each with an X, sr-only `Remove`, en.csv:1066; when empty it shows `Nothing selected`, en.csv:873) (`:346-359`, `C/Forms/MultiSelect.tsx:99-196`). The plus button is disabled when there are no groups (`MultiSelect.tsx:116`).
4. Footer: `Cancel` (secondary, en.csv:171) and `Save` (primary, en.csv:1105), equal width (`:362-381`).

Group sidepanel (`R/Users/components/GroupFormSidepanel.tsx`), same shell: title `New group` (en.csv:789) / `Edit group` (en.csv:440) (`:113`). Body: card `Group Options` (en.csv:564) with `Name`; then a block with header bar `Members` (en.csv:743) using the same multi-select (options = all users by username, no search), placeholder `Nothing selected` (`:117-157`). Footer: `Cancel`, `Save` (`:160-169`).

Permissions modal (opened by the "?" next to `User Role`, `UserFormSidepanel.tsx:253-256,385`): `Modal` size `xxxl` (max-w-3xl) (`R/Users/components/PermissionsListModal.tsx:195`). Header: title `Permissions` (en.csv:950) and a close X (aria-label `Close modal`, `C/UI/Modal.tsx:105-109`) (`:196-199`). Body: a table, no checkbox column, no sorting (`:201`). Footer: one full-width ghost button `Close` (en.csv:220) (`:203-207`).

Columns (`PermissionsListModal.tsx:132-135,166-191`): `User Action` (en.csv:1474, 2/5 width), `Collaborator` (en.csv:222), `Editor` (en.csv:446), `Admin` (en.csv:90) (1/5 each). Cell icons: full = green check; partial = user-plus icon (amber) with tooltip `Permission on entities explicitly shared with the user` (en.csv:949); none = red X (`:137-159`). Rows (`:24-130`):

| Action (verbatim) | Collaborator | Editor | Admin |
|---|---|---|---|
| `Create new entities and upload documents` | full | full | full |
| `Create table of contents` | full | full | full |
| `View entities` | partial | full | full |
| `Edit metadata of entities` | partial | full | full |
| `Delete entities and documents` | partial | full | full |
| `Share edit access with other users` | partial | full | full |
| `Create relationships and references` | partial | full | full |
| `Share entities with the public` | none | full | full |
| `Manage site settings and configuration` | none | none | full |
| `Add/delete users and assign roles` | none | none | full |
| `Configure filters` | none | none | full |
| `Add/edit translations` | none | none | full |
| `Configure templates ` (code string has a trailing space, `:110`; the key without the space is en.csv:240) | none | none | full |
| `Create and edit thesauri` | none | none | full |
| `Create relationship types` | none | none | full |

The matrix is hard-coded copy, not derived from server rules. Role descriptions beyond this matrix: none found.

**2. Fields**

User form (`UserFormSidepanel.tsx`). Form mode is react-hook-form default (`onSubmit`); errors appear only after `Save` is clicked (`trigger()`, `:370-376`) and re-validate on change afterwards (default RHF behaviour (unverified at runtime)). Error strings are rendered under the field by `InputField` `errorMessage` (the field also takes the error style, `C/Forms/InputField.tsx:107`). Per-field error text is chosen by rule type in `getFieldError` (`:57-92`). RHF reports the first failing rule in this order: `required`, `maxLength`/`minLength`, then `validate` entries in declaration order.

| Label | Control | Placeholder | Help / tooltip | Default | Validation and error (client) | Server (zod/domain) | Required | Cite |
|---|---|---|---|---|---|---|---|---|
| `Username` (en.csv:1477) | text input, `autoComplete="new-username"`, id `username` | none | none | `""` (new) / row value (edit) | `required` -> `Username is required` (en.csv:1478); `minLength 3` -> `Username is too short` (en.csv:1480); `maxLength 50` -> `Username is too long` (en.csv:1479); `isUnique` -> `Duplicated username` (en.csv:430); `noSpaces` (`/\s/`) -> `Usernames cannot have spaces` (en.csv:1482) | trimmed, min 1, no space character -> `Usernames can not contain spaces.`; empty -> zod default (unverified exact text); no max; unique, exact and case-sensitive -> `The username "{username}" already exists` | yes | `:229-246`; `API/domain/user/User.ts:37-42`; `API/domain/user/errors.ts:6-10`; `API/infrastructure/mongodb/user/MongoUsersDataSource.ts:42-50` |
| `User Role` (en.csv:1475) with a help button (sr-only `Permission`, en.csv:947; icon "?") | `<select>`, id `roles`, no placeholder option | none | the "?" opens the Permissions modal | `collaborator` (new) / row value | none | enum `admin|editor|collaborator`; own role cannot change: `Cannot change own role`; demoting the last admin: `Cannot remove the last remaining admin` | yes (always has a value) | `:29-41,110-119,249-263`; `API/application/UpdateUser.ts:50-52,57-62`; `API/domain/user/errors.ts:37-41` |
| Role options, in order | `Admin` (en.csv:90, value `admin`), `Editor` (en.csv:446, value `editor`), `Collaborator` (en.csv:222, value `collaborator`) | - | no per-option description in the select; descriptions only in the matrix | - | - | - | - | `:29-41` |
| `Email` (en.csv:449) | `type="email"`, `autoComplete="new-email"`, id `email` | none | none | `""` / row value | `required` -> `A valid email is required` (en.csv:16); `validEmailFormat` `/^[^\s@]+@[^\s@]+\.[^\s@]+$/` -> `A valid email is required`; `maxLength 256` has no case in `getFieldError`, so no message shows for it (defect, item 11); `isUnique` -> `Duplicated email` (en.csv:428) | `z.string().email()` (zod default text (unverified)); unique, exact -> `The email "{email}" already exists` | yes | `:265-283`; `app/react/V2/shared/formatHelpers.ts:53`; `API/domain/user/User.ts:44`; `API/domain/user/errors.ts:12-16` |
| `Password` (en.csv:933) | `type="password"`, `autoComplete="new-password"`, id `password` | none | none | `""` | `maxLength 50` -> `Password is too long` (en.csv:936; shown for any password error) | create: blank = random 64-hex password generated, welcome email sent; edit: blank = unchanged (blank is deleted before sending, `app/react/V2/api/users/index.ts:11-13`); non-blank must be non-empty string (`z.string().min(1).optional()`); no minimum length or strength rule anywhere | no | `:288-302`; `API/application/CreateUser.ts:17-21`; `API/application/UpdateUser.ts:23`; `API/domain/user/EncryptedPassword.ts:17-19` |
| `Groups` (en.csv:568) | multi-select of group names (stored as `{_id, name}`) | `Nothing selected` (en.csv:873) | none | none (new) / row groups (edit) | none | assignment applied only if the actor is admin; replaces all memberships: adds to listed groups, removes from all others; omitted `groups` = untouched | no | `:346-359`; `API/application/UpdateUser.ts:76`; `API/infrastructure/mongodb/user/MongoUserGroupsDataSource.ts:15-34` |

Group form (`GroupFormSidepanel.tsx`):

| Label | Control | Placeholder | Help | Default | Validation and error (client) | Server | Required | Cite |
|---|---|---|---|---|---|---|---|---|
| `Name` (en.csv:773) | text, id `name`, `autoComplete="off"` | none | none | `""` / row name | `required` -> `Name is required` (en.csv:774); `minLength 3` -> `Name is too short` (en.csv:776); `maxLength 50` -> `Name is too long` (en.csv:775); unique among loaded groups, case-insensitive, trimmed (`validate`) -> `Duplicated name` (en.csv:429) | name trimmed; no min/max; unique case-insensitive via regex built from the raw name -> `The group name "{name}" already exists` | yes | `:21-41,120-133`; `API/domain/userGroup/errors.ts:4-8`; `API/infrastructure/mongodb/user/MongoUserGroupsDataSource.ts:84-99` |
| `Members` (en.csv:743) | multi-select of users (label = username, value = user id) | `Nothing selected` | none | none / row members | none | duplicate ids rejected: `Duplicate member ids: {ids}` | no | `:136-157`; `API/domain/userGroup/errors.ts:10-14` |

Role-based visibility of fields: none; the whole page is admin only.

**3. Row actions and bulk actions**

Row actions:
- `Edit` (ghost, every row, both tabs): opens the sidepanel with that row (`TableComponents.tsx:83-97`, `Users.tsx:48-56`). Always enabled.
- No per-row Delete, Reset or Unlock in the table; those are in the sidepanel or the footer.

Sidepanel actions, user in edit mode (`UserFormSidepanel.tsx:305-342`):
- `Reset Password` (en.csv:1085, ghost): enabled in edit mode only (`selectedUser._id`). Sends a recovery email immediately to the stored email of that user: no confirmation, no password. Panel stays open. Success notification `Instructions to reset the password were sent to the user` (en.csv:631).
- `Reset 2FA` (en.csv:1082, ghost): edit mode only. Opens the password modal (item 4). On accept: disables 2FA for the user, success `Disabled 2FA` (en.csv:394), revalidates, closes the panel. Enabled even when the user does not use 2FA.
- `Unlock account` (en.csv:1430, `dangerSecondary` red outline): shown only when `selectedUser.accountLocked`. Opens the password modal. On accept: clears the lock, success `Account unlocked successfully` (en.csv:25), revalidates, closes the panel.
- `Save`, `Cancel`: item 6.
- Group panel: `Save`, `Cancel`.

Footer bulk actions (`Users.tsx:165-231`, one container `flex gap-2`). The footer shows exactly one of these sets:

| Selection state | Buttons, left to right |
|---|---|
| Nothing selected (either tab) | `Add user` (en.csv:75) on the Users tab / `Add group` (en.csv:54) on the Groups tab (primary). Click clears the record and opens the empty sidepanel (`:216-229`). |
| 1 or more users selected (Users tab) | `Reset Password` (ghost), `Reset 2FA` (ghost), `Delete` (danger) (`:167-214`) |
| 1 or more groups selected (Groups tab) | `Delete` (danger) only (`:199-214`) |

- There is no selection count, no "Select N", no `Add to group`, no `Change role`, no bulk email: none found.
- Selection rules: row checkboxes and header "select all" (all rows of the table; all rows are loaded, no pagination); users and groups keep separate selections; changing tab clears both (`Users.tsx:122-127`). No row is disabled for selection (`disableRowSelection` is not set), including the current admin and the system user (see item 11).
- `Reset Password` bulk: opens a danger confirmation without password (item 4); on accept sends one recovery request per selected user in parallel (`app/react/V2/api/users/index.ts:97-115`); success `Instructions to reset the password were sent to the user` (same singular text for many users) (`Users.tsx:85-92`).
- `Reset 2FA` bulk: danger confirmation with password; one request per user in parallel (`index.ts:117-137`); success `Disabled 2FA`.
- `Delete` on users: danger confirmation with password; `DELETE users` with `ids` (`index.ts:51-62`); success `Deleted user` (en.csv:384; singular also for many) (`Users.tsx:73-78`).
- `Delete` on groups: danger confirmation without password; success `Deleted user group` (en.csv:385) (`Users.tsx:79-84`). Deleting a group removes the group document only; the users stay (`API/application/DeleteUserGroups.ts:16`).
- Server effect of user delete: deletes the users, then removes them from every group's `members` in one transaction (`API/application/DeleteUsers.ts:23-37`). Guards, in this order, each a 400: `Cannot delete system users` (public user id), `Users cannot delete themselves`, `Cannot delete last remaining user` (only when exactly 1 user exists), `Cannot remove the last remaining admin` (when every current admin is in the list) (`DeleteUsers.ts:39-56`; `API/domain/user/errors.ts:18-41`).
- After Accept the modal closes and both selections reset to empty whether the call succeeded or failed (`Users.tsx:264-270`); after success the loaders re-run (`:109`).

**4. Confirm dialogs and modals**

Common dialog shell `ConfirmationModal` (`C/UI/ConfirmationModal.tsx`), `Modal` size `md` (max-w-md) (`:46`, `Modal.tsx:29`). Close: header X (aria-label `Close modal`) or Cancel. Escape and backdrop click do not close a `Modal` (no handler in `Modal.tsx`) (code-read).
- Password field (when `usePassword`): label `Enter your current password to confirm` (en.csv:460), `type="password"`, `autoComplete="off"`; Accept stays disabled until the field has at least 1 character (`ConfirmationModal.tsx:51,88-106`). No other check client-side; the server compares with bcrypt.
- Default buttons: `Cancel` (en.csv:171), `Accept` (en.csv:18) (`:143,151,182,191`).

| # | Trigger | Style | Title | Body | Password field | Buttons, in order | Accept does | Cite |
|---|---|---|---|---|---|---|---|---|
| 1 | Sidepanel `Save` (create or edit, after client validation passes) | normal | `Confirm` (en.csv:241) | `Confirm action` (en.csv:243) | yes | `Cancel` (ghost), `Accept` (primary, because there is no warning text) | `usersService.upsert(form values, password)`: create `POST users/new`, edit `POST users`; then see item 6 | `UserFormSidepanel.tsx:386-404`; `ConfirmationModal.tsx:159-195` |
| 2 | Sidepanel `Reset 2FA` | normal | `Confirm` | `Confirm action` | yes | `Cancel`, `Accept` | `reset2FA(user, password)`, revalidate, close panel | `:318-327,386-404` |
| 3 | Sidepanel `Unlock account` | normal | `Confirm` | `Confirm action` | yes | `Cancel`, `Accept` | `unlockAccount(user, password)`, revalidate, close panel | `:331-341` |
| 4 | Footer `Reset Password` (users selected) | danger | `Reset passwords` (en.csv:1086) | warning band (red, `role="alert"`) `Do you want reset the password for the following users?` (en.csv:402), then a bulleted list of the selected usernames | no | `Cancel` (warm), `Accept` (danger red) | `requestPasswordReset(selectedUsers)` | `Users.tsx:172-177,254-274`; `ConfirmationModal.tsx:110-157` |
| 5 | Footer `Reset 2FA` (users selected) | danger | `Reset 2FA` (en.csv:1082) | warning `Do you want disable 2FA for the following users?` (en.csv:401), list of usernames | yes | `Cancel`, `Accept` | `reset2FA(selectedUsers, password)` | `Users.tsx:186-191` |
| 6 | Footer `Delete` (users) | danger | `Delete` (en.csv:366) | warning `Do you want to delete the following items?` (en.csv:403), list of usernames | yes | `Cancel`, `Accept` | `usersService.delete(selectedUsers, password)` | `Users.tsx:203-209` |
| 7 | Footer `Delete` (groups) | danger | `Delete` | warning `Do you want to delete the following items?`, list of group names | no | `Cancel`, `Accept` | `userGroupsService.delete(selectedGroups)` | `Users.tsx:259-263` |

Danger layout: a red-tinted square with a warning triangle, then the title, then the close X; then the warning band; then the list (`flex-wrap`, bullets); then the password field if any; then buttons right-aligned (`ConfirmationModal.tsx:110-157`). While modal 1 to 3 or the Permissions modal is open, the sidepanel gets `pointer-events-none` (`UserFormSidepanel.tsx:209-213`). The modal closes after Accept finishes, success or failure (`:401`, `Users.tsx:267`).
Permissions modal: item 1. No other dialogs; no "discard changes" dialog.

**5. Empty / loading / error / notification states**

- Empty table (either tab): a centred message `NO DATA AVAILABLE` (en.csv:812, gray, `p-10`); the table header row and checkbox header stay (`C/UI/Table/DefaultNoDataMessage.tsx:4-8`, `Table.tsx:322-324`). No create call-to-action in the empty state; the footer `Add user` / `Add group` is the only action.
- Group with no members: empty cell. User with no groups: empty cell.
- Loading: loaders for users and groups run in parallel (`R/Users/createUsersLoader.ts:16-19`); while any request runs the global request-status loader shows with a minimum 1000 ms (`app/react/V2/atoms/requestStatusAtom.ts:26-49`). No skeleton rows.
- Loader error: route error boundary, status and message from the server (`createUsersLoader.ts:21-22`, `app/react/V2/shared/errorUtils.tsx:106-118`).
- Mutation error: Beacon notification, type error, title `An error occurred` (en.csv:116), detail = server text (`Users.tsx:58-65`, `UserFormSidepanel.tsx:140-147`, `GroupFormSidepanel.tsx:90-97`). Wrong admin password: detail `Forbidden`. Network failure: title `Could not reach server. Please try again later.` (en.csv:284) (`policies.ts:40-45`).
- Success notifications (title only): `Added new user` (en.csv:83), `User updated` (en.csv:1476), `Group saved` (en.csv:565), `Group updated` (en.csv:566), `Deleted user` (en.csv:384), `Deleted user group` (en.csv:385), `Instructions to reset the password were sent to the user` (en.csv:631), `Disabled 2FA` (en.csv:394), `Account unlocked successfully` (en.csv:25) (`UserFormSidepanel.tsx:157-162,176-191`, `GroupFormSidepanel.tsx:100-103`, `Users.tsx:73-98`).
- Locked row: red username and lock icon, tooltip `Account locked` (`TableComponents.tsx:69-81`).
- Server error texts that can surface in a notification detail (400 unless noted): `The username "{username}" already exists`, `The email "{email}" already exists`, `Cannot modify system user`, `Cannot change own role`, `Cannot remove the last remaining admin`, `Cannot delete system users`, `Users cannot delete themselves`, `Cannot delete last remaining user`, `User {id} not found`, `The group name "{name}" already exists`, `Duplicate member ids: {ids}`, `User group "{id}" not found` (`API/application/UpdateUser.ts:37,51`; `API/domain/user/errors.ts:6-47`; `API/domain/userGroup/errors.ts:6-19`). Zod failures return 422 with an issue list; exact on-screen text of the detail is (unverified) because `prettyMessage` is built server-side (`handleError.js:120-127`, `:214-217`).

**6. Save**

User create or edit:
1. Click `Save` (`:370-376`). Client runs `trigger()` on all fields. If any rule fails: errors show, nothing else happens (no modal).
2. If valid: password modal 1 opens (`actionType = 'formSubmit'`).
3. `Accept`: `saveUser(getValues(), password)` (`:149-165`). The client strips `rowId`, `password` when blank, `accountLocked`, `failedLogins` (`app/react/V2/api/users/index.ts:7-18`). New user (no `_id`): `POST /api/users/new`; existing: `POST /api/users` (`app/react/V2/services/http/HttpUsersService.ts:7-10`).
4. Server, create (`API/infrastructure/express/users/routes.ts:14-19`): `needsAuthorization()` (admin; else 401 `Unauthorized`) -> `validatePasswordMiddleWare` (403 `Forbidden`) -> `CreateUserController` builds `domain` from the request protocol and tenant domain and maps `groups[]._id` to `assignedGroupIds` (`CreateUserController.ts:9-14`) -> `User.create` validates username, role, email -> checks unique username, then unique email -> hashes the password (random if none) -> one transaction: insert user, add to listed groups, create a recovery key and send the welcome email (always sent, no option) (`API/application/CreateUser.ts:32-57`, `SendWelcomeEmail.ts:21-42`). Response 201 `{user:{_id, username, role, email}}`.
5. Server, edit (`routes.ts:20-25`): roles allowed `admin|editor|collaborator`; body must include username, email, role (`UpdateUserController.ts:10-14`). Use case order: reject the system user -> load account -> non-admin editing someone else = `UnauthorizedError` 401 -> own role change -> profile validation -> last-admin check -> unique username only if changed -> unique email only if changed -> hash password if given -> groups applied only if actor is admin -> transaction update (`UpdateUser.ts:33-85`). Response 201.
6. Success: notification `Added new user` (new) or `User updated` (edit); `revalidator.revalidate()` re-runs both loaders; `closeSidepanel()` resets the form and closes (`:157-164`).
7. Error: notification `An error occurred` + detail; the modal closes, the sidepanel stays open with the values kept; the admin must retype the password on the next `Save`.
8. Welcome email: subject `Welcome to {site name}` (`Uwazi` if empty), link `{domain}/setpassword/{key}?createAccount=true`, valid 24 hours (`API/domain/email/templates/welcomeEmail.ts:11-34`).

Group create or edit:
1. `Save` is a real submit button, so Enter in the name field submits. RHF validates; if invalid, errors show (`GroupFormSidepanel.tsx:115,165`).
2. `POST /api/usergroups` with `{_id?, name, members:[{refId, username}]}` (`:78-88`, `app/react/V2/api/users/index.ts:64-72`). No password. Server: admin only; routes to update when `_id` is present, else create (`API/infrastructure/express/userGroups/routes.ts:9-19`). Create checks unique name then builds the group; update checks unique name excluding itself, loads the group, replaces name and members (`CreateUserGroup.ts:18-26`, `UpdateUserGroup.ts:19-25`).
3. Success: `Group saved` / `Group updated`, revalidate, close panel. Error: `An error occurred` + detail, panel stays open.

Bulk and secondary actions: item 3 and item 4 (confirm, call, notification, revalidate; Reset Password never closes anything).

**7. Dirty guard**

None. No `useBlocker` or `BlockDirtyNavigation` in `R/Users/**` (grep). Close X, Cancel, Escape (document keydown, `C/UI/Sidepanel.tsx:116-127`), backdrop click (`:226`), switching tab, and rail navigation all discard the edit silently. Exceptions: none.

**8. Sort, filter, search, pagination**

- Search: none found. Filters: none found. Pagination: none (all rows rendered, `Table.tsx:325-345`).
- Sort: client-side, TanStack Table, header click toggles (`Table.tsx:302-307`); indicator icons: up chevron ascending, down chevron descending, up-down chevron when unsorted (`C/UI/Table/SortingChevrons.tsx:9-17`). Default: Users by `username` ascending, Groups by `name` ascending. Cycle order (asc -> desc -> off for strings; desc first for the boolean Protection column) is TanStack 8.21.3 default behaviour (unverified at runtime; version `package.json:156`).
- Selection is held in the table and is reset whenever the `data` prop changes (after revalidate) (`Table.tsx:171-178`).
- Row order before sort = server order (unverified).

**9. Propagation**

- After any successful mutation both lists reload (`Users.tsx:109`, `UserFormSidepanel.tsx:163`, `GroupFormSidepanel.tsx:104`).
- Role changes apply on the user's next request: the session user is re-read from the database on each request (`app/api/auth/passport_conf.js:10-25`), and role gates both menu and API (`authMiddleware.ts:13-20`, `R/SettingsNavigation.tsx:30-36`).
- Group membership feeds the session user's `groups`, from which permission ref ids are derived (comment at `passport_conf.js:17-18`).
- `Reset 2FA` sets `using2fa=false` and `secret=null` (`API/infrastructure/mongodb/user/MongoUsersDataSource.ts:230-235`); the user's Account page then shows the "Enable" card and the Users table shows the `Password` pill.
- Deleting a user removes membership from all groups; it does not touch entity permissions (no other call in `DeleteUsers.ts`).
- Activity log: every non-GET `/api/*` call is logged except login/recover/reset/unlock-account paths; passwords are masked (`app/api/activitylog/activitylogMiddleware.ts:6-20,34-47` (per prior inventory, not re-read)).
- Admin-triggered flows reaching public pages:
  - Password recovery email (from `Reset Password`): subject `Password recovery`; body `Your username is: {username}`, `To set your password click on the following link:`, link `{domain}/setpassword/{key}`, `This link will be valid for 24 hours.` (`API/domain/email/templates/passwordRecoveryEmail.ts:10-19`). Unknown email returns OK silently (`API/application/RecoverPassword.ts:23-24`), response `'OK'`; `POST /api/recoverpassword` needs no login.
  - Set-password page `/setpassword/:key` (`app/react/Routes.tsx:322`): optional info banner `To complete the account creation process, please create a password for your account` (when `?createAccount=true`), labels `Password`, `Repeat Password`, button `Save password`, error `Passwords don’t match` (curly apostrophe; also shown for an empty password) (`app/react/Users/ResetPassword.jsx:58-60,68,81,94,100`). On success: password updated, lock fields cleared, key deleted, redirect to `/login` (`API/application/ResetPassword.ts:21-36`).
  - Lock: after 6 failed logins the account is locked (`API/domain/user/Credentials.ts:3,69-71`) and an email `Account locked` is sent with link `{domain}/unlockaccount/{username}/{code}` (`API/domain/email/templates/accountLockedEmail.ts:10-19`); that link shows `Verifying...` then redirects to `/login` (`app/react/Users/UnlockAccount.jsx:33`). Admin `Unlock account` clears `accountLocked`, `accountUnlockCode`, `failedLogins` (`MongoUsersDataSource.ts:179-184`).

**10. Improvements to layer on**

- UX1, gap row "No search or filter in Uwazi": toolbar search (username, email) plus role and group filters; show an email line under the username since the table has no email column.
- UX2, gap row "Bulk footer when users selected": selection action bar with a count in a fixed slot; ladder = ghost `Reset Password`, ghost `Reset 2FA`, add `Add to group` and `Change role` (not in Uwazi), then divider, `Delete` in danger.
- UX4, gap row "Delete users": block self and last admin on the client; dialog states "removed from N groups". Gap row "Delete groups": impact line "N members lose this group".
- UX12, gap row "Table is wide": phone list rows (name, email, role pill).
- Design pattern 1 (list page), gap row "Empty table text": `EmptyState` with the create action instead of `NO DATA AVAILABLE`; loading rows while data loads.
- Design pattern 1, gap row "Row action": `Edit` revealed on hover/focus-within, row target opens the editor.
- Design pattern 3 (editor) + dirty guard, gap row "Closing the panel or switching tab discards": guard on Cancel, close, backdrop, tab switch, rail.
- Design (Users page), gap row "Groups multi-select": searchable multi-select (Uwazi shows every group as a popover checkbox with no search).
- Design, gap row "Group form": member picker gains search and select-all.
- Design, gap row "Users table": Admin pill in ink or vellum, not seal (seal is danger only); locked state needs a seeded locked user.
- Design verbs, gap row "Add user opens form": keep `Add user` on the bar, `New user` as the title, commit labelled per ladder; gap-matrix prototype-only row: drop "Invite user".
- Design destructive-confirm rule, gap row "Edit: Reset Password": add a confirm to the sidepanel `Reset Password` (Uwazi sends at once).
- Gap row "Groups table": correct plural for member counts (`1 member`), derive counts from membership ids; membership by id, not name (H1).
- UX11 (last-saved line) is not applicable to a sidepanel editor; none.

**11. Uwazi defects NOT to copy**

- Self-delete, own-role change and last-admin removal are blocked only by the server (`DeleteUsers.ts:39-56`, `UpdateUser.ts:50-62`). Corrected: untick/disable the current user's row for `Delete` with a tooltip `Users cannot delete themselves`; disable the role select on the current user's own record with the reason `Cannot change own role`; disable `Delete` and demotion that would leave no admin with `Cannot remove the last remaining admin`; never list or allow the system public user.
- Cross-field duplicate check: `isUnique` compares the typed value against both usernames and emails (`UserFormSidepanel.tsx:43-49`), so a username equal to someone's email is rejected with `Duplicated username`. Corrected: username against usernames, email against emails, both trimmed and case-insensitive (the server is stricter in the other direction only for case: exact match).
- `maxLength 256` on Email has no message (`getFieldError` has no case for it, `:75-85`): the field turns red with no text. Corrected: message for max length.
- Selection after a failed bulk action: state clears (`Users.tsx:264-270`) while the table keeps its checkboxes ticked until the data prop changes (`Table.tsx:171-178`), so the footer shows `Add user` over ticked rows (code-read). Corrected: keep the selection on failure; clear on success.
- Escape closes the sidepanel (document-level listener, `Sidepanel.tsx:116-127`) even when the password modal is above it. Corrected: Escape closes only the top layer.
- Groups pills in the user form can revert: `value` is rebuilt every render (`UserFormSidepanel.tsx:356`) and `MultiSelect` resets its state on every `value` change (`MultiSelect.tsx:95-97`), so pills may show the saved groups while the form value holds the change (code-read, not run). Corrected: pills always reflect the form value.
- Bulk success text is singular for many users (`Deleted user`, `Instructions to reset the password were sent to the user`), bulk Reset Password and Reset 2FA report only the first failure and give no per-user result (`index.ts:111-115,133-137`). Corrected: one summary (`N of M ...`) and the failed usernames.
- Duplicate error entries per failure (policy notification plus page `notify`, see shared mechanics). Corrected: one entry.
- Role pill shows the raw lowercase value `admin` while the select shows `Admin` (`TableComponents.tsx:36-45`). Corrected: same label in both (`Admin`, `Editor`, `Collaborator`).
- Ungrammatical confirm copy: `Do you want reset the password for the following users?` and `Do you want disable 2FA for the following users?`. Keep verbatim for parity; flag for a copy decision.
- Duplicate-username and duplicate-email server errors appear only as a notification, not on the field. Corrected: map to the field error (`Duplicated username`, `Duplicated email`).
- Group-name uniqueness on the server uses a regex from the raw name (`MongoUserGroupsDataSource.ts:84-92`); names with regex characters can mismatch (not run). Do not copy; compare normalised strings.
- Permissions row string has a trailing space (`PermissionsListModal.tsx:110`). Trim it.

---

### Account

**1. Screen map**

Route `/settings/account`, loader `GET /api/user` (`R/Account/createAccountLoader.ts:12-19`, `app/react/V2/api/users/index.ts:163-166`). Any logged-in role (admin, editor, collaborator): rail link has no role gate (`R/SettingsNavigation.tsx:30`); route guard is the parent logged-in guard (`app/react/Routes.tsx:324-325`). `GET /api/user` returns the session profile (`API/infrastructure/express/users/GetCurrentUserController.ts:3-8`): `_id, username, role, email, groups, using2fa, accountLocked`, never a password.

Top to bottom (`R/Account/Account.tsx:61-229`):
1. Header: breadcrumb title `Account` (en.csv:23) (`:64`).
2. One form (`id="account-form"`, `:66-71`) with three stacked cards, 1rem apart:
   - Card `General Information` (en.csv:553, default header colour), 2-column grid (1 column on phones): `Username` | `User Role` (both disabled), `Email` full width (`:72-109`).
   - Card `Change Password` (en.csv:187): `New password` | `Confirm new password` (`:110-136`).
   - Card `Two-Factor Authentication` (en.csv:1412). If `using2fa` is false: yellow header colour, a secondary button `Enable` (en.csv:455) on the left, text `You should activate this feature for enhanced account security.` (en.csv:1539) (`:154-175`). If true: default header colour, a disabled green button `Activated` (en.csv:32) and text `Your account's security is enhanced with two-factor authentication.` (en.csv:1542) (`:137-153`).
   - A hidden disabled submit button drives the form (`:177`).
3. Sticky footer (`:180-204`), left to right: red-outline link `Logout` (en.csv:696) (`<a href="/logout">`, full page load) then primary button `Update` (en.csv:1435).
   - `Update` is disabled while the form is not dirty (`disabled={!isDirty}`, `:199`). It is enabled as soon as email or a password field differs from the loaded values.
4. Overlay: 2FA setup sidepanel (mounted only when `using2fa` is false, `:207-209`); password confirmation modal.

2FA setup sidepanel (`R/Account/Components/TwoFactorSetup.tsx`): large size, 600px on md, 40% of the width on lg, with backdrop (`:85-91`, `Sidepanel.tsx:80-84`). Header: title `Two-Factor Authentication` rendered uppercase (`:86`), close X. Body is a 3-column grid (1 column on phones):
1. Card `Using Authenticator` (en.csv:1485), spans 2 columns: numbered list
   1. `Download a third-party authenticator app from your mobile store.` (en.csv:420) followed by non-translated italic muted text `(Google Authenticator, LastPass Authenticator, Microsoft Authenticator, Authy, etc.)` (`:96-105`);
   2. `Add an account to the app by scanning the provided QR code with your mobile device or by inserting the provided key.` (en.csv:42) (`:106-111`);
   then an italic muted paragraph `Instructions on how to achieve this will vary according to the app used, please refer to the app's documentation.` (en.csv:629) (`:113-118`).
2. Card `QR Code` (en.csv:1024), 1 column: QR image 180px, error level Q, black on white, lazy-loaded `qrcode.react`, `title="qr code"`, value = the `otpauth` URL (`:120-133`).
3. Card `Secret keys` (en.csv:1142), spans 3 columns: read-only copy field with label `You can also enter this secret key into your Authenticator app.` (en.csv:1532) and a second italic muted line `*please keep this key secret and don't share it.` (en.csv:4); a clipboard button (sr-only `Copy to clipboard`, en.csv:277; after click a check icon and a tooltip `Copied to clipboard`, en.csv:268, for 2 s) (`:134-149`, `C/UI/CopyValueInput.tsx:46-67`). Below it the token input (item 2) (`:150-167`).
4. Footer: `Cancel` (ghost, en.csv:171) and `Enable` (primary), equal width (`:171-180`).

Password confirmation modal: item 4.

**2. Fields**

Form validation mode `onSubmit` (`Account.tsx:36`). Validation runs when `Update` is clicked (`trigger()`, `:193-198`); the confirm modal opens only if valid.

| Label | Control | Placeholder | Help | Default | Validation and error | Server | Required | Cite |
|---|---|---|---|---|---|---|---|---|
| `Username` (en.csv:1477) | text input, disabled, id `account-username` | none | none | current username | none (read-only) | cannot change here; the update call re-sends the same value | - | `:75-80` |
| `User Role` (en.csv:1475) | text input, disabled, id `account-role` | none | none | current role, raw lowercase (`admin`, `editor`, `collaborator`) | none | own role cannot change: `Cannot change own role` | - | `:83-89` |
| `Email` (en.csv:449) | text input (not `type="email"`), id `account-email` | none | none | current email | `required` and `validEmailFormat` (`/^[^\s@]+@[^\s@]+\.[^\s@]+$/`) -> one message for both, in red under the field: `A valid email is required` (en.csv:16) | `z.string().email()` (zod default text (unverified)); unique, exact, checked only if changed -> `The email "{email}" already exists` | yes | `:91-106`; `app/react/V2/shared/formatHelpers.ts:53`; `API/application/UpdateUser.ts:68-70`; `API/domain/user/errors.ts:12-16` |
| `New password` (en.csv:792) | `type="password"`, id `new-password` | none | none | empty | none client-side; red text `Passwords do not match` (en.csv:937) appears under this field when the confirm field fails | non-empty string if present; blank is replaced by the old (undefined) value so it is not sent; no length or strength rule | no | `:113-125`; `app/react/V2/Routes/Settings/Account/Account.tsx:41`; `API/application/UpdateUser.ts:23` |
| `Confirm new password` (en.csv:250) | `type="password"`, id `confirm-new-password` | none | none | empty | `validate: val === watch('password')` -> error flag on both password inputs; message `Passwords do not match` shown under `New password` only. Passes when both are empty. | - | no | `:126-134`, error `:120-124` |
| `Enter your current password to confirm` (en.csv:460) | `type="password"` in the confirmation modal | none | none | empty | Accept disabled until length > 0 | bcrypt compare; wrong or missing -> 403 `Forbidden` | yes (to submit) | `C/UI/ConfirmationModal.tsx:88-106` |
| `Enter the 6-digit verification code generated by your Authenticator app` (en.csv:458), bold | text input, id `authenticator-token`, `autoComplete="off"` | none | none | empty | none; no digit mask or length check; `Enable` disabled only while empty; typing clears the error | `otplib` verify against the stored secret; failure -> 400 `Two-factor authentication failed.` | yes (to enable) | `TwoFactorSetup.tsx:150-162,176`; `API/application/EnableTwoFactorAuth.ts:21-28`; `API/domain/user/errors.ts:79-83` |
| Secret key (label above) | read-only text with copy button, id `authenticator-secret` | none | the two label lines | secret from the server | none | - | - | `:135-149` |

**3. Row actions and bulk actions**

No table. Actions:
- `Logout`: always enabled; navigates to `/logout`; server destroys the session and redirects to `/` (`API/infrastructure/express/users/LogoutController.ts:3-9`, `app/api/auth/routes.js:35`). No confirmation and no dirty check.
- `Update`: item 6. Disabled while not dirty.
- Card `Enable`: opens the 2FA sidepanel. Present only when 2FA is off.
- `Activated`: always disabled, status only.
- Panel `Cancel`: closes the panel (the typed token and error state stay in memory, `:173`). Panel `Enable`: item 6.
- No control exists for a user to turn 2FA off or to change username or role. Only an admin can reset 2FA (Users page). Bulk actions: none.

**4. Confirm dialogs and modals**

- Password modal (`Account.tsx:211-227`, `ConfirmationModal` normal style, size `md`): trigger = `Update` click after client validation passes. Title `Confirm` (en.csv:241). Body `Confirm action` (en.csv:243). Field `Enter your current password to confirm`. Buttons, in order: `Cancel` (ghost; closes the modal, nothing is sent), `Accept` (primary; disabled until the field is non-empty). Accept stores the typed password, clicks the hidden submit (which re-runs form validation), and closes the modal (`:217-225`). Header X = Cancel.
- 2FA setup sidepanel: item 1; no further confirm.
- No dialog for Logout.

**5. Empty / loading / error / notification states**

- Loading: global request loader, minimum 1000 ms (`requestStatusAtom.ts:26-49`). No skeleton.
- Loader error: route error boundary (`createAccountLoader.ts:17`). On the server-rendered path a missing session returns 401 `Unauthorized` (`app/react/V2/services/server/ServerUsersService.ts:47-57`), which leads to login.
- Success notifications: `Account updated` (en.csv:26) (`Account.tsx:53`); `2FA Enabled` (en.csv:10) (`TwoFactorSetup.tsx:81`).
- Error notifications: title `An error occurred` (en.csv:116) + server detail (`Account.tsx:46-51`; 2FA secret load failure `TwoFactorSetup.tsx:37-45`; 2FA enable non-400 `:70-76`). Wrong current password: detail `Forbidden`. Email in use: detail `The email "{email}" already exists`. Own role/other 401: 401 triggers a redirect to `/login` (`policies.ts:74-83`).
- 2FA wrong token (HTTP 400): inline red text `The token does not validate against the secret key!` (en.csv:1301) under the token field and the field takes the error style; no page notification from the component, but the global policy still raises `An error occurred` (code-read) (`TwoFactorSetup.tsx:64-68,163-167`).
- 2FA secret load failure: notification and the QR renders with an empty value, the secret field stays empty (`:37-45`).
- Validation errors: `A valid email is required`, `Passwords do not match` (item 2).

**6. Save**

Profile and password (`Update`):
1. Click `Update` (enabled only when dirty). Client runs `trigger()` on email and the password pair. Invalid: inline errors, stop.
2. Valid: password modal opens. `Cancel`: stop.
3. `Accept`: the hidden submit fires `handleSubmit`; `onSubmit` drops `passwordConfirm`, replaces a blank password with the profile's value (undefined, so it is omitted), then `usersService.upsert(user, currentPassword)` -> `POST /api/users` with the whole profile (`username, email, role, groups, using2fa`, optional `password`); `accountLocked` and `failedLogins` are stripped (`Account.tsx:39-43`, `app/react/V2/api/users/index.ts:7-18,42-49`).
4. Server (`API/infrastructure/express/users/routes.ts:20-25`): `needsAuthorization(['admin','editor','collaborator'])` -> password check (403 `Forbidden`) -> `UpdateUserController` (requires `username`, `email`, `role`; 201) -> use case: self-edit allowed; a non-admin editing another user = 401; role change on self = 400 `Cannot change own role`; validates email; unique-email check only when the email changed; re-hashes the password if present (bcrypt, 10 rounds); groups are applied only for admins and for self they are re-sent unchanged (`UpdateUser.ts:33-85`, `EncryptedPassword.ts:7`).
5. Success: notification `Account updated`; `revalidator.revalidate()` reloads the profile (`:53-54`).
6. Always, success or error: both password fields are reset (`resetField('password')`, `resetField('passwordConfirm')`, `:57-58`). On error the notification `An error occurred` + detail shows and the typed new password is lost.
7. The confirm modal is already closed at step 3 in all cases.

2FA enable:
1. Click `Enable` on the card: sidepanel opens. On first open only, `POST /api/auth2fa-secret` runs (`TwoFactorSetup.tsx:31-52`). Server (needs any of the 3 roles) fails with `Two-factor authentication is already enabled` if on; else generates a secret, stores it on the user immediately, returns `{secret, otpauth}`; the issuer in `otpauth` is the site name cut to 30 characters plus `...` (`API/application/GenerateTwoFactorSecret.ts:11-29`, `app/api/auth2fa/routes.ts:9-13`).
2. Scan or copy the secret; type the code in the token field.
3. Click `Enable` (disabled while the token is empty): `POST /api/auth2fa-enable {token}` (`:61-82`). Server verifies with `otplib`; failure `TwoFactorTokenInvalid` 400 (`EnableTwoFactorAuth.ts:17-31`).
4. 400: inline error, panel stays open. Other error: notification `An error occurred` + detail.
5. Success: revalidate, close the panel, notification `2FA Enabled`; the card flips to the `Activated` state.

**7. Dirty guard**

None: no `useBlocker` or `BlockDirtyNavigation` in `R/Account/**`. Leaving the page, clicking `Logout` or closing the 2FA panel discards edits silently. Exceptions: none. `Update` is disabled until dirty (`:199`); `isDirty` is measured against the defaults loaded at first render (code-read), so it likely stays enabled after a successful email change (unverified).

**8. Sort, filter, search, pagination**

None found.

**9. Propagation**

- Email change: used by password recovery and welcome mail and shown to admins in the Users sidepanel; admin `Reset Password` sends to the stored email (`api/users/index.ts:97-103`).
- `using2fa` flips after 2FA enable; the Users table `Protection` pill reads it (`TableComponents.tsx:21-34`); the next login asks for the token (login 409 branch, `app/api/utils/handleError.js:160-162`).
- Password change takes effect at the next login; other sessions are not signed out (no code does it) (code-read).
- The session user is re-read each request (`app/api/auth/passport_conf.js:10-25`); whether the navbar's own user atom refreshes after `revalidate()` is (unverified).
- Activity log records the `POST /api/users`, `auth2fa-secret` and `auth2fa-enable` calls, passwords masked (per prior inventory, not re-read).

**10. Improvements to layer on**

- Design pattern 2 (form page), gap row "One footer Update": footer commit with ghost `Discard changes`, commit disabled until dirty and reset to the saved value after save (fixes the stale dirty state); UX11 `Saved ...` line in the footer.
- Design pattern 2 + dirty guard, gap row "Dirty guard: none on Account": register the form with the guard (rail, breadcrumb, Logout, corpus switch).
- Design pattern 2 width, gap row "Field width": fields capped near 40rem.
- Gap row "User Role shown read-only": show the translated label (`Admin`, not `admin`).
- Gap row "Update opens a confirm modal": same `Modal`; mock check accepts any non-empty password.
- Gap row "Wrong token shows ...": keep the 6-digit sanitiser (better than Uwazi), same message.
- Gap row "Secret key shown in a copy input": real clipboard write.
- Gap row "Email editable": same message, `type="email"` keyboard on phones.
- Gap row "After enabling, card shows Activated": keep, no self-disable; admin `Reset 2FA` (Users page) clears the flag this card reads.
- Gap prototype-only rows: drop API keys unless Juan keeps them, drop the Disable-2FA button, drop the inline `Update password` button, drop editable Username.
- UX5 (undo in Beacon): not applicable; none.

**11. Uwazi defects NOT to copy**

- Password fields reset even when the save failed (`Account.tsx:57-58` runs after both branches), so a wrong current password loses the new password the user typed. Corrected: reset only on success.
- Email-in-use is a notification only (`The email "{email}" already exists`). Corrected: show it under `Email`.
- 2FA token state survives `Cancel` and close (`TwoFactorSetup.tsx:173`, state at `:24,29`): reopening shows the old code and error. Corrected: clear token and error on close.
- The secret is saved on the user the moment the panel opens, before any code is verified (`GenerateTwoFactorSecret.ts:26`), and is reused for the page session (`TwoFactorSetup.tsx:32`). Corrected in a prototype: generate a mock secret when opened, discard on Cancel, store it only on successful `Enable`.
- Token input accepts any characters and any length (`TwoFactorSetup.tsx:150-162`). Corrected: digits only, 6 characters, `Enable` disabled until 6.
- Wrong token gives two signals (inline text and the generic policy notification). Corrected: inline only.
- Role is shown raw and lowercase (`Account.tsx:86`). Corrected: translated label.
- Password confirm mismatch message sits under `New password` only, though both fields turn red (`:115,129,120-124`). Corrected: show it under `Confirm new password`.
- No minimum password length or strength rule anywhere (`UpdateUser.ts:23`); a note, not a defect to fix without a decision from Juan.
- `Logout` discards unsaved edits with no warning (`:182-189`). Corrected: run through the dirty guard.
- Duplicate error entries per failure (see shared mechanics). Corrected: one entry.
- `Update` can stay enabled after save (RHF default values are read once, `Account.tsx:34-37`) (unverified). Corrected: reset the baseline after a successful save.
