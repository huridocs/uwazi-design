# Uwazi 2026 — Phase 2: the pilot components

Phase 1 shipped the token layer ([`uwazi-semantic-tokens.css`](./uwazi-semantic-tokens.css),
[`TOKENS-MAPPING.md`](./TOKENS-MAPPING.md)) and validated it against the real
`production` build. Phase 2 proves it — by reskinning a **deliberately chosen set
of six components** end-to-end onto the 2026 language before anyone touches the
net-new work.

Companions: [`COMPONENT-INVENTORY.md`](./COMPONENT-INVENTORY.md) (all 85
components paired + difficulty-rated) and [`PATTERNS.md`](./PATTERNS.md) (the
a11y/motion/style contracts every spec below points back to). This file is the
per-component build sheet: for each pilot component it says *what to change, what
must not change, and how you know it's done*.

## Why these six

The pilot is a **cross-section**, not the easy wins. It spans the difficulty
scale and the surface types so the token layer meets real friction while the
blast radius is still small:

| Pilot | Prototype source | Uwazi counterpart (per inventory) | Rating | Surface type it proves |
|---|---|---|---|---|
| **Pill** | `shared/EntityPill.tsx` | `UI/TemplatePill.tsx` | **S** | Coloured primitive + contrast rule |
| **Card** | `metadata/MetadataCard.tsx` | `Components/MetadataCard.tsx` | **S** | Container shell + typographic rhythm |
| **Table** | `shared/DataTable.tsx` | `UI/DataTable/DataTable.tsx` | **M** | Data density + the clickable-row a11y pattern |
| **Tabs** | `layout/{DrawerTabs,MainTabs}.tsx` | `UI/Tabs/Tabs.tsx` | **M** | Segmented navigation + state-by-bg |
| **Beacon** | `layout/Beacon.tsx` | `UI/Notifications/ThemedBeacon.tsx` | **S** | Motion + live regions (the convergent feature) |
| **Sidepanel** | `shared/FiltersDrawer.tsx` | `UI/Drawer.tsx` | **S→M** | Overlay contract: focus trap, `inert`, RTL |

What the set is engineered to exercise:

- **Every token family.** Pill hits the coloured-tint + `color-mix` path; Card
  and Table hit the paper/warm/border neutrals; Tabs and Beacon hit `vellum`/
  `warm` state backgrounds; Sidepanel hits the scrim + logical borders.
- **Every load-bearing pattern in `PATTERNS.md`.** The clickable-row shell
  (Table §1.1), always-mounted `inert` overlay (Sidepanel §1.2), focus trap +
  Escape (Sidepanel §1.3), the coloured-label contrast rule (Pill §1.6), live
  regions (Beacon §1.7), and the beacon width-morph + reduced-motion (Beacon §2.2/§2.5).
- **Both ends of the difficulty scale.** Three **S** (drop-in reskin — Pill,
  Card, Beacon) prove the tokens against real markup fast; two **M** (Table,
  Tabs) force the first genuine *structural* rework, because the real
  counterparts diverge (tanstack rows, a heavier compound Tabs system). If the
  language survives the M pair, the rest of the M tier is de-risked.
- **Story-covered + convergent.** Five of the six already have a real Storybook
  story (see the inventory), so "does it still work" is a visual diff, not a
  guess. Beacon and the Relationships surface are already named and structured
  the same in `production` — reskinning them costs the least and proves the most.

Explicitly **out** of the pilot: anything **L**-rated (inheritance/rollup UI,
mobile bottom sheet, `DocMeta`, `TemplateStructure`). Those are product
decisions, not style passes — see the inventory's migration order, step 4–5.

## How to read a spec

The prototype component **is** the reference implementation — it already uses the
semantic tokens the Phase-1 layer defines. So each spec is framed as: *here is the
target; here is where the real counterpart currently differs; here is the
invariant you must not break in closing that gap.* Every spec has the same shape:

- **API** — the prop surface to match (or the delta from the real one).
- **Reskin** — the concrete token/class swaps.
- **Keep** — the behaviour/a11y contract that must survive, with the `PATTERNS.md`
  section it comes from.
