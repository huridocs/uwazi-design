# B5: Collection settings (`/settings/collection`) and Global CSS & JS (`/settings/customisation`)

Reference: `uwazi-ref` v1.229.224. All paths below are repo-relative to `uwazi-ref`. `C.tsx` = `app/react/V2/Routes/Settings/Collection/Collection.tsx`, `Tips` = `app/react/V2/Routes/Settings/Collection/collectionSettingsTips.tsx`, `Th/` = `app/react/V2/Routes/Settings/Collection/Theming/`, `csv` = `contents/ui-translations/en.csv`. Prior notes (inventory, gap-matrix) were re-checked against the code; differences are flagged.

Translation rule used for all copy: `<Translate>` shows the stored translation for its key when one exists, else its children (`app/react/I18N/Translate.tsx:61`). Text with `*x*` renders italic and `\n` renders a line break (`Translate.tsx:28-32,62-74`). Where `en.csv` differs from the code string, both are given; the csv text is what a fresh install seeds (unverified which one a given instance shows).

### Collection

#### 1. Screen map

Route: `/settings/collection`, admin only (`app/react/Routes.tsx:336-340`, `adminsOnlyRoute`). Loader reads settings, all templates, and uploaded custom files (`C.tsx:31-49`).

Page shell (`app/react/V2/Components/Layouts/SettingsContent.tsx`):
- Header, 3-part row `pt-5 pb-4 px-4`: below `lg` a back chevron to `/settings` with sr-only `Navigate back` (`SettingsContent.tsx:62-67`); breadcrumb with one item, title `Collection` (`C.tsx:185`).
- Body `px-4`, one `<form id="collection-form">` (`C.tsx:187`), five cards stacked, each `mb-4`. A card is a bordered panel: header strip `p-4 text-base font-semibold` with the title, body `p-4` (`app/react/V2/Components/UI/Card.tsx:34-47`). Inside cards the grid is `grid gap-4 sm:grid-cols-2 sm:gap-6`: one column below 640px, two at `sm` and up.
- Sticky footer: `sticky bottom-0 ... border-t px-4 py-3`, one button `Save` (primary variant, `type="submit" form="collection-form"`) (`SettingsContent.tsx:95-113`, `C.tsx:464-470`). Footer is left-aligned (`flex gap-2`).

Cards, top to bottom (L = left column, R = right column, FULL = `col-span-2`):

1. `General` (`C.tsx:188`)
   - Row 1: L `Collection Name` text input. R `Custom Favicon` picker (when the tenant flag `themeCustomization` is off) or, when on, a FULL `Theme and branding` summary card in place of the picker (`C.tsx:198-222`).
   - Row 2: L `Default View` select. R `Default date format` select (`C.tsx:223-242`).
   - Row 3 FULL: `Custom landing page` text input with a `https://yourdomain` prefix addon, "?" tooltip (`C.tsx:243-253`).
   - Rows 4-8, each FULL, one toggle row (switch, label, "?" icon): `Public instance`, `Hide restricted relationships from public`, `Show cookie policy`, `Global JS`, `Non-latin characters support` (last one only while not yet enabled) (`C.tsx:254-304`).
2. `Analytics` (title carries a "?" tooltip, placement right): L `Google`, R `Matomo` (`C.tsx:307-334`).
3. `Services` (rendered only when `settings.features.ocr.url` is set): one toggle `Document OCR trigger` (`C.tsx:335-349`).
4. `Forms and email configuration` (`C.tsx:350-404`):
   - L `Sending email`, R `Contact form email`.
   - FULL `Public Form submit URL`.
   - FULL toggle `Allow captcha bypass`.
   - FULL multi-select `Whitelisted templates`.
5. `Map` (`C.tsx:405-461`):
   - L `Map Provider` select, R `Map API key` input.
   - FULL multi-select `Map Layers`.
   - FULL map-and-coordinates control (370px high map, then `Latitude` and `Longitude` inputs side by side). No section label.

Toggle row anatomy: `flex gap-4 items-center`: 44x24px switch, label (`text-sm font-medium`), 20px `?` circle icon (`text-ink-muted`) with a hover tooltip, placement right (`app/react/V2/Routes/Settings/Collection/CollectionOptionToggle.tsx:24-37`). The switch has no text of its own (`{null}` child).

Label-with-tip anatomy (all non-toggle fields): `<span class="flex gap-4">` label then `?` icon (`C.tsx:147-154`). Tooltip is Flowbite `Tooltip`, light surface, `text-sm font-medium`, `px-3 py-2`, placement right (`app/react/V2/Components/UI/Tooltip.tsx:14-22`). Whether the icon is keyboard focusable is (unverified).

Mobile: under 640px every grid is one column; the map stays 370px high. No other phone behavior is coded.

#### 2. Fields

No field has an HTML `placeholder`. The only hint text is the `https://yourdomain` prefix addon on the landing page field and the multi-select empty text `No options` (`app/react/V2/Components/Forms/MultiSelect.tsx:36,192`, csv:829).

Columns: Control | Placeholder | Help text | Default | Stored as | Validation. "Tip:x" points to the verbatim tooltip block below the table.

**Card General**

