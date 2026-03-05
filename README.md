# Uwazi 2026

Design system, screens, and rebrand assets for Uwazi v2.

Open `.pen` files with [Pencil](https://pencil.gg).

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
│   ├── brand-colors.md         # Palette, variables, accent usage
│   ├── design-system.md        # Tokens (colors, type, spacing, shadows)
│   ├── components.md           # Recurring UI patterns
│   ├── screens.md              # Screen index with IDs
│   ├── uwazi-product.md        # Product context
│   └── uwazi-navigation.md     # Routes and navigation
└── README.md
```

## Sections

| Folder | Status |
|---|---|
| `ui/entity-view/` | In progress — document, files, relationships, audio, references |
| `ui/tools/` | In progress — import CSV |
| `ui/library/` | — |
| `ui/settings/user/` | — |
| `ui/settings/system/` | — |

## Brand Palette

| Name | Hex | Role |
|---|---|---|
| Ink | `#1A1A1A` | The letterpress — text, headers, primary buttons |
| Seal | `#E8432A` | The stamp — danger, alerts, actions |
| Carbon | `#00B4F0` | The copy — links, data, processing |
| Vellum | `#F5EED7` | Warm stock — muted backgrounds, hover states |
| Parchment | `#F5F0E8` | Cool stock — page grounds |
| Paper | `#FFFFFF` | The margin — cards, modals, open space |

See [`docs/brand-colors.md`](docs/brand-colors.md) for full variable mapping and usage guidelines.
