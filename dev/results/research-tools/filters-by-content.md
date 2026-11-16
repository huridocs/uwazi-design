# Filters by content: Uwazi today, the prototype today, and a spec for a "Content" facet card

Read-only. Written 2026-10-05. Uwazi reference: `~/Developer/huridocs/uwazi-ref` at `731145c`. Prototype: playground `1b029c03`.
Juan: "filters could have a card by content: documents, images, media type; there's a lot to improve there. Check what
Uwazi currently allows."

## 0. Headline

- **Uwazi has no file or content filter at all.** Not in the Library sidebar, not in the search API. The only things it
  knows about a file (type, mimetype, size, language, status, page count) are stored and shown, never filterable. I
  searched `api/search/*`, `react/Library/*` and `react/V2/Routes/Library/*` for mimetype, attachments, processed,
  language-of-file and has-document: the only hits are the `_source` include list and the card's "processed" button.
- **Uwazi cannot filter on image, media, link, preview or geolocation properties either.** The template editor only
  offers the "Use as filter" switch for 12 property types (`ConfigPropertyPanel.tsx:56-69`), and none of those five is
  among them. The search matchers have no branch for them (`metadataMatchers.js:215-243`).
- **The prototype has one content-ish facet, "Documents", and it is wrong for Nepal.** It is a single on/off for "has a
  document" (`libraryFilter.ts:217`, `LibraryFilters.tsx:398-420`), true by corpus rules (`entityIsDoc`,
  `libraryFilter.ts:99-125`). For Nepal the card is hidden by a comment that says the records carry no files
  (`LibraryFilters.tsx:395-396`, `libraryFilter.ts:109-111`), which stopped being true when 51 records got PDFs and 26
  media items got images.
- **So a Content card is open ground**, and the Nepal and CEJIL corpora can fill most of it (counts in 4.4).

## 1. Part 1: what Uwazi allows today

Two Library UIs exist in uwazi-ref: the original redux Library (`app/react/Library`) and a rewrite
(`app/react/V2/Routes/Library`). Both are listed. "Per-template" means the control comes from a flag on a template
property; "global" means it is the same for the whole collection.

### 1.1 Library sidebar, original UI (`FiltersForm.jsx`, order as rendered)

| Order | Control | What it filters | Scope | file:line |
|---|---|---|---|---|
| 1 | Published / Restricted | `published` true/false, shown only to admin, editor, collaborator, with counts | global, role-gated | `PublishedFilters.tsx:30,42`; mounted `FiltersForm.jsx:83`; server `documentQueryBuilder.js:247-281` |
| 2 | Permissions: Can edit / Can view | the signed-in user's own access level | global, role-gated (editor, collaborator) | `PermissionsFilter.tsx:35,42,131`; aggregation `documentQueryBuilder.js:366` |
| 3 | Entity types (Templates) | `template` in a set, plus "missing"; groups from Settings, with a FEATURED / ALL switch | global (Settings › Filters) | `TemplatesFilter.tsx:94-111`; server `documentQueryBuilder.js:408-443` |
| 4 | Property filters | one control per template property with `filter` set, common to the selected types (or the `defaultfilter` ones when no type is chosen) | per-template | `FiltersFromProperties.jsx:105-200`; `shared/commonProperties.js:54-70` |
| 5 | Table of contents: Automatically generated / Reviewed | `generatedToc` on the entity's file, admin only | global, role-gated | `FilterTocGeneration.tsx:23,28`; server `documentQueryBuilder.js:358` |
| 6 | Shared as viewer / editor | `_permissions.read` / `write` by user or group | global, role-gated | `AssigneeFilter.tsx:59,70`; server `documentQueryBuilder.js:334-346,375` |

### 1.2 Property filters by type (what the control is, and what the API does)

