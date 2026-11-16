# Relationships, grouped List: audit and change (2026-10-13)

Checked headless at 1440 on the Relationships tab, every group-by, Detail and Compact, groups
opened with Expand all. Records:

- Sample: Case 11.137 (La Tablada).
- CEJIL: Claudio Grossman.
- Nepal: Police fire on protesters at Parliament and New Baneshwar.
- Vegas: First shots · 22:02:15.

`before/` is playground a7ba7d65 and `after/` is this change, with the same file names
(`<corpus>-<group-by>-<zoom>.png`). `checks/` holds dark, RTL and 390 shots.
`../list/` holds plain List and grouped views on Inter-American Commission (the 48-member hub).

## What repeated (before)

A grouped List drew one row per reference, and the rows repeated what the group header and the
neighbouring rows had already said:

- **The same record, row after row.** A record linked several times got one row per link. Sample,
  Target template › Court Case: 28 rows for 4 cases (Case 10.488 five times). CEJIL, Juez y/o
  Comisionado: each judge twice, once per direction.
- **The group's own key on every row.** Each row printed it again:
  - the template name, or a pill tinted in the template's colour, under Target template;
  - the link type under Relation type;
  - the direction glyph under Direction;
  - the record itself under Target entity.
- **Nothing about the record.** A row was a pill, a type name and a page. It showed no card
  properties, no date, and nothing about what else the record links to. Nepal's rows were "Event"
  thirteen times, with no dates.
- **Hubs not drawn.** List and grouped views drew hub members as unrelated rows. The Tree was the
  only view that showed a hub.

## What changed (after)

- **One row per record inside a group** (`MemberCard` variant `row`, `data-component="RecordRow"`).
  The row holds every reference the group has for that record:
  - **Title line:** type dot, title, status and evidence chip, page or time tags (up to three,
    the rest in a tooltip), direction glyph, pin.
  - **Meta line:** template, the first two card properties (dates and periods included), link types.
  - **Detail only:** each passage with its own page or time tag (up to three, then "Show all
    passages"), and a quiet "Also linked to …" naming up to three records that appear nowhere else
    on the panel.
- **What the group already says is left out of the row.**
  - Target template: the template name.
  - Relation type: the link types.
  - Direction: the glyph.
  - Target entity: the title, the link types and the direction. The header already gives all
    three, so the row keeps the meta and the passages.
  - A sub-group adds its own key to what is left out.
- **Hubs.** A hub (2+ members in the group's references) is one `HubRow` where its first member
  falls. It opens to `HubMemberCard`s at every zoom, and the member cards also leave out the
  group's key. A hub only shows members that survive the filters.
- **Hub pills fold** in every view: over six members, the first five and "+N", with the rest in
  the tooltip. The 48-member hearing hub is now two lines instead of about 700px.
- **Plain List** keeps one row per reference in reading order, with hubs as one row. "Show more"
  still counts the references not yet drawn.
- Unchanged:
  - the group header (two lines, fixed height);
  - the tab count;
  - view, sort and group-by defaults;
  - filtering, which stays in `useFilteredReferences`;
  - the Tree. Its hub code moved to `HubNode.tsx`, with the same output.

## Checked

- Every group-by on Sample, CEJIL, Nepal and Vegas at Detail and Compact. Plain and grouped List
  on Inter-American Commission at all three zooms.
- Dark (CEJIL, template), RTL (Nepal, relation type) and phone 390 (Sample, no horizontal
  overflow: scrollWidth 390).
- axe on the panel body: clean on CEJIL (template; plain List with hubs), and on Nepal in dark at
  Detail and Compact. One pre-existing finding: `EvidenceStatus` drops to 80% opacity on hover,
  and that fails contrast in dark while the pointer is on the chip.

## Left as is

- A hub member that also has links outside the hub in the same group shows twice: once in the
  hub, once as its own row (CEJIL: Goldman's incoming Firmantes are not hub links). This comes
  from the data.
- Under Source page the rows keep their page tags, because the tag is the jump.
- Vegas: a moment's passage line can repeat its title ("First Shots Begin · 22:05:27" under
  "First shots").

## Nepal and Vegas: natural hubs (recommendation for Research, not built)

Neither build writes `hubId`. Three link sets in their data read as n-ary relationships:

- **Vegas, a moment and the recordings that capture it.** There are 733 `captures` links, and
  several recordings capture each volley. One hub per moment would group them, which is what the
  sync analysis already does.
- **Nepal, a claim and its sources.** There are `supports` (418) and `disputes` (249) links. One
  hub per claim, holding the sources on each side, would match the contest model.
- **Nepal, an event and the actors involved.** There are 398 `involved` links: police units,
  officials and groups at one event.

Research would need to add a `hub` key to the seed, and the build scripts would need to pass it
through as `hubId`.
