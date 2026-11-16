# QA: OSINT P2 and the P1 fixes (playground 03ddd961)

Date: 2026-10-13. Lane: QA. Nothing fixed, committed or pushed.

## Verdict

No blocking defect. All four P1 defects I reported (D1, D2, D3, D6) are fixed and D4 is fixed for the
case it was reported on; D5 and D7 and the Split pane scope are built as described. P2 behaves as
described: the Contested filter, the three contest headings, conflicting figures, "Replaces", the Vegas
clock marks and sentence, and the Nepal rebuild all match the data. Two small findings (one wording
leftover from D4, one repeated sentence) and three observations are listed at the end.

## What was served

- Detached worktree of `03ddd961` on :1435. `lsof -i :1435` gave the vite PID, `lsof -p` gave cwd
  `.../scratchpad/wt2/app`, `git -C .../wt2 rev-parse HEAD` gave
  `03ddd9616fc6d06ad5d4dedf933320ac285dfd8c`. The worktree and server were removed afterwards.
- Headless Playwright, 1440x900 and 390x844 (touch). Dark was set with the app's Theme control and the
  `dark` class was read back (an earlier run in this session used only `prefers-color-scheme`, which does
  not switch the app; those results were discarded and rerun).
- Baseline for defaults: the `d6a9557b` snapshot from the P1 pass (`harness/defaults-base.json`).

## Rundown

