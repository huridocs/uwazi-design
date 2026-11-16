# QA: merged Results work on playground 0e151f45
Served from my own detached worktree on :1426 (lsof -> cwd -> `git rev-parse` = 0e151f45, `git status` clean apart from the node_modules symlink). Headless Chromium (Playwright), 1440x900 unless stated; other widths by viewport emulation, Juan's Chrome window not used. Screenshots: dev/results/qa-results-0e151f45/. No console errors in any run.

## FAIL
1. Passages ranks by raw hits, not by best page. AND query "tortura militar amnistia": first row is p.22 of the Union Patriotica report (2 of 3 terms, 11 hits); p.99 of El Mozote (3 of 3 terms, 7 hits) is row 8; p.125 (3 of 3, 3 hits) is not in the first 12. Cause: ResultsMainView.tsx:900 `rows.sort((a, b) => b.hits - a.hits)` ignores `termsHit`. Shot: and-passages-light.png.
2. Spine picks the densest page, not the best. El Mozote's spine row quotes p.116 (2 of 3 terms, 9 hits), not p.99 (3 of 3). Cause: bestPassage, ResultsMainView.tsx:1239-1240 compares `hits` only. Shot: and-spine-light.png.
3. Spine excerpts do not reach the row edge and are one line: truncated with an ellipsis at about x=650 with ~200px free before the type label; the El Mozote row's "Borrowed document . p.152 . 12x . from I..." is cut at the slot edge. Shots: amnistia-spine-light.png, and-spine-light.png. (If a one-line spine excerpt is intended, this is an expectation mismatch, not a bug.)
4. "N matches" is hover-only. The span is not focusable (tabIndex -1), so its hint never shows on keyboard focus. Hover text is right ("12 matches on this page"). ResultsMainView.tsx:1032. Other four footer targets show their hint on focus.

## Minor / observations
- Mark background overlaps the preceding glyph: "auto|amnistia" renders the "o" partly covered by the rounded highlight, all layouts. Shot: mark-overlap-zoom.png.
- Focus ring on entity/source/"also under" is `ring-1 ring-carbon/40`: visible in both themes but a pale 1px blue in light (focus-zoom-*.png); contrast not measured.
- Jumps to a page beyond the borrowed stand-in PDF do nothing visible: El Mozote's preview PDF has 32 pages; source label / page tag for p.113, p.116, p.152 leave scroll at 0/8136 while the row goes selected. Own-document jumps work (see PASS). Data limitation, not a regression.
- After "Show all", the clicked button is relocated from y=630 to y=3225 (end of the expanded list); header/toolbar/title positions are unchanged.
- Passages and Tree change row heights live while the drawer is dragged: Passages rows 2-3 move 263->241 at 600px drawer; Tree first card 275->394 and row 2 top 430->549 between 360 and 460px. Grouped and the drawer Results tab are constant. Reflow with width, so may be expected; flagging because the brief said no shift while dragging.
- Entity Search tab uses all-terms-on-one-page for the AND query: "2 matches" for El Mozote (p.99, p.125) and "No matches" for the Union Patriotica report, where the Library counts 81 and 170 matched pages. Different definitions on two surfaces; not changed by these commits as far as I checked.

## PASS
- Excerpts to the row edge with 2-4 lines of context and marks on terms: Grouped, Tree, Passages, drawer Results tab; light and dark; CEJIL "amnistia", "desaparicion forzada", Sample "violated" (shots amnistia-*-light/dark.png, Sample-violated-*).
- Best pages first on the AND query in Grouped, Tree and drawer: UI order checked against my own ranking of fullText.json (distinct terms, then hits, then page): El Mozote 81 matched pages, top 5 = 99,125,116,113,151; Union Patriotica 170 pages, top 5 = 22,15,134,9,108. Both match, and match the badges.
- Badge wording: "35 passages", "81 passages", "170 passages", "1 passage", "2 fields", "1 field", Sample "7 passages"; same in drawer.
- Properties above Document (stacked, same left edge, 8px gap) at 390, 768, 1024, 1280, 1440, 1920, 2000; no horizontal page overflow at any of them. Only one entity in "amnistia" has both sections, so one sample.
- Passages footer: entity button opens the preview (Document tab); source label and page tag jump to the page in the entity's own document (p.22, p.9, p.15 scroll to 10655, 4064, 7106 of 119169 = page*507); selected row highlight follows. "also under 4 entities": opens on click/Enter, lists the 4 entities, focus inside, Escape closes and returns focus to the trigger, outside click closes, an entry opens that entity.
- Keyboard: tab order per row is entity, source, page tag, also-under, then the next row; each shows its hint on focus; ring visible light and dark.
- No shift: Show all (chrome), six match-type chip toggles (masthead, chips, toolbar positions fixed), drag of the drawer in the drawer Results tab (chip row 106, first card 175 at 460->720, clamped at half width) and in main-pane Grouped (tops and heights constant 360-700).
- window.__gutter(): pass, start 12 / end 12, no overflow, drawer Filters and Results tabs, light and dark.
- Entity Search tab reads in page order: "amnistia" on El Mozote lists p.3, p.4 (35 matches), not p.152.
- No-match "zzqxv": "0 results" and "No matches for ... / Clear search" in all four layouts, both themes. "desaparicion forzada": 690 results, all layouts, both themes.

## Not exercised
Field-row source label (Resumen -> property), RTL/Arabic, the mobile bottom-sheet Results, __gutter() with an entity preview open, Spine hints, Tree/Grouped keyboard traversal, Chrome (not headless) rendering.
