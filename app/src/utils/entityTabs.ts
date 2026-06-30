import { t } from "./i18n";
import { typeHasDocument } from "../data/entityProfiles";

export interface EntityTab {
  id: string;
  label: string;
  count?: number;
}

/** Tabs for a given entity. Document-bearing entities lead with a Document tab;
 *  people / rights / orgs / etc. skip it. Pass the entity-level `hasDocument`
 *  (from the profile) so the tab list matches the actual entity — the type-level
 *  `typeHasDocument` heuristic misses CEJIL entities, whose document-bearing is
 *  resolved per entity. Falls back to the type heuristic when not given. */
export function tabsForType(typeId: string, hasDocument?: boolean): EntityTab[] {
  const base: EntityTab[] = [
    { id: "metadata", label: t("System", "Metadata") },
    { id: "relationships", label: t("System", "Relationships"), count: 0 },
    { id: "files", label: t("System", "Files"), count: 0 },
  ];
  const showDocument = hasDocument ?? typeHasDocument(typeId);
  return showDocument
    ? [{ id: "document", label: t("System", "Document") }, ...base]
    : base;
}
