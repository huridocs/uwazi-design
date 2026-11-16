# Las Vegas Route 91 shooting (1 October 2017): OSINT seed, phase 1 (research and report)

Status: phase 1 (research, sections 0 to 9) and phase 2 (the seed, section 10) are done. No app code, no media downloaded or bundled.
Written 2026-10-07 by the Research lane. Juan answered the rights questions ("everything is public, use it"); section 10 records what that changed. Counts in sections 1 and 6 are phase 1 estimates; section 10 has the real ones.

## Hubs (`data/hubs.json`, supplement of 2026-10-14)

A hub is a set of references that share one `hubId` in the app and have 2 or more distinct member records
(CLAUDE.md, Data model and Relationships panel). The app draws it as one row whose pills are the members. `data/hubs.json`
says which seed references form which hub, so `scripts/build-vegas-corpus.mjs` can set `hubId` without deriving anything. The file is generated,
never edited:

    python3 -I data/build_hubs.py          # write data/hubs.json
    python3 -I data/build_hubs.py --check  # exit 1 when the file is stale

Run it after `data/build_seed.py`: it keys on reference ids, which are numbered in build order (`ref:vegas-00001`, ...) and shift when the seed is rebuilt.

**Shape.** One object: `version: 1`, a `kinds` table that describes each kind, and `hubs`, sorted by id.

    {"id": "hub-moment-volley-09",        // stable and readable: hub-<anchor kind>-<anchor slug>[-<relation type>]
     "kind": "moment-capture",
     "anchor": "moment:volley-09",           // the record the hub is about; one end of every reference in the hub
     "relationType": "captures",       // the seed relation type of every reference in the hub
     "memberIds": ["..."],             // distinct records at the other end, in first-seen order; always 2 or more
     "refIds": ["ref:..."]}            // references.json `id`, in file order: the only key the build needs

**Key.** `refIds` hold the `references.json` `id`, the value the build already keeps as the reference's id.
`memberIds` is for checking, not for lookup.

**Rules.**
- `moment-capture`: one hub per moment, over its `captures` links from Recording records. It is one fact (the volley at
  that time) seen by several recordings, each with its own anchor (offset and clock) kept on the reference. 733 `captures`
  links go to 30 moments; 24 moments have 2 or more recordings.
- The moment's other links (`occurred_at`, `fired_from`, `followed_by`, `documents`) are not parties to the capture and
  have no hub. A recording's clock being off its moment's median is not a dispute; that stays in `contest.clock`.
- A reference is in at most one hub. The kinds are keyed on relation types that no other kind uses, so groups cannot
  overlap; the script fails if one ever does. A reference of any other type, or in a group with one member, has no hub and
  stays a plain reference.
- Privacy: no hub names a record the seed's rules withhold. The script checks every hub id, anchor title and member title against `privacy-denylist.txt` by validate.py's word-boundary rule (0 hits).

**Counts** (1,655 references; 727 are in a hub). 24 hubs, all `moment-capture`, 2 to 53 recordings each:

| Largest hubs | Recordings | References |
|---|---|---|
| `hub-moment-volley-09`, `hub-moment-volley-10` | 53 | 53 each |
| `hub-moment-volley-08` | 52 | 52 |
| `hub-moment-volley-07` | 51 | 51 |
| `hub-moment-volley-05` | 42 | 44 (two recordings anchor it twice) |

Left as plain references: 6 moments with a single recording (6 references).

Files in this folder:

| File | Content |
|---|---|
| `README.md` | This report |
| `raw/map-without-victims-folder.kml` | The map's KML export as fetched on 2026-10-07, with the "Victims" folder removed (see section 4). Kept for audit and for phase 2 parsing, subject to the rights answers |
| `raw/map.hdr` | Response headers of that one request |
| `raw/oembed-sample.txt` | Uploader and title of eight sampled videos (YouTube oEmbed) |

## 0. Summary

- vegasshootingmap.com is a one-page website that frames a single Google My Maps map ("VegasShootingMap.com"). Its data is in that map, not on the site. The map has 487 placemarks outside a folder of 58 named victims: 219 videos, 155 points for 911 calls, 29 places of interest and 84 venue features, with the clock time of each video and the clock time of the twelve volleys of gunfire inside it. That is a ready-made synchronisation table for about 220 recordings, and it is what the proposed features need.
- The map has no stated licence, no author name and no terms. The only contact is a project group address in the map description. The media it points to are 223 YouTube videos, mostly third-party uploads and re-uploads of police releases. YouTube's terms forbid downloading. Two of eight sampled videos no longer load.
- I made one request to Google's KML export (allowed by Google's robots.txt, and a feature the map offers to viewers). Google's Maps terms forbid mass download and copying of Maps content, and the map's owner has not granted anything, so I treat the map as **link and cite, derive our own numbers, ask permission before republishing its annotations**.
- Official sources are rich: the LVMPD preliminary report (18 Jan 2018) and Criminal Investigative Report (3 Aug 2018), the joint After-Action Report (24 Aug 2018), the FBI Behavioral Analysis Unit report (Jan 2019, three pages), the coroner's release, and the New York Times / Forensic Architecture burst timeline. LVMPD's server returns 403 to automated requests, so those PDFs have to be downloaded by hand.
- Death count: 58 at the scene (coroner, Dec 2017), 60 after two women died of their injuries on 15 Nov 2019 and 26 May 2020 and LVMPD raised the official count on 1 Oct 2020 (60, shooter excluded). Section 5 says how to carry both.
- Estimated corpus: about 700 entities and about 2,000 stored references. Do not store pairwise "synced with" links: 53 recordings of one volley would give 1,378 pairs. Store one offset per recording to a shared clock.

## 1. What the site is

**Who made it.** Unknown. The site has no byline. The domain was registered on 2018-04-29 through GoDaddy with a privacy proxy (Domains By Proxy), and was last updated in WHOIS on 2026-04-30 (a renewal). The map's description gives one contact, `VegasMapProjectTeam@googlegroups.com`, a group address (an institutional-style contact, which the Nepal rules also allow). I found no repository, article or interview that names the maintainers. I did not try to identify anyone.

**What the site is technically.** The home page is an HTML frameset (450 bytes) holding one frame: `https://mapsengine.google.com/map/embed?mid=1wWXomGVZXOcDWV_7XAMGtaaeNkmch5oA`. That is a Google My Maps embed. Captures in the Wayback Machine from 2019-07-20 and 2026-10-05 show the same page and the same map id. The first capture is 2018-07-02, about two months after the domain was registered. The map itself may be older than the domain.

**Method, as stated by the maintainers.** One paragraph in the map description: "This map is meant for research purposes. It is in no way meant to harm, defame, or devalue any of those tragically killed or injured by this heinous crime. If you have any corrections, concerns, or have a video you would like added, please reach out to us at VegasMapProjectTeam@googlegroups.com. Some video locations are best estimates." No further method text exists on the site. The method below is what the data itself shows (my reading of the KML, not a published method).