- **Verify** — the state matrix: light **and** dark, plus empty / loading /
  overflow / RTL as they apply. Screenshot each; don't reason about them.
- **Ship** — the Storybook + catalog obligation.

---

## 1 · Pill — `EntityPill` → `UI/TemplatePill`

**Rating S.** Same dot-plus-tinted-pill shape on both sides. The whole point of
picking it first: the reskin is trivial, but it validates the one colour rule
that's easy to get wrong.

**API**

```ts
EntityPill({ typeId: string; label?: string; size?: "sm" | "md" })
```

`typeId` resolves the type (colour + name) via `getEntityType`; `label` overrides
the resolved name; `size` picks `sm` (px-2 py-0.5 text-xs, 6px dot) or `md`
(px-2.5 py-1 text-sm, 8px dot). The real `TemplatePill` takes the colour/label
already resolved — keep that; don't couple the migrated component to the
prototype's `data/entities` lookup.

**Reskin**

| Part | Value | Notes |
|---|---|---|
| Pill radius | `rounded-md` | 3px via the theme override — not a full pill |
| Background | `${color}20` (12% tint) | inline `style`, the type hue |
| Border | `1px solid ${color}40` | 25% of the hue |
| Dot | `${color}`, `rounded-[2px]`, `ring-1 ring-inset ring-ink/20` | square, true colour, keeps a hairline on pale hues |
| Label colour | **never the raw hue** — see Keep | |
| Fit | `w-fit` (via `inline-flex`), `min-w-0 max-w-full`, label `truncate` | badges never stretch (`PATTERNS.md` §3) |

**Keep** — the contrast rule (`PATTERNS.md` §1.6), verbatim:

```ts
const isPale = luminance(color) > 0.6;
const textColor = isPale
  ? "var(--text-primary)"                                  // pale → ink
  : `color-mix(in srgb, ${color} 70%, var(--text-primary))`; // saturated → 70% toward ink
```

The dot keeps the true colour; the **label** is mixed toward `--text-primary` so
small text clears 4.5:1 on the 12% tint (violet `#8B5CF6` alone fails). The
inventory notes the real repo handles contrast "via a theme util instead of
inline luminance calc" — either implementation is fine **as long as the mix
target is `--text-primary`**, because that's what makes it theme-aware. A
hardcoded mix target needs a `dark:` branch and will drift (`PATTERNS.md` §3,
"Dark mode is automatic"). Do **not** write a hex fallback inside `color-mix()`
— it invalidates the whole declaration and the pill renders unstyled.

The missing/unknown state italicises and reads "Unknown entity" — keep it; it's
the empty state.

**Verify** — light + dark × { pale hue (lime/yellow), saturated hue (violet),
missing type, a very long label that must truncate, `sm` and `md` }. Confirm the
label mix darkens in light and lightens in dark from the *same* expression.

**Ship** — story stays generic (`Default`, `AllColors`, `Missing`,
`Truncated`) — never a domain name. A11y addon must be clean at every colour.

---

## 2 · Card — `MetadataCard` → `Components/MetadataCard`

**Rating S.** "Near-identical wrapper div/className shape" (inventory). This is the
container-rhythm baseline every other card inherits — get the tokens right here
once.

**API**

```ts
MetadataCard({ title: string; icon?: ReactNode; children: ReactNode; className?: string })
// plus the field primitives it hosts:
Property({ label?: string; value: string; linked?: boolean; truncate?: boolean; ltr?: boolean })
PropertyRow({ children })  // horizontal group, gap-6, items-start
```

**Reskin**

| Element | Class | Token |
|---|---|---|
| Shell | `bg-paper border border-border/40 rounded-md overflow-hidden` | surface + soft border |
| Header pad | `px-4 py-3`, `flex flex-col gap-2` | |
| Title | `text-sm font-bold text-ink leading-tight` | primary text |
| Field label | `text-xs text-ink-tertiary leading-relaxed` | tertiary |
| Field value | `text-sm font-medium text-ink leading-relaxed` | primary |
| Linked value | `underline decoration-solid` | link affordance is the underline, **not** colour |