| Property type | Sidebar control | API matcher | Notes | file:line |
|---|---|---|---|---|
| text, markdown, generatedid | text box | exact `term` on the value | `generatedid` too | `FiltersFromProperties.jsx` default branch; `metadataMatchers.js:1-3,215-220` |
| numeric | from / to range | `range gte/lte` | | `FiltersFromProperties.jsx:159`; `metadataMatchers.js:5-9` |
| date, multidate | date range | `range` (converted from a date description) | | `FiltersFromProperties.jsx:191-195`; `search.js:115-130` |
| daterange, multidaterange | date range | matches if the range's `from` or `to` falls in the window | | `metadataMatchers.js:73-88` |
| select, multiselect | checkbox list with counts; AND/OR switch for multiselect and relationship | `terms` (OR) or one `term` per value (AND); special values `any`, `missing` | lookups for long lists | `FiltersFromProperties.jsx:166-178`; `metadataMatchers.js:26-71` |
| relationship (v1) | same as select, options are entities of the target templates | same | `sort` on | `FiltersFromProperties.jsx:166-178`; `libraryFilters.js:13-23` |
| nested | grouped sub-filters per nested key | `nested` query, strict or loose | | `FiltersFromProperties.jsx:180`; `metadataMatchers.js:82-171` |
| inherited property | takes the filter type of the inherited property | as for that type | | `FiltersFromProperties.jsx:64-83`; `search.js:107-109` |
| newRelationship (v2) | takes the type of its denormalised property, else "relationship" | as for that type | | `FiltersFromProperties.jsx:66-76`; `search.js:111-113` |
| **image, media, link, preview, geolocation** | **none** | **none** | not in the filterable list | `ConfigPropertyPanel.tsx:56-69`; `metadataMatchers.js:215-243` |

Template flags that drive this: `filter`, `defaultfilter`, `prioritySorting` (`ConfigPropertyPanel.tsx:56-71`, edited per
property, so per-template).

### 1.3 V2 Library sidebar (`V2/Routes/Library/Components/LibraryFilters.tsx`)

- Status card (Restricted / Published, role-gated) at `:230-250`.
- `TypeFacet` (types with groups) at `:253`, `TypeFacet.tsx:50`.
- One facet per filterable property, by type: nested (`:113`), numeric range (`:131`), date range (`:143`), text (`:154`),
  relationship with server lookup (`:165`), keyword list (`:179`). AND/OR switch only for multiselect (`:192`).
- Not present in V2: the permissions, assignee and table-of-contents controls.
- Active-filter chips (`filterChipLabel.ts`, `ActiveFiltersSheet.tsx`) and filter state in the URL
  (`libraryUrlState.ts`, `risonLegacy.ts`), so a filtered Library is shareable.
- Settings › Filters in V2 (`Settings/Filters/FiltersTable.tsx:164-223`, `FiltersSidepanel.tsx:87-114`) edits only the entity-type groups
  ("Add entity type", "Add group"). It does not configure property or file filters.

### 1.4 Search API (`api/search/search.js:766-838`, `documentQueryBuilder.js`)

| Parameter | Effect | file:line |
|---|---|---|
| `searchTerm`, `fields` | `query_string`, falling back to `simple_query_string` if the term is invalid; over title, text properties and the full text | `search.js:757-774`; `documentQueryBuilder.js:156-224` |
| `types` | template filter, incl. `missing` | `documentQueryBuilder.js:408` |
| `ids` | by shared id | `documentQueryBuilder.js:444` |
| `language` (the UI language) | one language version of each entity | `documentQueryBuilder.js:236` |
| `published`, `includeUnpublished`, `unpublished` | published state | `search.js:772-782`; `documentQueryBuilder.js:247,257` |
| `filters` | per-property filters as 1.2 | `search.js:94-150,824-826` |
| `customFilters` | `generatedToc`, `permissions` (assignee) | `documentQueryBuilder.js:334` |
| `sort`, `order` | title, dates, `_score`, or `metadata.<name>`; select sorts by label; dates sort unmapped | `search.js:784-800`; `documentQueryBuilder.js:288` |
| `allAggregations`, `performAggregations` | which facets get counts | `search.js:808-835` |
| `aggregatePermissionsByLevel/Users`, `aggregateGeneratedToc`, `aggregatePublishingStatus` | the counts for the global controls | `search.js:849-861` |
| `geolocation` | only entities with a geolocation, for the map | `search.js:845` |
| `from`, `limit`, `include` | paging, fields returned | `search.js:775-781` |

`documentQueryBuilder.js:308` also has `hasMetadataProperties` (entities with any of a list of properties). The Library UI
does not use it.

### 1.5 Sort options (`react/Library/helpers/sortComponets.ts`)

Title, Date added, Date modified, and Relevance when a search term is active (`:70-80`), plus every property that has the
`filter` flag and is text, date, numeric or select (or inherits one) (`:33-47,50-66`).

### 1.6 Files: what Uwazi knows and does not let you filter

- A file record holds `entity, originalname, filename, mimetype, size, creationDate, language, iso639_3,
  type (custom | document | thumbnail | attachment), url, status (processing | failed | ready), totalPages, generatedToc,
  uploaded, toc, propertySelections` (`shared/types/fileSchema.ts:11-52`).
