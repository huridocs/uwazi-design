# QA: OSINT P1, "Evidence behind every link" (playground b1f5de0f)

Date: 2026-10-13. Lane: QA. Nothing was fixed, committed or pushed.

## Verdict

P1 does what its description says. Data on the card matches the shipped JSON on every card compared
(about 700 cards across Nepal and Vegas, list and tree). Filters narrow correctly, are scoped, and
self-hide. No Relationships default changed. tsc and build pass. No console or page errors in any run.

Seven findings, none blocking. Two are Modal behaviours that existed before P1 and now show up in the
new card (D1, D2). Four are P1's own: a precision slip (D3), a copy slip (D4), a design gap (D5) and a target size (D6). One is a
data-presentation limit (D7). Details and repros are below.

## What was served and how it was confirmed

- Detached worktree of `b1f5de0f` (not the shared checkout; HEAD there is 64bd7e52, which only adds
  CLAUDE.md lines over b1f5de0f).
- `lsof -i :1435` gave the vite PID, `lsof -p <pid>` gave cwd `.../scratchpad/wt/app`,
  `git -C .../wt rev-parse HEAD` gave `b1f5de0f4eebfd3351163d6afe081d7c59032691`.
- For the defaults comparison the same port was re-pointed at a detached worktree of `d6a9557b`
  (same lsof chain, `d6a9557bf79c...`), then back to b1f5de0f.
- Driven with Playwright headless Chromium (1440x900 and 390x844 with touch). Juan's Chrome was not used.
- Harness is in `harness/` (scripts, not part of the app). `expect.mjs` has an absolute path to the
  worktree's `public/`; change `ROOT` to rerun.

## Rundown

| # | Check | Result | How |
|---|---|---|---|
| 1 | tsc --noEmit | pass | ran in the worktree |
| 2 | npm run build | pass (chunk-size warnings only) | ran in the worktree |
| 3 | Console and page errors | none in any run (about 30 runs) | harness collected `pageerror` and `console.error` |
| 4 | Chip becomes a button only where refs carry sources or a note; aria `Evidence: Confirmed, 7 sources` | pass | driven, aria-labels read |
| 5 | Card opens from reference rows: tab, drawer | pass | driven (33 of 33 chips on the Karki event) |
| 6 | Card opens from tree leaves (aggregates), tab and drawer | pass | driven (43 leaves on Karki event; 74 on Sushila Karki; 53 on OPM) |
| 7 | Card in entity slide-over, confined to the panel | pass (card x 893..1440 equals panel) | driven, screenshot 03 |
| 8 | Card in Library preview | pass, card is app-wide there | driven, screenshot 04 |
| 9 | Card in a Split pane (left and right) | pass, card centred across both panes | driven, screenshot 05; see D8 |
| 10 | Card in phone sheet; stacks over the preview sheet; Back and Close all | pass | driven at 390, screenshot 06 |
| 11 | Card content vs data, all rows | pass: 0 mismatches | see "Data check" |
| 12 | Five spot checks vs relationships.json and Source records | pass | see "Spot checks" |
| 13 | Source record button opens preview, card closes | pass | driven |
| 14 | External link: `target=_blank`, `rel=noopener noreferrer`, URL equals the Source `url` | pass; popup opened, `window.opener` null, original card stays | driven with external hosts stubbed |
| 15 | Escape closes the card; focus returns to the chip (desktop: drawer, tab, slide-over, preview, Split) | pass; in the slide-over the first Escape closes only the card, the second closes the slide-over | driven |
| 16 | Close x returns focus to the chip | pass | driven |
| 17 | Backdrop click closes the card | closes; focus goes to body, not the chip | driven; D2 |
| 18 | Focus trap (Tab 14 times, Shift+Tab) | pass on desktop; focus never left the card | driven |
| 19 | Escape and initial focus on a phone sheet | FAIL | driven; D1 |
| 20 | Rapid repeat: double-click, open/close x10, Enter and Space on the chip | pass: one card, focus back on chip | driven |
| 21 | Viewport crossing 1440 to 390 with the card open | card closes, no error | driven (acceptable) |
| 22 | Chip click does not activate the row or move the PDF | pass (page stays 1 of 8; page tag still jumps to 4) | driven |
| 23 | Filter Reported by | pass: 33 to 20 for 2025/09/12, equals JSON | driven |
| 24 | Filter Publisher (Al Jazeera 12) and Publisher type (News agency 5; both 3) | pass, equals JSON | driven |
| 25 | Chips, Filters badge (1, 2, 3), per-card Clear, footer Clear | pass | driven |
| 26 | Faceted counts under active filters | pass, ticked facet keeps its own options | driven, screenshot 10 |
| 27 | Per-scope: slide-over filters separate from tab; slide-over resets on reopen | pass | driven |
| 28 | Self-hide on CEJIL and Sample: no chips, no Reported by, Publisher, Publisher type | pass | driven, screenshots 17 and 18 |
| 29 | Self-hide on Vegas: Taxi dash video (one publisher, undated) shows none of Reported by, Publisher, Publisher type; Volley 1 (3 publishers, no dated source) shows Publisher and Publisher type, no Reported by | pass | driven |
| 30 | Defaults vs d6a9557b: view, group-by, sort, density menu, group headers, row order, chip size, facet set | pass; only the new Nepal/Vegas facets differ | driven on both builds, diff of `defaults-*.json` |
| 31 | Dark | pass | driven, screenshot 08 |
| 32 | RTL (Test RTL layout) | pass: layout mirrors, no overflow; English text shows the usual trailing-punctuation artefact | driven, screenshot 09 |
| 33 | axe on the card: desktop light and dark, RTL | 0 violations | axe-core 4.12.1 run on the card element |
| 34 | axe on the card: phone dark | 1 violation: `landmark-no-duplicate-banner` | driven; D1 notes it is the stacked-sheet header |
| 35 | Quote text contrast | about 12.6:1 light, 9.8:1 dark (axe left it "incomplete" because the fill is translucent) | computed |
| 36 | Performance: Expand all on a 216-row record | about 100 ms on both builds | driven |
| 37 | Vegas time tags | pass: 11 of 11 and 3 of 3 anchors equal offset, label and clock from JSON | driven |
| 38 | Nepal data audit (build output) | see below | script on the JSON |

