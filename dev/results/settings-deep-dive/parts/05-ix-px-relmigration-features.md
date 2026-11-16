# Settings inventory part 05: Metadata extraction (IX), Paragraph extraction (PX), New Relationships Migration, feature toggles

Source: huridocs/uwazi `production`, v1.229.224 (`package.json:4`), local shallow clone `/Users/juanmnl/Developer/huridocs/uwazi-ref`. All paths below are repo-relative to that clone. Code was read, not run. "VERIFIED" = read in the cited lines. "ASSUMED" = inferred, not confirmed by running the app or by reading every caller.

Abbreviations for paths: `IX/` = `app/react/V2/Routes/Settings/IX/`, `PX/` = `app/react/V2/Routes/Settings/ParagraphExtraction/`.

## 0. Shared mechanics (apply to every page below)

| Topic | Fact | Evidence |
|---|---|---|
| Settings shell | All `/settings/*` routes sit under `loggedInUsersRoute(<Settings/>)`: any logged-in user passes; each child adds its own guard. | `app/react/Routes.tsx:324`, `app/react/ProtectedRoute.tsx:33` |
| Guard behaviour | `ProtectedRoute allowedRoles={['admin','editor']}` renders children only if the Redux user role is in the list; otherwise `<Navigate to="/login" replace/>`. `adminsOnlyRoute` is the same with `['admin']`. | `app/react/ProtectedRoute.tsx:6-27` |
| Page chrome | Every page uses `SettingsContent` (Header with breadcrumb, Body, sticky Footer). Footer turns tinted (`highlighted`) while rows are selected. Header shows a back chevron below `lg`. | `app/react/V2/Components/Layouts/SettingsContent.tsx:22-113` |
| Notifications | `useRequestStatus().notify(type, title, message?, details?)` appends to the notifications log (header Beacon). The Beacon flashes the newest item for 3.2 s then 0.42 s leave animation, and the notifications panel keeps the log. Types: success, warning, error, info. | `app/react/V2/atoms/requestStatusAtom.ts:144-154`, `app/react/V2/Components/UI/Notifications/RequestStatus.tsx:56-76` |
| Tasks | `registerTask(id,label,setupListeners)` adds a running task with optional progress to the same panel; `fail(details)` keeps the reason. | `requestStatusAtom.ts:124-163` |
| Error toasts, double path | The legacy `api` util (used by all V2 API wrappers here) dispatches its own Redux `notify` toast for 400/422 (validation text), 409 (warning with `error.json.error`), 500, and redirects on 401/404, before the caller's `catch` runs. Callers that then call `handleUnexpectedError` add a second notification "An error occurred" + details. Whether the two toast systems render separately was not run: ASSUMED. | `app/react/utils/api.js:71-131,134-146`; `app/react/V2/shared/errorUtils.tsx:74-79` |
| Status mapping of domain errors | `PXValidationError`, `IXValidationError`, `NonRetryableJobError` answer 422; other `DomainError` 400; `ModelNotReadyError` 409; `SuggestionAcceptanceError` 422. | `app/api/utils/handleError.js:98-103,142-144,165-167,174-176` |
| Confirmation modal defaults | `ConfirmationModal`: default buttons "Cancel" / "Accept". With `dangerStyle` it renders a red-tinted modal with warning icon; without `dangerStyle` and with `warningText` the Accept button is still `variant="danger"`; without `warningText` it is primary. | `app/react/V2/Components/UI/ConfirmationModal.tsx:110-205` |
| Table empty text | Default `Table` empty state is "NO DATA AVAILABLE". | `app/react/V2/Components/UI/Table/DefaultNoDataMessage.tsx:4-8`, `Table.tsx:81` |
| Sidepanel close | `Sidepanel` closes on Escape and on overlay click; none of the sidepanels below has a dirty guard (VERIFIED for IX and PX sidepanels: `closeSidepanelFunction` goes straight to a state reset). | `app/react/V2/Components/UI/Sidepanel.tsx:41,120-127,160-162,226` |
| Socket rooms | IX and PX status events go to room `<tenant>:admins_editors` via `emitToTenantAdminsAndEditors`. | `app/api/socketio/setupSockets.ts:74-81` |
| External services | The worker (queue result listeners for IX `information_extractor` and PX `px_paragraphs_results`) is imported only when `config.externalServices` (env `EXTERNAL_SERVICES=true`). The task manager polls Redis (RSMQ) every 500 ms. | `app/server.js:140-142`, `app/worker.ts:46-47`, `app/api/services/tasksmanager/TaskManager.ts:96-103` |

---

## 1. Metadata extraction (IX)

### 1a. Metadata extraction: extractors dashboard

- **Route / file**: `/settings/metadata_extraction` (index). Route `app/react/Routes.tsx:394-404`; component `IXDashboard` `IX/IXDashboard.tsx:69-190`; loader `IXdashboardLoader` `IX/IXDashboard.tsx:192-199` (GET extractors, then all templates). Extractor create/edit modal: `IX/components/ExtractorModal.tsx:123-299`. Table columns: `IX/components/TableElements.tsx:329-355`.
- **Who can see it**:
  - Route guard `ProtectedRoute allowedRoles={['admin','editor']}` (`Routes.tsx:396-400`).
  - Nav link only shows inside `NeedAuthorization roles={['admin','editor']}` and `FeatureToggle feature="metadata-extraction"` (`app/react/V2/Routes/Settings/SettingsNavigation.tsx:65-73`). The route itself has no feature check.
  - Every `/api/ixextractors` handler runs `serviceMiddleware` first (404 `{}` unless `settings.features.metadataExtraction.url` is set), then `needsAuthorization(['admin','editor'])` (`app/api/suggestions/serviceMiddleware.ts:4-13`, `app/api/suggestions/extractorsRoutes.ts:11-140`). Order matters: an unconfigured instance answers 404 before auth.
  - Two different feature keys are involved; see section 4. ASSUMED consequence (VERIFIED code path, not run): for an `editor` the nav link is not rendered, because `settings.features` is only sent to admins (`app/api/core/application/settings/SettingsQueryService.ts:27-29`, `publicSettings.ts:37-46`) and `metadata-extraction` is read from `settings.features` (`FeatureToggle.tsx:14-17`).
- **Layout**: Header title "Metadata extraction" (no breadcrumb path). Body: `Table` with header text "Extractors", row selection checkboxes, default sort by `name` ascending (`IXDashboard.tsx:123-136`). Columns: "Extractor Name", "Property" (type icon + property label), "Source" ("PDF", "Title" or the source property label), "Template(s)" (gray pills, not sortable), then an unlabeled action column (sr-only "Action") with a secondary "Review" button that links to `suggestions/<extractorId>` (`TableElements.tsx:73-77,229-235,329-355`). Sticky footer: buttons depending on selection (below).
- **Fields** (create/edit modal, 2 steps, `size="xxl"`; header "Add Extractor" or "Edit Extractor" `ExtractorModal.tsx:194-196`):

| Field | Type/control | Default | Validation | Copy | file:line |
|---|---|---|---|---|---|
| Extractor name | `InputField` text `id=extractor-name` | extractor name when editing, else empty | Required: empty string on submit sets error style, no message text. No uniqueness check client or server (`Extractors.create` only runs `extractorValidityCheck`). | placeholder "Extractor name" | `ExtractorModal.tsx:134,157-161,201-211`; `app/api/services/informationextraction/ixextractors.ts:182-193` |
| Properties by template (step 1) | `MultiselectList`, checkboxes, foldable groups per template, search, "select all" when something is selected | when editing: one `<templateId>-<property>` per template | At least one value (Next disabled when empty). After the first pick only the same-named property of other templates stays listed. Listed properties: types text, numeric, date, select, multiselect, relationship, markdown, plus "Title" per template. Each row shows icon, label (translated in the template context) and "(type)" lowercase. | none (list only) | `ExtractorModal.tsx:19-27,61-94,213-224,277` |
| Input (step 2, read only) | label + property row | first selected property | n/a | "Input" | `ExtractorModal.tsx:227-230` |
| Selected templates (step 2, read only) | gray pills | selected templates | n/a | "Selected templates" | `ExtractorModal.tsx:231-244` |
| Common sources (step 2) | `RadioSelect` | PDF (value `0`) unless editing a property-source extractor | Options: "PDF"; "Title"; plus every text/markdown property present in all selected templates; the target property itself is removed. If the saved choice disappears from the list it falls back to PDF. | "Common sources" | `ExtractorModal.tsx:145,245-259`; `IX/helpers/helpers.ts:90-165` |

  Server validation on POST and PUT: body requires `name`, `property`, `source`, `templates`; PUT also `_id` (`extractorsRoutes.ts:19-36,57-74`). `extractorValidityCheck`: at least one template; each template exists; property exists in each template and its type is in `ALLOWED_PROPERTY_TYPES` (title, text, numeric, date, select, multiselect, relationship, markdown); source is `pdf` or an existing property of each template. Failures are `IXValidationError` with codes `TEMPLATE_MISSING`, `TEMPLATES_REQUIRED`, `PROPERTY_MISSING`, `PROPERTY_TYPE_NOT_ALLOWED`, `SOURCE_REQUIRED` and English messages such as "an extractor must target at least one template", answered 422 (`ixextractors.ts:32-41,57-126`, `IXValidationError.ts:1-7`).
