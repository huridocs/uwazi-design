### Template property dialog (per type)

Source: `huridocs/uwazi` `production` v1.229.224 (`uwazi-ref`). Every citation is a repo-relative `path:line`, shortened with the keys below. Strings in code quotes are copied from code. "EN" = `contents/ui-translations/en.csv`. (unverified) = derived from reading code, not run.

Path keys:
- `CPP` = `app/react/V2/Routes/Settings/Templates/components/ConfigPropertyPanel.tsx`
- `F/` = `app/react/V2/Routes/Settings/Templates/components/fields/`
- `MPT` = `app/react/V2/Routes/Settings/Templates/components/MatchingPropertiesTable.tsx`
- `ATM` = `app/react/V2/Routes/Settings/Templates/components/AddThesaurusModal.tsx`
- `ARM` = `app/react/V2/Routes/Settings/Templates/components/AddRelationshipTypeModal.tsx`
- `TEF` = `app/react/V2/Routes/Settings/Templates/components/TemplatesEditorFooter.tsx`
- `TE` = `app/react/V2/Routes/Settings/Templates/TemplatesEditor.tsx`
- `HLP` = `app/react/V2/Routes/Settings/Templates/helpers.ts`
- `SP` = `app/react/V2/Components/UI/Sidepanel.tsx`
- `MOD` = `app/react/V2/Components/UI/Modal.tsx`
- `SEL` = `app/react/V2/Components/Forms/Select.tsx`
- `ERR` = `app/api/core/domain/template/errors.ts`
- `DTO` = `app/api/core/application/TemplateDTOs.ts`
- `DOM/` = `app/api/core/domain/template/`
- `HE` = `app/api/utils/handleError.js`
- `RTM` = `app/react/V2/services/useRelationshipTypeMutations.ts`

Scope facts that change how to build it:
- The panel edits a local draft. Nothing is sent until the editor page's Save (`TE:218-232`, `TE:339`).
- Add thesaurus and Add relationship type do NOT open from inside the panel. They are footer buttons of the editor page (`TEF:31-36`, `TE:336-337`, `TE:346-349`). The panel has no "create new" control. (The gap-matrix row "Create inline from the template property dialog" does not match Uwazi.)
- The form has no name, id or description field. The server derives the property `name` from the label.

---

## 1. Panel chrome

| Item | Behaviour | Cite |
|---|---|---|
| Container | Right `Sidepanel`, `withOverlay`, `size="large"`: 600px at md, 40% width at lg, full width below md. Slides in from the right (left in RTL). | `CPP:205-208`, `SP:80-84` |
| Title, new | `New property` (rendered uppercase by CSS class `uppercase`: "NEW PROPERTY") | `CPP:210-212` |
| Title, edit | `Edit property` (rendered "EDIT PROPERTY") | `CPP:211` |
| Title translation | Neither string exists in EN (they fall back to the key). | EN (searched, absent) |
| Close control | X button, `data-testid="close-sidepanel"`, sr-only text `Close` | `SP:37-47`, EN:220 |
| Body | `Sidepanel.Body` (`grow p-4`): form fields, then the same-label block (not for common properties) | `CPP:219-297` |
| Footer buttons, in order | 1. `Cancel` (secondary, `type="button"`, calls `onClose`). 2. Submit: `Add property` when new, `Save` when editing (variant `success` = green). | `CPP:298-305` |
| Footer layout | `flex justify-end gap-2 p-4 border-t` | `CPP:298` |
| Submit disabled | `disabled={!validateMatchingProperties()}`: true when a same-label property in another template is incompatible (section 6). No other disable rule: an empty label is caught on submit, not by disabling. | `CPP:302`, `CPP:153-191` |
| Submit action | RHF `handleSubmit(submitForm)`. Blocks if `errors` is non-empty or matching check fails; otherwise `onSubmit(data)` then `onClose()`. Enter inside an input submits (the footer is inside the `<form>`). | `CPP:193-202`, `CPP:218` |
| After submit | New: appended to the draft property list with a new `rowId`. Edit: merged over the row. Edit of a common property goes to the common list. | `TE:215-231` |
| Opens | `Add property` footer button (`TE:338`), or the row's property-label button or `Edit` button (`TE:263-266`, `app/react/V2/Routes/Settings/Templates/components/TemplateEditorTableComponents.tsx:22-64,57-62`). Common-property rows open it too (label button, lock icon). | |
| Closes | Cancel, X, overlay click, Escape. All discard the panel's edits silently. No dirty confirmation. On close the page clears `propertyToEdit`; the form resets to the empty property whenever `isOpen` becomes false. | `CPP:139-143`, `TE:354-357`, `SP:116-127,159-164,226` |
| Overlay | Full-width fixed layer under the page header, `bg` overlay colour; click closes. `role="dialog"`, `aria-modal="true"`, `aria-labelledby` title. | `SP:209-246` |
| Focus | On open: focus first focusable element. Tab and Shift+Tab are trapped inside the panel. On close: focus returns to the element that was focused before. | `SP:93-114,166-195` |
| Type select vs box | New: type `Select`. Edit: read-only box (section 2). | `CPP:222-243` |

---

## 2. Property type select

