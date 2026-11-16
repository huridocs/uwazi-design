# Pages editor: Direction A and Direction B

2026-09-29. Two prototypes of the same job: letting a collection's team make its
public pages. Both run on mock data. Branch `design/pages-editor-2` (from
playground 537cecb3), not pushed.

- **A** changes Uwazi's existing Settings › Pages, in `app/`.
- **B** is a separate site builder, in `sites/`. It changes nothing in `app/`.

Run A: `cd app && npm run dev`, then Settings › Pages. Run B: `cd sites && npm install && npm run dev`
(builder at `/`, published site at `/site.html`).

## What Uwazi has today

A page is HTML, CSS and JavaScript per language, typed into three text areas.
Data comes in through components written as tags (`<ListChart>`, `<Repeat>`,
`<Map>`, `<Counter>`…) or as `{name}(options)`. Saving publishes at once. There
is no preview, no list of components in the editor, and no way to start a
language from another. A team without a developer gets a blank box.

## A · Code editor, kept and fixed

Screens: `a-list-light`, `a-edit-light`, `a-fr-dark`, `a-palette-light`,
`a-picker-light`, `a-new-legal-cejil-{light,dark}`, `a-mobile-{list,edit,preview}-*`.

What it fixes, keeping Uwazi's model (HTML/CSS/JS per language):

| Problem today | A |
|---|---|
| You cannot see the page while writing it | Live preview beside the code, sandboxed, desktop and phone widths; Code/Preview toggle on phones |
| Components are undiscoverable, two syntaxes | "Insert component" lists every component, marks each as tag or `{name}(options)`, inserts it with its options |
| A new page starts empty | Add page offers 8 site types (Legal, Research, Numbers…) compiled to components Uwazi has now |
| Each language is typed from zero | Copy from language; empty languages are marked in the language switch |
| Save is publish | Save draft and Publish are separate; each page row shows its state |

What A does not fix: the person still edits HTML. A typo can break the page. The
theme is CSS in Settings › Customization. There is no page-level structure the
system understands, so it cannot warn about a missing translation inside the
HTML, check contrast, or change the layout of every page at once.

## B · Site builder

Screens: `b1`–`b13` (first cut), `b20`–`b28` (this session).

A site is one JSON document: languages, theme, menu, footer, search and sharing,
optional custom code, and pages made of blocks. The preview is the real public
renderer in an iframe. What it fixes beyond A:

| Problem | B |
|---|---|
| A new site is a blank box | First run: collection → one of 8 site types → a finished site on that collection's records |
| Layout means code | Blocks with generated forms: add, reorder (drag or arrow keys), hide, duplicate, delete |
| The kind of site is fixed at creation | Whole site › Site type: point at a type to preview it on the current site; Apply keeps every edit, lists the blocks that would be removed, and is one undo step (`b20`, `b21`) |
| Translation gaps are invisible | Every text field is per language, marks "Not translated", and shows the fallback that readers will see |
| Theme needs CSS | Accent with a contrast check in light and dark and a nearest passing shade, 4 font pairs, light/dark/auto, logo with focal point and required alt text |
| Menu and footer are elsewhere, as code | Menu and Footer editors, one line per link; the preview outlines the header or footer being edited (`b22`, `b23`) |
| No control over search results or link cards | Search and sharing: title and description with counters, share picture, search result and share card previews (`b24`) |
| Anything unusual needs a developer | Advanced › custom CSS and JS, off by default; the preview reruns the script after typing stops and shows its error without breaking the page (`b25`) |
| Publishing is blind | Publish lists what changed, blocks publishing a picture without alt text, keeps versions to restore; undo/redo |
| Right-to-left | Arabic pages mirror; untranslated Latin text keeps its punctuation in place (`b27`) |

For collections that stay on today's Uwazi, **Export to Uwazi** (`b26`) turns
the site into what Settings › Pages takes: one theme CSS for Settings ›
Customization, then per page the HTML for each language, the page CSS (every
rule scoped to the page) and the JS tab. Data blocks become Uwazi components, so
they stay live. Blocks with no equivalent are downgraded and listed. `npm test`
checks that every site type on every seed collection exports balanced HTML,
known components only, and scoped CSS. The component attribute names follow the
prototype's palette and must be checked against docs.uwazi.io before anyone
relies on the export.

## What B cannot do

- **Anything outside its blocks without code.** A layout that no block offers
  (two blocks side by side, a custom grid) needs Advanced › custom code, which is
  the same skill A asks for.
- **Run inside today's Uwazi.** B is a separate app with its own document. The
  bridge is the export, which is one way: pages changed in Uwazi after export do
  not come back to B.
- **Carry everything in the export.** Timeline, status history, connections on a
  page, the stacked status bar, table columns and the menu itself have no Uwazi
  page equivalent. They are downgraded or left out and named in the warnings.
- **Status history from Uwazi data.** Monitoring's history on CEJIL is derived
  from four dates on provisional measures. Uwazi stores no status history; each
  collection needs that derivation or a dated status property.
- **Forms.** Contact, sign-up and donate are drawn but send nothing.
- **Private records.** By design a site reads only what an anonymous reader can.

## Effort to build for real

Estimates for one experienced frontend developer with Uwazi's codebase, plus
review. They exclude design and translation of the builder's own UI.

**A: about 3–4 weeks.** It lives in Uwazi's React app and keeps its data model
(`Page.locales[lang]`). New: a draft copy per page and language plus a publish
action (a migration and two endpoints), the sandboxed preview that renders the
Markdown/HTML components the way the public page does, the component palette
(a static list with option forms), starters as stored HTML, and copy-from-language.
The largest risk is the preview matching the public page exactly.

**B: about 3–4 months to a first public release.** A new service:
- server rendering of the same React renderer, per request, with a cache keyed
  on the published version and cleared on Publish or on collection changes;
- the site document stored in Uwazi (draft, published, versions) with
  permissions;
- a real `DataSource` over Uwazi's API as an anonymous reader, server-side;
- domains or paths per site, with TLS;
- uploads to Uwazi's file store instead of data URLs;
- forms wired to Uwazi's contact and public-form endpoints, with captcha;
- the builder's accessibility and RTL checked against real content.
The prototype's split (one document, one renderer, one `DataSource` interface)
carries over; most of the time goes to the server side, which the prototype
does not have.

A and B do not exclude each other. A improves what every instance has now. B is
a larger product decision; its export lets a team build with B and publish on
today's Uwazi while B has no server of its own.

## Screens in this folder

| File | What |
|---|---|
| `a-*.png` | Direction A in Settings › Pages (list, editor, component palette, starters, French in dark, phones) |
| `b1`–`b13` | Direction B first cut: first run, site types on CEJIL and artworks, block editing, results, record page, publish, phone frame, 390 wide |
| `b20-site-type-preview-{light,dark,390-dark}` | Previewing another site type, with the removed blocks and Apply/Cancel |
| `b21-site-type-picker-light` | The picker after Escape: back to the current type |
| `b22-menu-editor-{light,390-dark}`, `b23-footer-editor-dark` | Menu and footer, with the preview marking the header or footer |
| `b24-search-sharing-{light,390-dark}` | Search result and share card previews |
| `b25-advanced-{error-light,dark}` | Custom CSS and JS; a throwing script shown in the preview |
| `b26-export-{light,dark,390-light}` | Export to Uwazi |
| `b27-rtl-ar-{home-light,results-dark}` | Arabic, right to left |
| `b28-selects-390-light` | The builder toolbar at 390 with the redrawn selects |
