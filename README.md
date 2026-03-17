# Uwazi 2026

Design system, screens, and rebrand assets for Uwazi v2.

## Setup — Pencil

`.pen` files are edited with [Pencil](https://pencil.dev), a design canvas that runs inside your IDE.

### Install the extension

1. Open **VS Code** or **Cursor**
2. Go to Extensions (`Cmd + Shift + X`)
3. Search for **"Pencil"** → Install
4. Create or open any `.pen` file — look for the Pencil icon in the top-right editor corner

### AI features (optional)

Pencil exposes an MCP server that AI coding agents can use to read and write `.pen` files. It connects automatically — no extra config needed. Check your IDE's MCP/tools settings to verify Pencil is listed.

## Structure

```
.
├── ui/                         # All design files
│   ├── entity-view/            # Entity viewer screens
│   ├── library/                # Library & search
│   ├── tools/                  # Admin tools (import CSV, activity log, etc.)
│   ├── settings/
│   │   ├── user/               # User preferences
│   │   └── system/             # System configuration
│   └── archive/                # Previous iterations
├── app/                        # Lightweight frontend prototype (Vite + React)
│   ├── src/
│   │   ├── components/         # Layout, viewer, references, shared
│   │   ├── atoms/              # Jotai state (references, selection, filters)
│   │   ├── data/               # Mock entities, documents, references
│   │   └── views/              # Page-level views and modals
│   └── public/                 # Static assets (sample.pdf, logos)
├── images/                     # Shared assets (referenced by .pen files)
├── docs/                       # Rebrand guides & design documentation
└── README.md
```

## Screens

| Section | File | Screens |
|---|---|---|
| Entity View | `ui/entity-view/entity-view.pen` | Document, Files (Table, Split Selected, Split Supporting, Split Multi, Table Selected, Table Multi-select), drawer |
| Import CSV | `ui/tools/import-csv.pen` | Empty State, New Import Modal (3 states), List, List Selected, Detail, Detail Uploading, Detail Processing, Detail Failed, Detail Warnings, Detail Mixed |

See [`docs/screens.md`](docs/screens.md) for full screen index with node IDs and layout details.

## Branding

### Logo & Icons

| Asset | Preview | File |
|---|---|---|
| Wordmark | ![Wordmark](images/nu-logo.png) | `images/nu-logo.png` / `.svg` |
| App icon (dark) | ![Icon](images/icon.png) | `images/icon.png` |
| App icon (light) | ![Icon white](images/icon-white.png) | `images/icon-white.png` |
| Symbol | ![Symbol](images/logo_sym.png) | `images/logo_sym.png` |

Navbar wordmark: **73 x 18**. Wordmark is the default — symbol only where space is constrained. Seal square always above Carbon.

### Palette

| Name | Hex | Role |
|---|---|---|
| Ink | `#1A1A1A` | The letterpress — text, headers, primary buttons |
| Seal | `#E8432A` | The stamp — danger, alerts, actions |
| Carbon | `#00B4F0` | The copy — links, data, processing |
| Vellum | `#F5EED7` | Warm stock — muted backgrounds, hover states |
| Parchment | `#F5F0E8` | Cool stock — page grounds |
| Paper | `#FFFFFF` | The margin — cards, modals, open space |

See [`docs/brand-colors.md`](docs/brand-colors.md) for full rebrand guide — variable mapping, accent usage, and design decisions.

## Prototype

Lightweight frontend for testing interactions. Vite + React 18 + TypeScript + Tailwind v4 + Jotai. All mock data, no backend.

### Quick start

```bash
cd app
npm install
npm run dev        # → http://localhost:5173
```

### Features

- **Layout** — navbar, main tabs (Metadata, Document, References, Relationships, Files), doc meta bar, resizable split view with drawer
- **Document viewer** — PDF rendering with continuous scroll, page navigation (Previous/Next), OCR button
- **Text References** — highlight overlays (`mix-blend-mode: darken`), floating menu on text selection, entity picker modal (search → relation type → create), bidirectional navigation (highlight ↔ panel), delete with confirmation
- **Reference panel** — search, sort (A→Z / Z→A), filter toggles (All / Entity type / Rel. type), grouped cards with collapse/expand all
- **Files management** — dual tables (primary document + translations, supporting files), row selection with blue accent, file metadata drawer, bulk actions
- **Shared** — toast notifications, entity pills, page tags, confirm dialogs