New property only. Control: `Select` id `property-type`, label `Property type` + `*` (required), rules `{ required: true }`. No placeholder. Default `text`. Cites: `F/PropertyTypeField.tsx:16-33,41-58`, label EN:1008.

| # | Label (verbatim, value) | Conditional |
|---|---|---|
| 1 | `Text` (`text`) | |
| 2 | `Rich text` (`markdown`) | |
| 3 | `Numeric` (`numeric`) | |
| 4 | `Date` (`date`) | |
| 5 | `Multiple dates` (`multidate`) | |
| 6 | `Date range` (`daterange`) | |
| 7 | `Multiple date ranges` (`multidaterange`) | |
| 8 | `Select` (`select`) | |
| 9 | `Multiple select` (`multiselect`) | |
| 10 | `Relationship` (`relationship`) | |
| 11 | `Link` (`link`) | |
| 12 | `Image` (`image`) | |
| 13 | `Preview` (`preview`) | |
| 14 | `Media` (`media`) | |
| 15 | `Geolocation` (`geolocation`) | |
| 16 | `Generated ID` (`generatedid`) | |
| 17 | `Violated articles` (`nested`) | Only when `settings.project === 'cejil'` (`F/PropertyTypeField.tsx:36-38`). Server refuses it otherwise (section 9). |

Notes:
- Option labels are raw English strings, not passed through translation (`F/PropertyTypeField.tsx:16-33`, rendered by `SEL:83-89`).
- Order is fixed, not sorted.
- Read-only box on edit: caption `Type` (EN:1419), then the type icon and `t('System', translationsKeys[type] || type)` (`CPP:222-240`). Those labels come from the keys in `HLP:39-57`, whose EN values differ from the select labels:
  - `property markdown` = `Rich text` (EN:998)
  - `property multidate` = `Multiple date` (EN:1000) vs select `Multiple dates`
  - `property multidaterange` = `Multiple date range` (EN:1001) vs select `Multiple date ranges`
  - `property nested` has no EN entry (the key text would show)
- Changing the type of a saved property is impossible in the UI; the server also refuses it (`ERR:287`).

---

## 3. Field-by-type matrix

Legend: Y = shown. Blank = not shown. Order on screen is in section 4. "Fixed" columns apply to every non-common type.

Conditions from `CPP`: image/preview/media = `fullWidthTypes` (`CPP:72`); filterable list = `filterableTypes` (`CPP:56-69`); priority list = `prioritySortingTypes` (`CPP:71`); non-common (`!isCommonProperty`) gates Hide label, Required, Show in cards, Use as filter and the same-label block (`CPP:258-261,278`).

| Type | Label | Style | Full width | Thesaurus | Relationship type | Entities | Inherit property | Hide label | Required property | Show in cards | Use as filter | Default filter (needs filter on) | Priority sorting (needs filter on) | Same-label table (extra columns) |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| text | Y | | | | | | | Y | Y | Y | Y | Y | Y | Template, Type |
| markdown | Y | | | | | | | Y | Y | Y | Y | Y | | Template, Type |
| numeric | Y | | | | | | | Y | Y | Y | Y | Y | Y | Template, Type |
| date | Y | | | | | | | Y | Y | Y | Y | Y | Y | Template, Type |
| multidate | Y | | | | | | | Y | Y | Y | Y | Y | | Template, Type |
| daterange | Y | | | | | | | Y | Y | Y | Y | Y | | Template, Type |
| multidaterange | Y | | | | | | | Y | Y | Y | Y | Y | | Template, Type |
| select | Y | | | Y | | | | Y | Y | Y | Y | Y | Y | + Thesauri |
| multiselect | Y | | | Y | | | | Y | Y | Y | Y | Y | | + Thesauri |
| relationship | Y | | | | Y | Y | Y (only when an entity template is picked) | Y | Y | Y | Y | Y | | + Relation type, Entities, Inherit type |
| link | Y | | | | | | | Y | Y | Y | | | | Template, Type |
| image | Y | Y | Y | | | | | Y | Y | Y | | | | Template, Type |
| preview | Y | Y | Y | | | | | Y | Y | Y | | | | Template, Type |
| media | Y | Y | Y | | | | | Y | Y | Y | | | | Template, Type |
| geolocation | Y | | | | | | | Y | Y | Y | | | | Template, Type |
| generatedid | Y | | | | | | | Y | Y | Y | Y | Y | | Template, Type |
| nested (cejil) | Y | | | | | | | Y | Y | Y | Y | Y | | Template, Type |

Cites by column: Style `CPP:250`; Full width `CPP:257`; Thesaurus `CPP:252`; Relationship type, Entities `CPP:253-255`; Inherit property `F/RelationshipFields.tsx:121`; Hide label `CPP:258`; Required `CPP:259`; Show in cards `CPP:260`; Use as filter `CPP:261-263`; Default filter `CPP:264-266`; Priority sorting `CPP:267-269`; same-label block `CPP:278-295`; extra columns `MPT:201-233`.

Common properties (edit only; they have no Add path):

| Common property | Type box | Label | Hide label / Required / Show in cards / Use as filter / Default filter | Priority sorting | Generated ID | Same-label block |
|---|---|---|---|---|---|---|
| Title (`name` `title`, type `text`) | Y | Y, editable | not shown | Y, always | Y | not shown |
| Date added (`creationDate`, type `date`) | Y | Y, but `disabled` | not shown | Y, always | | not shown |
| Date modified (`editDate`, type `date`) | Y | Y, but `disabled` | not shown | Y, always | | not shown |