| Label (verbatim) | Control | Placeholder | Help / tooltip | Default | Stored as | Validation: client / server | Cite |
|---|---|---|---|---|---|---|---|
| `Collection Name` | text input, label above, id `collection-name` | none | none | `Uwazi` on a fresh install | `site_name` | Client: `required: true`; failure = red border, red label, red-tint fill, no message, submit blocked with focus on the field. Server: `z.string().optional()`, empty string accepted | `C.tsx:191-196`; `app/api/core/application/settings/saveSettingsInput.ts:158`; default: `database/blank_state/uwazi_development/settings.bson` (binary, decoded by hand); error styling `app/react/V2/Components/Forms/InputField.tsx:51-64,107` |
| `Custom Favicon` (flag off) | hidden input plus picker: preview tile 3.5rem square on a checkerboard, buttons, modal (see section 4). Caption `Recommended: 16x16 to 512x512 px (square)` (`Recommended` is translated, rest is a literal) | none | Tip:favicon | empty (Uwazi logo is used) | `favicon` (URL like `/assets/<filename>`) | Client: file must come from Custom Uploads; strict size rule: square, 16 to 512 px each side; a wrong size is an error and cannot be picked. Server: `z.string().optional()` | `C.tsx:198-211`; `Th/CustomUploadImagePicker.tsx:75-114`; `Th/brandImageUploadRules.ts:3-11`; `Th/customUploadImagePickerLib.ts:20-25`; saveSettingsInput.ts:159 |
| `Theme and branding` (flag on; replaces the favicon picker) | summary card: preset chip, optional `Customized` chip, two accent swatches (light, dark), button `Edit theme` | none | none | `themeVars {}`, `themeAssets {}` (preset chip falls back to the default preset) | `themeVars`, `themeAssets`, plus `site_logo` and `favicon` copied on save | Server: `themeVars` is a string record, `themeAssets.preset` in `default`/`legacy` | `C.tsx:212-222`; `Th/ThemeSelectionCard.tsx:49-101`; saveSettingsInput.ts:161-181 |
| `Default View` | native select, id `roles` (duplicate id, see defects) | none | none | unset; select shows `Cards`; runtime treats anything but `table`/`map` as cards | `defaultLibraryView` | none client; server `z.string().optional()` (not an enum) | `C.tsx:224-234`; `app/react/Routes.tsx:143-163`; saveSettingsInput.ts:185 |
| `Default date format` | native select, id `date-format` | none | none | unset; select shows the first option `yyyy/MM/dd` (react-hook-form reads the DOM value on submit: unverified) | `dateFormat` (pattern string) | none client; server `z.string().optional()` | `C.tsx:235-242`; saveSettingsInput.ts:195 |
| `Custom landing page` | text input, id `landing-page`, left addon `https://yourdomain` | none (the addon is a prefix, not placeholder) | Tip:landing | unset = collection library | `home_page` | none client or server (`z.string().optional()`). At runtime the value is used only if it matches `^(/xx)?/(library(/map)?(/table)?/?(\?.*)?\|page/.+\|entity/.+)$`; otherwise the library opens with no message | `C.tsx:243-253`; `app/react/utils/routeHelpers.ts:5-13`; `app/react/getIndexElement.tsx:36-40`; saveSettingsInput.ts:184 |
| `Public instance` | toggle | n/a | `Check to make this instance public (non-logged in users can see public documents and entities)` | on only if `private` is false; a fresh install has `private: true`, so the toggle starts off | `private`, inverted: toggle on = `private: false` | none | `C.tsx:101,130,254-262`; `Tips:39-43` (csv:200); blank state `settings.bson` |
| `Hide restricted relationships from public` | toggle | n/a | Tip:filterUnauthorized | off | `filterUnauthorizedRelated` | none | `C.tsx:263-273`; `Tips:189-195` (csv:523) |
| `Show cookie policy` | toggle | n/a | `When enabled, visitors must accept or reject non-essential cookies before they are set. Analytics and language preference cookies are blocked until accepted.` | off | `cookiepolicy` | none | `C.tsx:274-284`; `Tips:45-50` (csv:1513) |
| `Global JS` | toggle | n/a | Tip:globalJS | off | `allowcustomJS` | none | `C.tsx:285-291`; `Tips:172-187` |
| `Non-latin characters support` | toggle, hidden once the stored value is truthy | n/a | Tip:characterSupport | off; fresh installs already have `newNameGeneration: true`, so the toggle is absent | `newNameGeneration`, only ever `true` (key deleted from the payload when off) | Server: `z.literal(true).optional()` | `C.tsx:121-123,292-304`; `Tips:82-108`; saveSettingsInput.ts:204 |

**Card Analytics** (card title tooltip: `If you want to track analytics related to your collection visits, Uwazi supports both Google Analytics and Matomo.`, `Tips:110-115`, csv:118)

| Label | Control | Placeholder | Help | Default | Stored as | Validation | Cite |
|---|---|---|---|---|---|---|---|
| `Google` | text input, id `google-analytics` | none | card tooltip above | unset | `analyticsTrackingId` | none (`z.string().optional()`) | `C.tsx:320-324`; saveSettingsInput.ts:193 |
| `Matomo` | text input, id `matomo-analytics` | none | card tooltip above | unset | `matomoConfig` (a JSON string `{"id":"...","url":"..."}`; the page gives no format hint) | none client or server; unparseable JSON is ignored silently at runtime | `C.tsx:327-331`; `app/react/V2/Components/Analitycs/Matomo.tsx:54-58`; saveSettingsInput.ts:194 |

**Card Services** (only if `features.ocr.url`)

| Label | Control | Placeholder | Help | Default | Stored as | Validation | Cite |
|---|---|---|---|---|---|---|---|
| `Document OCR trigger` | toggle | n/a | Tip:ocr | off | `ocrServiceEnabled` | none | `C.tsx:335-349`; `Tips:157-170` |

**Card Forms and email configuration**

