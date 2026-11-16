# Relationships hub rows: audit (2026-10-13, playground 96f965ec)

Hubs are refs that share a `hubId` and have two or more distinct members (`deriveHubs`).
I checked them headless at 1440 in light mode, on the Relationships tab, in List and Tree at
Detail, Compact and Overview. Screenshots are the `before-*` files in this folder.

## Where hubs exist

| Collection | Hubs with 2+ members | Records checked |
|---|---|---|
| Sample | e3 has 3 (two anchored, one v4 entity-level); every v4 hub (`sampleSeedV4.ts`) is entity-level | Case 11.137 (La Tablada), Inter-American Commission |
| CEJIL | 1,073 records hold at least one; none is anchored | Claudio Grossman (hubs of 5 and 2) |
| Nepal | none: the build writes no `hubId` | – |
| Vegas | none: the build writes no `hubId` | – |

## Where hubs draw as hubs

- **Tree view only.** List view, with or without Group by, renders no `HubRow`. Hub members
  come out as ordinary reference rows (List) or aggregate rows (grouped), and nothing marks
  that they belong together. On Nepal and Vegas there is no hub to see.
- In Tree, hubs come first in each branch and are drawn by `HubNode` → `HubRow`.

## Collapsed row, per zoom

| Zoom | Shows | Height |
|---|---|---|
| Detail | every member pill (wrapping), `HUB`, link badge with the reference count, caption "<relation> · N parties" | 65 px; 727 px for the Commission's 48-member hearing hub |
| Compact | the same without the caption | 41 px; 703 px for the 48-member hub |
| Overview | first 3 pills, "+N", the count badge, one line | 37 px |

## Expanded row

- **A hub can expand only if at least one of its refs is anchored to text**
  (`HubNode`: `evidence.length > 0`). No CEJIL hub and no Sample v4 hub has a chevron, so
  in practice almost no hub can be opened.
- When it does open, it lists nested `ReferenceRow`s for the anchored refs only. A member
  without an anchor is left out: La Tablada's hearing hub has three members, and Inter-American
  Commission does not appear.
- What the expansion shows, against what the collapsed row already said:

  | Zoom | Expanded line | Already in the collapsed row |
  |---|---|---|
  | Detail | the quote, p.4 | – (the quote is new) |
  | Compact | member pill, "Relates To", p.4 | pill and relation label are repeated |
  | Overview | member pill, p.4 | pill is repeated |

  At Compact and Overview the expansion repeats the pills and the relation label, and the only
  new item is the page tag. That matches Juan's "seeing the same thing all across".
- The expanded rows never say what a member is: no template, no card properties, no date. They
  also do not show the member's status, period or evidence, or any other links it has.

## What the expansion should add

For each member, a compact card:

- template and title;
- the card properties its template marks `showInCard`;
- its own link to the hub: direction, status and period chip with the evidence card, page or
  time tag, and the quote at Detail;
- the records it links to outside this hub.

Every hub expands, anchored or not.