Cites: `CPP:119-120,258-261,274-275,278`, label disabled `F/LabelField.tsx:28`, default labels `HLP:8-27` (`Title`, `Date added`, `Date modified`).

Server persists (not UI-visible): Filterable classes store `filter`, `defaultfilter`, `prioritySorting` (`DOM/FilterableProperty.ts:19-21`); link, geolocation, image, preview, media do not extend it (`DOM/LinkProperty.ts:29`, `DOM/GeoLocationProperty.ts:28`, `DOM/AbstractImageProperty.ts:14`). Image, preview, media store `style` and `fullWidth` (`DOM/AbstractImageProperty.ts:21-22`). Text also stores `generatedId` (`DOM/TextProperty.ts:24-28`), no UI for it on custom text properties.

---

## 4. Every field, in on-screen order

Order (non-common): Property type (or Type box) / Label / Style / Thesaurus or Relationship fields / checkbox group (Full width, Hide label, Required property, Show in cards, Use as filter, Default filter, Priority sorting) / same-label heading and table (`CPP:221-295`).

Default (new) = value in `emptyProperty` (`CPP:39-54`): `type 'text'`, `label 'Text'`, every boolean `false`, `style 'cover'`, `content/relationType/inherit undefined`.

| # | Label (verbatim) | Control | Placeholder | Help / tooltip (verbatim) | Default (new) | When shown | Validation and message | Cite |
|---|---|---|---|---|---|---|---|---|
| 1 | `Property type` + `*` | Select `property-type` | none | none | `text` | New only | `required` (no message shown) | `F/PropertyTypeField.tsx:41-58`, `CPP:241-243` |
| 1b | `Type` (caption) | Read-only box: icon + type name | n/a | none | n/a | Edit only | n/a | `CPP:222-240` |
| 2 | `Label` + `*` | `InputField` `property-label`, text | `Text` | none | `Text`, then the capitalised type key after a type pick (section 5) | Always. `disabled` for the common date properties. | Client: `required` -> `This field is required`; `duplicateLabel` -> `This label already exists in this template`. Shown under the input as red text. Server: none on label content (section 9). | `F/LabelField.tsx:18-52`, EN:644,1341,1353 |
| 3 | `Style` (legend) | Radio group, horizontal: `Fill` (`cover`), `Fit` (`contain`) | n/a | `Fill` tooltip: `Will attempt to fill the container, using its entire width. In cards, cropping is likely to occur.` `Fit` tooltip: `Will show the entire media inside the container.` | `Fill` (`cover`) | image, preview, media | Server: only `cover`/`contain` | `F/StyleField.tsx:13-60`, EN:1242,521,537,1520,1522 |
| 4 | `Thesaurus` + `*` | Select `property-thesaurus` | first option `Select...` (value empty) | none | empty | select, multiselect | Client: `required: true`, no message rendered. Server: section 9. | `F/ThesaurusField.tsx:40-58`, EN:1323,1166 |
| 5 | `Relationship type` + `*` | Select `property-relation-type` | first option `Select...` | none | empty (`setValue('relationType','')` on type pick) | relationship | Client: `required: true`, no message rendered. Server: section 9. | `F/RelationshipFields.tsx:82-100`, `CPP:129-132`, EN:1051 |
| 6 | `Entities` | Select `property-entity` | first option `Any entity` (empty value) | none | empty = `Any entity` | relationship | `required: false` | `F/RelationshipFields.tsx:102-119`, EN:461,121 |
| 7 | `Inherit property` | Select `property-inherit` | first option `Select...` | none | none | relationship and an entity template is selected | none client; server section 9 | `F/RelationshipFields.tsx:121-144`, EN:619 |
| 8 | `Full width` | Checkbox `fullWidth` | n/a | `This property will be shown using all the width available.` | off | image, preview, media | none | `F/FullWidthField.tsx:13-33`, EN:550,1360 |
| 9 | `Hide label` | Checkbox `noLabel` | n/a | `This property will be shown without the label` | off | non-common, all types | none | `F/HideLabelField.tsx:13-27`, EN:581,1361 |
| 10 | `Required property` | Checkbox `required` | n/a | `You won't be able to save an entity if this property is empty.` | off | non-common, all types | none (enforced when entities are saved) | `F/RequiredField.tsx:13-32`, EN:1078,1540 |
| 11 | `Show in cards` | Checkbox `showInCard` | n/a | `This property will appear in the library cards as part of the basic info.` | off | non-common, all types | none | `F/ShowInCardsField.tsx:13-33`, EN:1198,1359 |
| 12 | `Use as filter` | Checkbox `filter` | n/a | `This property will be used for filtering the library results. When properties match in equal name and field type with other entity types, they will be combined for filtering.` (tooltip `max-w-xs`) | off | non-common and type in the filterable list | none. Unchecking forces Default filter and Priority sorting to off (`CPP:145-150`). | `F/FilterField.tsx:13-33`, EN:1464,1363 |
| 13 | `Default filter` | Checkbox `defaultfilter` | n/a | `This property will be the default filter in the library for this template.` | off | `filter` checked | none | `F/DefaultFilterField.tsx:13-33`, EN:360,1362 |
| 14 | `Priority sorting` | Checkbox `prioritySorting` | n/a | `Properties marked as priority sorting will be used as default sorting criteria. If more than one property is marked as priority sorting the system will try to pick-up the best fit. When listing mixed template types, the system will pick-up the best combined priority sorting.` (tooltip `max-w-xs`) | off | Custom: `filter` checked and type text, numeric, select or date. Common: always. | none | `F/PrioritySortingField.tsx:13-34`, `CPP:267-269,274`, EN:975,989 |
| 15 | `Generated ID` | Checkbox `generatedId` | n/a | `A generated ID will be the default title.` | off | Title common property only | none | `F/GeneratedIdField.tsx:13-28`, `CPP:275`, EN:554,13 |
| 16 | Heading `Properties from other templates in the collection using the same label.` then table | Read-only `Table` | n/a | none | n/a | Non-common | Section 6 | `CPP:278-295`, EN:988 |

