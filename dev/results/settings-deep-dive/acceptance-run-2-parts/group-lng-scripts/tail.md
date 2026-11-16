
## Notes on method

- Scope: every numbered LNG and TRN check was driven (none carries M9, `defer` or `drop` in its Needs cell, so SKIP is 0; the "defer" and "drop" remarks in the checklist's "Not covered" lines refer to gap-matrix rows). Needs F1 to F4 and M1 to M8 were treated as in scope. TRN-18 is split into two rows because its second leg is not reachable.
- Seed and switches used: Languages and Translations on the Sample source (CEJIL, Best Artworks for X-13). Korean (`ko`, predefined file, marked `*`) and German (`de`, none) installed from the catalog; Korean's User Interface cells arrived translated (38 of the first 40), German's equal to the default text and untranslated (LNG-10). The User Interface context holds 412 keys (SD-7). Dev panel "Fail next request" was armed with scopes Save, Delete and Install or Uninstall (SD-1); "Empty templates", "Empty thesauri" and "Empty relationship types" were used for X-10 (there is no "Empty translations").
- Phone runs use a context at 390x844 with touch. Under Playwright's mobile emulation `useKeyboardInset` leaves `--kb` at 1189px from the first paint, which collapses every full-screen dialog to zero height (the Install modal and the Reset dialog showed only a dimmed page). The scripts nudge the viewport by 1px so `visualViewport` fires `resize` and `--kb` becomes 0; after that every phone check passed or failed on its own merits. I could not reproduce the collapse on a real device, so it is recorded here and not as a failure.
- Chromium was closed under two scripts by something outside them (another agent's cleanup on the shared machine); `run-all.sh` retries a crashed script up to three times. The saved JSON and this file come from the last complete run.
- Contrast figures come from computed colours composited over their ancestors' backgrounds (`u.mjs` `contrast()`), light and dark, at 1280 and at 390.
- Every dialog button and menu was reached through the real UI; no state was written from code. Failure injection through the console hook `window.__failNextLanguageInstall()` is reported for reference only (LNG-09); the check itself asks for the Dev panel switch.

## Console errors seen while driving (not counted against a Languages or Translations check)

| Where | Message | Owner |
|---|---|---|
| Settings › Pages, opening a page editor (reached from LNG-10) | `pageerror: Failed to read the 'sessionStorage' property from 'Window': The document is sandboxed and lacks the 'allow-same-origin' flag.` (reproduced on a fresh context by only opening the editor) | Code (Pages preview iframe) |
| Settings › Templates, saving a template with a removed property (reached from TRN-05) | `Warning: validateDOMNesting(...): <ul> cannot appear as a descendant of <p>` from `Modal` (the "Save template" confirm renders a list inside a paragraph) | Design/Code (Templates dialog) |
| Component catalog (Dev panel) | `Warning: React does not recognize the fetchPriority prop on a DOM element` | Code (catalog) |

TRN-05 is recorded PASS because the Translations behaviour is right; if the Templates console error counts against any check it counts against it.

## FAILs ranked by severity

Owner: Code = behaviour/data; Design = layout/copy/a11y.

1. **LNG-15, Reset does not reset (Code, high).** The Reset dialog counts "412 keys in User Interface go back to the predefined Spanish text" and the Beacon logs "Language reset success", but the edited System key keeps its edit (saw `EDITADO-SISTEMA`, expected `"el estado"~5`). Reset only records the notice and the activity entry.
2. **LNG-16, Uninstall keeps the language's edits (Code, high).** After uninstalling Portuguese and installing it again, the edited cell still reads `EDITADO-PT`; expected the default-language text. The dialog says the translated keys "are removed from Translations", so the data and the message disagree.
3. **X-08 on Translations, untranslated pill contrast (Design, high, accessibility).** The amber "untranslated" code pill measures 1.93:1 in light mode and 4.22:1 in dark mode (needs 4.5:1), at 1280 and at 390. Fix the `bg-warning-light` / `text-warning` pair for the pill.
4. **LNG-09, LNG-17 and X-04 (Languages and Translations), failure injection not wired (Code, medium).** The Dev panel arms and reports "Armed: ...", but install, make default, reset, uninstall and the translations Save all succeed, no "An error occurred" entry appears and the switch is never consumed. Only `consumeFailureAtom` callers (Settings deletes, code page editor) honour it. The install failure UI itself works through the console hook (failed row with reason and Retry, one error entry, task ends, Retry restarts).
5. **LNG-12, new default language shows the key text (Code, medium).** After making Spanish (or German) the default, the source column under "Español" shows the English key text (`"the status"~5`) instead of Spanish text (`"el estado"~5`), and the other languages are compared against that, so English reads "untranslated" for every key.
6. **TRN-09, column header is not sticky (Design, medium).** After scrolling the User Interface grid by 1500px the header row sits at -1235px; expected to stay visible. The grid at 1280 also needs horizontal scrolling inside the pane to reach the Arabic and Portuguese columns.
7. **TRN-11, no "same as source" mark (Code, medium).** A value typed equal to the source stays amber and untranslated; there is no control to mark it as translated (the page brief's correction to Uwazi's behaviour).
8. **X-07 on Translations, duplicate row-button names (Design, medium).** "Translate Hearing" and "Translate Judgment" each appear twice (a template and a relationship type share the name), so two row buttons have identical accessible names. The sort buttons "Name" and "Type" also repeat across the two tables.
9. **TRN-17, footer Cancel discards without asking (Code or Design, medium-low).** With an edited cell, "Cancel" leaves the editor at once and the edit is lost; the check expects the "Discard changes?" dialog. All other exits (breadcrumb, back arrow, rail, Library button, data-source switch) do open it.
10. **LNG-PO1, no translated percentage on Languages rows (Code, low-medium).** Rows show name, key, autonym and the Default badge only. The progress exists on the Translations list and in the editor.
11. **LNG-10, Dashboard shows no language count (Design or checklist, low).** The Dashboard has no Languages card (the gap matrix drops it, DSH-11 allows it), so "Dashboard language count increases by one" cannot be seen; the Translations column and the Pages editor language list did follow the install. LNG-16 carries the same clause.
12. **X-10 on Translations, empty state has no hint (Design, low).** With templates, thesauri and relationship types emptied the Content group reads only "No content contexts"; the check asks for a title and a one-line hint (there is no create action on this page).
13. **TRN-08, User Interface key range (checklist and seed, low).** The check says 100 to 200 keys; the context holds 412 (SD-7), sorted case-insensitively without any "term N", but the 412 keys run only from `"Costa Rica"` to "Duplicated email" (the first 412 of Uwazi's file), start with search-syntax strings the prototype never shows, and omit visible strings such as "Library" and "Settings" (searched, not keys). "Dashboard", "Account", "Cancel" and "Active languages" are keys and match the UI.

Other observations that did not change a result:

- The Languages page (and the phone view) has an empty band of about 4rem between the title and "Active languages".
- On phone each language row in the Translations editor shows the code twice (grey code pill plus the amber or grey status pill) and no separate status dot (TRN-20 recorded PASS: stacked rows, status visible, no horizontal scroll, Save and Cancel reachable).
- The CEJIL source lists its languages by autonym ("Español (es)") where the Sample source uses English names (LNG-01 wording).
- The Filters context only appears once a Filters group exists (the seed has none); TRN-01 is PASS after creating a group.
- TRN-18's "context with no keys" leg cannot be reached: every context has at least its name key and Menu and Filters vanish when empty.
