# Uwazi 2026 — style migration: token mapping & plan

For devs migrating `huridocs/uwazi` (branch `production`) onto the 2026 prototype's
design language. Companion file: [`uwazi-semantic-tokens.css`](./uwazi-semantic-tokens.css)
— the PR-ready additive token layer.

> **Validated 2026-07-06 against a fresh `production` clone**: installed the file,
> added the `@import`, ran their CSS build (`npm run tailwind`, Tailwind v4.3.2) —
> compiles clean; the compiled `globals.css` diff is **purely additive (0 lines
> removed, +471)**. Bonus: the V2 **Dataviz** components (`DatavizEditor`,
> `DatavizChartView`, embeds, …) already reference `bg-parchment`/`text-ink` —
> classes that currently compile to *nothing* — so this layer also fixes live
> undefined utilities. PR commit is staged locally (branch
> `feat/semantic-design-tokens`, 2 files, +164) awaiting a maintainer push.

## Where each side stands

| | `huridocs/uwazi` today | 2026 prototype |
|---|---|---|
| Tailwind | **v4** (`@tailwindcss/cli`, entry `app/react/App/styles/tailwind.css` → `globals.css`, scoped under `.tw-content`, light-only) | **v4** (Vite plugin, `src/index.css`) |
| Color tokens | Numeric shade ramps in `@theme` (`primary-50…950`, `error-*`, `success-*`, `warning-*`, `alert-*`, grays) | Semantic roles: real vars (`--text-primary`, `--bg-surface`…) + `@theme` bridges (`--color-ink`, `--color-paper`…) |
| Runtime theming | `app/react/V2/theme/` — ThemeProvider, `--color-theme-*` role vars, presets, contrast enforcement | `:root.dark` flips the real vars |
| Components | flowbite-react + own V2 components | Hand-rolled primitives (`components/shared/`) |
| Showcase | Storybook 10 + Chromatic (`app/react/stories/`) | ComponentCatalog (in-app) → **Storybook being added** |