Notes:
- The tooltip icon is a 20px question-mark circle after each checkbox label, placement `right` (`F/*.tsx` label blocks). Hover trigger (Flowbite default); keyboard behaviour (unverified).
- The checkboxes sit in one column, `gap-2`, under a `mt-2` block (`CPP:256`).
- Type-dependent unchecking: while `filter` is false and the property is not common, `defaultfilter` and `prioritySorting` are forced to false on every change (`CPP:145-150`).
- Relationship `content` ids, `relationType` ids and `inherit.property` ids are database ids; `inherit` is stored as `{property, type}` where `type` is the target property's type (`F/RelationshipFields.tsx:131-139`).

---

## 5. Label rules

| Rule | Detail | Cite |
|---|---|---|
| Initial label | Panel opens a new property as `Text` | `CPP:41,100` |
| Label on type pick (new only) | Form is reset to the empty property and the label becomes the raw type key with the first letter capitalised: `Text`, `Markdown`, `Numeric`, `Date`, `Multidate`, `Daterange`, `Multidaterange`, `Select`, `Multiselect`, `Relationship`, `Link`, `Image`, `Preview`, `Media`, `Geolocation`, `Generatedid`, `Nested`. Everything typed or ticked is lost on each type change. | `CPP:126-137` |
| Required | `Boolean(value)`; a whitespace-only value passes. Message `This field is required`. | `F/LabelField.tsx:38` |
| Unique in template | Case-insensitive, trimmed, against this template's custom properties in the draft, excluding the property being edited (`_id` compare). Common property labels (`Title`, `Date added`, `Date modified`) are not compared. Message `This label already exists in this template`. | `F/LabelField.tsx:39-49`, `CPP:244-249` (template passed with draft `properties`: `TE:358`) |
| When errors show | On submit only (RHF default mode). | `CPP:218` |
| Stored value | Not trimmed. | `F/LabelField.tsx:36-51` |
| Disabled | Label of Date added and Date modified. | `F/LabelField.tsx:28` |
| Name derivation | The panel sends no `name`. The server strips unknown keys and derives `name` from the label on every save: `PropertyName.fromLabel(label)` -> `safeName`. Default: `label.trim().replace(/[^a-z0-9]/gi, '_').toLowerCase()`, so `Date of birth` -> `date_of_birth` and every non-ASCII letter becomes `_`. | `DOM/PropertyName.ts:11-13`, `DOM/utils/propertyNameGeneration.ts:8-16`, `DTO:24-52` (no `name` key), `DOM/Property.ts:62-64` |
| Name derivation, when the collection setting "Non-latin characters support" is on (`newNameGeneration`) | `generateNewSafeName`: trim, replace `# \ / | * ? " < > = whitespace : . [ ] % ! - & ^ + ( ) { } ~` with `_`, drop one leading ` `, `_`, `-`, `+` or `$`, lowercase. | `DOM/utils/propertyNameGeneration.ts:1-6`, `app/api/core/application/CreateTemplate.ts:34`, `app/api/core/application/settings/saveSettingsInput.ts:204`, EN:866 |
| Rename effect | A changed label changes the derived `name`; the server records `name` and `label` as updated attributes. | `DOM/Property.ts:115-116` |
| Reserved names | No list. The three common names (`title`, `creationDate`, `editDate`) must exist; a custom property whose derived name equals `title` fails with `TemplateWithDuplicatedPropertyError`. `creationDate` and `editDate` cannot be produced because derived names are lower-case. | `DOM/templateValidator/TemplateWithDuplicatedPropertyValidator.ts:9-17`, `DOM/templateValidator/TemplateWithMissingCommonPropertyValidator.ts:6` |
| Label vs name collision | Two labels that derive the same name (for example `Año` and `A?o`, or `a-b` and `a b`) pass the client check and fail on Save. | `DOM/templateValidator/TemplateWithDuplicatedPropertyValidator.ts:11-17` |
| Labels are shared across templates on purpose | Same label across templates is allowed if types and pickers agree (section 6); library filters combine same name and type (tooltip in row 12). | `F/FilterField.tsx:23` |

---

## 6. Same-label (matching properties) table

When shown: heading and table appear for every non-common property, new or edit, always with at least one row (`CPP:278-295`, `MPT:168-181,235-239`).