Not done: no GUI check in Juan's Chrome; no tablet width (768 to 1023); Graph and When views were not
opened (no chip there); no check of `handoff/` docs or Storybook (P1 added no story by design).

## Data check

For each evidence button the harness opened the card, scraped it, found the reference in
`relationships.json` (by target title, source set, note, status), and compared:
status basis sentence, the facts line (sources, independent publishers, copies, references, reported
range, undated), notes, sources (publisher, type, date or "Read ..., no publication date", title, URL,
syndication text), each quote with its page tag, loose passages, and the media anchor.

Compared and equal:

- Nepal list rows: Karki sworn-in (33), Police fire at Parliament (200, cap), Sushila Karki (66), OPM (60),
  Gen Z groups meet the army chief (16), Hami Nepal claim (15), Dan Bahadur Karki (6), Death toll 75 (5),
  NHRC press release (1) and NHRC action (3).
- Nepal tree leaves (aggregates of several references): Karki sworn-in (43), Sushila Karki (74),
  OPM (53), Dan Bahadur Karki (7).
- Vegas: Volley 5 (48), Volley 1 (26), Taxi dash video (13), From a car along Mandalay Bay Road (5).

Not compared in this run: Vegas tree leaves; the 911-call Source record (the search by the
title I tried did not open it).

## Spot checks (five links, plus two)

| Reference | Card says | JSON says |
|---|---|---|
| `ref:t1014-089` (Karki sworn in, led to, House dissolved) | 7 sources, 7 independent, Reported 2025/09/12 to 2025/09/15; Khaleej Times "with inputs from Reuters, PTI"; Deccan Chronicle "agency copy; agency not named on page" | same 7 sources, dates, syndication strings |
| `ref:t1014-082` (Friday talks at Sheetal Niwas) | 5 sources, 5 independent, Reported 2025/09/12; Tribune (India) syndication ANI; 6 quotes | same |
| Hami Nepal disputed claim, Onlinekhabar | disputed, 1 source, "Recorded as disputed", Reported 2025/09/17, 2 quotes | `verification: disputed`, `published` 2025-09-17 |
| `ref:docanchor-gon-cabinet-decisions-2082-bhadra-...-cabinet-directs-pla` | single source, Reported 2026/01/07, note "Quote located on page 4 ...", quote tagged p.4 | `file` and `page: 4`, note equal; the record's `docs[0]` equals `file` |
| `ref:claimed-by-death-toll-75-2025-10-0` | 1 source, "SOPA Images", source date 2025/10, facts "Reported 2025/10/01" | source `datePrecision: month`; see D3 |
| `ref:t1014-258` (Karki ineligible claim) | 4 sources, 4 independent, Reported 2025/09/12 to 2025/10/15 | same |
| `ref:vegas-00012` (Taxi dash video captures Volley 5) | disputed, note "+3 s", source undated (read 2026/10/07), anchor 0:00 and "5th Volley (2nd Burst Echo) 22:09:50" | `media.offset 0`, `clock` 22:09:50, `note` equal |

