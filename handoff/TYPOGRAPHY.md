# Typography

Everything type-related, extracted for huridocs/uwazi. Three parts: the fonts
themselves (and the one gap you must close), the rendering setup, and the type
scale as actually used. Numbers in brackets are usage counts across the
prototype's components — they tell you what's canonical vs incidental.

## 1. Families

Declared in `app/src/index.css` inside Tailwind v4's `@theme`, which is what
makes `font-sans` / `font-mono` utilities resolve to them:

```css
@theme {
  --font-sans: "Inter", ui-sans-serif, system-ui, -apple-system, sans-serif;
  --font-mono: "JetBrains Mono", ui-monospace, monospace;
}
```

- **Inter** — everything.
- **JetBrains Mono** — code, file names, stack traces only (37 uses).

### ⚠️ The prototype does NOT ship the fonts

There is no `@font-face`, no `<link>`, no font package, no `.woff2` in the
repo. The stack resolves Inter only when it's installed on the viewer's
machine; everyone else silently gets `system-ui` (SF Pro on macOS — close
enough to hide the problem in screenshots, which is why it went unnoticed).

**To actually look like the prototype, self-host both faces.** Recommended
(matches the repo's Vite/npm setup, no CDN, GDPR-clean):

```bash
npm i @fontsource-variable/inter @fontsource/jetbrains-mono
```

```ts
// entry point, before any CSS that sets font-family
import "@fontsource-variable/inter";        // one variable file covers 400–700
import "@fontsource-variable/inter/wght-italic.css"; // real italics — the app
                                            // italicises quotes in 17 places,
                                            // and without this file browsers
                                            // fake-slant the upright face
import "@fontsource/jetbrains-mono/400.css";
```

If you self-host static files instead, these are the only weights used —
don't ship more:

| Weight | Tailwind utility | Uses |
|---|---|---|
| 400 | (default) / `font-normal` | body default |
| 500 | `font-medium` | 443 |
| 600 | `font-semibold` | 186 |
| 700 | `font-bold` | 36 (chart labels, document content, inline emphasis, the dev catalog) |

JetBrains Mono: 400 only. Use `font-display: swap` on all faces.

## 2. Rendering setup

From `index.css` — this is part of the look (Inter unsmoothed on macOS reads
heavier and warmer than the prototype):

```css
body {
  font-family: var(--font-sans);
  background: var(--bg-primary);
  color: var(--text-primary);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-rendering: optimizeLegibility;  /* kerning + ligatures on */
}
```

In the uwazi repo, apply the `font-family` + smoothing on `.tw-content`
instead of `body` during migration, same as the token layer in
`uwazi-semantic-tokens.css`.

Two supporting rules:

```css
/* RTL: code and file names stay LTR */
[dir="rtl"] pre,
[dir="rtl"] code,
[dir="rtl"] .font-mono {
  direction: ltr;
  text-align: left;
}
```

Dark mode changes no typography — only colors move (via the semantic tokens)
plus `:root.dark { color-scheme: dark; }` for native controls.

## 3. Type roles

The scale is Tailwind's plus two tokens, declared in `index.css` `@theme`:
`--text-meta` (11px) and `--text-tab` (13px). There are no bracket sizes in the
app. The floor for UI text is 11px.

| Size | Utility | Uses | Used for |
|---|---|---|---|
| 11px | `text-meta` | 390 | caps labels, badges, chips, row meta, validation lines, tooltips |
| 12px | `text-xs` | 533 | buttons, field labels, help text, secondary cells, menu items, search inputs |
| 13px | `text-tab` | 40 | tab strips, nav buttons, facet headings |
| 14px | `text-sm` | 295 | titles, inputs, primary cells, field values, prose, empty titles |
| 20px | `text-xl` | 5 | stat figures |
| 24px | `text-2xl` | 4 | the published title on phones |
| 30px | `text-3xl` | 1 | the published title (one place, see the role table) |

`text-base` and `text-lg` are not UI sizes. Document content
(`DocumentRendition`) and the dev catalog keep them.

On `main` the recipes below were applied to Settings and to the files ported
with it. Surfaces outside Settings that the pass has not reached still carry
older sizes: `text-base` or `text-lg` titles in `AddFileModal`,
`CreateRelationshipModal`, `NotificationsDrawer`, `AgentModal`, `MetadataView`
and `metadata/items.tsx`, and `tracking-wide` on a few Library labels. Treat
those as not yet migrated, not as recipes.

Each role below has one recipe. Copy the recipe; do not compose a new one for a
role that is already listed. A role that is not listed is a question for the
designer, not a new recipe.

### Role table

| Role | Recipe | Where |
|---|---|---|
| Published title (the one display size) | `text-2xl md:text-3xl font-semibold leading-tight text-ink text-balance` | `PublishedEntityView` masthead only. A published page is read like a document, not worked in; nothing else in the app takes this size |
| Title (page bar, dialog, drawer, sheet) | `text-sm font-semibold text-ink`, truncating | `SettingsContent` header, `Modal`, `MobileBottomSheet`, `NotificationsDrawer`, `AgentModal` |
| Section heading | `text-sm font-semibold text-ink` | `SettingsSection`, card and panel sections |
| Sub-heading (inside a card or popover) | `text-xs font-semibold text-ink` | property panel, file drawer groups |
| Facet heading | `text-tab font-semibold text-ink` | `LibraryFilters`, `FacetSection` |
| Caps label (section label, table header, stat label, caps field label) | `text-meta font-semibold uppercase tracking-wider text-ink-tertiary` | `SectionLabel`, `DataTable`, `SettingsTable`, `SettingsStat`, `StatsCard` |
| Field label (form) | `text-xs font-medium text-ink-secondary`; error swaps to `text-seal-label` | `SettingsField`, `ModalField`, `MODAL_LABEL` |
| Display label (read-only record) | `text-xs text-ink-tertiary` | `MetadataCard` |
| Field value | `text-sm font-medium text-ink` | `MetadataCard`, metadata items |
| Input | `text-sm text-ink`, normal weight; `h-9` | `SettingsField`, `MODAL_INPUT`, `MODAL_TEXTAREA`, entity edit form |
| Search input (toolbar, facet, dropdown, modal search row) | `text-xs text-ink` | `SearchBar`, `ModalSearchField`, `FacetSection` |
| Help / caption / intro / section description | `text-xs text-ink-tertiary` | `SettingsIntro`, `SettingsField` description, `ModalField` hint |
| Validation / swapped hint line | `text-meta leading-4` | `FieldMessage` |
| Table primary cell | `text-sm font-medium text-ink` | first column of every table |
| Table secondary / count cell | `text-xs text-ink-tertiary tabular-nums` | dates, sizes, counts, template names |
| Row meta (line under a row title) | `text-meta text-ink-tertiary` | `ListInfoRow`, `EntityCard`, `FileTable`, notification cards |
| Status badge (non-interactive, tinted fill) | `text-meta font-semibold`, `rounded-md`, `w-fit` | `StatusBadge`, `StatusPill`, extraction state pills |
| Chip (toggle, filter, removable, neutral tag) | `text-meta font-medium` | `ToggleChip`, `ActiveFilterChip`, template and language tags |
| Count badge | `text-xs font-medium tabular-nums` | `CountBadge` |
| Filter count dot | `text-meta font-semibold`, 16px circle | `FiltersButton` |
| Stat figure | `text-xl font-semibold text-ink tabular-nums`; label is the caps label | `StatsCard`, `SettingsStat`, Import CSV status |
| Inline toolbar count | `text-sm font-semibold text-ink tabular-nums` beside an `xs` label | Import CSV and extraction toolbars |
| Empty state title (block) | `text-sm font-medium text-ink-secondary` | `SettingsEmptyState`, panel empties |
| Empty state hint | `text-xs text-ink-tertiary` | `SettingsEmptyState` |
| One-line empty ("No matches.") | `text-xs text-ink-tertiary` | tables, menus, pickers |
| Button | `text-xs font-medium` | every bar and modal button (`warmButton.ts` ladder) |
| Touch button (phone sheet, mobile menu) | `text-sm font-medium` | `SheetDone`, `Navbar` mobile |
| Nav button | `text-tab font-medium` | `Navbar`, `SettingsNav` |
| Tab | `text-tab font-medium` (`TAB_BUTTON`) | `layout/tabStrip.ts`; never copied by hand |
| Segmented control | `text-xs font-medium` | `SegmentedTabs`, `SegmentedControl` |
| Link-style button | `text-xs text-ink-secondary underline` | inline actions in help lines |
| Menu item | `text-xs text-ink-secondary`, hover `text-ink`; selected `font-semibold text-ink`; phone sheet `text-sm` | `Select`, `DocMeta`, `MobileActionMenu`, `AgentModal` scope menu |
| Breadcrumb | `text-sm`; ancestors `text-ink-tertiary` hover `text-ink`; current is the title | `SettingsContent` header, `layout/Breadcrumb` |
| Modal subtitle | `text-meta text-ink-tertiary`, inline after the title | `Modal` |
| Confirm message | `text-sm text-ink`; supporting list `text-sm text-ink-secondary` | `ConfirmDialog`, `ConfirmDelete`, `TypedConfirmModal` |
| Modal list row | `text-xs` | `ModalListRow` |
| Tooltip | `text-meta`, `text-paper` on `bg-ink` | `Hint` |
| Card title | `text-sm font-semibold text-ink leading-snug` | `EntityCard`, `EntityIdentity`, notification and task cards |
| Prose / passage | `text-sm leading-relaxed text-ink` | snippets, rendition text, Bert replies |

### Weights

- UI text tops out at `font-semibold`. `font-bold` is for chart labels
  (the minimap), document content and inline emphasis inside a sentence.
- Steps run normal → medium → semibold. Adjacent text differs by weight and
  colour far more often than by size.

### Colour on text

- Steps: `text-ink` → `-secondary` → `-tertiary`. Text never uses
  `text-ink-muted`.
- `text-ink-muted` (`#777`, 3.95:1 on parchment; 4.23:1 on `#242424` in dark)
  fails AA for text. It is kept for placeholders, disabled controls, icons and
  decorative separators (`·`, `/`, `→`). `SectionLabel` and Storybook's a11y
  check enforce this on their own surfaces.
- Carbon is the data accent, not a link colour. Links and breadcrumbs use the
  ink steps.

### Exemptions

- `views/catalog/Markdown.tsx` inline code is `0.85em`: relative to the
  paragraph, so it is not a step on the scale.
- `LibraryMapView` pin count is `7 / zoom` px on an SVG pin and scales with the
  map. It stays below the floor because the pin is that size.
- `RelationshipsGraphView` `LABEL_PX = 11` is on the floor.
- `utils/sitePageRender.ts` styles the published-site preview document, not
  the app UI.
- Relationships rows change size with the zoom setting (`AggregateRow`).

### Rules

- **Letter-spacing exists only on uppercase labels**, and it is
  `tracking-wider` (the one exception is above). Prose and mixed-case UI are
  never tracked.
- **Every number a user compares is `tabular-nums`**: counts, page tags
  (`p.15`), percentages, steppers, dates in lists.
- **Line-height**: `leading-relaxed` for anything that wraps,
  `leading-tight`/`snug`/`none` for one-liners. `text-meta` and `text-tab` carry
  no line-height of their own and inherit their parent's.
- A value does not change size between where it is read and where it is
  edited: field values and inputs are both `text-sm`, in pages and in modals.