- **Actions**:

| Control (exact label) | Client behaviour | Server call and effect |
|---|---|---|
| "Create Extractor" (footer, shown when nothing is selected) | opens modal empty (`IXDashboard.tsx:156-158`) | on Create: `POST /api/ixextractors` (`IX/../api/ix/extractors.ts:26-37`; handler `extractorsRoutes.ts:11-47`) -> `Extractors.create`: inserts extractor, then `createBlankSuggestionsForExtractor` (blank suggestion rows per entity of the templates, created in batched queue jobs `CreateBlankStateSuggestionsJob`) (`ixextractors.ts:182-193`, `app/api/suggestions/blankSuggestions.ts:26-60`) |
| "Edit Extractor" (footer, only when exactly 1 row selected) | opens the modal with `selected[0]` (`IXDashboard.tsx:140-144`) | on Update: `PUT /api/ixextractors`. If `property` changed: deletes all suggestions of the extractor and recreates blank ones. Otherwise diffs templates: removed templates delete their suggestions, added templates create blank ones. A rename alone touches no suggestions (`ixextractors.ts:128-157,194-215`) |
| "Delete" (footer, when 1 or more rows selected; replaces "Create Extractor") | opens confirmation (below) | `DELETE /api/ixextractors?ids[]=...` -> `Extractors.delete`: 400 `MissingExtractorError` ("Missing extractor.") if any id is unknown; deletes the extractor documents and `Suggestions.deleteByExtractorIds`. The model document is not touched in this function (`ixextractors.ts:159-163,175-181`) |
| "Next" / "Back" / "Cancel" / "Create" / "Update" (modal footer) | step 1: "Cancel" (ghost) + "Next" with arrow, disabled with no selection; step 2: "Back" + "Create" or "Update" (success variant) (`ExtractorModal.tsx:272-293`) | see rows above |
| Modal close button (X) | `setShowModal(false)` | none |
| "Review" (row) | router `Link` to `suggestions/<id>` | none |
| Row checkboxes | `onSelect` stores selected rows (`IXDashboard.tsx:132-134`) | none |

- **Confirmations**: Delete: `ConfirmationModal` with `header="Delete extractors"`, `warningText="Do you want to delete the following items?"`, body = bulleted list of extractor names, `dangerStyle`, buttons "Cancel" / "Accept" (defaults). Accept calls delete, then closes and clears selection (`IXDashboard.tsx:163-177`; list `IX/components/List.tsx:4-10`). Result: success notification below.
- **Empty / loading / error / notification states**:
  - Empty table: "NO DATA AVAILABLE" (no custom `noDataMessage`).
  - Save success: notify success "Saved successfully." (`IXDashboard.tsx:107`). Delete success: "Extractor/s deleted" (`:93`).
  - Errors: `handleUnexpectedError(error, 'Error saving extractor')` / `'Error deleting extractors'` produce notify error "An error occurred" with details from `json.prettyMessage` or `json.error` (`errorUtils.tsx:74-79`). The `key` string is sent to Sentry, not shown.
  - Gotcha (VERIFIED): `handleSave` calls `setExtractorModal(false)` after the try/catch/finally, so the modal closes on failure too, losing the user's input (`IXDashboard.tsx:101-115`).
  - Gotcha (VERIFIED): `extractorsAPI.get` catches errors and returns the error object instead of throwing (`app/react/V2/api/ix/extractors.ts:6-14`), so a failed loader passes a non-array to `formatExtractors`.
  - Buttons are disabled while `isSaving`.
- **Save model**: Modal with explicit Create/Update; no autosave; no dirty guard (Cancel and X discard). After save: `revalidator.revalidate()` reloads loader data, notification, modal closes.
- **V1 vs V2**: V1 removed (no `app/react/MetadataExtraction`; no V1 route). Orphan stylesheet `app/react/App/scss/modules/_metadata-extraction.scss` (`.metadata-extraction-table`) is still imported at `app/react/App/scss/styles.scss:55`.
- **Notes/gotchas**:
  - Extractor `source` is `{pdf:true}` or `{property:<name>}`. Property-source extractors read text from another property and show a text panel instead of a PDF.
  - Select/multiselect/relationship properties are extracted from the same source text; relationship extractors store `inheritedProperty` on the loaded extractor (suggestions loader `IXSuggestions.tsx:557-576`).
  - The modal builds `value = "<templateId>-<propertyName>"` and splits on the first `-` (`IX/helpers/sidepanelFunctions.ts:115-119`); this works because ObjectIds contain no hyphen.

### 1b. Metadata extraction: suggestions for one extractor

- **Route / file**: `/settings/metadata_extraction/suggestions/:extractorId` (`Routes.tsx:404-411`). Component `IXSuggestions` `IX/IXSuggestions.tsx:74-504`; loader `IXSuggestionsLoader` `:506-588`. Query params used: `page`, `sort` (JSON `{property,order}`), `filter` (JSON of the 9 filter flags) (`:63-72,276-298,512-533`; `IX/components/FiltersSidepanel.tsx:52-86`). Sub-components: `TrainModelModal.tsx`, `ProcessExtractorModal.tsx`, `FiltersSidepanel.tsx`, `sidepanel/PDFSidepanel.tsx`, `sidepanel/PropertySidepanel.tsx`, `sidepanel/SidepanelForms.tsx`, `TableElements.tsx`, `SuggestedValue.tsx`, `ContextCell.tsx`.
- **Who can see it**: same as 1a (route `Routes.tsx:407-410`). Server: all endpoints below use `serviceMiddleware` then `needsAuthorization(['admin','editor'])` (`app/api/suggestions/routes.ts:41-255`).
- **Layout** (top to bottom):
  1. Header: breadcrumb "Metadata extraction" (link to the dashboard) > extractor name (`IXSuggestions.tsx:334-337`).
  2. Table header (`SuggestionsTitle`): round icon for the property type, property label (template context), italic "for", gray pill per template (`IX/components/SuggestionsTitle.tsx:14-72`). Right side: ghost button "Stats & Filters" with funnel icon (accent colour when filters are active) and a numeric badge of active filters (`IXSuggestions.tsx:362-374`).
  3. Rows (100 per page, `SUGGESTIONS_PER_PAGE`, `:51`). Columns: "Name" (entity title + `(language)`, link `/entity/<sharedId>` in a new tab, `TableElements.tsx:257-263`), "Context" (segment text with highlighted match, or amber "No context", hidden on parent rows, `:265-280`), "Current Value/Suggestion" (two lines: current value muted, suggested value green if equal else amber; obsolete shows italic "(obsolete) <value>"; error shows red "Error"; multi-value parents show "N values | N suggestions | N matching | N mismatching", `TableElements.tsx:98-171`, `SuggestedValue.tsx:84-126`), "Use for training" (icon toggle button, sr-only "Add to training set" / "Remove from training set", `:282-327`), an Accept column (sr-only "Accept"), and an action column (sr-only "Action", button "Open"). Multiselect and relationship properties render one parent row plus one child row per value (`IX/helpers/helpers.ts:15-80`, `IXSuggestions.tsx:309-319`), and child rows carry their own Accept button.
  4. Table footer: "Showing a-b of N" and paginator (`:375-396`).
  5. Sticky footer bar (`:400-457`): "Train model" (primary, small) or, while a run is active, "Cancel" (secondary); "Process extractor" (or "Process selected" when rows are selected), disabled unless status is `ready`; run status text; and, when rows are selected, "Selected <n> of 100". The bar is tinted while rows are selected.
  6. Overlays: filters sidepanel, property sidepanel, PDF sidepanel, train modal, process modal (`:460-501`).
