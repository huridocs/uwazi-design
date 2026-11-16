# Uwazi settings inventory (real app)

Phase 1 of the settings deep dive. Read-only research; no prototype code changed.

## Source and method

- Source: public repo `huridocs/uwazi`, branch **`production`** (the branch exists, no fallback to the default branch was needed), shallow clone at `/Users/juanmnl/Developer/huridocs/uwazi-ref`, HEAD `731145c` (2026-10-02, "Bump version"), `package.json` version **1.229.224**.
- Everything was read from code. Nothing was run and no live server was contacted. Items are tagged VERIFIED (read in code), INFERRED or ASSUMED (read but not run) inside the page sections.
- Paths are repo-relative to `uwazi-ref` (for example `app/react/Routes.tsx:324`). Line numbers refer to HEAD `731145c`.
- The inventory was assembled from five page-group write-ups (Parts 1 to 5, kept in `parts/`) plus the cross-cutting section (Part 0). Page sections use the same ten headings: Route / file, Who can see it, Layout, Fields, Actions, Confirmations, Empty / loading / error / notification states, Save model, V1 vs V2, Notes.

## What the repo looks like today

- All settings pages are **V2** (React Router data routes, Jotai atoms, `apiClient`, Tailwind). No V1 settings UI remains. `app/react/Settings/` holds only `SettingsAPI.ts`, a redux reducer set and `components/relV2MigrationDashboard.tsx`; `app/react/Users`, `Thesauri`, `RelationTypes`, `Templates`, `Pages` hold only API stubs, redux actions or orphaned files. See each page's "V1 vs V2" line.
- The backend was moved into a hexagonal layout: use cases in `app/api/core/application/*.ts`, controllers and routes in `app/api/core/infrastructure/express/*`, domain classes in `app/api/core/domain/*`. `app/api/settings`, `app/api/templates`, `app/api/thesauri` and `app/api/relationtypes` no longer exist as top-level directories. A Postgres datasource exists next to the Mongo one for several modules (`app/api/core/infrastructure/postgresql/`: settings, template, thesaurus, relationshipType, translation, user, page, entity, files and others), selected by the `postgresCore` feature flag (`app/api/core/libs/featureFlags.ts`, `transactionManagerFactories.ts`). Behaviour described in this inventory is the same on both datasources as far as the use cases go; datasource differences were not audited.
- The router mounts everything under `/settings` in one block: `app/react/Routes.tsx:324-516`.

## Public demo instance

- HURIDOCS runs a public demo at **https://demo.uwazi.io/**. It is reached from the "Uwazi demo" page on `https://www.uwazi.io/uwazi-demo/`. Source: HURIDOCS blog post of 5 September 2018 (`https://huridocs.org/?p=1587`) and a search result for `demo.uwazi.io`.
- The demo page publishes three logins, one per role (admin, editor, collaborator), and states that the collection resets to its original state every few hours. The credentials are public on that page; they are not repeated here and nothing was logged in to.
- Consequence for design work: the demo is the only place to see the real Settings UI of an admin without a self-hosted install. Whether the demo runs the latest `production` build was not checked.
- The marketing site (`https://www.uwazi.io/`) links to "Book a demo" and "See how it works", not to a live instance.

## Page index

Route guard column: `admin` = `adminsOnlyRoute`, `admin+editor` = `ProtectedRoute allowedRoles={['admin','editor']}`, `any` = `loggedInUsersRoute` only. All guards redirect to `/login` on failure (`app/react/ProtectedRoute.tsx:6-34`). Server column is the default `needsAuthorization()` role set (`['admin']` unless listed) from `app/api/auth/authMiddleware.ts:14-24`; details per endpoint are in the page sections.