Both being Tailwind v4 means the token layer transfers nearly verbatim. The gap is
**naming architecture**: shade ramps ("which blue?") vs semantic roles ("what is
this for?"). The migration is: add the semantic layer, move components onto it,
retire the ramps.

## The two-layer rule (the thing that bites)

1. **Real vars** (`--text-primary`, `--bg-surface`, `--border-primary`…) — the only
   names to use in raw CSS, `style={{}}`, SVG `fill`/`stroke`, `color-mix()`.
2. **Bridges** (`--color-ink`, `--color-paper`…) — exist ONLY so Tailwind generates
   utilities (`text-ink`, `bg-paper`). Never reference them via `var(...)`.

**Never write a hex fallback** — `var(--ink, #1a1a1a)` paints the fallback forever
(the var doesn't exist) and silently breaks dark mode. `var(--ink)` inside
`color-mix()` is worse: the whole declaration is invalid and the element renders
unstyled. Both shipped as real bugs in the prototype; audit greps:
`grep -rn 'var(--' | grep -vE 'text-|bg-|border-|accent-|success|warning|danger|highlight|shadow|radius|font'`.

## Token mapping

Utility = what new/migrated code writes. Nearest today = what existing Uwazi code
uses for the same role (for mechanical find-and-consider, not find-and-replace —
every swap is also a hue shift toward the warm palette).

### Backgrounds

| Role | Real var | Utility | Light | Dark | Nearest in uwazi today |
|---|---|---|---|---|---|
| Page/canvas + **selected cards** | `--bg-primary` | `bg-parchment` | `#F5F0E8` | `#1A1A1A` | `gray-50` / `primary-50` |
| Surface (cards, panels) | `--bg-surface` | `bg-paper` | `#FFFFFF` | `#242424` | `white` |
| Warm fill (buttons, hover, sections) | `--bg-warm` | `bg-warm` | `#FCFAF8` | `#2A2A2A` | `gray-50` |
| Muted fill | `--bg-muted` | `bg-vellum` | `#F5EED7` | `#333333` | `gray-100` |
| Modal scrim | `--bg-overlay` | `bg-overlay` | `#00000066` | `#000000AA` | ad-hoc rgba |
| Selected (non-card) | `--bg-selected` | `bg-selected` | `#F0EDED` | `#333333` | `primary-100` |

### Text (the ink ladder)

| Role | Real var | Utility | Light | Dark | Nearest today |
|---|---|---|---|---|---|
| Primary | `--text-primary` | `text-ink` | `#1A1A1A` | `#F5F0E8` | `gray-900` |
| Secondary | `--text-secondary` | `text-ink-secondary` | `#333333` | `#D4CDB8` | `gray-700` |
| Tertiary (labels) | `--text-tertiary` | `text-ink-tertiary` | `#555555` | `#9A9A9A` | `gray-600` |
| Muted (hints, icons) | `--text-muted` | `text-ink-muted` | `#777777` | `#6B6B6B` | `gray-500` / `gray-400` |

### Borders

| Role | Real var | Utility | Light | Dark | Nearest today |
|---|---|---|---|---|---|
| Default | `--border-primary` | `border-border` | `#EDE7DB` | `#343434` | `gray-200` |
| Soft/dashed | `--border-soft` | `border-border-soft` | `#E2DBC9` | `#3E3E3E` | `gray-300` |

### Accents & status

| Role | Real var | Utility | Light | Dark | Nearest today |
|---|---|---|---|---|---|
| Carbon — data/links/info | `--accent-blue` | `text-carbon` / `bg-carbon` | `#00B4F0` | same | **`primary-700` `#2b56c1`** — this is THE brand hue shift |
| Carbon tint | `--accent-blue-tint` | `bg-carbon-tint` | `#DDF3FD` | `#0C3A4D` | `primary-50` |
| Seal — **danger only** | `--accent-seal` | `text-seal` / `bg-seal` | `#E8432A` | same | `error-600` `#d9534f` |
| Seal tint | `--accent-seal-tint` | `bg-seal-tint` | `#FEE2E2` | `#4A1A1A` | `error-50` |
| Success | `--success` | `text-success` | `#059669` | same | `success-600` `#5cb85c` |
| Success bg | `--success-light` | `bg-success-light` | `#D1FAE5` | `#064E3B` | `success-100` |
| Warning | `--warning` | `text-warning` | `#F59E0B` | same | `warning-500` (identical hex) |
| Warning bg | `--warning-light` | `bg-warning-light` | `#FEF3C7` | `#78350F` | `warning-100` |
| Text highlight | `--highlight-yellow` | `bg-highlight` | `#FDE68A` | `#78350F` | `warning-200` (identical hex) |

### Radii (opt-in, Phase 3 — see the commented block in the CSS)

`xs 2 · sm 3 · base 4 · md 6 · lg 8 · xl 10 · 2xl 12 · 3xl 14 · 4xl 16` (px).
Half Tailwind's ramp — "soft but not pillowy". Global change; own PR.

## Style rules that come with the tokens

- **Layout in `rem`, never raw px.** Tailwind spacing utilities are fine (v4's
  numeric scale is dynamic — `h-13` = 3.25rem just works). Raw px only for
  borders, shadows, sub-pixel details.
- **Selected card/row = `bg-parchment`.** One selected color everywhere. No inline
  `color-mix`, no `bg-warm`/`bg-vellum` for selection.
- **No thick left-border accents** on cards/list items — use a small dot, icon
  color, or bg tint.
- **Seal is danger only.** Ink is the primary action color; Carbon is data/links.
- **Badges/pills `w-fit`** so they don't stretch in flex/grid.
- **Action buttons**: borderless `bg-warm text-ink-secondary hover:bg-parchment`,
  `rounded-md` — not pills, not outlined.
- **Dark mode**: only the real vars flip. If a component looks wrong in dark, the
  bug is almost always a hardcoded hex or a fake var name — not a missing
  `dark:` variant. (`dark:` variants should be rare to nonexistent.)
- Native form controls need `color-scheme: dark` on the mode root (included in
  the tokens file).

## Migration phases

1. **Tokens PR** (`uwazi-semantic-tokens.css`) — additive, zero visual change.
   Wire dark mode to the V2 ThemeProvider mode rather than a new mechanism; the
   `--color-theme-*` role vars can later derive from the semantic layer.
2. **Pilot components** — restyle components that already have stories (Pill,
   Card, Table, Tabs, Beacon, Sidepanel) onto semantic utilities; Chromatic
   diffs the change. Copy specs from the prototype's Storybook/catalog.
3. **Page-level adoption + radii opt-in** — screen by screen; then flip the radii
   block; then mark numeric ramps deprecated (lint rule: no new `primary-*` /
   `gray-*` in V2 components).

## Reference

- Living spec: this repo's app (`cd app && npm run dev`) — ComponentCatalog via
  logo click, Storybook via `npm run storybook`.
- Prototype sources of truth: `app/src/tokens.css` (real vars),
  `app/src/index.css` (`@theme` bridges + radii), `CLAUDE.md` (style rules).
