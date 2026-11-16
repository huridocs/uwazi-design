# Nepal protests, 2024 to 2026: OSINT seed, phase 1 (research and data)

Status: data, media and documents plus schema, no app code. Built on 2026-10-05 from public sources by fifteen
research agents (one per topic) and a media pass, merged and validated by `data/merge.py`. Every number below is generated from
`data/stats.json` and `data/showcase/stats.json`.

## Hubs (`data/hubs.json`, supplement of 2026-10-14)

A hub is a set of references that share one `hubId` in the app and have 2 or more distinct member records
(CLAUDE.md, Data model and Relationships panel). The app draws it as one row whose pills are the members. `data/hubs.json`
says which seed references form which hub, so `scripts/build-nepal-corpus.mjs` can set `hubId` without deriving anything. The file is generated,
never edited:

    python3 -I data/build_hubs.py          # write data/hubs.json
    python3 -I data/build_hubs.py --check  # exit 1 when the file is stale

Run it after `data/merge.py`: it keys on reference ids, which are the merge's output (a re-merge can renumber or merge references).

**Shape.** One object: `version: 1`, a `kinds` table that describes each kind, and `hubs`, sorted by id.

    {"id": "hub-claim-curfew-from-12-30-pm-supports",        // stable and readable: hub-<anchor kind>-<anchor slug>[-<relation type>]
     "kind": "claim-stance",
     "anchor": "claim:curfew-from-12-30-pm",           // the record the hub is about; one end of every reference in the hub
     "relationType": "supports",       // the seed relation type of every reference in the hub
     "memberIds": ["..."],             // distinct records at the other end, in first-seen order; always 2 or more
     "refIds": ["ref:..."]}            // references.json `id`, in file order: the only key the build needs

**Key.** `refIds` hold the `references.json` `id`, the value the build already keeps as the reference's id (the app's id is `np-` plus it).
`memberIds` is for checking, not for lookup.

**Rules.**
- `claim-stance`: one hub per claim and per side. The claim's `supports` links from Source records are one hub and its
  `disputes` links another; both name the claim as `anchor`. They are two hubs because a hub row reads as "these members
  are alike" and prints one relation label (the first reference's): supporters and disputers in one row would carry the
  wrong label for half of its members. The contest model (`data/refContest.ts`) treats the sides the same way: a link's own
  side is the claim's other links of the same stance, the other side is the opposite stance, and both are found through the
  claim. A hub's `refIds` are exactly one side's links. Joining the sides is a grouping by `anchor` (178 hubs instead of
  150), which the file supports without change.
- `event-involved`: one hub per event, over its `involved` links to people and organisations. The members share the
  event; they are not necessarily related to each other. This is the weakest of the three groups.
- Not used: `reports_on`, `concerns` and `casualty_of` also fan out from an event or claim, but their other ends are not
  parties to the fact, and `casualty_of` members are the records the privacy rules cover.
- A reference is in at most one hub. The kinds are keyed on relation types that no other kind uses, so groups cannot
  overlap; the script fails if one ever does. A reference of any other type, or in a group with one member, has no hub and
  stays a plain reference.
- Privacy: no hub names a record the seed's rules withhold. Members are Source, person and organisation records only; the script fails on a casualty, an under-18 or a withheld identity.

**Counts** (5,304 references; 763 are in a hub). 229 hubs:

| Kind / relation type | Hubs | References | Largest |
|---|---|---|---|
| claim-stance / supports | 93 | 278 | 11 sources: `hub-claim-curfew-from-12-30-pm-supports` |
| claim-stance / disputes | 57 | 141 | 6 sources: `hub-claim-chitrakar-died-on-9-september-disputes` |
| event-involved / involved | 79 | 344 | 13 parties: `hub-event-2026-03-08-karki-commission-report-submitted` |

Left as plain references: 54 events with one involved record, and the claim sides with one source. 131 claims have a
hub; 19 have one on both sides.

## 1. What is in the corpus

| | Full corpus | Showcase subset |
|---|---|---|
| Entities | 2,124 | 652 |
| References (edges) | 5,319 | 1,664 |
| References with a verbatim anchor quote | 2,010 | 771 |
| Date span of events and actions | March 2024 (month precision) / 28 Apr 2024 (day) to 5 Oct 2026 | Jul 2024 to 5 Oct 2026 |

The full corpus is larger than "a few hundred" because every cited article is an entity (922 sources). The
showcase subset keeps the densest-linked entities per template, the 160 sources that anchor most of them, and
every bundled media item.
Use it for the demo; use the full corpus where the evidence trail matters.

Entities per template:

| Template | Full | Showcase |
|---|---|---|
| Source | 922 | 160 |
| Claim | 289 | 60 |
| Event | 180 | 110 |
| Official action | 184 | 40 |
| Organisation | 151 | 55 |
| Person | 112 | 70 |
| Location | 109 | 50 |
| Media item | 104 | 67 |
| Casualty record | 73 | 40 |

References per relationship type (full corpus): reports_on 1,450, concerns 495, supports 418, involved 398, claimed_by 283, targets 277, disputes 247, depicts 237, issued_by 224, occurred_at 179, in_response_to 145, held_office 138, published_in 109, casualty_of 102, located_in 96, part_of 93, led_to 86, member_of 62, documents 62, responded_by 60, incident_at 39, treated_at 30, geolocated_by 29, succeeded 26, geolocates 14, organised_by 11, part_of_org 9.