No thick left border, no accent stripe (`PATTERNS.md` §3). The card carries state
by `bg-parchment` if it's ever selectable — never a second colour.

**Keep** — two overflow guards that shipped as real bugs:

- `Property` `truncate` clips to one line with the full value on `title` hover. A
  filename (`Velasquez-Rodriguez_v_Honduras_Judgment_1988.pdf`) ran straight out
  of the card on a phone; the clip is load-bearing.
- `Property` `ltr` pins filenames/sizes/dates left-to-right so Arabic bidi
  doesn't reorder "948 KB" → "KB 948". Uwazi ships RTL — keep the `dir="ltr"`
  isolation on numeric/technical values.

**Verify** — light + dark × { with icon / without, one child / many, a value that
overflows (truncate on and off), the same card under `dir="rtl"` with a filename
value }. Confirm the soft border reads in both themes and doesn't vanish on dark.

**Ship** — story `Default`, `WithIcon`, `Truncated`, `RTLValues`. Register the
`Property`/`PropertyRow` primitives in the catalog beside the card.

---

## 3 · Table — `DataTable` → `UI/DataTable/DataTable`

**Rating M.** Same visual language, **different engine**: the real one is
tanstack-table + dnd-kit and — critically — "no stretched-primary-action-button
row pattern" (inventory). This is the first pilot that forces real rework, and the
rework is an **a11y** one, not a paint job.

**API** (declarative column model — keep it; it's what makes the table reusable
across Files + every Settings list)

```ts
Column<T>  = { id; header; cell(row,i); width?; align?; sortKey? }
DataTable<T>({
  columns; data; getRowId;
  onRowClick?; isRowSelected?; rowAriaLabel?;
  emptyState?; footer?; minWidthRem?;
  rowProps?;                       // per-row attrs — backs drag-to-reorder
  sort?: { key; dir }; onSort?;    // controlled; consumer sorts its own data
})
```

**Reskin** — this is the app's canonical table (the entity-view Files style made
generic):

| Zone | Spec |
|---|---|
| Shell | `rounded-md bg-paper`, `boxShadow: 0 1px 3px …/0 1px 2px …` (the card shadow) |
| Header | `h-10`, `bg-warm`, `text-[11px] font-semibold text-ink-tertiary uppercase tracking-wider`, `border-bottom: 1px solid var(--border-primary)` |
| Row | `min-h-11 py-2`, `hover:bg-warm`, selected `bg-parchment`, `border-bottom: 1px solid var(--border-primary)` |
| Footer | `h-10`, `bg-warm`, `text-xs text-ink-muted`, top border |
| Overflow | `minWidthRem` set ⇒ `overflow-x-auto` + `min-width`; unset ⇒ `overflow-hidden` (columns always fit) |
| Layout | CSS grid per row (`gridTemplateColumns` from `column.width`), **not** `<table>` — matches the prototype's grid-table convention |

**Keep** — the clickable-row shell (`PATTERNS.md` §1.1). The real tanstack rows
put the interaction on the row element; the 2026 rule is the opposite and it's
non-negotiable:

- The row `<div>` is `role="row"` with a plain mouse `onClick` — **never**
  `role="button"` on a row that contains cells' own controls.
- The primary action is a **stretched invisible `<button>`** (`absolute inset-0`,
  `aria-pressed={selected}`, `rowAriaLabel`, native Enter/Space) rendered inside
  an absolutely-positioned `role="cell"` so ARIA row→cell nesting stays valid
  without consuming a grid track.
- Data cells are `relative` so their controls sit above the stretched button and
  stay clickable; cell clicks bubble to the row's `onClick`.
- Sortable headers are `<button>`s with `aria-sort`; the inactive sort glyph is
  `opacity-0 group-hover/sort:opacity-50` — a hover reveal, so it needs no focus
  pair only because the whole header is already the button.