Heading (verbatim): `Properties from other templates in the collection using the same label.` (`CPP:281-283`, EN:988). Table is wrapped in `mt-4` (`MPT:236`).

Rows (`MPT:150-183`):
1. First row: the property being edited, built from the live form values (type, content, relationType, inherit), template name, with the suffix `(this template)` (`MPT:46`).
2. Then one row per property in `templatesAtom` whose label, trimmed and lower-cased, equals the form label and whose `_id` is not the edited property. This includes other properties of the current template as last saved. All templates are searched, using the saved template list, not the draft.

Columns, verbatim, in order (`MPT:51-56,187-233`):

| Type of property | Columns |
|---|---|
| Every type | `Template`, `Type` |
| select, multiselect | + `Thesauri` |
| relationship | + `Relation type`, `Entities`, `Inherit type` |

Cell text:
- `Template` cell: template name (translated, truncated at 30 chars) + `(this template)` on the current template's rows (`MPT:37-49`, EN:1369).
- `Type` cell: type icon and `t('System', 'property {type}')` label, e.g. `Rich text`, `Multiple date` (`MPT:25-35`, `HLP:39-57`).
- `Thesauri` cell: thesaurus name, or `No type` when the id is missing (`MPT:63-72`, EN:854).
- `Relation type` cell: relationship type name, or `No type` (`MPT:99-110`).
- `Entities` cell: template name (translated, truncated at 30), or `Any entity` (`MPT:83-97`, EN:121).
- `Inherit type` cell: icon and type label of `inherit.type`, or `No type` (`MPT:112-127`).

Incompatible cells are drawn in `text-error-600` (red): `Type` when `value !== currentType` (strict); `Thesauri`, `Relation type`, `Entities` when the ids differ (empty and missing count as equal); `Inherit type` when `inherit` differs (`MPT:29-31,71,95,108,117`, `HLP:97-145`).

Client compatibility rules, `validateMatchingProperties` (`CPP:153-191`):
- No same-label property elsewhere: valid.
- Any `prop.type !== type`: invalid (strict equality, no compatible pairs).
- select, multiselect: `content` (thesaurus id) must match (`optionalIdMatches`).
- relationship: `content`, `relationType` and `inherit` (`property` and `type`) must all match (`relationshipConfigMatches`, `HLP:131-145`).

Server compatibility rules (by derived name, not label; section 9): same name needs equal or compatible type. Compatible pairs: text/markdown, date/multidate, daterange/multidaterange, select/multiselect (`DOM/TextProperty.ts:29`, `DOM/MarkdownProperty.ts:25`, `DOM/DateProperty.ts:25`, `DOM/MultiDateProperty.ts:22`, `DOM/DateRangeProperty.ts:48`, `DOM/MultiDateRangeProperty.ts:47`, `DOM/select/SelectProperty.ts:13`, `DOM/select/MultiSelectProperty.ts:13`). The client is stricter, so a text/markdown pair that the server accepts disables Save.

Message when incompatible: none. The only cues are the red cells and the disabled submit button (`CPP:302`). The submit handler also returns silently if the check fails (`CPP:198-201`).

What disables Save (submit button): only `!validateMatchingProperties()`. Not disabled by: empty label, missing thesaurus, missing relationship type (those block the submit silently through RHF validation, section 4 rows 4-5).

---

## 7. Add thesaurus modal and Add relationship type modal

Both are `Modal size="md"` (`max-w-md`, min 24rem at sm), rendered by the editor page while its flag is true (`TE:346-349`, `MOD:12-31`). `Modal` has no Escape handler and no backdrop click handler; close paths are the header X (`aria-label="Close modal"`, `MOD:97-108`) and Cancel. Neither modal is a `<form>`, so Enter does not submit. Opened from footer buttons `Add thesaurus` and `Add relationship type` (secondary), visible only when no property row is selected (`TEF:26-37`, EN:67,65).