Timeline: events by phase (full): background 2024 16, build-up 2025 15, ban and mobilisation 11, 8 September 20,
9 September 69, transition 10 to 14 September 24, aftermath 25. By month the dense run is September 2025
(125 events); the 2024 events are 16 (12 July 2024 government change, floods of 26 to 28 September 2024, the
October 2024 arrest of Rabi Lamichhane and the protests after it, cooperative-victims protests, TikTok ban
lifted, and others) and 2025 before September has 16 (social media bill, monarchist rallies and the 28 March
violence in Tinkune, the Telegram block). The aftermath runs through the inquiry commission (21 Sept 2025,
report 8 March 2026), the 5 March 2026 election, arrests of 28 March 2026, the NHRC report (27 May 2026), and
the first anniversary and Congress convention in September to October 2026. Fifteen events carry hour
precision (for example first shots about 12:37 to 12:40 on 8 September 2025, Kantipur attack 13:30 to 14:00 and
Shital Niwas on fire by 16:25 on 9 September, army chief's address about 21:00 and deployment about 22:00).
Some quantities are only dated to the day because no retrieved source gave an hour.

93 of 109 locations have coordinates (public buildings at point precision; residences of public officials at
neighbourhood level, `location_type: official-residence`). Casualty records: 73 (71 killed, 2 injured; 49 named as
published, 24 name withheld).

## 2. Verification status of the facts

Rule used (applied by `merge.py` to every fact, replacing what each researcher entered): a fact is
`confirmed` if it cites at least two independent publishers (the same publisher, or stories syndicated from
the same wire or origin, count once); `single-source` if one; `disputed` if the researcher recorded
conflicting accounts. A fact is a per-property evidence entry on an entity, or a reference.

| Facts (explicit only) | Confirmed | Single-source | Disputed | Total |
|---|---|---|---|---|
| Entity evidence entries | 1,444 | 1,935 | 565 | 3,944 |
| References | 1,095 | 3,687 | 537 | 5,319 |
| Both | 2,539 (27.4%) | 5,622 (60.7%) | 1,102 (11.9%) | 9,263 |

A further 255 evidence entries are `inferred`: where a researcher filled a property without an evidence entry,
the merge attached the sources of the entity's other facts (flagged `inferred: true`, not counted above). Showcase
subset: 36.2% confirmed, 52.7% single-source, 11.1% disputed.

For `claim` entities the evidence status says how well the sourcing is established; the claim's own
`verification_status` property is the outcome of the checks (160 of 289 claims are disputed, 91 single-source,
38 confirmed). A claim marked disputed is typically a death-toll figure, an order to fire, a rumour or a
fact-check outcome that sources contradict.

Anchor quotes: two random samples of unique (source, quote) pairs, 60 and 120, were checked by downloading the
cited page and testing for the quote (case, punctuation and whitespace normalised). Of 180 sampled, 171 were
found verbatim (95%), 6 were on reachable pages but not found, 3 pages returned 403 or an error. The not-found
quotes are listed in `data/quote-check-seed7.json` and `data/quote-check-seed21.json`; for the media pass (anchors from fact-checks, video pages and show notes) a separate check of 54 unique quotes found 43, 6 were on reachable pages but not found, and 5 pages were unreachable (`data/quote-check-media-seed33.json`); the other ~1,765
anchors were checked by the researchers against the text they retrieved but not by me.

## 3. Schema proposal (Uwazi terms, fits `app/src/data/templates/types.ts`)

Machine-readable: `data/schema/templates.json` (`TemplateDef[]` with `PropertyDef` flags: `showInCard`,
`filter`, `defaultfilter`, `prioritySorting`, `required`), `data/schema/relationTypes.json` (27 types, with
the templates each may link), `data/schema/thesauri.json` (177 values in 23 thesauri). Property ids follow the
prototype rule `${templateId}:${name}`. Relationship properties are declared on the template that holds the
outgoing edge, as in Uwazi; the other side sees the inverse.

Templates (9) and their properties:

| Template | Properties (type) |
|---|---|
| Event (default) | summary (markdown), when (daterange, required, priority sort), precision (select), event_type (select), phase (select), reported_fatalities (numeric), verification (select), and relationships: occurred_at, organised_by, involved, responded_by, led_to, part_of |
| Person | name_native (text), roles (multiselect), profile (markdown), public_status (select); relationships: member_of, held_office (dated), succeeded (dated) |
| Organisation | name_native, org_type (select), description, website (link, institutions only); part_of_org |
| Location | location_type (select), geolocation, coordinate_basis (text), name_native, description; located_in |
| Source | publisher, publisher_type (select), medium (select), published (date, empty for living pages), accessed (date), url (link), language (select), syndicated_from, archived_url (link); relationships: reports_on, supports, disputes, geolocates (all anchored) |
| Claim | statement (markdown), claim_type (select), verification_status (select), asserted_on (date), verification_note; claimed_by, concerns |
| Official action | action_type (select), date, precision, status (select), description, document_url (link), verification; issued_by, targets, in_response_to |
| Media item | caption, media_kind (select), file (image, the bundled copy), embed (media, the video or audio URL), page_url (link), platform, outlet, creator, rights (select), licence, licence_url, attribution, recorded (+ precision), published, duration_seconds, segment_start / segment_end, language, content_warning, geolocation, location_method (markdown), verified_by, verification (select incl. misattributed), file_size_bytes; relationships: depicts, documents, published_in, geolocated_by |
| Casualty record | full_name, age (numeric), gender, outcome (select), cause (select), occurred (date), identity_status (select), described_as, district, verification; casualty_of, incident_at, treated_at |

Relationship types (id: from to): occurred_at: event to location. organised_by, involved: event to person or
organisation. responded_by: event to organisation. led_to, part_of: event to event. member_of, held_office:
person to organisation (dated). succeeded: person to person (dated). part_of_org: organisation to organisation.
located_in: location to location. reports_on: source to any (anchored). supports, disputes: source to claim
(anchored). geolocates: source to location (anchored). claimed_by: claim to person, organisation or source.
concerns: claim to any. issued_by: action to person or organisation. targets: action to any. in_response_to:
action to event, action or claim. casualty_of: casualty to event. incident_at, treated_at: casualty to location.

How a source's anchor maps to the prototype's reference model: the prototype's `Reference` has
`sourceEntityId`, `targetEntityId`, `relationType` and an optional `sourceSelection` (text anchor). In this
data the source is always the "from" end for `reports_on`, `supports`, `disputes` and `geolocates`, so the quote
goes to `sourceSelection.text`. Gaps in the prototype's reference shape that this dataset needs, for phase 2:
(a) a date or date range on a reference (office tenure on `held_office`, `member_of`, `succeeded`; 201 references
carry one); (b) a verification status and a list of supporting source ids on each reference; (c) per-property
evidence on entities (`evidence[]` in the files). CLAUDE.md lists "no confidence on references" as a known
gap, so I suggest keeping (a) to (c) in `x`-style prototype extensions (`PropertyDef.x` already exists as the
precedent) and not treating them as Uwazi fields.

## 4. Files

All under `data/`.

| File | Content |
|---|---|
| `entities.json`, `references.json` | Full merged corpus. An entity: `id`, `template`, `title`, `properties` (names from `templates.json`, select values are thesaurus ids), `evidence[]` (`property`, `sources`, `verification`, `note`, optional `inferred`). A reference: `from`, `to`, `type`, optional `date` (range), optional `anchor` (`source`, `quote`), `sources`, `verification`, `note` |
| `showcase/` | The demo subset, same shape, plus `stats.json` |
| `csv/` | One CSV per template and `references.csv` (the same data; geolocation, dates and links as JSON text in cells) |
| `schema/` | Templates, relationship types, thesauri |
| `parts/` | The researcher outputs before merging (twelve text parts, `media-images`, `media-video`, `media-audio`, `media-docs`, `media-docs-anchors`), kept for audit |
| `../media/images/` | 29 bundled Wikimedia Commons and open-government images (14.2 MB), see section 9 |
| `../docs/` | 23 bundled PDFs (31.6 MB), per-page text and metadata, `index.json`, `linkonly.json`, see section 9 |
| `build_commons_images.py`, `build_doc_anchors.py`, `ocr_docs.py` | The media and document scripts |
| `stats.json`, `validation-report.md` | Counts; what the merge changed (1,162 verification recomputations, 139 property conflicts, 171 sources moved to `accessed`, 2 anchors dropped, 5 sources with no date) |
| `CONTRACT.md`, `merge.py`, `showcase.py`, `verify_quotes.py` | The researchers' rules and the scripts |

Dates are ISO 8601, with `+05:45` (Nepal time) when an hour is given. Ids are `<template>:<slug>`.
Living pages (Wikipedia, OpenStreetMap, ministry and rights-body websites; 171 sources) have no publication
date: `published` is empty and `accessed` holds the access date, 2026-10-05. They were used for office dates,
biographies and coordinates, and are `single-source` unless a news source agrees.

## 5. Handling of people

Real names appear as published: public officials, public figures, journalists, named protest organisers and the
victims named in the published martyr lists. The 3 November 2025 cabinet list (45 names with municipality, ward
and district) and INSEC's hospital list are the main victim sources. No phone numbers, e-mail addresses, street
addresses or social handles of private individuals are in the data (the merge script scans for these patterns and
found none). No minors are named: a casualty under 18 has `full_name: null` and `identity_status: withheld`;
`merge.py` blanks the name of any casualty with age under 18. Residences of public officials are
neighbourhood-level points. The 24 withheld casualty records include one possible minor (HRW gives age 17 where
INSEC's list gives a similar name at 19; treated as one person and withheld), five juvenile inmates, three
police, three Ramechhap inmates and eight unidentified burned remains.

## 6. Sources

789 source entities from 168 publisher names. Counts by publisher type: Nepali media 368, other 173 (mostly
Wikipedia and OpenStreetMap), international media 110, rights organisations 52, fact-checks 43, news agencies 32,
government 5, UN 5, court or commission 1. Languages: English 766, Nepali 23.

Main publishers (source entities): Wikipedia 138; The Kathmandu Post 72; Setopati 55; The Himalayan Times 38;
Onlinekhabar English 37; The Tribune (India) 34; Himal Press 22; Al Jazeera 19; OpenStreetMap Nominatim 23;
Newschecker 15; Kantipur / eKantipur 21; Human Rights Watch 11; INSEC 13; Republica / myRepublica 13; Alt News 8;
Asia News Network 8; Nepali Times 8; ShareSansar 8; Committee to Protect Journalists 7; BOOM 6; Ratopati 6;
B360 Nepal 5; IANS 5; Ada Derana, Amnesty International, Khaleej Times, OCCRP, VERA Files and others 3 to 4 each.
Rights bodies cited: HRW, Amnesty (including its December 2025 accountability statement), CPJ, RSF, FNJ,
Freedom Forum, INSEC, NHRC Nepal (through press coverage of its reports), OHCHR and UN statements (through
press coverage and UN News). Primary records cited: Ministry of Communications notices, cabinet decisions,
commission findings (through the press), Supreme Court orders (through the press).

## 7. Gaps

- **Search budget.** The shared WebSearch budget (200 calls) ran out early in every agent's run. All twelve
  finished from URLs returned earlier, from Wikipedia reference lists and from direct page fetches. Coverage is
  strong where the first searches landed (8 to 9 September, casualties, aftermath) and thinner elsewhere.
- **Blocked or unreachable outlets.** Reuters, BBC, AP, The Guardian, New York Times, Washington Post, CNN, DW,
  Hindustan Times, Times of India, SCMP, Deccan Herald, OHCHR, and the Amnesty site (direct) returned errors or
  403 to the fetch tool. None is a source entity, so the BBC video investigation, the Reuters forensic report and
  AFP appear only through the outlets that republished or described them (Onlinekhabar, Ratopati, Tribune India,
  Prothom Alo, News24). Reuters' finding that 33 or more were killed by live bullets is one example: it is
  recorded as a claim with its secondary sources.
- **Topics not covered or thin:** the 2024 teachers' and students' protests, the Lalita Niwas land scam case,
  Birgunj, Itahari, Butwal and Janakpur as dedicated 9 September events, destruction of government records as
  an event, the army's deployment detail, the repeal or replacement of the social media directive, damage
  figures after September 2025, recapture of escaped prisoners after 28 September 2025, Gen Z party formations,
  IFJ, the Nepal Bar Association, INSEC and Access Now positions on the 2024 build-up, Bangladesh's reaction, and
  the UN Secretary-General's own statement (only through press). Fact-checkers AFP, BBC Verify, Reuters, Logically,
  Full Fact, DFRLab and Misbar produced no retrievable item; Dismislab, BOOM, Alt News, Newschecker, VERA Files,
  Rumor Scanner and Media Diversity Institute did.
- **Platform takedowns:** one reported removal only (the original "slingshot" video post), not the five asked for.
- **Coordinates missing** for Kantipur Complex, Bagmati Province, Dhanusha, Jhapa, Surkhet, Simara Chowk, the
  Shivapuri army college, Bohratar, Maoist Centre office at Paris Danda, Ratna Chowk Pokhara, and the Itahari
  Area Police Office.
- **Names and individual casualties:** no names for police officers killed or for prisoners killed; 28 of the 45
  cabinet-list names have no day of death in any source and are linked to both the 8 and 9 September events with
  `occurred` empty (ids contain `2025-09-xx`). Where the cabinet list and INSEC give different first names for
  the same ward and age, the match is my researcher's inference and is marked `disputed`.
- **Quote anchors.** About 5% of sampled anchors were not found on the page when re-fetched (section 2); some
  Nepali-language quotes are verbatim Nepali. 28 `reports_on` references from the registry part and a number
  from other parts have no anchor because the fetch tool only paraphrased the page.
- **Dates.** Five news-page source entities have no publication date and no access date (`undated` in the id). Some event dates were
  derived from an article's "on Monday" and are flagged in notes (for example the 21 April 2025 education
  minister resignation and the 27 January 2025 social media bill introduction). Several 2024 event dates come
  from publication dates (25 May 2024 hunger strike, 16 September 2024 committee report, 11 April 2025 arrest
  of Durga Prasai) and are flagged in the notes.
- **Duplicates.** Four duplicate entities were merged by alias (`organisation:office-of-the-president-nepal`,
  `person:raja-ram-basnet`, `location:everest-hospital-new-baneshwar`, `person:prakash-man-singh-raut`); similar
  pairs may remain, for example `organisation:ministry-of-education` and
  `organisation:ministry-of-education-science-and-technology`, and two sources with one article under two ids.
  139 property conflicts (same entity, different value from two parts) were resolved by keeping the first value;
  they are listed in `validation-report.md`.
- **One-person judgement calls kept in the data:** the link of the BBC's "Chhabilal Rijal" to
  `person:chhabi-rijal` is by name only (noted on the claim); the match of Dismislab's "Guashala Police Circle"
  to the OpenStreetMap Gaushala police circle is by name only.

## 8. Contradictions between sources

Each one is represented as competing `claim` entities with `supports` and `disputes` references from the
sources, so the interface can show them side by side. The largest:

1. **Death toll.** 8 September: 14 at about 16:00, then 17, 18, 19 that evening; later 20 or 21 for the day (the
   inquiry committee, ANI). Kathmandu 8 September: 16 (Ministry of Health), 17 (HRW, INSEC, Himal Press), 19
   (Amnesty, BBC). Overall: 30, 31, 34 (10 to 11 Sept), 51 (12 Sept), 72, 73, 74 (17 Sept; Reuters 26 Sept), 75,
   76 (HRW, Amnesty, Kathmandu Post), 77 (committee report, AFP). Day split: 21/39/12 (ANI) against 20/37/20
   (committee). The Chief Secretary on 14 September gave 59 protesters, 10 inmates and 3 security personnel; the
   Army on 17 October gave 22 protesters, 3 police, 10 prisoners and 41 "others".
2. **Injuries.** Over 100, 340, 347, over 400, over 300, 453 on 8 to 9 September; later 1,033, 1,300, 1,800, 2,429,
   2,522 (Reuters, from the commission) and 2,660 (verified list).
3. **First shots and the order to fire.** 12:37 (Harvard Atrocity Prevention Lab), "just before 1 pm" (Kathmandu
   Post), a 12:40 "Peter One" radio order (BBC via Ratopati), 12:30 to 4 pm lethal-force window (HRW),
   12:57 rubber bullets and aerial shots (Himalayan Times). Who ordered it: IGP Khapung (BBC); the order after a
   security committee decision (AFP); Khapung, the CDO and the home minister each deny giving it; Oli says he gave
   no order; the commission found guns and metal bullets were a government mistake and recommended negligence
   charges, while the NHRC (27 May 2026) holds Oli primarily responsible.
4. **Type of force.** Early reports and Reuters' 10 September wrap-up say tear gas and rubber bullets; Reuters
   forensics, HRW and Amnesty document live fire (33 or more of 34 bullet-wound bodies not from rubber bullets).
5. **Curfew.** Start 12:30 (six outlets) against 15:30 (Kathmandu Post); one source says "Sunday".
6. **Social media ban.** 26 platforms (BBC, HRW, Al Jazeera, Guardian), "about two dozen" (AP), 27 (India Today);
   which five registered; deadline 3 or 4 September; cabinet decision 25 or 26 August; when blocking took effect
   (midnight Thursday, "from today", Friday evening); whether Discord was on the list; the stated reason (hate
   speech and cybercrime, tax, national security); lifting date (night of 8 September or 9 September).
7. **Who organised 8 September.** Hami Nepal (Al Jazeera, India Today, Nepali Times) against "no single
   organiser" (BBC, Onlinekhabar, Hami Nepal's own post); the NHRC report says Sudan Gurung led the crowd at about
   12:00 near Everest Hotel; Gurung says he did not start it. Expected turnout 3,000 to 8,000; NHRC says
   20,000 to 25,000 came.
8. **Rajyalaxmi Chitrakar** (wife of Jhalanath Khanal): reported dead on 9 September (Business Standard); BOOM,
   Alt News, Setopati and Khanal say alive and critical; flown to Delhi for treatment and home in December 2025.
   Recorded as `confirmed` alive and `disputed` in the casualty records.
9. **Oli's resignation and whereabouts.** 13:30 (Kathmandu Post) against 14:00 (Setopati); resigned 9 September
   but caretaker until 12 September (Wikipedia); reports that he fled the country, denied in his letter; at
   Shivapuri barracks (Oli, Setopati).
10. **Residences.** Dahal's house at Khumaltar stoned or burned; Deuba's burned or vandalised; the President's
    private home at Bohratar vandalised or burned; Finance Minister Paudel chased and beaten (confirmed), stripped
    and pushed into a river (Gulf News only; Media Diversity Institute says a viral video of that was not him).
11. **Prison breaks.** Escaped: 13,500, 14,507, 14,549, 14,555, 14,558 or over 15,000 (police, prison department,
    commission, press); still at large 12,533 (12 Sept), 8,816 (19 Sept), over 6,800 (25 Sept), 6,813 (28 Sept);
    per prison: Nakkhu 3,300 or 1,280, Sundhara 1,400 or 3,003; Rabi Lamichhane left Nakkhu prison on a release
    letter he says was genuine and the prison administration disowned. Ramechhap: 2 or 3 inmates killed.
12. **Damage and records.** Private-sector loss NPR 25 bn (AFP) to 100 bn (FNCCI) and, from economists, 3
    trillion; Supreme Court files burned: 20,000, 60,000, 450,000; Parliament "still stands" (Karki) against
    incinerated (Carnegie); Hilton against Hyatt Regency.
13. **Transition.** Whether the Discord poll "chose" Karki (50% against Balen Shah at 28% in one report; a
    five-name shortlist without Shah in others; 3,833 of 7,713 votes against about 10,000 participants); the
    dissolution of the House before or after the oath; Shah's endorsement date; cabinet size; compensation Rs 1
    million against 1.5 million.
14. **Aftermath.** Report length 1,000 against 8,000 to 10,000 pages; charge sections 181/182 (up to 10 years)
    against 281 to 283 (up to 3 years); arrest warrants court-issued against awaiting validation; RSP seat
    forecast 185 to 190 against interim 119 direct seats and final 182.
15. **Disinformation.** The Pashupatinath gate video (festival and date conflict among fact-checkers), the Sikkim
    "Bharat Mata ki Jai" video (three different origin events), the Cyabra report (34% of discourse against 34% of
    sampled profiles with 11.5% of engagements), and rumours about Balen Shah as prime minister, army chief
    statements and the President's resignation.
16. **Names.** Chhabi or Chhabilal Rijal, Sudan or Sudhan Gurung, Prasai or Prasain, Pokhrel or Pokharel,
    Baneshwar or Baneshwor, Rajyalaxmi or Ravi Laxmi Chitrakar, Timalsina or Timalsena; Sulabh Raj Shrestha appears
    under four spellings.
17. **Offices.** End dates differ by three days between Wikipedia pages (Oli 9 or 12 September 2025; Bishnu Paudel
    9 or 12 September); Khapung's retirement 12 or 13 November 2025; Bala Nanda Sharma's start as foreign
    minister 12 or 26 December 2025; Dev Raj Ghimire's speakership end 19 January 2026 despite dissolution on 12
    September 2025 (unexplained).

## 9. Media and documents

Added in the media pass. The corpus now has 104 media items and 23 bundled primary documents.

**Where media sits in the schema.** A separate `media` template (Media item), not media properties on Source.
A Source is a publication (an article or page); one article carries several images or clips, and rights,
geolocation, recording date and verification belong to the item, not to the article. In the prototype's
`TemplateDef` property types: `file` is `image` (the bundled copy, path `media/images/...`), `embed` is `media`
(the YouTube, podcast or radio URL), `page_url` and `licence_url` are `link`, `geolocation` is `geolocation`.
Source stays the publication and links to the item with `reports_on`, `supports` or `disputes` (anchored); the
item links back with `published_in` and to the evidence with `depicts` (event, place, person, organisation),
`documents` (claim, action, event, casualty) and `geolocated_by` (the investigation or fact-check that placed or
dated it). Four relationship types were added; `reports_on`, `concerns` and `targets` may now point at a media
item. New thesauri: kinds, platforms, rights, content warnings, media verification (confirmed, single-source,
disputed, misattributed, unverified).

**Counts (full corpus).** 104 media items: 50 video, 28 photo and 1 map or graphic (the 29 bundled), 25 audio.

| Rights | Items |
|---|---|
| Bundled, CC BY-SA | 17 |
| Bundled, CC BY | 6 |
| Bundled, CC0 | 5 |
| Bundled, open government licence (GODL-India) | 1 |
| Link or embed only | 75 (50 video, 25 audio) |

| Verification | Items |
|---|---|
| Single source | 60 |
| Confirmed (two or more independent sources) | 25 |
| Misattributed or recycled (flagged by fact-checkers) | 17 |
| Disputed | 2 |

By platform: Wikimedia Commons 29, YouTube 28, podcast hosts 16, X 7, TikTok 7, outlet sites 6, Facebook 4,
radio 3, Instagram 2, other 2. Content warnings: 4 graphic (link only, neutral caption), 20 distressing, 56 none,
24 not assessed (the audio items, whose show notes were read but not listened to). Recorded dates: 2025 47,
2024 7, 2026 6, older footage that was recycled as new 5 (2013, 2016, 2018, 2022); 39 items (mostly audio) have no
recording date. 6 items carry a time range for the relevant segment (4 audio, 2 video), taken only from show
notes, chapters or the fact-check. 34 items have coordinates; 24 have a `geolocated_by` link with the method
stated in `location_method` (landmarks and shop signs, Street View and satellite matching, riot-gear matching,
chronolocation from clock times). The methods come from the published investigations (Dismislab, Alt News, BOOM,
Newschecker, Fact Crescendo, BBC via Ratopati and Onlinekhabar); for the Amnesty and HRW clips the pages say only
that they were verified, and the data says so.

**Bundled images (29, 14.2 MB).** Taken from Wikimedia Commons through its API; each record has the file URL,
licence, licence URL, author, attribution line and the Commons file page as its source. They are resized copies
(long edge at most 1600 px, made with `sips`), so they are adaptations and CC BY-SA terms apply to the copies.
Subjects: the 8 and 9 September 2025 protests and arson in Chitwan and Bharatpur (CC0 and CC BY-SA), the Parliament
building, the transport management and government attorney offices after the protests (photographs of 15 and 20
September 2025), before-images of Parliament, Singha Durbar and Baluwatar, and public figures (Balen Shah, Rabi
Lamichhane, Gagan Thapa, Deuba, Oli, Gyanendra Shah). The only Commons videos found for this topic are unrelated
(Wikipedia 25 anthem films), so no video is bundled. Nothing from news outlets, agencies or broadcasters was
downloaded. Some crowd photos show people who may be identifiable; none is named, and the set should be reviewed
once more before publishing.

**Video and audio (75, links only).** Video: broadcaster and outlet channels (Al Jazeera English, BBC News and BBC
News Nepali, DW, France 24, Reuters, AP, AFP, PTI, ABC Australia, Channel 4, WION, NDTV, CNBC-TV18, Euronews,
Kantipur TV, the Nepali Army channel), plus the original posts behind 17 misattributed clips (a 2025 festival video
presented as the Pashupatinath gate, the Sikkim rally clip, Indonesian, Pakistani, Philippine and Indian clips
presented as Nepal or the reverse, a 2016 Oli interview and a 2022 Balen Shah oath posted as new, a 2013 rap battle).
Each misattributed item has `documents` links to the existing claim, a `reports_on` or `disputes` reference from the
fact-check with a verbatim anchor, and the real origin in `location_method`. 27 of the 28 YouTube links answered an
oEmbed check on 2026-10-05; the Indonesian riot-shield video is deleted (404) and kept because the fact-check cites
it. Four TikTok links could not be re-checked; Facebook and Instagram links are as cited by the fact-checkers.
Audio: 25 podcast and radio items (BBC World Service, Himal Southasian, SBS Nepali, The Hindu, Kantipur, Al Jazeera,
NPR, ABC, others), 22 in English and 3 in Nepali; the episode page is linked and `embed` holds the Apple Podcasts or
host URL, never an audio file.

**Documents (23 bundled PDFs, 31.6 MB; 17 link only).** Bundled: Government of Nepal documents, all with the basis
"Government of Nepal official publication; no explicit open licence stated". That is the rule the brief set; it is
not an open licence, so it needs a decision before the playground is published. 22 Nepali, 1 English. By issuer:
Office of the Prime Minister and Council of Ministers cabinet decision files for Bhadra, Asoj, Kartik and Chaitra
2082 (the 25 August 2025 platform-registration direction, the 15 September martyr and relief decisions, the
21 September decision forming the inquiry commission, the 3 November declaration of 45 martyrs, the 15 and 27 March
2026 decisions on the commission report); MoCIT notices of 1 December 2023 and 3 February 2025 on social media
listing; the Social Media Bill 2081 (33 pages); NHRC Nepal statements (10, including the 12 September 2025 release in
English and Nepali, and the 27 May 2026 press note); Supreme Court press releases (11 and 12 September 2025) and the
15 April 2026 full-court decision on lost case files; Ministry of Home Affairs procedures (injured classification,
relief assistance, damage assessment). Each is attached to its Source (and, for orders and decisions, its Official
action) as the entity's primary file: `files[]` on the entity in `entities.json` and `docs/index.json`.
Link only (17 documents, `docs/linkonly.json`, each with the reason): HRW (6 pages) and Amnesty (the 8 December 2025
report is CC BY-NC-ND 4.0, so no derivatives; its statements state no reuse licence), ICJ, FIDH, UN News and UN Web
TV pages, the UN in Nepal statement, Access Now (an HTML page). Not bundled on purpose: the MoHA lists of martyrs and
injured (they name private individuals and may include minors).

**Per-page text and page anchors.** Only 6 of the 23 PDFs had a text layer, and that text is broken by legacy-font
mapping. All 23 were therefore OCRed with Tesseract (Nepali `nep` model plus English, 250 dpi, 106 pages); the
text is in `docs/<id>/pages/NNN.txt`, the original layer of the 6 is kept in `pages_textlayer/`, and
`meta.json` marks `text_source: ocr` and quality "unreviewed". Expect errors in conjuncts and numerals. 11 references
now carry a page anchor `{file, page, text}` (cabinet decisions 6, MoCIT 1, NHRC 3, Supreme Court 1): each quote was
copied from the OCR text and checked against it, and `merge.py` re-anchors any quote whose source has an attached
document. No quote that already existed was re-anchored, because none came from these documents: the earlier
quotes are from news articles, and the rights bodies' reports are link only. So these are new anchored references
from the document's Source to the action it records.

**What was not found.** The inquiry commission report PDF (only the cabinet decisions receiving and implementing it),
the 28 August 2025 MoCIT registration notice itself (the cabinet decision behind it is bundled), the 4 September
blocking decision and the lifting notice, the curfew and prohibitory orders, the gazette notices on dissolution
and the election, the 2024 Supreme Court registration verdict and the Oli and Lekhak remand and release orders, the
full NHRC investigation report (only the press note is public), and any English versions of the government
documents. OHCHR pages returned 403. No BBC, Reuters, AP, Guardian or Washington Post media pages were reachable,
and no Commons video of the events exists. WebSearch was exhausted, so media was found through the Commons API,
YouTube's and Apple Podcasts' own search, outlet sites and fact-check pages.

## 10. How to use this in phase 2

- The prototype's corpus precedent is `app/src/data/travesia/` (generated corpus, lazy JSON in
  `public/travesia-data/`, template seed module). A Nepal corpus would follow the same layout: templates and
  relationship types from `schema/`, entities and references from the showcase (or full) JSON, loaded on demand.
