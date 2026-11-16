# CLAUDE.md rewrite: what changed (B1, for Juan's review)

**Files:**
- Proposed: `dev/results/CLAUDE.proposed.md`
- Based on: CLAUDE.md at playground `962922e5`
- Status: nothing committed, and the tracked CLAUDE.md is unchanged.

**Size:** 813 → 314 lines, and about 8,400 → 3,000 words.

## Structure
- **Old:** 26 top-level sections, grouped by the order they were added.
- **New:** 9 sections:
  - Stack and commands
  - Working with Juan
  - Vocabulary (new)
  - Data model
  - Layout and style
  - Accessibility
  - Surfaces
  - Performance traps
  - Where context lives
- **"Don't" list removed.** Each of its items now appears once, in its own section.
- **"Style handoff" section folded** into Tokens and "Where context lives".

## Stale facts corrected (checked against the code)

| Old text | New text | Evidence |
|---|---|---|
| `GroupByControl.tsx` in the file tree | The file tree is gone. The toolbar line names `RelationshipsDisplayMenu` (zoom, group-by, sort). | The file does not exist. |
| `<RelationshipRow kind="reference" ref={ref}>` | Prop `reference` | `RelationshipRow.tsx:9` |
| "the `pageJumpAtom` idiom" | "like `scrollToPageAtom`" | `atoms/selection.ts:44-64` |
| Metadata drawer tabs "Document → Connections → Files → Template" | "Document, Relationships, Files, Template" | `MetadataView.tsx:1685-1686` |
| "Connections tab … default panel mode is `tree`" | Removed. The drawer shares `viewAtom`, and it defaults to `list`. | `atoms/filters.ts:7`. The `"tree"` default belongs to the unused `relationshipsViewModeAtom` (l.218). |
| Beacon: "same fill as `ActionBar` buttons, which … carry the `WARM_EDGE` inset ring" | Beacon: `bg-warm` with no edge. The action-bar rule stands on its own. | `warmButton.ts:25-37` |
| Label mix "moved 70 → 65 → 55" | `--label-mix` (55%, `tokens.css`) | `tokens.css:38`, `typeColor.ts:49` |
| `useFocusTrap` "Used by ConfirmDialog, …" | "`Modal` does this for every dialog" | `ConfirmDialog.tsx:3,34` |
| Mobile: `AdaptiveSplitView` → `MobileBottomSheet`, plus a pointer to `pending.md` (2026-03) | Describes the sheet stack: `sheetStackAtom` and `useSheetLayer`, which both `MobileBottomSheet` and `Modal` register with. | `atoms/sheetStack.ts`, `hooks/useSheetLayer.ts` |
| Dev → `:5173` | Also says to use the port Operator reserves. | — |

## Moved out (it belongs in memory or git, not the spec)
The following no longer appear in CLAUDE.md. Most of it is already in memory (`session-cejil-recovery-thumbs.md`, `typography-ia-standardization.md`, `operator-session-*`); anything that isn't should be copied there before this lands.
- **Dates and incident accounts:**
  - "post-audit, 2026-07"
  - "Partially closed (2026-07-08)"
  - "Three things it settled in 2026-08"
  - "Panel state is per scope (2026-09-27)"
- **Colour contrast history:** the label-mix history and its contrast figures (#BE123C 3.98, etc.).
- **Gutter history:**
  - Why the entity tabs share one gutter tier (the 4px strip shift, 2.7px per column).
  - The retired `px-3.5`.
- **CEJIL pilot numbers:** 733KB mean PDF, 5.2GB projection, 26 docs / 19.9MB committed.
- **Search performance numbers:** scan costs, settle 5,379 → 2,990ms, commits 43 → 22, heap 434.8 → 326.2MB.
- **Earlier thumbnail treatments:** "two earlier treatments … don't reintroduce them", the 221px vs 371px bitmap, and the `QuietMark` explanation.
- **Click-to-fill fixes:** the account of "two adjacent defects fixed in passing".
- **Removed-code notes:** `inheritedRegistry.ts` DELETED, `copyFrom.ts` atoms removed, "the old single-level-only rule is gone".
- **Beacon internals:** `UwaziLoader` colour-tone props and `activityIntro` timing. These can be read from `Beacon.tsx`.

## Rules kept but shortened
Every rule in the old file is still there. The wording is shorter:
- Headings name topics. "one record, two projections", "one body, two hosts", "where the evidence lives" and "that bite" are gone.
- There are no all-caps words and no metaphors. The "frightening", "tells the truth" and "poster" sentences are gone.
- The gutter rule became a three-row table plus six bullets.

## New
- **Vocabulary section:** 12 rows from the language audit glossary. It names the terms the code should move toward. Some code still uses the older terms until batches B8–B10 land, for example `EntityOverlay`, `FiltersDrawer` and the `"connections"` tab id.
- **Branch rule:** "work lands on `playground`; `main` takes only what Juan names" is now stated in Stack. Before, it lived only in memory.
- **Radii line:** the radii override, which before was only in memory.

## For Juan to decide
1. **Performance numbers.** Should they stay out, as proposed, with the rule kept and the evidence in memory?
2. **Vocabulary section.** Should it land before the renames, as proposed, so new code uses the target terms? Or after?
3. **Main.** Main's CLAUDE.md (784 lines) has the same stale rows. Should this rewrite also be ported to main, keeping main's "one treatment" thumbnail text?