Keep `rowProps` as the drag-to-reorder seam (row = drop target, a grip cell = the
handle) so dnd-kit can attach without the table knowing about it.

**Verify** — light + dark × { **empty** (the `emptyState` slot, centered muted
text), populated, a row `hover`, a `selected` row (`bg-parchment`, no inset
accent), sortable header active asc/desc/none, `minWidthRem` set so it scrolls
horizontally on a narrow pane, keyboard: Tab to a row → focus ring frames the
whole row → Enter fires `onRowClick` }. The empty and overflow states are the two
most likely to regress — screenshot both.

**Ship** — the inventory flags there's **no dedicated story** for `DataTable` on
the real side (only `Table.stories.tsx` covers the sibling `Table.tsx`). Adding
one — `Default`, `Empty`, `Sortable`, `Selectable`, `Scrolls`, `Reorderable` —
is part of this pilot's deliverable, not optional.

---

## 4 · Tabs — `DrawerTabs` / `MainTabs` → `UI/Tabs/Tabs`

**Rating M.** The real `UI/Tabs` is "a full compound tab-panel system"; the
prototype's is a **lighter pill-with-count strip** (inventory). Don't rebuild the
prototype's lightness into the compound system — extract the strip as the
reskinned surface and let it drive the existing panels.

**API** — two flavours share one visual grammar:

```ts
DrawerTabs({ tabs: {id,label,count?}[]; activeId; onChange; className? })
MainTabs({ tabs: {id,label,count?,sparkle?}[]; activeId; onChange;
           languages?; availableLanguages?; activeLanguage?; onLanguageChange?; onBack? })
```

`MainTabs` = `DrawerTabs` + a back button (mobile) + a language `Select` on the
right + an optional `sparkle` marker (pending AI suggestions).

**Reskin** — the segmented strip:

| Element | Spec |
|---|---|
| Strip | `flex rounded-md overflow-hidden w-fit`, `border: 1px solid var(--border-primary)` (MainTabs adds `boxShadow: 0 1px 2px …`) |
| Divider | a `w-px self-stretch bg-border` between tabs (not per-tab borders) |
| Tab | `px-3 py-1.5 text-[13px] font-medium` |
| **Active** | `bg-vellum text-ink` | state is the **background**, per `PATTERNS.md` §3 |
| Inactive | `bg-paper text-ink-tertiary hover:text-ink-secondary` |
| Count | `text-xs font-semibold text-ink-tertiary bg-warm px-1 rounded`, **`shrink-0`** |
| Overflow | wrapper `overflow-x-auto no-scrollbar` so a long strip scrolls, not wraps |

Active state is signalled by `bg-vellum` alone — no underline bar, no border
accent, same text weight. That's the house style; resist adding an indicator.

**Keep**

- `role="tablist"` on the strip, `role="tab"` + `aria-selected` on each button.
  If you wire these to the real compound `Tabs`' panels, the panels get
  `role="tabpanel"` + `aria-labelledby` — that's the value the compound system
  already provides; use it.
- Counts hide on mobile in `MainTabs` (`!isMobile`) because the panel's info row
  repeats them and their width pushes later tabs off-screen. Keep that rule.
- The language switcher is the shared `Select` (codes, not a pill per language) —
  one language control everywhere. Don't regrow the four-pill row.

**Verify** — light + dark × { 2 tabs / many tabs that must scroll, a tab with a
count, a tab with `sparkle`, active vs inactive, mobile width (counts gone,
back button shown), `dir="rtl"` — the strip and dividers must mirror }.

**Ship** — stories `Default`, `WithCounts`, `Overflowing`, `Mobile`. If the strip
is extracted as a new surface over the compound `Tabs`, it earns a `CatalogEntry`.

---

## 5 · Beacon — `Beacon` → `UI/Notifications/ThemedBeacon`

**Rating S**, and the highest-leverage pick: the inventory calls this "strong
naming/structural convergence — real Beacon already does hover-expand pill, task
% progress, severity-tinted mark, flash." The reskin is nearly free; what the
pilot really validates here is **motion + live regions** surviving the token swap.

