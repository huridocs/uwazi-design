# Settings F1: adversarial review

Commits `a6b6aca3`, `faf68858`, `66e721c7`, `952ba19d` (base `34b75a64`). I reviewed the committed tree
at `952ba19d`, exported to a scratch copy, because the main checkout is mid-cherry-pick (below).
`npx tsc --noEmit` on that tree: exit 0. Paths are relative to `app/src/`.

## Before anything else: the main checkout is mid-cherry-pick

`git status` in `/Users/juanmnl/Developer/huridocs/uwazi_app`: "You are currently cherry-picking commit
1bccc6ac". `components/settings/SettingsContent.tsx` is unmerged, and
`components/settings/pages/UserEditor.tsx` holds conflict markers in the working tree (around the
footer Save button). Any dev server on this checkout serves a tree that does not compile. I did not
touch it. Whoever started the cherry-pick needs to finish it or abort it.

## Findings, ranked

### 1. High. Collection, Customisation and Filters now read "saved" while storing nothing, and the guard lets the edits go

- `components/settings/pages/CollectionPage.tsx` `save = () => { markSaved(); … }`
- `components/settings/pages/CustomisationPage.tsx` `save = () => { markSaved(); … }`
- `components/settings/pages/FiltersPage.tsx` `save = () => { markSaved(); … }`

The draft's baseline moves to the draft, but no store receives the values. After Save the page is
clean, so the guard (B1) waves navigation through. Leaving and coming back remounts the page from
the seed (`saved: {...init}`).

Failure: on Collection, rename the collection and click Save. The toast says "Collection settings
saved". Click Templates in the rail: no prompt. Click Collection again: the old name is back.

Before F1 the edits were also lost, but the page stayed dirty and Save stayed enabled. Now the UI
says they are kept. This is H3 "fixed" on top of the B2/B3 gap that is still open for these three
pages. Until each page has a store, `markSaved` should not be called. Leave them dirty, or give each a
store (the singleton-settings dispatch from the architecture review).

### 2. Medium. A corrupt overlay in sessionStorage white-screens the whole app, and a reload doesn't clear it

`atoms/settingsCollection.ts:34-40` `isOverlay` checks only that `created` and `deleted` are arrays
and `patched` is an object. It does not check the records:

- `created: [null]` → `listOfAtom` evaluates `r.id` on `null` (`:113`) → TypeError.
- A created user without `groupIds` (an older shape, or a hand edit) → `u.groupIds.includes` in
  `groupsAtom` (`atoms/users.ts:41`), `saveGroupAtom` (`:107`) or `deleteGroupAtom` (`:121`) throws.

`App.tsx` reads `usersAtom` at the top level (the login handler), so the throw happens on the app's
first render, not only in Settings. sessionStorage survives a reload in the same tab, so only a new
tab recovers. The module's own comment says "What storage hands back is outside the app's control".
There is also no schema version, so the next change to `SettingsUser` meets the same data.

Fix direction: validate each record (an id string plus the domain's required fields) with a
per-store `isRecord`, drop invalid entries rather than the whole overlay, and add a version to the
storage key.

### 3. Medium. Usernames and emails are not unique, so login picks the wrong account

`components/settings/pages/UserEditor.tsx` (`valid` only checks non-empty) and
`components/settings/pages/AccountPage.tsx:45-51` (`saveProfile`) accept any username or email.
`views/LoginView.tsx:45` `findUser` returns the first case-insensitive match, in store order (seed
before created).

Failure 1: Account › rename yourself (u1) to "mlopez" and save. Signing in as "mlopez" now signs in
as u1; the real mlopez (u2) can never sign in again.

Failure 2: create a user "Admin". Login finds the seed "admin" first, so the new user can never sign
in.

Uwazi rejects duplicate usernames and emails. A check against `usersAtom` (excluding self,
case-insensitive), in both editors, closes this.

### 4. Low-medium. Membership order makes an unchanged form dirty

`GroupEditor.tsx:35-36` and `UserEditor.tsx:51-52` toggle by filter or append, and `deepEqual`
compares arrays by order (`utils/deepEqual.ts:12-15`).

Failure: Litigation (members `[u2, u3]`). Untick u2, then tick it again: the draft is `[u3, u2]`, so
the form is dirty, Save is enabled, and the rail asks "Discard Group edits?" with nothing changed.
The same happens with a user's groups `[g2, g3]` → `[g3, g2]`.

Fix: sort ids (or compare as Sets) in the draft for membership fields.

### 5. Low. Last-admin and self-delete rules hold in the UI, but nothing checks who is signed in

`atoms/users.ts:72-86` holds in every UI path I found: delete self is blocked; deleting and demoting
the last admin are blocked; the role radios are disabled for the last admin (`UserEditor.tsx:48,83`).
`deleteUserAtom` and `saveUserAtom` (`:89-96,126`) enforce nothing themselves, so a future caller
(bulk actions, Bert) bypasses the rules.

Separately, the signed-in user's role is never checked. A collaborator who signs in (login accepts
any seed username) gets all of Settings and can promote themselves to admin. That predates F1;
noting it because F1 introduces `signedInUserAtom`, which makes the check possible.

