# Uwazi Pages / public-website building — research

Date: 2026-09-28. Requested by Operator: how Uwazi builds and publishes public websites today, where the time goes, options to make it faster and more WYSIWYG, and a recommendation. No code changes. Plain English, findings only.

Method: part 1 was researched directly, by shallow-cloning `huridocs/uwazi` at `production` (fresh clone this session) and cross-checking file existence/history against the live repo with `gh`. Parts 2 and 3 were researched by two background agents (web search + doc/issue fetches + `gh` searches); their findings are reported here with the sources they opened, not re-verified by me line by line unless noted.

---

## 1. The current system (production branch, cited by file)

### The page data model
A `Page` (`app/api/pages.v2/domain/Page.ts:46-198`) is: a `sharedId`, an `entityView` flag, a `markdownSupport` flag, and a map of **locales**, one per installed language, each holding `{ title, draft: { content, script, css } }` (`Page.ts:7-33`). Postgres schema (`app/api/core/infrastructure/postgresql/schema_migrations/017-create-pages-tables.sql`): `pages` (one row per page), `page_locales` (one row per page × language — raw `content`/`script`/`css` text columns), `page_releases` (versioned JSONB snapshots of every locale, for history/rollback). All three tables carry tenant-isolation RLS.

**There is no publish gate.** `pageToClient` (`app/api/pages.v2/application/services/pageProjection.ts:22-46`), which is what both the public page route and the editor's own preview read, always serves `locale.draft` — the same content an admin is currently editing. Saving a page (`POST /api/pages`, admin-only) makes it live on the public site immediately. A "release" (`POST /api/pages/release`) is a **named, versioned snapshot for history and rollback** (`PublishPageRelease.ts:22-44`, `RestorePageDraft.ts:22-39`) — not a staging/production split. There is no way to prepare a change and hold it back from the public site short of not saving it.

### Editing surface
The real, current editor is `app/react/V2/Routes/Settings/Pages/PageEditor.tsx` (React Router loader-based, react-hook-form). It has four tabs: **Configuration** (title, entity-view toggle, restore/publish buttons), **HTML**, **Javascript**, **CSS** — the latter three are each a bare Monaco code editor (`PageEditorCodeTabs.tsx:37-134`, via the shared `CodeEditor` component), one per language (switched by a language selector, `PageEditorLanguageSelector.tsx`). **There is no live preview pane.** The only way to see a change is "Save & Preview," which saves the page and opens a **new browser tab** at the page's draft URL (`PageEditor.tsx:232-246`, `getPageDraftUrl`) — edit, save, tab-switch, look, tab back, repeat. The JS tab carries a static warning banner ("With great power comes great responsibility!... could also very easily break the app," `PageEditorComponents.tsx:88-112`); the HTML tab's only in-editor help is a link out to `docs.uwazi.io/docs/reference/page-visualization-components/` (`PageEditorComponents.tsx:24-30`) — there is no component palette, snippet inserter, or inline syntax reference in the editor itself.

Markdown is being phased out: `markdownSupport` per page, with a deprecation banner ("Markdown support in custom pages will be discontinued starting in 2027," `PageEditorComponents.tsx:62-86`) and a one-click "This page does not need Markdown" upgrade. `PR #9125 "Pages css, discontinued markdown and versioning"` (merged 2026-06-02) is where CSS-per-page, the markdown deprecation path, and the release/versioning model shipped together.

