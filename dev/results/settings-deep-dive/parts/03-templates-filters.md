# Settings inventory, part 03: Templates list, Template editor, Filters

Reference repo: huridocs/uwazi, branch `production`, v1.229.224 (shallow clone at `/Users/juanmnl/Developer/huridocs/uwazi-ref`). All paths below are repo-relative. Statements are VERIFIED (read in code) unless marked ASSUMED.

## Conventions and where the code lives

- Frontend (V2, Jotai/react-router data routes): `app/react/V2/Routes/Settings/Templates/`, `app/react/V2/Routes/Settings/Filters/`.
- Backend template code is NOT under `app/api/templates` (does not exist). It is in `app/api/core/`:
  - Routes: `app/api/core/infrastructure/express/template/routes.ts:9-21`.
  - Controllers: `.../express/template/{GetTemplatesController,TemplateMutationController,SetTemplateAsDefaultController/,DeleteTemplateController/}`.
  - Facade: `app/api/core/infrastructure/facades/TemplateFacade.ts`.
  - Use cases: `app/api/core/application/{CreateTemplate,UpdateTemplate,DeleteTemplate,SetTemplateAsDefault,TemplatePostProcessService,TemplateUpdateDenormalizeEntitiesBatch,TemplateDTOs}.ts`.
  - Domain: `app/api/core/domain/template/*` (properties, `Template.ts`, `TemplateDiff.ts`, `errors.ts`).
  - Persistence: `app/api/core/infrastructure/mongodb/template/*` (default) or `postgresql/template/*` when tenant flag `postgresCore` is on (`app/api/core/infrastructure/factories/TemplatesDAOFactory.ts:11`).
- Settings code: `app/api/core/infrastructure/express/settings/routes.ts`, `app/api/core/application/{SaveSettings.ts,settings/*}`, `app/api/core/domain/settings/*`.
- Shared types: `app/shared/types/templateType.d.ts`, `app/shared/types/templateSchema.ts` (AJV schema, only used to emit types: no import of `templateSchema` outside its own file, grep), `app/shared/contracts/Template.ts`, `app/shared/types/settingsType.ts`.
- HTTP error mapping (affects all "server error" copy below): `app/api/utils/handleError.js:116-127,142-144`. Zod error and core `ValidationError` become HTTP 422 (the controller wraps them as AJV errors, `app/api/common.v2/infrastructure/AbstractController.ts:24-39`). Any other `DomainError` becomes HTTP 400. The client shows the server message as the toast detail (`error.detail ?? error.message`).
- Auth middleware: `app/api/auth/authMiddleware.ts:13-20`. Default roles `['admin']`; failure returns HTTP 401 `{error:'Unauthorized', message:'Unauthorized'}`.
- Client route guard: `app/react/ProtectedRoute.tsx:6-33`. `adminsOnlyRoute` allows role `admin` only; otherwise `<Navigate to="/login" replace/>`. Reads the Redux store user, so it is a client check only.
- Settings shell: `app/react/Routes.tsx:324` (`loggedInUsersRoute(<Settings/>)`, any logged-in user). Each child route is wrapped in `adminsOnlyRoute`.
- Nav entries: Templates `app/react/V2/Routes/Settings/SettingsNavigation.tsx:55` (inside `NeedAuthorization roles={['admin']}`, lines 53-64); Filters `SettingsNavigation.tsx:41` (inside `NeedAuthorization roles={['admin']}`, lines 36-43). Labels: "Templates", "Filters".

---

### Templates list

- **Route / file**:
  - `/settings/templates` (language-prefixed in practice, `/:lang/settings/templates`). Route `app/react/Routes.tsx:377-383`, `element={adminsOnlyRoute(<Templates/>)}`, `loader={createTemplatesLoader(services)(headers)}`.
  - Loader: `app/react/V2/Routes/Settings/Templates/createTemplatesLoader.ts:14-56`. Component: `.../Templates/Templates.tsx:14-114`. Columns: `.../Templates/components/TemplatesTableComponents.tsx:103-157`. Delete modal: `.../components/DeleteTemplatesConfirmationModal.tsx`.
- **Who can see it**:
  - Client: admin only (`Routes.tsx:379`). Nav link hidden for non-admins.
  - Server: `GET /api/templates` has NO auth middleware (`app/api/core/infrastructure/express/template/routes.ts:10`), so any caller can read all templates. `GET /api/v2/entities/count_by_template` (`app/api/entities.v2/routes/index.ts:7-28`) has no `needsAuthorization` either (it only validates `templateId` as a 24-hex string). `POST /api/templates`, `POST /api/templates/setasdefault`, `DELETE /api/templates` use `needsAuthorization()` = admin (`routes.ts:13-20`).
  - No feature toggle. The column "Synced Template" appears only if any template has `synced: true` (`TemplatesTableComponents.tsx:122`).
- **Layout** (top to bottom): `SettingsContent` (`Templates.tsx:69`); header title "Templates" (`:70`, no breadcrumb); body = one `Table` (`:72-81`, class `bg-paper`, selection checkboxes on, default sort `name` asc, no DnD); footer (`:83-104`).
  - Table columns, in order: checkbox | Name | Translation | [Synced Template] | Entities | Set as default | Action.
- **Fields** (columns; this page has no inputs):

| Field | Type/control | Default | Validation | Copy | file:line |
|---|---|---|---|---|---|
| Row checkbox | tanstack row selection | unchecked | Disabled when `disableRowSelection` is set. Tooltip shows the joined reasons. | Reasons (joined with a space): "A default template cannot be deleted." / "This template is in use by existing entities and cannot be deleted." / "Synced templates cannot be deleted." | `createTemplatesLoader.ts:27-46`, `Table/RowSelectComponents.tsx:19-41` |
| Name | link to `/settings/templates/edit/:id` + blue pill "Default" when `default` | sorted asc | Synced templates render plain text (cursor-not-allowed), no link | Header "Name" | `TemplatesTableComponents.tsx:13-31,79` |
| Translation | `Translate context={_id}` of the template name (current UI language) | sortable | none | Header "Translation" | `:33-35,80,114-119` |
| Synced Template | text "Synced template" with tooltip, only when any synced template exists | hidden | none | Tooltip: "The source of this template is a sync." / "All editing options will be disabled." Header "Synced Template" | `:85-101,122-131` |
| Entities | count, abbreviated `1.2k`, `3M` (`formatNumberShort`) | 0 | Count = distinct `sharedId` of entities with that template (`app/api/core/infrastructure/mongodb/entity/MongoEntitiesDAO.ts:313-323`), sortable | Header "Entities" | `:37-49,81,133-140` |
| Set as default | icon button (star), `variant` primary if default else secondary, disabled if `default` or `synced` | n/a | none | sr-only "Set as default"; header "Set as default" | `:51-69,82,141-147` |
| Action | `Edit` ghost button inside a link; disabled if `synced` | n/a | none | "Edit"; header "Action" | `:71-77,83,148-154` |

- **Actions**:

| Action | Client behaviour | Server call and effect |
|---|---|---|
| Add template (footer, shown only when nothing is selected) | Link to `/settings/templates/new` (`Templates.tsx:85-91`) | none |
| Edit (row) / Name link | Link to `/settings/templates/edit/:_id` | none |
| Set as default (star) | `templatesService.setDefault(_id)` then toast then `revalidator.revalidate()` (`Templates.tsx:24-39`). | `POST /api/templates/setasdefault` body `{_id}` (`app/react/V2/api/templates/index.ts:75-94`). Handler `SetTemplateAsDefaultController.ts:5-19` then `SetTemplateAsDefaultUseCase` (`app/api/core/application/SetTemplateAsDefault.ts:18-34`): in one transaction, `Template.setAsDefault` flips `isDefault` on the new and old default and updates both. Throws `DefaultTemplateConflictError` (400) if already default (`Template.ts:202-218`). Emits socket `templateChange` for new and old default. Activity log entry "Set default template" (`activitylogParser.ts:132`). |
| Delete (footer, shown when 1+ rows selected) | Opens confirmation modal (`Templates.tsx:92-101`). On confirm: `templatesService.delete(ids)` runs one `DELETE` per id in parallel via `Promise.all`; on the first error it returns that error and does not roll back deletions that already succeeded (`app/react/V2/services/http/HttpTemplatesService.ts:14-21`). | `DELETE /api/templates?_id=<id>` (`V2/api/templates/index.ts:59-73`). `DeleteTemplateController.ts:5-15` then `TemplateFacade.delete` then `DeleteTemplateUseCase` (`app/api/core/application/DeleteTemplate.ts:27-95`): see Notes. Emits socket `templateDelete`. Activity log "Deleted template". |

- **Confirmations**: Delete modal (`DeleteTemplatesConfirmationModal.tsx:22-37`, danger style). Header "Delete". Warning "Do you want to delete the following items?". Body: bulleted list of template names. Buttons "Delete" / "Cancel". Result: the modal closes before the request (`Templates.tsx:46`). Success clears the selection and toasts "Template(s) deleted successfully." then revalidates.
- **Empty / loading / error / notification states**:
  - Empty table: "NO DATA AVAILABLE" (`Components/UI/Table/DefaultNoDataMessage.tsx`).
  - Footer when rows are selected: `Selected {n} of {total}` (`Templates.tsx:97-100`).
  - Toasts (via `notify`): error title "An error occurred" with detail `error.detail ?? error.message`; success "Default template set successfully." and "Template(s) deleted successfully.".
  - Loader errors are thrown as route errors (`apiErrorToRequestError`, `createTemplatesLoader.ts:19,25`).
  - Loading: none specific (react-router loader).
- **Save model**: no form. Each action is an immediate request followed by `revalidate()`. No dirty guard.
- **V1 vs V2**: V1 removed. `app/react/Templates/` now holds only `components/ViolatedArticlesNestedProperties.js` and `utils/getFieldLabel.js` (used by Library/metadata rendering), and `app/react/Settings/` holds only the settings API/reducer and the relationships-v2 migration dashboard. No Redux templates list or V1 `TemplateCreator` remains.
- **Notes/gotchas**:
  - Row disabling is client-side only. The server enforces the same two rules (default, in use) in `DeleteTemplateUseCase` (`DeleteTemplate.ts:33-42`) with messages "The default template cannot be deleted. Please set a different template as the default before deleting this one." (`errors.ts:261-268`, HTTP 400) and "Cannot delete a template that has existing entities. Please remove the related entities first." (`errors.ts:270-277`, HTTP 400). Synced templates are NOT protected on the server (no `synced` check in the delete or update path: grep of `app/api/core` for `synced` finds nothing); only the UI blocks them.
  - Entity counts are fetched with one request per template (`V2/api/templates/index.ts:104-134`), so the loader makes N+1 requests.
  - Delete of an unknown id is a no-op that returns `{templateId}` (`DeleteTemplate.ts:28-31`).
  - There is no duplicate/clone action.

---

### Template editor

- **Route / file**:
  - `/settings/templates/new` and `/settings/templates/edit/:templateId` (`app/react/Routes.tsx:384-393`, both `adminsOnlyRoute(<TemplatesEditor/>)`, loader `createTemplatesEditorLoader(services)(headers)`).
  - Loader `app/react/V2/Routes/Settings/Templates/createTemplatesEditorLoader.ts:18-49`. Component `.../Templates/TemplatesEditor.tsx:36-406`. Helpers `.../Templates/helpers.ts`. Panel `.../components/ConfigPropertyPanel.tsx`. Property fields `.../components/fields/*`. Metadata header `.../components/TemplateMetadata.tsx`. Table cells `.../components/TemplateEditorTableComponents.tsx`. Footer `.../components/TemplatesEditorFooter.tsx`. Modals `.../components/{AddThesaurusModal,AddRelationshipTypeModal}.tsx`, `MatchingPropertiesTable.tsx`.
- **Who can see it**:
  - Client: admin only. Server: `POST /api/templates` admin (`routes.ts:13`); `GET /api/templates` open.
  - The property type "Violated articles" (`nested`) is offered only when `settings.project === 'cejil'` (`fields/PropertyTypeField.tsx:36-38`). The server enforces it: `NestedPropertyCreatorService` throws `NestedPropertyNotAvailableError` otherwise (`app/api/core/application/propertyCreatorService/NestedPropertyCreatorService.ts:14-19`, `errors.ts:246-253`, HTTP 400).
  - The loader also calls `pagesAPI.get` (legacy pages API) for the entity-view page list (`createTemplatesEditorLoader.ts:22-27`).
- **Layout** (top to bottom):
  1. Header (`SettingsContent.Header`, `TemplatesEditor.tsx:294-300`): breadcrumb "Templates" (link to `/settings/templates`) then the template name (empty on new). While `template.processing.active` it also shows a progress bar: "Updating template properties across {entityCount} entities ..." with a percentage.
  2. Body: one `Table` (DnD on, selection on). The table `header` slot holds `TemplateMetadata`: `[color swatch] [Template name input] [Display entity view from page checkbox + page Select]` (`TemplateMetadata.tsx:51-101`). Table columns: drag handle | checkbox | Property | Type | Options | Action.
     Rows: the three common properties first (lock icon, not draggable, not selectable), then user properties.
  3. Footer (`TemplatesEditorFooter.tsx:24-59`). Left: with no selection `Add property` (primary), `Add thesaurus`, `Add relationship type` (secondary); with a selection `Remove` (danger) and `Selected {n}`. Right: `Cancel` (link to `/settings/templates`) and `Save` (success variant).
  4. Overlays: `ConfigPropertyPanel` (right sidepanel, large, with overlay), `AddThesaurusModal`, `AddRelationshipTypeModal`, `ConfirmNavigationModal`, two `ConfirmationModal`s.
- **Fields**:

Template-level:

| Field | Type/control | Default | Validation | Help text / copy | file:line |
|---|---|---|---|---|---|
| Color | `ColorPicker` with 15 preset swatches; also "Pick a color" custom input and "Manually set a color" (`ColorPicker.tsx:94,131-144`). sr-only "Template color" | New: random preset from `templateColors` (`defaultTemplateColors.ts:1-22`: `#C03B22 #628ccf #ff8282 #ff8a4c #faca15 #16bdca #31c48d #9eb0fd #f17eb8 #ac94fa #9ca3af #2b8a3e #ffb86b #6a5acd #00b894`) | Client: none (`colorError` is never set true; only cleared, `TemplatesEditor.tsx:52,322`). Server: any string (`z.string().optional()`, `TemplateDTOs.ts:67`); on update an empty value keeps the old color (`props.color \|\| this.color`, `Template.ts:273`) | none | `TemplateMetadata.tsx:53-59`, `createTemplatesEditorLoader.ts:29` |
| Template name | `InputField`, placeholder "Template name", clear (x) action when non-empty | `''` | Client on Save: required and unique case-insensitively against `templatesAtom` excluding self (`TemplatesEditor.tsx:233-242`). Error text "Template name already exists" shown only when name is non-empty and duplicate; an empty name shows the error state with no message (`TemplateMetadata.tsx:68-71`). Server: `z.string({message:'Template name is required'})` (no min length, `TemplateDTOs.ts:66`). Uniqueness only on create and case-sensitive exact match (`CreateTemplate.ts:59-62`, `MongoTemplatesDAO.ts:166-175`); error `TemplateWithDuplicatedNameOnTheSystemError` "The following Template has a used Name on the system. Name = {name}" (HTTP 400, `errors.ts:166-173`). Update does not check uniqueness server-side. | none | `TemplateMetadata.tsx:60-72` |
| Display entity view from page (checkbox) | `Checkbox`, label "Display entity view from page". Unchecking clears `entityViewPage` | checked iff `entityViewPage` set | none | When no page has `entityView`: text "There are no pages enabled for entity view" replaces both controls (`TemplateMetadata.tsx:74-78`) | `:79-99` |
| Entity view page | `Select`, first option "Select page" (value `''`, untranslated literal), then pages where `page.entityView` is true, labelled by title; disabled unless checkbox is on. Value is the page `sharedId` | `''` | Server validates only on create: page must exist ("The selected page does not exist") and be entity-view enabled ("The selected page is not enabled for entity view"), both AJV errors with `instancePath '.templates'` (`app/api/pages.v2/v1_layer/LegacyPageService.ts:14-46`, called from `CreateTemplate.ts:64`). Not checked on update. | none | `TemplateMetadata.tsx:88-97` |
| Default | no control here (set from the list) | false | Client and server strip `default` from create/update bodies (`TemplateFacade.ts:34-38,59-61`) | n/a | |
| Show in cards / common properties | There is no template-level "Show in cards". `showInCard` is a per-property flag. Common properties are rows in the table (below) | | | | |

Common properties (always present: `title`, `creationDate`, `editDate`; created as defaults by `emptyTemplate`, `helpers.ts:8-37`):

| Property | Label default | Editable in panel | Server rules | file:line |
|---|---|---|---|---|
| Title | "Title" | Label (editable), Priority sorting, "Generated ID" (`generatedId`) | `TitleProperty` requires type `text` and name `title` (`TitleProperty.ts:24-32`); persists `prioritySorting`, `generatedId` | `ConfigPropertyPanel.tsx:274-275`, `GeneratedIdField.tsx` |
| Date added (`creationDate`) | "Date added" | Priority sorting only; Label input is disabled (`LabelField.tsx:28`) | type `date`, name `creationDate` (`CreationDateProperty.ts:27-35`) | |
| Date modified (`editDate`) | "Date modified" | Priority sorting only; Label disabled | type `date`, name `editDate` (`ModifiedDateProperty.ts:21-29`) | |

- Common-property rows cannot be dragged (`disableRowDnD`) or removed (`disableRowSelection` tooltip "This property can not be deleted") (`helpers.ts:78-84`). Dropping onto them is ignored (`Table.tsx:215-217`), so custom properties always sit below them.
- Server requires all three names to be present, else `TemplateWithMissingCommonProperty` "Template has the missing Property. Type = {name}" (`app/api/core/domain/template/templateValidator/TemplateWithMissingCommonPropertyValidator.ts`, `errors.ts:175-182`).
- Common properties persist only `type,label,name,isCommonProperty,noLabel,required,showInCard` plus `prioritySorting` (all three) and `generatedId` (title). `ExpressTemplateMapper.ts:20-48`, `MongoTemplateMapper.ts:36-65`.
- The server's common-property DTO strips `noLabel`, `required`, `showInCard` (`TemplateDTOs.ts:54-62` does not declare them), so they always persist as false for common properties.

Property panel (`ConfigPropertyPanel.tsx`, title "NEW PROPERTY" or "EDIT PROPERTY", uppercase; footer buttons "Cancel" and "Add property" (new) / "Save" (edit)):