**Behaviour** (don't re-derive — it's a small state machine):

- One morphing pill = idle mark → live-task rail (label + `%`) → transient flash,
  by animating **`width`**, not mounting/unmounting.
- The mark is always the `UwaziLoader`, coloured by the most pressing state and
  animated **only while a task runs**. Colour ladder: `seal` (unread error) →
  `warning` (unread warning) → `carbon` (info / processing) → `default`/ink (idle
  or only-a-success-left).
- Click opens the `NotificationsDrawer` (the history log). The pill is the
  indicator; the drawer is the log.

**Reskin** — the pill chrome:

| State | Class |
|---|---|
| Rest | `rounded-md bg-warm` |
| Drawer open | `bg-vellum` |
| Button interior | `h-7 px-2.5 hover:bg-parchment` |
| Flash/rail text | `text-[12px] font-medium text-ink`, `%` in `text-ink-tertiary tabular-nums` |

It's a borderless warm button — **not** a bordered pill, circle, or bell
(`CLAUDE.md`). The mark is the Uwazi loader, never a bell icon.

**Keep** — the motion contract (`PATTERNS.md` §2.2) and the live region (§1.7):

```tsx
// width is inline (computed); easing is the .beacon-spring class — split so the
// same curve drives box-shadow in the same transition.
style={{ width, transitionProperty: "width, box-shadow", transitionDuration: "0.42s" }}
// clip wrapper keeps rail content rounded through the morph:
<div className="overflow-hidden" style={{ borderRadius: "inherit" }}>…</div>
// attention pop when unread rises — scale 1.055, not 1.1 (jitter at navbar size):
className={pop ? "animate-beacon-pop" : ""}
```

- The visually-hidden `aria-live="polite"` region speaks flashes/new arrivals;
  the pill is purely visual, so the region is the *only* thing a screen reader
  gets. Don't drop it.
- Every beacon animation must appear in a `prefers-reduced-motion` block
  (`PATTERNS.md` §2.5): `.beacon-spring` collapses to `0.001ms` (so
  `transitionend` still fires), the `animate-*` classes go to `none`.
- Mobile stays collapsed (tap → drawer); only desktop expands on hover.

Migrate the `NotificationsDrawer` alongside — inventory rates it **S** too, same
convergence, and the two are one feature. Its only real gaps vs `production` are
the unread-filter pill and the per-card Retry action.

