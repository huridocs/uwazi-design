# Uwazi 2.0 clips — MAIN set (QA lane, 2026-09-27)

Per the standing rule (Juan, 2026-09-27): promo/demo clips record `main` only, no motion blur.

Served build: `origin/main` `33d72d83`, own fresh worktree, port 1426 (verified via lsof cwd + rev-parse).
Server and worktree removed afterwards. Playground's earlier set in `dev/clips/` is untouched.

Method: same as the playground pipeline (headless Playwright Chromium, 1440x900, light theme,
recordVideo, ffmpeg-static), with two changes for this brief:
- 2x device-scale capture throughout (`--force-device-scale-factor=2`, downsampled to 1440x900),
  so zoomed frames stay sharp.
- No motion blur anywhere: removed the cursor motion-trail effect and the `tmix` frame-blend step
  from the zoom/pan filter in both the per-clip edit and the reel. Zoom and pan moves are unchanged.

Scripts: `dev/clips-main/src/`.

## Files (dev/clips-main/)
Raw 30fps: 01-library 20.8s, 02-search 24.5, 03-entity 19.7, 04-relationship-fields 12.1,
05-relationships-graph 21.5, 06-text-references 28.5, 07-input-data 22.8, 08-timeline-filtering 14.1
edited/ — same clips at 60fps with zoom moves, no blur.
uwazi-2-full.mp4 2:54.6 | uwazi-2-reel.mp4 28.4s 1080x1920 | uwazi-2-reel-cover.jpg
Both cuts use the post's wording (dev/results/uwazi-2-post.md) for section titles / captions,
same as the playground set.

## What differs from main (flows dropped or substituted)

Checked by driving the app; main lacks several features the playground briefs assumed:

- **08 timeline-filtering — no substitute possible, used the Filters drawer's Date facet instead.**
  Main's Library has no Timeline view at all (`LibraryViewMode` = `cards | list | map | results`
  only — no `LibraryTimelineView.tsx`, no `TimeSpine` component). There is no time-based chart to
  show on main. Closest main flow: the Filters drawer's **Date** card (Last year / Last 5 years /
  Last 10 years presets + a custom range), which does filter by time. Clip shows: open Filters,
  click "Last year" (53 → 10 of 53 entities), then clear it. No timeline visual — recommend Code
  or Design decide whether Timeline view should land on main, since right now "time-based
  filtering" only exists as a plain facet there.
- **01 library — Map substituted for Timeline.** Main's View switcher is Cards/List/Map/Results
  (no Timeline entry), so the clip cycles Cards → List → Map → Cards instead of grid/list/timeline.
- **07 input-data — click-to-fill is not reachable on main, so it's dropped.** Two things playground
  had that main doesn't:
  - The entity Document-tab drawer's Edit button is still a stub toast ("Editing metadata") on
    main, same defect QA reported before Code's playground fix — that fix hasn't landed on main.
  - More importantly, main's Metadata edit form is **not scoped to survive a tab switch**: opening
    Edit on the Metadata tab, then switching to the Document tab, pops a native "Discard unsaved
    changes?" confirm dialog — main doesn't keep the edit session open across tabs the way
    playground's `fillTargetAtom`/click-to-fill design does. So there is no way to arm a field,
    switch to the document, select a passage, and fill it, on main today.
  Substitute: the clip shows direct metadata editing instead — type into Series and Description
  by hand on the Metadata tab, Save, then Bert (⌘K, "summarize this case", streamed reply). This
  is a real capability gap, not just a UI-path difference; recommend Code for whether/when
  click-to-fill ships to main.
- **02 search — works as briefed**, no substitution. Passage-click page jump landed correctly on
  the entity's real file in both repeat runs I checked (no repeat of the intermittent
  wrong-page bug I reported against playground `8b5695bb` — worth noting main and that playground
  commit are different code paths for this, so the two aren't directly comparable fixes).
- **03, 04, 05, 06 — work as briefed, no substitution.** Entity Document/ToC/Metadata/Relationships/
  Files tabs, the CEJIL "Jueces firmantes" relationship table (país inherited per judge) and its
  overlay, Relationships list→tree→graph, and the document minimap + create-relationship flow are
  all present on main and behave the same as playground for these clips. One difference worth
  flagging: clicking a document node in the Relationships **graph** does not open a slide-over
  overlay on main — it navigates the whole page to a two-pane Document/Relationships view. Same
  end result (you see the connected entity), different mechanism than playground's overlay.

## Not verified beyond contact sheets
As before, I checked frames via ffmpeg contact sheets and single-frame extracts, not by watching
the videos at playback speed.