- **Fields**:

Train model modal (`IX/components/TrainModelModal.tsx`):

| Field | Control | Default | Validation | Copy | file:line |
|---|---|---|---|---|---|
| Training sample | `RadioSelect` `find.samplePolicy` | `only_marked` | none | label "Training sample :" with tooltip "Choose which data to use for training :" and two bullets "Marked for training only: Uses only entries you marked as "Use for training", including those with empty values" / "Marked for training + all labeled entries: Includes entries marked for training plus any other entries that have values"; options "Marked for training only" (`only_marked`), "Marked for training + all labeled entries" (`marked_plus_labeled`) | `:59-111` |
| Find suggestions after training | `Checkbox` `find.shouldFind` | unchecked | none | "Find suggestions after training" | `:115-125` |
| Amount | number `InputField` `find.amount` | 1000, disabled unless the checkbox is on | none in UI; server `suggestionsToFind` number >= 0; client sends 0 when unchecked or amount <= 0 | "Amount :" | `:32,36,126-146`; `routes.ts:146` |
| Info banner | static | n/a | n/a | "Training machine learning models may take from minutes up to a couple of hours depending on the amount of labeled data and the difficulty of the task." | `:50-55` |

Process modal (`IX/components/ProcessExtractorModal.tsx`; header "Process extractor" or "Process selected" `:341-345`):

| Field | Control | Default | Validation / dependencies | Copy | file:line |
|---|---|---|---|---|---|
| Find suggestions | `Checkbox` `shouldFind` | checked | forced false when none of the three filters is checked (`:46-51`). In selected mode the box is fixed checked and read only | "Find suggestions for" / "Find suggestions for selected" | `:57-68,218-229` |
| Amount | number `amount` | 1000 | `min: 1` rule sets error style, no message; disabled unless Find is on | "Amount :" | `:69-89,301` |
| Filters | 3 checkboxes `filters.nonProcessed/obsolete/error` | all checked; disabled unless Find is on | at least one needed to keep Find on | "Non processed", "Obsolete", "Error" | `:92-137,300` |
| Auto-accept | `Checkbox` `shouldAccept` | unchecked | n/a | "Auto-accept suggestions" | `:141-152` |
| Accept source | `RadioSelect` `acceptFor` | `previous` | "From previous step" disabled unless Find and Auto-accept are on and amount >= 1; "From all suggestions" disabled unless Auto-accept is on. Selected mode shows only "From previous step" | "From previous step", "From all suggestions" | `:154-178,245-263` |
| Overwrite | `RadioSelect` `overwrite` | `blank_only` | disabled unless Auto-accept is on | "For entities with blank values", "For all entities" | `:180-203,265-288` |

  The "Process" submit is disabled while submitting or when both Find and Auto-accept are off (`:367-374`). Server schema: `mode` in `process_extractor|process_selected`; `find.size` coerced int 0 or more, default 1000; with `process_extractor` and Find enabled at least one filter is required, otherwise 422 "At least one filter must be selected when Find is enabled." (`app/api/suggestions/adapters/ProcessSuggestionsController.ts:16-64`, `contracts/ProcessSuggestionsContracts.ts`).

Filters sidepanel (`FiltersSidepanel.tsx`): title "Stats & Filters" (rendered uppercase). Cards and checkboxes, each with a dotted leader and a count from `/api/suggestions/aggregation` (counts do not change with active filters): "All data": "Labeled", "Non-labeled", "Use for training"; "Status": "Non processed", "Obsolete", "Error"; "Processed": "Match", "Mismatch", "No context"; "Statistics": "Accuracy" with an info tooltip "Accuracy is defined by the amount of matches vs mismatches for labeled samples that have been processed." and value `<n>%` (`:99-232`, `IX/components/Tooltip.tsx:13-16`). Selected flags combine with OR (`app/api/suggestions/infrastructure/MongoIXSuggestionsTableQueryService.ts:28-62`). Semantics: Labeled = `state.labeled`; Non processed = no `date`; Obsolete/Error = dated and flagged; Match/Mismatch/No context apply only to dated, non-obsolete, non-error rows.

Entity sidepanels (`PDFSidepanel.tsx`, `PropertySidepanel.tsx`): see Actions.
- **Actions**:

| Control (exact label) | Client behaviour | Server call and effect |
|---|---|---|
| "Accept" (per row; per child row for multi-value) | marks row id green in `acceptedSuggestions` atom, calls accept with `formatAccepted` (adds `addedValues`/`removedValues` for child rows), clears selection, notify info "Suggestions sent" (`TableElements.tsx:173-217`, `IXSuggestions.tsx:124-140`, `IX/helpers/helpers.ts:178-231`). Disabled when the row is red (no suggestion), has no entity, is obsolete or errored | `POST /api/suggestions/accept` body `{suggestions:[{_id,sharedId,entityId,addedValues?,removedValues?}]}`. Answers 202 `{success:true}` at once; `Suggestions.accept` runs in the background and the session socket gets `ACCEPT_SUGGESTION_SUCCESS` or `ACCEPT_SUGGESTION_ERROR(message)` (`routes.ts:203-255`). Effect: writes the value into the entity in every language for numeric/date/select/multiselect (one language otherwise) and writes the file `propertySelections` for text-like properties; rejects mixed extractors, unknown ids, rows with an error, and partial values on non-multi properties (`app/api/suggestions/suggestions.ts:181-203,36-90,96-122`) |
| Use-for-training toggle (per row) | calls `markForTraining([id], !current)`, then revalidates; button disabled while loading | `POST /api/suggestions/training-set` `{extractorId, suggestionIds, useForTraining}`; only ids owned by the extractor are updated; responds `{updated, useForTraining}` (`adapters/TrainingSetController.ts`, `application/MarkSuggestionsUseForTrainingUseCase.ts:15-28`) |
| "Open" (per row) | opens the PDF sidepanel for PDF-source extractors, otherwise the property sidepanel; disabled without an entity (`IXSuggestions.tsx:265-269`, `TableElements.tsx:237-255`) | on save see sidepanel rows below |
| "Stats & Filters" | opens filters sidepanel | none |
| "Clear all" (filters) | deletes `filter` param, closes, resets form | none (URL change reruns loader: `GET /api/suggestions/`) |
| "Apply" (filters) | sets `filter` JSON and `page=1`, closes | `GET /api/suggestions/?filter[extractorId]&filter[customFilter]&page&sort` returns `{suggestions,totalPages,total}` (page size max 500, `routes.ts:41-89`) |
| Column header sort | updates `sort` param; sorting is server side (`manualSorting`) | same GET |
| "Train model" (disabled while rows are selected) | opens train modal; "Train" calls `suggestionsAPI.findSuggestions`, registers a Beacon task "Training model: <name>", sets status `sending_labeled_data` (`IXSuggestions.tsx:142-176`) | `POST /api/suggestions/train` `{extractorId, suggestionsToFind, options:{samplePolicy}}`. `ixmodels.startTraining` claims the model (409 `ModelNotReadyError`, "Model for extractor with ID <id> is not ready." if a run is in flight), stores `samplePolicy`, emits `ix_model_status processing_model`, dispatches queue job `IXTrainModelJob` (lock window 20 min). Responds 202 `{status:'processing_model', message:'Training model'}` (`routes.ts:133-176`; `InformationExtraction.ts:835-861`; `ixmodels.ts:63-74`; `TrainModelJob.ts:33-98`) |
| "Cancel" (replaces "Train model" while status is not `ready`) | `cancelModelTrain`: status becomes `cancel` ("Canceling...") or `ready` if it was in `error`; revalidates; clears accepted set (`:178-193`) | `POST /api/suggestions/stop`: marks model ready, clears the run configuration, marks in-flight suggestions obsolete. The external service cannot be called back, so late results are discarded (`InformationExtraction.ts:940-951,1015-1027`) |
| "Process extractor" / "Process selected" | opens process modal; "Process" calls `processExtractor`, registers a task, shows "Finding suggestions..." with `processed / total` (`:195-254`) | `POST /api/suggestions/process`. Requires a model with status `ready`; if no model exists or it is busy: 409 `ModelNotReadyError`. Stores `processRun` on the model, optionally limits to selected shared ids, computes the total, sends batches (50 PDFs or 1000 property texts) to the external service and starts the results task; with auto-accept dispatches `AcceptSuggestionsJob` in batches after the find phase (`ProcessSuggestions.ts:70-175`; `InformationExtraction.ts:790-810`; `AcceptSuggestionsUseCase.ts`, `jobs/AcceptSuggestionsJob.ts`) |
| Sidepanel "Accept" (PDF / property sidepanel) | see Save model | entity update + optional training-set flag |
| Sidepanel "Clear" | removes highlight and, in the PDF panel, the stored selection for the property | none until Accept |
| Sidepanel "Click to fill" (text, date, numeric, markdown) | copies the selected text into the field; date/numeric are coerced locally with `parseLocalizedDate`, falling back to the API; sets "Use for training" automatically once the field is dirty (`PDFSidepanel.tsx:118-122,156-186`, `sidepanelFunctions.ts:93-113`) | coercion fallback: entities API `coerceValue` |
| "Select & Search" toggle (select, multiselect, relationship) | when on, selected PDF text fills the list search box (`SidepanelForms.tsx:76-81,143-161`) | relationship lists search entities with a Lucene query (`:206-229,268-313`) |

