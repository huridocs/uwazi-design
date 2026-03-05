# Uwazi — Product Overview

## What is Uwazi?
Open-source web-based database app for document management, built by **HURIDOCS** for human rights organizations. "Uwazi" means "openness" in Swahili.

**Users**: Human rights defenders, NGOs, investigative journalists, legal professionals, truth commissions.

**Core value**: Work directly with PDF text to add structured metadata, record connections between people, documents, and events.

## Core Concepts

| Term | Definition |
|------|-----------|
| **Document** | A PDF with metadata properties |
| **Entity** | A non-PDF item (court, case, person, event) with properties |
| **Template** | Defines metadata structure for a type of document/entity |
| **Thesaurus** | Controlled vocabulary for select/multiselect properties |
| **Property** | Attribute on a template (text, date, select, geolocation, etc.) |
| **Connection** | Labeled link between documents/entities |
| **Reference** | Bookmark connecting text within a PDF to another entity |

## Property Types
`text`, `numeric`, `markdown`, `date`, `daterange`, `multidate`, `multidaterange`, `select`, `multiselect`, `relationship`, `newRelationship`, `geolocation`, `link`, `image`, `media`, `preview`, `nested`, `generatedid`

## Key Features

**Information Architecture**: Template builder, thesauri (nested groups, CSV import), relationship types, inherited properties

**Document Management**: PDF upload/viewing/extraction, table of contents, in-document annotations, file attachments

**Search**: Elasticsearch-powered full-text, boolean operators, wildcards, proximity, sidebar filters

**Library Views**: Card view, Table view, Map view (with clustering)

**Import/Export**: CSV import (pipe-delimited multi-values), ZIP batch PDF import, multilingual columns (`title__en`)

**Visualization**: Counter, Bar/Pie/List charts, Map viz, embeddable in pages

**i18n**: Multi-language interface + content, RTL support, translation management

**AI/ML**: Metadata Extraction (IX) — AI suggestions from document text. Paragraph Extraction.

**Collaboration**: Visitor/Editor/Admin roles, user groups, 2FA, activity log, public/private instances

**Publishing**: Custom pages (Markdown/HTML), embeddable components, public submission forms, configurable nav menu

## Tech Stack

| Layer | Tech |
|-------|------|
| Frontend | React, Redux + Jotai (V2), React Router |
| Styling | Tailwind CSS, Flowbite, Inter font |
| Icons | Heroicons (@heroicons/react) |
| Backend | Node.js 20.x, Express |
| Database | MongoDB 7.x (Replica Set) |
| Search | Elasticsearch 8.18 + ICU |
| Storage | Minio (S3-compatible) |
| Cache | Redis |
| Testing | Jest, Cypress, Puppeteer |
| Design System | Storybook |
