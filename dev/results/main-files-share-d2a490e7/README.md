# Entity files download fix on main d2a490e7: screenshots

Captured 2026-10-20 by QA from a fresh detached worktree at main d2a490e7, preview build on :1430. The served commit was confirmed with lsof, then the process cwd, then `git rev-parse HEAD` = d2a490e71a9b288c6e7de129725ebb1bdfc48556. Headless Chromium, 1440×900 at deviceScaleFactor 2 (phone 390×844 at DPR 3), light mode, no cursor drawn, CEJIL collection, record "Cordero Bernal. Sentencia de 16 de febrero de 2021". Each browser context was new, so session storage held no demo-data changes (the state "Reset demo data" leaves); the Reset button itself was not clicked. The navbar Beacon shows its mock running tasks in some shots.

## Files

| File | What it shows |
|---|---|
| 01-preview-metadata-files-block.png | Library drawer preview of the record on its Metadata tab, with the Files block: heading "Files", each row a name and "PDF · Español", one Download icon per row, "Download all". |
| 01-preview-metadata-files-block-crop.png | Tight crop of that Files block. |
| 02-download-hint-hover.png | The same preview with the pointer on the first row's Download icon, which shows the "Download" hint. |
| 02-download-hint-hover-crop.png | Tight crop of the hovered icon and its hint (the hint covers part of the "Download all" label, see defects). |
| 03-entity-view-drawer-files-block.png | Entity view of the record with the drawer on its Metadata tab and the same Files block. |
| 03-entity-view-drawer-files-block-crop.png | Tight crop of the drawer's Files block. |
| 04-entity-view-metadata-tab.png | Entity view with the main pane on its Metadata tab: the Files block at the top of the record. |
| 04-entity-view-metadata-tab-files-block-crop.png | Tight crop of that block. |
| 05-view-dialog-pdf.png | The View dialog opened by clicking the first row, showing the PDF with Close and a plain Download in the footer. |
| 05-view-dialog-pdf-footer-crop.png | Tight crop of the dialog footer: Close and Download, no solid black button. |
| 06a-entity-files-tab.png | Entity view on the Files tab, before the row menu is opened. |
| 06-entity-files-tab-row-menu.png | Files tab table with the first row's ⋮ menu open: View, Download, Rename, Change language, Add translation, Delete. |
| 06-entity-files-tab-row-menu-crop.png | Tight crop of the table and the open menu. |
| 07-entity-files-tab-two-ticked.png | Files tab with both files ticked: the drawer lists the two files and ends with "Download 2" and "Delete 2", the main bar with "Selected 2 of 2". |
| 07-entity-files-tab-two-ticked-drawer-bar-crop.png | Tight crop of the drawer's bottom bar with Download 2 and Delete 2. |
| 07-entity-files-tab-two-ticked-main-bar-crop.png | Tight crop of the main bar (Add file, Deselect all, Selected 2 of 2), which carries no Download or Delete. |
| 08-phone-preview-sheet-files-block.png | Phone 390: the Library preview sheet on Metadata, with the Files block. |
| 08-phone-preview-sheet-files-block-crop.png | Tight crop of the phone Files block. |
| 09-phone-files-tab.png | Phone: entity view on the Files tab with nothing ticked. |
| 10-phone-files-tab-two-ticked.png | Phone: Files tab with both files ticked and the bottom bar showing the count. |
| 10-phone-files-tab-two-ticked-bar-crop.png | Tight crop of the phone bar: Deselect all, "2 of 2", Download icon, Delete icon, more. |
| href-audit.json | Raw results of the Download checks below. |

## Download checks (driven in the browser)

| Surface | Result |
|---|---|
| Drawer preview, Metadata block (2 files) | Pass: `<a download>`, real `/cejil-docs/….pdf` href that returns 200 `application/pdf` with `%PDF-` bytes, accessible name "Download <file name>". |
| Entity view, drawer Metadata block (2 files) | Pass, same checks. |
| Entity view, main Metadata tab block (2 files) | Pass, same checks. |
| View dialog footer Download | Pass, same checks. |
| Files tab row ⋮ menu, Download item (row 1) | Pass, same checks (an `<a role="menuitem" download>`). |
| Phone preview sheet block (2 files) | Pass, same checks. |
| Clicking the first Download (drawer block, View dialog) | Pass: Chromium fired a download event named "Cordero Bernal. Sentencia de 16 de febrero de 2021.pdf" with the PDF's URL. |

10 anchors checked, 0 failing. The two files are 521,722 and 513,010 bytes.

## Defects and notes

1. The Download hint (shot 02) sits above the icon and covers the right half of the "Download all" label while the first row's icon is hovered. It is transient, but it hides a control's name.
2. "Download all", "Download 2" and the phone bar's Download icon are buttons, not links: they show a notice that zipping needs a server. Each file's own Download is the `<a download>`. This matches the code comments; the audit does not cover them.
3. Phone touch targets: the block's Download icons are 32×32 CSS px, below the usual 44 px guideline. Not checked for the phone bar's icons.
4. On the phone, the entity view opens the PDF at 200% and shows only the top-left of the page (shot not included). It is outside the files change.
5. The row menu's Download item was checked for row 1 only; row 2's menu was not opened.