- **Confirmations**: none (no confirm for Accept, Train, Process, Cancel).
- **Empty / loading / error / notification states** (exact copy):
  - Run status in the footer (`ixmessages`, `IXSuggestions.tsx:53-61`): `ready` -> nothing shown (buttons "Train model"/"Process extractor" enabled); `sending_labeled_data` "Sending labeled data..."; `processing_model` "Training model..."; `processing_suggestions` "Finding suggestions..." + `processed / total`; `processing_auto_accept` "Accepting suggestions..." (+ count); `cancel` "Canceling..."; `error` "Error" plus " : <message>".
  - Notifications: "Suggestions sent" (info), "Suggestions updated" (success, on socket success), "An error occurred" with the server message (error, on socket error, on `ix:error_training_model`, and on a `ready` status flagged `{error:true}`, `IX/hooks/useEventHandler.ts:57-82`). Sidepanel save: "Saved successfully." (success) or "An error occurred" + `prettyMessage`.
  - Task panel entries: "Training model: <name>", "Finding suggestions: <name>" with percent, "Accepting suggestions: <name>"; ends complete on `ready`, fails with the message on error (`IX/taskProgress.ts:26-102`).
  - Row-level copy: "Error", "No context", "(obsolete)", "No value" (property panel with no text), "values", "suggestions", "matching", "mismatching". Sidepanel field errors: "This field is required" (sr-only), "Value cannot be transformed to the correct type", "Could not detect the area for the selected text" (`SidepanelForms.tsx:431-434`, `PDFSidepanel.tsx:176,211`).
  - Server error texts surfaced via the `error` event: "There are no Segments for training the model", "There are no labeled Files for training the model", "There are not Entities for training the model", "Documents are not segmented yet. Try again once PDF segmentation has finished." (`ixMaterials.ts:49-71`, `TrainModelForText.ts:34-40`, `InformationExtraction.ts:63-64`).
  - Empty table: "NO DATA AVAILABLE".
- **Save model**: Table actions are immediate. Accept per row is fire-and-forget with socket confirmation. Train/Process are modals with explicit submit. Entity sidepanels are explicit-submit forms: Cancel (ghost) bottom left; bottom right a checkbox "Use for training" and the success-variant "Accept" button. On submit: if the field changed, the entity is saved with `entitiesAPI.update` (PDF panel also sends `propertySelections {fileID, selections}`); for relationship properties the same value is written to the template's other relationship properties with the same `content` (`sidepanelFunctions.ts:56-91`); if the field or training flag changed, `onEntitySave` posts the training flag when it differs, otherwise just revalidates; the panel then closes even if the save failed (`PDFSidepanel.tsx:124-154`, `PropertySidepanel.tsx:94-119`). No dirty guard; Escape or overlay click discards.
- **Run states and polling** (VERIFIED): the loader reads status once via `POST /api/suggestions/status` (returns `ready`, `processing_model`, `cancel`, `failed`, `processing_suggestions` + `{processed,total}`, or `processing_auto_accept`, `InformationExtraction.ts:863-918`). Live changes arrive on socket event `ix_model_status(extractorId, status, message, data)`; the client revalidates on every event and also listens to `ix:error_training_model` and `ACCEPT_SUGGESTION_*` (`IX/events.ts:21-29`, `useEventHandler.ts:28-96`). There is no timed polling on this page. Server side the results come back through Redis queue `<ENV>_information_extraction_results` polled every 500 ms (`TaskManager.ts:62-103`).
- **V1 vs V2**: V1 removed.
- **Notes/gotchas** (VERIFIED by reading unless stated):
  - There is no bulk "Accept" for selected rows. Row selection only feeds "Process selected" and disables "Train model". The only bulk accept is "Auto-accept suggestions" inside the Process modal ("From all suggestions" is the "accept all" path).
  - "Selected <n> of 100" uses the page-size constant, not the total (`IXSuggestions.tsx:441-455`).
  - The server can return model status `failed` (`InformationExtraction.ts:878-880`), but the client enum `ixStatus` has no `failed` value (`IX/types.ts:72-80`). The footer then shows "Cancel" with no status text because `ixmessages['failed']` is undefined.
  - Failure path `handleFailedStatus` for `create_model` emits `ix_model_status` with status `'error'` (`InformationExtraction.ts:195-201`). The hook handles unknown statuses by setting `ready` and showing no notification (`useEventHandler.ts:57-64`), and the task listener ignores it (`taskProgress.ts:61-89`), so the Beacon task can stay "running" (ASSUMED from code reading, not run).
  - Rows with `state.processing` get `disableRowSelection` (`IXSuggestions.tsx:548`).
  - Suggestion `state` flags: labeled, withValue, withSuggestion, match, hasContext, obsolete, processing, error (`app/shared/getIXSuggestionState.ts:71-110`). A row turns obsolete when entity or file data changed after the suggestion was made (listeners `app/api/suggestions/listeners/afterEntityUpdatedListener.ts`, `afterFileCreatedListener.ts`; both skip when `features.metadataExtraction` is falsy).
  - The e2e fixture `database/ix_config.sh:5-9` sets both feature keys plus `segmentation.url`; PDF extractors also need segmented PDFs (`features.segmentation`).

---

## 2. Paragraph extraction (PX)

### 2a. Paragraph extraction: extractors dashboard

- **Route / file**: `/settings/paragraph-extraction` (index) `Routes.tsx:414-423`; component `PX/ParagraphExtraction.tsx:15-73`; loader `ParagraphExtractorLoader` `PX/Loaders.ts:22-27` (GET extractors). Create dialog `PX/components/extractors/CreateDialog/*`; delete dialog `PX/components/extractors/DeleteDialog/index.tsx`; table `PX/components/extractors/Table.tsx`, columns `TableElements/columns.tsx`.
- **Who can see it**: route guard admin+editor (`Routes.tsx:416-421`). Nav: `NeedAuthorization ['admin','editor']` + `FeatureToggle feature="paragraphExtraction"` (`SettingsNavigation.tsx:74-81`). Server: every PX endpoint uses `needsAuthorization(['admin','editor'])` then `featureFlagEnabled('paragraphExtraction')` (403 `{error:'Feature not available'}`) (`app/api/paragraphExtraction/adapters/PXRoutes.ts:15-62`, `app/api/utils/featureFlagEnabledMiddleware.ts`). Note the order: auth first, then the flag. The flag is a tenant feature flag, not a `settings.features` key (section 4).
- **Layout**: Header title "Paragraph Extraction". Table with header "Extractors", selection checkboxes. Columns: "Source Template" (coloured pill), "Target Template" (coloured pill), "Entities" (total count + indigo pill "<n> New" when new > 0), action column (sr-only "Action") with a secondary "View" button linking to `<id>/entities/?page=1` (`columns.tsx:11-40`, `EntityCountCell.tsx`, `ActionCell.tsx`). Sticky footer: "Add extractor" when nothing selected; otherwise a danger "Delete" button and "Selected <n> of <total extractors>" (`ParagraphExtraction.tsx:51-69`).
- **Fields** (create dialog, 3 steps, `Modal size="xxl"`, aria-label "Paragraph extractor wizard", `Dialog.tsx:14`):