| | Add thesaurus | Add relationship type |
|---|---|---|
| Title (h1, `text-xl font-medium`) | `Add thesaurus` (`ATM:67-69`, EN:67) | `Add relationship type` (`ARM:46-48`, EN:65) |
| Field label | `Name` (`ATM:76`, EN:773) | `Name` (`ARM:55`) |
| Input id | `thesaurus-name` | `relationship-type-name` |
| Placeholder | `Thesaurus name` (`ATM:82`, EN:1325) | `Relationship type name` (`ARM:61`, EN:1053) |
| Buttons, in order | `Cancel` (secondary), `Save` (success), right-aligned, inside the body, no footer (`ATM:88-98`) | same (`ARM:67-74`) |
| Save disabled | `isSaving` or sanitised name empty. Sanitising: newlines to spaces, runs of whitespace to one space, trim (`app/shared/sanitizationUtils.ts:20-37`) (`ATM:92-96`) | `isSaving` or `!name.trim()` (`ARM:71`) |
| Client duplicate check | On Save: case-insensitive equality of the sanitised name against every item in `thesauriAtom` (this atom also holds template-backed entries) (`ATM:44-51`) | On Save: case-insensitive equality of the trimmed name against `relationshipTypesAtom` (`RTM:21-27`) |
| Duplicate message | `Thesaurus name already exists` (EN:1326), shown only when `nameError && name` (`ATM:84-86`) | `Relationship type name already exists` (EN:1054) (`ARM:63-65`) |
| Error clears | On the next keystroke (`ATM:78-81`) | same (`ARM:57-60`) |
| Success | Creates `{name: <sanitised>, values: []}`, appends it to `thesauriAtom` (the Thesaurus select now lists it), toast `Thesaurus created successfully.` (`ATM:30-41`, EN:1324). Modal closes. | Creates `{name: <trimmed>}`, appends to `relationshipTypesAtom`, toast `Relationship type created successfully.` (`ARM:36-37`, `RTM:29-35`, EN:1052). Modal closes. |
| Failure | `handleUnexpectedError(error, 'Error creating thesaurus')` (`ATM:56-58`); modal closes anyway (`finally`, `ATM:58-61`) | Error toast `An error occurred` with the server detail (`error.detail ?? error.message ?? 'An error occurred'`); modal stays open (`ARM:32-35`, `RTM:30-32`, EN:116) |
| Duplicate, modal state | Stays open (early return before `finally`, `ATM:48-51`) | Stays open (`ARM:28-31`) |
| Server | `POST /api/thesauris`, admin. Name schema: `Name is required`, `Name cannot be empty` (`app/api/core/domain/thesaurus/Thesaurus.ts:67-70`). Duplicate is exact-case on `name`: `A thesaurus with name "{name}" already exists` (`app/api/core/domain/thesaurus/errors.ts:17`, `app/api/core/infrastructure/mongodb/thesauri/MongoThesauriDataSource.ts:62`). | `POST /api/relationtypes`, admin (`app/api/core/infrastructure/express/relationshipType/routes.ts:9-19`). `name` is `z.string()` (`RelationshipTypeRouteSchemas.ts:7`). Duplicate (case-insensitive, trimmed) throws plain `Error('duplicated_entry')` (`app/api/core/application/CreateRelationshipType.ts:19-22`, `app/api/core/infrastructure/mongodb/relationshipType/MongoRelationshipTypesDataSource.ts:41-45`). HTTP status for a plain `Error`: (unverified). |
| Does not | select the new item in an open panel (the panel is closed while the modal is open) | same |

---

## 8. Relationship property

Order: `Relationship type` / `Entities` / `Inherit property` (`F/RelationshipFields.tsx:80-145`).

| Control | Options (in order) | Default | Notes |
|---|---|---|---|
| `Relationship type` + `*` (id `property-relation-type`) | 1. `Select...` (empty value). 2. Every relationship type, labelled `t(type._id, type.name)` (translated), sorted by label (`orderBy` on the label string). | `Select...` | `required: true` with no visible error (`:85`). No create link. (`:26-36`) |
| `Entities` (id `property-entity`) | 1. `Any entity` (empty value). 2. Every template except the one being edited (`template._id !== templateId`), sorted by label. Label = name truncated to 30 chars + `...`; if the translated name differs, `{name} ({translatedName})`. | `Any entity` | `required: false` (`:38-58,102-119`). A relationship cannot point at its own template (`:41`); an unsaved new template has no id, so all templates are listed. |
| `Inherit property` (id `property-inherit`) | 1. `Select...` (empty value). 2. Every custom property (`properties`) of the selected template, no type filter, labelled `t(selectedTemplate._id, prop.label)` truncated at 100, sorted by label. Common properties are not offered. | `Select...` | Shown only when `Entities` is a specific template (`content !== ''` and the template is found, `:60-63,121`). On pick stores `{ property: <property _id>, type: <property type> }`; picking `Select...` stores `undefined` (`:131-139`). |

Behaviour:
- Changing `Entities` clears `Inherit property` (`useEffect` on `content`, `:22-24`).
- On a new relationship property the form is reset with `relationType ''` and `content ''` (`CPP:129-132`).
- Required rules: `Relationship type` is required by RHF; `Entities` and `Inherit property` are optional.
- Server rules in section 9; `inherit` is kept only when `inherit.property` is set (`DOM/V1RelationshipProperty.ts:88-90`).
- Same-label rule for relationships compares `content`, `relationType` and `inherit` (section 6).
- Filter, Default filter allowed; Priority sorting not (section 3).

---

## 9. Server-side property validation (templates schema)

Transport: `POST /api/templates` (admin), body parsed by zod, then domain classes (`app/api/core/infrastructure/express/template/routes.ts:13`, `app/api/core/infrastructure/facades/TemplateFacade.ts:40,65`). Status mapping (`HE:120-126,142-144`):
- ZodError -> 422, `message` = `util.inspect(error)`, `validations` = issues.
- `ValidationError` (domain) -> 422.
- `DomainError` -> 400.
The editor shows server text only as the detail of the toast `Error saving template.` (`TE:178-186`).

