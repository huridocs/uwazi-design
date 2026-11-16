# Uploads: how Uwazi does it today, how other tools do it, what to build

Research lane, 2026-10-13. Read only. Nothing in the app or in Uwazi was changed.

Source for section 1: the local Uwazi checkout `~/Developer/huridocs/uwazi-ref`, branch `production`,
`package.json` version 1.229.224, last commit 2 Oct 2026. Paths below are relative to its `app/`.
Source for section 2: vendor docs fetched on 2026-10-13, plus my own knowledge where marked.

How to read the labels: **Verified** = I read the code or the page. **Assumed** = inferred from code
or from memory of the product, not checked against a running system.

---

## 1. Uwazi today

Uwazi has two Library front ends in the same checkout: the Redux one (`react/Library/…`) and the V2
route (`react/V2/Routes/Library/…`). Both post to the same server route. I did not establish which one
a given deployment serves. Where they differ, both are listed.

### 1.1 What "Upload PDF" does (verified)

| Step | Code |
|---|---|
| Redux footer button, label "Upload PDF(s) to create", `accept="application/pdf"`, `multiple` | `react/Library/components/PDFUploadButton.tsx:97, 103` |
| V2 footer button "Upload PDF" opens a modal with a dropzone and a file list | `react/V2/Routes/Library/Components/LibraryResultsFooter.tsx:26-28`, `LibraryUploadPdfModal.tsx` |
| Both call `UploadService('createFromPDF')`, which posts **one file per request** to `POST /api/entities/create-from-pdf` | `react/V2/api/files/UploadService.ts:29-35, 39-85` |
| Server stores the upload in a temp file (multer disk storage), then runs the use case | `api/core/infrastructure/express/middlewares/UploadMiddleware.ts:30-35, 66-93`, `api/entities/routes.js:145-152` |
| Use case: create an entity, attach the PDF as its main document with `status: 'processing'`, insert both in one transaction | `api/core/application/CreateEntityFromPDF.ts:26-61` |

What the new entity gets:

- **Template**: the collection's default template, unless the request carries `templateId`
  (`api/core/application/EntitiesService.ts:250-256`). The client never sends one
  (`UploadService` has no `templateId` in `extraFields` for this endpoint), so it is always the default.
- **Title**: the file's original name **including the extension**, written to the request language and
  copied to all languages (`CreateEntityFromPDF.ts:36-47`). `report.pdf` becomes the title "report.pdf".
- **Main document**: the PDF, status `processing`.
- **Response**: `201` with the entity and its files (`CreateEntityFromPDFController.ts:40`).
  The client then dispatches `ELEMENT_CREATED` per entity (`react/Uploads/actions/uploadsActions.js:166-190`).

### 1.2 Non-PDF files (verified, with one assumption)

- **Create-from-PDF rejects them.** The controller's zod schema refuses any `mimetype` other than
  `application/pdf` ("Invalid file type. Only PDF files are allowed.",
  `CreateEntityFromPDFController.ts`, `FileSchema`). The browser side filters first: the Redux input has
  `accept="application/pdf"`; the V2 modal drops anything that is not a PDF by type or `.pdf` suffix
  (`LibraryUploadPdfModal.tsx:12-21`).
- **The use case's own "not a PDF" check never fires.** `InputFile.toEntityFile` returns a `PDFDocument`
  for every file whose type is `document` (`api/core/infrastructure/files/InputFile.ts:102`), so
  `instanceof PDFDocument` is always true. The mimetype check in the controller is the only guard.
- **Attachments take any type.** `POST /api/files/upload/attachment` has no type check
  (`api/files/routes.ts:85`, `EntityFileUploadController.forAttachment`). Media properties offer
  `*/*` (`react/Metadata/components/MediaModalUploadFileButton.tsx`, `MediaModal.tsx:187`).
- **A non-PDF sent as a main document fails later.** `POST /api/files/upload/document` stores whatever
  it is given as a `PDFDocument` in `processing`. The job marks it `failed` when the text extractor's
  error matches `/syntax error/` (`api/core/infrastructure/services/PDFService.ts:75-80`,
  `api/core/application/PDFPostProcessJob.ts:73-76`). That a docx ends that way I **assumed** from the code;
  I did not run it.

### 1.3 Which types become the main document (verified)

PDF only. I searched `app/api` for `docx`, `libreoffice` and `soffice`: no hits outside migrations and
CSV import. There is no office-to-PDF conversion in this checkout. The UI strings "Conversion failed" and
the `conversionStart` / `conversionFailed` socket events are historical names; the only conversion left is
PDF text extraction (`api/core/infrastructure/jobs/PDFPostProcessJobHandler.ts`).

### 1.4 Limits, chunking, resume (verified)