- The entity index stores `documents` and `attachments` in `_source` (`documentQueryBuilder.js:86-90`) and the document text as a
  child record `fullText_<language>` (`entitiesIndex.js:115-125`), so full-text hits carry the language of the file.
- Visible in the UI: a card's "view document" button is disabled until the entity is `processed`
  (`ViewDocButton.jsx:29-40`), and the upload status line shows `status` (`docState.js:12`).
- **Not filterable anywhere:** has document, file type or mimetype, attachment count, file language, page count,
  processing or OCR state, image or audio presence. The `generatedToc` flag is the only file-derived filter (admin only).

## 2. Part 2: what the prototype allows today

### 2.1 Library sidebar and filter state

| Control | What it filters | Scope | file:line |
|---|---|---|---|
| Status: Restricted / Published | `published` | global | `LibraryFilters.tsx:302-322`; predicate `libraryFilter.ts:218` |
| Template (types, with the CEJIL "Documentos" group) | `typeId` in a set | global | `LibraryFilters.tsx:325-420`; `libraryFilter.ts:216` |
| Documents (on/off, with the document types as children) | `entityIsDoc` | per corpus rule | `LibraryFilters.tsx:398-420`; `libraryFilter.ts:99-125,217`; hidden for Nepal |
| Countries (AND/OR, search) | country list | per corpus | `LibraryFilters.tsx:434-446`; `libraryFilter.ts:222` |
| Descriptors (CEJIL, AND/OR) | descriptor list | per corpus | `LibraryFilters.tsx:374-386`; `libraryFilter.ts:225` |
| Property and inherited facets (checkbox lists, counts) | values of properties flagged `filter`; Nepal adds Verification | per template | `LibraryFilters.tsx:448-486`; `libraryFacets.ts:37-58`; `data/nepal/adapt.ts:88-90`; `libraryFilter.ts:236` |
| Chain facets (path-coupled) | relationship paths | CEJIL only | `LibraryFilters.tsx:489-540`; `libraryFilter.ts:65` |
| Date range | one `date` per entity (start of an event, publication date) | global | `DateRangeCard`, `LibraryFilters.tsx:903-940`; `libraryFilter.ts:230` |
| Search with AND/OR/NOT, phrases, wildcards, history | title, properties, document text | global | `libraryFilter.ts:248,286`; `utils/queryTokens.ts` |
| Match type chips: Title / Properties / Document | which part of an entity matched | Results | `libraryFilter.ts:252,268` |
| Sort: Relevance, Date added, Title, Relationships, Template, Country + property sorts | | global | `data/libraryDisplay.ts:146-168`; `atoms/library.ts:594,891` |
| Language (reading language) | display option | global | `data/libraryDisplay.ts:173-186` |

State lives in atoms (`atoms/library.ts:115-121,376-399`): `libraryTypeFiltersAtom`, `libraryHasDocAtom`,
`libraryStatusFiltersAtom`, country, descriptor, date, inherited, chain. All filters AND across facets and OR within one
(`matchesAll`, `libraryFilter.ts:327`). There is no filter in the URL and no active-chip row (the count is a badge on the
Filters tab).

### 2.2 What each collection holds in files, images and media

Counts are from the data files in `app/public/*-data` and the seed modules; "entities" means records the Library lists.

| Collection | Entities | Files | Images | Media | Where the content lives |
|---|---|---|---|---|---|
| **Sample** (`mock`) | 104 | 16 entities of types court case, judgment, document are treated as having a document (`typeHasDocument`, `entityProfiles.ts:116-118`). The Files view reads one demo set of 19 file records (kinds pdf, document, audio, video, image, link) for the focused case, not per entity (`data/files.ts:2-31,81`) | 9 entities with an image | audio, video and link demo files in that set | `data/files.ts`, `/docs/*.pdf` (4 vendored judgments), `entities.ts` `image`/`images` |
| **CEJIL** | 4,398 distinct (13,194 rows: es, en, pt) | 5,245 file records for 3,140 entities (about 1.7 per entity, max 3), all `application/pdf`, 662 flagged `primary`; languages spa 3,152, eng 1,860, por 218, other 11, fra 2, glg 1; pages 1 to 5: 781, 6 to 20: 4,445, 21 to 100: 17, over 100: 2 (56,096 pages) | none (9 `preview` properties across templates, no image values) | 2 `media` properties across templates, no values counted | `cejil-data/files.json`; only 33 PDFs bundled in `cejil-docs`; page text `fullText.json` has 32 keys (26 by file id, 6 stand-in filenames), so 5,219 files resolve through the 6 stand-in filenames and show another document's text (`BorrowedDocLine`; `cejil/profile.ts:156-205`) |
| **Artworks** | 60 artworks plus artists | none | 60 (one image per artwork, 607 px wide and up, `artworks.ts`) | none | `public/artwork-images` |
| **Travesía** | 589 | none | none (template has 1 image property, no values) | none | records only |
| **Nepal** | 2,124 | 23 PDFs (14 are one page, 8 are 2 to 10, 1 is longer; 106 pages; 22 Nepali, 1 English; all machine-read OCR, unreviewed), attached to 51 entities (23 sources, 28 actions) | 26 bundled images (of 29 photos and graphics; 3 CC0 photos are link-only with the licence stated) | 104 media items: video 50, audio 25, photo 28, graphic 1; embed URL on 61; duration on 59; 34 with coordinates | `public/nepal-data/{entities,docs,relationships}.json`, `docs/`, `media/` |