| Rule | Message (verbatim) | Cite |
|---|---|---|
| Template `name` missing | `Template name is required` | `DTO:66` |
| Update without template id | `Template id is required` | `DTO:83` |
| Update common property without id | `Common property id is required` | `DTO:79` |
| Unknown top-level keys | zod strict object (default zod text) (unverified) | `DTO:72,86` |
| `label` not a string | zod default (`Required` / `Expected string, received ...`) (unverified). No min length: an empty label passes the schema. | `DTO:25`, zod ^3.24.1 (`package.json:287`) |
| `type` not one of the 17 | zod union error (unverified) | `DTO:4-22` |
| Unknown type reaching the factory | `The following type was not handled. Type = {type}` | `ERR:294`, `DOM/PropertyFactory.ts:97-98` |
| Image/preview/media `style` not `cover`/`contain` | `The following style type is not valid for Image Property. Type = {type}` (also for preview and media) | `ERR:86`, `DOM/AbstractImageProperty.ts:27-31` |
| select/multiselect without `content` | `The following field is required. Field = content` | `ERR:186`, `DOM/select/AbstractSelectProperty.ts:23-27` |
| Thesaurus id does not exist | `The following Thesaurus does not exist. Thesaurus Id = {thesaurusId}` | `ERR:196`, `app/api/core/application/propertyCreatorService/SelectPropertyCreatorService.ts:26-30` |
| Relationship type id does not exist (also empty) | `The Relationship Type with Id "{relationType}" was not found.` | `ERR:205`, `app/api/core/application/propertyCreatorService/RelationshipPropertyCreatorService.ts:23-29` |
| Inherit: target property missing in the target template | `The provided Target Property with id "{propertyId}" was not found on Template with id "{templateId}"` | `ERR:231`, `RelationshipPropertyCreatorService.ts:36-42` |
| Inherit: type differs from the target property's type | `The provided Target Property type "{providedType}" does not match with the Target Template type "{existingType}"` | `ERR:240`, `RelationshipPropertyCreatorService.ts:44-46` |
| Relationship `content` template existence | Not checked unless `inherit` is set (then `getById(...).getDataOrThrow()`). | `RelationshipPropertyCreatorService.ts:31-34` |
| `nested` outside project `cejil` | `The nested Property type is not available for your organization {props as JSON}` | `ERR:249`, `app/api/core/application/propertyCreatorService/NestedPropertyCreatorService.ts:17-19` |
| Same derived name in another template, incompatible type | `Property with the name "{existingName}" must have type "{existingType}", but type "{attemptedType}" was provided.` | `ERR:131`, `DOM/Property.ts:98-102`, `app/api/core/application/propertyCreatorService/AbstractPropertyCreatorService.ts:24-28` |
| Same name, select/multiselect with another thesaurus | `Property with the name "{name}" has a thesaurus mismatch. It must be linked to {existingContent} thesaurus, but a link to {attemptedContent} thesaurus was provided.` | `ERR:141`, `DOM/select/AbstractSelectProperty.ts:33-39` |
| Same name, relationship inheritance differs | `Property with the name "{name}" has an inheritance mismatch. It must {inherit the property "{type}" or: not inherit any property}, but a configuration to {inherit the property "{type}" or: not inherit any property} was provided.` | `ERR:154-158,149-152`, `DOM/V1RelationshipProperty.ts:117-123` |
| Two properties in one template derive the same name | `Template contains duplicate property name: [name={name}]. Conflicts: "{label1}" ({type1}) and "{label2}" ({type2}).` (label1 is the earlier row) | `ERR:95-100`, `DOM/templateValidator/TemplateWithDuplicatedPropertyValidator.ts:11-17` |
| A common property name missing | `Template has the missing Property. Type = {name}` | `ERR:178`, `DOM/templateValidator/TemplateWithMissingCommonPropertyValidator.ts:6-16` |
| Title not type text | `The following type is not valid for {propertyName}. Type = {type}` | `ERR:14`, `DOM/TitleProperty.ts:25-27` |
| Title name not `title` | `The following PropertyName is not valid for TitleProperty. PropertyName = {name}` | `ERR:32`, `DOM/TitleProperty.ts:29-31` |
| Change of a saved property's type | `Can't change property types.` | `ERR:287`, `DOM/Property.ts:106` |
| Delete a property another template inherits | `Properties can not be deleted because are being inherited: [properties={names}]` | `ERR:115`, `app/api/core/application/UpdateTemplate.ts:67-73` |
| Template name taken | `The following Template has a used Name on the system. Name = {name}` | `ERR:169`, `app/api/core/application/CreateTemplate.ts:59-62` |
| Update while background processing | `template is being processed you can not update it yet` (path `processing`) | `DOM/Template.ts:256-259` |

Required, filter and display flags (`required`, `filter`, `defaultfilter`, `noLabel`, `showInCard`, `prioritySorting`, `fullWidth`, `generatedId`) have no cross-field server rule (`DTO:40-47`).

---

## 10. Improvements to layer on

Row refs are gap-matrix.md "Template editor" rows; UX refs are settings-ux-audit.md "Improvements beyond 1:1 parity" numbers. "no UX#" = a row or Summary item without an UX number.

- Property panel on shared `Modal` (md) with focus trap, full-screen sheet on phones, Escape in an open Select closes only the Select: UX12; rows "Property panel container", "Phone"; audit Summary 7.
- Property rows on phone as name, type badge and flag icons, panel opened as a sheet: UX12; row "Phone".
- Hover or focus a property row (and the Show in cards checkbox) highlights its place on the live card preview: UX7; row "Property to card link".
- Keyboard reorder (up/down buttons beside drag) in the property list that opens the panel: UX9; row "Reorder".
- Property search above the property table: UX1; row "Property search".
- Show "N entities lose this value" when a property is removed and offer undo from the Beacon: UX4, UX5; row "Remove properties".
- Footer on the bar ladder: `Cancel` as ghost, commit solid ink (not green `success`); `Save` on edit may keep green per `warmButton.ts`: audit Summary 6; row "Property panel container" (no UX#).
- One option table per type (section 3) drives which controls render, in one constant: row "Per-type option matrix".
- Label: empty default, a type change keeps typed text: row "Label" (no UX#).
- Visible error line for an incompatible same-label property, using the stricter client rule: row "Same-label table" (no UX#, prototype-only `role=alert` summary is kept).
- Reject labels equal to a common property label (`Title`, `Date added`, `Date modified`) with the existing message; stable ids instead of derived names: row "Reserved and derived names" (no UX#).
- Visible required messages for Thesaurus and Relationship type (`This field is required`): rows "Select", "Relationship" (no UX#).
- Live thesaurus, relation-type and template pickers by id, one relation-type registry shared by Settings, panel and modals: rows "Select", "Relationship", "Add thesaurus modal", "Add relationship type modal" (no UX#).
- Inherit picker lists the target's custom properties and keeps its value on open: row "Relationship" (no UX#).
- Both Add modals stay open on any failure and keep the typed name; keep the Add buttons on the page footer or add an inline `Add new` entry in the pickers, and select the created item: rows "Add thesaurus modal", "Add relationship type modal" (no UX#).
- Impact preview when a label rename or thesaurus change would alter stored values: UX4 (applies to the Edit path); row "Rename effects".

---

## 11. Uwazi defects NOT to copy

- Default label collides: a new property is `Text` (or the capitalised type key, e.g. `Multidate`, `Generatedid`), and a second new property gets the same label and fails only at submit (`CPP:41,128`, `F/LabelField.tsx:45-47`). Corrected: empty label by default, placeholder only; user-facing type name as placeholder.
- A type change wipes everything typed or ticked, including the label (`CPP:126-137`). Corrected: keep the label and every flag that still applies to the new type; drop only the fields that no longer apply.
- Inherit property is probably cleared on open (unverified): `RelationshipFields` runs `setValue('inherit', undefined)` on mount and whenever `content` changes (`F/RelationshipFields.tsx:22-24`), and `reset(propertyToEdit)` changes `content` from `''` to the saved value after the panel mounted (`CPP:134-136`). No spec covers it (`app/react/V2/Routes/Settings/Templates/specs/TemplatesSettings.cy.tsx` has no inherit case). Corrected: clear `inherit` only when the user changes `Entities`.
- Silent required blocks: `Thesaurus` and `Relationship type` use `rules={{ required: true }}` but their `Select` gets no `hasErrors` or message, so a click on `Add property` does nothing visible (`F/ThesaurusField.tsx:43-57`, `F/RelationshipFields.tsx:85-98`). Corrected: show `This field is required` under the select.
- Whitespace-only label passes `required` (`Boolean(value)`, `F/LabelField.tsx:38`); the label is saved untrimmed; the schema allows an empty string (`DTO:25`). Corrected: trim, then require.
- Save disabled with no text when a same-label property is incompatible (`CPP:302`, `CPP:198-201`). Corrected: a visible error line naming the conflicting template and the field that differs.
- Phantom matches: the matching check reads the saved template list, so a property already removed or renamed in the draft still matches, and the current template's saved copy can match a new property (unverified, `CPP:156-160`, `MPT:152-155`). Corrected: read the draft for the current template.
- Same name pair rules differ between client and server (client strict, server allows four compatible pairs), and only the server catches two labels that derive the same name (`CPP:166-169`, section 5). Corrected: one rule, on ids.
- Type labels disagree: select says `Multiple dates` and `Multiple date ranges`, the read-only box and tables say `Multiple date` and `Multiple date range`; select labels are not translated; `property nested` has no entry (`F/PropertyTypeField.tsx:21,23`, EN:1000-1001, `HLP:56`). Corrected: one constant, one label per type, used in the select, the read-only box, the table and the options column.
- Style radios use `defaultChecked` (uncontrolled), so a form `reset` between image, preview and media leaves the visible radio out of sync with the form value (unverified, `F/StyleField.tsx:19,39`). Corrected: controlled radios.
- Panel closes on overlay click or Escape and drops edits with no confirmation (`SP:116-127,226`). Corrected: ignore the backdrop click when the form is dirty, or confirm.
- The `Add thesaurus` modal closes on a server error and loses the typed name (`ATM:56-61`). Corrected: stay open.
- Tooltips as the only place help text lives, behind an icon with hover trigger (keyboard access unverified). Corrected: visible help text under the field for the flags that change library behaviour (Use as filter, Priority sorting).
- Opening the panel on a property whose `filter` is false silently sets `prioritySorting` and `defaultfilter` to false (unverified, `CPP:145-150`). Corrected: apply the forcing only on user unchecking Use as filter.
- Entities cannot be the template itself (`F/RelationshipFields.tsx:41`). Decide per prototype: self-reference allowed or not; Uwazi's behaviour is "not".
- Label is the only identity users see, but the server renames the stored metadata key when the label changes (`DOM/Property.ts:115-116`, `DTO:24-52`). Corrected: stable property id; a label rename never changes the key.