| Label | Control | Placeholder | Help | Default | Stored as | Validation | Cite |
|---|---|---|---|---|---|---|---|
| `Sending email` | text input, id `sending-email` | none | `This is the email address that will appear as the sender when an email is sent from your Uwazi collection to registered users. The default address is *no-reply@uwazi.io*. You can set a custom one by including your desired email address here.` (the `*...*` renders italic) | unset (server mail falls back to a default sender) | `senderEmail` | none; no email-format check anywhere | `C.tsx:353-357`; `Tips:75-79` (csv:1175); saveSettingsInput.ts:183 |
| `Contact form email` | text input, id `receiving-email` | none | `If you have a contact form, this is the email address that will receive the form's submissions.` then a non-breaking space and a link `Learn how to add and configure a contact form on a webpage.` to `https://docs.uwazi.io/docs/how-to/managing-your-instance/create-and-manage-pages/#add-a-contact-form-to-a-page` (new tab, underlined) | unset | `contactEmail` | none; no email-format check | `C.tsx:359-368`; `Tips:52-68` (csv:1034,670); saveSettingsInput.ts:182 |
| `Public Form submit URL` | text input, id `public-form-destination` | none | `If you have configured a public form and would like a different Uwazi collection to receive the submissions, enter its URL here.` | unset | `publicFormDestination` | none; no URL check | `C.tsx:369-378`; `Tips:125-128` (csv:1017); saveSettingsInput.ts:191 |
| `Allow captcha bypass` | toggle | n/a | Tip:captcha | off | `openPublicEndpoint` | none | `C.tsx:379-389`; `Tips:141-149` (csv:179) |
| `Whitelisted templates` | multi-select card: 3rem header with label and a `+` button that opens a checkbox popover (options = all templates, label = template name, value = `_id`), then removable pills; empty text `No options` | `No options` (empty state, default prop) | `If you wish to include Public Forms on your pages, you must white-list the template IDs for which Public Forms are expected.` | empty list | `allowedPublicTemplates` (array of template ids) | none; server `z.array(z.string()).optional()`. The control is fed `settings.allowedPublicTemplates` from the loader, not the form value | `C.tsx:156-159,390-402`; `Tips:129-132` (csv:1018); `MultiSelect.tsx:99-197`; saveSettingsInput.ts:192 |

**Card Map**

| Label | Control | Placeholder | Help | Default | Stored as | Validation | Cite |
|---|---|---|---|---|---|---|---|
| `Map Provider` | native select, id `roles` (duplicate id) | none | none | unset; select shows `Mapbox`; runtime falls back to `mapbox` | `tilesProvider` | none; server `z.string().optional()` | `C.tsx:408-416`; `app/react/Map/MapContainer.tsx:27`; saveSettingsInput.ts:221 |
| `Map API key` | text input, id `map-key` | none | `An API key is required to use Mapbox or Google Maps.` | unset | `mapApiKey` | Client: `pattern: /^[a-zA-Z0-9._]+$/` with no message and no `hasErrors` binding, so a bad key blocks Save with only focus moving (empty value passes: react-hook-form skips `pattern` on empty, unverified). Server: `z.string().regex(/^[a-zA-Z0-9._]*$/)`, zod default message | `C.tsx:419-423`; `Tips:151-155` (csv:711); saveSettingsInput.ts:199-202 |
| `Map Layers` | multi-select card (same control as above), `canBeEmpty={false}` | `No options` | `Here you can configure the map layers that will be available in the maps.` (csv:713 stores the literal `Map layers description` as the value; unverified which shows) | selected: stored layers, else `Streets`. Fresh install stores `Streets`, `Hybrid`, `Satellite` | `mapLayers` (array of option values) | Client: emptying sets error `Map layers cannot be empty` (hard-coded, not in csv, never rendered as text; only `hasErrors` tint). The control disables the last checked box and the last pill's remove button, so this path is unreachable from the UI. Server: `z.array(z.string()).min(1)` | `C.tsx:161-175,426-445`; `Tips:135-139`; `MultiSelect.tsx:144-147,166`; saveSettingsInput.ts:203; blank state `settings.bson` |
| (no label; `Latitude`, `Longitude` inputs under a 370px map) | map click places a marker; two `type="number"` inputs (`step="any"`, min/max set), each with an X clear button (sr-only `Clear`), both clear the whole point | none | none (`Tips.mapAxis` `Set the default starting point for your geolocation properties.` exists but is not rendered) | server returns `[{ lon: 6, lat: 46 }]` when none is stored | `mapStartingPoint`: `[{ lat, lon }]` or `[]` | Client: lat clamped to -90..90, lon to -180..180, no message; `setValue` runs only if `lat && lon` is truthy, otherwise stores `[]`. Server: array of `{label?, lat: number, lon: number}` | `C.tsx:447-459`; `app/react/V2/Components/Forms/Geolocation.tsx:54-135`; `app/shared/geolocationCoordinates.ts:1-4,25-36`; `app/api/core/application/settings/settingsDefaults.ts:4-12`; saveSettingsInput.ts:212-220 |

Tooltip copy (verbatim from code; line breaks as in source; `Tips` line numbers):

