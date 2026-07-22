# Typography — what makes the prototype look the way it does

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
import "@fontsource/jetbrains-mono/400.css";
```

If you self-host static files instead, these are the only weights used —
don't ship more:

| Weight | Tailwind utility | Uses |
|---|---|---|
| 400 | (default) / `font-normal` | body default |
| 500 | `font-medium` | 361 |
| 600 | `font-semibold` | 214 |
| 700 | `font-bold` | 39 |

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

## 3. The type scale as used

No custom font-size tokens — the scale is Tailwind's, and the identity comes
from its center of gravity sitting LOW: `text-xs` (12px) is the workhorse UI
size, `text-sm` (14px) is "large" (content), and anything bigger is rare.

| Size | Uses | Role |
|---|---|---|
| `text-xs` (12px) | 383 | default UI: buttons, chips, meta, table cells |
| `text-sm` (14px) | 229 | content: passages, field values, card titles |
| `text-[10px]` | 180 | micro-labels (see combo below) |
| `text-[11px]` | 157 | section headers, small meta |
| `text-[13px]` | 29 | tabs |
| `text-base` and up | ~45 total | view titles only — big type is scarce on purpose |

### Canonical combos (copy these, don't improvise)

```
micro-label     text-[10px] font-semibold uppercase tracking-wide text-ink-tertiary
section header  text-[11px] font-semibold uppercase tracking-wider text-ink-tertiary
tab             text-[13px] font-medium
card title      text-sm font-bold text-ink leading-tight
field value     text-sm font-medium text-ink leading-relaxed
prose/passage   text-sm leading-relaxed text-ink
```

### Rules that carry the feel

- **Letter-spacing exists ONLY on uppercase labels** (`tracking-wide` /
  `tracking-wider`, 90 uses). Prose and mixed-case UI are never tracked —
  1 stray `tracking-tight` in the whole app.
- **Every number a user compares is `tabular-nums`** (112 uses): counts,
  page tags (`p.15`), percentages, steppers, dates in lists. Inter's default
  proportional figures make columns of numbers wobble; this is load-bearing.
- **Weights do hierarchy, size mostly doesn't.** Adjacent text differs by
  `font-medium` vs `font-semibold` vs color (`text-ink` → `-secondary` →
  `-tertiary` → `-muted`) far more often than by size.
- **Line-height**: `leading-relaxed` for anything that wraps (42 uses),
  `leading-tight`/`snug`/`none` for one-liners. Nothing custom.
- Layout in `rem`; the bracket sizes above (`10/11/13px`) are the sanctioned
  exceptions because they're type, not layout.
