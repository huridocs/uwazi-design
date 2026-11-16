# Practice scan: how OSINT standards and tools treat link evidence

Scanned 2026-10-12. Scope: seven concerns for a link (edge) between two things: (1) provenance,
(2) verification / confidence, (3) time, (4) contradiction, (5) capture integrity and custody,
(6) source reliability, (7) audit trail.

Convention: a URL in parentheses means I opened that page (or, for PDFs, extracted its text locally
with pdftotext) and the statement comes from it. "(unverified)" means memory or a search snippet only.
Field names are quoted only where a fetched page showed them.

Important framing: only FtM/Aleph, Maltego, Kumu and Graph Commons model a link as a data object.
The Berkeley Protocol, Bellingcat's tools and Hunchly describe how to treat a captured item or a
page, and say little about links as such. The Admiralty grid, i2 and ACH describe judgments on
information or hypotheses, not on edges.

## 1. Berkeley Protocol on Digital Open Source Investigations (UN OHCHR / UC Berkeley HRC, 2022)

Source: https://www.ohchr.org/sites/default/files/documents/publications/OHCHR_BerkeleyProtocol.pdf
(102 pages; paragraph numbers below are the Protocol's own).

- Per-item collection record (para 155): the first three items (URL, HTML source code, full-page
  capture with date and time shown) are "a minimum standard for providing evidence in court". Full
  list: target web address, source code, full-page capture, embedded media files, embedded metadata,
  contextual data, collection data, hash value. Collection data is: name of the collector, IP
  address of the machine, virtual identity used if any, a time stamp; the system clock should be
  synchronised with an NTP server.
- Embedded metadata to collect (para 155(e)): uploader user identifier, post/picture/video
  identifier, upload date and time, geotag, hashtag, comments, annotation. Contextual data (155(f)):
  comments, upload information, uploader profile data, when relevant to understanding the item.
- Hash (155(h)): added manually or by the tool at the point of collection, "has not been
  modified since the time of collection". Hash type is to be chosen from the currently accepted
  standard (NIST named). Para 172: check hashes of random samples regularly to detect degradation.
- Custody (para 167): chronological documentation of the sequence of custodians, with "control, date
  and time, transfer, analysis and disposition". Para 168-169: keep an unaltered evidentiary copy
  and a separate working copy; "any and all changes to the item, including the making of copies,
  should be documented". Para 156: a technical report per automatically collected item.
- Verification is split into three considerations, compared "for consistency" (para 176): the
  source, the digital item or file, and the content. Source analysis (177-182) lists provenance
  ("first copy found online" preferred over "first copy online", 178), credibility from posting
  history (179), independence and impartiality (180), specificity (181), attenuation, meaning
  contemporaneous texts are weighed higher (182).
- Terms (chapter II, "Credibility versus reliability"): credibility is believability or
  trustworthiness; reliability is performing consistently; veracity or validity is accuracy.
- I found no numeric or lettered verification scale, no named verification levels and no
  confidence grid. Confidence is handled through the reporting duties: state "gaps or
  uncertainties" (210(e)), completeness (208(c)), and include exculpatory information (208(a)).
  Footnote 79 notes the standard differs by forum ("beyond reasonable doubt" vs "reasonable
  grounds to believe").
- Contradiction: "internal consistency" (193, an item should not contradict itself) and "external
  corroboration" (194, outside information that coincides with the item). Circular reporting is named
  as a risk (187). The Protocol gives no rule for recording a contradicting item against a claim.
- Time: chronolocation is "the corroboration of the dates and times of the events depicted" (191),
  separate from upload date and from collection time stamp. Where creation time is unclear this
  weakens the attenuation factor (182).
- Audit: security chapter lists "Log systems to audit activities and track user actions" as an
  organisational control; Annex IV is an online data collection form (collector, start and end of
  collection time stamps, URL, HTML source, screenshot, package hash list, hash of that list,
  software, time service, IP service, WHOIS service).

## 2. Bellingcat (Auto Archiver, geolocation guides)

- Auto Archiver per-item spreadsheet features, as listed by Bellingcat: link to archived content,
  link to screenshot, page title, "Upload time of the post", "Archive process timestamp",
  "Cryptographic hash of the content" (useful "to later test for tampering"), and for video a
  thumbnail, frame thumbnails and duration
  (https://bellingcat.com/resources/2022/09/22/preserve-vital-online-content-with-bellingcats-auto-archiver-tool/).
- The same article says the hash in a Google Sheet "does not necessarily meet all forensic
  requirements for later use of the video in legal proceedings", and that the Wayback Machine is
  "a limited fallback mechanism" that likely will not archive video. It does not say whether the
  operator is recorded per run.
- Module docs (v1.0.1): Hash Enricher writes `<algorithm>:<hash>` into media metadata, default
  `SHA-256`, `SHA3-512` also listed
  (https://auto-archiver.readthedocs.io/en/v1.0.1/modules/autogen/enricher/hash_enricher.html).
- Timestamping Enricher makes RFC 3161 tokens from time stamp authorities over a text file of the
  aggregated file hashes; it uses several authorities for redundancy and must run after the hash
  enricher (https://auto-archiver.readthedocs.io/en/v1.0.1/modules/autogen/enricher/timestamping_enricher.html).
- The enricher index also names a Wayback Machine Enricher, WACZ Enricher, Archive Metadata
  Enricher and OpenTimestamps Enricher; I did not open the last three
  (https://auto-archiver.readthedocs.io/en/latest/modules/enricher.html). Archive Metadata
  Enricher records total media size and archive duration only
  (https://auto-archiver.readthedocs.io/en/v1.0.1/modules/autogen/enricher/meta_enricher.html).
- Geolocation / chronolocation write-up (sun and shadows guide): conclusions are stated in hedged
  language ("It is plausible to assume..."), alternatives are listed before elimination, visuals are
  annotated, tool links reproduce "the exact same variables", and the video timestamp and upload
  time are checked against local time. No explicit confidence level or rating is assigned
  (https://www.bellingcat.com/resources/2020/12/03/using-the-sun-and-the-shadows-for-geolocation/).
- The Auto Archiver article says investigators must still verify incidents before they are added to
  a map: capture and verification are separate steps.

## 3. FollowTheMoney (FtM) schema, Aleph / OpenAleph, nomenklatura

- Links are entities. `Ownership` is an edge with `Ownership:owner` as source and
  `Ownership:asset` as target; `Documentation` links "some entity to a document" with
  `Documentation:document` and `Documentation:entity`; `UnknownLink` uses `UnknownLink:subject` and
  `UnknownLink:object` (https://followthemoney.tech/explorer/schemata/Ownership/,
  .../Documentation/, .../UnknownLink/).
- Time on a link, from `Interval`: `startDate` ("on which a relationship ... started"), `endDate`,
  and a fallback `date` ("prefer those when available") (https://followthemoney.tech/explorer/schemata/Interval/).
  Event and link share this shape; Interval is abstract and used through schemata such as
  Membership, Employment, Ownership, Payment, Event, UnknownLink.
- Link provenance properties on `Interval`: `proof` (label "Source document", type entity),
  `sourceUrl` ("Source link"), `publisher`, `publisherUrl`, `recordId` ("Identifier of a record
  upon which this link is based"), `alephUrl`, `summary`, `description`, `namesMentioned`,
  `retrievedAt` ("Retrieved on", set by a data-gathering system), `modifiedAt` ("Modified on")
  (same Interval page). `Thing` also has `createdAt`, `notes`, `documentedBy`
  (https://followthemoney.tech/explorer/schemata/Thing/).
- Statement-level provenance: every property value is a statement with `entity_id`, `prop`,
  `prop_type`, `value`, `lang`, `original_value` (pre-cleaning), `dataset`, `origin` (processing
  phase or source file), `schema`, `first_seen`, `last_seen`, `external` (suggested addition pending
  human approval), `canonical_id` (https://followthemoney.tech/docs/statements/). The page says
  `first_seen` tracking began in July 2021.
- Interval's `retrievedAt` / `modifiedAt` are source-side or gatherer-side dates; statements'
  `first_seen` / `last_seen` are the pipeline's own observation dates. Both are separate from
  `startDate` / `endDate` (when the relationship held).
- No field for verification state, confidence or reliability exists on Interval or Thing in the
  pages I opened (`status` and `role` come from `Interest` and describe the relationship, not the
  evidence).
- Entity resolution (nomenklatura): a judgement between two entities is `positive`, `negative`,
  `unsure` or `no_judgement`; an edge stores `created_at`, `deleted_at`, `judgement`, `score` and
  `user` (https://raw.githubusercontent.com/opensanctions/nomenklatura/main/nomenklatura/judgement.py,
  .../resolver/edge.py). This is the only per-decision "who and when" I found in the FtM stack, and
  it applies to merging entities, not to asserting links.
- Aleph docs: an investigation is a workspace users can "upload, edit, and organize data" in and
  share; relationships such as ownership carry properties like start and end dates
  (https://docs.aleph.occrp.org/users/getting-started/key-terms). The key-terms page does not
  describe provenance tracking or edit permissions, and the entity editor page does not mention
  history (https://docs.aleph.occrp.org/users/investigations/entity-editor).

## 4. Maltego

- Link attributes in the SDK (Python): on `graph.add_link`: `is_reversed`, `thickness`, `style`,
  `color`, `label`, and `properties` as `MaltegoLinkProperty` entries with `name`, `value`,
  `display_name`. Styles `NORMAL`, `DASHED`, `DOTTED`, `DASHDOT`; thickness `THICKNESS_DEFAULT`
  and `THICKNESS_1` to `THICKNESS_4`; colours none, blue, green, yellow, purple, red
  (https://support.maltego.com/en/support/solutions/articles/15000062339-entity-features-overlays-links-notes-).
- Weight is an entity setting ("Control entity importance/ranking"), needs Maltego Graph Desktop,
  and is not a link attribute in that article. Notes (`entity.note`) are on entities, not links;
  the article does not document link notes (same page).
- View tab: "Show Transform Link Labels" displays the name of the transform that created each link;
  "Show Custom Link Labels" is a global toggle; "Properties Affect Appearance" lets link properties
  change how a link draws (https://support.maltego.com/en/support/solutions/articles/15000010458-view-tab).
  This is the only link provenance Maltego shows by default: the producing transform's name.
- The entity-features article states no creator or timestamp for links. I did not find per-link
  verification, confidence, time-validity or audit fields in the pages opened.
- Time, contradiction and reliability: not found in the pages opened.

## 5. Hunchly

Primary source: Hunchly Evidence Guide, rev. 1.0, 17 October 2018, text extracted from
https://hunch.ly/resources/Hunchly%20Evidence%20Guide.pdf (dated; behaviour may have changed).

- Capture format is MHTML produced by Chrome; the header carries `From`,
  `Snapshot-Content-Location` (URL), `Subject` (page title) and `Date` (UTC time Chrome saved the
  page). Hunchly shows local time, so the displayed time and the file's can differ, plus a
  processing delay (guide section 2; also https://support.hunch.ly/article/51-1-the-mhtml-file-format).
- Each page gets a Page ID that is global across cases; files are named `PAGEID.mhtml`. Gaps in IDs
  are explained by other cases or by deletions (guide section 2).
- Every MHTML file, photo and attachment is hashed with SHA-256 before storage; the hash shown in
  the dashboard "should ALWAYS match" an independent computation (guide section 3;
  https://support.maltego.com/en/support/solutions/articles/15000061289-content-photo-and-attachment-hashing).
- Each capture is signed with a GPG key generated at install, as `PAGEID.mhtml.sig`; the public key
  (`public.key`) is in a full case export (guide section 4).
- The guide states its own limits: a hash does not show the content was unchanged before export, and
  because the key is local an investigator with technical skill could re-sign altered content. It
  suggests checking the live page or the Wayback Machine, or obtaining the original by legal means.
- Deletion log: `deletion.log` in the case folder records deletion of tags, notes and pages with a
  time, and for pages the URL and capture date (guide section 5). Hunchly's home page also claims an
  "automatic, transparent audit trail" and records "URL, timestamps, and hashes of every page"
  (https://www.hunch.ly/).
- Analyst layer: tags on captured pages, selectors (names, emails, IP addresses; the page records
  where each selector is "hit" and can filter History by selector, export to CSV), notes (a
  screenshot of the viewable area plus text, dragged into reports), and report export as DOCX or
  PDF (https://support.hunch.ly/article/18-2-setting-up-your-first-selector,
  https://support.hunch.ly/article/23-5-using-notes-in-hunchly, https://academy.maltego.com/hunchly).
  The notes article does not say whether notes carry author or time.
- Hunchly attaches evidence to a page capture, not to a relationship. There is no link object.

## 6. Kumu

- Core fields on a connection: Label, Type (mutually exclusive), Connection direction (directed,
  undirected, mutual), Description (Markdown and widgets), Tags (several allowed), Image, URL,
  ID. Custom fields are added per connection with "+New Field", with type, prompt, category and
  privacy (https://docs.kumu.io/guides/fields).
- Dates are only a custom field type. There is no core source or citation field; a reserved
  "Footnotes" category is for "attribution and citing your sources". The docs do not mention
  weight or strength as a core field, but selectors can filter on a custom connection field
  (e.g. `person --[strength > 5]--> person`) (https://docs.kumu.io/guides/selectors.md).
- Filtering: hide by element or connection type; "Also include" and "But ignore"; tags via
  selectors such as `element["tags"*="Board of Directors"]`; other fields via a rocket icon
  (https://docs.kumu.io/guides/filter.md). Selectors support numeric comparison and the built-in
  `created` and `updated` date fields, and connection selectors `:from()`, `:to()`, `:directed`,
  `:undirected`, `:mutual` (selectors page).
- Audit: an Activity feed (Pro workspaces only) shows project changes and "who made each edit and
  when"; per-element detail and restore are not stated (https://docs.kumu.io/guides/activity-feed.md).
- Verification, reliability, contradiction and capture integrity: not found.

## 7. Graph Commons

- Import: edge sheet requires `From Type`, `From Name`, `Edge Type`, `To Type`, `To Name`;
  `Weight` is optional (default 1, sets thickness, affects layout and analysis); any other column
  becomes an edge property; repeated connections are advised as one row with the count in Weight
  (https://docs.graphcommons.com/create/importing-data.md).
- Creating a link in the editor asks for relationship type, optional colour and a directed checkbox;
  undo and redo work only until the graph is saved
  (https://docs.graphcommons.com/create/creating-a-graph.md).
- The info panel lists relationship types with colour and quantity; hovering a type shows its
  direction and the node types it connects (https://docs.graphcommons.com/explore/analyzing-a-graph.md).
  I did not find edge filters by property, or any date, source, citation or history field, in the
  pages opened.

## 8. Classic analysis methods

- Admiralty / NATO 6x6 grid: two ratings assessed independently. Source reliability A "Completely
  reliable", B "Usually reliable", C "Fairly reliable", D "Not usually reliable", E "Unreliable",
  F "Reliability cannot be judged". Information credibility 1 "Confirmed by other sources", 2
  "Probably True", 3 "Possibly True", 4 "Doubtful", 5 "Improbable", 6 "Truth cannot be judged".
  The page says source reliability does not influence the assessed accuracy of the report, and that
  the system is used by NATO members and Five Eyes; it does not name STANAG or AJP-2.1
  (https://en.wikipedia.org/wiki/Admiralty_code).
- i2 Analyst's Notebook / i2 Analyze: chart items carry grade fields (source reliability, information
  confidence, a handling or privacy grade) and source type and source reference; grade schemes can be
  customised; source references have a required source name and optional type, location and image
  URL, and ingestion-created ones are system-governed while analyst-created ones are editable
  (unverified: search snippets of docs.i2group.com; the pages redirect to a login and could not be
  opened). Check page-level detail before relying on it.
- ACH (Heuer, CIA, 1999): eight steps. Hypotheses across, evidence down; each cell is
  consistent, inconsistent or not applicable (any notation; "C, I, and N/A" given as one example);
  diagnosticity is how much an item distinguishes between hypotheses, and evidence consistent with
  all hypotheses has none; work down the columns to try to disprove; a sensitivity step asks what
  changes if key evidence is wrong; optional scales for importance and for "ease with which items
  of evidence could be concealed, manipulated, or faked". Chapter 8 describes the matrix as a way
  "to leave an audit trail to show what they considered"
  (https://www.cia.gov/resources/csi/static/Pyschology-of-Intelligence-Analysis.pdf). A secondary
  summary lists a PARC ACH 2.0 tool that rates evidence credibility and relevance, and criticism
  that the matrix is a static snapshot and cumbersome at scale (https://en.wikipedia.org/wiki/Analysis_of_competing_hypotheses).
- Palantir (Foundry): a link type is "the schema definition of a relationship between two object
  types" with a display name per side; the page does not say whether links carry properties, and says
  nothing about provenance or time
  (https://palantir.com/docs/foundry/object-link-types/link-types-overview/). Lineage and audit
  claims came only from search snippets (unverified). Nothing on Gotham source citations was found.

## Table: concern x tool

| Concern | Berkeley Protocol | Bellingcat | FtM / Aleph | Maltego | Hunchly | Kumu | Graph Commons | Admiralty / i2 | ACH |
|---|---|---|---|---|---|---|---|---|---|
| 1 Provenance | URL, source code, collector, uploader id; "first copy found online" | archive link, platform archivers, upload time | `proof`, `sourceUrl`, `publisher`, `recordId`; statement `dataset`, `origin` | transform name shown on link | page capture URL, tag, note (no link object) | custom field or "Footnotes" | custom edge property | i2: source type, source reference (unverified) | not found |
| 2 Verification / confidence | no scale; source / item / content checks | hedged prose only | none on Interval; nomenklatura `judgement` for merges | not found | not found | custom field only | not found | information credibility 1-6 | consistent / inconsistent / N/A per hypothesis |
| 3 Time | collection time stamp, upload time, chronolocation | upload time, archive timestamp | `startDate`, `endDate`, `date`; `retrievedAt`; `first_seen`, `last_seen` | not found | UTC capture date in MHTML header | custom date field; `created`, `updated` | not found | not found | milestones to watch (step 8) |
| 4 Contradiction | internal consistency, external corroboration | not found | not found | not found | not found | not found | not found | credibility 5 "Improbable" | core method: matrix, disprove first |
| 5 Capture integrity / custody | hash, evidentiary vs working copy, custody log | SHA-256, RFC 3161, Wayback | `retrievedAt` only | not found | SHA-256, GPG signature, deletion log | not found | not found | not found | not found |
| 6 Source reliability | credibility, independence, specificity, attenuation | not found | not found | not found | not found | not found | not found | A-F reliability | optional "faked" and importance scales |
| 7 Audit trail | log systems to audit user actions; document all changes | not found | statement `first_seen`; edge `user`, `created_at` (merges) | not found | `deletion.log` | Activity feed (Pro) | undo until saved | not found | matrix kept as record |

## Patterns that recur

1. Source and claim are separate objects. FtM has `proof` pointing to a document entity plus
   `sourceUrl` / `publisher`; Berkeley separates the evidentiary copy from the working copy;
   Hunchly attaches notes to captures. Nobody stores the evidence only as text on the link.
2. Three clocks are kept apart: when the relationship held (FtM `startDate` / `endDate`), when the
   source was published or the item uploaded, and when it was captured or first seen
   (`retrievedAt`, `first_seen`, MHTML `Date`, "Archive process timestamp"). The prototype's
   `period` covers the first only.
3. Reliability of the source and credibility of the information are rated separately (Admiralty
   A-F and 1-6; Berkeley's separate source, item and content checks). Rating a link with one
   verification state conflates them.
4. Integrity is done at capture, per item: hash plus a signed or timestamped record, with the tool
   recording collector and time (Berkeley para 155, Auto Archiver, Hunchly). Both Hunchly and
   Bellingcat say publicly that the hash alone is not forensic proof.
5. Link-level fields in graph tools stay thin: type, direction, label, description, tags, weight,
   a free property bag. Provenance and dates are added as custom fields by the user (Kumu, Graph
   Commons) or not at all (Maltego beyond transform name).
6. Contradiction is a method (ACH matrix, Berkeley corroboration) rather than a field. No data
   model I opened has a "disputes" relation between a source and a link; Admiralty expresses it
   only as the credibility grade 5.
7. Audit trails are narrow: a deletion log (Hunchly), an activity feed on a paid tier (Kumu),
   user / timestamp on entity-merge judgements (nomenklatura). Berkeley asks for them as an
   organisational control without a schema.
8. Verification vocabularies stay prose or small enums (Berkeley: none; Admiralty: 6; ACH: three
   marks). The prototype's three states (confirmed, single-source, disputed) are within that range.

## What I could not verify

- i2 Analyst's Notebook / i2 Analyze grade and source-reference behaviour: docs.i2group.com
  redirects to a login; only search snippets seen.
- Palantir Foundry / Gotham: provenance, link properties, audit log contents, source citations.
  Only the link-type overview page was opened.
- Hunchly: exact report and export contents, notes' author and time, tag details; the
  support articles for export and reports contain only video descriptions. The evidence guide is
  from 2018.
- Auto Archiver: Google Sheets column names (the article says they are configurable), WACZ and
  OpenTimestamps enricher behaviour, whether the operator is recorded per run.
- Bellingcat: any published rating or confidence language across its investigations; I read only
  one geolocation guide and the Auto Archiver article.
- Aleph / OpenAleph UI: whether notes, comments or edit history exist on entities or relationships;
  the pages opened did not say. nomenklatura `user` is verified from source code only for merge
  judgements.
- Kumu: per-element history and restore; Graph Commons: edge date, source or history features (only
  import, create and analyze pages opened).
- Maltego: any link-level time, notes or verification; only SDK and View tab pages opened.
- Berkeley Protocol: paragraph numbers for the "Credibility versus reliability" definitions and for
  the Security chapter's log list were not read from the page's numbering reliably; chapter named
  instead. Two-column PDF text extraction may misorder some items.