| # | Check | Result | How |
|---|---|---|---|
| 1 | tsc --noEmit | pass | ran in the worktree |
| 2 | npm run build | pass (chunk-size warnings only) | ran |
| 3 | npm run check:evidence | pass, 5 of 5 | ran |
| 4 | scripts/check-evidence-card.ts against :1435 | pass, 5 of 5 | ran |
| 5 | Console and page errors | none in any run | harness collected both |
| 6 | **D1** phone: focus lands in the stacked card, Tab stays inside, Escape closes, focus returns to the chip | fixed | driven at 390 touch |
| 7 | **D1** "Delete relationship?" opened from the preview sheet: focus inside, Escape closes, focus returns | fixed | driven |
| 8 | D1 axe on the phone card (duplicate banner) | 0 violations (was 1) | axe 4.12.1 |
| 9 | **D2** desktop backdrop press: card closes, focus on the chip | fixed | driven |
| 10 | **D3** Death toll 75 claim: facts line "Reported 2025/10" | fixed | driven |
| 11 | **D4** Vegas Taxi dash video, disputed anchors: "Recorded as disputed: this recording's clock is more than 2 s off the moment's median." | fixed for anchors with a clock (see Q1 for one link that has none) | driven |
| 12 | D4 "counted once": an outlet fold reads "Each publisher is counted once." (Gen Z groups record, driven); the wire and both-folds sentences are covered by check:evidence only | fixed for the case reported | driven and unit test |
| 13 | **D6** external-link target | 24x24 on every link measured, layout unchanged | driven |
| 14 | **D5** Dan Bahadur Karki, tree leaf with mixed statuses: shared head plus one section per reference, each named "<record> succeeded <record>, single source / disputed" | built | driven, screenshot r1-d5 |
| 15 | **D7** NHRC Nepal (organisation): the two NHRC PDF quotes name the PDF and print a static "p.1"; on the NHRC action record "Go to page 1" closes the card and opens the Document tab | built | driven, screenshot r3-d7 |
| 16 | Split pane: card is `scope=pane`, spans x 0 to 718 inside the left pane; press on the scrim closes, click inside keeps it, Escape closes and focus returns; right pane stays usable | built | driven, screenshot r3-split |
| 17 | Nepal rebuild vs seed: see "Nepal rebuild" below | pass | script on the shipped JSON and the seed |
| 18 | Contested filter card: shown where a link is disputed or contested, hidden otherwise | pass (hidden on Vegas "60 killed", Vegas "From a car along Mandalay Bay Road", Nepal "Death toll reported on 11 September") | driven |
| 19 | Contested filter counts, rows after ticking, chip, Filters badge, Clear | pass on the records listed under "How the contest sections were checked" | oracle comparison |
| 20 | Card heading, Other side / Same side sizes, conflicting figures, competing claims, "No reason recorded" per link | pass on 8 Nepal records (about 500 links) and 4 smaller ones | oracle comparison |
| 21 | Claim-inherited basis reads "Claim contested" | pass | driven, screenshot p2-nepal-claim-contested |
| 22 | "Disputed by" on a link that is not disputed (HRW and Asia News Network against "Police compelled to fire") | pass | driven, dark |
| 23 | "No reason recorded" on the 5 unexplained links | pass | oracle compares the flag on the 5; one card read |
| 24 | Vegas conflicting figures (More than 1,100 rounds against 900 into the crowd and 1,058) | pass | driven |
| 25 | Vegas "Replaces" (60 killed replaces 58 killed); Contested filter hidden there | pass | driven |
| 26 | Vegas clock marks: 3 anchors, +3, +7, +9 s, all on Volley 5, equal the sync analysis recomputed from the references | pass | driven, vclock-oracle |
| 27 | Clock sentence on the card ("+3 s from the moment's median across recordings, 22:09:47. The sync check allows 2 s.") | pass | driven at 1440 and 390 |
| 28 | Slide-over: own Contested filter, separate from the tab, resets on reopen | pass | driven |
| 29 | Library preview and Split pane carry the Contested filter | not driven in this pass (the slide-over's own filter, row 28, and the card in Split, row 16, were) | not covered |
| 30 | Group headers: 8 of 8, 3 of 3, 7 of 7, 3 of 3 and 4 of 4 headers equal the data (members count, statuses, span text and basis, first page or recording, direction) | pass | script on JSON vs aria-label |
| 31 | Header time axis: bar start and width equal the shared domain; evidence mix widths equal status shares | pass | script |
| 32 | Header height closed vs open | 56 px both; shape line 16 px | measured |
| 33 | Header self-hide: CEJIL shows members and direction only; Sample adds anchoring; no span, no mix | pass | driven |
| 34 | Header at 390: text span only, no track, no overflow, no page overflow | pass | driven, light and dark, Nepal and Vegas |
| 35 | Header accessible name states the summary | pass: e.g. "led to, 3 references; with ...; 3 confirmed; reported 2025/09/12; both directions" | read |
| 36 | Defaults vs d6a9557b (view, group-by, sort, density menu, row count and order, chip size, facet order) | unchanged; only new facets (Contested, Reported by, Publisher, Publisher type) and the header second line differ | defaults diff |
| 37 | axe: panel (collapsed and expanded) and card, Nepal and Vegas, 1440 light and dark, 390 light and dark | 0 violations in all 7 configurations; `color-contrast` left "incomplete" by axe | axe 4.12.1 |
| 38 | Contrast computed for what axe left open: header shape line 7.5 light and 6.5 dark; clock mark 5.2 light and 9.6 dark (11 px text) | pass | computed |
| 39 | RTL: headers, filter panel, card, claim matrix | mirrors, no overflow, axe clean on the card | driven, screenshots |

Not done: tablet width (768 to 1023); Graph and When views; the Library Evidence view's claim matrix beyond
the RTL screenshot; Settings and Storybook; no GUI check in Juan's Chrome.

## Nepal rebuild (778670e8) against the seed

Run against `dev/results/nepal-seed/data/references.json`, `disputed-notes.json`,
`reference-status-corrections.json` and the shipped `public/nepal-data`:

- 5,304 links, same ids as the seed; status, sources and quote equal for all 5,304.
- 524 disputed, 1,102 confirmed, 3,678 single source.
- `disputed-notes.json` has 524 entries and its id set equals the set of disputed links; every disputed
  link has `dispute`, no other link has one; basis, note, opposing, paired and conflicting equal the notes
  (note is left out only where it repeats the seed note).
- 519 explained, 5 unexplained (`ref:8sep-325`, `ref:aftermath-353`, `ref:bg24-127`, `ref:bg24-145`,
  `ref:bg24-151`); the shipped `missing` text is on exactly those 5.
- The 15 links in `recompute` are single source, and each note holds the review reason after "set to
  'single-source' on review:". One read in the UI ("2,660 verified injured" supports link: Single source,
  note with the 2026-10-13 check).
- Himal Press 22 Apr 2025 and The Annapurna Express 7 Nov 2025 exist as Source records with their dates, are
  named as opposing sources on 2 and 5 links, and appear under "Other side" with their quotes (screenshot
  p2-nepal-new-opposing-himal).