- Suggested default view: the Event template, sorted by `when`; filters on phase, event type and verification;
  relationships panel showing the `reports_on` anchors; a When view over 2024 to 2026.
- To rebuild: edit or add files in `data/parts/`, then run `python3 data/merge.py` and `python3 data/showcase.py`.

## 11. Structured figures on claims

106 claims carry a figure (92 of the 100 casualty-figure claims plus 14 counts and amounts of other types). Fields on the claim template: `figure` (integer; NPR for damage), `unit` (killed, injured, arrested, detained, missing, damage-NPR, other), `unit_detail` (required when unit is other), `qualifier` (exact, at-least, about), `scope`, `as_of` (the date the count was stated for, not published), `as_of_time`, `as_of_basis` (stated, derived, published, unknown) and `figure_more` (other figures in the same statement). The evidence entry for these fields cites the sources of the claim's own statement.

The decisions come from a manual pass over each statement and anchor quote: `data/build_figures.py` holds them and writes `data/parts/claim-figures.json`; `merge.py` checks them (integer figure, unit and qualifier from the thesaurus, ISO as_of date, as_of_basis consistent with as_of, unit_detail for other, scope present, figure evidence present). `data/report_figures.py` writes `figures-report.md` with counts, disagreements and the uncertain cases. `showcase.py` keeps every figure claim. No claim has arrested, detained or missing as a unit: the corpus has no such count claims.