- **Size and count: none in the app.** Multer is created with no `limits`
  (`UploadMiddleware.ts:30, 70, 95`). The repo's own note says the same: "no explicit upload size limit is
  enforced at this layer; configure limits at the reverse proxy (e.g., NGINX)"
  (`AI Contexts/MediaImageMetadata_V1.md:351`). Count is bounded by nothing; the client just loops.
- **Concurrency: 1.** `UploadService.uploadQueue` awaits each request, then recurses
  (`UploadService.ts:39-85`).
- **Chunking and resume: none.** One multipart request per file. A dropped connection loses that file.
  No offset, no upload id, no HEAD/status call exists on the server.
- **Per-file failures are swallowed in the Library.** `uploadQueue` catches the error and pushes it into
  the responses array. `uploadPdfsAndCreateEntities` then keeps only responses that look like an entity
  (`libraryUploadPdf.ts:21-35`), and the Redux `createFromPDF` dispatches only responses with `data` but
  returns `responses.length` (`uploadsActions.js:166-190`). A file that failed produces no message in
  either front end. The V2 modal's `error` state is set only if the whole call throws.
- **Drop takes the first file only.** `DashedUploadDropzone` calls `onDropFile(event.dataTransfer.files?.[0])`
  (`react/V2/Components/UI/DashedUploadDropzone.tsx:36`); the modal's file picker allows several.
- **Duplicates**: the V2 modal drops a second file with the same `name:size` (`LibraryUploadPdfModal.tsx:14-21`).
  The server does not check.

### 1.5 What the UI shows (verified)

| Phase | Redux Library | V2 Library |
|---|---|---|
| Uploading | The button is replaced by one chip: "Uploading: <name, 20 chars> N%", a tooltip "N remaining files" (`PDFUploadButton.tsx:84`). No cancel. | The modal stays open, "Upload" and the close button are disabled while busy (`LibraryUploadPdfModal.tsx:56, 72, 99`). Only the file currently uploading shows a progress line, matched by name. No cancel, no per-file state. |
| After upload | New row appears in the list. File is `processing`. | Same, then `onUploaded(last sharedId)` selects the last entity. |
| Processing | `Processing` placeholder in the metadata view (`react/Metadata/components/Metadata.jsx:69-74`); `Processing` / `Conversion failed` on the file row (`react/Attachments/components/File.tsx:93, 160-164`). | Spinner and a `Failed` badge per file (`react/V2/Routes/Entity/Components/Files/FileProcessStatusIndicator.tsx`); rows are dimmed and mutations disabled while processing (`filesTableColumns.tsx:63, 76, 136`). |
| Done | Socket `documentProcessed` refreshes the entity (`react/App/sockets.js:188-194`). | Same events. |

Server side of "processing" (verified): text extraction, language detection, page count, then a
thumbnail; retries; on final failure or a non-PDF, `status: failed` and a `conversionFailed` event
(`PDFPostProcessJob.ts:32-80`, `PDFPostProcessJobHandler.ts:36, 56`). The event goes only to the uploader's
session (`emitToSession(params.sessionId, …)`, and only `if (params.sessionId)`). Inference, not run: a user
who reloads and gets a new session id sees the status change only on the next fetch.

**OCR is separate.** `GET/POST /api/files/:filename/ocr`, roles admin and editor, 404 unless the OCR
service is configured, one file at a time, language must be supported (`api/files/ocrRoutes.ts:1-60`,
`api/services/ocr/OcrManager.ts`). Upload does not start it.

### 1.6 v1 and v2, in one line

The server contract is the same for both front ends (one file per request, PDF only, default template,
file name as title, `processing` then socket event). The only differences are the client chrome in the
table above. Uwazi's v2 Library does not add any resume, queue or non-PDF path.

---

## 2. Patterns in other tools

### 2.1 What I could and could not verify

| Tool | Verified from | Not verified |
|---|---|---|
| tus protocol | tus.io protocol page | n/a |
| tus-js-client | its `api.md` and `fileSignature.ts` source | n/a |
| Uppy (Dashboard, Tus, Golden Retriever) | uppy.io docs | n/a |
| Google Drive API | developers.google.com resumable-upload guide | Drive web UI: no Google doc describes the tray, pause or retry. What follows for the web UI is from memory and **assumed**. |
| Dropbox | help.dropbox.com `upload-limitations`; community thread titles in search results | Dropbox web UI and API upload-session pages returned 404 or empty. API figures marked **assumed**. |
| File System Access | developer.chrome.com article | n/a |

### 2.2 Protocol-level resume (verified)

**tus 1.0.x.**
- `POST` creates an upload and returns a `Location` (creation extension).
- To continue, the client sends `HEAD` to that URL; the server answers with `Upload-Offset`. The client
  then `PATCH`es the remaining bytes. "The `Upload-Offset` header's value MUST be equal to the current
  offset of the resource"; a mismatch is `409`.