## How the contest sections were checked

`contest-oracle.mjs` re-derives, from the shipped JSON, each link's other side, same side, conflicting
figures, competing claims, note, missing reason and heading. It follows the rules in the header comment of
`data/refContest.ts`, so it checks that the data, the model and the rendering agree, not that the rules are
right. The rules were read against examples: the Death toll 17 claim (every link contested because a source
disputes it and Amnesty's 19 conflicts), a supporting source of "Police compelled to fire" (disputed by two
sources), "Cabinet withdraws the social media ban" (entity-level note, two disputed claims on the same side).

For each record the harness opened every evidence card and compared a tuple (relation, target, status,
heading, number under Other side, number under Same side, figures, competing, missing) with the oracle's
multiset, then ticked Contested and compared the UI count and the rows with the oracle.

Records, all equal: Death toll 17 killed; Karki announces martyr status; Social Media Bill tabled (16 links,
3 unexplained); Gen Z protests in Kathmandu (107 links, 31 contested); Police fire at Parliament (216, 35);
Hami Nepal organised the protest (15, all); Sushila Karki (66, 9); Office of the PM (60, 6); Karki sworn in
(33, 11); Cabinet withdraws the social media ban (9, 8); the two new-opposing-source claims (5 and 8);
2,660 verified injured; Vegas More than 1,100 rounds and the hotel security guard claim (3, all).
The Vegas moment and recording records differ from the oracle only in the clock contest, which the oracle
does not model; the clock marks were checked separately (row 26).

## Findings

### Q1. A disputed Vegas link with no clock annotation still says "the sources conflict" (Low, leftover of D4)

Steps: Vegas; open "LVMPD release 6, item 2 . 22:06:01"; Relationships; chip on the first row ("captures .
Volley 1", Disputed).

Expected: no claim of conflicting sources; the note carries the reason ("clock differs ... by -6 s").

Actual: "Recorded as disputed: the sources, or other records, conflict." above the note "This recording's clock
differs from the volley's median by -6 s." No clock mark on the row and no "Contested by" section.

Cause (read): the D4 wording keys on `contest.clock`, which exists only for anchors with a `media.clock`
that the sync analysis can compare. `ref:vegas-01088` has no clock (`media.clock` is null) and the seed
disputed it from the title time. It is the fourth of the four Vegas disputed links.

Recommend: Code; word the disputed sentence by what is recorded ("Recorded as disputed.") when the link has
no opposing source or paired link, or let the Vegas build mark it. Test: unit on `verificationBasis` for a
disputed link with a note and no contest.

### Q2. The same clock fact is printed three times on a disputed Vegas anchor (Low, design)

Row mark "+3 s", the note "This recording's clock differs ... by +3 s", and the Contested by sentence
"This recording's clock is +3 s from the moment's median ...". The note and the sentence say the same.
Recommend: Design; drop the note where `contest.clock` is shown, or fold the two.

### Q3. "No reason recorded." repeats itself on one link (Low, copy)

`ref:8sep-325` (Gen Z protest death toll climbs to 19 reports on the 8 September protests): "No reason
recorded. No disputed evidence entry on either record and no opposing source: the researcher set the status
with no reason recorded." The other four unexplained links read "No reason recorded. The seed's note on ...
only points elsewhere ...". Recommend: Research to trim the `missing` text of that link.

### Observations

- Annotations the map marks partial ("1 sec. in", 17 of them) are not marked as clock outliers, although
  most are more than 2 s from the median. That follows the sync analysis ("left out of every statistic"); the
  row shows no mark for them. Worth stating in the card if a reader asks why an obviously offset one is
  unmarked.
- A Split pane's card covers the pane and leaves the other pane clickable; a click there does not close the
  card. Fine for a pane-scoped overlay; noting it because the viewport-scoped card elsewhere does close.
- The Library search leaves the "Recent searches" popup open behind the preview sheet at 390 after Enter
  (visible in the phone screenshots). Not P2.

## Files

Screenshots `p2-*.png` (P2 and the P2 surfaces), `r1`, `r3`, `r4-hdr-*` (P1 fix retests and group headers),
`v1088-rows.png`. `harness/` has the scripts and `defaults-p2.json`; `expect.mjs` reads the worktree's
`public/`, so change `ROOT` to rerun.