| Field | Type/control | Default | Validation | Help text / label copy | file:line |
|---|---|---|---|---|---|
| Property type | `Select` id `property-type`, required. On edit it is replaced by a read-only box with icon and the translated type name | `text` | `required` | Label "Property type *". Options (label = value): Text=text, Rich text=markdown, Numeric=numeric, Date=date, Multiple dates=multidate, Date range=daterange, Multiple date ranges=multidaterange, Select=select, Multiple select=multiselect, Relationship=relationship, Link=link, Image=image, Preview=preview, Media=media, Geolocation=geolocation, Generated ID=generatedid; plus "Violated articles"=nested when `settings.project==='cejil'` | `fields/PropertyTypeField.tsx:16-38`, `ConfigPropertyPanel.tsx:222-243` |
| Label | `InputField` id `property-label`, placeholder "Text" | On type pick (new property): the raw type key capitalised, e.g. "Text", "Markdown", "Multidate", "Daterange", "Generatedid" (`ConfigPropertyPanel.tsx:128`). Panel starts as "Text" (`:41`). | Client: required ("This field is required"); unique inside this template's custom properties, case/trim-insensitive, excluding the edited property ("This label already exists in this template") (`fields/LabelField.tsx:36-50`). Not compared with common property labels. Server: `z.string()`; the property `name` is derived from the label (see Server validation), so a label that maps to an existing name fails there. | Label "Label *". Disabled for common date properties. | `LabelField.tsx` |
| Style (image, preview, media only) | `RadioSelect` horizontal: "Fill" (`cover`) / "Fit" (`contain`) | `cover` | Server: only `cover`/`contain`, else `InvalidStyleTypeError` "The following style type is not valid for Image Property. Type = {x}" (`AbstractImageProperty.ts:27-31`, `errors.ts:83-90`) | Legend "Style". Fill tooltip: "Will attempt to fill the container, using its entire width. In cards, cropping is likely to occur." Fit tooltip: "Will show the entire media inside the container." | `fields/StyleField.tsx`, `ConfigPropertyPanel.tsx:250` |
| Thesaurus (select, multiselect only) | `Select` id `property-thesaurus`, required; options = thesauri whose `type !== 'template'`, sorted by translated label, first option "Select..." (`''`) | `''` | Client: `required`. Server: empty `content` throws `FieldIsRequiredError` "The following field is required. Field = content" (`select/AbstractSelectProperty.ts:23-27`); unknown id throws `SelectPropertyWithInvalidThesaurusError` "The following Thesaurus does not exist. Thesaurus Id = {id}" (`SelectPropertyCreatorService.ts:26-30`) | Label "Thesaurus *" | `fields/ThesaurusField.tsx` |
| Relationship type (relationship only) | `Select` id `property-relation-type`, required, options = relationship types sorted by translated label, first "Select..." | `''` | Client `required`. Server: `typesExist([relationType])` else `RelationshipTypeDoesNotExistError` "The Relationship Type with Id "{id}" was not found." (`RelationshipPropertyCreatorService.ts:23-29`) | Label "Relationship type *" | `fields/RelationshipFields.tsx:82-100` |
| Entities (relationship only) | `Select` id `property-entity`; options = every template except the one being edited (`template._id !== templateId`), label truncated at 30 chars as `name` or `name (translated name)`; first option "Any entity" (`''`) | `''` (any entity) | `required:false`. No server check that the template exists for `content`. | Label "Entities" | `RelationshipFields.tsx:38-58,102-119` |
| Inherit property (relationship only, shown only when a specific template is chosen) | `Select` id `property-inherit`; options = that template's custom properties (`properties`, not common ones) labelled by translated label, first "Select..."; stores `{property: <propertyId>, type}`. Changing "Entities" resets it to undefined (`RelationshipFields.tsx:22-24`) | none | Server: if `content` and `inherit` are set, the target property must exist in the target template (`RelationshipTargetPropertyNotFoundError` "The provided Target Property with id "{id}" was not found on Template with id "{id}"") and its type must equal `inherit.type` (`RelationshipTargetTypeMismatchError`) (`RelationshipPropertyCreatorService.ts:31-47`). The stored `inherit` is dropped unless `inherit.property` is set (`V1RelationshipProperty.ts:88-90`). | Label "Inherit property" | `RelationshipFields.tsx:121-144` |
| Hide label | `Checkbox` `noLabel` (not for common properties) | false | none | Tooltip "This property will be shown without the label" | `fields/HideLabelField.tsx` |
| Required property | `Checkbox` `required` (not common) | false | Server: enforced when saving entities (e.g. `V1RelationshipProperty.ts:141`) | Tooltip "You won't be able to save an entity if this property is empty." | `fields/RequiredField.tsx` |
| Show in cards | `Checkbox` `showInCard` (not common) | false | none | Tooltip "This property will appear in the library cards as part of the basic info." | `fields/ShowInCardsField.tsx` |
| Full width (image, preview, media) | `Checkbox` `fullWidth` | false | none | Tooltip "This property will be shown using all the width available." | `fields/FullWidthField.tsx` |
| Use as filter | `Checkbox` `filter`, shown for types in `filterableTypes` (see matrix), not common | false | none | Tooltip "This property will be used for filtering the library results. When properties match in equal name and field type with other entity types, they will be combined for filtering." | `fields/FilterField.tsx`, `ConfigPropertyPanel.tsx:56-69,261-273` |
| Default filter | `Checkbox` `defaultfilter`, shown only when `filter` is on | false | Unchecking `filter` forces `defaultfilter` and `prioritySorting` to false (`ConfigPropertyPanel.tsx:145-150`) | Tooltip "This property will be the default filter in the library for this template." | `fields/DefaultFilterField.tsx` |
| Priority sorting | `Checkbox` `prioritySorting`. Custom properties: only when `filter` is on and type is text, numeric, select or date (`:71`). Common properties: always. | false | none | Tooltip "Properties marked as priority sorting will be used as default sorting criteria. If more than one property is marked as priority sorting the system will try to pick-up the best fit. When listing mixed template types, the system will pick-up the best combined priority sorting." | `fields/PrioritySortingField.tsx` |
| Generated ID (title only) | `Checkbox` `generatedId` | false | none | Tooltip "A generated ID will be the default title." | `fields/GeneratedIdField.tsx`, `ConfigPropertyPanel.tsx:275` |
| Same-label table | read-only table "Template / Type / [Thesauri] or [Relation type, Entities, Inherit type]" for properties with the same label in other templates; mismatching cells are red | n/a | See "Server validation" and Notes | Heading "Properties from other templates in the collection using the same label."; cells "No type", "Any entity", "(this template)" | `MatchingPropertiesTable.tsx`, `ConfigPropertyPanel.tsx:278-295` |

No UI exists for: per-property full-text search relevance, "searchable/include in search", `nestedProperties`, `sortable`, `query`, `denormalizedProperty`, `targetTemplates`. None found for "search relevance". `sortable` and the relationship-v2 fields are accepted by the DTO (`TemplateDTOs.ts:24-52`) but never set by this editor.

Options column pills (read-only summary in the table, `TemplateEditorTableComponents.tsx:82-151`): "Show in cards", "No label", "Use as filter", "Priority sorting", "Required", "Default filter", "Generated ID", "Full width", "Fill", "Fit", then the relationship type name and the thesaurus/entity template name.

#### Property-type matrix

"Yes" = control is shown. All types always get Label. Non-common types always get Hide label, Required, Show in cards. Source: `ConfigPropertyPanel.tsx:56-72,250-275`; "Server persists" from `ExpressTemplateMapper.ts:51-93`.

| Type (UI label) | Style | Full width | Thesaurus | Relationship type + Entities + Inherit | Use as filter | Default filter (needs filter) | Priority sorting (needs filter) | Server class / filter fields persisted |
|---|---|---|---|---|---|---|---|---|
| text (Text) | | | | | Yes | Yes | Yes | `TextProperty`, Filterable; also persists `generatedId` (no UI except Title) |
| markdown (Rich text) | | | | | Yes | Yes | No | `MarkdownProperty`, Filterable |
| numeric (Numeric) | | | | | Yes | Yes | Yes | `NumericProperty`, Filterable |
| date (Date) | | | | | Yes | Yes | Yes | `DateProperty`, Filterable |
| multidate (Multiple dates) | | | | | Yes | Yes | No | Filterable |
| daterange (Date range) | | | | | Yes | Yes | No | Filterable |
| multidaterange (Multiple date ranges) | | | | | Yes | Yes | No | Filterable |
| select (Select) | | | Yes | | Yes | Yes | Yes | `SelectProperty`, Filterable + `content` |
| multiselect (Multiple select) | | | Yes | | Yes | Yes | No | `MultiSelectProperty`, Filterable + `content` |
| relationship (Relationship) | | | | Yes | Yes | Yes | No | `V1RelationshipProperty`, Filterable + `content`, `relationType`, `inherit` |
| link (Link) | | | | | No | No | No | `LinkProperty`, plain `Property` (no filter fields persisted) |
| image (Image) | Yes | Yes | | | No | No | No | `ImageProperty`, `AbstractImageProperty` (`style`, `fullWidth`) |
| preview (Preview) | Yes | Yes | | | No | No | No | `PreviewProperty`, AbstractImage |
| media (Media) | Yes | Yes | | | No | No | No | `MediaProperty`, AbstractImage |
| geolocation (Geolocation) | | | | | No | No | No | `GeolocationProperty`, plain `Property` |
| generatedid (Generated ID) | | | | | Yes | Yes | No | `GenerateIdProperty`, Filterable |
| nested (Violated articles, project `cejil`) | | | | | Yes | Yes | No | `NestedProperty`, Filterable + `nestedProperties` (no UI) |
| common: title | | | | | n/a | n/a | Yes (always) | `TitleProperty`: + Generated ID checkbox |
| common: creationDate, editDate | | | | | n/a | n/a | Yes (always) | `CreationDateProperty`, `ModifiedDateProperty` |