| Step / field | Control | Default | Rules | Copy | file:line |
|---|---|---|---|---|---|
| 1 Target template | single-select `MultiselectList`, search | none | only templates with at least one rich text (markdown) and one numeric property are listed | title "Target template"; description "Select the template to store the extracted paragraphs."; hint "Only templates with at least one rich text property and one numeric property are available for selection."; buttons "Cancel", "Next" (disabled until selected) | `steps/TargetTemplate/*`, `utils/filterPXQualifiedTemplates.ts:3-5`, `Dialog.tsx:33-39` |
| 2 Source template | single-select list | none | lists all templates except the chosen target and except templates already used as source by another extractor (this list is not limited to qualified templates) | title "Source template"; description "Select the template with the source documents."; hint "Only templates that are not used as source in any other extractor and are not selected as target in this extractor are available for selection."; buttons "Back", "Next" | `steps/SourceTemplate/Body.tsx:18-27`, `Footer.tsx`, `Dialog.tsx:41-47` |
| 3 Paragraph text property | `Select` | "Select..." | options = target template properties of type markdown, value is the property `_id` | label "Paragraph text extraction property (rich text)" | `steps/ExtractionConfiguration/Body.tsx:69-82` |
| 3 Paragraph number property | `Select` | "Select..." | options = numeric properties | label "Paragrap number extraction property (numeric)" (typo in source: "Paragrap") | `Body.tsx:84-97` |
| 3 Target relationship type | `Select` | "Select..." | options = all relationship types minus the selected source type | label "Target relationship type"; help "Target's role in the relationship Source-Target." | `Body.tsx:100-120` |
| 3 Source relationship type | `Select` | "Select..." | options = all relationship types minus the selected target type | label "Source relationship type"; help "Source's role in the relationship Source-Target." | `Body.tsx:121-142` |

  Step title "Extraction configuration", empty description. Footer: "Back", "Create" (success), disabled until all six values are set (`Footer.tsx:27-33,56-71`). Dots below the body show the step (`Steppers.tsx`). Server validation (`PXCreateExtractor.ts`, `PXExtractor.ts`): both templates exist; both relationship types exist; source type must differ from target type (`SAME_SOURCE_TARGET_RELATIONTYPE`); no extractor may already use that source template (`EXTRACTOR_ALREADY_EXISTS`); paragraph property must exist and be rich text; number property must exist and be numeric; target and source templates must differ. All are `PXValidationError`, answered 422 with English messages (e.g. "Cannot create an Extractor with a source template that already has an Extractor. sourceTemplateId: <id>").
- **Actions**:

| Control | Client behaviour | Server call and effect |
|---|---|---|
| "Add extractor" | opens create dialog (disabled while `isSaving`) | none |
| "Create" (step 3) | `extractorsAPI.save`, closes dialog, revalidates, notify success "Paragraph Extractor added" (`Footer.tsx:35-54`) | `POST /api/paragraphExtraction/extractor` body keys `sourceTemplateId, targetTemplateId, paragraphPropertyId, paragraphNumberPropertyId, sourceRelationshipTypeId, targetRelationshipTypeId`; response `{extractorId}`. In one transaction: inserts into collection `px_extractors` and dispatches job `CreateParagraphExtractionEntityStatusesJob` that creates one `px_entities_status` row per source-template entity: `processed` if paragraph relationships already exist, else `new` (`app/api/paragraphExtraction/application/PXCreateExtractor.ts:96-128`, `PXCreateEntityStatuses.ts:57-105`) |
| "Delete" | opens confirmation | `DELETE /api/paragraphExtraction/extractor?id=<id>` once per selected extractor, in parallel (`PX` API `remove`: `app/react/V2/api/paragraphExtractor/extractors.ts:29-34`). Server deletes the extractor and all its `px_entities_status` rows in a transaction; throws if the id does not exist (`MongoPXExtractorsDataSource.ts:104-120`). Paragraph entities and relationships already created are not deleted |
| "View" (row) | navigates to the entities page | none |
| Dialog "Cancel" / X | `setShowModal(false)` | none |

- **Confirmations**: Delete extractors: `ConfirmationModal` header "Are you sure?"; warning "Only the extractor will be deleted, all created entities will remain on the library."; buttons "No, cancel" / "Delete" (`DeleteDialog/index.tsx:45-57`). Result: notify success "Extractor/s deleted", clears selection; failure notify error "An error occurred" (no details) (`:25-40`).
- **Empty / loading / error / notification states**: Empty: "NO EXTRACTORS." (`TableElements/NoDataCell.tsx:4-8`). Create success "Paragraph Extractor added". Create failure: `handleUnexpectedError` -> "An error occurred" + server `prettyMessage`, only when `isClient` (`Footer.tsx:49-52`). No loading indicator beyond button disabling.
- **Save model**: wizard modal with explicit "Create"; no edit flow (there is no "edit extractor": VERIFIED, only create and delete exist in UI and API). State lives in `CreateExtractorContext`; closing discards it. No dirty guard.
- **V1 vs V2**: V1 removed (no `app/react/ParagraphExtraction`).
- **Notes/gotchas**:
  - `NoQualifiedTemplatesMessage` components exist for both steps (copy "No valid target template available", "A target template needs to have the following properties:", "1 Rich text", "1 Numeric", "A source template must:", ...) but are not imported anywhere (VERIFIED by grep), so an empty template list shows an empty list, with only the step 1 dots dimmed (`Dialog.tsx:31`).
  - Paragraphs are created as entities of the target template and linked with legacy V1 relationships (`relationshipsDS.save`), not the `newRelationships` v2 store (`PXCreateParagraphsBatch.ts:111-124`, `import relationshipsDS from '#api/relationships/relationships.js'`). Interaction with `features.newRelationships` was not checked.
  - Extraction needs `EXTERNAL_SERVICES=true` and `PARAGRAPH_EXTRACTION_URL` (default `http://localhost:5056`) (`app/api/config.ts:227`, `PXExtractionServiceFactory.ts`).

### 2b. Paragraph extraction: entities of one extractor

- **Route / file**: `/settings/paragraph-extraction/:extractorId/entities` (`Routes.tsx:424-432`). Component `PXEntityDashboard` `PX/PXEntities.tsx:27-158`; loader `PXEntityLoader` `PX/Loaders.ts:29-70`. Query params: `page` (default 1, size 30, `PAGE_SIZE` `Loaders.ts:20`), `status` (repeatable).
- **Who can see it**: as 2a (guard `Routes.tsx:428-432`; server `PXRoutes.ts:50-55` for `extractorStatuses`, `:29-41` for extract endpoints).
- **Layout**: Header breadcrumb "Paragraph extraction" > source template name. Table header "Paragraphs for" + coloured source template pill (`PX/components/TableTitle.tsx`); right action "Filters" (funnel, badge counts every query param except `page`, `FilterSidepanelButton.tsx:12`). Columns, none sortable: "Entity" (title), "Language(s)" (uppercase gray pills of languages that have a processed PDF), "Paragraphs" (count), "Status" (pill), action "View" (sr-only "Action") (`entities/TableElements/columns.tsx:11-42`). Footer of table: "Showing a-b of N" and paginator (`PXTableFooter.tsx`). Sticky footer (`PXEntities.tsx:120-153`): with no selection, button "Extract new paragraphs" and an indigo "<n> New" pill; with a selection, button "Extract paragraphs" and "Selected <n> of <totalRows>".
- **Fields**: filter sidepanel (title "Filters", uppercase): section "Status", one checkbox per status with a count and dotted leader: "New", "Processing", "Obsolete", "Error", "Processed" (the `total` key is removed). Buttons "Clear All" (clears the checkboxes only; nothing is applied until "Apply") and "Apply" (success variant) which rewrites `status` params and closes (`PX/components/FilterSidePanel/EntityFilterSidepanel.tsx:48-110`, `Filters.tsx:34-66`). Counts come from `extractor.statusCount`.
- **Actions**:

| Control | Client behaviour | Server call and effect |
|---|---|---|
| "Extract new paragraphs" | disabled when no row on the loaded page has status New or while saving; calls `extractParagraphs(extractorId)`, revalidates twice, notify success (`PXEntities.tsx:40-70,123-128`) | `POST /api/paragraphExtraction/extractNew {extractorId, status:'new'}` -> gets every entity status `new` for the extractor (all pages, not only the loaded one) and runs the extract flow below (`PXExtractParagraphsByEntityStatus.ts:26-33`) |
| "Extract paragraphs" (selected rows) | opens confirmation; Continue calls `extractSelected` (`ExtractEntitiesDialog/index.tsx:27-59`) | `POST /api/paragraphExtraction/extract {extractorId, entitySharedIds[] (min 1)}`. For each id (sequentially): skip if no status row or status is `processing`/`processing_obsolete`; mark `processing`; dispatch `PXExtractParagraphsFromEntityJob` (`PXExtractParagraphFromEntities.ts:27-55`). The job: loads extractor, entity, installed languages; picks the newest processed PDF per installed language; requires a ready segmentation for each; deletes the entity's previously created paragraph entities; posts XML + segment boxes to the external service `/extract_paragraphs` with a key (tenant, user, status id) (`PXExtractParagraphsFromEntity.ts:55-110`). Result comes back through Redis queue `extract_paragraphs`, `PXParagraphsResultListener` dispatches `PXCreateParagraphsJob`, which creates paragraph entities per language in batches of 100 (title `<entity title>.<NN>`, text, number), creates a V1 relationship per paragraph (source entity with the source relationship type, paragraph with the target relationship type), then marks the status `processed`; a non-retriable failure marks `error` (`PXParagraphsResultListener.ts:34-52`, `PXCreateParagraphsJob.ts:35-69`, `PXCreateParagraphs.ts:102`, `PXCreateParagraphsBatch.ts:62-124`) |
| "View" (row) | navigates to `<sharedId>/paragraphs` | none |
| Filters "Apply" / "Clear All" | see Fields | list reloads via `GET /api/paragraphExtraction/extractorStatuses?id&page[number]&page[size]&filter[status][]` |

- **Confirmations**: Extract: header "Are you sure?"; warning "All of the previously created paragraphs will be deleted and recreated after the process."; buttons "No, cancel" / "Continue" (`ExtractEntitiesDialog/index.tsx:72-83`). A `DeleteDialog` for entity paragraphs exists (header "Are you sure?", warning "All of the paragraphs will be deleted", buttons "No, cancel"/"Delete", success toast "Paragraphs deleted") but is not imported by any page (VERIFIED by grep), and its API function is a stub that resolves without calling the server (`app/react/V2/api/paragraphExtractor/entities.ts:60-70`). No server delete-paragraphs endpoint exists in `PXRoutes.ts`.
- **Empty / loading / error / notification states**:
  - Status pills (`PXEntityStatus.tsx:7-34`): New (indigo pill "New"), Processing ("Processing..." gray pill), Processed (green check, sr-only "Processed"), Error (red pill "Error"), Obsolete (blue pill "Obsolete"). Server status `processing_obsolete` is mapped to `processing` for the client (`PXEntityStatusMapper.ts:15-25`).
  - Started: notify success "The process of extracting the paragraphs has successfully started. Check the Status column for updates on the process."
  - Missing extractor: notify error "An error occurred" with details "Cannot find extractor".
  - Failure of the API call: see gotcha (success toast may still show).
  - Empty table: "NO DATA AVAILABLE".
- **Save model**: no forms; actions are immediate. Polling: `revalidator.revalidate()` every 25 s (`POLL_INTERVAL_SECONDS`, `PXEntities.tsx:25,93-101`); on revalidate only each row's status is patched in place, so selection and page stay stable; a page change replaces the rows (`:72-91`). No sockets on PX pages.
- **V1 vs V2**: V1 removed.
- **Notes/gotchas** (VERIFIED):
  - `extractParagraphs` and `extractSelected` catch their own errors and return them instead of throwing (`api/paragraphExtractor/entities.ts:23-34,36-58`), and the callers do not inspect the return value, so the success notification can appear after a failed request (the legacy `api` util may add an error toast at the same time).
  - "New" pill and the enabled state of "Extract new paragraphs" count only rows on the current page (`PXEntities.tsx:38`), while the server extracts all `new` entities.
  - Status `new` is created for entities when the extractor is created, when an entity changes into the source template, and when a ready document with a changed language appears; `obsolete` is set when a document that fed the previous extraction is replaced (`PXEntityUpdatedListener.ts:66-104`, `PXEntityStatusManager.ts:46-140`).
  - Rows are entity titles in the request language (`MongoPXExtractorsQueryService.ts:159-168`).

### 2c. Paragraph extraction: paragraphs of one entity

- **Route / file**: `/settings/paragraph-extraction/:extractorId/entities/:sharedId/paragraphs` (`Routes.tsx:433-441`). Component `PXParagraphDashboard` `PX/PXParagraphs.tsx:14-70`; loader `PXParagraphLoader` `PX/Loaders.ts:90-157` (settings default language, extractors, `GET /api/paragraphExtraction/entityParagraphs`, source entity, templates; page size 30).
- **Who can see it**: as 2a (server `PXRoutes.ts:57-62`).
- **Layout**: Header breadcrumb "Paragraph extraction" > source template name > entity title. Table header "Paragraphs for" + source template pill + language pills; right action "Open PDF" (ghost). Columns, none sortable: "Paragraph #", "Language" (uppercase pill), "Text" (truncated to 200 characters with tooltip), action "View" (sr-only "Action"). Rows are grouped: the first row is the main-language paragraph and the other languages are sub-rows (`groupColumnPosition={3}`, `PX/components/paragraphs/Table.tsx:51-67`; `paragraphs/TableElements/tableBuilder.ts:11-42`). Footer with "Showing a-b of N" and paginator. No row selection and no sticky footer.
- **Fields**: none (read only). "View" side panel (title "Entity", uppercase) shows: entity title with a coloured template pill; "Language: <localized label>"; "Document: <original file name>"; "Paragraph: <number>"; a bordered box "Text" with the paragraph text (`ViewParagraph.tsx:24-47`). Footer button "View entity" (secondary, small) opens `/<language>/entity/<sharedId>` in a new tab (`ViewParagraphSidePanel.tsx:37-45`). "Open PDF" side panel (large): title = entity title, body = the PDF of the main-language document (`/api/files/<filename>`), footer button "Close" (`PDFSidepanel.tsx:14-45`).
- **Actions**: "Open PDF" (client only), "View" (opens side panel, client only), "View entity" (link), "Close". Server: only the GET above; no writes.
- **Confirmations**: none.
- **Empty / loading / error / notification states**: empty "NO DATA AVAILABLE"; if extractor, id or shared id is missing the loader returns empty rows (`Loaders.ts:112`). No toasts.
- **Save model**: read only, no save.
- **V1 vs V2**: V1 removed.
- **Notes/gotchas**: paragraph entities live in the target template and can be edited in the normal entity views; this page has no edit or delete. The language list in the header is derived from the first row only (`Table.tsx:32-47`).

---

## 3. New Relationships Migration

### 3a. New Relationships Migration dashboard