- **Tip:landing** (`Tips:5-18`, csv:649): `The landing page is the first page that visitors see when they come to your collection. The default landing page is your collection's library. You can set a different landing page by adding its relative URL here.` / `For example:` / blank line / `A page: */page/dicxg0oagy3xgr7ixef80k9*` / `A filtered view in Uwazi: */library/?searchTerm=test*` / `An entity: */entity/9htbkgpkyy7j5rk9*` / `A document: */entity/4y9i99fadjp833di*` / blank line / `Important: You must use relative URLs. These start with a forward slash and do not include the domain name. For example: In the address *https://yoursite.com/landingpage*, the relative URL is /landingpage`. csv differs on the document line: `A document: */document/4y9i99fadjp833di*` (csv:654); `/document/...` would not pass the runtime route check.
- **Tip:favicon** (`Tips:20-28`, csv:503): `A favicon is a small icon that represents your collection in browser tabs and bookmarks. The default favicon is the Uwazi logo. To use your own:` / blank / `1. Upload your icon in Custom Uploads if needed.` / `2. Open the favicon picker and pick a file (images from Custom Uploads only).` / `3. Reload the page to see your favicon in action.` csv step 2 reads `Click "Select favicon image" and pick a file (images from Custom Uploads only).`
- **Tip:filterUnauthorized** (`Tips:189-195`, csv:523): `By default, relationships pointing to restricted entities are visible to anonymous users but not linked. When enabled, these relationships are completely hidden, preventing public users from knowing restricted content exists.`
- **Tip:globalJS** (`Tips:172-187`, csv:1524): `With great power comes great responsibility!` / blank / `This area allows you to append custom Javascript to the page. This opens up a new universe of possibilities.` / `It could also very easily break the app. Only write code here if you know exactly what you are doing.`
- **Tip:characterSupport** (`Tips:82-108`, csv:190-194): paragraph 1 `This option enhances support for non-Latin languages as the default languages of your collection. Selecting this option will update all template properties automatically. The process could take several minutes. Selecting this option will likely change the URLs of library filters. As a consequence, if you have menus or links using such URLs, they will probably stop working. You will need to update them manually. After selecting this option, you will not be able to revert back to using legacy property naming. If you are not facing issues with your template property names, we recommend leaving this unchecked.` (the code source has the same sentences, differing only in line wrapping); line break; bold `This process could take several minutes and will likely change URLs to library filters. If you have menus or links using such URLs, they will probably stop working after the update. You will need to update them manually.` (csv:193, shown bold via `<b>`); line break; `After selecting this option, you will not be able to revert back to using legacy property naming. If you are not facing issues with your template property names, we recommend leaving this unchecked.` (csv:194).
- **Tip:captcha** (`Tips:141-149`, csv:179): `By toggling this on you can allow users to submit to your whitelisted templates without having to fill a CAPTCHA. The form will still present the captcha to end users, but API end-point will allow submissions without CAPTCHA validation if a header "Bypass-Captcha: true" is sent along. This option is insecure and can be leveraged to flood your instance with spam or malicious content.` (csv wording; the code source has stray backticks and `&ldquo;` entities around the header name, which is a cosmetic bug).
- **Tip:ocr** (`Tips:157-170`, csv:880-881): `This will enable the Optical Character Recognition (OCR) functionality for PDF documents. This service will recognize text inside images, such as scanned documents and photos, and convert it into machine-readable text data.` / line break / `When activated, this will enable administrator and editor users to send PDF documents to the OCR service.`

Unused tooltip exports in `Tips`: `customSiteLogo`, `mapAxis`, `emails[0]` (`Here you can set up the contact email and the email that appears when Uwazi sends a notification to a user`), `publicForm[0]` (`Here you can configure the public form destination and the whitelisted templates`) (`Tips:30-37,69-74,117-133`).

#### 3. Select option lists

Default View (`C.tsx:227-231`, csv:183,708,1263), label then value:
1. `Cards` (`cards`)
2. `Map` (`map`)
3. `Table` (`table`)

Default date format (`C.tsx:51-87`). Built from today's date; label is `<date> (<Y>/<M>/<D> words)`, where `Year`, `Month`, `Day` are translated (csv:1529,760,354). Example for 2026-10-04:
1. `yyyy/MM/dd`: `2026/10/04 (Year/Month/Day)`
2. `dd/MM/yyyy`: `04/10/2026 (Day/Month/Year)`
3. `MM/dd/yyyy`: `10/04/2026 (Month/Day/Year)`
4. `yyyy-MM-dd`: `2026-10-04 (Year-Month-Day)`
5. `dd-MM-yyyy`: `04-10-2026 (Day-Month-Year)`
6. `MM-dd-yyyy`: `10-04-2026 (Month-Day-Year)`

The stored value is the pattern in the first column; month and day are zero-padded in the labels.

Map Provider (`C.tsx:411-414`, csv:716,558): `Mapbox` (`mapbox`), `Google` (`google`).

Map Layers (`C.tsx:161-175`, csv:336,1240,1104,588). Popover order: `Dark` (`Dark`), `Streets` (`Streets`), `Satellite` (`Satellite`), `Hybrid` (`Hybrid`). Selected layers show as pills in selection order; a map with more than one layer gets a layer switcher bottom-right (`app/react/Map/LMapSetup.ts:46-49`). Provider tiles: Mapbox Streets `mapbox/streets-v12`, Satellite `mapbox/satellite-v9`, Hybrid `mapbox/satellite-streets-v12`, Dark `mapbox/dark-v11`; Google `roadmap`, `satellite`, `hybrid` (`app/react/Map/TilesProviderFactory.ts:9-18`). With provider Google the map drops `Dark` at render, but the setting still lets it be selected (`MapContainer.tsx:31-33`).

Whitelisted templates: options are the collection's templates (`label = name`, `value = _id`), no fixed list.

#### 4. Confirm dialogs and modals

Confirm dialogs on this page: none found. The one-way `Non-latin characters support` switch, the `Public instance` toggle and the Global JS toggle commit with no confirmation.