Dates print in UTC (`formatAtPrecision` reads UTC), so they do not move with the viewer's time zone.

## Data audit (JSON)

- Nepal: 5,302 references, all with sources, 986 with a note (matches the report). 899 distinct sources,
  no source missing from the records, no publisher missing, none without URL; 212 undated (5 with no
  `accessed` either: the card prints no date for those); 88 carry a syndication string that differs from
  the publisher.
- Status vs independent count under the seed rule: confirmed always 2 or more, single-source always 1,
  disputed 1 to 3. So no Nepal reference takes the "Recorded as ..." fallback except disputed. The report
  mentions "14 and 29 mismatches the synthesis flagged"; I could not reproduce counts of 14 or 29 from the
  shipped file. Vegas: 697 confirmed have 1 independent publisher, 26 single-source have 2 or 3 and 3 have
  none; all of them print "Recorded as ..." plus the note.
- No phone number or e-mail pattern in any note (both corpora). The Vegas denylist is not in the repo, so
  names were not checked.

## Defects and observations

### D1. Phone: initial focus is lost and Escape does not close the card (Medium, existed before P1)

Steps: 390x844 touch viewport; Nepal; search "Sushila Karki sworn in"; tap the card "Preview"; sheet
opens; Relationships tab; Expand all; tap any status chip; press Escape.

Expected: focus moves into the card (Back or Close), Escape closes the top layer and focus returns to the
chip.

Actual: card opens, `document.activeElement` is `<body>`, Escape does nothing, and the card stays. Back
(the arrow) closes it and does return focus to the chip. The same happens with the keyboard (focus the chip,
Enter, Escape).

Cause (read plus focusin log): the first render of the Modal is not yet a stacked layer, so its header
draws the plain Close button and the focus trap puts focus there (`in:Close`). The layer registers in a
layout effect, the header switches to the stacked-sheet header (Back, Close all) and the focused button is
unmounted (`out:Close`); the trap's initial-focus effect does not run again, so focus ends on body, and
Modal's Escape handler is on the panel's `onKeyDown`, which never receives the key. Not P1-specific: the
existing "Delete relationship?" confirm opened from the same sheet behaves identically (checked), and
axe's `landmark-no-duplicate-banner` on the phone card is the same stacked header.

Recommend: Code, fix in `Modal.tsx` / `useFocusTrap.ts` (re-run initial focus when `layer.stacked`
changes, or attach Escape to the document for the top layer).

Test to add (fails now, passes after): Playwright at 390 with touch: open the card from the preview sheet,
expect `document.activeElement` inside `[data-component="RefEvidenceCard"]`, press Escape, expect no card
and focus on the chip.

### D2. Backdrop click closes the card but focus ends on `<body>` (Low, existed before P1)

Steps: any desktop surface; open a card; click on the dimmed area outside it.

Expected: as with Escape and x, focus returns to the chip.

Actual: card closes, `document.activeElement` is `BODY`. Verified on the drawer; same Modal everywhere.

Cause (read): `Modal` closes on the scrim's `onMouseDown`. `EvidenceStatus.onClose` focuses the chip
immediately; the browser's default mousedown action then moves focus to body.

Recommend: Code, close on `click` (or focus in a `queueMicrotask`/`requestAnimationFrame`).

### D3. "Reported" in the facts line invents a day for a month-precision source (Low)

Steps: Nepal; open "Death toll: 75 (photo agency caption, about October 2025)"; Relationships; chip.

Expected: "Reported 2025/10", as the source row prints.

Actual: facts line "Reported 2025/10/01"; the source row says "2025/10". Screenshot 13. One source in the
data has month precision (4 references).