**Note on legacy code:** `app/react/Pages/EditPage.jsx` and `NewPage.jsx` still exist in the tree and import a `PageCreator` component that **no longer exists anywhere in the repo** (confirmed both in this checkout and directly against GitHub via `gh search code "PageCreator" --repo huridocs/uwazi`, which returns only the two broken imports and a stray spec file; the real component, last touched in PR #6380 "5827 - New pages UI," merged 2024-02-19, was since superseded by `V2/Routes/Settings/Pages/PageEditor.tsx`). This looks like genuinely dead code left behind by that migration, not a live bug — the app's router (`app/react/Routes.tsx:347-357`) wires `/settings/pages/*` to the V2 `PageEditor`/`PagesList`, not to `EditPage.jsx`/`NewPage.jsx`. Worth a cleanup ticket on its own, separate from this research.

### Custom components — two syntaxes, coexisting
The registry of embeddable components lives at `app/react/Markdown/components/index.js:58-84`: `EntityData`, `EntityInfo`, `EntitySection`, `EntityLink`, `Repeat`, `Value`, `Counter`, `Map`, `SearchBox`, `MarkdownLink`, `MarkdownMedia`, `ItemList`, `PublicForm`, `ContactForm`, `PayPalDonateLink`, plus lazy-loaded chart components (`BarChart`, `FreeBarChart`, `PieChart`, `ListChart`, `GaugeChart`, `Dataviz`, `Slideshow`). There is no component literally named `Query` in this checkout — "Query"-like behavior (fetching live entity/search data into the page) is spread across `EntityData`/`Repeat`/`SearchBox`/the chart components, each with their own props.

Two different embedding syntaxes coexist in the same content field, confirmed from code, not just docs:
- An older **markdown-extension syntax**, `{ComponentName}(options)(children)` or `{ComponentName}(options)` — the parser regex is literally `{\\w+}\\(.+\\)\\(.+\\)|{\\w+}\\(.+\\)` (`app/react/Markdown/markdownToReact.jsx:14`, `customComponentMatcher`), used by components like `Value`, `Counter`, the chart family.
- A newer **JSX/HTML-tag syntax**, parsed by `html-to-react` (`markdownToReact.jsx:5-10`) — e.g. the documented `EntityInfo` usage is `<EntityInfo entity="entitySharedId" tag="div" classname="classes">More Info</EntityInfo>` (per the docs, see part 2 below).

An author writing one page may need both forms, with no in-editor indication of which a given component expects — this is a concrete, code-verified instance of "confusing/undocumented component syntax," not just a doc complaint.

### Global CSS/JS
`Settings › Customization` (`app/react/V2/Routes/Settings/Customization/Customization.tsx`) is two more bare Monaco editors — `customCSS` and (if `allowcustomJS` is enabled) `customJS` — instance-wide, saved via `PATCH` to the settings document. No preview here either; a save is live immediately, same as pages.

### Menus, landing page, permissions
- **Menu/navlinks**: `Settings › Menu` (`app/react/V2/Routes/Settings/MenuConfig/MenuConfig.tsx`, `MenuForm.tsx`) — a structured form (not raw code) for the site's nav links, separate from page content.
- **Landing page**: a plain settings field, `home_page` (`app/shared/types/settingsType.ts:73`), edited from `Settings › Collection` (`Collection.tsx`) — a path string, no picker/validation visible in this pass.
- **Translations of pages**: each language is a fully separate `locale` entry with its own `title`/`content`/`script`/`css` (`Page.ts:13-16`) — there is no shared structure or diffing between languages; adding a language starts by cloning the source locale's content (`Page.addLocale`, `Page.ts:94-100`) and then the two copies diverge independently. Confirmed by the fork's doc research (part 2) that this is also what the official docs describe as the actual workflow: switch the site's active language, go back into the page editor, and manually re-translate the same content.
- **Permissions**: confirmed from `app/api/pages.v2/infrastructure/http/routes.ts:11-31` — `GET /api/pages` and `GET /api/page` (public reads) have no auth middleware; `POST /api/pages` (save) and `POST /api/pages/release` and `/restore` require `admin`; `DELETE /api/pages` requires any authenticated role. There is no `editor`/`collaborator`-level page-authoring role — page editing is admin-only.

### Serving
Public page rendering goes through the same universal SSR (`RouteHandler.requestState` pattern) as the rest of the app: routes `page/:sharedId`, `page/:sharedId/:slug` → `PageView` (legacy `.jsx`, `app/react/Pages/PageView.jsx`), and a separate `page-draft/:sharedId(/:slug)` → `PageDraftView.jsx`, which differ only by passing `{ contentMode: 'draft' }` to `getPageAssets` — since `pageToClient` always returns `draft` content regardless (see above), this distinction currently has no visible effect on what content is served; it may exist for a future publish-gate that isn't wired up yet, or may be vestigial. No page-specific caching layer was found in this code (`grep` for cache-control/memoization scoped to Pages came up empty) — any caching is whatever the general SSR/HTTP layer does, not something Pages controls or exposes to the author.

---

## 2. Where the time goes (docs + real issues — researched by a sub-agent, findings reported as given)

**Docs say, in their own words, that this needs a developer** (`huridocs/uwazi-documentation`, published at uwazi.readthedocs.io): "Creating and formatting the content of a Page in Uwazi requires coding knowledge (Markdown language, HTML, CSS)"; "Writing a CSS style sheet requires coding knowledge"; EntityInfo ships "no styles applied," leaving all design to the page author; data-visualization components need "technical proficiency in working with HTML, CSS and Javascript"; and — notably — the docs page for data-viz components **does not document the syntax** for `Query`/`SearchBox`/`Value`/`Map`/`Repeat` at all (a documentation gap, not just a difficulty warning). Page translation is described as fully manual: switch the active language, re-open the same page in Settings › Pages, and re-author its content by hand.

**Real, dated GitHub issues** (huridocs/uwazi):
- No live preview was a known gap for years: [#4473](https://github.com/huridocs/uwazi/issues/4473) (2022-03-29, filed by a HURIDOCS engineer): *"Creating pages is slow, working in the pages text area or css is slow and does not work well."* Took ~2 years (closed by PR #6380, merged 2024-02-19) to get a real code editor at all. Even after that: [#8389 "Preview does not work properly"](https://github.com/huridocs/uwazi/issues/8389), still **open** (filed 2025-09-02); [#8256](https://github.com/huridocs/uwazi/issues/8256) (2025-07) reports keyboard/mouse handling breaking mid-typing in the code editor; [#8813](https://github.com/huridocs/uwazi/issues/8813) (2026-02) is a bug in the CSS editor's empty-save path, with a fix comment noting the underlying editor library can't easily be upgraded further because it conflicts with the Cypress test setup.
- **HURIDOCS' own backlog already names this exact problem**: [#9098 "Expand and Formalize Snippets / Page Templates"](https://github.com/huridocs/uwazi/issues/9098), **open since 2026-05-13**: *"Page creation currently relies heavily on custom developer implementation, even when many pages reuse similar structures and components. Existing snippets exist but are informal and limited in scope."* Stated goals: faster page development, better support for partners with limited implementation budgets.
- CSS/JS were bolted on, not designed in: [#7575](https://github.com/huridocs/uwazi/issues/7575) (open, 2025-01, Tailwind/global.css dev pipeline unreliable), [#5268](https://github.com/huridocs/uwazi/issues/5268) (2022, no shared script include across pages before Global JS existed), [#3751](https://github.com/huridocs/uwazi/issues/3751) (**open since 2021-06-18** — a page's custom JS keeps running after navigating away).
- Components and content aren't isolated from each other: [#6660](https://github.com/huridocs/uwazi/issues/6660) (2024-04) — a shared component's assumption about metadata broke live custom pages for a tenant with no warning.
- Users hit a hard wall without developer help: [#6439](https://github.com/huridocs/uwazi/issues/6439) (2024-02, a user asking how to build an interactive map, answered with "customize the JavaScript," no lower-code path offered); [#4109](https://github.com/huridocs/uwazi/issues/4109) (2022, a user asking staff to write their homepage CSS for them).
- Landing-page config is fragile: [#3883](https://github.com/huridocs/uwazi/issues/3883) (open since 2021-08-24, redirect loop when a custom landing page is set and the URL segment doesn't exist), [#6250](https://github.com/huridocs/uwazi/issues/6250), [#6822](https://github.com/huridocs/uwazi/issues/6822) — repeated landing-page/routing regressions, 2023–2024.
- **Serving is measurably expensive right now, not just historically**: [#9538](https://github.com/huridocs/uwazi/issues/9538) (opened 2026-08-12) — a production incident where a translations reshape run on every SSR HTML request pegged Node CPU (~16s per request on large thesauri), servers had to be rolled back; its fix regressed differently in [#9762](https://github.com/huridocs/uwazi/issues/9762) (open, 2026-09-22) — pages now ship the full thesaurus translation set in every HTML response, "more than halves SSR throughput and roughly doubles page size" on a production-sized collection. This is the concrete evidence behind "deploy/cache confusion" — the bottleneck isn't confusing caching rules, it's that SSR itself is expensive per request and has broken production twice in the last two months.

**HURIDOCS blog**: no post found describing time cost or difficulty of the Pages feature specifically — checked huridocs.org's Uwazi pages and the most recent relevant post (July 2026, about the visual rebrand and pricing, not the page builder). Reported as a genuine gap, not a soft negative.

---

## 3. Options (researched by a sub-agent, findings reported as given)

### (a) In-app block/WYSIWYG editor over the existing page model

| Library | License | Maintenance (checked 2026-09-28) | Fit |
|---|---|---|---|
| **Puck** (measuredco/puck) | MIT | 13.4k★, daily commits (last push 2026-09-29), but npm hasn't had a version bump in ~13 months (0.20.2, 2025-09-05) — pre-1.0 churn risk, not abandonment | Purpose-built: register your own React components as blocks |
| **GrapesJS** | BSD-3-Clause | 26.3k★, only 45 open issues, npm released 1 month ago — best release hygiene of the four | General HTML/CSS page builder |
| **Craft.js** | MIT | 8.8k★, **zero commits in 19+ months** (last push 2025-02-14) — reads as stalled | A toolkit for building your own builder, not a finished product |
| **TipTap** / **Lexical** | MIT | Both extremely active (Lexical is Meta-backed, released *today*) | **Wrong category** — rich-text/prose editors, no native concept of a data-fetching component block; using either here means building a page-layout system on top of a text editor |

**Puck is the strongest fit**: components register as `{ fields, render }`, where `render` returns real JSX — an existing component like `EntityData` plugs in directly or with a thin wrapper. It ships a built-in `external` field type designed exactly for "let the author pick a live record from a third-party API while composing the page, then re-fetch it at page-load time via `resolveData`" — close to a ready-made integration point against Uwazi's own entities API. Effort: **weeks**, because the underlying page-content model doesn't need to change (Puck's own save format is a JSON tree of `{type, props}` — structurally close to what Uwazi already stores). Risk: pre-1.0 API churn; pin the version.

**GrapesJS**, despite better maintenance metrics, renders everything to plain HTML via `component.toHTML()` — it has no live-React-component-block concept, so every one of Uwazi's data-fetching components (`EntityData`, `Repeat`, the charts) would need to be **reimplemented** as an HTML-string-producing GrapesJS component with data-fetching bolted on via an `onRender` hook. Effort: **months**, and ongoing risk of the editor's version of a component drifting from the real one used elsewhere in the app.

**Craft.js**: not recommended — it's explicitly a toolkit for building your own editor (more work up front than Puck), and looks stalled.

### (b) External site builder fed by Uwazi's existing API

**Astro or Next.js + Uwazi's REST API**: standard pattern (fetch at build time, bake to static HTML, serve from a CDN). Next's Incremental Static Regeneration (timer- or webhook-triggered revalidation) answers the staleness problem without a full rebuild, but requires a Node/Docker deploy target (not static export). Fixes well: genuinely fast/cacheable pages, professional starter templates, real SEO. Makes harder: auth for non-public entities, full-text search across a large corpus (needs a separate indexed search service — static sites don't do this natively), multi-language (still needs explicit modeling, just moved into the SSG's own i18n routing), and a second deploy pipeline to own forever. Effort: **weeks** for a first template, assuming Uwazi's API already exposes what's needed; risk is largely "now there are two systems to keep in sync," not a one-time cost.

**Framer / Webflow bound to Uwazi's API**: Framer's list-shaped data ("Fetch") explicitly doesn't support collections — only Framer's own CMS Collections do, which means **syncing** Uwazi data into Framer's store, not reading it live. Webflow has **no native no-code binding to an arbitrary external API** at all — real integration means custom JS or a periodic import via Zapier/Make into Webflow's own Collections. Both devolve into a sync/import pipeline, which reintroduces roughly the same staleness problem as static generation, plus a second place the data now lives. Fixes well: the fastest, most polished WYSIWYG available, for real, with free professional templates — genuinely appropriate if the actual need is "a handful of curated marketing pages with periodically-refreshed data," not "the live, searchable, permissioned case database" the Pages feature is mostly used for today.

### Comparative summary

| | Effort | Risk | Fixes | Doesn't fix |
|---|---|---|---|---|
| In-app editor — **Puck** | Weeks | Pre-1.0 API churn; existing components need light wrapping | No-preview → live visual editing; component palette; one codebase/auth/data-store | Translation duplication, SSR cost, deploy/caching — untouched unless tackled separately |
| In-app editor — GrapesJS | Months | Every data-fetching component needs a from-scratch reimplementation | Same visual win; best conventional maintenance metrics | Same as above, plus higher rewrite risk |
| In-app editor — Craft.js | Months | Appears stalled | — | Not recommended |
| SSG (Astro/Next) + API | Weeks (template) + ongoing | A second system to keep in sync forever | Real WYSIWYG via professional templates; fast, cacheable, SEO-strong | Auth, corpus search, i18n routing, deploy pipeline — all become new problems |
| Framer/Webflow | Days (curated) to weeks+ (full DB) | Neither has real live external-list binding; becomes a sync pipeline | Fastest, most polished WYSIWYG for a handful of pages | Live data, permissions, scale at "case database" size |

---

## 4. Recommendation

**The fastest real win is not a new editor — it's closing the loop the current one is missing.** Three of the concrete pain points found in part 2 (#4473, #8389, and the "informal snippets" backlog item #9098) are all versions of the same complaint: edit, save, leave the page, come back, look. Confirmed directly in code (`PageEditor.tsx:232-246`): "Save & Preview" already saves and opens the rendered draft in a new tab — the pieces for a real preview already exist, they're just not wired into a single view.

**Fast first step (1–2 weeks, inside today's editor, no new library):**
1. **Split preview inside the editor** — an iframe pointed at the page's own draft URL, next to the HTML/CSS/JS tabs, refreshed on save (or on a short debounce). This alone removes the tab-switch loop that #4473 and #8389 are both complaints about, using infrastructure (`page-draft/:sharedId` route, `getPageDraftUrl`) that already exists.
2. **A snippet palette**, even a plain dropdown/insert-button list next to the HTML tab — one entry per registered component (`app/react/Markdown/components/index.js`), inserting a correctly-formed example (right syntax for that specific component, since two syntaxes coexist — see part 1) at the cursor. This is a direct, cheap answer to #9098 and to the syntax-confusion problem, without touching the page data model at all.
3. **A handful of starter page templates** (a "case entry," a "document list," a "landing page" pre-filled with real component markup) offered on page creation — again, content-only, no new mechanism.
4. Nice-to-have in the same window: a **"copy to other language" button** on the per-locale editor, so translating a page starts from the source content instead of a blank editor tab — cuts the manual re-typing part 2's docs describe, without changing the one-locale-per-record data model.

None of this requires deciding between (a) and (b) first, and none of it is wasted if a bigger rebuild happens later — a split preview and a snippet palette are useful regardless of what eventually holds the page content.

**The longer path, if the org wants to actually go WYSIWYG:** adopt **Puck** as the in-app editor, wrapping the existing component registry as Puck blocks and wiring its `external` field type to Uwazi's own entity/search API for the "pick a live record" step components like `EntityData`/`Repeat` need. This is the option that keeps one codebase, one auth model, and one data store — the real cost of the external-site-builder path (b) is a second system to keep in sync forever, which is a worse fit for a live, permissioned, searchable case database than for a handful of marketing pages. Recommend **not** pursuing GrapesJS (rewrite cost) or Craft.js (stalled), and **not** pursuing Framer/Webflow unless the actual requirement turns out to be "a small number of pages with periodically-refreshed data" rather than the full case database.

Before committing to Puck: spend a day confirming its `external`/`resolveData` mechanism actually covers Uwazi's specific components (a chart needs an aggregated query result, not just "one record" — `EntityData`/`Repeat` are single/list record fetches, closer to Puck's documented use case; the chart family may need more custom wiring). This is a half-day spike, not a blocker to starting.

Separately, worth flagging up regardless of which path is chosen: the SSR performance issues (#9538, #9762) affect every public page view today and are unrelated to the editor — they should be tracked and fixed independently of any editor work, since a faster/nicer editor doesn't help if the pages it produces are slow to serve.

---

## Sources opened

**Codebase (production branch, this session):**
- `app/api/pages.v2/domain/Page.ts`, `application/services/pageProjection.ts`, `application/useCases/{PublishPageRelease,RestorePageDraft}.ts`, `infrastructure/http/routes.ts`
- `app/api/core/infrastructure/postgresql/schema_migrations/017-create-pages-tables.sql`
- `app/react/V2/Routes/Settings/Pages/{PageEditor.tsx,pageEditorForm.ts,components/*}`
- `app/react/V2/Routes/Settings/Customization/Customization.tsx`, `MenuConfig/MenuConfig.tsx`
- `app/react/Pages/{EditPage,NewPage,PageView,PageDraftView}.jsx`, `components/PageViewer.jsx`
- `app/react/Markdown/{markdownToReact.jsx,components/index.js,components/EntityData.tsx}`
- `app/shared/types/settingsType.ts`
- GitHub, via `gh`: PR #9125, #6380; code search for `PageCreator`; commit history for `PageCreator.{js,tsx}`

**Docs, issues, blog (via sub-agent, URLs as reported):**
- github.com/huridocs/uwazi-documentation: `designing-your-website.md`, `how-to-configure-entityinfo-components.md`, `how-to-build-data-visualisation-components.md`, `translating-your-collection.md`
- GitHub issues: huridocs/uwazi #4473, #8389, #8256, #8813, #9098, #7575, #6508, #4471, #5268, #3751, #6660, #6439, #4109, #3883, #6250, #6822, #9538, #9762, #56
- huridocs.org (Uwazi pages, "Uwazi refreshed" July 2026 post) — checked, not relevant to this feature

**Options research (via sub-agent, URLs as reported):**
- github.com/measuredco/puck, puckeditor.com/docs/integrating-puck/{external-data-sources,server-components}
- grapesjs.com, grapesjs.com/docs/modules/Components.html, github.com/GrapesJS/grapesjs
- craft.js.org, github.com/prevwong/craft.js
- github.com/ueberdosis/tiptap, github.com/facebook/lexical
- registry.npmjs.org (puck, grapesjs, @craftjs/core, @tiptap/core, lexical)
- docs.astro.build/en/guides/data-fetching, nextjs.org/docs/app/guides/incremental-static-regeneration
- framer.com/help/articles/how-to-use-fetch, framer.com/developers/cms
- thecssagency.com/blog/webflow-api, flowradar.com (external-API-to-Webflow thread)
