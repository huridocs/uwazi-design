# Uwazi 2026 — interaction patterns: a11y, motion, style

For devs migrating `huridocs/uwazi` (branch `production`) onto the 2026 prototype's
design language. Companion files: [`TOKENS-MAPPING.md`](./TOKENS-MAPPING.md) (the
colour/token layer) and [`uwazi-semantic-tokens.css`](./uwazi-semantic-tokens.css).

Tokens tell you *which colour*. This file tells you *how the component behaves* —
the patterns that came out of the July 2026 a11y audit and the motion work, both
of which cost more to rediscover than to copy. Every rule below is load-bearing:
each one fixes a real bug that shipped in the prototype first.

Sources of truth in this repo: `app/src/index.css` (keyframes), `app/src/hooks/`,
`app/src/components/shared/`, `CLAUDE.md`.

---

## Part 1 — Accessibility (non-negotiable)

### 1.1 Clickable rows are never `role="button"`

Rows and cards host nested controls (checkboxes, chevrons, page tags, delete
buttons). An interactive ancestor wrapping interactive children is invalid for
assistive tech, and `role="button"` on the container swallows the children.

**The pattern**: the container is a plain `<div>` with an `onClick` (mouse path
only). The keyboard/AT path is a **stretched invisible primary-action button**
rendered as the first child. Content sits above it in a `relative` wrapper so
nested controls stay clickable.

```tsx
// ListCardRow.tsx — copy this shape for any new clickable row
<div ref={ref} onClick={onClick} className={`relative ${baseClasses} ${selected ? "bg-parchment" : ""}`}>
  <button
    type="button"
    aria-pressed={selected}
    aria-label={ariaLabel ?? "Open row"}
    onClick={(e) => { e.stopPropagation(); onClick(); }}
    onKeyDown={onKeyDown}
    className="absolute inset-0 w-full cursor-pointer focus:outline-none
               focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-ink/20"
  />
  <div className="relative">{children}</div>
</div>
```

Why each part matters:

- `absolute inset-0` — the whole row is the hit target and the focus ring frames it.
- `aria-pressed={selected}` — selection state is announced; don't duplicate it in
  the label text.
- `aria-label` — the row needs an accessible name; the button has no text content.
- `stopPropagation()` — without it the container's `onClick` fires twice.
- `focus-visible:ring-inset` — an outset ring is clipped by the row's `overflow`.
- Enter/Space come free from the native `<button>`. Don't hand-roll key handlers.

In the prototype this shell backs `ListCardRow`, `EntityCard`, `DataTable` rows and
`ImportTable` rows. In Uwazi, the equivalent surfaces are the library card list, the
table rows, and the file/attachment lists.

> A row with **no** nested controls may be `as="button"` (a real `<button>` shell).
> The moment a control lands inside, switch to the stretched-button form.

### 1.2 Always-mounted slide-overs get `inert` while closed

Drawers that stay mounted and translate off-pane keep their controls in the tab
order. Tabbing into a closed drawer makes the browser force-scroll the
`overflow-hidden` pane to reveal the focused control — which visually parks the
"closed" drawer on top of the content. It looks like a rendering bug; it's a focus bug.

```tsx
const trapRef = useFocusTrap<HTMLElement>(open);

useEffect(() => {
  trapRef.current?.toggleAttribute("inert", !open);
}, [open, trapRef]);
```

Applies to every persistent overlay: filters drawers, notification drawers, entity
overlays. `inert` is baseline-supported; no polyfill needed.

Pair it with a scrim that flips `pointer-events`, and a transform (not `display`)
for the slide, so the transition still animates:

```tsx
<div
  aria-hidden={!open}
  onClick={onClose}
  className={`absolute inset-0 z-30 transition-opacity ${
    open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
  }`}
/>
<aside
  ref={trapRef}
  role="dialog"
  aria-modal="true"
  aria-label={title}
  className={`absolute top-0 bottom-0 z-40 bg-paper shadow-lg flex flex-col
              transition-transform duration-200 ease-out
              ${rtl ? "left-0" : "right-0"}
              ${open ? "translate-x-0" : rtl ? "-translate-x-full" : "translate-x-full"}`}
  style={{ width: `min(100%, ${width / 16}rem)`,
           borderInlineStart: "1px solid var(--border-primary)" }}
/>
```

