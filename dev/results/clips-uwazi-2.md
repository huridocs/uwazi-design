# Uwazi 2.0 clips (QA lane, 2026-09-26)

Served build: playground 267405d3, own worktree, port 1426 (verified via lsof cwd + rev-parse). Server and worktree removed afterwards.
Method: headless Playwright Chromium, 1440x900, light theme, recordVideo; ffmpeg-static (no system ffmpeg). Scripts + focus-rect logs: dev/clips/src/.

## Files (dev/clips/)
Raw 30fps: 01-library 20.4s, 02-search 16.8, 03-entity 18.1, 04-relationship-fields 13.1, 05-relationships-graph 20.8, 06-text-references 22.6, 07-input-data 20.7, 08-timeline-filtering 19.0
edited/ (60fps, zoom + motion blur): same names/durations
uwazi-2-full.mp4 2:39.8 | uwazi-2-reel.mp4 27.8s 1080x1920 | uwazi-2-reel-cover.jpg

## Did not work as briefed
- 02 "click a match to jump to the document page": no jump exists. Sample passages have page=null (passive). CEJIL shows p.N tags ("Go to page 27") but the preview opens a stand-in PDF at page 1 (El Mozote passages -> Yakye Axa PDF; Caballero Delgado Causa -> Yakye Axa). Clip uses Sample: passage click -> preview -> View entity.
- 07 click-to-fill from a document passage is unreachable: the entity Document-tab drawer "Edit" is a stub toast (DrawerActionBar.tsx:65); the Library drawer form unmounts on switching to its Document tab. Clip fills Description from a connected entity's preview value (Victim). Long text values are not fillable by design (items.tsx:89).
- Velasquez Judgment has an empty required Description; Save is blocked until filled (clip fills it first).
- 04 on CEJIL: "Jueces firmantes" table (Juez x Pais, sigma, via Sentencia) sits at the bottom of the Causa record (scrolled to). 05 uses CEJIL Caballero Delgado y Santana (Sample graph is 3 leaves); "expand a target" = collapse all / expand CorteIDH hub in tree.
- 01/05/06/07 run 20.4-22.6s (over 20).
- Section titles and reel captions are my wording; I did not have the post text.
- Zooms upscale a 1440 capture, so zoomed frames are soft; static frames are overlaid from the source unprocessed. Reel is a 2.1x upscale.
- Navbar Beacon shows mock "Uploading document batch" progress in all clips.

## Recommendation
Code: make passage "Go to page" open the entity's real file (or hide p.N for borrowed stand-in PDFs); wire the Document-tab drawer Edit or drop it.

## Update: post wording + 2x capture
- Titles/captions now use dev/results/uwazi-2-post.md wording (full: 8 section cards + closing card "There is a lot still to come. / Watch this space."; reel: Uwazi 2.0 / Full-text search results / Time-based filtering / Networks you can see and navigate / Smoother text referencing / The human firmly in control / Bert, our integrated agent / Watch this space.; cover "Uwazi 2.0 - A new chapter").
- Re-recorded 01, 03, 04, 05, 06, 08 at true 2x (Chromium --force-device-scale-factor=2, viewport null, recordVideo 2880x1800; Playwright's deviceScaleFactor option does NOT give 2x video). Downsampled to 1440x900 with lanczos; zoomed frames verified crisp.
- 02-search and 07-input-data are HELD at the old 1x capture until Code's fix lands.
- Durations now: 01 20.4, 03 18.6, 04 13.3, 05 21.2, 06 25.5 (2x capture slows the recorder), 08 18.9; full 2:45.7; reel 27.8.

## Update 2: re-record on 8b5695bb
- 02-search and 07-input-data re-recorded at 2x on playground 8b5695bb (own worktree, port 1426, served commit verified). full 3:02.6, reel 28.4s.
- 07: Document tab -> drawer Edit -> arm Description -> select PDF passage -> "Fill Description" -> Save -> Bert works.
- BUG (intermittent): search passage p.33 click opens the real ES file, then the viewer scrolls from page 1 down and stops around PDF page 11 instead of 33. Same steps: 4 of 5 recorded runs landed wrong (page 11), 1 landed on 33; plain 1x runs landed right once and wrong once. 02 clip is the successful run (script retries until the p.33 text is in view). Suggests a race between scroll-to-page and page layout. Owner: Code.
