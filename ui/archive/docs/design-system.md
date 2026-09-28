# Uwazi Design System

## Color Variables (from .pen file)
All colors have two theme values (light variant 1, light variant 2).

| Variable | Value 1 | Value 2 | Usage |
|---|---|---|---|
| `$accent-primary` | `#5145CD` | `#3730A3` | Primary actions, active sidebar items, links, CTA buttons |
| `$accent-blue` | `#1A56DB` | `#4F46E5` | Secondary accent |
| `$bg-primary` | `#FAFAFA` | `#F8FAFC` | Page background |
| `$bg-surface` | `#FFFFFF` | `#FFFFFF` | Cards, navbar, sidebar, modals |
| `$bg-muted` | `#F9FAFB` | `#F1F5F9` | Muted backgrounds, stat rows, dropzone |
| `$border-primary` | `#E5E7EB` | `#E2E8F0` | All borders (cards, dividers, inputs) |
| `$text-primary` | `#111928` | `#0F172A` | Headings, main text, navbar brand |
| `$text-secondary` | `#374151` | `#334155` | Body text |
| `$text-tertiary` | `#6B7280` | `#64748B` | Labels, section titles, breadcrumb inactive |
| `$text-muted` | `#9CA3AF` | `#94A3B8` | Placeholders, close icons |

## Hardcoded Colors (used inline)
| Color | Usage |
|---|---|
| `#FFFFFF` | Button text on filled buttons |
| `#1F2A37` | Secondary button text/icons (back, cancel) |
| `#E5E7EB` | Secondary button border |
| `#C81E1E` | Danger/delete button background |
| `#EBE9F7` | Active sidebar item background |
| `#EEF2FF` | Selected row highlight, selection action bar bg |
| `#F9FAFB` | Dropzone bg, stat bar bg |
| `#D1D5DB` | Dropzone dashed border |
| `#00000066` | Modal overlay |
| `#00000033` | Modal shadow color |
| `#0000001A` | Card shadow color |

## Typography
- **Font families**: `Inter` (UI), `Roboto Mono` (brand/logo)
- **Brand**: "UWAZI" — Roboto Mono, 16px, weight 700, fill `$text-primary`
- **Page title**: Inter, 20px (inferred from hierarchy)
- **Modal title**: Inter, 18px, weight 600
- **Section labels**: Inter, 14px, weight 500, fill `$text-tertiary`
- **Body / sidebar items**: Inter, 14px, weight 500, fill `$text-primary`
- **Button text**: Inter, 14px, weight 500
- **Small text (breadcrumbs)**: Inter, 14px, weight 500
- **Stat numbers**: Inter, large (24-28px range, weight 600)
- **Delete button small**: Inter, 12px, weight 500

## Spacing
| Context | Value |
|---|---|
| Navbar height | 64px |
| Navbar padding | `[0, 20]` (vertical 0, horizontal 20) |
| Sidebar width | 250px |
| Sidebar padding | `[16, 12, 40, 12]` (top, right, bottom, left) |
| Sidebar section gap | 16px |
| Sidebar item padding | 8px |
| Sidebar list gap | 6px |
| Content area padding | 16px |
| Content gap | 16px |
| Card corner radius | 8px |
| Modal corner radius | 12px |
| Button corner radius | 8px |
| Active sidebar item radius | 6px |
| Button padding | `[8, 20]` (vertical 8, horizontal 20) |
| Small button padding | `[8, 12]` |
| Dialog header padding | `[20, 24]` |
| Dialog body padding | 24px |
| Dialog body gap | 20px |
| Dialog footer padding | 16px |
| Dialog footer gap | 16px |
| Action bar height | 58px |
| Action bar padding | `[0, 20]` |
| Table header padding | 16px |
| Table footer height | 50px |
| Table footer padding | `[0, 20]` |
| Stat bar padding | `[12, 20]` |
| Stat bar gap | 24px |
| Detail header padding | `[20, 24]` |
| Detail body padding | 24px |

## Icons
- **Icon library**: Lucide
- **Navbar**: `menu` (20x20), `book-open` (24x24), `settings` (24x24)
- **Modal**: `x` (20x20), `cloud-upload` (36x36), `upload` (16x16)
- **Navigation**: `chevron-right` (16x16), `arrow-left` (16x16)
- **Danger**: `trash-2` (16x16)

## Shadows
| Context | Definition |
|---|---|
| Card (single) | `blur: 3, color: #0000001A, offset: {x:0, y:1}` |
| Card (double) | Above + `blur: 2, color: #0000001A, offset: {x:0, y:1}, spread: -1` |
| Modal | `blur: 24, color: #00000033, offset: {x:0, y:4}` |
| Dropdown | `blur: 12, color: #0000001A, offset: {x:0, y:4}` |

## Borders
- Default: `$border-primary`, 1px, align inside
- Dropzone: `#D1D5DB`, 2px dashed
- Secondary button: `#E5E7EB`, 1px
- Directional borders used for dividers (bottom on navbar, right on sidebar, top on action bar, bottom on headers)