**Verify** — light + dark × { idle (mark only), a running task (rail + `%`,
animated), a flash message (17rem width), unread-but-idle on hover (top item +
`+N`), the pop on a new arrival, `prefers-reduced-motion: reduce` (no morph, no
pop, `%` text still updates), mobile (collapsed, no hover expand), RTL (`dir="ltr"`
stays on the pill so the `%`/label don't reorder) }.

**Ship** — real `Beacon.stories.tsx` exists; extend it for the flash and
reduced-motion states if they're not already covered. Keep story names generic.

---

## 6 · Sidepanel — `FiltersDrawer` → `UI/Drawer`

**Rating S→M.** `FiltersDrawer` itself is **S** ("same header/close/footer shape,
built on the shared Drawer"), but it's the pilot's job to prove the **overlay
contract** the whole app's drawers depend on — so treat the underlying `Drawer`
primitive as the real target and hold it to the full set of §1.2/§1.3 rules.

**API**

```ts
FiltersDrawer({ open; onClose; title?; children; footer?; width? })
```

Scoped to its `relative` parent (`absolute inset-0`), **not** `fixed` — the drawer
covers its pane, not the viewport. Keep that; it's what lets a drawer live inside
a split pane.

**Reskin**

| Element | Spec |
|---|---|
| Scrim | `absolute inset-0 z-30`, `rgba(38,30,20,0.18)`, `transition-opacity`, flips `pointer-events` with `open` |
| Panel | `absolute top-0 bottom-0 z-40 bg-paper shadow-lg`, `width: min(100%, ${width/16}rem)` |
| Slide | `transition-transform` + `translate-x-full` ↔ `translate-x-0` (transform, **not** `display`, so it animates) |
| Header | `px-4 py-2.5`, `text-xs font-semibold text-ink-secondary`, close `X` (14px) |
| Border | `borderInlineStart: 1px solid var(--border-primary)` — **logical**, not `left`/`right` |

**Keep** — three overlay rules, each a real bug fixed (`PATTERNS.md` §1.2/§1.3):

- **RTL from the inline end.** The panel is `right-0` LTR / `left-0` RTL, slides
  from the inline end, and its border is `borderInlineStart`. Uwazi ships Arabic
  — never hardcode `right`.
- **`inert` while closed.** The drawer stays mounted (translated off-pane); mark
  it `inert` so Tab can't focus its controls. Without it, focusing a hidden child
  force-scrolls the `overflow-hidden` pane and parks the "closed" drawer over the
  content — looks like a render bug, is a focus bug.

  ```tsx
  useEffect(() => { trapRef.current?.toggleAttribute("inert", !open); }, [open, trapRef]);
  ```

- **Focus trap + Escape + restore.** `useFocusTrap` on the **panel** (not the
  scrim); a `keydown` Escape closes; on deactivate focus returns to the trigger.
  `role="dialog"` + `aria-modal="true"` + `aria-label={title}`.

The real `UI/Drawer` is a side panel already; the delta is confirming it carries
*all three* of these, not just the slide animation. `ReferencePanel` /
`RelationshipsDrawerSection` compose this same shell across more files
(inventory) — once the primitive is right, those follow.

**Verify** — light + dark × { open, closed (confirm `inert` — Tab from the page
skips every drawer control), Escape closes and focus returns to the trigger,
`dir="rtl"` (slides from the left, border on the right edge), a long scrolling
body with a sticky footer, `width` at `min(100%, …)` on a narrow pane (full-width,
no overflow) }. The closed-state focus check is the one people skip — do it.

**Ship** — the inventory notes `FiltersDrawer` has only a partial story (via a
Relationships wrapper). A direct `Drawer`/`FiltersDrawer` story — `Open`,
`WithFooter`, `RTL`, `Scrolling` — is part of this deliverable.

---

## Pilot exit criteria

The pilot is done — and Phase 3 (the rest of the **S**/**M** tiers) is unblocked —
when, for all six:

- [ ] Rendered from the semantic token layer only — grep clean for hardcoded hex
      and for hex fallbacks in `var()`/`color-mix()` (`PATTERNS.md` §3).
- [ ] Verified in **light and dark** by screenshot, plus each component's own
      empty / loading / overflow / RTL states from its Verify matrix.
- [ ] Its `PATTERNS.md` contract survives the reskin: row shell (Table), overlay
      `inert`+trap (Sidepanel), contrast mix (Pill), live region + reduced-motion
      (Beacon).
- [ ] Storybook a11y addon clean; a **dedicated** story exists (net-new for
      `DataTable` and a direct `Drawer` story at minimum).
- [ ] Story/export names stay generic — domain strings are demo *data* only
      (`CLAUDE.md`, Storybook rule).

What passing proves, in order of value: the token layer holds against a coloured
primitive, a container, a dense data grid, segmented nav, a motion-heavy live
surface, and a focus-trapped overlay — i.e. one of *each* thing the remaining 79
components are made of. Clear the pilot and the rest is repetition, not discovery.

## Reference

- Prototype sources: `app/src/components/{shared,metadata,layout}/` (the six files
  named above), `CLAUDE.md`.
- Real repo: `huridocs/uwazi`, branch `production` — counterparts under
  `app/react/V2/Components/` and `Routes/Entity/`; stories under
  `app/react/stories/`. Pairings + ratings: [`COMPONENT-INVENTORY.md`](./COMPONENT-INVENTORY.md).
- Contracts every spec points to: [`PATTERNS.md`](./PATTERNS.md).
- Token swaps: [`TOKENS-MAPPING.md`](./TOKENS-MAPPING.md) +
  [`uwazi-semantic-tokens.css`](./uwazi-semantic-tokens.css).
