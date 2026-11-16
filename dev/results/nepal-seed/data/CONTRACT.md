# Data contract for the Nepal OSINT seed (research agents read this first)

Goal: a dataset of the Nepal protests as one arc, from the 2024 build-up into the September 2025 "Gen Z" protests
(social media ban, 8-13 Sept 2025, arson, deaths, PM Oli's resignation, interim government, aftermath), built
only from public open sources. It seeds a prototype of Uwazi (a human-rights documentation tool); the point of the
dataset is relationships, timelines and **verification status**.

Today is 2026-10-05. Web search is US-only; use WebSearch, then WebFetch to read pages.

## Hard rules

1. **Nothing without a source.** Every entity property value and every reference must be backed by at least one
   source you actually retrieved (a URL that came back from WebSearch or that you fetched). Never write a fact from
   memory. If you cannot source it, leave it out.
2. **Real names are allowed, only as already published.** Use names exactly as the cited reporting gives them
   (public officials, public figures, named protest organisers, journalists, and victims named in published lists).
   Do NOT include: phone numbers, e-mail addresses, street addresses, social media handles or profile links of
   private individuals, family details beyond what a cited article states about the death, or any inference
   about a person. **No names of minors (under 18)**: for a minor casualty use `full_name: null`,
   `identity_status: "withheld"`, and describe as "Minor, age N" in `described_as`. If age is not reported and
   the person is described as a schoolchild or student of school age, treat as a minor.
3. **Locations**: public buildings and places at precise coordinates (from Wikipedia/Wikidata/OpenStreetMap, say which in
   `coordinate_basis`). Homes or residences of public officials that were reported as attacked: neighbourhood-level
   point only, `location_type: "official-residence"`, never a street address.
4. **Quotes**: a text anchor is a short verbatim excerpt (at most 25 words) copied from the page you retrieved.
   When you use WebFetch, ask it to "quote the exact sentence verbatim"; if the tool paraphrases, do not use it as
   an anchor (omit `anchor`). Do not invent or "tidy" quotes.
5. **Verification status per fact** (this is the point of the dataset):
   - `confirmed`: at least 2 independent publishers (not the same wire story reprinted) agree on it;
   - `single-source`: one source only (or several outlets that all copy one wire/one origin);
   - `disputed`: sources conflict (different numbers, times, or accounts). Record the conflict in `note`.
6. If a tool call is denied by the permission system, stop that line of work and report it. Do not try to get
   around it.
7. Dates: ISO 8601. `YYYY-MM-DD`, or with time `YYYY-MM-DDTHH:MM+05:45` (Nepal time) when reporting gives an hour.
   Set `precision` to `hour`, `day` or `month`.

## Schema

Read `schema/templates.json` (8 templates, property names), `schema/relationTypes.json` (23 relationship
types, with from/to templates) and `schema/thesauri.json` (select values: use the `id` slugs exactly).

Templates: `event`, `person`, `organisation`, `location`, `source`, `claim`, `action`, `casualty`.

## Entity ids

`<template>:<slug>`; slug is lowercase ASCII, hyphens. Canonical name rule: the full name as BBC/Reuters use it.
- person: `person:kp-sharma-oli`, `person:sushila-karki`
- organisation: `organisation:nepal-police`, `organisation:cpn-uml`
- location: `location:singha-durbar`, `location:maitighar-mandala`
- event: `event:2025-09-08-police-fire-on-protesters-new-baneshwar` (start date first)
- source: `source:<publisher-slug>-<yyyy-mm-dd>-<3-5 word slug>`
- claim: `claim:<slug>`; action: `action:<yyyy-mm-dd>-<slug>`; casualty: `casualty:<yyyy-mm-dd>-<name-slug or n-seq>` (for withheld names: `casualty:2025-09-08-minor-001`).

Before creating an id, check the shared registry `registry/ids.txt` (one id per line, written by all agents) with
`grep`; reuse an existing id instead of inventing a near-duplicate. Append every new id you create with
`echo "<id>" >> registry/ids.txt` (append only; never rewrite that file).

## Output file

Write ONE json file `parts/<your-topic>.json` (create the directory if missing) with this shape:

```json
{
  "topic": "string",
  "entities": [
    {
      "id": "person:kp-sharma-oli",
      "template": "person",
      "title": "KP Sharma Oli",
      "properties": { "<property name from templates.json>": <value> },
      "evidence": [
        { "property": "profile", "sources": ["source:..."], "verification": "confirmed", "note": "" }
      ]
    }
  ],
  "references": [
    {
      "id": "ref:<short slug>",
      "from": "source:...", "to": "event:...",
      "type": "reports_on",
      "date": null,
      "anchor": { "source": "source:...", "quote": "verbatim excerpt" },
      "sources": ["source:..."],
      "verification": "confirmed",
      "note": ""
    }
  ]
}
```

Property value formats (by `type` in templates.json):
- `text`, `markdown`: string. `numeric`: number. `date`: ISO string. `link`: `{"url": "...", "label": "..."}`.
- `daterange`: `{"from": "ISO", "to": "ISO or null"}`.
- `select`: one thesaurus id slug. `multiselect`: array of slugs.
- `geolocation`: `{"lat": number, "lon": number, "label": "..."}`.
- `relationship` properties: do NOT put them in `properties`; express each as an entry in `references` (same
  `type` as the relationship type id). Date-ranged relations (`held_office`, `member_of`, `succeeded`) carry
  `"date": {"from": "...", "to": "... or null"}`.

`evidence`: one entry per property (or group of properties) of the entity that carries a fact, listing the
`source:` ids that support it and the verification status. Every property you fill except `title` needs an
evidence entry. Source entities are their own evidence (their `url`, `publisher`, `published` are the record).

Every `references` row needs `sources` (the source entities that support the link) and `verification`.
References whose `from` is a `source:` entity of type `reports_on`, `supports`, `disputes`, `geolocates` should
carry an `anchor` quote when you have a verbatim one.

Source entities: `template: "source"`, with `publisher`, `publisher_type`, `medium`, `published` (the
publication date shown on the page), `url` (canonical article URL), `language`. Create a source entity for
every URL you cite, in the same file.

Entities and references that another agent will also create (people, organisations, locations of the main story):
check `registry/ids.txt` first. If the id exists, do not redefine the entity; just add references and sources.
If you add facts to an entity another agent defined, put them in an `"entity_additions"` array instead:
`{"id": "...", "properties": {...}, "evidence": [...]}`; the merge step will fold them in.

## Quality bar

- Aim for dense links: every event should have location, actors, responders, and at least one causal link to
  another event; every person a role and an organisation; every source a `reports_on` link with a quote.
- Dated events to the day, hour where reported. Different sources giving different numbers or times: keep both
  as `disputed`, and make a `claim` entity for each version with `supports` / `disputes` references.
- Prefer primary and high-quality secondary sources: Reuters, AP, AFP, BBC, Al Jazeera, The Guardian, NYT,
  The Kathmandu Post, Republica, The Himalayan Times, Onlinekhabar English, Nepali Times, HRW, Amnesty
  International, OHCHR / UN, NHRC Nepal, government of Nepal notices, Supreme Court / commission records,
  fact-checkers (BBC Verify, AFP Fact Check, Reuters Fact Check, Nepal Check). Wikipedia may be used for
  coordinates or to find sources, but cite the underlying source for facts where possible.
- Give a final summary in your reply: counts of entities per template, references per type, and a list of any
  contradictions between sources you found. Do not paste the data into the reply.
