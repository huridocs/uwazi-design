# Uwazi issue 9884: Entity View V2 geolocation map prints over the page

Source: huridocs/uwazi, branch `production`, commit ebba4d1e (2026-10-25). Read from a scratch clone and `gh api`; nothing was rendered or run. The issue is open, has no PR, and has one comment: "This looks like printing CSS for the entity view."

## 1. Map library

Leaflet 1.9.4 with `leaflet.markercluster` 1.5.3 and `leaflet.gridlayer.googlemutant` for Google tiles (`package.json:215-217`). It is plain Leaflet, not react-leaflet, Mapbox GL or MapLibre. Mapbox is only a raster tile provider (`tilesProvider` default `'mapbox'`, `app/react/Map/MapContainer.tsx:27`).

Chain from the V2 metadata field down to Leaflet:
- `app/react/V2/Components/Metadata/Components/metadataFieldContent.tsx:78-88`: `data.type === 'geolocation'` renders `<Geolocation>`.
- `app/react/V2/Components/Metadata/Components/Geolocation.tsx:50-66`: wrapper markup, then `<Map>`.
- `app/react/Map/index.tsx:7-13`: `Map` from `MapContainer.tsx`; `LMap` is lazy-loaded (chunk `LazyLoadMap`).
- `app/react/Map/MapContainer.tsx:61-67`: wraps `<LMap>` in an ErrorBoundary.
- `app/react/Map/LMap.tsx:117`: `Leaflet.map(containerId, …)`.
- `app/react/Map/LMapSetup.ts:31-56`: adds the controls.

The same `LMap` serves the legacy V1 entity viewer, the Library map and the Markdown map. A global `.leaflet-container` print rule therefore also reaches those, but V1 already hides its map (see 3).

## 2. Markup and class names

DOM, outermost first (V2 Geolocation, `Geolocation.tsx:51-53` and `LMap.tsx:190-196`):
- `div.flex.w-full.min-w-0.flex-col.gap-1.5`
- `div.w-full.min-w-0.overflow-hidden.rounded-md.[&_.map-container]:h-auto`
- `div.map-container[data-testid="map-container"]` (`LMap.tsx:190`)
- `div#<uniqueID>.leafletmap` with inline `width:100%; height:<props.height>px` (`LMap.tsx:191-195`; height defaults to 220 at `Geolocation.tsx:42`, 160 when `compact`). Leaflet adds `.leaflet-container` to this div.

Leaflet's own classes:
- Panes: `.leaflet-pane.leaflet-map-pane`, `.leaflet-tile-pane`, `.leaflet-tile-container`, `.leaflet-marker-pane`, `.leaflet-overlay-pane`.
- Control container: `.leaflet-control-container`, holding `.leaflet-top/.leaflet-bottom` × `.leaflet-left/.leaflet-right`.
- Zoom: `.leaflet-control-zoom.leaflet-bar.leaflet-control`, added at `LMapSetup.ts:46` only when `showControls` (default true; V2 passes `false` when `compact`, `metadataFieldContent.tsx:83`).
- Layers: `.leaflet-control-layers.leaflet-control`, added at `LMapSetup.ts:48-52` only with `showControls` and more than one base layer.
- Attribution: `.leaflet-control-attribution.leaflet-control`, always added (`LMapSetup.ts:42-44`) with a custom innerHTML (Mapbox text plus "Improve this map" link, `LMapSetup.ts:78`).
- Extra rules: `app/react/App/scss/elements/_geolocation.scss:31-46` (`.map-container`, `.leafletmap` is `position: relative`, `.leaflet-top/.leaflet-bottom` get `z-index: 4`) and `elements/_map.scss:1-4` (`direction: ltr`).
- Inline styles from code: `LMap.tsx:121` sets `mapPane.style.zIndex = '0'`; Leaflet sets `position: relative` inline on the container when it is not already positioned (Leaflet `Map.js:1113-1116`).
- Options: `preferCanvas: true`, `zoomControl: false` (custom zoom is added instead), `dragging: false` (`LMap.tsx:65-80`).

## 3. Print CSS today

The only print CSS in the repo is `app/react/App/scss/layout/_print.scss` (one `@media print` block, lines 1-90), pulled in by `scss/styles.scss:41`; `elements/map` is `@use`d earlier at line 24. `App.jsx:27-28` loads `tailwind.css` and `styles.scss` for every route, so V2 gets it.

No `@media print`, no `@page` and no Tailwind `print:` variant exists anywhere else under `app/react` or `app/shared`. Leaflet's own CSS has a print block, but it only sets `print-color-adjust` on `.leaflet-control`.

Relevant rules in `_print.scss`:
- Lines 11-13: `div { overflow: visible !important; }`. This is the probable cause. It matches every div, including the `.leafletmap` div that Leaflet turns into `.leaflet-container`, and it beats Leaflet's `.leaflet-container { overflow: hidden }` and the Tailwind `overflow-hidden` wrapper (`Geolocation.tsx:52`). The absolutely positioned tile panes (translated by the map pane) then paint outside the 220px box. Not rendered to confirm, but the cascade is unambiguous.
- Lines 6-9: `#app { width: 100%; height: 100% }`.
- Lines 62-84 `.entity-viewer { … .map-container { display: none } … }`: the legacy answer, which hides the map in print. In V2 the class `entity-viewer` appears only at `Routes/Entity/Components/EntityPageView/EntityPageViewer.tsx:65` (the published page view). The metadata tab has no `.entity-viewer` ancestor, so the rule does not reach it.
- Lines 35-40: hides `header`, `.side-panel`, `.sidepanel-footer`, `.ContextMenu-bottom`. Nothing targets V2 tabs, the pane divider or the side pane.

