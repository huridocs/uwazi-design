# Uwazi 2026

Design system, screens, and rebrand assets for Uwazi v2.

## Setup — Pencil

`.pen` files are edited with [Pencil](https://pencil.dev), a design canvas that runs inside your IDE.

### Install the extension

1. Open **VS Code** or **Cursor**
2. Go to Extensions (`Cmd + Shift + X`)
3. Search for **"Pencil"** → Install
4. Create or open any `.pen` file — look for the Pencil icon in the top-right editor corner

### Install Claude Code (required for AI features)

```bash
npm install -g @anthropic-ai/claude-code
```

Run `claude` and follow the auth flow. The Pencil MCP server connects automatically — no extra config needed.

Verify in Cursor: **Settings → Tools & MCP** → check Pencil is listed.

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
