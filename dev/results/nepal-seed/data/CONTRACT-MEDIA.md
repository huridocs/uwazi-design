# Media and documents pass: contract for research agents

Read `CONTRACT.md` first (all its hard rules still apply: no fact without a retrieved source, real names only as
published, no minors named, no private contact details, verbatim quotes only, verification statuses).
This file adds the **media** template and the document rules. Schema: `schema/templates.json` (template `media`),
`schema/relationTypes.json` (new types `depicts`, `documents`, `published_in`, `geolocated_by`; `reports_on`,
`concerns` and `targets` may now point at a media item), `schema/thesauri.json` (`media_kinds`, `platforms`,
`rights`, `content_warnings`, `media_verification`).

## Tooling limits (important)

WebSearch is exhausted for this session. Do not ask for more. Use `curl` and WebFetch against site-native
search pages and public APIs, with a plain browser user-agent:
- YouTube: `https://www.youtube.com/results?search_query=...` (parse `"videoId":"..."` in the page), then
  `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=<id>&format=json` for title and channel, and
  the watch page for `publishDate`, `lengthSeconds` (see `data/../scratchpad` helper pattern: regex on
  `"publishDate":"…"`, `"lengthSeconds":"…"`). A helper exists at
  `/private/tmp/claude-501/-Users-juanmnl-Developer-huridocs-uwazi-app/3e644fc2-413e-47cd-ac5e-6d498eb004ca/scratchpad/media/yt.py`
  (`python3 yt.py <id> <id>` prints publish date, length, channel, title).
- Apple Podcasts search API: `https://itunes.apple.com/search?term=...&entity=podcastEpisode&limit=50` (JSON: episode
  name, release date, duration, show, episode URL).
- Wikimedia Commons API (`commons.wikimedia.org/w/api.php`), outlet sites' own search pages, fact-check pages.
Be polite: no more than a few requests per second, no parallel hammering.

## Rights rule (the playground is public on GitHub Pages)

- **Bundle** (download into `media/`) only openly licensed items (Wikimedia Commons CC0, CC BY, CC BY-SA, public
  domain; open government licences). Record the file URL, licence, licence URL, author, attribution line.
- **Never download** copyrighted news photos, agency images, broadcaster footage or platform videos. Record them as
  links/embeds only: `rights: link-only`, `platform`, `page_url`, `outlet`, publish date, duration.
- **Graphic content** (bodies, injuries): link only, `content_warning: graphic`, never bundled; describe without
  detail.
- No minors identifiable by name; no private individuals' contact details or social handles in captions. A
  public post's URL may be recorded as the source of a misattributed clip, but do not name or characterise the
  private account holder; use the platform and post URL only.

## A media entity

`template: "media"`, id `media:<kind>-<yyyy-mm-dd>-<slug>` (date = recorded date if known, else published date).
Properties (names from `templates.json`): `caption` (what it shows, plain, no speculation), `media_kind`
(`photo`, `video`, `audio`, `graphic`), `embed` (the video/audio URL as a string, for embeds), `page_url`
(`{"url","label"}`), `platform`, `outlet`, `creator`, `rights`, `licence`, `licence_url`, `attribution`,
`recorded` (ISO date; `recorded_precision` day/hour/month), `published` (ISO date), `duration_seconds`,
`segment_start`/`segment_end` (seconds, for the relevant stretch of a longer video or audio; give them only
when the show notes, chapters or the fact-check state the time range; otherwise leave empty and say so in
`location_method`), `language`, `content_warning`, `geolocation` (`{"lat","lon","label"}` of the place shown, only
when a source established it or the item is a named public building), `location_method` (how place and time were
established: landmarks, signage, sun and shadow, matching to satellite or street imagery, metadata; and by whom),
`verified_by` (the outlet or organisation), `verification` (`confirmed`, `single-source`, `disputed`,
`misattributed`, `unverified`).
Every filled property needs an `evidence` entry (as in CONTRACT.md) citing `source:` ids. The media's own page is a
`source` entity too when it is an article page; for a bare video, the video page is the evidence for its title,
channel, date and duration (create a `source` entity for it with `publisher_type: social-media` or the right
type, `medium: video`/`social-post`, `url`, `published`).

References (same file format as CONTRACT.md):
- `depicts`: media -> event | location | person | organisation (what it shows).
- `documents`: media -> claim | action | event | casualty (evidence for, or the object of, a claim; for a
  misattributed clip use the existing claim entity from the `claims-and-verification` part when there is one, or
  create a claim).
- `published_in`: media -> source (article that carried it).
- `geolocated_by`: media -> source (the investigation or fact-check that located or dated it).
- `reports_on` / `supports` / `disputes`: source -> media or claim, with a verbatim `anchor` quote from that source
  (for example the fact-check sentence that says the clip is from another country).
Reuse existing ids: search `entities.json` (merged corpus) and `registry/ids.txt` before creating events,
locations, people, claims or sources.

## Output

`parts/media-<topic>.json` with the same shape as other parts (`entities`, `references`, optional
`entity_additions`). Append new ids to `registry/ids.txt` (append only). Files you download go under
`/Users/juanmnl/Developer/huridocs/uwazi_app/dev/results/nepal-seed/media/` (images: `images/`, max 1600 px long
edge) or `docs/` (documents). Final reply: counts by kind, rights and verification; list of anything you could not
verify or that you excluded and why. Do not paste data into the reply.

## Documents (PDF) rules (document agent)

For key primary documents: inquiry commission report (March 2026), NHRC Nepal report (May 2026), HRW, Amnesty and
OHCHR reports and statements, Nepal government notices (social-media registration notice of 28 August 2025, the
blocking decision, curfew and prohibitory orders, cabinet decisions, Home Ministry notices, the dissolution of
the House, the Karki cabinet and commission formation), Supreme Court orders and verdicts (including the 2024
social media registration directive). Include Nepali and English versions where both exist, with `language`
marked.
- **Bundle** to `docs/<doc-id>/doc.pdf` (at most about 15 MB each) only Nepal government documents and openly
  licensed ones, and record the licence or the basis (for a government document with no explicit licence say so:
  "Government of Nepal official publication; no explicit open licence stated").
  All-rights-reserved or no-derivatives documents (HRW, Amnesty, most UN publications unless the page grants
  reuse) are **link only**: record URL, publisher, date, language, pages if known, and the reason.
- For each bundled PDF extract text per page to `docs/<doc-id>/pages/001.txt`, `002.txt`, ... (use `pdftotext
  -layout -f N -l N` if available, else Python `pypdf`/`pdfminer`; if the PDF has no text layer record
  `text_layer: false` and do not invent text). Write `docs/<doc-id>/meta.json` (title, language, pages, bytes,
  sha256, source url, retrieved date, licence/basis, text_layer, translation_of).
- Create a `source` entity (or reuse one) for each document and, when the document is an order, notice or decision,
  an `action` entity; link `documents`-style: set the document as the primary document of that entity by listing
  it in `docs/index.json` as `{"entity": "<id>", "doc": "<doc-id>", "role": "primary"}`.
- Write `docs/index.json` (array of the records above for bundled docs) and `docs/linkonly.json` (array of
  `{"entity","url","publisher","title","date","language","reason"}`).
- Do not re-anchor quotes yourself; the merge step does that against your page text.