## 4. V2 entity view layout

Tailwind v4 utility classes (`^4.3.3`; `tailwind.config.js` plus `app/react/App/styles/tailwind.css`), with legacy SCSS on the shell. The shell is `#app` (flex column, `height: 100vh`, `overflow: hidden`, `scss/layout/_app.scss:7-15`), then `div.content`, then `main#main.app-content`, then V2 content inside `ThemeProvider` (`App.jsx:91-121`).

Route body (`app/react/V2/Routes/Entity/Entity.tsx`):
- `EntityRouteBody` (lines 207-223): `div#entity-view-<tab>.template_<id>.flex.h-full.min-h-0.flex-col`. The id is `entity-view-metadata` / `-document` / `-relationships` / `-files` / `-published`.
- `EntityView` (lines 152-168): `PaneLayout` with two panes, `defaultRatios [0.637, 0.363]`.
- Desktop `PaneLayoutDesktop.tsx:23-34`: `div.flex.h-full.min-h-0.overflow-hidden` holding `section[style=width]` per pane, each with `div.h-full.min-h-0.min-w-0.overflow-hidden`. Mobile uses `PaneLayoutMobile`.
- `EntityMainColumn` (`Entity.tsx:80-83`): `div[data-testid="entity-v2"].flex.h-full…overflow-hidden.bg-paper`, tab strip and header in a `shrink-0` block, then the content in `flex min-h-0 flex-1 flex-col overflow-hidden`.
- Metadata tab: `Tabs/MainTabsContent.tsx:94-103`, `div[role="tabpanel"]#entity-main-panel-metadata`, which contains `MetadataTab` (`Tabs/tabsContent/MetadataTab.tsx`) and then `MetadataRecord` (`Components/Metadata/MetadataRecord.tsx`). The record is also shown in the side pane (`SideTabsPanel`) and in the entity overlay.
- The geolocation field sits inside that record.

Stable hooks for a print rule: `#entity-view-metadata`, `[data-testid="entity-v2"]`, `[role="tabpanel"]`, and `.map-container[data-testid="map-container"]`. There are no semantic class names on the metadata container.

## Proposed fix: verdict

```css
@media print {
  .leaflet-container { position: relative; overflow: hidden !important; break-inside: avoid }
  .leaflet-control-zoom, .leaflet-control-layers { display: none }
}
```

Confirmed, with notes:
- Selectors are right for this library: `.leaflet-container`, `.leaflet-control-zoom` and `.leaflet-control-layers` exist as named (Leaflet 1.9.4 CSS and `LMapSetup.ts`).
- `overflow: hidden !important` is the part that fixes the bug. Both declarations are `!important`, so specificity decides: `.leaflet-container` (0,1,0) beats `div` (0,0,1), regardless of source order.
- `position: relative` is redundant. Leaflet sets it inline (`Map.js:1115-1116`) and `_geolocation.scss:36-37` sets it on `.leafletmap`. Harmless; drop it.
- `break-inside: avoid` is fine as a guard, but it works best on the block that holds the map, so put it on `.map-container` too.
- Do not hide `.leaflet-control-attribution`. Tile providers require the attribution, and nothing else in print covers it. Hiding the whole `.leaflet-control-container` would remove it.
- Where to put it: inside the existing `@media print` block of `app/react/App/scss/layout/_print.scss`, which is the only print stylesheet. An inline Tailwind alternative is `print:overflow-hidden!` on the wrapper at `Geolocation.tsx:52`, but that does not cover other `LMap` users.
- Side effect: `.leaflet-container` is global, so Library map, Markdown map and V1 are affected too. For V1 `.entity-viewer .map-container { display: none }` (`_print.scss:77`) keeps winning, so nothing changes there.

Open points (assumed, not verified):
- Whether tiles are loaded when the print dialog opens. Leaflet loads tiles for the current screen viewport only. If the print width is narrower, the container is clipped to the page width, which is fine. If it is wider, the missing tiles show as blank.
- The remaining print layout for V2. `#app` has `overflow: hidden` and `height: 100vh`, and the panes use `h-full overflow-hidden`; only `div` is forced visible. The `section` panes, the side pane and the tab strip are not hidden in print. The issue shows the map overlapping, but the rest of the page may also print as a single viewport-high sheet. That is a separate fix.

Alternative if you prefer the legacy behaviour: hide the map in print, `@media print { .map-container { display: none } }`. This is what V1 does at `_print.scss:77-79`. It loses the map on paper but cannot overflow.

## Recommendation

Add the proposed rules inside `@media print` in `app/react/App/scss/layout/_print.scss`, without `position: relative`, with `break-inside: avoid` on `.map-container` as well, and keep the attribution visible:

```scss
.map-container {
  break-inside: avoid;
}

.leaflet-container {
  overflow: hidden !important;
}

.leaflet-control-zoom,
.leaflet-control-layers {
  display: none;
}
```

Check it by printing a V2 entity with a geolocation property on the Metadata tab, and again with two geolocation properties (the legend row, `GeolocationLegend.tsx`, prints below the map).
