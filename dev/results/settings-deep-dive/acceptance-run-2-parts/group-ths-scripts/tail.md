## FAILs ranked by severity, with likely owner

Owner key: Code = behaviour or data; Design = layout, copy or accessibility. Counts are check rows (a row can sit in two groups).

### High

1. Thesauri do not survive a tab reload: a created thesaurus, a saved value, a saved order all come back as the seed. THS-09, THS-15, THS-40, X-01 (Thesauri). Relationship types and Filters do persist. Owner: Code.
2. Thesaurus value changes do not reach entities, and removal of a used value has no confirm. Removing "Decided" or renaming it to "Resolved" and saving leaves Case 10.488 showing "Decided"; the Beacon says only "Thesauri updated." with no entity count; removal of a used value is immediate and only afterwards says "5 entities hold this value". THS-21, THS-23, THS-24, X-05 (Thesauri). Owner: Code.
3. Dev panel "Fail next request" is not wired to these pages. THS-37 (Save, Delete and Import all succeed), FLT-12 (failure half), and X-04 on all three pages. Owner: Code (SD-1).
4. Phone dialogs are invisible while `--kb` is stuck at 1189px (see the header). THS-38 and X-06 (Thesauri delete dialog), REL-22 and X-06 (Relationship types delete dialog). Owner: Code (`useKeyboardInset` reads `innerHeight` once at mount). Confirm on a device before treating it as release-blocking.
5. Thesauri list does not have the page the checklist describes: columns are "Thesaurus", "Items", actions; no Templates column or pills, no header sorting, no row selection or footer "Selected n of m". THS-01, THS-02, THS-27, X-12 (Thesauri). Owner: Code (Templates pills need the template usage), Design (header and selection bar).
6. Library facet ignores saved Filters groups on the Sample, and a new template appears in the Library at once. FLT-17 (Sample keeps a fixed "Documents" card; CEJIL honours groups), FLT-03 (new template defaults to shown), FLT-18 (with nothing ticked the facet keeps the saved order, not name order). Owner: Code.
7. Filters group handling: an empty group is dropped on Save with no word (FLT-13); deleting the only template of a group leaves an empty group on Filters (FLT-19). Owner: Code.

### Medium

8. Filters page is built around "New group" chips, not the checklist's "Add group" dialog and group rows: banner and intro copy mention "entity types" and "Types" (FLT-01), "New group" is in the body (FLT-04), no name validation (FLT-05), no Edit/Update (FLT-06), no collapse or empty-group text (FLT-10), the remove entry reads "Documents removed" not `Removed group "Documents"` (FLT-11), footer button is "Discard changes" not "Cancel" (FLT-14), no `No templates listed...` message (FLT-20, X-10), count slot not fixed width (FLT-22), phone has no group sheet (FLT-21). Owner: Design for copy and layout; Code for validation (FLT-05).
9. Thesaurus editor validation and copy: spaces-only name and duplicate name show a footer summary, not the inline `This field is required` / `Thesaurus name already exists`, and the placeholder is "e.g. Violation types" (THS-07, THS-08); create gives "Thesauri updated." and returns to the list instead of "Thesauri added." and staying in the editor (THS-09); the duplicate-value message does not name the thesaurus (THS-19); a mixed nested/non-nested CSV row is accepted (THS-32); "Import CSV" is enabled with an empty name (THS-29); delete refusal text differs and adds no error entry (THS-28). Owner: Code (THS-19, THS-29, THS-32), Design (copy).
10. Thesaurus tree behaviour: empty group saves without a message and is not rejected (THS-13); a 55-value group reopens expanded (THS-18); ticking a group does not tick its children and removing the last child keeps the empty group (THS-20). Owner: Code.
11. Relationship types list: no header sorting and the default order is the seed order, so sorting while filtered cannot work (REL-01, REL-14); no row selection, no "Selected n of 12", no multi-type delete dialog (REL-09, REL-12, REL-13, X-12); Beacon is a bare "Updated" for add, rename and delete (REL-05, REL-07); the new row is not highlighted (REL-05, REL-15); add form commit is "Create relationship type", not "Add" (REL-04). Owner: Design (REL-04, REL-05 text), Code (sorting, selection).
12. Relationship types, other: the panel's "Manage types" modal cannot rename (REL-17); its delete confirm reads "Delete & reassign" and does not say the references go to no label (REL-19); Cancel and Escape on the edit form leave without the "Discard changes?" dialog (REL-15). Owner: Code (REL-17), Design (REL-19 text), Design/Code decision (REL-15, THS-36: footer Cancel is deliberately unguarded in `SettingsEditor`; the checklist wants it guarded).
13. Console error `Judgment` duplicate key in the Court Case template editor, which fails THS-26, FLT-23, FLT-24, REL-02, REL-08, REL-16, REL-18. One fix in `TemplateEditor.tsx` `PropertyRow` clears seven rows. Owner: Code (Templates page).

### Low

14. Accessibility and contrast: the enabled green Save button on an existing record is white on #059669, 3.76:1 in light and dark (X-07 on Thesauri and Relationship types); the import dialog's upcoming "Preview" step label is 4.47:1 (X-07 Thesauri); Filters has nine row selects all named "Move to group: No group" (X-07 Filters); after "Move up" puts a row first, focus falls to the page body because the pressed button becomes disabled (THS-16, FLT-08). Owner: Design (colours, names), Code (focus).
15. Touch targets are small on the phone: checkboxes 14x14 px, Move and Delete buttons 26x26 px (THS-38, X-06 Filters note, REL-22). Owner: Design.
16. Footer Cancel is not guarded in the thesaurus editor (THS-36) and the Filters footer says "Discard changes" (FLT-14), see item 12 and item 8.

### Visual findings without a check id (Design)

- Relationship types, phone (X-06-REL-390.png): the "Templates" label prints with no value on rows that have no template; "References" wraps to its own line on "Relates to" while other rows keep it inline, so row heights differ.
- Filters, dark, 1280 (X-08-FLT-dark-1280.png): the hairline under the last row ("Hearing") starts a few pixels inside the table edge, unlike the other rows.
- Filters, phone (FLT-21.png): the Group value and the Move buttons sit at a different x on the first row (two-digit entity count) than on the rows below.