**Favicon picker modal** (flag off; `Th/CustomUploadImagePickerModal.tsx:39-110`). Opens from the `Choose` / `Change` button. Modal width `xxl` = `max-w-2xl`, min 36rem from `sm` (`app/react/V2/Components/UI/Modal.tsx:32`).
- Title: `Select favicon image` (csv:1151). Close button: icon X with `aria-label="Close modal"` (`Modal.tsx:108`).
- Picker row behind the modal: empty value shows one secondary button with an upload icon and `Choose`; a set value shows the preview tile, an amber/red warning icon button when the current image breaks the size rule (tooltip = the feedback message), the button `Change` and a danger-secondary button `Clear` (clears the value in the form only) (`Th/CustomUploadImagePicker.tsx:59-113`; csv:202,186,207). Button labels are sr-only below `sm`.
- Body, in order:
  1. Dropzone box (single file; accepts `.avif .bmp .gif .ico .jpg .jpeg .png .svg .webp`): cloud icon, bold underlined `Browse files to upload`, then `or drop your files here.` (csv:165,912) (`CustomUploadImagePickerModal.tsx:10-12`; `app/react/V2/Components/Forms/FileDropzone.tsx:78-93`). Dropped files show as chips `<name> - <size>` with an X (sr-only `Delete`); a total line `Size: <n>` (csv:1215) (`FileDropzone.tsx:95-122`).
  2. Progress line while uploading: `Uploading {filename} {progress}%` (csv:1459) (`CustomUploadImagePickerModal.tsx:72-79`).
  3. Feedback paragraph (red for error, amber for warning): `Image doesn't match the required size. Actual: {W}x{H} px. Expected: square 16x16 to 512x512 px` (csv:597; `Th/customUploadImagePickerLib.ts:55-67`). `Actual:` and `Expected:` are literals, not translated.
  4. Gallery (`Th/GallerySection.tsx:8-88`): heading `Select an existing image` (csv:1150) then a grid (1/2/3/4 columns from phone to `lg`) of thumbnail buttons on a checkerboard, each captioned `originalname` or `filename`; the image matching the current value has a primary-colour ring. Only images that already pass the size rule are listed; the check loads every image to read its size.
     - Empty gallery (no image files in Custom Uploads): hint key `Favicon no images hint`. Its csv value is the same text, so the screen shows `Favicon no images hint` (csv:508; a bug).
     - While sizes are checked: `Checking which images fit the requirements` (csv:201 adds `...`).
     - None fit: `No uploaded images fit the requirements` (csv:855 has the longer `No uploaded images match these size requirements. Upload a new image or use an editor to resize an existing file.`).
- Footer: one `Cancel` button (secondary) (csv:171).
- Behavior: picking a thumbnail validates its size; an `error` keeps the modal open and shows the message; otherwise the form value is set and the modal closes (`Th/useCustomUploadImagePickerLogic.tsx:52-64`). Dropping a file validates its size first and uploads only files that pass, immediately and independent of Save, to `POST /api/files/upload/custom` (admin only), then notifies, refreshes the loader data, re-validates and selects the file and closes (`useCustomUploadImagePickerLogic.tsx:117-157`; `app/api/customUploads/infrastructure/http/routes.ts:9-17`). Notifications: success `Uploaded custom file` (csv:1456), error `An error occurred` (csv:116), both through the notification bridge (`useCustomUploadImagePickerLogic.tsx:100-115`). The uploaded file stays uploaded if the form is never saved.

**Theme panel** (flag `themeCustomization` on only; deferred, summary). Env flag `FEATURE_FLAG_THEME_CUSTOMIZATION` (`app/api/config.ts:203`), exposed to the client as `themeCustomization` (`app/api/core/application/settings/publicSettings.ts:63-66`).
- Card in General: title `Theme and branding`, preset chip (`Uwazi Design`, `Legacy Uwazi` or `Custom pair`: `app/react/V2/theme/tokens.ts:377,387,397`), chip `Customized` when any override exists, two accent swatches, button `Edit theme` (`Th/ThemeSelectionCard.tsx:55,79,99`).
- Sidepanel (large, with overlay), title `Theme and branding`, footer button `Done` (primary, only closes; edits live in form state) (`Th/ThemeSettingsSidepanel.tsx:41-46,131-137`).
- Sections in order: `Theme presets` (preset cards); `Live preview` with `Light`/`Dark` switch and an alert `Accessibility checks need attention`; collapsible `Advanced colors` with button `Import theme instance file` (errors `Theme instance file invalid`, success `Theme colors imported`), toggle buttons `Simple mode` / `Full mode`, a `Chrome header` group, `Reset` per group (`app/react/V2/Components/ThemeSelector/ThemePresetSection.tsx:81`, `ThemePreviewSection.tsx:79,99`, `ThemeColorsSection.tsx:78,99,114,122`, `ThemeSelector.tsx:137,142,153`); then `Theme logotype` with pickers `Light Theme` and `Dark Theme` (modal title `Select site logo image`, caption `Recommended: 48x16 to 800x256 px`, soft rule: out-of-range is a warning, not blocked), and `Theme favicon` with the same two pickers (modal title `Select favicon image`, strict rule) (`ThemeSettingsSidepanel.tsx:22-25,64-125`).

#### 5. Empty / loading / error states

- Loading: none on the page. Data arrives through the router loader; the global request indicator is the only feedback. A failed templates request throws to the route error boundary (`C.tsx:41`). A failed settings request is not handled: `const [raw] = await SettingsAPI.get(headers)` then destructures `raw`, which would throw on `undefined` (`C.tsx:34-36`, `app/react/V2/api/settings/index.ts:10-20`).
- Empty states: no copy for the page. Whitelisted templates / Map Layers with no selection show `No options` in muted text (`MultiSelect.tsx:192`). Services card absent without an OCR URL (`C.tsx:335`). Favicon gallery empty: see section 4.
- Field error styling (`InputField.tsx:60-62`, `Label.tsx:42`, `Select.tsx:42-60`, `MultiSelect.tsx:69-77`): red border (`border-emphasis`), `bg-seal-tint`, `text-seal`, label turns `text-seal`. No error message text is rendered anywhere on this page (`errorMessage` is never passed).
  - `Collection Name` empty: red styling, submit blocked, focus on the field.
  - `Map API key`: no styling (no `hasErrors`), submit blocked, only focus moves.
  - `Map Layers`: tint only, and unreachable (section 2).
  - Server errors: only the notification below.