- The server may delete unfinished uploads and says when with `Upload-Expires` (expiration extension).
  `DELETE` ends one (termination extension). Concatenation joins parallel parts.

**tus-js-client (browser).**
- The fingerprint is `['tus-br', file.name, file.type, file.size, file.lastModified, options.endpoint].join('-')`
  (`lib/browser/fileSignature.ts`). So matching is by name + type + size + lastModified + endpoint.
- It stores fingerprint → upload URL in `localStorage` (`storeFingerprintForResuming`, default true).
- `findPreviousUploads()` and `resumeFromPreviousUpload()` need the `File` again: **the browser cannot
  re-open a path**, so the page must hold a `File`. After a reload the user must pick the file again; the
  client matches it to its stored URL without further input.
- Retry on interruption: `retryDelays` default `[0, 1000, 3000, 5000]`; 409, 423 and any non-4xx error are
  retried unless the browser is offline.
- `chunkSize` defaults to `Infinity` (one PATCH). The docs say to set it below the smallest body-size limit
  on the path to the server.

**Uppy.**
- Tus plugin: `limit` defaults to 20 parallel uploads.
- Dashboard has status-bar and per-file Cancel, Retry and Pause/Resume (pause only for resumable
  uploads such as tus), a total progress bar with optional size and time details, and an informer for toasts.
- Golden Retriever restores the queue after a crash or a closed tab. IndexedDB holds metadata, state and
  files up to 10 MiB; an optional service worker keeps references to files of any size, but not across a
  browser restart. A file that cannot be restored is shown as a "ghost" with a button to re-select it.
  Stored data expires after 24 h by default. It also needs the original `File` for anything bigger than
  the IndexedDB cap, which is why re-selection is the normal path for large files.

**Google Drive API (resumable upload).**
- Recommended above 5 MB. Session URI lives one week.
- Resume: empty `PUT` to the session URI with `Content-Range: bytes */<total>`; `308` plus a `Range`
  header says what the server holds; send the rest; `404` means the session expired.
- Chunks are multiples of 256 KB except the last. 5xx and rate limits: retry or resume; other 4xx: start
  a new session.

**Dropbox.**
- Upload limits page: 2 TB file maximum, and "Uploading files larger than 375 GB in a web browser may
  cause timeouts or interrupted uploads"; it recommends the desktop app or the API. No count limit given.
- API upload sessions (start, append with offset, finish): I could not fetch the page. From memory, 150 MB
  per request and a session that lives for a day or two. **Assumed.**

**File System Access API.**
- File handles are serialisable, so a `FileSystemFileHandle` can be put in IndexedDB and read back.
- Permission "is not always persisted between sessions": after a reload the page calls `queryPermission()`
  and, if needed, `requestPermission()`, which needs a user gesture. Chrome and Edge from 86; Firefox and
  Safari do not implement the pickers.
- So: handles let a Chromium user resume with one click and no file dialog. Elsewhere, re-selection is the
  only way.

### 2.3 Bulk progress and recovery in product UIs

| | Tray and aggregate | Per-file | Pause / cancel / retry | Connection drops | Tab reload |
|---|---|---|---|---|---|
| **Google Drive web** (assumed, from use) | A card at the bottom right: "Uploading N items" with an overall bar; can be minimised; uploads continue while you browse folders. | One row per file with a progress ring and, when done, a link to the file. | Cancel per row and for all; failed rows say "Upload failed" with a retry; no pause that I know of. | Rows wait and continue; large files use the resumable protocol above (verified for the API, assumed for the web client). | The browser asks to confirm leaving while uploads run (assumed). Restarting after a reload requires picking the files again (assumed). |
| **Dropbox web** | Panel with count and bar (assumed). | Per-file bar and error (assumed). | Pause exists in the current web UI (a community thread is titled "Website keeps pausing my upload"; I did not read it). Cancel per file (assumed). | Not documented. | Community posts, seen only as search summaries, say a refresh restarts large uploads from zero and that Dropbox recommends the desktop app for large or many files. **Assumed, unconfirmed.** |
| **Uppy Dashboard + tus** (verified, docs) | Status bar with total percentage, count and optional remaining size and time. | A list with a per-file bar and per-file Cancel, Retry, Pause. | Pause/resume all, cancel all, retry failed, retry per file. | tus retries with delays, then shows an error with Retry; pause/resume continues from the server offset. | With Golden Retriever: restores the list; files above 10 MiB need the service worker or re-selection ("ghost" row with a re-select button). tus fingerprint then resumes at the server offset. |

Common shape across all three: one aggregate surface that can be minimised, a per-file list underneath,
failures that stay visible and do not stop the batch, and resume that depends on the page holding the
`File` again.

### 2.4 Three ways to resume without a fresh upload