### Consistency rules added in merge.py (2026-10-06)

- Tenures: `held_office` and `member_of` records of the same person, body and type that overlap in time are merged into one (earliest start; the end with more sources, then the earlier; sources, anchors and notes combined; replaced ids in `merged_ids`). An undated record is absorbed by the dated tenure that covers 8 September 2025, or the latest. Touching tenures stay separate. One open-ended and one closed record with different starts are kept as a second post (`tenure_second_post`, one case: a justice who was acting chief justice). Rules `tenure_overlap`, `tenure_undated_beside_dated` and `tenure_inverted` check the result; all are 0. Merges are listed under `tenure_merged` in `validation-report.md`.
- Claim status: a claim marked `disputed` must have a source that disputes it or a conflicting claim (`disputed_without_dispute_link`, now 0). `conflicts_with` is a claim-to-claim relation type for incompatible accounts of the same fact (stored once, shown from both ends); a difference of counting date, scope or definition is not a conflict. Decisions are in `data/build_claim_status.py`; `status-corrections.json` is read by `merge.py`; `conflict_link_on_undisputed_claims` requires one disputed end.

## 12. Disputed-reference notes (supplement, 2026-10-13)

`disputed-notes.json` says why each of the 537 `disputed` references is disputed, from this seed only. It is read next
to `data/references.json`; none of the seed's files were edited. `data/build_disputed_notes.py` regenerates it
(`python3 -I build_disputed_notes.py` in `data/`).