| Page | Route | Nav label (section) | Route guard | Extra gate | Part |
|---|---|---|---|---|---|
| Account | `/settings/account` | Account (Settings) | any | none | 1 |
| Dashboard | `/settings/dashboard` | Dashboard (Settings) | admin | none | 1 |
| Users & Groups | `/settings/users` | Users & Groups (Settings) | admin | none | 1 |
| Collection | `/settings/collection` | Collection (Settings) | admin | `themeCustomization` tenant flag shows the theming controls | 1 |
| Menu | `/settings/navlinks` | Menu (Settings) | admin | none | 1 |
| Pages list, new, edit | `/settings/pages`, `/pages/new`, `/pages/edit/:sharedId?` | Pages (Settings) | admin | none | 2 |
| Data visualizations | `/settings/dataviz`, `/dataviz/new`, `/dataviz/edit/:id` | Data visualizations (Settings) | admin | none | 2 |
| Languages | `/settings/languages` | Languages (Settings) | admin | none | 4 |
| Translations | `/settings/translations`, `/translations/edit/:context` | Translations (Settings) | admin | none | 4 |
| Filters | `/settings/filters` | Filters (Settings) | admin | none | 3 |
| Templates list, editor | `/settings/templates`, `/templates/new`, `/templates/edit/:templateId` | Templates (Metadata) | admin | none | 3 |
| Thesauri list, editor | `/settings/thesauri`, `/thesauri/new`, `/thesauri/edit/:_id` | Thesauri (Metadata) | admin | none | 4 |
| Relationship types | `/settings/relationship-types` | Relationship types (Metadata) | admin | none | 4 |
| Metadata extraction (IX) | `/settings/metadata_extraction`, `/suggestions/:extractorId` | Metadata Extraction (Metadata) | admin+editor | nav link behind `features['metadata-extraction']` | 5 |
| Paragraph extraction | `/settings/paragraph-extraction`, `/:extractorId/entities`, `/:extractorId/entities/:sharedId/paragraphs` | Paragraph Extraction (Metadata) | admin+editor | nav link behind `features.paragraphExtraction` | 5 |
| Preserve | `/settings/preserve` | Preserve (Tools) | admin | nav link behind `features['preserve.host']` | 2 |
| New Relationships Migration | `/settings/newrelmigration` | New Relationships Migration (Tools) | **none** (route only checks the feature key) | `features.newRelationships` | 5 |
| Activity log | `/settings/activitylog` | Activity log (Tools) | admin | none | 2 |
| Global CSS (& JS) | `/settings/customisation` | "Global CSS" or "Global CSS & JS" (Tools) | admin | label depends on `allowcustomJS` | 2 |
| Uploads | `/settings/custom-uploads` | Uploads (Tools) | admin | none | 2 |
| Import CSV | `/settings/csv`, `/settings/csv/:entry` | Import CSV (Tools) | admin | none | 2 |
| Uwazi Docs | external `https://docs.uwazi.io` | Uwazi Docs (Tools) | n/a | opens in a new tab | n/a |

Navigation file: `app/react/V2/Routes/Settings/SettingsNavigation.tsx:21-137`. Notes on the nav:

- Three groups: **Settings**, **Metadata** (heading shown to admin and editor), **Tools**. The "Tools" heading is shown to every logged-in user, because only the links inside it are wrapped in `NeedAuthorization`; an editor or collaborator sees "Tools" with only "Uwazi Docs" under it (SettingsNavigation.tsx:84-136).
- Items hidden by `FeatureToggle` read `settings.features`, which the server sends **to admins only** (`app/api/core/application/settings/publicSettings.ts:34-44`). An editor therefore probably never sees the Metadata Extraction and Paragraph Extraction links even though both routes allow editors (VERIFIED in code, not run).
- The Settings shell is a left rail (`min-w-[250px]`) plus an outlet. Below `md` the rail is the page when no child route is open, and each child page shows a back chevron in its header (`app/react/V2/Routes/Settings/Settings.tsx:11-27`, `app/react/V2/Components/Layouts/SettingsContent.tsx:57-86`).