- Save error notification: type `error`, title `An error occurred`, details `error.message`; for a rejected body this is `Request failed with status code 422: ` plus the server's inspected zod error text (`C.tsx:133-139`; `app/shared/JSONRequest.js:150-157`; `app/api/utils/handleError.js:122-126`). Unknown keys fail the whole request (schema is `.strict()`, `saveSettingsInput.ts:222`).
- Success notification: type `success`, title `Settings updated` (code, `C.tsx:142`); csv value is `Settings updated.` with a period (csv:1187). The notification goes to the Beacon flash (title only, truncated to a 10rem width) and the notifications panel (`app/react/V2/Components/UI/Notifications/NotificationFlash.tsx:50-57`).

#### 6. Save

Order of events on `Save` (`C.tsx:119-145`):
1. `handleSubmit` runs client validation (`required` on `site_name`, `pattern` on `mapApiKey`). On failure nothing is sent, nothing is announced, focus goes to the first invalid field (`C.tsx:116,193,422`).
2. Payload = shallow copy of every form value. The form's values are the loader settings minus `links` and `custom`; that includes `_id`, `__v`, `languages`, `filters`, `features`, `customCSS`, `customJS`, `mailerConfig`, `themeVars`, `themeAssets` (`C.tsx:96,110-117`; admin projection `publicSettings.ts:5-46`).
3. If `newNameGeneration` is falsy the key is deleted (server accepts only `true`) (`C.tsx:121-123`).
4. If `themeCustomization`: copy `themeAssets.siteLogo.light` to `site_logo` and `themeAssets.favicon.light` to `favicon`, only when non-empty (`C.tsx:124-129`).
5. Invert `private`: `payload.private = !payload.private` (`C.tsx:130`). The form was seeded inverted at render (`C.tsx:101`).
6. Remove the `themeCustomization` flag (`C.tsx:131`).
7. `POST /api/settings` through `SettingsAPI.save` (`app/react/V2/api/settings/index.ts:22-33`, `app/react/Settings/SettingsAPI.ts:6-8`).
8. Server (`app/api/core/infrastructure/express/settings/routes.ts:10`, `SaveSettingsController.ts:6-13`, `app/api/core/application/SaveSettings.ts:19-34`, `SettingsService.ts:29-37`, `app/api/core/domain/settings/Settings.ts:137-143`):
   - `needsAuthorization()` (admin session).
   - zod strict parse (`saveSettingsInput.ts:153-242`), 422 on failure.
   - In one transaction: reconcile menu-link and filter translations, `Object.assign` every posted key (except `_id`, `__v`) onto the stored settings, persist.
   - Emit `SettingsChangedEvent` with the changed top-level keys (`app/api/core/domain/settings/SettingsDiff.ts:17-26`). Listener `BroadcastSettingsChanged` runs as a queued privileged job and emits socket event `updateSettings` with the public projection to every connected session of the tenant (`app/api/core/infrastructure/listeners/BroadcastSettingsChanged.ts:17-28`).
   - After the transaction, when `newNameGeneration` just went from falsy to true and a default language exists: `TemplateFacade.applyNewNameGeneration(defaultLanguage)` updates every template one by one with `reindex: false`. It runs inside the request, awaited before the response, not as a queued job (`SaveSettings.ts:28-33`; `app/api/core/infrastructure/facades/TemplateFacade.ts:110-116`).
   - Activity log entry `Updated settings` (`app/api/activitylog/activitylogParser.ts:20`).
   - Response: fresh settings (admin projection for an admin actor) (`SettingsQueryService.ts:27-29`).
9. Client, success: merge the response into `settingsAtom` (`mergeClientSettings`; drops CSS/JS from the atom, `app/react/V2/atoms/mergeClientSettings.ts:4-16`), notify `success` / `Settings updated`.
10. Client, error: notify `error` / `An error occurred` + details.
11. Both paths: `revalidator.revalidate()` re-runs the loader (`C.tsx:144`). Form defaults are not reset, so text fields keep what was typed, the multi-selects re-read the loader value, and `Save` stays enabled.
12. Other open sessions receive `updateSettings` and merge it into their atom (`app/react/App/sockets.js:82-85`). The navbar title, nav label for Global CSS & JS and the Library default view update without reload; the favicon needs a reload (tooltip says so).

#### 7. Dirty guard

None on this page. No `useBlocker` / `BlockDirtyNavigation`; leaving with unsaved edits loses them silently (`C.tsx` imports at lines 1-27). The "Global CSS & JS" page has one (see below).

#### 8. Propagation

