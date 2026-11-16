
## FAILs ranked by severity

Owner: Code = behaviour or data; Design = layout, copy or accessibility.

1. Code. Property type model: the type select offers 8 types and "Number", not the 16 in the spec (TED-35). Multiple dates, Date range, Multiple date ranges, Multiple select, Link, Preview, Media and Generated ID cannot be added (TED-48, 49, 50, 52, 54, 56, 57, 59). The panel lacks Hide label, Default filter, Priority sorting, Style, Full width, Entities and Inherit property, and shows "Use as filter" for Image and Geolocation (TED-41, 42, 44 to 47, 51, 53, 55, 58, 94). The type is editable on a saved property (TED-36).
2. Code. Common rows and property table model: Title, Date added and Date modified rows with lock icons do not exist (TED-08, 09, 10, 13); the table has Required/Filter/Cards checkboxes instead of Options pills (TED-15, 16, 17); no row selection or Remove bar (TED-24, X-12 in TED); no Move up/down buttons (TED-21); no property search (TED-20).
3. Code. Validation: no duplicate template name check (TED-02); no duplicate property label check, including "Title", "Date added", "Date modified" (TED-38, 40); no required-thesaurus or relationship-type error; the Thesaurus select is preselected and uses a static seed list, not the live thesauri (TED-90, 91, 93).
4. Code. Same-label compatibility table and strict type rule are absent (TED-85, 86, 87, 88, 89).
5. Code. Persistence and audit trail: Templates edits are lost after navigating to another rail item or reloading (TPL X-01, TED X-01); no Activity log entry for Save, create or delete (TPL X-09, TED X-09); Beacon text differs from the spec, "<name> saved" and "<name> deleted" (TPL X-04, TED X-04).
6. Code. Templates list: no sortable headers, a Properties column the spec does not have, no "Set as default" star column, no row checkboxes, select-all or "Selected n of N" footer (TPL-01, 03, 09, 14, 15, 16, 21, 22, TPL X-12); Entities of 1000 or more print "1,084", not k (TPL-07).
7. Code. Data-source scope: Artworks and Travesia show the Sample's templates (TPL-27, TPL X-13, TED X-13).
8. Code. Add template defaults: new templates always start on the first palette colour (TED-05); new editor lists Title, Date, Description instead of the three common rows (TPL-13).
9. Design. Card preview title overlaps the first field label at desktop and phone, light and dark (TED-18); hover or focus on a row does not highlight its preview line (TED-19).
10. Design. Colour control: swatches inline with a native colour input, no "Template color" picker button and no hex field (TED-03, 04).
11. Design. Default badge is carbon blue and has 2.08:1 contrast in light mode (TPL-05, TPL X-08, TPL X-07 axe color-contrast serious); empty header cell and duplicate banner landmark axe findings (moderate/minor).
12. Design. Copy and accessible names: "Template name is required." has a trailing period (TED-01); "Label is required." instead of "This field is required" (TED-37); Close X name "Close new property" instead of "Close", edit commit is green not ink (TED-31); Label placeholder "e.g. Date filed" instead of the type label (TED-39); search miss reads "Nothing matches" not "No templates" wording (TPL-24); name placeholder "e.g. Court Case" (TPL-13); discard guard reads "Discard unsaved changes?" with "Keep editing" / "Discard" (TED X-02, TED-109).
13. Design. Backdrop click closes the property panel silently after typing (TED-32); Cancel on the editor discards without the guard (TED-103); no tooltips on the property checkboxes (TED-41).
14. Design. Phone: property rows show labelled checkboxes rather than flag icons, no lock icons (TED-108); phone Templates list lacks star and selection controls (TPL-26, TPL X-06); no Add thesaurus / Add relationship type reachable (TED-30, 98, 99, 109).