- **Route / file**: `/settings/newrelmigration` (`Routes.tsx:502-507`): `settings?.features?.newRelationships ? <NewRelMigrationDashboard/> : <GeneralError/>`. Component: `app/react/Settings/components/relV2MigrationDashboard.tsx:98-515` (React class component connected to Redux, wrapper export `:527`). API client: `app/react/Entities/V2NewRelationshipsAPI.js`, actions `app/react/Entities/actions/V2NewRelationshipsActions.js`. Backend: `app/api/relationships.v2/routes/routes.ts`.
- **Who can see it**:
  - Route: no role guard of its own; it is inside `loggedInUsersRoute` only (`Routes.tsx:324,502-507`). The gate is the feature key `features.newRelationships`, read from the SSR settings.
  - Nav: `NeedAuthorization roles={['admin']}` + `FeatureToggle feature="newRelationships"`, label "New Relationships Migration" (`SettingsNavigation.tsx:90-109`).
  - Server: migration and plan endpoints use `needsAuthorization()` (default role `['admin']`, `app/api/auth/authMiddleware.ts:16-23`) then `featureRequired` (404 unless `readNewRelationshipsAllowed()` i.e. `settings.features.newRelationships` truthy, `routes.ts:34-43`, `MongoSettingsDataSource.ts:170-172`). The CRUD endpoints `GET/POST/DELETE /api/v2/relationships` have only `featureRequired` and no `needsAuthorization` (`routes.ts:46-65`).
  - ASSUMED consequence (code path verified, not run): because only admins receive `settings.features`, a non-admin who types the URL gets the error page, not the dashboard.
- **Layout**: unstyled legacy markup (classes `settings-content`, `panel panel-default`, `btn`), root div has attribute `no-translate`, so none of its text goes through translations (`:338-340`). Top to bottom: panel heading "Migration Dashboard"; buttons "Dry Run" and "Migrate"; optional confirm block; optional "Migration Summary"; "Current migration plan:" list with per-row buttons; add-row line with three selects and "Add"; "Test One Hub" button + text input + optional test result table; paginated list of unused connections.
- **Fields**:

| Field | Control | Default | Validation | Copy | file:line |
|---|---|---|---|---|---|
| New plan row: source template | `<select>` of all templates sorted by name | first template | none client side | none | `:424-433,149-156` |
| New plan row: relationship type | `<select>` of all relationship types sorted by name | first type | none | none | `:434-443` |
| New plan row: target template | `<select>` of all templates | second template (index 1) | none; "ALL" is shown for plans without a target template but cannot be chosen here | none | `:444-453` |
| Test one hub id | plain `<input type=text>` | empty | none; server requires a string `hubId` | none | `:460-463`; `validators/migration.ts:30-36` |

  Server schema for plan rows: `sourceTemplate, sourceTemplateId, relationType, relationTypeId, targetTemplate` required strings; `targetTemplateId, inferred, ignored` optional (`validators/migration.ts:5-28`).
- **Actions**:

| Control (exact label) | Client behaviour | Server call and effect |
|---|---|---|
| (on mount) | loads plan, indexes templates and relation types, loads first page of unused connections (`:132-159`) | `GET /api/v2/relationshipMigrationFields` -> `getAllCombinedWithInferred`: one "inferred" entry per v1 relationship property found in templates (`infered:true`, flag name spelled `infered` in the API) merged with stored rows (stored `ignored` overrides) (`GetRelationshipMigrationFieldService.ts:37-61`); `GET /api/v2/migrationHubRecords?page&pageSize=10` |
| "Dry Run" | sends plan with `dryRun:true`, shows summary, resets unused page to 1 (`:171-181`) | `POST /api/v2/relationships/migrate {dryRun, migrationPlan}`. Reads all v1 connection hubs, applies the plan matcher (ignored rows excluded), counts total/used/text references/errors, writes unused-hub records to `migrationHubRecords`, creates then drops a temporary hubs collection; writes no relationships. The request is synchronous and the response carries elapsed `time` in ms (`routes.ts:67-89`; `MigrationService.ts:355-375`; `setupDB` deletes previous hub records) |
| "Migrate" | shows the confirm block (`:199-202`) | none |
| "Perform" (in confirm) | sends `dryRun:false`, hides confirm (`:183-187`) | same endpoint with `dryRun:false`: additionally `relationshipsDS.deleteAll()` first (removes every existing v2 relationship), then inserts the transformed relationships in batches of 1000 hubs. Not transactional across batches (VERIFIED order in `MigrationService.migrate`; atomicity not verified) |
| "Cancel" (in confirm) | hides confirm | none |
| "Ignore" / "Unignore" (plan row) | optimistic toggle of `ignored`, reverts on failure (`:209-219`) | `POST /api/v2/relationshipMigrationFields` (upsert by source template + relation type + target template). Stores a row even for inferred entries |
| "Remove" (plan row, only when not inferred) | splices the row after success (`:250-256`) | `DELETE /api/v2/relationshipMigrationFields?sourceTemplate&relationType&targetTemplate` |
| "Add" | appends the created row to the list (`:239-248`) | `PUT /api/v2/relationshipMigrationFields` (create) |
| "Test One Hub" | sends the typed id with the plan, shows result (`:193-197`) | `POST /api/v2/relationships/test_one_hub {hubId, migrationPlan}`: returns counts plus original connections and transformed relationships for that hub; no writes (`routes.ts:91-116`) |
| "←" / "→" (unused connections pager) | changes page, reloads | `GET /api/v2/migrationHubRecords` (server loads all records then slices, `GetMigrationHubRecordsService.ts:13-18`) |

- **Confirmations**: "This will clean all your existing v2 relationships. Are you sure?" with buttons "Perform" and "Cancel" (`:352-362`). Inline block, not a modal.
- **Empty / loading / error / notification states** (exact copy, all untranslated English):
  - Summary: "Migration Summary" (+ " (Dry Run)"), "Time: <ms or s>", "Total: <n>(text references: <n>)", "Used: <n>(<n>)", "Unused: <n>(<n>)", "Errors: <n>" (`:365-388`, `formatTime` `:90-96`).
  - Plan row text: `<source> -> (<relation type>) -> <target or ALL> -- <inferred|user defined>[, ignored]`.
  - Hub test: "Test Result:", "Total", "Used", "Unused", table headers "Original Hub", "Transformed".
  - Unused list: separator line `<index>---------------------------:<hubId>` per hub, rows `(<relation type name>) link <entity title>(<template>)`; pager `<page>/<max>`.
  - No loading indicator, no success or error messages of its own. Errors come only from the legacy `api` util toasts (`api.js:134-146`). The sync migrate call can run long with no progress UI.
- **Save model**: plan edits (Ignore, Remove, Add) are saved immediately per click. Migration runs on explicit button press; "Migrate" requires the inline confirm. No dirty guard (nothing to lose).
- **V1 vs V2**: This page is itself legacy-style UI (class component, Redux `connect`, bootstrap-like classes) for the backend module `app/api/relationships.v2`. It is the only UI that lets an admin convert V1 connections ("hubs") to V2 relationships. Nothing to port: it is a one-off tool.
- **Notes/gotchas** (VERIFIED unless stated):
  - `componentDidMount` reads `templatesNameSorted[1]` and `relationTypesNameSorted[0]` without checks; a collection with fewer than two templates or no relationship types throws on mount (`:149-156`). `mapPlanElementFromApiResponse` also throws if a plan row refers to a deleted template or relation type (`:62-82`).
  - State is held in instance fields with `forceUpdate()` rather than React state.
  - "Test One Hub" with an empty id sends `hubId: undefined`; 422 validation expected (ASSUMED).
  - What the flag also does elsewhere: `entities/v2_support.ts:20-35,102-175` (entity save creates v2 relationships), `search/search.js:189,449,1009`, `relationships.v2/templates/v2_support.ts:43`, Library metadata panel `react/Library/components/ViewMetadataPanel.js:66`. `newRelationships` may also be `{updateStrategy:'OnlineRelationshipPropertyUpdateStrategy'|'QueuedRelationshipPropertyUpdateStrategy'}` (`settingsType.ts:133-139`, `service_factories.ts:97-110`).

---

## 4. Feature toggles and flags

### 4a. How features are defined and where they are set