Defaults for a new property: `type text, label "Text", noLabel/required/showInCard/filter/defaultfilter/prioritySorting/fullWidth/generatedId false, style "cover", content/relationType/inherit undefined` (`ConfigPropertyPanel.tsx:39-54`). Server-side defaults are all false and style `cover` (`Property.ts:65-67`, `FilterableProperty.ts:19-21`, `AbstractImageProperty.ts:21-22`).

#### Cross-template compatibility (type-change rules)

- The type of an existing property cannot be changed in the UI (read-only box, `ConfigPropertyPanel.tsx:222-240`). Server: same `_id` with another type throws `PropertyTypeChangeError` "Can't change property types." (HTTP 400, `Property.ts:104-107`, `errors.ts:285-289`; reached through `selectUpdatedProperties` in `TemplateTranslationService.updateTemplateTranslation`, `TemplateTranslationService.ts:46-48`).
- Name collisions across templates (server, by derived `name` not label): `AbstractPropertyCreatorService.validate` (`AbstractPropertyCreatorService.ts:24-28`) loads other templates' custom properties with the same name (`MongoTemplatesDataSource.ts:300-312`) and calls `ensurePropertyIsConsistent` (`Property.ts:98-102`):
  - Types must be equal or compatible: text/markdown, date/multidate, daterange/multidaterange, select/multiselect (`compatibleTypes` in each class). Otherwise `PropertyTypeMismatchError` "Property with the name "{name}" must have type "{t1}", but type "{t2}" was provided." (`errors.ts:128-135`).
  - select/multiselect must share the thesaurus: `PropertyThesaurusMismatchError` "Property with the name "{name}" has a thesaurus mismatch. It must be linked to {id} thesaurus, but a link to {id} thesaurus was provided." (`AbstractSelectProperty.ts:33-39`).
  - relationship: if the existing one inherits, the new one must inherit the same type: `PropertyInheritedTypeMismatchError` (`V1RelationshipProperty.ts:117-123`).
- Client check is stricter and keyed on the label (case/trim-insensitive), against `templatesAtom` custom properties (`validateMatchingProperties`, `ConfigPropertyPanel.tsx:153-191`):
  - type must be exactly equal (no compatibility pairs);
  - select/multiselect: `content` must match;
  - relationship: `content`, `relationType` and `inherit` (property and type) must all match.
  - On mismatch the panel's submit button (`Add property`/`Save`) is disabled (`:302`) and no error text is shown: the only cue is the red cells in the same-label table.
- Reserved names: no list. The only server-side reserved name in practice is `title` (the label "Title" yields name `title`, which collides with the common property: `TemplateWithDuplicatedPropertyError`, `templateValidator/TemplateWithDuplicatedPropertyValidator.ts`, checked over `allProperties`). `creationDate`/`editDate` are not reachable from a label because names are lower-cased (`propertyNameGeneration.ts:5,15`). ASSUMED consequence of reading the code; not run.

- **Actions**:

| Action | Client behaviour | Server call and effect |
|---|---|---|
| Add property (footer) | Opens panel in new mode (`TemplatesEditor.tsx:338`). Panel submit appends `{...config, rowId}` to `properties` (`:230`). Local state only. | none until Save |
| Edit (row button) / click the Property label | Opens panel with the row (`:263-266`, `TemplateEditorTableComponents.tsx:22-64`). Submit merges into the row. | none until Save |
| Remove (footer, with selection) | Removes the selected custom properties from local state, no confirmation (`:259-261`). | On Save, the missing properties count as deleted (see Notes) |
| Drag row | `@dnd-kit` vertical drag handle; `handleTableChange` splits rows back into common/custom by `isCommonProperty` (`:163-172`). Order = array order in `properties`. | Persisted on Save as array order |
| Add thesaurus | Modal (below). | `POST /api/thesauris` `{name, values: []}` (`V2/api/thesauri/index.ts:50`) via `AddThesaurusModal.tsx:30-41`. Adds to `thesauriAtom`. |
| Add relationship type | Modal (below). | `POST /api/relationtypes` `{name}` via `useRelationshipTypeMutations.create` (`V2/services/useRelationshipTypeMutations.ts:22-40`). Adds to `relationshipTypesAtom`. |
| Cancel (footer) | Link to `/settings/templates` (blocked by the dirty guard when changed) | none |
| Save | See Save model. Disabled while no pending changes or while saving (`:339`). | `POST /api/templates` (`V2/api/templates/index.ts:40-57`). Handler `TemplateMutationController.ts:9-29`: no `_id` then `TemplateFacade.create`; with `_id` then `TemplateFacade.update`. Emits socket `templateChange` with the saved template. HTTP 409 when Elasticsearch reports a mapping error (`:23-25`). Activity log "Created template" (create). |

Modals:
- Add thesaurus (`AddThesaurusModal.tsx`): title "Add thesaurus"; field "Name", placeholder "Thesaurus name"; error "Thesaurus name already exists" (case-insensitive match against loaded thesauri after `sanitizeThesaurusName`); buttons "Cancel", "Save" (disabled while saving or sanitised name empty); success toast "Thesaurus created successfully."; failure goes to `handleUnexpectedError(error, 'Error creating thesaurus')`. The modal closes in `finally`, including on a duplicate-name early return? No: the duplicate path returns before `finally` (`:48-51`), so the modal stays open there.
- Add relationship type (`AddRelationshipTypeModal.tsx`): title "Add relationship type"; field "Name", placeholder "Relationship type name"; error "Relationship type name already exists"; buttons "Cancel", "Save" (disabled when trimmed name is empty or saving); success toast "Relationship type created successfully."; failure toast "An error occurred" + detail.

- **Confirmations**:

