/** Resolve a public/ asset against the app's base path.
 *
 *  On GitHub Pages the app is served from a SUBPATH (`/uwazi-design/`), so a
 *  hardcoded `/docs/foo.pdf` 404s — it resolves against the domain root, not the
 *  app. Vite hands us the base in `import.meta.env.BASE_URL` ("/" in dev, the
 *  subpath in a Pages build); everything under public/ has to go through here.
 *
 *  The CEJIL loader already did this by hand. This is the same rule, once. */
export const asset = (path: string): string =>
  `${import.meta.env.BASE_URL}${path.replace(/^\//, "")}`;