Cause (read): `RefEvidenceCard` builds `reported` from `summary.firstReported` with `day(...)` at the default
"day" precision and ignores `RefSource.datePrecision`. The Reported by filter has the same first-of-month
reading (`published` is stored as the 1st).

Recommend: Code. Test: unit on the card, a source with `datePrecision: "month"` prints no day in the facts.

### D4. "Disputed" sentence claims a source conflict where none exists (Low, Vegas)

Steps: Vegas; open "Taxi dash video · 22:09:50"; Relationships; chip on the row "captures · Volley 5"
that says Disputed.

Expected: only what was recorded.

Actual: "Recorded as disputed: the sources, or other records, conflict." beside the note "This recording's clock
differs from the volley's median by +3 s." Vegas statuses come from a timing check, not from conflicting
sources. Screenshot 14. Four Vegas references are disputed.

Cause (read): `verificationBasis` states the same sentence for every corpus.

Recommend: Code (or Research for wording): "Recorded as disputed." and let the note give the reason, or
make the sentence per corpus.

### D5. A mixed aggregate loses which status, note and source belong to which reference (Low, design)

Steps: Nepal; "Dan Bahadur Karki"; Relationships; Tree; open the "succeeded · Chandra Kuber Khapung" leaf.

Actual: two status chips (Single source, Disputed), "Held since 2025", two notes and two sources in one
list, with no link between them. Screenshot 12.

Recommend: Design to decide: one section per reference when the statuses differ.

### D6. External-link icon is 16x16 (Low, a11y)

Actual: the "open at its source" anchor is 16x16 px on desktop and phone. axe does not flag it; WCAG 2.2 AA
2.5.8 asks 24x24 unless spacing makes up for it, and on a phone this is a thumb target next to a wide
button.

Cause (read): `ExternalLink size={12}` with `p-0.5`.

Recommend: Code: give the anchor a 24px hit area (negative margin if the layout must not move).

### D7. Quote page tags drop where the focused record does not show the PDF (Low, limit)

Nine references list a quote from a bundled PDF page on records that do not show that PDF (for example
`ref:md-024`, from `organisation:nhrc-nepal`; `md-015`, `md-017`, `md-021`, `md-026`, `md-031`, `md-033`,
`md-046`, `md-048`). The quote appears under the Source with no `p.N`, although the Source is the document
and the page is known. This follows the documented rule (page tag only on a record that displays that PDF),
so it is a product decision rather than a bug: recommend Design/Operator decide whether the card, which
names the Source, may print a static page tag from the source's own file and page.

### D8. Observations, no action needed

- In Split the card is app-wide: it is centred across both panes and its scrim covers the divider
  (`scope="pane"` is not used). Screenshot 05.
- The basis sentence ends "A wire copy counts once." also where the folded source is a second story from
  the same outlet (Setopati twice on Gen Z groups meet the army chief: "4 sources, 3 independent, 1 from
  a publisher already counted"). The facts line is right; the sentence is slightly off.
- When the card is open and the viewport crosses the phone breakpoint it closes (rows remount).
- Two `RelationshipsFilters` instances are mounted in the entity view (slide-over and drawer tab), both
  reading the same scope. Pre-existing; relevant only to anyone scripting the panel.

## Tests to add (specified, not written)

1. Unit, `utils/refEvidence.ts`: `independentPublishers` folds a source whose `syndicatedFrom` equals another
   source's publisher; `evidenceSummary.copies`; `refReportedBy` keeps undated links; `verificationBasis`
   for (confirmed, 1 independent) returns "Recorded as confirmed.".
2. Unit, card: a month-precision source prints "2025/10" in both the facts line and the row (fails now, D3).
3. Unit, `verificationBasis("disputed", ...)`: no "sources ... conflict" wording for a Vegas-style input (D4).
4. Playwright, phone: focus and Escape on the stacked card (D1).
5. Playwright, desktop: backdrop click returns focus to the chip (D2).
6. Playwright regression for the existing behaviours above: slide-over Escape order, scope isolation of the
   three new filter atoms, and "Clear" reset (the checks in `harness/filt4.mjs`, `filt6.mjs`).

## Files

Screenshots 01 to 19 in this folder. `harness/` has the scripts and the two `defaults-*.json` snapshots.
