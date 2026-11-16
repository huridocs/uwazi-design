# Harness notes for the acceptance run (QA)

Server: http://localhost:1438/ (Vite dev server at playground 73a13827, shared by all agents; state lives in each browser context's sessionStorage/localStorage, so parallel contexts do not interfere). Run ONE chromium at a time per agent.

Copy `lib.mjs` and `h.mjs` from this folder to your own working dir (or import them by absolute path). They export:
- `launch()`, `open(browser, section, "desktop"|"mobile", {source:"cejil"|"travesia"|"artworks"})`: new context at the given viewport, starting in Settings on `section` (`account dashboard users collection menu pages languages translations filters templates thesauri relationship-types preserve activitylog customisation uploads metadata-extraction paragraph-extraction`). The seed is clean for every new context. Returns `{ctx, page, errors}` (errors = console errors/warnings).
- `S(p)` = the settings pane locator (`[data-testid=settings-content]`), `rows(p)` = table row texts, `rail(p,"Item")`, `title(p)`, `dialogs(p)` (open role=dialog names, ignoring inert), `shot(p,name)` saves a PNG to the acceptance-run-1-shots dir, `axe(p)` runs axe-core on the pane, `logEntries(p)` reads the session Activity log, `notifTitles(p)` reads Beacon notifications (they are `article` elements in the notifications drawer, which is in the DOM but inert; the Beacon button is `Notifications, N unread`).
- h.mjs: `log(k, ok, evidence)`, `switchTo(p,"CEJIL"|"Sample"|"Best Artworks"|"Red Trav")`, `toSettings(p,"Rail item")`, `facet(p)`.

Quirks learned in earlier runs:
- Row buttons: every clickable row has a stretched "Edit X" button AND a pencil named "Edit X": use `.last()` for the pencil, or click the row. Scope locators to `S(p)`; the notifications drawer and other inert panels are in the DOM and contain buttons named Cancel/Delete/Undo.
- Delete dialogs are `[data-component=ConfirmDelete]` or `[data-component=ConfirmDialog]`; unsaved-changes dialog is a ConfirmDialog.
- A save is only real after `await page.waitForTimeout(300)`; state updates are async.
- `beforeunload` check: `page.evaluate(()=>{const e=new Event("beforeunload",{cancelable:true}); window.dispatchEvent(e); return e.defaultPrevented})` (headless shows no native prompt).
- To reload while staying on Settings use `page.reload()` (the harness only seeds the section on the first load). The Sample's relationship types and references live in memory only: a reload resets them; users, groups, collection, CSS, filters persist in sessionStorage.
- Corpus switch: navbar button `button[aria-label^="Collection:"]` then `[data-part=collection-menu] [role=option]`.
- Sign in as another seed user: set `sessionStorage.uwazi:appView` to `"login"`, reload, fill username (any password of 4+ chars), Enter; then set appView back to `"settings"` and reload. Users: admin, mlopez (editor), jnkemba (editor), afarah (collaborator), tbuergenthal (collaborator).
- CEJIL and Travesia load their data lazily; wait several seconds, and visit the Library once if a usage count looks blank.
- Clipboard: `ctx.grantPermissions(["clipboard-read","clipboard-write"])` then `navigator.clipboard.readText()`.