Template property types relevant here, by collection (from the template seeds): CEJIL `preview` 9, `media` 2,
`geolocation` 2; Artworks `image` 1, `link` 1; Travesía `image` 1, `link` 2, `geolocation` 3; Nepal `image` 1, `media` 1,
`link` 6, `geolocation` 2; Sample none of these.

Nepal-specific fields that are already data but not facets: media `media_kind` (a facet when Type = Media, otherwise only
in the Media template), `rights` (mixes storage and licence in one value: `bundled-cc-by-sa`, `linked-cc0`,
`link-only`), `content_warning`, `platform`, `duration_seconds`, `language`. For documents, language, pages, `textSource`
and `licenceBasis` live in `NepalDoc` (`data/nepal/types.ts`), not on any property.

## 3. Compared: what Uwazi has that the prototype lacks, and the reverse

**Uwazi has, the prototype lacks (ranked by value to a researcher):**
1. **Range, "any" and "missing" on every property facet.** Numeric range (`FiltersFromProperties.jsx:159`), a date range per date
   property (`:191`), `any` and `missing` values (`metadataMatchers.js:26-71`), and AND for every multiselect and
   relationship. The prototype has one date range (on `date`), no numeric range, no "no value", and AND/OR only on
   Country and Descriptor (`LibraryFilters.tsx:434-446,374-386`).
2. **Active-filter chips and filters in the URL** (V2 Library: `filterChipLabel.ts`, `libraryUrlState.ts`). The prototype shows a badge count
   only and cannot share a filtered view.
3. **Permission and assignee filters** (Can edit / Can view; Shared as viewer / editor; `PermissionsFilter.tsx`,
   `AssigneeFilter.tsx`). The prototype has sharing (`entityAccessAtom`) but no Library filter by access.
4. **Text filter on a property** (`metadataMatchers.js:1-3`) and **nested property filters** (`metadataMatchers.js:82-171`). The
   prototype has 3 nested properties in CEJIL and no filter for them.
5. **Date modified sort** and sort by any filterable property (`sortComponets.ts:50-80`). The prototype sorts by Date added only
   (plus its property sorts).
6. **Generated-TOC review filter** (`FilterTocGeneration.tsx`), admin only. Low value here.

**The prototype has, Uwazi lacks:**
1. **Path-coupled relationship chains** as filters (CEJIL; `libraryFilter.ts:39-49`), where Uwazi v1 has only one hop (inherit) and v2 a
   denormalised value.
2. **Match-type chips** (title, properties, document), **search history**, a **time strip and brush**, and **verification** as a
   facet on Nepal.
3. **Faceted counts that exclude the facet's own selection** (`matchesAll(..., except)`, `libraryFilter.ts:327-338`), which Uwazi
   also computes server-side but the prototype computes in the browser for every facet at once.
4. **Group and sort controls on the Relationships panel** (outside the Library).

**Neither has any filter on files or media content.** That is the open ground.

## 4. Part 3: spec for a "Content" facet card

For Design to build. It is a new facet card in the Library sidebar that filters entities by what content they carry
and how it is stored. It follows the existing `FacetCard` / `FacetRow` pattern, so counts, "Clear" and the Filters
badge work as for every other facet.

### 4.1 Where it sits