| Trigger | Copy | Result |
|---|---|---|
| Navigate away with unsaved changes (`ConfirmNavigationModal`, `Components/UI/ConfirmNavigationModal.tsx`) | Header "Discard changes?"; body "You have unsaved changes. Do you want to continue?"; buttons "Cancel", "Discard changes" | Cancel stays; Discard proceeds with navigation (`blocker.proceed`) |
| Save on an existing template with more than 3000 entities (`ENTITY_COUNT_THRESHOLD = 3000`, `TemplatesEditor.tsx:61,244-249`), every save, not only property changes | Header "Lengthy reindex process"; body "The template has changed and the associated entities will be re-indexed, this process may take several minutes, do you want to continue?" (translation key "Template with a long number of entities"); buttons "Continue", "Cancel"; danger style (`helpers.ts:70-75`) | Continue runs `handleSave(true)` |
| Server returns HTTP 409 (Elasticsearch mapping conflict) | Header "Template conflict"; body "A reindex of your collection is necessary. The reason may vary -- from certain changes made to a template's property to new fields that need to be populated across entities. This process will not negatively affect the data in your collection. It can last a few minutes and some parts of your collection might take some time to reappear in the Library, but this is temporary. Do you want to continue?" (translation key "Mapping conflict error"); buttons "Continue", "Cancel"; danger style (`helpers.ts:59-69`) | Continue re-sends the template with `reindex: true` (full reindex) |
| Removing properties | none | Immediate local removal |

- **Empty / loading / error / notification states**:
  - Toasts: success "Template saved successfully."; warning "Template changes are being applied to all related entities." with detail "Processing {n} entities" (when the response or the loaded template has `processing.active`); error "Error saving template." with detail `error.detail ?? error.message` (also when the response has no template); success "Template processing completed." (socket `templateProcessed`).
  - Validation messages in the panel: "This field is required", "This label already exists in this template". Name: "Template name already exists".
  - Server errors appear only as toast detail. HTTP 422 (zod, validators, `Template.update` while processing: "template is being processed you can not update it yet" on path `processing`, `Template.ts:255-260`). HTTP 400 for domain errors (list in Server validation).
  - Progress bar in header while `processing.active`: text "Updating template properties across {n} entities ..." and `{percent}%`, driven by socket `templateProcessing` (every 10th completed job, `TemplateUpdateDenormalizeEntitiesBatch.ts:134-136`).
  - Empty property table cannot occur (three common rows always exist).
- **Save model**: explicit Save button; no autosave. Dirty guard: `useBlocker` (`TemplatesEditor.tsx:147-150`) blocks any navigation whose target path does NOT contain `templates/edit` while `!isEqual(loadedTemplate, currentStatus)` (ignoring `processing`). Gotchas: navigating from one template's edit page straight to another's is not blocked; there is no `beforeunload` handler (grep of `Templates/` and `Filters/` finds none) so a browser reload or tab close loses changes silently. Post-save: existing template then `revalidator.revalidate()` (stays on page); new template then `navigate('/settings/templates/edit/{id}', {replace:true})` (`:208-212`). Panel edits are local to the page until Save. Unknown `:templateId`: the loader silently falls back to an empty new template with a random color (`createTemplatesEditorLoader.ts:29,35-45`), and Save then creates a new template.
- **V1 vs V2**: V1 removed (see Templates list). Residual V1-era pieces: Redux mirror of `templatesAtom` (`app/react/V2/atoms/syncReduxFromAtoms.ts`), socket handlers `templateChange`/`templateDelete` that update `templatesAtom` (`app/react/App/sockets.js:62-80`). The V1 AJV validator for templates (`app/shared/types/templateSchema.ts`, with custom keywords such as `requireOrInvalidContentForSelectFields`, `requireRelationTypeForRelationship`) is no longer applied to requests: validation moved to zod + domain classes. A V1-era detail kept in the data model: `nested` property (CEJIL) is rendered by `Templates/components/ViolatedArticlesNestedProperties.js`.
- **Notes/gotchas**:
  - ASSUMED (static reading, not run): on opening Edit for a relationship property that inherits a property, `RelationshipFields` mounts after `reset(propertyToEdit)` and its effect `setValue('inherit', undefined)` (`RelationshipFields.tsx:22-24`) runs on mount, which would clear the stored inheritance from the form; saving then drops `inherit`. No spec covers it (`grep "Inherit property"` finds only this component). Treat as a probable defect to confirm in the running app.
  - Changing the property type in the new-property panel resets every field including the label (`reset({...emptyProperty, type, label})`, `ConfigPropertyPanel.tsx:126-133`).
  - The default label "Text" collides with an existing "Text" property of the same template on first add; the user must rename it.
  - Entity-type picker excludes the template being edited, so a template cannot relate to itself through this UI (`RelationshipFields.tsx:41`).
  - The duplicate-name check on the client is case-insensitive; the server's create check is case-sensitive and skipped on update.
  - Property `_id` is preserved through edits and drives rename/delete detection; a newly added property has no `_id` until the server assigns one.

#### Server validation

Request path on save: `TemplateMutationController` then `TemplateFacade.create|update` then zod DTO then use case.

| Check | Schema / file:line | Error and message | HTTP |
|---|---|---|---|
| Body shape (create) | `CreateTemplateDTOSchema = BaseTemplateSchema`, `.strict()`: allowed keys `name,color,entityViewPage,commonProperties,properties` only (`app/api/core/application/TemplateDTOs.ts:64-72`). `default`, `processing`, `__v` are deleted first (`TemplateFacade.ts:34-38`). | Unknown key (for example `synced`, `_id`, `reindex`) fails zod "Unrecognized key(s)" | 422 |
| Body shape (update) | `UpdateTemplateSchema` strict, adds required `id`; common property `id` required ("Common property id is required"); `reindex` is split off by the facade (`TemplateFacade.ts:56-76`) | zod messages | 422 |
| Property fields | `BasePropertySchema` (`TemplateDTOs.ts:24-52`): `label` string (required), `type` one of 17 literals, booleans optional, `content` string/null, `relationType` string, `inherit` `{property,type}` or `''` or null, `style` string, `nestedProperties` string[]. Not strict: unknown keys are stripped. **`name` is not in the schema, so it is always stripped and re-derived from the label** (except common properties, whose `name` is required, `:54-62`, and nested, which uses `{label}_nested`, `NestedProperty.ts:30-34`). | Invalid `type` literal: zod "Invalid input" | 422 |
| Name derivation | `safeName(label, newNameGeneration)` (`app/api/core/domain/template/utils/propertyNameGeneration.ts:1-18`). Old mode (default): trim, every char outside `[a-z0-9]` (case-insensitive) becomes `_`, lower-case (non-ASCII letters become `_`). New mode (setting `newNameGeneration`, once enabled it cannot be disabled, `saveSettingsInput.ts:204`): trim, replace `# \ / | * ? " < > = whitespace : . [ ] % ! - & ^ + ( ) { } ~` with `_`, drop one leading `_ - + $ space`, lower-case. | Renaming a label renames the property (stored `name` changes, entity metadata is migrated, see Effects) | n/a |
| Duplicate names in template | `TemplateWithDuplicatedPropertyValidator` over common + custom (`Template.ts:89-96`) | `TemplateWithDuplicatedPropertyError`: "Template contains duplicate property name: [name={name}]. Conflicts: "{label}" ({type}) and "{label}" ({type})." | 422 |
| Property swap | `checkForConflictingPropertyNames` (`Template.ts:132-146`) | `ValidationError` "Properties cannot swap names" | 422 |
| Missing common properties | validator above | "Template has the missing Property. Type = {title/creationDate/editDate}" | 400 |
| Per-type domain rules | each property class constructor (`PropertyTypeInvalidTypeError` "The following type is not valid for {Class}. Type = {t}", `errors.ts:11-18`) | | 400 |
| Select thesaurus | see Fields | `FieldIsRequiredError`, `SelectPropertyWithInvalidThesaurusError` | 400 |
| Relationship | see Fields | `RelationshipTypeDoesNotExistError`, `RelationshipTargetPropertyNotFoundError`, `RelationshipTargetTypeMismatchError` | 400 |
| Nested | `settings.project === 'cejil'` | `NestedPropertyNotAvailableError` "The nested Property type is not available for your organization {json}" | 400 |
| Cross-template consistency | see Cross-template compatibility | `PropertyTypeMismatchError`, `PropertyThesaurusMismatchError`, `PropertyInheritedTypeMismatchError` | 400 |
| Delete of inherited property | `UpdateTemplate.ts:66-73` via `getPropertiesBeingInherited` (`MongoTemplatesDataSource.ts:173-194`) | `InheritedPropertyCanNotBeDeleted` "Properties can not be deleted because are being inherited: [properties={names}]" | 422 |
| Template being processed | `Template.update` (`Template.ts:255-260`) | "template is being processed you can not update it yet" | 422 |
| Create: unique name, valid entity-view page | see Fields | see Fields | 400 / 422 |
| Elasticsearch mapping conflict | `TemplateMutationController.ts:23-25` (message regex `mapp(ing\|er)`) | `mapping conflict: ...` | 409 |
| Limits (max properties, label length, name length) | none found | | |