Note the RTL handling: the drawer slides from the **inline end**, and the border uses
the logical `borderInlineStart`. Uwazi ships Arabic — don't hardcode `right`/`left`.

### 1.3 Every overlay traps focus and closes on Escape

`hooks/useFocusTrap.ts` — attach the ref to the **panel**, not the scrim.

```tsx
export function useFocusTrap<T extends HTMLElement>(active: boolean) { … }

// usage
const panelRef = useFocusTrap<HTMLDivElement>(isOpen);
useEffect(() => {
  if (!isOpen) return;
  const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
  window.addEventListener("keydown", onKey);
  return () => window.removeEventListener("keydown", onKey);
}, [isOpen, onClose]);
```

What the hook guarantees:

- Initial focus moves to the first focusable child — **unless** something inside is
  already focused, so an `autoFocus` input isn't stolen.
- Tab / Shift+Tab wrap at the edges instead of escaping to the page behind.
- On deactivate, focus is **restored to the trigger**. Skipping this drops keyboard
  users at `<body>` and they have to tab from the top of the page again.
- The `keydown` listener is registered in the **capture** phase so nested widgets
  can't eat Tab first.
- Hidden children are filtered by `offsetParent !== null`, which is what makes it
  work for always-mounted slide-overs as well as unmounting modals.

Used by every modal and overlay in the prototype. New modal ⇒ trap + Escape, no
exceptions.

### 1.4 Hover-revealed actions need `group-focus-within`

`opacity-0 group-hover:opacity-100` alone means keyboard users tab to an **invisible**
button. Always pair the two:

```tsx
<button
  className="p-1 rounded opacity-0 group-hover:opacity-100 group-focus-within:opacity-100
             hover:bg-warm text-ink-muted hover:text-ink transition-all"
>
```

Grep for the anti-pattern before you ship:
`grep -rn 'group-hover:opacity-100' | grep -v 'group-focus-within'`

### 1.5 SVG interactive elements draw their own focus ring

Inside a zoom/pan transform, the browser's default outline is scaled, clipped, or
invisible. Give SVG nodes explicit semantics **and** a drawn ring:

```tsx
{focusedNodeId === n.id && !n.selected && (
  <circle cx={n.x} cy={n.y} r={n.r + 5} fill="none"
          stroke="var(--accent-blue)" strokeWidth={1.5} />
)}
<circle
  cx={n.x} cy={n.y} r={n.r} fill={n.color}
  tabIndex={0}
  role="button"
  aria-label={`${n.title} — ${n.typeName}, ${n.evidenceCount} evidence`}
  onFocus={() => setFocusedNodeId(n.id)}
  onBlur={() => setFocusedNodeId(null)}
  onKeyDown={(e) => {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(n); }
  }}
/>
```

Rules: `tabIndex` + `role` + `aria-label` + Enter/Space + a **carbon halo** drawn as
a sibling `<circle>`. Focus should also surface whatever hover surfaces (the tooltip),
so keyboard users get the same identification.

Two adjacent SVG gotchas that bite in the same file:

- **Wheel zoom** — React's `onWheel` is passive since v17, so `preventDefault()` is
  ignored and browser page-zoom kicks in past your clamp. Attach natively:
  `el.addEventListener("wheel", onWheel, { passive: false })`.
- **Tooltips** — render as HTML overlays positioned via `getBoundingClientRect()`,
  never as SVG inside the zoom transform (they scale with the graph and clip at the
  viewport edge).

### 1.6 EntityPill labels never use the raw type colour

Entity type colours are chosen to be distinguishable, not readable. Small text in the
raw hue on a 12% tint of itself fails WCAG — violet `#8B5CF6` lands just under 4.5:1.

The rule: **the dot keeps the true colour; the label doesn't.** Pale colours fall back
to ink entirely; saturated ones mix toward ink.

```tsx
function luminance(hex: string): number {
  const h = hex.replace("#", "");
  if (h.length < 6) return 0.5;
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

const isPale = luminance(color) > 0.6;
const textColor = isPale
  ? "var(--text-primary)"
  : `color-mix(in srgb, ${color} 70%, var(--text-primary))`;
```