Between **Template** and **Countries**, replacing the current **Documents** card (`LibraryFilters.tsx:398-420`), so the
order is Status, Template, Content, Countries, property facets, chains, Date. It is a card with a title ("Content") and
sub-groups, each a small heading and rows. First group open; the rest collapsed behind a "More" row so the card stays
short. Hidden when the collection has no content of any kind (Travesía, and Artworks' document groups).

### 4.2 Dimensions and copy

Combination rule, as for the rest of the sidebar: within a group, OR (with an "All of these" switch on the first
group only); across groups, AND. Counts are faceted: each row shows the number of results that would remain with that
row ticked, given every other selection.

| # | Group heading | Rows (exact copy) | Applies to | Source field |
|---|---|---|---|---|
| 1 | **Contains** | Document · Image · Video · Audio | any entity | derived `content.kinds` |
| 2 | **Where it is** | Stored in this collection · Linked or embedded | any entity with content | derived `content.storage` |
| 3 | **Language** | the languages present, by name (Spanish, English, Nepali, Hindi, Other) | entities with a document or media item | `content.languages` |
| 4 | **Length** | 1 page · 2 to 10 pages · 11 to 100 pages · More than 100 pages | documents | `content.pages` |
| 5 | **Text** | Embedded text · Machine-read (OCR, unreviewed) · Stand-in text · No text | documents | `content.textSource` |
| 6 | **Content warning** | None · Distressing · Graphic (link only) | media | `content_warning` |
| 7 | **Quoted passages** | Has quoted passages · 1 to 5 · 6 to 20 · 21 or more | entities with anchored outgoing references | `content.quotes` |

Notes on the copy:
- "Stored in this collection" and "Linked or embedded" replace the Nepal `rights` values `bundled-*`, `linked-*` and
  `link-only`. The licence stays a separate property, shown on the record (a licence is not a storage fact, and today they
  share one facet value).
- "Stand-in text" is for CEJIL files whose page text is another document's (`BorrowedDocLine`), 5,219 of 5,245 files.
  Show it only for collections that have it. Row hint: "The page text comes from a similar document, not this file."
- "Machine-read (OCR, unreviewed)" carries a hint: "Read by software and not checked against the scan."
- "Graphic (link only)": hint "Shown as a link with a warning; never stored here."
- Empty card, if it is shown with nothing selected and no content in the filtered set: "No files, images or media in these results."
- Group 5 and 4 appear only when a Document is selectable in the current results; group 6 only when media exist.

### 4.3 State and model (prototype terms)

- A derived, cached `entityContent(e)` per entity, registered per corpus like the property readers
  (`registerEntityPropReader`, `data/entityMetadata.ts`): `{ kinds, storage, languages, pages, textSource, warning, quotes }`.
  Providers: Sample (`typeHasDocument`, `e.image`), CEJIL (`files.json` through `docFilesFor`), Artworks (`e.image`),
  Travesía (none), Nepal (`NepalEntity.docs`, `.image`, media metadata, quoted references).
- One new facet key `content` in `FacetKey` (`libraryFilter.ts:88`) and one predicate beside `doc`; one atom
  `libraryContentFiltersAtom` holding `{ kinds, storage, languages, pages, textSource, warning, quotes }` as sets, reset by
  the Clear and by corpus switch (`atoms/library.ts:961-1001`).
- The existing `libraryHasDocAtom` becomes "Contains: Document" and the old Documents card goes; `entityIsDoc` stays as the
  rule for CEJIL's document types only.
- Filter chips and the Filters badge count each ticked row (`libraryActiveFilterCountAtom`, `atoms/library.ts:1008`).
- On a phone the card is a section of the Filters sheet, rows 44 px.

### 4.4 What each collection can populate (counts)

| Row | Sample | CEJIL | Artworks | Travesía | Nepal |
|---|---|---|---|---|---|
| Contains: Document | 16 of 104 (by type) | 3,140 of 4,398 entities (5,245 files) | 0 | 0 | 51 entities (23 PDFs) |
| Contains: Image | 9 | 0 | 60 | 0 | 26 |
| Contains: Video | 1 demo file | 0 | 0 | 0 | 50 |
| Contains: Audio | 1 demo file | 0 | 0 | 0 | 25 |
| Stored in this collection | 16 + 9 | 33 PDFs bundled (3,140 entities carry a record) | 60 | 0 | 51 + 26 = 77 |
| Linked or embedded | 0 | 0 | 0 | 0 | 78 (75 link-only plus 3 linked photos) |
| Language | document: EN, ES, FR, AR renditions of one case | spa 3,152, eng 1,860, por 218, other 11, fra 2, glg 1 (files) | n/a | n/a | documents: Nepali 22, English 1; media: English 76, Nepali 17, other 7, Hindi 4 |
| Length | 4 vendored PDFs (pages from the file) | 781 / 4,445 / 17 / 2 (1 to 5, 6 to 20, 21 to 100, over 100) | n/a | n/a | 14 one-page, 8 of 2 to 10, 1 longer (per document) |
| Text | embedded (PDF.js) | stand-in for 5,219 of 5,245 files; own text for 26 | n/a | n/a | machine-read, 23 of 23 |
| Content warning | n/a | n/a | n/a | n/a | none 56, distressing 20, graphic 4, not assessed 24 (media only) |
| Quoted passages | n/a (references carry selections in the mock, not counted) | 0 (CEJIL references have no selections) | n/a | n/a | 647 sources: 571 with 1 to 5, 71 with 6 to 20, 5 with 21 or more (maximum 45) |

Reading the table: the card is fully useful in **Nepal**, useful for Document, Language and Length in **CEJIL**, and a
one-row card (Image) in **Artworks**. For Sample the card reduces to Document and Image. Travesía shows no card. Design
should therefore treat groups 4 to 7 as conditional, not as fixed furniture.

### 4.5 Data caveats the build has to handle

- The Nepal `rights` value mixes licence and storage; split it in the adapter (`data/nepal/adapt.ts`) rather than in the UI.
- Nepal documents belong to both a Source and an Action (51 entity links for 23 PDFs); counts per entity are about
  double the counts per document. Show entity counts in the card, as every other facet does.
- 24 Nepal media items (all audio) have no content warning set; show them under "Not assessed" instead of hiding them,
  or the three visible values would not add up to the media total.
- CEJIL "has document" must keep using the file records, not `preview`, which is unset in the data
  (`cejil-data/entities.json` has no `preview` on any of the 13,194 rows).
- Language is per file for documents and per item for media; present one list and let the filter match either.

## 5. Ranked list of improvements ("a lot to improve")

Ranked by value for a researcher per unit of work. 1 is this brief's card.

| Rank | Improvement | Why | Size | Uses |
|---|---|---|---|---|
| 1 | **Content card** (section 4), including fixing the stale Nepal Documents rule | Neither product has it; Nepal now has 51 documents and 104 media items that nothing can be filtered by | S to M | existing `FacetCard`, new derived index |
| 2 | **Range, "no value" and "all of" on property facets** (numeric and per-date-property ranges, `any`/`missing`, AND for every multiselect) | Uwazi has them (`metadataMatchers.js:5-71`); the Nepal template already flags `age`, `reported_fatalities`, `recorded`, `published` for filtering | M | `FacetKey`, a mode per facet |
| 3 | **Split Nepal `rights`** into storage and licence facets | One facet mixing bundling and licence cannot be filtered either way | S | adapter only |
| 4 | **Active-filter chips and a shareable filter state** | V2 Uwazi has both; the prototype shows a count badge and cannot hand a filtered view to someone | M | atoms to a URL-safe state, chip row |
| 5 | **Relationship-derived facets** (Where, Who, Claimed by, Published by; see `gap-analysis.md`) | Turns the relationships panel into filters | M | chain engine, now CEJIL only |
| 6 | **Date modified and per-property sorts** in the toolbar (recorded, published, asserted on) | The flags exist (`prioritySorting`); only Date added is offered | S | `LIBRARY_SORTS` |
| 7 | **Permission and "shared with" filters** | Uwazi has them; the prototype has the sharing model | S to M | `entityAccessAtom` |
| 8 | **Text and nested property filters** | Uwazi has them; three CEJIL nested properties are unfilterable | M | rarely needed in Nepal |
| 9 | **Persist card order, open state and "More" folds** per collection | The sidebar gets long once Content, chains and property facets are all present | S | session setting |

## 6. What I did not verify

- The prototype's UI was not run; line numbers and card order are from the code.
- Nepal counts are from `app/public/nepal-data/*.json` as built on 1b029c03 (26 bundled images, 3 linked photos); the
  research files in `dev/results/nepal-seed` still say 29 bundled.
- CEJIL "stand-in text for 5,219 of 5,245 files" is computed from `fullText.json` (26 keys match a file `_id`, 6 match a filename) and the
  filename fallback in `docPagesOf` (`cejil/profile.ts:194-197`); I did not render any file to confirm.
- The count of Sample entities with an image (9) and of Sample files (19) is from the seed modules, not from a Library run.
- Uwazi behaviour is from reading `uwazi-ref` code, not from running it.
