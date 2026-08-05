/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { storybookTest } from '@storybook/addon-vitest/vitest-plugin';
import { playwright } from '@vitest/browser-playwright';
const dirname = typeof __dirname !== 'undefined' ? __dirname : path.dirname(fileURLToPath(import.meta.url));

// More info at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon
export default defineConfig({
  // GitHub Pages serves a project site from a SUBPATH (/uwazi-design/), so the
  // build needs to know its base. Dev and any root-hosted deploy stay at "/".
  // Everything under public/ resolves through `utils/asset.ts`, which reads the
  // same value back out of import.meta.env.BASE_URL.
  base: process.env.VITE_BASE ?? "/",
  plugins: [react(), tailwindcss()],
  resolve: {
    // ONE React, whoever is resolving. Both the app and Storybook have hit the
    // same failure — a null hook dispatcher ("Cannot read properties of null
    // (reading 'useState'/'useMemo')") thrown from inside a dependency, because
    // two pre-bundles of React existed and the component got the one the
    // renderer wasn't driving. `dedupe` makes a bare `react` import resolve to a
    // single copy no matter which config or cache asked for it.
    //
    // It is insurance, not a cure: it prevents a second copy being RESOLVED, and
    // cannot stop a page that is already loaded from holding `?v=` URLs minted
    // before a re-optimization. What prevents that is a complete FIRST optimize
    // pass — see `optimizeDeps.include` below.
    dedupe: ["react", "react-dom"],
  },
  optimizeDeps: {
    // Pre-bundle these EXPLICITLY rather than leaving them to the dep scanner.
    //
    // `react-simple-maps` is only reachable through the lazy `import()` in
    // LibraryView, so whether it lands in the first optimize pass depends on the
    // scanner following that dynamic import. When it doesn't, the Map view's
    // chunk pulls a SECOND pre-bundle of React, hooks run against a null
    // dispatcher, and the whole app blanks with "Invalid hook call" /
    // "Cannot read properties of null (reading 'useMemo')" from inside
    // react-simple-maps' own MapProvider — a crash that looks like our
    // cluster-pin code and isn't. Vite's recovery (re-optimize, then force a
    // full reload) also races the render that is already in flight.
    //
    // One entry is enough, verified rather than guessed: on a cold start with a
    // cleared node_modules/.vite, the optimizer emits exactly 11 entries and
    // d3-geo/d3-selection/d3-zoom/topojson-client are all INLINED into the
    // react-simple-maps bundle. Listing them separately would split them back
    // out into their own chunks, which is the opposite of what this fixes.
    // `world-atlas/countries-110m.json` never appears — it's a JSON asset, not
    // a dep.
    //
    // The React core is listed EXPLICITLY even though the scanner finds it
    // anyway. This config is also what Storybook builds with (see
    // `.storybook/main.ts`), and Storybook keeps its own dep cache under
    // node_modules/.cache/storybook. Two caches discovering React independently
    // is how one of them ends up holding an instance that predates a new story
    // file: adding the file triggers a re-optimize, the already-loaded iframe
    // keeps the old `?v=` URLs, and hooks run against a dispatcher belonging to
    // the copy that isn't rendering. Pinning the core into the first pass on
    // both sides removes the discovery step that makes the two drift.
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react-pdf",
      "react-simple-maps"
    ]
  },
  test: {
    projects: [{
      extends: true,
      plugins: [
      // The plugin will run tests for the stories defined in your Storybook config
      // See options at: https://storybook.js.org/docs/next/writing-tests/integrations/vitest-addon#storybooktest
      storybookTest({
        configDir: path.join(dirname, '.storybook')
      })],
      test: {
        name: 'storybook',
        browser: {
          enabled: true,
          headless: true,
          provider: playwright({}),
          instances: [{
            browser: 'chromium'
          }]
        }
      }
    }]
  }
});