Effects of an update, in order (`app/api/core/application/UpdateTemplate.ts:37-106`):
1. In a transaction: write the template (`templatesDS.update`), update the translation context (`TemplateTranslationService.updateTemplateTranslation`, `templateTranslationService/TemplateTranslationService.ts:40-64`: renames keys for a changed template name and property labels, deletes keys for removed properties, context type "Entity"), then `updateMapping(template, fullReindex)` (`MongoTemplatesDataSource.ts:59-67`): `fullReindex` true means `resetIndex()` then `updateMapping(all templates)`; otherwise only this template's mapping is updated. Elasticsearch rejects incompatible mapping changes (HTTP 409 path).
2. Emit `TemplateUpdatedEvent`. Listeners: rename the template in `settings.filters` if the name changed (`app/api/core/infrastructure/settings/ReconcileFiltersOnTemplateChange.ts:42-49`); clean IX property extractors that reference removed properties when the feature is enabled (`app/api/suggestions/eventListeners.ts:85-92`).
3. `TemplatePostProcessService.createJobsForEntities` (`TemplatePostProcessService.ts:33-81`): if the diff has any "post-process change" (relationship property new or with changed `relationType`/`content`/inherit, new generated-id property, renamed property, or deleted property, `TemplateDiff.ts:120-128`), enqueue batches of 50 entities (`limit = 50`) per template; else if any property's `filter` flag changed, enqueue a "resave for filter change" (touches entities). Sets `processing.active=true` and adds job counts (`addJobsToProcessingCount`, `MongoTemplatesDataSource.ts:257-266`). With `reindex: true` it also enqueues full-text reindex jobs for every other template.
4. Each job (`TemplatePostProcessEntitiesJob.ts`, `TemplateUpdateDenormalizeEntitiesBatch.ts:44-137`): optional reindex; rename metadata keys and file selections for renamed properties; delete metadata and file selections for deleted properties (data loss, no client confirmation); regenerate denormalized relationship values and generated IDs; on the last job `completeProcessing` and emit socket `templateProcessed`; progress through `templateProcessing`.
5. Entity data itself is not migrated for type changes, because type changes are rejected.

Effects of a create (`CreateTemplate.ts:28-72`): derive common and custom properties, check name uniqueness and entity-view page, then in a transaction insert the template and create its translation context (`createTemplateTranslation`: keys = every custom property label, the template name, and the title label; context id = template id, type "Entity"). No mapping update and no jobs on create. `isDefault` is false.

Effects of delete (`DeleteTemplate.ts:27-95`): in a transaction, remove relationship properties in other templates that point to the deleted template (`Template.onTemplateDeleted` keeps properties whose `content` differs, `Template.ts:220-230`) and delete their translation keys; delete the template's translation context; delete the template. Then emit `TemplateDeletedEvent` (removes the template from `settings.filters`, `ReconcileFiltersOnTemplateChange.ts:36-40`; cleans IX extractors), and for each edited template emit `TemplateUpdatedEvent` and enqueue post-process jobs.

---

### Filters

- **Route / file**:
  - `/settings/filters` (`app/react/Routes.tsx:483-487`, `element={adminsOnlyRoute(<FiltersTable/>)}`, `loader={filtersLoader(headers)}`).
  - Loader and page `app/react/V2/Routes/Settings/Filters/FiltersTable.tsx:33-42` (loader), `:44-275` (component). Helpers `.../Filters/components/helpers.ts`. Add modal `.../components/AddTemplatesModal.tsx`. Sidepanel `.../components/FiltersSidepanel.tsx`. Columns `.../components/TableComponents.tsx`. Sidepanel state atom `.../components/sidepanelAtom.ts`.
- **Who can see it**: client admin only; nav link under `NeedAuthorization roles={['admin']}` (`SettingsNavigation.tsx:36-43`). Server: `GET /api/settings` has no auth (`app/api/core/infrastructure/express/settings/routes.ts:9`); `POST /api/settings` uses `needsAuthorization()` (admin, `:10`). No feature toggle.
- **Layout** (top to bottom): header "Filters" (no breadcrumb); info banner (CheckCircle icon, "Filters configuration", then description and two bullets, copy below); `Table` with table header text "Filters", columns Label | (sr-only "Action"), drag handle, checkbox, and group expand button column; when any group exists the table header also shows "Collapse all" / "Expand all" buttons (`Table.tsx:274-287`). Footer.
  - Banner copy (`FiltersTable.tsx:164-189`): "Filters configuration"; "By default, users can filter the entities in the library based on the types you have defined. However, you can configure how these entity types will be displayed:"; bullet 1 "drag and drop each entity type into the window in order to configure their order"; bullet 2 "Select "Add group" below to group filters under a label e.g ("Documents "or "People")" (sic).
  - Group row: a "Group" button (chevron) with sr-only "Open group" (`Table/GroupComponents.tsx`), the label, an "Edit" secondary button (`TableComponents.tsx:19-41`). Template rows have no action. An empty open group shows "Empty group. Drop here to add" (`Table/DnDComponents.tsx:148-163`).
  - Footer (`FiltersTable.tsx:205-244`): with nothing selected: left "Add entity type", "Add group" (primary); right "Cancel", "Save" (secondary/success, both disabled unless there are changes and no save in flight). With any selection: only "Delete" (danger).
