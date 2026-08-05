import type { StorybookConfig } from '@storybook/react-vite';

/**
 * NO `viteFinal` ON PURPOSE.
 *
 * `@storybook/react-vite` loads and merges the project's own `vite.config.ts`,
 * so the app's `resolve.dedupe` and `optimizeDeps.include` already apply here —
 * verified, not assumed: no story imports `LibraryView`/`LibraryMapView`, yet
 * `react-simple-maps` appears in Storybook's dep cache, which it can only get
 * from the app config's `include`.
 *
 * That makes ONE config the source of truth for both builders. Adding a
 * `viteFinal` that re-declares `optimizeDeps` here would REPLACE that array
 * rather than extend it, silently dropping the app's entries and reintroducing
 * exactly the divergence that lets one cache hold a stale React. If something
 * genuinely Storybook-only is ever needed, merge into the incoming config
 * (`{...cfg, optimizeDeps: {...cfg.optimizeDeps, include: [...(cfg.optimizeDeps?.include ?? []), …]}}`)
 * rather than assigning over it.
 *
 * Storybook still keeps its own cache (node_modules/.cache/storybook). After
 * changing vite.config.ts or adding a dependency, delete it — a cache built
 * against the previous config is the one failure this file can't prevent.
 */
const config: StorybookConfig = {
  "stories": [
    "../src/**/*.mdx",
    "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"
  ],
  "addons": [
    "@chromatic-com/storybook",
    "@storybook/addon-vitest",
    "@storybook/addon-a11y",
    "@storybook/addon-docs",
    "@storybook/addon-mcp"
  ],
  // The app's public assets, so stories that render real documents (PdfPageThumb)
  // get the same files the app does rather than a permanent blank sheet.
  "staticDirs": ["../public"],
  "framework": "@storybook/react-vite"
};
export default config;