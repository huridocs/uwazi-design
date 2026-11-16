# v5: tree as the default Relationships view (audit)

Date: 2026-09-29. Design lane. Audit only; no code changed.

Sources read: `v4/prototype/` (app.js, proto.css, tokens.css, index.html), served on :1447 and
checked headless at 1440×900 (CEJIL Blake light, Sample La Tablada dark) and 390×844 (Sample
light). App: `components/relationships/RelationshipsPanelBody.tsx`, `RelationshipsTreeView.tsx`,
`TreeBranch.tsx`, `rows/AggregateRow.tsx`, `atoms/filters.ts`, `utils/connectionGrouping.ts`, and
`../now-judge-tree.jpg`.

Note on names: the brief says `relViewAtom`. The app has no atom by that name; the switch is
`viewAtom` (`list | tree | graph`) in `atoms/filters.ts`, default `"list"`. There is also an unused
`relationshipsViewModeAtom` (`tree | graph`, default `"tree"`) that nothing reads.

---

## 1. The app's tree view: what works and what does not for quick discovery

Reference screen: `now-judge-tree.jpg` (Rafael Nieto Navia, Juez y/o Comisionado, 31 references).

### Works

- **Grouped by relationship type out of the box** (`DEFAULT_GROUP_BY = "relation-type"`). The
  first thing on screen is "Firmantes 21", which answers "what is this entity connected through".
- **Leaves are relationships, not references.** `deriveRelationships` folds references to the same
  (target, type) into one row, so the tree lists each connected entity once per type.
- **Connector lines** (`TreeNode`) show hierarchy without cards or borders. They use
  `--border-soft` and mirror under RTL. This is the calmest structure in either surface.
- **Hubs render as a peer row** with all member pills, so a multi-party relationship reads as one
  thing.
- **Evidence expands in place.** An aggregate with anchored references opens to those references,
  and a jump from the minimap auto-expands the branch holding it (`useAutoExpandOnRefJump`).
- **Label suppression.** When the branch keys on relationship type, rows drop the repeated label
  (`hideRelLabel`), and the same for entity and template.
- **Render cap** (`TREE_CAP = 80`, top by evidence) keeps a País with hundreds of links cheap.

### Does not work

1. **Stops at one hop.** A leaf can open only into its own evidence. Discovery needs "who is
   connected to *that*", and the tree has no way to ask it. The user has to open the slide-over or
   navigate away. This is the main gap; v4's "See connections" trail exists because of it.
2. **Every leaf repeats its template as an uppercase kicker** ("JUEZ Y/O COMISIONADO" 12 times in
   21 rows). It is the loudest text on the row and carries the least information. The long
   "Resolución de la CorteIDH" titles then run the full pane width.
3. **Mixed templates are interleaved in data order.** Judges, Resoluciones and Sentencias alternate
   in "Firmantes". Nothing sorts or sub-groups them unless the user finds "Then by" in the Display
   menu.
4. **Branch count and tab count disagree.** The branch says 21 (relationships + hubs), the tab says
   31 (references). Side by side they read as an error.
5. **The evidence badge (link icon + 1) shows on every CEJIL row** although no CEJIL reference is
   anchored, so there is nothing behind it (the chevron is correctly withheld, the badge is not).
6. **"HUB" and "4 parties"** are internal words. The v4 prototype's "Listed together with" is
   clearer.
7. **Direction glyphs are 10px arrows after the title.** At this size incoming, outgoing and both
   are hard to tell apart, and for field-owned relationships the direction is already implied by
   the branch ("Firmantes" on a judge means "listed as Firmante in").
8. **The whole tree sits on `bg-warm`** while the list view sits on paper. Switching views changes
   the pane ground.
9. **The cap message says "switch to List view to see all"** instead of offering "Show N more" in
   place.
10. `viewAtom` defaults to `list` on main, so most people never see the tree.

---

## 2. Proposal: the tree as the prototype's default

### 2.1 Structure

Root is the focused entity (`S.page`). It is not drawn as a node; the DocMeta above already
names it.