- **What it configures**: `settings.filters`, an ordered list of `{id, name}` template entries and `{id, name, items:[{id,name}]}` groups (`app/shared/types/settingsType.ts:22-30`). It controls which entity types appear, in what order and grouping, in the Library "Type" facet. It does not restrict search results server-side (grep of `app/api/search`, `app/api/entities` finds no use of `settings.filters`).
- **Fields**:

| Field | Type/control | Default | Validation | Copy | file:line |
|---|---|---|---|---|---|
| Add entity type modal: list | `MultiselectList` of templates not already used in any filter or group (`filterAvailableTemplates`, `helpers.ts:19-35`), with search | none selected | "Add" disabled when nothing selected | Title "Add entity type"; buttons "Cancel", "Add" with `(n)` suffix | `AddTemplatesModal.tsx` |
| Group sidepanel: Name | `InputField` id `group-name`, required | `''` | `required`: "This field is required" | Card "General Information", label "Name" | `FiltersSidepanel.tsx:94-105` |
| Group sidepanel: Entity types | `MultiSelect`; options = the group's current members plus templates still available | current members | none (empty allowed) | Card "Entity types", label "Entity types" | `:107-121` |
| Sidepanel buttons | | | | Title "Edit group" (when the atom has a `name`) or "Add group"; "Cancel"; "Update" (existing group id) or "Add" | `:87,127-139` |

- **Actions**:

| Action | Client behaviour | Server call and effect |
|---|---|---|
| Add entity type | Opens modal; on Add appends `{id: templateId, name, rowId}` rows at the end (`createNewFilters`, `helpers.ts:37-47`) | none until Save |
| Add group | Opens sidepanel with an empty form. New group id from `uniqueID()` (`FiltersSidepanel.tsx:74`). Appended at the end, or replaces the group with the same `id` (`updateFilters`, `helpers.ts:49-65`). | none until Save |
| Edit (group row) | Opens sidepanel with that group's name and members; members removed here return to the available pool and are not re-added at top level | none until Save |
| Drag row | `Table` DnD (`dndSortHandler`, `Table/helpers.ts:26-110`). Reorder top level; drag a template onto a template inside a group (or onto the group's "Empty group. Drop here to add" row) to move it into the group; drag out by dropping on a top-level row. Dropping onto a group row itself places the item at top level next to it. A group cannot be dropped into another group (`:97-99`). Expanded groups collapse while dragging. | none until Save |
| Delete | Removes all checked rows (templates or whole groups, with their members) from local state (`FiltersTable.tsx:98-116`, `deleteFilters`, `helpers.ts:67-86`); no confirmation | none until Save |
| Cancel | Reverts to loaded filters (`:87-91`) | none |
| Save | `settingsAPI.save({filters})` where `sanitizeFilters` removes `rowId`, `_id`, nests `subRows` as `items`, and silently drops groups with zero members (`helpers.ts:88-108`). On success merges the response into `settingsAtom`, revalidates, toasts. | `POST /api/settings` body `{filters:[...]}` (`app/react/Settings/SettingsAPI.ts:6-8`). `SaveSettingsController.ts:6-13` parses with `SaveSettingsInputSchema` (`saveSettingsInput.ts:28-42,153-242`: `filters` is `[{ _id?, id?, name?, items?: [{id?, name?}] }]`, all strict, no check that ids are existing templates) then `SaveSettingsUseCase.execute` (`SaveSettings.ts:19-34`): in a transaction `SettingsService.save` (`settings/SettingsService.ts:29-37`): reconcile the translation context "Filters" (type "Uwazi UI") for groups only, i.e. entries that have `items` (`SettingsTranslationService.ts:102-126`: renames/deletes group-name keys), `Object.assign` the new fields into settings, persist, emit `SettingsChangedEvent`. A listener broadcasts socket `updateSettings` to the tenant (`BroadcastSettingsChanged.ts:22-28`), updating `settingsAtom` in other open sessions (`App/sockets.js:80-83`). Response is the full public settings. Activity log "Updated settings" (`activitylogParser.ts:20`). |

- **Confirmations**: `ConfirmNavigationModal` (same copy as the editor: "Discard changes?" / "You have unsaved changes. Do you want to continue?" / "Cancel", "Discard changes") when navigating away with unsaved changes. No confirmation for Delete or Cancel.
- **Empty / loading / error / notification states**: empty table "NO DATA AVAILABLE" (`DefaultNoDataMessage`). Success toast "Filters saved". Error toast "An error occurred" with detail `error.message`. Loader: failure to read templates throws a route error; a failed settings read falls back to an empty filter list (`FiltersTable.tsx:36-37`). Validation: sidepanel "This field is required".
- **Save model**: explicit Save (and Cancel) in the footer; all edits are local until Save. Dirty guard: `useBlocker(hasChanges)` (`FiltersTable.tsx:54`), where `hasChanges` compares JSON of current vs loaded rows. This blocks every navigation, unlike the template editor. No `beforeunload`. Post-save: `setSettings(merge)`, `revalidate()`, toast; selection is not cleared on save.
- **V1 vs V2**: the V1 settings Filters page is removed (`app/react/Settings/components/` holds only `relV2MigrationDashboard.tsx`). The V1 Library still consumes `settings.filters`: `app/react/Library/components/DocumentTypesList.jsx:15-27` (shows configured filters when "FEATURED" is on, otherwise all templates sorted by translated name) and the FEATURED/ALL switcher in `app/react/Library/components/TemplatesFilter.tsx:77-113`, visible to admin, editor and collaborator, shown only when filters exist (`:79-80`).
- **How the library uses `settings.filters`** (V2): `app/react/V2/Routes/Library/libraryTypeFilters.ts:12-44` builds the Type facet from `settings.filters` (id falls back to name; group items without `id` are dropped; item name falls back to id); if the resulting list is empty it falls back to every template sorted by name. `Components/TypeFacet.tsx:36-107` renders groups as expandable rows (group label translated in context "Filters"; template names in context = template id; group count is the sum of children's aggregation counts; checking the group toggles all children). There is no "all types" toggle in V2 `TypeFacet.tsx` (none found).
- **Notes/gotchas**:
  - Template rename propagates only to top-level filter entries: `renameFilterTree` matches `filter.id === templateId` on the first level only (`app/api/core/domain/settings/settingsTree.ts:50-59`), so a renamed template inside a group keeps its old stored name in `items[].name` (V2 `TypeFacet` renders it through `Translate context={child.id}`, so the translation table can mask this; ASSUMED, not run).
  - Template deletion removes the template recursively from the tree but leaves empty groups in settings (`removeTemplateFromFilterTree`, `:61-71`); the next Save from the UI drops empty groups.
  - Templates not listed in any filter or group do not appear in the Library Type facet once at least one filter is configured.
  - The page uses the legacy `settingsAPI`/`templatesAPI` modules directly, not the `V2Services` bundle used by the Templates pages.
