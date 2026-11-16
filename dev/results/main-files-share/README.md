# Entity files download fix on main 9c114daf: screenshots

Captured 2026-10-20 by QA from a fresh worktree at main 9c114daf (preview build, `vite preview` on :1430; the served commit was confirmed with lsof, then the process cwd, then `git rev-parse HEAD` = 9c114daf916e591f9223fe424c3820db1993cc2e). Headless Chromium, 1440×900 at deviceScaleFactor 2 (phone: 390×844 at DPR 3), light mode, no cursor drawn, CEJIL collection, record "Cordero Bernal. Sentencia de 16 de febrero de 2021". Each browser context was new, so session storage held no demo-data changes (the same state "Reset demo data" leaves); the Reset button itself was not clicked. The Beacon in the navbar shows its mock running tasks in some shots.

Numbers in brackets are the numbers in the original request.

## Files

| File | What it shows |
|---|---|
| 01-preview-metadata-files-block.png | [2] Library drawer preview of the record on its Metadata tab, with the Files block (View and Download icons per file, "Download all" in the head). |
| 01-preview-metadata-files-block-crop.png | Tight crop of that Files block. |
| 02-download-hint-hover.png | [hint] The same preview with the pointer on the first Download icon, which shows the "Download" hint. |
| 02-download-hint-hover-crop.png | Tight crop of the hovered Download icon and its hint. |
| 03-entity-view-drawer-files-block.png | [4] Entity view of the record, drawer on its Metadata tab, with the Files block and labelled View and Download buttons. |
| 03-entity-view-drawer-files-block-crop.png | Tight crop of that block. |
| 03-entity-view-drawer-download-hover-crop.png | The same block with the pointer on the first labelled Download (hover tint, no hint, because labelled buttons have none by design). |
| 03-entity-view-metadata-tab.png | [4] Entity view with the main pane on its Metadata tab: the Files block at the top of the record, full file names, labelled View and Download. |
| 03-entity-view-metadata-tab-files-block-crop.png | Tight crop of that block. |
| 03-entity-view-metadata-tab-download-hover-crop.png | The same block with the pointer on the first labelled Download. |
| 04-drawer-files-tab-download.png | [8] Library drawer preview on its Files tab, each row with pencil, View and a Download icon. |
| 04-drawer-files-tab-download-crop.png | Tight crop of the two file rows. |
| 04-drawer-files-tab-download-hover-crop.png | The same rows with the pointer on the first Download icon (hover tint, no hint; see defects). |
| 05-view-dialog-pdf.png | [6] The View dialog opened from the entity view, showing the PDF with Close and Download in its footer. |
| 05-view-dialog-pdf-footer-crop.png | Tight crop of the dialog footer with Close and Download. |
| 06-phone-preview-sheet-files-block.png | [10, block only] Phone 390×844: preview sheet on Metadata with the Files block (icon buttons, Download all). |
| 06-phone-preview-sheet-files-block-crop.png | Tight crop of the phone Files block. |
| href-audit.json | Raw results of the checks below. |

## Download checks (driven in the browser)

Every Download in the surfaces above was read from the DOM and fetched.

| Surface | Result |
|---|---|
| Drawer preview, Metadata block (2 files) | Pass: `<a download>`, real `/cejil-docs/….pdf` href, `aria-label` "Download <file name>", href returns 200 `application/pdf` with `%PDF-` bytes. |
| Drawer preview, Files tab (2 files) | Pass, same checks. |
| Entity view, drawer Metadata block (2 files) | Pass, same checks. |
| Entity view, main Metadata tab block (2 files) | Pass, same checks. |
| View dialog footer Download | Pass, same checks. |
| Phone preview sheet block (2 files) | Pass, same checks. |
| Clicking the first Download (drawer block, View dialog) | Pass: Chromium fired a download event named "Cordero Bernal. Sentencia de 16 de febrero de 2021.pdf" with the PDF's URL. |

The accessible name equals "Download " plus the `download` attribute in all 11 anchors checked. Sizes: 521,722 and 513,010 bytes for the two PDFs.

## Defects and notes

1. The Download icon on the drawer Files tab (shot 04) has no hint on hover or focus. The icon-only Download in the Files block (shot 02) shows "Download". The Files tab's anchor is in `components/files/DrawerFilesBody.tsx` (about line 394) with an `aria-label` but no `Hint` and no `title`. Minor; the accessible name is correct.
2. Touch target size on the phone sheet: the Download and View icons are 32×32 CSS px, and the Files tab's Download icon is 28×28 (`w-7 h-7`). Below the usual 44 px guideline; not a regression from this fix.
3. In shot 04 the second row (the English judgment) is drawn outlined and tinted, as the open file. That is the Files tab's own state, not hover.
4. A programmatic open of the phone sheet left a focus ring on the sheet's close button; it was blurred before the phone shots so it does not appear.