| Level | What it is | Source in app.js |
|---|---|---|
| 1 | One branch per connection group: relationship field of this template, "Listed as X in", derived group ("Jueces firmantes"), "Listed together with", "Without a relationship type" | `connectionsOf(x)` groups, same order (`order`) |
| 1a (auto) | Template sub-branch, only when a level-1 group has more than 12 rows **and** more than one template | new, from `tplName(r.ent)` |
| 2 | One row per connected entity | group `rows` |
| 3 | Inline expansion of a level-2 row: that entity's own groups, each as one compact line (group name, up to 3 entity names, "+N") | `peekHtml(i)` logic, excluding the root |

Depth stops at 3. A level-3 entity name opens the preview (slide-over); following it further is an
Advanced action (§3). This keeps the indent at two steps (≤ 2.5rem on desktop, ≤ 2rem on phones)
and never builds an unbounded tree.

Why group by relationship field and not by template: the field is how the template author defined
the meaning ("Victims", "Respondent State"), and it is the key both the app tree and v4
Connections already use, so the two views agree. The auto template sub-branch fixes the
Nieto Navia case (21 mixed rows under "Firmantes") without adding a control.

Defaults for open/closed: every level-1 branch open, except groups over 200 rows (v4 already does
this). Level-2 rows closed. Show 5 rows per branch, then "Show N more" in place (v4's `S.shown`
rule; replaces the app's "switch to List view").

### 2.2 Row anatomy (level 2)

```
[›] ■ Title of the entity ····························· Person · 12
     ↳ via Blake. Sentencia de 2 de julio de 1996 +1        (derived rows only)
```

- `[›]` expand chevron, a real `<button aria-expanded>` with accessible name "Show the
  connections of <Title>". Hidden (space kept) when the entity has no connection other than the
  root, so titles stay aligned.
- `■` template dot, `rounded-[2px]`, the template colour. This is the only colour on the row.
- **Title** in `--text-primary`, a button that opens the preview (slide-over). No pill: pills in a
  tree of 20 rows are the same noise as the app's kicker, and a plain title avoids the dark-mode
  label contrast problem entirely.
- **Trailing meta** in `--text-tertiary`, `tabular-nums`: template name (omitted when the branch or
  sub-branch is already one template) and the entity's connection count. Plural rule fixed: "1
  connection" (v4 prints "1 connections").
- **Listed rows** ("Listed as Firmantes in"): meta reads the field label only when it differs from
  the branch, plus "with N others".
- **Passages** (Sample only): a page tag `p.14` after the title, same as the app's `PageTag`. It
  jumps to the passage in the document pane and does not switch mode.
- **Restricted**: the lock glyph stays after the title for admins; as a guest the row is gone
  (`hidden()` already handles it).
- No "See connections ›" button on the row. The chevron replaces it for discovery; following
  moves into Advanced (§3).
- Height 2rem, one line on desktop. Selected row (preview open for it) takes `--bg-primary`
  (parchment). Hover takes `--bg-warm`.

Level-1 branch header: chevron, name in `--text-primary` medium, the via line ("field of Causa",
"derived · CorteIDH → Firmantes") in `--text-tertiary`, count at the trailing end. The count is
connected entities, the same unit as the tab count (`connectedCount`), so they add up.

Level-3 line: group name in `--text-tertiary`, then up to 3 entity titles as small ink text
buttons separated by commas, then "+N". No pills.

Hubs ("Listed together with"): one level-2 row whose title slot holds the member names, first 4,
then "+N". Each name opens its own preview.

### 2.3 Ground, lines and colour (light and dark)

- No cards. Rows sit directly on the pane ground (`--bg-surface`, paper), same as Advanced's list
  body so the pane does not change colour when the switch flips. The app's `bg-warm` tree ground
  is not carried over.
- Connectors: v4 has none. Port the app's `TreeNode` geometry: 1px `--border-soft` vertical and
  stub, L-corner on the last child, logical properties so RTL mirrors.
- Every colour comes from `tokens.css` vars with no fallback. The dot is the only raw template
  colour; no text is drawn in a template colour, so `--label-mix` is not needed in the tree.
- Dark mode check list for Code: connector lines visible on `--bg-surface` dark, selected
  parchment row readable, tertiary meta at 11px meets contrast.

Also fix in v4 while here: `.lens` and `.seg` pressed state use `--bg-muted` (vellum). The rule is
`bg-parchment` (`--bg-primary`) for selected.

### 2.4 Empty, loading, overflow

- Zero connections: v4's empty block ("No connections yet" + Add relationship) is reused as is.
- Search with no match: "No connection matches" + Clear, as v4.
- Very large entity (Guatemala, 511): level-1 branch shows 5 rows + "Show 25 more"; expanding
  Guatemala from a Causa shows its level-3 summary lines, never its 511 rows.
- Long titles truncate with ellipsis on one line; the full title is in `title` and the preview.

### 2.5 Phone (<768)

- Tree is the phone default too; it suits a single column better than the four lenses.
- Row wraps to two lines: title on the first, meta on the second (v4's existing phone rule for
  `.row`). Indent per level 1rem.
- Chevron hit area 2.75rem square even though the glyph is 12px.
- Preview opens as a bottom sheet, as elsewhere.
- Current v4 phone defects seen at 390px, to fix in the same pass: the lens strip overflows ("When"
  is off-screen), the nav clips "Viewing as admin", and the trail hint runs past the edge.

---

## 3. The Advanced switch

### 3.1 Placement

In the toolbar row (`.toolbar.lensrow`), at the trailing end, after Filters: a labelled switch
"Advanced" (`role="switch"`, `aria-checked`). It is text plus a small track, not an icon, because
the four lenses behind it are a different way of working and should be named.

| Mode | Toolbar row content |
|---|---|
| Tree (default) | Search · Filters · [Advanced ○] |
| Advanced | Connections / Paths / In the document / When · (lens controls as v4: Search, List/Map, Filters) · [Advanced ●] |

The row keeps its height in both modes; only its contents change. The trail row under the toolbar
is Advanced-only and is mounted at a fixed height in both modes (empty in Tree) so the body does not
move when switching. On phones the toolbar row holds Search (icon), Filters and the switch; in
Advanced a second fixed row holds the lens strip, which scrolls horizontally.

Why not a fifth lens ("Tree" next to Connections): Juan's brief says the four lenses move behind a
switch. A peer tab would make the tree one option among five instead of the default.

Why not the footer next to Edit: the footer is for acting on the data; this changes how you look
at it, which is the toolbar's job.

### 3.2 State that carries across

| State | Tree → Advanced | Advanced → Tree |
|---|---|---|
| Focused entity `S.page` | same | same |
| Search `S.q` | carried; same matching (title fold) | carried |
| Connection facets (`S.fc`, template and kind) | carried; the tree uses `filteredGroups`, so the Filters panel is shared | carried |
| Preview `S.overlay` | stays open | stays open |
| Expanded rows (new `S.tx`, a set of entity ids) | kept, not shown | restored |
| Trail `S.trail` | set from the action used (below) | kept for the next visit; the tree expands `trail[0]` inline and scrolls to it |
| Lens | last lens used in Advanced this session; first time: `lensFor(S.page)` | kept |
| Paths To / pin, When years, document page range | kept | kept |
| Edit mode | carried (see below) | carried |

The switch itself holds for the session: URL param `adv=1`, mirrored in `sessionStorage`, same as
the explicit lens choice today (`S.userLens`).

### 3.3 Links from the tree into Advanced

These are the only ways the tree hands off. Each sets Advanced state and flips the switch on.

1. **Follow** (level-2 row, hover/focus action "Follow ›"): Advanced › Connections with
   `S.trail = [row entity]`. Replaces v4's per-row "See connections".
2. **How is this connected** (level-3 name, in its preview's "How this connects" block, which v4
   already renders): "Show all routes" → Advanced › Paths with From = root, To = that entity,
   pin = the level-2 entity it was reached through.
3. **Page tag** `p.N`: stays in the tree and jumps the document pane. "All passages" link in the
   branch header of a branch with passages → Advanced › In the document filtered to that
   relationship type.
4. **When**: no row entry point. Reached through the switch only.

### 3.4 Edit in the tree

Edit works in the tree at level 2 only, with v4's row actions (Remove on field rows, "Edit in
<template>" on listed rows, "+ Add to <field>" on field branch headers). Level-3 lines are read-only;
editing another entity's relationships means opening it. Paths stays read-only as in v4.

---

## 4. Change list (one Code dispatch each, in order)

All in `dev/results/relationships-redesign/v4/prototype/` copied to a new `v5/prototype/`, so v4
stays as the reference.

1. **Copy v4 to v5 and add the mode flag.** New `S.adv` (from `adv=1`, sessionStorage fallback),
   `S.tx` (expanded set). `render()` branches on `S.adv`; Advanced renders exactly today's v4 body.
   Tree renders a placeholder. Acceptance: `?adv=1` is pixel-identical to v4.
2. **Toolbar row with the Advanced switch.** Tree content (Search, Filters, switch) and Advanced
   content (lens strip + v4 controls + switch) in one fixed-height row. Trail row mounted at fixed
   height in both modes. `role="switch"`, keyboard, visible focus ring.
3. **Tree levels 1 and 2.** `treeHtml(x)` from `filteredGroups`: branch headers (name, via, count =
   connected entities), rows per §2.2 with dot + title button + trailing meta, "Show N more", >200
   collapsed. No cards. Fix "1 connections".
4. **Connectors.** Port `TreeNode` geometry to CSS in `proto.css` (`.tnode::before/::after`,
   `--border-soft`, logical properties, L-corner on last child). Check RTL.
5. **Level-3 inline expansion.** Chevron toggles `S.tx`; renders the child's groups as compact
   lines (reuse `peekHtml` logic, exclude root, 3 names + "+N"). Chevron hidden when there is
   nothing beyond the root.
6. **Auto template sub-branch.** Inside a level-1 group with >12 rows and >1 template, sub-branch by
   template (largest first), with the template dropped from row meta. Test on CEJIL Rafael Nieto
   Navia (`?e=` his sid) and Blake.
7. **Hand-offs into Advanced.** "Follow ›" row action → Connections with trail; "Show all routes" in
   the preview's "How this connects" block → Paths with From/To/pin; branch "All passages" →
   In the document with the relationship-type facet set. Page tag jumps the document pane in place.
8. **State carry-over.** Search, facets, overlay, lens memory, trail ↔ expansion per §3.2.
   Advanced → Tree with a trail expands `trail[0]` and scrolls it into view.
9. **Edit in the tree.** Level-2 Remove / Edit in / Add to, reusing `removeRow`, `editat`,
   `addfield`. Level-3 read-only.
10. **Phone pass.** Two-line rows, 1rem indent, 2.75rem chevron target, lens strip on its own
    scrolling row in Advanced, fix the three 390px overflows (lens strip, nav, trail hint).
11. **Selected-state token fix.** `.lens` / `.seg` pressed and tree selected row use `--bg-primary`
    (parchment), not `--bg-muted`.
12. **Screenshots.** Light and dark at 1440×900 and 390×844 for: CEJIL Blake tree, Nieto Navia tree
    (sub-branches), Sample La Tablada tree with one row expanded, Sample guest, zero-connection
    entity, Guatemala expanded from a Causa, and one hand-off into each Advanced lens. Headless, not
    Juan's Chrome window. Name `v5/t*-…-{light,dark}.png`.

For the app later (not part of this batch): if the prototype tree is accepted, the app's
`RelationshipsTreeView` needs items 3–6 in React, `viewAtom` default `tree`, the unused
`relationshipsViewModeAtom` removed, and the branch count moved to the tab's unit or the tab count
to the branch's unit (§1, point 4).
