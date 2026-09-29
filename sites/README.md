# Uwazi site builder (prototype)

A separate tool that builds a public website for an Uwazi collection. You pick a
collection and a kind of site, and it opens finished, filled with the
collection's records. Then you edit blocks, text, theme and languages, check the
preview, and publish.

It is a sibling of the prototype in `app/`, not part of it. It reads
`app/src/tokens.css` for its colours and the prototype's seed collections
(exported to JSON), and it changes nothing in `app/`.

## Run it

```sh
cd sites
npm install            # or, next to a prototype checkout: ln -s ../app/node_modules node_modules
npm run dev            # builder at /, public site at /site.html
npx tsc --noEmit       # type check
npm run build          # tsc + vite build → dist/
npm run export-seed    # rebuild public/data/*.json from the prototype's seeds
```

The dev server takes `--port` like any Vite server.

## What is where

```
sites/
  index.html, site.html      two pages: the builder, and the public site it builds
  scripts/export-seed.mjs    prototype seeds → public/data/{sample,cejil,artworks}.json
  public/data/               the exported collections (the mock data source)
  public/artwork-images      symlink to the prototype's artwork pictures
  src/
    data/types.ts            DataSource: the one interface every block reads through
    data/mock.ts             MockSource: the exported JSON, queried in memory
    data/uwaziApi.ts         UwaziApiSource: stub; documents the endpoint for each call
    model/config.ts          SiteConfig: a whole site is ONE JSON document
    model/blocks.ts          the block registry (label, where it goes, defaults, form fields)
    model/templates.ts       the 8 site types and the collection profile they read
    render/                  the public site: Site.tsx + blocks/{content,collection,entity}.tsx
    builder/                 the builder: first run, page and site panels, preview, publish
    lib/                     storage, the builder↔preview message protocol, sources
```

### One document

A site is a `SiteConfig` (`src/model/config.ts`): languages, name, theme, menu,
footer, search-engine fields, custom code (off by default), and pages. A page is
a kind (`home`, `list`, `entity`, `about`, `custom`) and an ordered list of
blocks. A block is `{ id, type, hidden?, props }`, and `props` has one shape
per type (`BlockProps`). All text is per language (`L10n`); a missing language
falls back to the default and is marked "Not translated" in the builder.

The builder keeps `{ draft, published, versions[] }`. Editing changes the draft;
Publish copies it to `published` and records a version with a list of what
changed. Any version can be restored as the draft.

### Blocks read a DataSource

Every block that shows records calls the `DataSource` (`search`, `aggregate`,
`entity`, `entities`, `templates`, `thesauri`). The mock answers from JSON; a
real deployment answers from Uwazi. A block never reads a collection any other
way, so the renderer does not care which it gets.

### The preview is the real renderer

The builder shows `site.html?preview=1` in an iframe and sends it the draft over
`postMessage` (same origin, both ends check). In preview mode the renderer
outlines blocks and reports clicks back, so clicking a block in the preview
opens it in the editor; following a link in the preview switches the page being
edited. The same renderer, without `?preview`, is the public site: it reads the
published document and routes by the URL hash (`#/es/cases?country=Perú`,
`#/es/entity/<id>`).

### The eight site types

| Type | Home | Record page | Best with |
|---|---|---|---|
| Legal | search, browse by country / status / rights, latest, most cited | details, holding, documents, cited by, how to cite | CEJIL (Causa) |
| Research | lead study, topics, latest, search | abstract, details, download, related, cite | any |
| Numbers | key numbers, over time, map, by country, table, methodology | details, connections | CEJIL, Sample |
| Images | picture grid with viewer, collections | picture, caption and rights, more | Artworks |
| Index | search, A–Z of titles, A–Z of countries | details, connections | any |
| Editorial | story with records named inline, quote, timeline, sources, share | summary, details | any |
| Monitoring | status overview, filters, latest changes | status history, details, evidence, related | CEJIL (Medida Provisional) |
| Campaign | the ask with a button, numbers, featured cases, asks, sign-up, share | story, the ask again, details | any |

Every type also gets a results page (search + filters) and an About page.

**Monitoring on CEJIL is real data, derived.** A provisional measure carries up
to four dates — requested, granted, lifted, rejected. The export turns them into
a dated history and takes the latest step as the status (`export-seed.mjs`).
Uwazi has no status history of its own; a real deployment would need either this
derivation per collection or a dated status property.

## What a real deployment needs

- **Server rendering and a cache.** The prototype renders in the browser from a
  JSON file. A public site needs HTML on first load (search engines, slow
  phones, link previews), so the renderer runs on a server — the same React
  components, rendered per request — with a cache keyed on the published
  version and invalidated on Publish or when the collection changes.
- **The site document on the server.** `lib/store.ts` keeps it in
  localStorage. For real it is one record per site in Uwazi (draft, published,
  versions), written by the builder and read by the renderer.
- **A domain.** Each site on its own host name (or a path on the instance),
  with TLS. The renderer resolves host → site document.
- **Public data only.** `UwaziApiSource` must call the API as an anonymous
  reader, server-side, so restricted entities and unpublished files can never
  reach a site. The prototype's mock includes only public records.
- **Forms.** Contact, sign-up and "open a form" buttons are drawn but send
  nothing. For real: Uwazi's ContactForm endpoint (mail), a sign-up list (or an
  external service the site links to), PublicForm for submissions, and captcha
  on all of them.
- **Pictures.** Uploads are stored in the document as downscaled data URLs so
  the prototype stays one file. For real they are uploads to Uwazi's file store,
  referenced by URL, with the focal point kept in the document.

## Constraints kept

- No call to any live instance, summa.cejil.org included. `UwaziApiSource`
  rejects every call.
- No raw HTML or CSS anywhere except Whole site › Advanced → custom code.
- Colours come from `app/src/tokens.css`; the site's accent is the one colour a
  site chooses, and the builder checks its contrast in light and dark.