Mixing with `var(--text-primary)` is what makes it **theme-aware**: the same
expression darkens labels in light mode and lightens them in dark. A hardcoded
mix target needs a `dark:` branch and will drift.

Pill shape: `rounded-md`, dot `rounded-[2px]`, background `${color}20`, border
`1px solid ${color}40`.

### 1.7 Live regions on anything that updates itself

Streams, toasts, task progress and beacons need to announce. Cheapest correct form is
a visually-hidden polite region next to a purely-visual indicator:

```tsx
<span aria-live="polite" className="sr-only">{flash?.message ?? ""}</span>
```

Use `role="status"` for transient state, `role="log"` for append-only threads (the
agent transcript uses `role="log"` + `aria-live="polite"`).

---

## Part 2 — Motion

All keyframes live in `app/src/index.css`. Copy the block wholesale — the durations
and easings are tuned as a set, and mixing them with Tailwind's defaults reads as two
different products.

### 2.1 The easing vocabulary

| Curve | Value | Used for |
|---|---|---|
| Spring | `cubic-bezier(0.34, 1.4, 0.5, 1)` | beacon morph, panel content |
| Springier | `cubic-bezier(0.34, 1.45, 0.5, 1)` | attention pop |
| Settle | `cubic-bezier(0.22, 1, 0.36, 1)` | modal entrance |
| `ease-out` | — | everything small and one-way |

Overshoot is reserved for **notification/attention** surfaces. Content entrances
settle; they don't bounce.

### 2.2 Beacon — width morph + attention pop

The notification pill animates its `width` rather than mounting/unmounting, so it
morphs between collapsed (icon only), live-activity (label + %), and flash states.

```css
/* Springy easing shared by the pill ↔ panel transition */
.beacon-spring {
  transition-timing-function: cubic-bezier(0.34, 1.4, 0.5, 1);
}

/* Panel content settles in just after the shell finishes growing */
@keyframes beacon-content-in {
  from { opacity: 0; transform: translateY(-0.375rem) scale(0.97); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.animate-beacon-content {
  animation: beacon-content-in 0.28s cubic-bezier(0.34, 1.4, 0.5, 1) 0.04s both;
}

/* Live-activity rail content swap */
@keyframes beacon-rail-in {
  from { opacity: 0; transform: translateY(0.25rem); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-beacon-rail { animation: beacon-rail-in 0.22s ease-out; }

/* Attention pop — fires when a new activity/notification lands */
@keyframes beacon-pop {
  0%   { transform: scale(1); }
  42%  { transform: scale(1.055); }
  100% { transform: scale(1); }
}
.animate-beacon-pop { animation: beacon-pop 0.46s cubic-bezier(0.34, 1.45, 0.5, 1); }
```

```tsx
<div
  className={`relative rounded-md beacon-spring ${open ? "bg-vellum" : "bg-warm"}
              ${pop ? "animate-beacon-pop" : ""}`}
  style={{ width, transitionProperty: "width, box-shadow", transitionDuration: "0.42s" }}
>
  {/* Clip wrapper keeps rail content rounded through the width morph */}
  <div className="overflow-hidden" style={{ borderRadius: "inherit" }}>…</div>
</div>
```

Two details that are easy to lose:

