# Global styles — the settings underneath every component

Everything `app/src/index.css` (plus `index.html`) sets globally. Tokens are
covered by `uwazi-semantic-tokens.css` + `TOKENS-MAPPING.md`, the type layer by
`TYPOGRAPHY.md` — this is the rest: the resets, chrome, and defaults that make
the prototype feel the way it does before a single component renders. In the
uwazi repo, scope selectors to `.tw-content` where they'd otherwise leak into
legacy screens.

## 1. Radii ramp — brand-defining, don't skip

Tailwind's radius scale is overridden globally, ~½ the default ramp: visible
softness without going pillowy. Every `rounded-*` utility in every component
assumes THESE values — copying components without this block makes everything
too round.

```css
@layer theme {
  :root {
    --radius-xs: 2px;
    --radius-sm: 3px;
    --radius: 4px;
    --radius-md: 6px;   /* the workhorse: pills, badges, buttons */
    --radius-lg: 8px;
    --radius-xl: 10px;
    --radius-2xl: 12px;
    --radius-3xl: 14px;
    --radius-4xl: 16px;
  }
}
```

Radii are the sanctioned `px` exception (like borders and shadows); layout is
`rem` everywhere.

## 2. App shell

The app is a fixed full-viewport shell — panes scroll, the page never does:

```css
html, body, #root {
  height: 100%;
  margin: 0;
  overflow: hidden;
  overscroll-behavior: none;  /* kills macOS rubber-band bounce past the shell */
}

body {
  font-family: var(--font-sans);       /* see TYPOGRAPHY.md */
  background: var(--bg-primary);       /* parchment */
  color: var(--text-primary);          /* ink */
  -webkit-font-smoothing: antialiased; /* part of the look — Inter unsmoothed */
  -moz-osx-font-smoothing: grayscale;  /*   reads heavier and warmer */
  transition: background-color 0.2s ease, color 0.2s ease;  /* theme flip */
}
```

`index.html` contributes `<meta name="theme-color" content="#F5F0E8" />`
(parchment — tints the browser chrome on mobile) and `lang="en"` on `<html>`
(swapped with `dir` at runtime for RTL).

## 3. Scrollbars — thin, neutral, token-coloured

```css
* {
  scrollbar-width: thin;               /* Firefox */
  scrollbar-color: gray transparent;
}
::-webkit-scrollbar { width: 6px; height: 6px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb {
  background: var(--border-primary);   /* follows the theme */
  border-radius: 3px;
}
::-webkit-scrollbar-thumb:hover { background: var(--border-soft); }
```

> The prototype has two overlapping WebKit scrollbar blocks (4px/gray and
> 6px/token); equal specificity means the later, token-coloured 6px one wins.
> Port ONLY the block above — don't reproduce the shadowed 4px one.

Escape hatches:

```css
.no-scrollbar { scrollbar-width: none; }        /* compact scroll regions, */
.no-scrollbar::-webkit-scrollbar { width: 0; height: 0; }  /* e.g. chip rows */
[dir="rtl"] ::-webkit-scrollbar { direction: rtl; }  /* bar hugs the left edge */
```

## 4. Interaction defaults

```css
button:not(:disabled) { cursor: pointer; }  /* every enabled button, no opt-in */
```

## 5. Dark mode wiring

Theme = `dark` class on `<html>` (`:root.dark`), which flips every token in
`tokens.css`. Three globals ride along:

```css
:root.dark { color-scheme: dark; }  /* native controls (unchecked boxes, */
                                    /* selects, scrollbars) render dark — */
                                    /* without this they glow white */
:root.dark .logo-img { filter: invert(1); }      /* black wordmark → white */
:root.dark input[type="checkbox"] { accent-color: var(--text-tertiary); }
```

## 6. RTL

Beyond the scrollbar flip above, code never mirrors:

```css
[dir="rtl"] pre,
[dir="rtl"] code,
[dir="rtl"] .font-mono {
  direction: ltr;
  text-align: left;
}
```

Components use logical utilities (`text-start`, `-end-0.5`, `ps-*`/`pe-*`) and
`<bdi dir="ltr">` around composed numeric runs ("p.15 · 2×") so the shell flips
from `dir` alone.

## 7. Motion — the signature easings

Component animations live with their components, but the FEEL is carried by two
shared curves and a rule:

- **Springy settle** — `cubic-bezier(0.34, 1.4, 0.5, 1)` (and the close
  variants `1.45`, `(0.22, 1, 0.36, 1)`): slight overshoot, used for the
  Beacon pill morph, modal entrances, content settle-in. Durations 0.22–0.46s.
- **Plain ease-out fades** — 0.15–0.28s for entrances (`fade-in-up` 4px rise,
  toast slide-in). Nothing decorative lasts longer than half a second.
- **`prefers-reduced-motion: reduce` disables ALL of it** — every keyframe
  class has a media block zeroing the animation, not just slowing it. New
  animations must add theirs.

## 8. Checklist for a faithful port

1. Radii ramp (§1) — before any component.
2. Fonts self-hosted + smoothing (TYPOGRAPHY.md).
3. Semantic tokens + `.dark` flip (`uwazi-semantic-tokens.css`).
4. `color-scheme: dark` on the dark root.
5. Thin token-coloured scrollbars.
6. `cursor: pointer` on enabled buttons.
7. `overscroll-behavior: none` on the shell if the layout is pane-scrolled.
8. Reduced-motion blocks alongside any animation you copy.
