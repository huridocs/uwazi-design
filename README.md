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

## Prototype — Text References

A lightweight frontend prototype for testing Text References interactions. Not a full Uwazi clone — just enough to experiment with text selection, reference creation, highlight navigation, and filtering.

### Stack

| | |
|---|---|
| **Bundler** | Vite |
| **UI** | React 18 + TypeScript |
| **Styling** | Tailwind v4 + CSS variables (brand tokens) |
| **State** | Jotai |
| **PDF** | react-pdf (pdfjs-dist) |
| **Icons** | Lucide React |

### Quick start

```bash
cd app
npm install
npm run dev        # → http://localhost:5173
```

Drop any PDF into `app/public/sample.pdf` — the viewer loads it with continuous scroll, page tracking, and highlight overlays.

### What's included

- **Document viewer** — PDF rendering, continuous scroll, page navigation (Previous/Next), zoom
- **Highlight overlays** — yellow rectangles on referenced passages, `mix-blend-mode: darken`
- **Floating menu** — appears on text selection with "Create Reference" action
- **Entity picker modal** — two-step flow: search entities → choose relation type → create
- **Reference panel** — drawer with search, sort (A→Z / Z→A), filter toggles (All / Entity type / Rel. type), grouped cards with collapse/expand
- **Bidirectional navigation** — click highlight → scroll to ref in panel; click ref → scroll to page
- **Delete confirmation** — modal with danger variant
- **Toast notifications** — success/error feedback
- **Layout** — matches `.pen` designs: navbar, main tabs, doc meta bar, split view with resizable drawer

### What it's NOT

- No backend/API — all mock data in TypeScript files
- No authentication, entity editing, library search, or SSR
- Client-only SPA for interaction testing
