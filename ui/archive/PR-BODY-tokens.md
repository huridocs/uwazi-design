# PR: Add semantic design-token layer (Uwazi 2026 palette)

> Ready-to-use body for the tokens PR against `huridocs/uwazi`. The commit is
> staged in the validation clone (`feat/semantic-design-tokens`, 2 files, +164)
> — or recreate it anywhere by copying `uwazi-semantic-tokens.css` to
> `app/react/App/styles/semantic-tokens.css` and appending
> `@import './semantic-tokens.css';` to `app/react/App/styles/tailwind.css`
> (append at the END — the bridges must come after the existing `@theme`'s
> `--color-*: initial` wipe).
>
> To publish from the clone:
> ```sh
> cd <clone>/uwazi-real
> git push -u origin feat/semantic-design-tokens
> gh pr create --repo huridocs/uwazi --draft --base production \
>   --title "Add semantic design-token layer (Uwazi 2026 palette)" \
>   --body-file <uwazi_app>/handoff/PR-BODY.md
> ```

---

Adds the 2026 prototype's semantic token layer as a purely additive stylesheet:
real light/dark CSS vars scoped to `.tw-content`, plus `@theme` bridges that
generate semantic utilities (`bg-parchment`, `bg-paper`, the `text-ink` ladder,
`border-border`, carbon/seal accents, status tints).

**No visual change to anything currently rendered.** The existing numeric ramps
(`primary-*`, `error-*`, …) are untouched; the compiled `globals.css` diff is
purely additive (0 lines removed, +471). Verified by building with
`yarn tailwind` on a fresh `production` checkout.

**It fixes live undefined utilities**: the V2 Dataviz components
(`DatavizEditor`, `DatavizChartView`, the embeds) already reference
`bg-parchment` / `text-ink`, which currently compile to nothing. With this
layer those classes resolve to the intended palette.

**Conventions that come with the layer** (full mapping + migration plan:
`uwazi_app` repo → `handoff/TOKENS-MAPPING.md`):
- New/migrated components use the semantic names; ramps retire gradually.
- Raw `var(...)` in CSS/inline styles must reference the REAL vars
  (`--text-primary`, `--bg-surface`, …) — never the `--color-*` bridges, and
  never with a hex fallback (it silently breaks dark mode).
- Dark mode: the vars flip under `.tw-content.dark` / `.tw-content .dark` —
  wire to the V2 ThemeProvider mode; `dark:` variants should stay rare.
- A commented opt-in block scales the `rounded-*` ramp (~½ Tailwind default);
  it changes every radius in the app, so it ships as its own reviewed step.
