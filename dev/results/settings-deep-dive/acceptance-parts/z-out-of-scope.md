## Out of scope

Not checked, because the gap-matrix target is drop or defer, or an adopted Decision removes it. Revisit only if the decision changes.

### By decision

| Decision | Effect on this checklist |
|---|---|
| G1 / S1-S5 | Template as schema adopted: checks that verify the change reaching forms, cards, columns and filters carry `Needs M<n>` and are skipped until that step lands. S1 heuristic CEJIL flags, S2 `bench` markdown, S3 Countries thesaurus select, S4 stable property `name` on rename, S5 English template labels only (no per-language template labels) |
| G5 | Relationship type inverse name: no checks |
| G6 | Settings refuses to delete a relationship type that references use; the panel modal's reassign-to-`no_label` is outside Settings checks |
| G7 | Translations CSV import/export: no checks; thesaurus value CSV import is in scope |
| G8 | Installed languages and Translations edits do not change the live header language picker or `t()` strings: no checks for that |
| G9 | Preserve capture-sources list, schedule and authentication editor: no checks (token card only) |
| G10 | Custom CSS is checked only in the Pages preview and public preview; JS is stored, never run; nothing is injected into the admin shell |
| G12 | Extractor Reject, segmentation and min-characters: no checks |
| G14 | Data visualizations (all DVZ rows) and New Relationships Migration: no checks |

### By gap-matrix row

| Row | Uwazi behaviour (short) | Why out |
|---|---|---|
| ACC-14 | Page visible to any logged-in role; server allows self-edit only. Acco | defer |
| ACC-16 | Loader error goes to the route error boundary; loading uses the global | defer |
| DSH-08 | Admin only (client guard and GET /api/stats). Dashboard.tsx:13-90 | defer (no role model in the rail yet; see NAV) |
| COL-03 | Theme and branding card opens a large panel: presets, accessibility ch | defer (tenant flag, new component family) |
| COL-11 | Non-latin characters toggle: one-way, rewrites property names, only a  | defer; follows T3/S4 schema work |
| COL-13 | Services card: OCR toggle, shown only if the server has an OCR URL. Co | drop (no OCR service) |
| COL-15 | Public forms: captcha bypass toggle, whitelisted templates multi-selec | defer (no public submission form) |
| COL-23 | Other open sessions get the change over a socket. Collection.tsx:132-1 | drop (single user) |
| PAG-10 | Entity view toggle (page-wide); blocked while templates use it; disabl | defer (no entity-view page path) |
| PAG-11 | Markdown support: hidden flag, deprecation banner, "This page does not | drop (deprecated markdown flag) |
| CSS-10 | Public read: CSS, JS and flag are readable by anyone through GET /api/ | drop (no server) |
| CSS-11 | Monaco failure renders an empty div; a failed load returns {} and a sa | drop (no Monaco) |
| UPL-10 | Leaving during an upload asks "Discard changes?" (guard reads a non-re | drop (uploads finish in session) |
| PRV-01 | Nav link shown only with features.preserve.host; route itself is not g | drop (no feature flags) |
| PRV-05 | First token creates a "Preserve" thesaurus and a "Preserve" template w | defer (templates/thesauri stores) |
| PRV-08 | Token and masterToken exposed to all admin sessions (Uwazi quirk). pub | drop |
| PRV-09 | Captured pages become entities of the "Preserve" template (extension-s | defer |
| CSV-15 | Header rules: id column updates an existing entity; language columns t | defer |
| CSV-16 | Created entities appear in the Library. CsvImportEntitiesJob.ts:102-12 | defer |
| ACT-13 | Retention one year by TTL index; migration entries never expire. activ | drop (no server) |
| TPL-03 | Translation column. Template name in the current UI language, sortable | defer |
| TPL-13 | Bulk delete atomicity. One DELETE per id in parallel; first error abor | drop (all-or-nothing store action instead) |
| TPL-14 | Synced template. "Synced Template" column, plain-text name, disabled a | drop (no sync) |
| TED-03 | Entity view page. Checkbox plus Select of pages flagged entityView; un | defer |
| TED-29 | Violated articles (nested). Offered only for project cejil; server ref | drop |
| TED-37 | Reserved and derived names. name is derived from the label on every sa | drop (S4) |
| TED-45 | Reindex confirm. Over 3000 entities every save asks "Lengthy reindex p | drop |
| TED-46 | Processing state. Header progress bar "Updating template properties ac | drop |
| TED-47 | Unknown template id. Loader falls back to an empty new template, and S | drop; "Template not found" shown instead |
| FLT-03 | Add entity type modal. Multiselect with search of templates not yet us | drop (show/hide covers it) |
| FLT-15 | Group label translation. Group names live in the "Filters" translation | defer |
| FLT-17 | Search. None in Uwazi (Add modal has search). | defer |
| THS-18 | Translation pill beside each label when translated name differs. Table | defer |
| REL-06 | Inverse name: not in Uwazi (model is id and name); CLAUDE.md lists "no | drop (G5) |
| REL-12 | Type name translated in context "Relationship Type"; translating happe | defer |
| LNG-08 | Default language drives visible UI (header and interface pickers). ato | defer (G8) |
| TRN-14 | Save propagates: thesaurus context edits re-label entity values in tha | defer (G8) |
| TRN-17 | Live translate: header language menu, admin only, modal edits one key  | defer |
| IXE-21 | "Open" row action: PDF sidepanel with highlight, "Click to fill", Clea | defer |
| IXE-26 | Obsolete rows appear when the entity or file changed after the suggest | defer |
| PXE-19 | "Open PDF" panel shows the main-language PDF. PDFSidepanel.tsx:14-45 | defer |
| PXE-20 | Paragraphs become entities of the target template, linked to the sourc | defer |
| NAV-09 | New Relationships Migration (Tools): rail link admin plus newRelations | drop (G14) |

Data visualizations: DVZ-01 to DVZ-21 are all out of scope (G14). Rows with target `keep (proto-only)` are checked only where a Decision keeps them, tagged [PO].