**What the map holds** (KML downloaded 2026-10-07; 9 folders; counts are placemarks):

| Folder | Placemarks | Geometry | Content |
|---|---:|---|---|
| Videos taken on foot | 132 | 115 points, 17 lines | Phone video from people at the venue; 130 distinct YouTube ids |
| LVMPD Body Worn Cameras | 63 | 41 points, 22 lines | Police body camera video, titled "Vegas Shooting Batch N Body Cam Video #M" (LVMPD's release batches) |
| Videos taken from inside vehicles | 12 | 6 points, 6 lines | Dash cameras and phone video from cars |
| Videos Taken by CCTV | 8 | points | Surveillance video (hotel and venue cameras) |
| Videos Taken from Air | 4 | 3 points, 1 line | Police helicopter footage |
| Audio (911 calls) | 155 | points | One point per 911 call; each links into one of five long YouTube compilations at a time offset (`&t=1h17m23s`) |
| Places of Interest | 29 | 21 points, 8 polygons | Venue, hotels, hospitals, the bus stop, fuel tanks, memorial garden |
| Las Vegas Village - Venue Features | 84 | 67 polygons, 13 points, 4 lines | Stage, gates, towers, barriers, turf and seating areas, tents, a first-aid post |
| Victims | 58 | points | **Not used.** See section 4 |

Totals outside Victims: 487 placemarks; 223 distinct YouTube ids (218 videos and 5 compilations of 911 calls); 50 line geometries (camera paths and venue lines); all coordinates have three values (longitude, latitude, altitude 0); the KML carries no `TimeStamp` or `TimeSpan` elements.

**What one recording item holds.** A placemark per video, with:

- a title that usually starts with a clock time: `10/1/2017  10:13:29 PM - 10, 11 - <video title> *`. 159 placemarks have it. The second part lists the volley numbers the video covers. The trailing `*` marks 43 items and, I infer from the map description, flags a best-estimate position (not stated).
- a point (the camera position) and, for 46 videos, a line (the path of a moving camera: walking, a car or an officer).
- a description with the YouTube thumbnail and link, then a list of timed annotations: `10:13:31 10th Volley Begins :02`. The first column is the **wall-clock time** of the event, the last column is the **offset inside the video** (mm:ss). Together they give the sync offset: video start = clock time minus offset. The main annotation is the volley (`1st … 12th Volley Begins`: 503 mentions in total, volley 10 in 53 videos). The others: "Single Gunshot" (about 190), "First Shots", "Down-the-Hall Shots" (shots in the hotel corridor), "Ricochet Sound", "Close Bullet Sound".
- no camera bearing, no field of view, no per-item confidence, no author, no licence. Direction appears only in free text ("north venue") and in a few Street View links used to place the camera.

**How items are dated and synced** (my reading, tested on the data): the maintainers lined up recordings on the twelve numbered volleys. A volley is a burst of gunfire heard in many videos, so its clock time is the common anchor and each video's offset to it gives the video's own clock. For LVMPD body camera video the clock comes from the camera's own time stamps (the title time plus the offset reproduces the annotated volley time in the examples I read). I tested whether the clock time in a title equals the video start implied by its first annotation: of 140 items that have both (phase 2 count, after the annotation parser was finished), 121 agree within 2 seconds and 19 differ, by 4 seconds up to 368 seconds. So the title time is sometimes the video start, sometimes the first event; the seed keeps both and flags the 19 (section 10).

Clock span of titled items: 21:41:56 to 23:59:11 local time (Pacific, 1 October 2017). The shooting is 22:05 to 22:15.

**Update history.** Not recorded in the KML. Evidence only: the page and map id are unchanged between 2019-07 and 2026-10-05; the domain was renewed in April 2026; the Victims folder holds 58 entries, so it was not updated for the two later deaths (this does not show the map is frozen). The map's own "last updated" date is shown only in the Google viewer, which I did not open. Ask the maintainers.

## 2. Access and rights

### What I requested (all serial, 3 seconds or more apart, user agent `uwazi-prototype-research/1.0 (research for HURIDOCS Uwazi prototype; contact juanmnlcornejo@gmail.com)`)

| Request | Result |
|---|---|
| `vegasshootingmap.com/robots.txt` | 404 (no robots file; nothing disallowed) |
| `vegasshootingmap.com/` | 200, the frameset page |
| `google.com/robots.txt`, `mapsengine.google.com/robots.txt` | `google.com` robots.txt has `Allow: /maps/d/`; the second redirects to an about page (no rules) |
| Wayback Machine availability API, CDX index, two captures | One 429 (I stopped and waited), then 200s |
| One KML export: `google.com/maps/d/kml?mid=…&forcekml=1` | 200, 453 KB. The response carries `x-robots-tag: noindex,nofollow`, which asks search engines not to index it and says nothing about reuse |
| YouTube oEmbed, 8 ids | 6 answered, 2 returned nothing (removed, private or blocked) |
| `lvmpd.com/robots.txt` and two report PDFs (HEAD) | **403 Access Denied** from the LVMPD CDN. I stopped there and did not retry or work around it |
| WHOIS for the domain | Registrar data only |

I read Google's Maps terms and YouTube's terms **after** the KML request, not before. The request is one download of a document the map offers to viewers, which Google's robots.txt allows. I would not repeat it in bulk, and I have not republished the KML.

### Terms of use of the site

None. There is no terms page, no licence statement, no copyright line, no robots.txt. The map description says it is "meant for research purposes" and invites corrections and video submissions by e-mail.

### API, export, open repository

- The map offers a KML export (the one I used). No API, no CSV, no repository of the map's data.
- I searched for a GitHub, Kaggle or archive.org copy of the map or of its annotations and found none. Searches returned unrelated map write-ups.
- Related open resources (section 3): CMU's VERA system and code; UNLV's web archive of the event (access terms not checked); a large YouTube channel named "Las Vegas Shooting Archive" with nearly 600 videos according to one search result.

### Licence of the data

- The map: no licence. Google's Maps additional terms prohibit users from mass-downloading or copying Maps content except as Google's permissions allow, and say nothing that frees a map owner's content for others. Facts (a clock time, a coordinate) are not copyrightable in the US, but the selection and arrangement of this map may be protected, and the descriptions are the maintainers' writing. I am not a lawyer and this is not legal advice.
- My working position: **cite and link the map; derive our own records from the underlying public evidence; do not republish its descriptions or its full table until the maintainers answer.** Contact: the group address above.

### Licence of the linked media

| Media | Rights position |
|---|---|
| YouTube videos (223 ids) | Uploaders keep ownership; YouTube's terms give other users a licence only through its features (playback, the embeddable player). Downloading is not permitted without the rights holder's written permission. Automated access to the service is not permitted outside its API and search engines. So: **link or embed only**, and read metadata through the YouTube Data API, not by scraping |
| Who uploaded them | Of the 8 sampled: 2 individual accounts, 3 re-uploads by one account of LVMPD releases (body camera, 911 audio), 1 "Las Vegas Shooting Archive" re-upload of an LVMPD helicopter video, 2 unavailable. Most items are not first-party. The original police material was released under court order after a media lawsuit (about 500 911 recordings and nearly 30 video files, 13 June 2018, from search results, not read in primary form) |
| LVMPD, Clark County Fire and 911 recordings | Public records released by government agencies. Whether they carry a copyright or a redistribution limit was **not verified**. Ask the agency before bundling any file |
| Phone video by private people | Copyright of the person who filmed it. Many were distributed by news agencies (Storyful, AP) before being re-uploaded. Link only |
| Thumbnails (`img.youtube.com`) | Served by Google as part of the embed. The prototype's `YouTubeStill` already hot-links them. For this corpus they show crowds and injured people, so section 4 turns them off |

Contact for permission: `VegasMapProjectTeam@googlegroups.com` for the map; the LVMPD public records office (via a request through its website, which I could not open from here) for the police releases. I have not contacted anyone.

## 3. Other public sources for the same event

Each was identified by search on 2026-10-07. "Read" means I read the page text; "snippet" means I only saw a search summary. The LVMPD and FBI PDFs were **not read in primary form**: the CDN blocked automated access and the Criminal Investigative Report is over 10 MB. Page numbers and exact quotes must be taken from the PDFs by hand in phase 2.

| Source | What it adds | Notes |
|---|---|---|
| **LVMPD Preliminary Investigative Report** (FIT report, 81 pages, 18 Jan 2018) | First official timeline; sheriff's briefing | PDF at `lvmpd.com/en-us/Documents/1_October_FIT_Report_01-18-2018_Footnoted.pdf` (403 to bots); a mirror exists at workingwithcrowds.com. snippet |
| **LVMPD Criminal Investigative Report** (large PDF, over 10 MB, released 3 Aug 2018) | Official timeline with clock times (first shots about 22:05, officers at the 31st floor 22:12, last shots about 22:15, officers on the 32nd floor 22:17, breach of the suite 23:20), shot counts (1,058 rounds fired in total, per Wikipedia's summary), scene, evidence | PDF at `lvmpd.com/home/showpublisheddocument/134/638298568313170000` (403 to bots). A mirror was found at `dig.abclocal.go.com` (too large to fetch here). snippet |
| **1 October After-Action Report** (Clark County Fire Department, LVMPD and FEMA's National Exercise Division, 61 pages, 24 Aug 2018) | Response timing, communications, radio problems; no victim names | Hosted at `policinginstitute.org`. snippet |
| **FBI Behavioral Analysis Unit report** (3 pages, Jan 2019) | Finds no single motive, no manifesto, a lone actor | Brief by design. The PDF link was not found in search; locate it on fbi.gov or through the FBI vault by hand. snippet |
| **Clark County Coroner** (names released 6 Oct 2017; all 58 deaths by gunshot, Dec 2017) | The count, causes of death | Contains names. Use counts only (section 4). snippet |
| **Clark County Fire Department radio traffic** (released 2018) | Fire/EMS radio audio, timestamps | Public record release; terms not checked. snippet |
| **New York Times, "Mapping the Las Vegas massacre" / "Las Vegas shooting timeline" (Malachy Browne et al., Oct and Nov 2017)** | Audio method: 30 eyewitness and police videos synchronised using landmarks, the moon, scanner audio; 12 bursts each with its own "fingerprint" of rate, gaps, duration and interval; more than 900 rounds counted into the crowd; shows that the guard was shot at 22:06, which contradicted the official timeline of the time | The page could not be fetched here (blocked for this tool). Described in CBS, Poynter, World Press Photo and Goldsmiths pages. Technique credited to Forensic Architecture (Goldsmiths). snippet |
| **Forensic Architecture** (Goldsmiths) | The video-forensics method behind the NYT work | Goldsmiths news page, read. |
| **VERA (Video Event Reconstruction and Analysis)**, Junwei Liang, Jay D. Aronson, Alexander Hauptmann (CMU), arXiv 1905.13313, 2019 | Open-source video synchronisation, geolocation and gunshot-based localisation, demonstrated on this event; code at `github.com/JunweiLiang/VERA_Shooter_Localization`, live system at `vera.cs.cmu.edu` | Abstract read; code licence not stated on the abstract page. Closest existing tool to what this seed is for. |
| **Robert C. Maher** (Montana State), firearms audio forensics, NIJ-funded papers | Methods and limits of gunshot acoustics (muzzle blast, supersonic crack, echoes), for cadence analysis | General method, not this event. snippet |
| **Wikipedia, "2017 Las Vegas shooting"** | Summary, counts, links to the reports; CC BY-SA, so quoting with attribution is allowed | Read (first 100,000 characters). |
| **Las Vegas Review-Journal, Nevada Independent, Inquirer, CBS** | How the official timeline was revised twice in October 2017 (the "six-minute gap" removed on 13 Oct 2017); the sheriff's 2020 decision to raise the death count to 60 | snippet |
| **Court records** | The MGM Resorts settlement for victims, up to US$800 million (announced 3 Oct 2019; court approval reported 30 Sep 2020, Clark County District Court). No timing data. Individual filings were not searched | snippet |
| **UNLV Libraries web archive** | 220 archived websites and Twitter data about the event, Oct 2017 to Oct 2018 | The Twitter dataset is restricted to UNLV staff and students. Not needed for this seed. snippet |
| **"Las Vegas Shooting Archive" (YouTube channel)** | Re-uploads of police releases with time stamps and scanner audio | A fan archive, not an official one. Treat as a copy. snippet |

What each adds for the features: the LVMPD and After-Action reports give the **official timeline** and a check on the map's clock; the coroner and sheriff releases give the **counts**; the NYT, Forensic Architecture and VERA give the **audio method** and an independent burst list to compare with the map's volley times; Maher gives the acoustic vocabulary; the map gives positions and offsets per recording.

## 4. Privacy and harm rules to enforce in a build

Stricter than Nepal's where the event warrants it. Phase 2's build script should fail on each of these, as the Nepal build does.

**People**

1. **No victim is named, described or located.** The map's "Victims" folder (58 placemarks) holds full names, birth dates, spouses, residences, causes of death, burial places and, in 13 entries, a cemetery phone number. **The folder is not ingested and the copy kept in `raw/` has it removed** (65,553 bytes). Counts only, from the coroner and LVMPD. The build stops on any record of a victim's name, even if the coroner released it.
2. **No minors, no injured person described.** No casualty template. No ages, no injury accounts.
3. **No named bystanders, witnesses, 911 callers or uploaders.** Uploader account names of private people are not stored (store the video link only). Store an uploader name only where it is an institution or an archive (LVMPD, a news organisation, "Las Vegas Shooting Archive"). The caller's words and any name in 911 audio are never transcribed.
4. **Officers, security staff and hotel staff by role**: "the security guard", "the first two officers on the 31st floor". Names that appear in an official document are not copied. Public officials acting in office (the sheriff) may appear by office.
5. **No personal contacts.** No phone number, no e-mail address, except an institution's. The map's group address `VegasMapProjectTeam@googlegroups.com` is allowed in exactly one record, the map's own Source (`contact`), as Juan decided; the validator whitelists that address and nothing else.
6. **No face of a bystander in a bundled still.** **Nothing is bundled.** Not a still, a clip or an audio file, in line with section 2. The prototype's YouTube-still code draws thumbnails from any item without a content warning, so every recording record carries a warning (below).

**Media**

7. **Graphic media is covered by default or link only.** Every recording gets a `content_warning`: `graphic` for body camera, 911 audio, CCTV of the parking lot and any footage with people hit or on the ground; `distressing` for the rest, since all of it carries gunfire and screaming. Under the existing rule (`[data-covered]`, "never show a picture on a Library card") that gives no thumbnails and a click to reveal. Audio items are warned too.
8. **Gunfire audio plays only on request**, behind the same cover, with no autoplay.
9. **No ranking by lethality.** Do not sort or facet by "most casualties" or similar.

**The shooter**

10. **Never named.** Refer to him as "the gunman" or "the shooter". A source's own title that contains his name is replaced with "[title withheld: names the gunman]" in the record, with the link kept. The build stops if the name appears in any title, quote or search text (list the strings in the script).
11. **No motive claims as facts.** The FBI report found no single motive; record that as the finding. Other motive talk is a claim with status `disputed` or `unsupported`, or left out.
12. **No how-to.** Record round counts, volley times, intervals and positions, which the NYT and the official reports publish. Do not record weapon modification details, magazines or equipment instructions beyond a one-line official finding.
13. **No manifesto, no biography, no private life.** Not in the data, not as quotes.

**The death count (58 or 60)**

14. Store the number as a dated claim with an "as of" basis, as Nepal does with figures (`as_of`, `as_of_basis`):
    - 58 killed at the venue or in the days after, coroner and LVMPD, from Dec 2017 to 2019 (the figure on the map and in the 2018 reports);
    - 60 after two further deaths of women injured that night, on 15 Nov 2019 and 26 May 2020, which LVMPD added to its count after press criticism (the Review-Journal reports the sheriff raising it to 60 on 1 Oct 2020; Wikipedia dates the two additions 24 Aug and 1 Oct 2020; shooter excluded);
    - 61 on Wikipedia's infobox, "including the perpetrator", plus a 2023 probate case that referred to a further death of a survivor (a claim, not an official count).
15. These are **not contradictions** of one number but changes over time and differences in what is counted. Model them as claims with `as_of`, linked by a `supersedes`-style reference, not as `disputed`. The UI should print the date next to any count. The injured count has the same shape: "more than 850" (After-Action report) against 867 and 413 with gunshot or shrapnel wounds (Wikipedia's figures). Use the sources' words and dates.
16. Other real contradictions to model as `disputed` claims, each with its sources: when the security guard was shot relative to the first volley (the NYT analysis puts it about one minute into the attack, which differed from the official timeline of the time; the official timeline was revised more than once in October 2017, and the "six-minute gap" was dropped on 13 Oct 2017; details are from press summaries and need the reports); rounds fired (1,058 in the Criminal Investigative Report, "over 1,100" said by the sheriff in January 2018, more than 900 counted into the crowd by the NYT).

## 5. Proposed data model (Uwazi terms, Nepal conventions: ids `vegas_<template>`, properties `${templateId}:${name}`, references with verification and dates)

### Templates

| Template | Holds | Properties |
|---|---|---|
| **Recording** (default) | One video or audio item (about 223 + 155 call segments) | title (text), media_kind (select: phone video, dash camera, body camera, CCTV, aerial, 911 call, radio), embed (media link, the YouTube URL), platform (select), provenance (select: official release, news agency, archive re-upload, private upload), release_batch (text: LVMPD batch number), clock_start (timestamp, precision to the second), clock_start_basis (select: camera time stamp, derived from volley, title, unknown), **sync_offset_seconds (numeric)**, sync_confidence (select: anchored on 3 or more events, 1 to 2, title only, none), clock_end (timestamp), duration_seconds (numeric), has_audio (select: yes, no, muted), camera_position (geolocation), position_basis (select: map estimate, Street View match, official, unknown), camera_motion (select: static, walking, vehicle, helicopter), camera_path (text holding a GeoJSON line, since there is no line type), **camera_bearing_degrees (numeric, empty unless derived)**, bearing_basis (select), volleys_covered (multiselect 1 to 12), audible_shot_count (numeric, our own count if audio is available), availability (select: available, removed, private, checked-on date), content_warning (select), verification (select) |
| **Moment** | A moment of the event: each of the 12 volleys, first shots, "down-the-hall" shots, single shots, officer arrivals, breach | label (text), moment_type (select: volley, single shot, first shots, corridor shots, ricochet, response, breach), clock_start / clock_end (timestamp, second precision), duration_seconds (numeric), shot_count (numeric, estimate with qualifier), interval_from_previous_seconds (numeric), cadence_rounds_per_second (numeric), time_basis (select: official report, NYT analysis, map annotation, our analysis), verification (select) |
| **Place** | Venue features and places of interest (stage, gates, towers, hotel, hospitals, bus stop, fuel tanks) | place_type (select), geolocation (point), footprint (text holding GeoJSON polygon), floor or height (text, for the hotel window and the 32nd floor), coordinate_basis (select) |
| **Source** | An official document, report, article, paper, video-hosting page | publisher, publisher_type (select: police, fire, coroner, federal agency, news, academic, encyclopedia, archive), published (date), accessed (date), url (link), licence (text), pages (numeric), language |
| **Claim** | A statement whose truth is checked: counts, times, causes of delay | statement (markdown), claim_type (select: count, time, sequence, cause), as_of (date), as_of_basis (select), figure, unit, qualifier, verification_status (select), verification_note |
| **Official finding** | A dated entry in an official report (timeline entry, count, conclusion) | text (markdown, short quote), finding_type (select: timeline entry, count, conclusion), clock_time (timestamp), page (numeric), issued_by (relationship) |
| **Organisation** | LVMPD, Clark County Fire Department and Coroner, FBI, FEMA, MGM Resorts, NYT, Forensic Architecture, CMU Center for Human Rights Science | org_type (select), website (link) |

No Person and no Casualty template. Roles ("security guard", "first officers") are a `role` select on Moment or Finding where needed.

### Relationship types

| Type | From to | Meaning |
|---|---|---|
| `captures` | Recording to Moment | The recording contains the moment. **Anchored by a time range in the recording**, the media equivalent of a text anchor |
| `recorded_at` | Recording to Place | Camera position at a place |
| `depicts` | Recording to Place | A venue feature is visible |
| `derived_from` | Recording to Recording | A re-upload or excerpt of another recording (provenance of the police releases) |
| `synced_with` | Recording to Recording | Optional, only for pairs checked by hand, with the measured offset difference. **Do not create it for every pair** |
| `occurred_at` | Moment to Place | Where a moment took place (the hotel suite's windows for the volleys; the corridor; the stage) |
| `part_of` | Moment to Moment | A single shot within a volley |
| `followed_by` | Moment to Moment | Order of the volleys, with the interval |
| `documents` | Source or Official finding to Moment or Claim | The source records it, anchored by a page |
| `issued_by` | Official finding to Organisation | |
| `supports` / `disputes` / `contradicts` | Source to Claim; Claim to Claim | Evidence and conflicts |
| `supersedes` | Claim to Claim | A later count or time replaces an earlier one |
| `geolocated_by`, `synced_by` | Recording to Source | The analysis that placed or aligned it (NYT, VERA, the map) |
| `published_in` | Recording to Source | Where the video was first published |

**Gaps in the prototype's reference model**, as with Nepal's (a) to (c): (a) a **media-time anchor** on a reference (start, end in seconds inside a recording), parallel to `sourceSelection`; (b) an **offset** value per reference, to hold the sync correction; (c) a timeline property type with second precision and a "clock source" qualifier. Each can be a prototype extension, not an Uwazi field.

### Features it would allow

| Feature | What it needs from the data | Status of the data |
|---|---|---|
| **Multi-recording sync timeline**: one lane per recording against a shared clock, volley markers across lanes | clock_start, sync_offset_seconds, duration, `captures` with time anchors | Present for about 160 recordings; duration needs the YouTube API |
| **Audio waveform with shot markers** | An audio file we may hold, plus marker times | **Blocked by rights**: the map has marker times (about 190 single shots, 509 volley mentions) but no audio. Waveforms need LVMPD originals or a licence. Without audio, draw an event strip from annotations only |
| **Map with camera cones over time** | Position and bearing | Positions exist (487 points, 46 paths); **bearings do not**. Compute the bearing from each camera to the hotel window as a geometric value (labelled "bearing to source", not "camera facing") and keep the field for measured bearings |
| **Cross-recording event matching** | Shared volley numbers and times | Strong: volley n is annotated in 22 to 53 recordings (22, 31, 36, 40, 43, 48, 50, 51, 52, 53, 38, 39 for volleys 1 to 12). The spread of clock times for one volley across recordings is a drift measure |
| **Cadence analysis** | Volley start and end, intervals, shot counts | Volley starts exist; ends and per-shot times do not. Compare with the NYT's 12-burst list and the official report. Per-shot cadence needs audio |
| **Official timeline against recordings** | Official findings with clock times | From the LVMPD report (manual download) |

Where a feature cannot run on the data we may keep, say so in the UI instead of showing an empty chart.

## 6. Size estimate

| Item | Count | Basis |
|---|---:|---|
| Recording (videos) | 218 | distinct YouTube ids, excluding five 911 compilations |
| Recording (911 call segments) | 155 | one point per call, linked into the five compilations at an offset. Optional; decide in section 8 |
| Moment | about 70 | 12 volleys, first shots, corridor shots, ricochets, about 40 official timeline entries |
| Place | 113 | 29 places of interest + 84 venue features |
| Source | about 30 | 8 official reports and releases, press, 3 academic, Wikipedia |
| Claim | about 25 | counts, times, rounds, sequence |
| Official finding | about 40 | timeline entries and counts |
| Organisation | about 15 | |
| **Entities** | **about 700** | about 330 without the 911 segments |
| References | about 2,000 | 503 volley + 193 single-shot `captures`, 400 `recorded_at` and `depicts`, `documents`, `supports`, official links |

A synced-with link for every overlapping pair would be 10,785 pair entries (the sum over volleys of n(n-1)/2), more than the corpus. Store one offset per recording and derive pairs when drawing. Data volume: JSON of the entities and references, about 1 to 2 MB. No media is bundled. The corpus fits the existing Network view without a cap.

## 7. Step plan for phase 2

0. **Juan answers section 8.** Nothing else starts before the answers on the map's rights and on link-only.
1. **Permission message** to the map's group address (draft ready on request), and a decision on whether to contact LVMPD's public records office about the video and audio releases.
2. **Video metadata through the YouTube Data API**, not scraping: 223 ids in 5 batched calls (50 per call) for title, channel type, duration, publish date and availability. Needs an API key from Juan. Record `availability` and the check date; 2 of 8 sampled ids already fail.
3. **Official documents downloaded by hand** (LVMPD blocks automated requests): Criminal Investigative Report, Preliminary Report, After-Action Report, FBI report, coroner counts. Read them for the timeline, counts and any stated clock offsets. Quote with page numbers. Decide whether to bundle them (Nepal bundled government PDFs with issuer and source).
4. **Parse the KML** (the file is in `raw/`) with a script: recordings, call segments, volleys and other moments, places, offsets. Keep the title time and the time implied by the first annotation as two values; mark the 19 of 88 items where they disagree for review.
5. **Sync check**: for each volley, the spread of clock times across recordings; flag recordings more than 2 seconds off the volley median; compare the 12 volley times with the NYT list and the official timeline. This is itself a data-analysis feature.
6. **Schema and thesauri** from section 5 into the prototype's `TemplateDef` shape; extend the shared types for media-time anchors.
7. **Build script with the section 4 checks** as hard stops: victim-name list (from the coroner's release, kept outside the repo), the gunman's name, phone and e-mail patterns, every recording carries a content warning, no media files in the output, no private-account names, no thumbnail without review.
8. **Showcase subset**: about 60 recordings across all kinds, all 12 volleys, the claims and official findings, for the demo.
9. **Features in order**: multi-recording timeline, volley matching table, map with "bearing to source" cones, cadence from annotations, then the waveform only if audio rights are cleared.

Effort, my estimate, not measured: steps 1 to 3 are waiting time on people and a manual download; 4 to 7 are a day or two for one lane; the features are a separate batch for the Design and Code lanes.

## 8. Open questions for Juan

1. **Rights of the map.** May we use the map's annotations (clock times, volley offsets, camera positions) in the prototype? Options: (a) ask the maintainers first and wait; (b) proceed with link and cite, deriving our own numbers from the underlying videos; (c) a private demo only, nothing published. I recommend (a) now and (c) until they answer. Who writes to them, and from which address?
2. **Who is the audience?** An internal prototype and a public demo have different rights needs for the map, the police releases and the YouTube embeds.
3. **YouTube API key.** May I use one (free quota) for metadata only? Without it, metadata is limited to the 8-id sample.
4. **Audio.** The waveform feature needs audio we may hold. Do we pursue the LVMPD originals (public records request, redistribution terms unknown), or ship the annotation-only version and mark waveforms as unavailable?
5. **911 calls.** Include the 155 call segments (location points and titles only, no transcript), or leave them out? They are the most sensitive audio.
6. **Death-count handling.** Agree to carry 58 and 60 as dated claims, not as a contradiction, and to quote the source's date beside each count?
7. **Naming policy.** Agree that the gunman is never named in the corpus, even in source titles?
8. **Media cover.** Agree that every recording is covered with a content warning and no thumbnail is drawn, which means no preview images for this collection?
9. **LVMPD blocks automated access.** Will you download the reports yourself, or ask LVMPD about access?

## 9. What I verified and what I assumed

**Verified in this session:** the site is a frameset around the Google My Maps map; the folder structure and counts; the annotation format; the 62 of 88 and 69 of 88 clock agreement; the 58 victim placemarks and the personal data in them (not copied); the e-mail and phone patterns; the YouTube uploader sample; robots.txt results; the 403 from LVMPD; the Wikipedia infobox and lead; the Google and YouTube terms text; the VERA abstract; the Goldsmiths page.

**From search summaries only, not read at source:** the LVMPD, After-Action and FBI report contents and dates; the New York Times method and counts; the coroner's release; the death-count change in 2019, 2020; the MGM settlement; the media lawsuit and release dates; the UNLV archive; the "nearly 600 videos" channel size.

**Assumed:** that the `*` in titles marks a best-estimate position; that a title's clock time is the video start where it agrees with the annotations; that the map has not been edited since 2020; that LVMPD's releases are free of a redistribution limit (unknown); that 2 of 8 sampled ids unavailable is a sign of link rot (a sample of 8 only).

## 10. Phase 2: the seed

Built 2026-10-07 from `raw/map-without-victims-folder.kml` and the secondary sources of section 3. Everything below is generated:
rerun `python3 data/kml_extract.py && python3 data/build_seed.py && python3 data/sync_report.py && python3 data/showcase.py && python3 data/validate.py`.

### 10.1 What Juan's answers changed

| Decision | Applied how |
|---|---|
| Use the map's annotations (clock times, volley offsets, positions, paths), cite vegasshootingmap.com with its group address | One Source record for the map (`source:vegasshootingmap-2026-10-07-google-my-map`); every recording points to it with `synced_by` and `geolocated_by`; its licence field says "none stated" and that the maintainers have not been asked |
| 911 calls as records: position, title, link at its offset, no transcript, covered | 155 call records plus 5 compilation records. **Two departures, both for the privacy rules**: the map's title text of a call is not carried (it is replaced by a neutral `call_category`, 10.10), and the call position is generalised to three decimals (about 100 m) |
| Section 4 rules are build stops | Enforced by `data/validate.py` now; list for the build script in 10.5 |
| 58 and 60 as dated claims | `claim:killed-58-as-of-2017-12` (as of 2017-12-21), `claim:killed-60-as-of-2020-10` (as of 2020-10-01), linked by `supersedes`; `claim:killed-61-including-gunman` is a separate count basis (Wikipedia) |
| No YouTube API key; availability from what we have | 8 ids checked through oEmbed (6 available, 2 did not load); the other 371 recordings are `not-checked`. `duration_seconds` is empty everywhere |
| LVMPD PDFs by hand | Exact addresses and what to take from each: `raw/official/DOWNLOAD.md`. Their findings are carried from secondary sources and marked `summary-only` or `not-read` (a `read_status` on each Source and "from summary, not read at source" in each evidence note) |

### 10.2 Files (under `data/`, Nepal's shapes)

| File | Content |
|---|---|
| `entities.json`, `references.json` | The corpus. Entity: `id`, `template`, `title`, `properties`, `evidence[]`. Reference: `from`, `to`, `type`, `date`, `anchor`, `sources`, `verification`, `note`; `captures` and `derived_from` carry a media anchor `{recording, offset_seconds, end_seconds, clock, label, qualifier}`; `followed_by` carries `interval_seconds` |
| `schema/templates.json`, `relationTypes.json`, `thesauri.json` | 7 templates (Recording, Moment, Place, Source, Claim, Official finding, Organisation), 18 relationship types, 22 thesauri. Template ids are bare, as in the Nepal seed; the app's build adds the `vegas_` prefix, as Nepal's adds `nepal_`. `depicts` and `synced_with` are defined and have no references yet |
| `sync-check.md`, `sync-check.json` | The per-volley sync check (10.3) |
| `showcase/` | The demo subset (10.6): `entities.json`, `references.json`, `ids.json`, `stats.json` |
| `stats.json` | Counts |
| `kml_extract.py`, `timeparse.py`, `labels.py`, `call_categories.py`, `build_seed.py`, `static_data.py`, `schema_def.py`, `sync_report.py`, `showcase.py`, `validate.py`, `privacy-denylist.txt` | The scripts. `extract.json` and `working.pkl` are intermediates, deleted after each run of this report |

Ids: `<template>:<slug>`. Recordings are `recording:yt-<YouTube id>` (or `fb-`, `tw-` with the post id, or `ph-<index>` where the map has no usable link), calls `recording:call-<number>`, volleys `moment:volley-01` to `-12`, other moments `moment:<time>-<type>`. Dates are ISO 8601 with the `-07:00` offset (Las Vegas on 1 October 2017 is on daylight time) and second precision where the map gives one; `precision` says second, minute or day.

### 10.3 Counts

| | Seed | Showcase |
|---|---:|---:|
| Entities | 582 | 154 |
| References | 1,655 | 622 |
| Recordings | 379 | 62 |
| Moments | 35 | 31 |
| Places | 113 | 6 |
| Sources | 22 | 22 |
| Claims | 13 | 13 |
| Official findings | 9 | 9 |
| Organisations | 11 | 11 |

Recordings by kind: 132 phone video, 63 body camera, 12 vehicle video, 8 surveillance camera, 4 aerial, 155 call segments, 5 call compilations. 219 are video with a clock: 175 to the second, 11 to the minute, 9 to the day, 24 none. 139 carry volley numbers. 219 have a position (46 a camera path as well).

Moments: 12 volleys; 10 single gunshots (193 annotations cluster into 10 moments: 8 annotated by 18 to 30 recordings each with a spread of 2 to 3 s, and 2 by a single recording); 1 first-shots moment (22:05:27, 12 recordings, spread 0); 1 corridor-shots cluster (22:10:37, 7 recordings); 4 ricochet sounds; 2 bullet-pass sounds; 5 official-timeline moments (from summaries).

References by type: 733 `captures`, 374 `geolocated_by`, 195 `synced_by`, 140 `derived_from` (call segment in a compilation, with its offset), 43 `recorded_at` (camera point inside a venue footprint, derived by a point-in-polygon test), 30 `occurred_at`, 19 `supports`, 79 `published_in` (15 + 64: a call's audio file in its Internet Archive item, see 10.10), 12 `fired_from`, 11 `followed_by`, 9 `issued_by`, 5 `documents`, 3 `contradicts`, 1 `disputes`, 1 `supersedes`.

Verification: a `captures` reference is `confirmed` when the annotation lies within 2 s of the median of 3 or more recordings of that moment, `disputed` when it is more than 2 s off, `single-source` otherwise. Everything else from the map is `single-source` (one source, the map). A moment is `confirmed` when two or more recordings annotate it; recordings that are copies of one video are not detected, and the evidence note says so.

Sync confidence of the 219 video recordings: 72 anchored and consistent (three or more anchors within 2 s), 7 anchored with drift, 55 with one or two anchors, 52 title time only, 33 no clock.

### 10.4 Sync check (full tables in `data/sync-check.md`)

- **The twelve volleys separate cleanly.** 482 volley annotations (29 more are marked partial on the map and left out). 448 (93%) are within 1 s of their volley's median across all recordings, 478 (99%) within 2 s, 4 are further. Median absolute offset 0.0 s; 95th percentile 2.0 s. Per volley the spread (max minus min) is 1 to 4 s for ten of the twelve volleys.
- **Outliers over 2 s:** volley 1, one body camera recording (6 s early); volley 5, three annotations in one vehicle video (3, 7 and 9 s late), which gives volley 5 its 10 s spread. Nothing else.
- **By kind:** body camera 192 annotations, 1 over 2 s; phone video 267, none; vehicle video 23, 3 over 2 s. Median offset 0.0 s for each, so no kind runs systematically early or late.
- **Camera clock errors the map notes** (body cameras 10, 20 and 23 s ahead): the annotated times already agree with the other recordings (median offsets -0.5, -1.0 and 0.0 s), so the maintainers corrected them. The seed keeps the note in `clock_note` and `known_clock_error_seconds` and does not correct again.
- **Title time against the first annotation:** 19 of 140 differ by more than 2 s, by 4 to 86 s except one of +368 s (`recording:yt-WZdxuzKfgpo`, title 22:03:45 against 22:09:53 implied by its volley 9 annotation; the title is probably wrong). All but one are earlier implied times than the title (the title often gives the first event, not the video start). Flagged `title-mismatch`.
- **Drift inside one recording** (anchors disagree by more than 2 s): 7 recordings, 3 of them body camera with 8 to 18 anchors and spreads of 60 to 336 s, which means the video has cuts or the annotation mixes timelines. Flagged `drift`; their clock is the median and `sync_confidence` is `anchored-drift`.
- **Against the NYT analysis (read in the reporter's thread and summaries; no burst times were available):** twelve bursts, match. Three intervals over one minute: the map has exactly three (volleys 4 to 5, 117 s; 5 to 6, 72 s; 10 to 11, 80 s), match. The NYT's burst of about 40 s below the gunman may be the map's 7-recording "down-the-hall" cluster at 22:10:37; the map gives no duration, so this stays a possible match.
- **Against the official times (from summaries):** first shots about 22:05 (minute): the map's first-shots annotation is 22:05:27, inside that minute; the first automatic burst (volley 1) is at 22:06:06. Last shots about 22:15: volley 12 starts at 22:15:16; its end is not on the map. The official times are to the minute, so this proves little until the reports are read.
- Intervals between volley starts, in seconds: 47, 28, 29, 117, 72, 35, 34, 26, 56, 80, 26.

### 10.5 What the app's build script must enforce

All of these are in `data/validate.py` and pass on the seed. The build must stop on any of them.

1. **Victims**: the Victims folder is never read. The input KML must not contain `<name>Victims</name>`, `Burial:` or `Residence:`. No victim name in any string. Keep the name list outside the repository.
2. **The gunman is never named**, in any title, label, quote, source title, claim, search text or URL. Strings to reject: his surname and first name (the seed's `privacy-denylist.txt` has them). A source whose own URL contains the name is replaced by another address (the seed uses VOA's article, not CBS's).
3. **No private person by name**: no videographer, eyewitness, caller or officer named in any string. Reject the denylist (the private names and handles found in the map's titles and links, plus the headline performer, the hotel guard and the sheriff), and apply the same list to titles built from future map edits.
4. **No social-media profile or handle**: `facebook.com/<name>/…` and `twitter.com/<handle>/…` are rewritten to `facebook.com/watch/?v=<id>` and `twitter.com/i/status/<id>`; the build rejects any other form. Opaque short links (`goo.gl`) are dropped.
5. **No phone number, no e-mail address**, except `VegasMapProjectTeam@googlegroups.com`, only in the map's Source record.
6. **Every recording has `content_warning`**, `graphic` (body camera, surveillance, 911) or `distressing` (the rest), so the existing cover rule applies and no card draws a thumbnail. No `file`, `thumbnail`, `image` or `poster` property; no `img.youtube.com`, `ytimg.com`, Google image-hosting or `mymaps` link; no media file in the output.
7. **No description of a person hit, helped or killed in a label**: reject labels matching victim, body (not "body camera"), dead, dying, blood, wound, "shot in", killed, and the like.
8. **911 calls carry no label** (the map's call titles say what callers reported, including injuries to named relatives and hotel room numbers) and **a position rounded to three decimals**; they carry a `call_category` from a closed list of 8 values, no other property that could hold title text, the neutral title `911 call #<number>`, and an `audio_url` only of the form `https://archive.org/details/<item>/171001003519_(<number>).wma` for the two known items, with the item id and the rights note in its evidence.
9. **Embeds are links only**: `youtube.com/watch?v=<11 characters>` (with `&t=` for a call), `facebook.com/watch/?v=`, `twitter.com/i/status/`, `archive.org/details/`, or a news site. Nothing is downloaded or bundled.
10. **Each template property that is a select exists in its thesaurus; every reference joins templates its type allows; every id resolves.**
11. **Counts carry their date**: a count claim without `as_of` is a warning (one: `claim:rounds-over-1100-sheriff`, whose date is unknown).

### 10.6 Showcase subset

62 recordings (22 phone video, 16 body camera, 5 vehicle, 4 surveillance, 3 aerial, 8 call segments, 4 compilations), all twelve volleys covered, 15 recordings with a flag so the demo can show the checks: two title mismatches, two with drift, the volley outlier, two with a camera clock note, the date inconsistency, a Facebook and a Twitter link, the two videos that did not load, two undated and two with a clock window. Plus all moments the chosen recordings annotate, all sources, claims, findings and organisations, and the places they sit in (6). 154 entities, 622 references.

### 10.7 What the map's titles and links contained besides the Victims folder

Found while building labels; the first draft had missed it.

- **Private people named**: more than a dozen titles name the person who filmed or the person interviewed ("<name>'s Video", "from <name>'s FB Page", "<name> eyewitness interview with <journalist>", a pseudonym). Replaced by neutral labels (`data/labels.py`, 55 manual overrides plus a generic clean-up). 4 placemarks link to a Facebook or Twitter post whose address holds the person's handle; the handle is dropped from the link. One opaque short link is dropped.
- **Descriptions of people hit or helped** in about eight titles ("Lady Shot in Leg", "Victims Cram into Cab", "Victim in Wheelbarrow", "Bodies carried out", "Including Victims in Parking Lot", "Helping Victims"). Replaced by neutral labels.
- **The gunman named** in 2 titles; replaced.
- **Unsupported claims in titles** ("2nd gunman", "Two Shooters Right There in that Room"). Not carried.
- **911 call titles** (155) describe what callers said: an injured daughter, a woman's friends in a named hotel room with its room number, a man who saw a woman shoot, a mother whose daughter was hit. Dropped; the records carry the call number, a neutral `call_category` (10.10) and the offset only.
- **Positions**: a call position can be a private room. Generalised to about 100 m. Camera positions of people at the venue are kept at six decimals as the map gives them (they locate a camera, not a named person).
- **The raw KML working copy keeps those titles and links** (it is the source of the labels). It sits under `dev/`, outside git. Do not copy it into the app repository.

### 10.8 Findings that change plans

- **911 audio exists as files on the Internet Archive** (linked in 10.10: 79 calls). Fifteen call records link to `.wma` files in two Internet Archive items: "Vegas Shooting Evidence (Batch 7) 911 Calls (130)" and "(Batch 5) 911 Calls (518)", credited to LVMPD, uploaded by a private account in June 2018, no licence stated on the item (read through the Archive's metadata API; nothing downloaded). That is a possible audio source for the waveform feature, with the rights question of section 8 still open: the Archive hosts the files but the item states no licence.
- **Sync data is better than expected**: 99% of volley annotations within 2 s of consensus, and the maintainers already corrected the camera clock errors they noted. A multi-recording timeline is reliable to about 2 s for about 140 recordings.
- **Quality limits**: 24 video recordings have no clock; 52 have a title time only; durations are unknown; 7 recordings have drifting anchors; only 8 of 223 ids have an availability check (2 of them did not load). Camera bearings are absent, as phase 1 said.

### 10.9 For Juan

1. **911 titles and positions** (answered: a neutral category instead of the title, see 10.10): I did not carry the call titles and I generalised the call positions, which departs from "title and location point". Both follow from section 4 rule 3 (no victim described or located): titles name injuries to relatives and hotel room numbers. Say if you want the titles back in some neutral form (for example a category chosen from a short list).
2. **The maintainers have not been asked.** The Source record says so. You decided the map is public; a message to the group address would still give us correct attribution and any update history, and costs nothing.
3. **Audio from the Internet Archive** (answered: link only, see 10.10): do we use those 911 files for waveforms (rights unclear, no licence on the items), or keep the annotation-only version?
4. **Template id prefix**: the seed uses bare template ids like Nepal's; the build adds `vegas_`. Tell me if you wanted `vegas_` in the seed files.
5. **Official PDFs** still to download by hand (`raw/official/DOWNLOAD.md`), then a pass to replace the "from summary" official entries.
6. **Gaps in the prototype's reference model** (the build and app lanes need them): a media-time anchor on a reference (`captures` and `derived_from` carry one in the seed), a second-precision `date` with an offset, and a numeric `sync_offset_seconds` as a facet. These are listed in section 5 and used in the seed.

### 10.10 Follow-up: call categories, audio links, message to the maintainers

Decided by Juan on the Operator's recommendations (2026-10-07). Rerun the same chain as in section 10; `data/call_categories.py` and `raw/archive-files-*.json` are new inputs.

**Call categories.** Every call record has `call_category`, one of eight values, chosen by `data/call_categories.py` from the map's call title with generic keyword rules. The title is read there and never stored: the call keeps only its number, the neutral title `911 call #<number>`, the category, the compilation offset or audio link, a generalised position and a content warning. Nothing in the category names, describes or locates a person or a room. Counts over the 155 calls:

| Category | Calls |
|---|---:|
| Reports hearing gunfire (`reports-gunfire`) | 52 |
| Reports an injury or asks for medical help (`reports-injury`) | 43 |
| Reports a shooter, a gun or a sighting of a shooter (`reports-shooter`) | 19 |
| Other or unclear (`other-unclear`) | 18 |
| Hiding or asking for help, information or an update (`requests-help`) | 10 |
| Reports suspicious activity (`reports-suspicious-activity`) | 6 |
| Reports an explosion, smoke or breaking glass (`reports-explosion-smoke`) | 4 |
| Exchange with security, staff or a dispatcher (`security-or-dispatch`) | 3 |

The list is 8 values, two more than the Operator's example list (an explosion or smoke category and a security or dispatch category), because those two kinds of call do not fit the others. The categories are my reading of titles, not of the audio, and a title can fit two categories: the rules take the first match in the order explosion, shooter, suspicious activity, injury, gunfire, help, security or dispatch. A call that reports an injury and gunfire is "injury"; one that reports a shooter and shots is "shooter". `data/validate.py` fails on any value outside the closed list, on a thesaurus that differs from `call_categories.py`, on any property of a call that could carry title text, and on a call title that is not `911 call #<number>`.

**Audio links.** 79 of the 155 calls have an `audio_url` to an Internet Archive file (a link only; nothing downloaded or re-hosted), each with the item id and "credited to LVMPD, uploaded by a private account, no licence stated on the item" in its evidence, and a `published_in` reference to the item's Source record:

| Item | Calls | Of which linked on the map | Found by call number |
|---|---:|---:|---:|
| `LasVegasShooting911Calls` (Batch 5, calls 1 to 518) | 59 | 1 | 58 |
| `Vegas_Shoooting_Batch_7-911Calls` (Batch 7, calls 1025 to 1154) | 20 | 14 | 6 |
| Not on either item (calls 519 to 1024, other release batches) | 76 | | |

The map links 15 files itself. For the other 64 I matched the call number in the map's title to the numbered file list of the two items (`raw/archive-files-*.json`, file names only). The match is an inference and the evidence says so (`audio_basis: matched-by-number`; "the audio was not listened to"). Two checks support it: the five YouTube compilations on the map follow call-number order (offsets rise with the number in all five, with one exception in the first), and the file numbers of the two items (1 to 518, 1025 to 1154) do not overlap. The 76 calls between 519 and 1024 belong to release batches whose Internet Archive items I did not look up, so they have no audio link. The files are `.wma`, which most browsers do not play; any use for waveforms needs a conversion step, which is an app question.

**Message to the maintainers.** `maintainers-message.md`, a draft for Juan to send from his own address: what we used and how, what we left out, and three requests (preferred attribution, creation and update history, corrections). It offers the 19 title-mismatch and 7 drift recordings. Nothing was sent.