Record: `refId`, `note` (one plain sentence), `opposingSourceIds[]`, `pairedRefIds[]`, `status` (`explained` |
`unexplained`), `basis`, and optional `missing` (unexplained only: what the seed lacks), `pairedVia`
(`dispute-link` | `conflicting-claim` | `both`) and `conflictingClaimIds[]`.

Counts (537 disputed references; 63 already had a note and are copied with `basis: seed-note`):

| Basis | Explained | Unexplained |
|---|---|---|
| `seed-note` (note was in `references.json`) | 63 | |
| `source-stance`: a source supports, reports or disputes a claim that others dispute or that conflicts with another claim | 223 | |
| `claim-inherited`: the reference attaches a disputed claim to an entity or source; the dispute is the claim's, not the link's | 158 | |
| `entity-evidence`: a source reports on a record whose own fact is disputed (the seed's evidence note, or the competing claims it names) | 56 | |
| `entity-evidence-untied`: as above, but the reference's source is not among the sources of the disputed fact | 8 | |
| `claim-conflict`: claim to claim, with the `conflicts_with` reason | 4 | |
| `claim-reclassified`: the claim was set to confirmed or single-source in `status-corrections.json`; the reference kept `disputed` and no opposing source or conflicting claim is recorded | | 20 |
| `entity-pointer`: the evidence note only says "See …" and names no claim that still conflicts | | 4 |
| `entity`: no disputed evidence entry and no opposing source | | 1 |
| Total | 512 | 25 |

Of the 474 references with no note before: 449 explained, 25 unexplained.

Method:
1. A claim is contested when a `disputes` reference points at it or a `conflicts_with` reference joins it to another
   claim (`build_claim_status.py` made every disputed claim have one of the two).
2. Opposing sources are relative to the reference's stance. For a `supports` or `reports_on` reference: the sources
   that dispute the claim, then the sources behind a conflicting claim. For a `disputes` reference: the sources that
   put the claim forward. For a claim's own links: both.
3. A reference with no claim end takes the note of the linked record's `disputed` evidence entry (a record with no
   such entry is `unexplained`). Where that note only names claims, the claims' statements are the note.
