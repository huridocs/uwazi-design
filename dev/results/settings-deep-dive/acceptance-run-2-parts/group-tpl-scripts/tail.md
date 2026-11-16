## Additional findings (not tied to one check id)

1. Template delete refusal copy (TPL-18): with an inherit path through the deleted template the dialog prints "Properties can not be deleted because are being inherited: [properties=via_to_target]". A raw property id and a grammar slip reach the user. Owner Design (copy) with Code.
2. Phone dialogs and sheets (X-06, UPL-17, TPL-26): `useKeyboardInset` published `--kb: 1189px` at load in the Playwright mobile emulation (innerHeight 844, visualViewport 844 when read afterwards) and never re-measured, so the Modal, ConfirmDelete and Import asset sheets, which pad by `var(--kb)`, rendered below the viewport and could not be tapped. Re-running the app's own listener (`visualViewport` resize event) fixed it, and the phone checks above were driven after that. This may be an emulation artefact; the hook reads `innerHeight - visualViewport.height` once at mount and only on visualViewport resize and scroll, so a wrong first value sticks. Owner Code, confirm on a real phone.
3. Activity log on a phone: the Date range controls wrap so that "To" ends one line and its input starts the next (shot `ACT-visual-dark-phone.png`). Owner Design.
4. Environment: other QA agents on this machine close headless Chromium processes now and then (pages "closed" mid-script). The scripts here launch a renamed copy of the headless shell (`lib.mjs` `launch()`), and `run-all.sh` retries a script that dies. The path in `lib.mjs` is under this session's scratchpad.

## FAILs ranked by severity

| # | Severity | Owner | Checks | What |
|---|---|---|---|---|
| 1 | High | Code | X-04 on Templates and Uploads, ACT-17 | Driven: with the SD-1 "Fail next request" switch armed, Templates Save and Delete, Uploads Import or Upload, Save (rename) and Delete, and the Activity log Read all succeeded and added no "An error occurred" entry (after the Templates Delete attempt the Dev panel still read Armed). The source references the switch only in the Pages delete dialog and the Pages code editor. The failure half of X-04 and the ACT-17 Retry state cannot be reached through the Dev panel. |
| 2 | High | Code | ACT-12, ACT-13, X-09 (Activity log) | Preserve "Add source" shows a Beacon message but adds no row to the Preserve list and no Activity log entry, so one of the five actions in ACT-12 is missing. |
| 3 | Medium | Code | TPL-04, TPL-20, ACT-18 | Opening the Court Case template editor logs a React duplicate-key error ("two children with the same key, Judgment", `PropertyRow` in `TemplateEditor.tsx`). Behaviour of the three checks is otherwise correct. |
| 4 | Medium | Code | TPL-17, X-06, X-07 | The template delete dialog logs `validateDOMNesting`: a `<ul>` inside a `<p>` in the Modal message. Logged every time it opens. |
| 5 | Medium | Code | UPL-12, UPL-15 | The Pages editor preview throws a pageerror ("Failed to read the 'sessionStorage' property ... sandboxed and lacks 'allow-same-origin'") each time it loads or updates. Upload behaviour is otherwise correct. |
| 6 | Medium | Design with Code | TPL-22 | A template with entities cannot be deleted and the reason offers no action; Uwazi's way forward (the Change template dialog with those entities selected) is plain text. |
| 7 | Low | Design | TPL-02 | The Library Type facet rows have no colour dot, so the colour is not the same in all three places. |
| 8 | Low | Design | X-07 (Templates) | The 11 "Set as default" stars share one accessible name; use "Set as default: <template>". |
| 9 | Low | Design | TPL-24 | No-match body reads "Nothing matches “zzzz”" and does not name the object ("No templates ..."). |