- The **width** is inline (it's computed), the **easing** is a class. Splitting them
  is what lets the same curve apply to `box-shadow` in the same transition.
- The `overflow-hidden` clip wrapper with `borderRadius: "inherit"` — without it,
  rail content spills square corners during the morph.
- The pop scales `1.055`, not `1.1`. At navbar size anything larger reads as a jitter.

### 2.3 Modal entrance — rise + settle, with a fading scrim

```css
@keyframes agent-modal-in {
  from { opacity: 0; transform: translateY(14px) scale(0.985); }
  to   { opacity: 1; transform: translateY(0) scale(1); }
}
.animate-agent-modal {
  animation: agent-modal-in 0.34s cubic-bezier(0.22, 1, 0.36, 1);
}

@keyframes agent-scrim-in {
  from { opacity: 0; }
  to   { opacity: 1; }
}
.animate-agent-scrim { animation: agent-scrim-in 0.28s ease-out; }
```

The scrim (`0.28s`) finishes **before** the panel (`0.34s`) so the background dims
into place and the panel arrives on top of a settled backdrop. Keep the offset if you
retime these.

### 2.4 Small entrances

```css
@keyframes fade-in-up {
  from { opacity: 0; transform: translateY(4px); }
  to   { opacity: 1; transform: translateY(0); }
}
.animate-fade-in-up { animation: fade-in-up 0.15s ease-out; }
```

`0.15s` / `4px` — the default for anything appearing in place: floating menus,
new notification cards, popovers, inline additions. Deliberately below the threshold
where it reads as an *animation* rather than a *response*.

Related, same family:

```css
@keyframes slide-in-right {                 /* toasts */
  from { opacity: 0; transform: translateX(100%); }
  to   { opacity: 1; transform: translateX(0); }
}
.animate-slide-in-right { animation: slide-in-right 0.2s ease-out; }

@keyframes flash-highlight {                /* "here it is" pulse on a target */
  0%, 100% { opacity: 1; }
  50%      { opacity: 0.3; }
}
.flash-highlight { animation: flash-highlight 0.3s ease-in-out 3; }

@keyframes flash-card {                     /* row landed / changed */
  0%   { background-color: var(--highlight-yellow); }
  100% { background-color: transparent; }
}
.flash-card { animation: flash-card 1s ease-out; }
```

### 2.5 Reduced motion — required, not optional

Every animation class must appear in a `prefers-reduced-motion` block. The prototype
keeps them next to their definitions:

```css
@media (prefers-reduced-motion: reduce) {
  .agent-dot { animation: none; opacity: 0.6; }
  .animate-agent-modal,
  .animate-agent-scrim { animation: none; }
}

@media (prefers-reduced-motion: reduce) {
  .beacon-spring { transition-duration: 0.001ms !important; }
  .animate-beacon-content,
  .animate-beacon-rail,
  .animate-beacon-pop { animation: none !important; }
}
```

Two distinct treatments — pick per animation:

- **Transitions** collapse to `0.001ms` (not `0`) so `transitionend` handlers still
  fire and state machines don't hang.
- **Animations** go to `none`, but if the animation was carrying a resting style
  (like `.agent-dot`'s opacity), restate that style — otherwise the element is left
  in its pre-animation state.

An indeterminate loader is the one place to consider keeping motion: it's the only
signal that work is in flight. The prototype stops it anyway and relies on the `%`
text; if you keep it, make it a slow opacity pulse, never a transform.

---

## Part 3 — Style rules

These extend the list in [`TOKENS-MAPPING.md`](./TOKENS-MAPPING.md#style-rules-that-come-with-the-tokens);
repeated here in short form because they're the ones reviewers catch most often.

**Layout in `rem`, never raw px.** Tailwind spacing utilities are fine — v4's numeric
scale is dynamic, so `h-13` = 3.25rem just works. Raw px only for borders, shadows and
sub-pixel details. When a value must be computed, divide: `width: min(100%, ${width / 16}rem)`.

**Selected card/row = `bg-parchment`.** One selected colour everywhere
(`--bg-primary`, `#F5F0E8` light). Not `bg-warm`, not `bg-vellum`, not an inline
`color-mix`. Don't introduce a second selected colour for a new surface — if
parchment doesn't read as selected there, the surrounding surface is wrong.

**No thick left-border accents.** No inset border accents either. Signal state with a
small dot, an icon colour, or a background tint. Active sidebar items are
`bg-warm text-ink` with the *same* icon colour as inactive — the background change
alone carries the state.

**Seal is danger only.** `--accent-seal` `#E8432A` marks destructive actions and error
states, nothing else. **Ink** is the primary action colour; **carbon** is data, links
and info. A red primary button is always a bug in this system.

**Badges and pills are `w-fit`** so they don't stretch to fill a flex or grid cell.

### Non-default state: a dot, a count, or nothing

A control holding sticky state has to admit it. Which marker depends on one
question — **can the control already show its own state?**

| Case | Marker |
|---|---|
| State is **not legible** from the control (icon-only trigger, fixed label) | **Dot** |
| State is **countable and worth knowing** ("3 filters on") | **Count badge** |
| Control already **displays its value** (a select reading "Title", a segmented control with its active segment lit) | **Nothing** |

**Never both** on one control, and **never a row that appears only when active** —
a marker that mounts on first use shifts the layout underneath it (see the
layout-shift rule). Reserve the space or render nothing.

The third row is the one that keeps the signal worth reading: dotting a control
that already states its value is duplication, and once everything carries a dot
the dot means nothing.

```tsx
// The trigger must be `relative`. Dot sits in the top inline-end corner,
// slightly outside the glyph so it never crowds it.
<button className="relative inline-flex items-center justify-center w-8 h-8 rounded-md …">
  <SlidersHorizontal size={14} />
  {isNonDefault && (
    <span
      className="absolute -top-0.5 -end-0.5 w-1.5 h-1.5 rounded-full"
      style={{ backgroundColor: "var(--accent-blue)" }}
    />
  )}
</button>
```

Exact treatment, so it stays one mark everywhere:

- **Size** `w-1.5 h-1.5` (6px), `rounded-full`. Big enough to read at 100% zoom,
  small enough not to read as a badge.
- **Colour** carbon (`var(--accent-blue)`) — **not** the control's own ink. Carbon
  is the app's "data/attention" accent; ink would blend into the glyph it sits on.
  Never seal: this is information, not danger.
- **Position** `-top-0.5 -end-0.5` on a `relative` trigger. **Logical `-end-`, not
  `-right-`** — it must mirror under RTL, and Uwazi ships Arabic.
- **Dark mode** automatic: carbon is a real var and reads on both `bg-warm` and
  `bg-vellum` triggers. No `dark:` variant.
- **Pair it with the active surface** the control already uses (`bg-vellum
  text-ink`); the dot sharpens that state, it doesn't replace it.
- The dot is decorative — the accessible name carries the state
  (`aria-label="Display options, 3 hidden"`), so screen readers don't depend on it.

A count badge is the *inline* counterpart: it sits in the button's flow (not
absolutely positioned), `bg-ink text-paper`, ~14px, `tabular-nums` — see
`FiltersButton`. Inline because a number needs room and must not overlap a glyph.

### Never shift layout on state change

A row that appears only when it has something to say — an "N active / Clear all"
summary, a count line, a chip sheet — shoves everything below it the moment a user
ticks a box. Inside a scrollable column that isn't a polish issue: the facet you
were reaching for slides out from under the cursor as you click it.

Three remedies, in order of preference:

1. **Move the signal onto a control that's already there.** A count badge on the tab
   that owns the panel costs no new height and can't shift anything.
2. **Render nothing.** If the state is legible elsewhere, don't restate it.
3. **Reserve the space** — mount permanently and toggle only the contents
   (`invisible` + `aria-hidden`), never a conditional mount. Last resort.

**Worked example — the Filters panel's "N active" row.** It began as a conditional
mount and shoved the facet list on every tick. The fix was to reserve a fixed band,
and that was **also wrong**, for two reasons: it pays a permanent empty strip in a
scrollable column for a message that is usually absent, and it left a *second*
account of the same state — an active-filters sheet docked at the foot of the same
panel already listed those filters, and it mounted on first activation too.

The answer was neither mount nor reserve. The count moved onto the Filters tab (a
control already on screen) and the full account moved into one always-present
constraint summary. Zero new elements, zero reserved emptiness, one place that
answers "what's affecting this data".

The lesson generalises: when a signal needs somewhere to live, look for a control
that is already paying for its space before you add a row.

**Action buttons are warm and borderless.**

```tsx
className="bg-warm text-ink-secondary hover:bg-parchment hover:text-ink rounded-md"
```

Not black, not vellum, not outlined, not pill-shaped. This was landed by explicit
rejection of the alternatives — the settings action bar is the canonical example.

**Dark mode is automatic.** Only the real vars flip. If a component looks wrong in
dark, the bug is a hardcoded hex or a fake var name — not a missing `dark:` variant.
`dark:` variants should be rare to nonexistent.

**Never write a hex fallback in `var()`.** `var(--ink, #1a1a1a)` paints the fallback
forever (that var doesn't exist) and silently kills dark mode; inside `color-mix()`
it invalidates the whole declaration and the element renders unstyled. Both shipped
as real bugs here. The real names are in `TOKENS-MAPPING.md`.

---

## Part 4 — Search surfaces

Three rules that came out of building the Library's search: the highlight, the
snippet, and the query parse. Each fixed a bug that was invisible until the
surface sat next to the thing it described.

### 4.1 A highlight must not change text metrics

A mark that adds width or weight re-wraps the line it sits in — the same sentence
breaks differently highlighted than plain, and a column of snippets jitters as the
query changes under it.

```tsx
const MARK_CLASS = "rounded-[2px] px-0.5 -mx-0.5 bg-highlight-active/70 text-ink";
```

- `px-0.5` paints the tint slightly past the glyphs; **`-mx-0.5` cancels exactly
  that width**, so the mark occupies the same horizontal space as the plain text.
- **No `font-weight`.** The mark inherits it, so a hit inside a semibold title stays
  semibold and one in body copy stays regular. Changing weight changes glyph advance
  widths, which re-wraps the line — the thing the negative margin just paid to avoid.
- `-mx-*` is symmetric, so this is RTL-safe.

See `HighlightedText`. Marking is done by **string-split, never
`dangerouslySetInnerHTML`** — snippets carry arbitrary corpus text.

Colour is the *active* highlight token at 70% (`--highlight-yellow-active`), not the
base yellow: at low alpha over warm paper the base reads muddy rather than marked.

### 4.2 Don't render an affordance the data can't back

A page tag, a count, or a jump target that isn't real is worse than none. It looks
authoritative, and it stays invisible exactly until the user puts it beside the
thing it claims to describe.

**Worked example.** Full-text snippets claim `p.N` **only where the page is real**.
CEJIL carries genuine per-page text, so its snippets get a page tag *and* a
jump-to-page. The mock corpus shares one rendition across every doc-bearing entity —
text that isn't page-mapped and isn't even the PDF rendered beside it — so those
snippets carry `page: null`: excerpt only, no tag, no jump. The invented number was
unnoticeable in the Library and plainly wrong the moment a snippet sat next to the
actual document.

Rule: derive the affordance from the data and let it be **absent**. Don't fabricate
a plausible value to keep a layout regular — the regularity is worth less than the
claim being true.

### 4.3 One matching semantics — filter, snippet and mark share a tokenizer

If the thing that FILTERS, the thing that EXCERPTS and the thing that MARKS each
parse the query themselves, they drift. The failure is silent and confusing: a row
matches but nothing highlights inside it, or a phrase marks a word it didn't match on.

Keep **one** tokenizer (`utils/queryTokens.ts`) and have all three consume it.
`tokenizeQuery` treats `"quoted phrases"` as single tokens and `AND`/`OR`/`NOT` as
operators; `highlightTerms` derives the literal strings to mark from that same parse.
The filter, the snippet matcher and `HighlightedText` all read it, so what matches
and what gets marked cannot disagree.

If matching folds diacritics, the mark must fold identically and then map hits back
to the ORIGINAL string's indices — the mark has to wrap the source characters,
accents and case intact.

The same class of bug already bit once on this surface: two `clearAll`
implementations over one filter state drifted, one forgetting the search box and the
other the AND/OR modes. One state, one parser, one clear.

---

## Review checklist

Before merging a component onto the 2026 language:

- [ ] Clickable row uses the stretched-button pattern, not `role="button"`
- [ ] Persistent overlay toggles `inert` while closed
- [ ] Modal/overlay has `useFocusTrap` + Escape + focus restore
- [ ] Every `group-hover:opacity-100` has a `group-focus-within:opacity-100` beside it
- [ ] SVG interactives have `tabIndex` + `role` + `aria-label` + Enter/Space + drawn ring
- [ ] Coloured labels pass contrast in both themes (mix toward `--text-primary`)
- [ ] Self-updating regions have `aria-live` / `role="status"` / `role="log"`
- [ ] Every new animation appears in a `prefers-reduced-motion` block
- [ ] Sticky-state control carries a dot (illegible state) or a count (countable) — never both, never a marker that mounts on activation
- [ ] Nothing mounts on state change inside a scrollable column — signal moved onto an existing control, or space reserved
- [ ] Highlight marks don't change text metrics (padding cancelled by equal negative margin, weight inherited)
- [ ] No page tag, count or jump target the data can't back — absent beats invented
- [ ] Filter, snippet and mark all read one tokenizer
- [ ] No raw px in layout; no hex fallbacks in `var()`; no second selected colour
- [ ] Verified in light **and** dark, and in RTL if the component has directional layout