- `site_name`: browser title suffix `%s • {siteName}` and the navbar logo link text (`app/react/App/SiteName.tsx:80,103`); 2FA label (`app/api/core/application/GenerateTwoFactorSecret.ts:22`); welcome email (`SendWelcomeEmail.ts:36`); contact mail sender data (`SettingsDataSource.ts:5`).
- `favicon`: `<link rel="icon">` in the page head (`SiteName.tsx:82-89`, `app/react/App/Root.jsx:58-97`). The logo (`site_logo`) shows only when the theme flag is on (`SiteName.tsx:70`).
- Landing page and default view at `/`: `getIndexDescriptor` picks page, entity, library with query, redirect, or the library default; an invalid or empty `home_page` falls back to the library (`app/react/getIndexElement.tsx:36-91`; `app/react/Routes.tsx:137-167`). `defaultLibraryView` (`table`, `map`, else cards) decides the library mode at `/`, plus the footer/menu library link (`app/react/App/Menu.tsx:83`, `app/react/App/Footer.jsx:44`, `app/react/V2/Components/UI/Header/Header.tsx:81`).
- `dateFormat`: date inputs in entity forms and library date filters (`app/react/Metadata/components/MetadataFormFields.jsx:231-243`, `app/react/Library/components/FiltersFromProperties.jsx:194`); CSV import and export (`app/api/csv.v2/application/jobs/CsvImportEntitiesContextLoader.ts:69`, `app/api/csv/typeFormatters.ts:41`).
- `private` (true = private): anonymous requests redirect to `/login`, and `/api/`, `/files/`, `/assets/`, `/uploaded_documents/` return 401 (`app/api/core/infrastructure/express/middlewares/PrivateInstanceMiddleware.ts:15-36`); `/` shows the login form (`Routes.tsx:138`); library nav link hidden for anonymous users (`Header.tsx:86`); SSR omits templates, thesauri and relationships for anonymous users (`app/react/entry-server.tsx:196-198`); route guard `privateRoute` (`app/react/ProtectedRoute.tsx:30-31`); dataviz embeds need `embedPublic` (`app/shared/embed/canUseExternalEmbed.ts:7`).
- `cookiepolicy`: shows the consent banner with `accepted` / `essential` / `rejected` choices and a footer link `Cookie preferences` (`app/react/App/Cookiepopup.jsx:26-48`, `Footer.jsx:67-77`). Google and Matomo scripts load only when consent is `accepted` (`app/react/App/cookieConsent.ts:38`, `GoogleAnalytics.jsx:17`, `Matomo.tsx:57`). Consent can be set only through the banner, so with the policy off analytics never load (verified by reading all `setConsent` callers).
- Analytics: gtag script and config for `analyticsTrackingId` (`GoogleAnalytics.jsx:17-38`); Matomo tracker from `matomoConfig` JSON `{id, url}`, combined with a tenant-level Matomo when present (`Matomo.tsx:48-90`).
- Map: provider, key, layers and starting point feed every map: library map, entity geolocation fields and this page's picker (`app/react/Map/MapContainer.tsx:26-33`, `TilesProviderFactory.ts:9-18`).
- `allowcustomJS`: nav label `Global CSS & JS` vs `Global CSS` (`app/react/V2/Routes/Settings/SettingsNavigation.tsx:111-120`), JS tab on the customisation page, `customJS` injected in `<head>` for every page (`Root.jsx:160-164`).
- `filterUnauthorizedRelated`: entity queries drop relationships to restricted entities for public users (`app/api/core/application/EntitiesQueryService.ts:180`).
- `ocrServiceEnabled`: OCR button in the viewer and server-side OCR gating (`app/react/Viewer/components/OCRStatus.tsx:22`, `app/api/services/ocr/OcrManager.ts:44`).
- `openPublicEndpoint`: public form API accepts header `Bypass-Captcha: true` (`app/api/auth/publicAPIMiddleware.ts:6-9`). `allowedPublicTemplates` and `publicFormDestination`: public submission whitelist and proxy target (`app/api/files/jsRoutes.js:52-61,92-94`). `contactEmail`, `senderEmail`: contact form and outgoing mail (`SettingsDataSource.ts:5`).

#### 9. Improvements to layer on

UX numbers are the "Improvements beyond 1:1 parity" list in `settings-ux-audit.md`; "Pattern 2" is its Form page rule; gap-matrix rows are in `gap-matrix.md` (Collection section, lines 229-257).

- Form page shell: form column capped near 40rem, sections as h3 + one-line description + fields; single column on phones. Pattern 2 and UX12; gap-matrix:255.
- One Save in the footer with a ghost `Discard changes` plus the commit, enabled only when dirty, reset after save. Pattern 2; gap-matrix:252.
- Dirty guard on rail and navbar clicks. Pattern 2, audit Summary 1; gap-matrix:252.
- Show the field messages Uwazi omits: required name, bad map key, empty layers, invalid landing page. gap-matrix:235,240,250,253.
- Landing page validation with the same route pattern the runtime uses, and a helper line listing the accepted forms. gap-matrix:240.
- Email-format check on `Sending email` and `Contact form email`. gap-matrix:248.
- Confirm dialog before `Non-latin characters support` with the impact stated (count of templates and properties that will be renamed); keep a read-only enabled status row instead of removing the control. UX4, audit Summary 3; gap-matrix:245.
- Last-saved line in the footer ("Saved 2 min ago by admin"). UX11.
- Tooltip copy becomes keyboard-reachable description text under the field (`SettingsField` description). gap-matrix:254.
- Rail group "Collection" holds this page. UX10; gap-matrix:951.
- Show loading rows or a skeleton while the corpus loads, not empty selects. Audit Summary 8; gap-matrix:229.
- Commit button follows the bar ladder (ink commit, ghost secondary). Audit Summary 6.
- Map starting point accepts 0 and shows a marker on the picker. gap-matrix:251.
- Image upload inside the picker writes immediately through the Uploads store (kept 1:1). gap-matrix:256.

#### 10. Uwazi defects NOT to copy