| Method | Works across reload | Needs user action | Browser support | Notes |
|---|---|---|---|---|
| **Keep the `File` objects in memory** | No | none | all | Covers a dropped connection and a long run in one tab. Leaving the page loses them. |
| **File System Access handle in IndexedDB** | Yes | One click to re-grant permission (needs a user gesture) | Chromium only | No file dialog. If the file moved or changed, the handle fails or reads different bytes: compare size and lastModified before reuse. |
| **Re-select, match by name + size + lastModified (+ type)** | Yes | Pick the files again | all | This is what tus-js-client does. Weak identity: two different files with the same name, size and mtime match. Fine for a library upload, then check a content hash if the server stores one. |
| **Server offset (tus / Drive session)** | Yes, across reload and devices | Needs the `File` again to send the remaining bytes | all | Only the server knows how much arrived. Without it, "resume" means restart the file. |

---

## 3. Recommendation for the prototype and for Uwazi

1. **One action, "Upload", any file type, one batch = one task.** A batch is created in an upload store
   (a jotai atom on the store, like `runPdfUploadBatch` and the CSV runner), not in modal state. The modal
   closes on Start, so the user keeps working. The Beacon and the Tasks list show the batch; the existing
   `Task` has only `current/total/detail` (`atoms/notifications.ts:45-58`), so the batch needs its own
   per-file list that the task summarises.
2. **Decide what a non-PDF becomes before building the mock.** Uwazi cannot create an entity from a
   non-PDF today (1.2). Options: (a) entity per file, the file stored as its attachment and no preview;
   (b) PDFs create entities, other types go to attachments of an entity the user picks; (c) reject.
   Recommend (a): it keeps "massive upload" to one gesture, and the title rule below already works.
   This needs a server change in real Uwazi, so label it in the mock. Juan's call.
3. **Per-file states, each visible in the list:** queued, uploading N%, uploaded (waiting for the server),
   processing, ready; failed (with reason) and cancelled. Keep "uploaded" and "ready" separate: in Uwazi
   the entity exists and is clickable while the file is still `processing` (1.5).
4. **Aggregate first, detail on demand.** The Beacon and the notification card show one line and one bar
   ("Uploading 214 of 1,200 files, 3 failed"). Expanding the task shows the per-file list, virtualised
   because the batch can be thousands. Pause all, cancel all, retry failed are batch actions; retry and
   cancel also exist per file. Keep Uwazi's existing sentence form for the line.
5. **Failures never stop the batch and never vanish.** Fix what Uwazi does today (1.4): a failed file
   stays in the list with its reason until dismissed, and the completion notification states counts
   ("1,196 uploaded, 4 failed") with an action that opens the failed list. One notification per batch,
   not per file.
6. **Concurrency 3, not 1.** Uwazi sends one file at a time; a 1,200-file batch at one request each is
   the long pole. Three parallel requests, then back off on 429/5xx. Uppy's default of 20 is for a
   tus server built for it; Uwazi's multer-to-disk route is not.
7. **Resume in two levels, mock both.**
   (i) Same tab: auto-pause on `offline`, resume on `online`, retry with the tus delays
   (0, 1, 3, 5 s) then show Retry. (ii) After reload: persist a manifest in IndexedDB (name, size,
   lastModified, type, state, server upload URL and offset) and, on Chromium, the `FileSystemFileHandle`.
   On return the task reads "Interrupted: 340 files to continue" with a single "Continue" button; Chromium
   resumes from handles after one permission click, other browsers show the re-select dialog that matches
   by name + size + lastModified and reports the unmatched ones. Do not store the file bytes.
8. **Be explicit that byte-level resume needs a server endpoint.** Uwazi has none (1.4). For the real
   product this means a tus or chunked endpoint (HEAD/offset, expiry, termination) in front of
   `create-from-pdf`, which then runs when the last byte lands. Without it, "resume" can only skip files
   already finished and restart the partial one. The mock should show offset-based resume and say so.
9. **Warn on leaving only while bytes are leaving.** Use `beforeunload` while any file is `uploading`; do
   not warn while the rest is `processing` (the server continues). Say in the Tasks list that finished
   files are safe and what will be re-sent.
10. **Client rules to keep from Uwazi, and one to fix.** Keep dedupe by name + size inside the batch and
    the filename-as-title default, but strip the extension (Uwazi leaves "report.pdf" as a title). Fix the
    drop handler (it takes `files[0]` only) and set a client-side size cap per file, since the server has
    none and the real limit is the reverse proxy.

### Open questions for Juan

- Non-PDF files: option (a), (b) or (c) in bullet 2.
- Template for a bulk upload: default template (as Uwazi), or ask once per batch.
- Whether to put OCR into the batch (Uwazi does not; it is a separate admin/editor action, one file at a time).
- Whether the title should lose its extension (a visible change from Uwazi).