4. Pairs: `supports` and `disputes` references to the same claim (201 pairs, 173 with both references disputed). Where
   a claim has no `disputes` reference but conflicts with another claim, its `supports` references pair with the
   other claim's `supports` references (`pairedVia: conflicting-claim`, 23 references; 14 more have both kinds). In
   all, 223 of the 537 references have a pair.
5. A quote is a source's anchor quote, clipped to 140 characters; none is printed for a reference that touches a
   casualty record with a withheld identity or an age under 18. No name is added beyond the record's own title.

Findings for the build:
- The 20 `claim-reclassified` references sit on 11 claims whose status was lowered after the dispute review. They
  show `disputed` with nothing opposing them. The seed's rule would give them `confirmed` or `single-source`; this
  was not applied, to leave `references.json` unchanged.
- The 158 `claim-inherited` references are disputed because their claim is. The build can show them as "claim
  contested" instead of as a contested link.
- 387 of the 474 have at least one opposing source; 87 have none (claim-inherited or entity-level notes whose sides
  the seed does not attribute).

## 13. Dispute research pass on the 11 reclassified claims (2026-10-13)

Question: for the 20 references that kept `disputed` on 11 claims the seed had lowered (`status-corrections.json`), does a
credible source still dispute the claim? Open-source search and page fetches, 13 October 2026. Quotes below were
tested against the live page (normalised text), as `verify_quotes.py` does.