- Inverted `private`: the form flips the loader copy on render and flips back on submit (`C.tsx:101,130`). Store a positive `public` boolean (or keep one key and convert only at the field boundary), never mutate loader data. Fresh installs are `private: true`, so the toggle starts off.
- Lat/lon 0 treated as unset: `if (lat && lon)` (`C.tsx:451`) stores `[]` for latitude 0 or longitude 0, and clearing either input clears both. Test with `Number.isFinite` on both; keep a half-filled pair in local state and block only on save.
- One-way `Non-latin characters support` switch with no confirm: disappears after enabling, no way back, the only warning is a tooltip (`C.tsx:292-304`). Confirm first; show the enabled state afterwards.
- Whole-document POST: sends `languages`, `filters`, `features`, `customCSS`, `customJS`, `mailerConfig` with every save (`C.tsx:96,119-132`). A concurrent edit of CSS/JS from another session is overwritten. Send only changed keys.
- Silent errors: `site_name` required, `mapApiKey` pattern and `mapLayers` empty render no message; pattern failure has no styling at all (`C.tsx:193,422,435-437`). Render a message under each field and move focus.
- `mapLayers` empty error is unreachable because the last checkbox is disabled (`MultiSelect.tsx:144-147`); the message is hard-coded English, not in csv.
- Server accepts an empty `site_name` (`saveSettingsInput.ts:158`); the guard exists only in the client. Validate in the store too.
- Duplicate DOM id `roles` on `Default View` and `Map Provider` (`C.tsx:226,410`); use unique ids.
- Multi-selects read the loader value, not form state (`C.tsx:400,431`), and the fallback `['Streets']` is a new array every render, which can reset the control (unverified runtime effect). Bind both to form state.
- Theme flag on: clearing the light logo or favicon does not clear `site_logo` / `favicon`, because the copy runs only when non-empty (`C.tsx:125-128`).
- Analytics silently do nothing when `Show cookie policy` is off (see Propagation). Show a note on the Analytics card, or load analytics without the banner when the policy is off.
- Matomo field requires JSON with no format hint (`Matomo.tsx:54-58`); add a format hint and validate.
- `Favicon no images hint` is shown as the raw key (csv:508); write real copy.
- `Settings updated` (code) vs `Settings updated.` (csv): pick one. `Map layers description` csv value is the key itself (csv:713).
- `Dark` stays selectable under provider Google although it is dropped at render (`MapContainer.tsx:31-33`); disable it or note it.
- Invalid landing page is accepted and silently falls back to the library; the document example in the csv tooltip (`/document/...`) does not match the runtime check.
- Save stays enabled and nothing resets after save (`C.tsx:144`); no Discard.

### Global CSS & JS

Route `/settings/customisation` (`app/react/Routes.tsx:487-491`; page `app/react/V2/Routes/Settings/Customization/Customization.tsx`, `Cu.tsx` below). Admin only; nav label is `Global CSS & JS` when `allowcustomJS` is on, else `Global CSS` (`SettingsNavigation.tsx:111-120`, csv:555-556).

- Header title: `Global CSS & JS` when `allowcustomJS`, else `Global CSS` (`Cu.tsx:59`).
- Loader: settings, picks `allowcustomJS`, `customCSS`, `customJS`; on failure returns `{}` (`Cu.tsx:14-23`).
- Layout, flag on: tabs (group id `settings-customization`, both editors stay mounted, tab list `md:w-2/3 w-full`): `Custom CSS` (css editor), `Custom JS` (javascript editor) (`Cu.tsx:63-93`; csv:328,330). Flag off: no tabs; label `Custom CSS` (`font-medium`) above one CSS editor filling the height (`Cu.tsx:94-109`).
- Editor: Monaco, 2-space tabs, monospace font, `dir="ltr"`, bordered box; prefilled with the stored text; no toolbar, no validation, no help text (`app/react/V2/Components/CodeEditor/CodeEditorComponent.tsx:62-83,158`). While the editor chunk loads: `Loading ...` (`CodeEditor.tsx:12-17`, csv:691). If Monaco fails to start the area renders as an empty `div` (`CodeEditorComponent.tsx:140-142`).
- Warning text: none found on this page. The only warning about custom JS is the `Global JS` tooltip on the Collection page (Tip:globalJS above).
- Footer: right-aligned `Save`, `success` (green) variant, disabled until any edit (`Cu.tsx:113-117`). It sends `{ customCSS, customJS }` through `POST /api/settings`; an untouched editor sends `undefined`, which JSON drops, so only edited slices change (`Cu.tsx:40-45`).
- Dirty flag: set by any content change in either editor, cleared only on successful save (`Cu.tsx:30,73-77,86-90,52`). No reset-to-saved control exists.
- Notifications: success title `Saved successfully.` (code `Cu.tsx:50`, csv:1112); error title `An error occurred` with details `error.message` (`Cu.tsx:48`, csv:116). No loader revalidation after save; the atom is not updated (CSS/JS are applied through the server-rendered `<head>`, so a reload is needed to see the effect).
- Dirty guard: yes. `useBlocker(hasChanges)` opens a modal when a navigation is blocked (`Cu.tsx:31-38,120-122`). `ConfirmNavigationModal`, size `md` (`app/react/V2/Components/UI/ConfirmNavigationModal.tsx:15-38`): title `Discard changes?`; body `You have unsaved changes. Do you want to continue?`; footer: ghost `Cancel` (closes the modal, stays on the page, grows to half width) and primary `Discard changes` (proceeds with the navigation); the header X also cancels. csv:396-397,1537,171.
- Applied where: CSS in a `<style>` in the head of every page, JS in a `<script>` only when `allowcustomJS` is true (`app/react/App/Root.jsx:145-166`). CSS/JS are readable by anyone through the public settings payload (`publicSettings.ts:30-33`).
- Defects not to copy: the activity log stores the whole body, so full CSS and JS text (gap-matrix:388); save leaves the loader stale; each render re-registers a content listener because `onMount` is an inline function (`Cu.tsx:72,85`) (unverified effect); no error path when Monaco fails.
- Prototype rows: gap-matrix:374-392 (Global CSS & JS section), audit "Global CSS & JS" findings (gutter, Reset without confirm, Save stays enabled, no Discard), Pattern 2.