### 6. Low. `deepEqual` treats every Date as equal, every Map as equal, and Sets of objects by identity

`utils/deepEqual.ts`: a `Date` or a `Map` has no own enumerable keys, so any two compare equal; Set
membership uses `has` (reference identity). No current draft holds these, so nothing fails today. The
first draft with a `Date` (the template-schema work adds dates) will never read dirty. Handle `Date`
(`getTime`) and `Map`, or throw on non-plain objects.

### 7. Low. Smaller items

- `useSettingsDraft` reads `saved` once, on mount (`hooks/useSettingsDraft.ts:19-20`). If a record is
  missing when its editor mounts (`UserEditor.tsx:38`, `GroupEditor.tsx:25`: `base` undefined with
  an id that is not "new"), Save **creates** a new record, because `id: base?.id ?? null`. Not
  reachable through today's UI (Reset lives on Dashboard), but it becomes reachable as soon as a
  store changes underneath an open editor.
- `atoms/settingsCollection.ts:138-144`: deleting a created record also adds its id to `deleted`, so
  `deleted` grows forever in sessionStorage. This is harmless, and the ids never collide
  (`newSettingsId`).
- Reset demo data (`DashboardPage`) sends a signed-in created user back to u1, the admin, without
  saying so. Entity access lists (`atoms/entityChanges.ts`, in memory) keep the deleted users'
  labels.
- AccountPage registers two drafts (profile, password). The guard's dialog names only the first dirty
  one (`atoms/dirtyGuard.ts:39`).

## Architecture review items: closed or not

| Item | Status | Evidence |
|---|---|---|
| **B1** (dirty guard does not cover Settings) | **Closed for every exit I could find.** Rail (`SettingsNav`), header back, breadcrumb and mobile back (`SettingsContent.tsx` header wraps `onBack` and the chevron in `guard`), collection switch (`Navbar.tsx` `switchCollection`; it is the only `selectDataSourceAtom` caller), logo, login and every app view (`App.tsx:45,52`), and reload (`UnsavedChangesGuard` beforeunload, armed only while dirty, cleared on unregister). Editors register through `useSettingsDraft`, and `CodePageEditor` through `useRegisterDirtyForm`. **Caveat: finding 1** makes three pages read clean while unsaved |
| **B3 for users** (users lost on navigation) | **Closed.** `atoms/users.ts` global store, persisted to sessionStorage. Login (`LoginView.tsx`), Share (`ShareEntityModal.tsx`), Dashboard and default access members (`atoms/entityChanges.ts`) read it. No reader touches `seedUsers` or `seedGroups` outside `atoms/users.ts` (grep) |
| **H1 for users** (id collisions, membership by name) | **Closed.** Ids come from `newSettingsId` (time + sequence, unique across reloads within a tab), membership is `groupIds`, `memberCount` is derived, and deleting a group strips it from users (`deleteGroupAtom`). Filter group and property ids moved to `newSettingsId` too |
| **H3** (dirty flags lie) | **Partly closed.** TemplateEditor no longer goes dirty on an unchanged dialog (`effectiveConfig` comparison). Filters, Collection and Customisation clear after Save, but see finding 1. Whitespace-only names are now refused (`name.trim()`) in the Thesaurus, Menu and Relation-type editors. **New false-dirty: finding 4** |