| Claim | Decision | Source (stance, date) |
|---|---|---|
| education-minister-resigned-over-teachers-demands-rift (1 ref) | Source added, ref stays `disputed` | Himal Press, 22 Apr 2025: Oli says "She resigned due to health issues. There is no other reason" (disputes) |
| karki-ineligible-as-non-member-and-former-chief-justice (4 refs) | Source added, refs stay `disputed` | The Annapurna Express, 7 Nov 2025: "Legal experts, however, argue that Karki's appointment was justified under the 'doctrine of necessity.'" (disputes) |
| injured-2660-verified-list (1) | No opposing source; status recomputed | The Rising Nepal 1 May 2026 (the claim's source); Kathmandu Post 7 Sep 2026 gives 2,638, unattributed |
| wounded-2522-in-commission-report (1) | No opposing source; recomputed | Himalayan Times 26 Mar 2026 and Kathmandu Post 8 Mar 2026 print no casualty totals for the report |
| injuries-100-plus-2025-09-08 (2) | No opposing source; recomputed | Other same-week counts are higher running totals |
| balen-shah-and-kulman-ghising-declined-interim-pm-role (2) | No opposing source; recomputed | Nepali Times 12 Sep 2025 (supports); Kathmandu Post 30 Sep 2025: "with Shah backing Karki, all other options were set aside" |
| death-toll-reported-on-11-september (3) | No opposing source; recomputed | Tallies of one day at different hours |
| death-toll-72-to-74-by-21-september (2) | No opposing source; recomputed | Successive counts |
| relief-amount-for-victims-families (2) | No opposing source; recomputed | Kathmandu Post 15 Sep 2025: Rs 1 million plus Rs 500,000, Rs 1.5 million in all |
| 74-deaths-nationwide (1) | No opposing source; recomputed | Reuters 26 Sep 2025 is an earlier tally than 76 and 77 |
| thousands-of-prisoners-freed (1) | No opposing source; recomputed | Tribune/PTI 11 Sep 2025: over 15,000, citing the Kathmandu Post and police |

Files (all new; nothing existing was edited by hand):
- `data/parts/disputes-research-2026-10-13.json`: 2 Source records (with Internet Archive captures of 13 Oct 2026 in
  `archived_url`) and 2 `disputes` references, in the seed's part format.
- `data/reference-status-corrections.json`: the 15 references to recompute, each with its reason. `merge.py` gives
  `confirmed` with two or more independent publishers, else `single-source`; each of the 15 has one source, so all
  become `single-source`. The reason is appended to the reference's `note`.
- `data/merge-patch-reference-corrections.diff`: two hooks for `merge.py` (37 lines): it reads the corrections file,
  and a claim downgrade in `status-corrections.json` is void when a `disputes` reference now points at the claim.
  Not applied yet. Applying it and running `python3 -I merge.py`, then `python3 -I build_disputed_notes.py`, gives
  the counts below. Tested on a copy of this folder: without the hooks and the new part, `merge.py` reproduces
  `entities.json`, `references.json` and `stats.json` byte for byte.

Counts after the merge (tested on the copy):

| | Before | After |
|---|---|---|
| References | 5,302 | 5,304 |
| `disputed` | 537 | 524 (-15 recomputed, +2 new) |
| `single-source` | 3,663 | 3,678 |
| `confirmed` | 1,102 | 1,102 |
| `disputed-notes.json` records | 537 (512 explained, 25 unexplained) | 524 (519 explained, 5 unexplained) |
| `claim-reclassified` (unexplained) | 20 | 0 |

Claims `education-minister-resigned-over-teachers-demands-rift` and `karki-ineligible-…` return to `disputed`.
`stats.json` and the numbers in §2 change with the merge; §2 is not rewritten here.

Not resolved:
- `bg24-220` (claim: she resigned for health reasons) and the rift claim are in direct conflict, but no
  `conflicts_with` reference joins them. Himal Press also supports the health claim. Neither was added.
- Karki: no Supreme Court ruling on the 16 writs was found. The Speaker's and Oli's written responses to the Court
  (Kantipur, 20 Nov 2025; seen as headlines only) side with the petitioners. The government's own reply was not found.
- The same outlet has three publisher spellings in this seed (Himal Press 22 sources, HimalPress 5, Himalaya Press 3),
  so `independent()` counts them as three publishers. The new source uses "Himal Press".
