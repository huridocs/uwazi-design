# Uwazi — Navigation & Settings Structure

## Top-Level Routes

| Route | Description |
|-------|-------------|
| `/` | Landing page or library |
| `/login` | Authentication |
| `/library` | Main document library (cards) |
| `/library/map` | Library map view |
| `/library/table` | Library table view |
| `/document/:sharedId` | PDF document viewer |
| `/entity/:sharedId` | Entity viewer |
| `/page/:sharedId` | Custom static page |
| `/settings` | Settings/Admin panel |

## Settings Panel Layout
- Left sidebar: 250px, gray-50 bg, border-right
- Content area: flex-1, scrollable

## Settings Navigation

### Section 1: Settings
| Link | Route |
|------|-------|
| Account | `/settings/account` |
| Dashboard | `/settings/dashboard` |
| Users & Groups | `/settings/users` |
| Collection | `/settings/collection` |
| Menu | `/settings/navlinks` |
| Pages | `/settings/pages` |
| Languages | `/settings/languages` |
| Translations | `/settings/translations` |
| Filters | `/settings/filters` |

### Section 2: Metadata
| Link | Route |
|------|-------|
| Templates | `/settings/templates` |
| Thesauri | `/settings/thesauri` |
| Relationship Types | `/settings/relationship-types` |
| Metadata Extraction | `/settings/metadata_extraction` |
| Paragraph Extraction | `/settings/paragraph-extraction` |

### Section 3: Tools
| Link | Route |
|------|-------|
| Preserve | `/settings/preserve` |
| New Relationships Migration | `/settings/newrelmigration` |
| Activity Log | `/settings/activitylog` |
| Global CSS (& JS) | `/settings/customisation` |
| Uploads | `/settings/custom-uploads` |

## User Roles
- **Visitor**: View-only
- **Editor**: CRUD on entities/documents
- **Admin**: Full settings access

## Key Workflows

**Setup**: Login → Change password → Collection settings → Create users → Build templates → Create thesauri → Define relationship types → Upload content → Configure filters & nav → Publish

**Template creation**: Settings > Templates > Add > Name > Drag property types > Configure (thesaurus for selects) > Save

**Thesaurus creation**: Settings > Thesauri > Add > Name > Add items (or CSV import) > Save

**CSV Import**: Prepare CSV (title column required, pipe for multi-values) > Private documents > Import > Upload CSV/ZIP

**Metadata Extraction (AI)**: Settings > Metadata Extraction > Create extractor (template + property) > Review AI suggestions > Accept/reject

**Connections**: Open entity > Connections tab > Edit > Add target > Choose type > Search > Save