- **Route / file**: none (no settings page edits features). Definitions: `app/shared/types/settingsType.ts:101-140` (settings.features), `app/api/core/application/settings/saveSettingsInput.ts:84-151` (zod, `.passthrough()` so unknown keys such as `metadata-extraction` are accepted), `app/api/tenants/featureFlags.ts:7-29` (tenant flags), `app/api/config.ts:196-217` (env defaults), `app/react/entry-server.tsx:385-399` (merge for the client), `app/react/V2/Components/UI/FeatureToggle.tsx:6-18` and legacy `app/react/components/Elements/FeatureToggle.tsx:19-22` (UI gates).
- **Who can see it**: not applicable to a page. Who can read: `settings.features` is part of the admin projection only (`publicSettings.ts:37-46`, `SettingsQueryService.ts:27-29,48-57`); non-admins (including editors) get public fields plus the tenant flags that SSR copies in (`entry-server.tsx:385-399`). Who can write: `POST /api/settings` requires `needsAuthorization()` i.e. admin (`app/api/core/infrastructure/express/settings/routes.ts:8-10`). Tenant flags: CLI `yarn uwazi tenants feature-flags` (`apps/cli/tenants/routes/SetFeatureFlagsRoute.ts:10`, merge semantics in `app/api/tenants/application/SetTenantFeatureFlags.ts`: null removes a flag, missing flags stay) or env at process start.
- **Layout / Fields / Actions / Confirmations / Save model**: none found (no UI).
- **Empty / loading / error / notification states**: none found. Backend responses: IX routes 404 `{}` without `metadataExtraction.url`; PX routes 403 `{error:'Feature not available'}` without the tenant flag; v2 relationship routes 404 without `newRelationships`.
- **V1 vs V2**: the legacy Redux `FeatureToggle` reads `settings.collection.features` with the same dotted path syntax (`components/Elements/FeatureToggle.tsx:19-22`); the V2 one reads the Jotai `settingsAtom` (`FeatureToggle.tsx:14-17`). Both treat missing values as off.

Features that gate settings navigation or these pages:

| Key (exact) | Kind and location | Type | Set by | Gates | Evidence |
|---|---|---|---|---|---|
| `metadata-extraction` | `settings.features['metadata-extraction']` (Mongo or Postgres settings document) | boolean (undeclared key, allowed by passthrough) | direct DB write (`database/ix_config.sh:5-9`) or `POST /api/settings` as admin. No code writes it; no UI | nav item "Metadata Extraction" only (`SettingsNavigation.tsx:66`). Not checked by the route nor by the API | `ix_config.sh:7`, `saveSettingsInput.ts:151`, `settingsType.ts:~134` (`[k: string]: unknown`) |
| `metadataExtraction` | `settings.features.metadataExtraction` | `{url: string, templates?: [{template, properties[]}]}` | same as above (`ix_config.sh:8`: `{"url":"http://127.0.0.1:5056"}`) | all IX API routes (404 without `url`), IX external service URL, entity/file listeners that keep suggestions in sync | `serviceMiddleware.ts:4-13`, `InformationExtraction.ts:606-614`, `suggestions/eventListeners.ts:22-23`, `listeners/afterFileCreatedListener.ts:35`, `afterEntityUpdatedListener.ts:34` |
| `paragraphExtraction` | tenant feature flag (not in `settings.features` in the DB); copied into `settings.features` at SSR | boolean | env `FEATURE_FLAG_PARAGRAPH_EXTRACTION=true` for the default tenant (`config.ts:89,201`); per-tenant override through the tenants store/CLI (`featureFlags.ts:12`; merge `tenantContext.ts:73-92`). `ix_config.sh:6` also writes a `paragraphExtraction` key into `settings.features`, which SSR overwrites with the tenant flag (spread order `entry-server.tsx:397-399`) | nav item "Paragraph Extraction" (`SettingsNavigation.tsx:74`), all 7 PX endpoints (403), PX event listeners (`featureFlaggedHandler`) | `PXRoutes.ts:18-60`, `PXEntityUpdatedListener.ts:108`, `PXEntityDeletedListener.ts:43`, `PXFilesDeletedListener.ts:158`, `PXFileUpdatedListener.ts:52` |
| `preserve.host` | `settings.features.preserve = {host, masterToken, config:[{token, template, user?}]}` | object (path checked is `preserve.host`) | DB or `POST /api/settings` (admin) | nav item "Preserve" with icon (`SettingsNavigation.tsx:92-101`). The route `/settings/preserve` is `adminsOnlyRoute` with no feature check (`Routes.tsx:346`). Server reads `features.preserve` in `app/api/preserve/preserve.ts:18` and `app/api/services/preserve/preserveSync.ts:223` | `saveSettingsInput.ts:68-82` |
| `newRelationships` | `settings.features.newRelationships` | boolean or `{updateStrategy}` | DB or `POST /api/settings` (admin) | nav item "New Relationships Migration", the route (error page when off), all `/api/v2/relationship*` and `/api/v2/migrationHubRecords` routes (404) | `SettingsNavigation.tsx:102-109`, `Routes.tsx:502-507`, `routes.ts:34-43`, `saveSettingsInput.ts:120-132` |

Other client-visible flags (tenant flags copied into `settings.features`, none gate settings nav): `ClientFeatureFlags` = `paragraphExtraction, themeCustomization, newHeader, featureFlagEntityViewerv2, featureFlagLibraryV2, aiAssistant, translationService, experimentalFeatures` (`app/react/V2/shared/types.ts:72-81`). Env defaults: `newHeader` is on unless `NEW_HEADER=false`; the others are on only when `FEATURE_FLAG_*` env is `'true'` (`config.ts:201-217`). `featureFlag*` consumers: `featureFlagLibraryV2` -> `Routes.tsx:139,169,226` via `react/utils/libraryPaths.ts:6` and header link `Header.tsx:82`; `featureFlagEntityViewerv2` -> `Routes.tsx:201,285` via `react/utils/entityViewerPaths.ts:21` and SSR redirect `entry-server.tsx:405-412`; `experimentalFeatures` -> PDF word selection `PDF.tsx:123`; `translationService` -> auto-translate in entity editor `useInstalledEntityLanguages.ts:24`; `newHeader` -> `RequestStatus.tsx:27`, `entry-server.tsx:191`.

Server-only tenant flags in the registry (`featureFlags.ts:7-29`): `s3Storage, esReplicas, sync, deactivateTestJob, fileCacheHeaders, testing, postgresCore, postgresPages, postgresCsv, aiAssistantServiceUrl, translationServiceUrl, telemetry{enabled,sampleRate}, prometheus{enabled,sampleRate}` (plus the client flags above).

Other `settings.features` keys declared in the settings type (not gating nav): `tocGeneration{url}`, `topicClassification`, `favorites`, `convertToPdf{active,url}`, `ocr{url}` (Collection page shows an OCR control only when `ocr.url` is set, `Collection.tsx:335`), `segmentation{url}`, `twitterIntegration{...}`, `automaticTranslation{active,templates[]}` (`settingsType.ts:101-140`).

- **Notes/gotchas**:
  - `metadata-extraction` (hyphen, nav only) and `metadataExtraction` (camel case, `{url}`, backend only) are different keys. An instance can show the nav link while the API answers 404, or the reverse.
  - Editors do not receive `settings.features` (admin-only projection), so `FeatureToggle` for settings-DB keys (`metadata-extraction`, `preserve.host`, `newRelationships`) evaluates false for them; `paragraphExtraction` still evaluates true because it comes from the tenant flags. Therefore, for editors, the Metadata Extraction link is hidden even though the route and API allow admin+editor. VERIFIED code path; not confirmed in a running instance.
  - `FeatureToggle` only checks truthiness of the dotted path; `features.newRelationships` as an object (with `updateStrategy`) counts as on.
  - Playwright and Cypress set flags through fixtures or `window.__featureFlags__` (`cypress/e2e/informationExtraction/paragraph-extraction.cy.ts:19-20`, `app/shared/types/index.d.ts:21`); no production code reads `__featureFlags__` (VERIFIED by grep in `app/react`, `app/shared`, `app/api`).
  - The test settings fixture for IX also uses `'metadata-extraction': true` (`app/api/services/informationextraction/specs/fixtures.ts:26`).
