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
    // Leaflet and leaflet.markercluster are only reachable through the lazy
    // `import()`s of the map views, so whether they land in the first optimize
    // pass depends on the scanner following those dynamic imports. When it
    // doesn't, opening the first map makes Vite re-optimize and force a full
    // reload, racing the render already in flight. (react-simple-maps, the map
    // library before Leaflet, crashed the app outright this way: its chunk pulled
    // a second pre-bundle of React.) markercluster patches the `L` that leaflet
    // exports, so both must come from the same pre-bundle pass.
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
      "leaflet",
      "leaflet.markercluster"
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