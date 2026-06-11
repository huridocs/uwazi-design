import { t } from "./i18n";
import { typeHasDocument } from "../data/entityProfiles";

export interface EntityTab {
  id: string;
  label: string;
  count?: number;
}

/** Tabs for a given entity type. Document-bearing types lead with a Document
 *  tab; people / rights / orgs / etc. skip it. */
export function tabsForType(typeId: string): EntityTab[] {
  const base: EntityTab[] = [
    { id: "metadata", label: t("System", "Metadata") },
    { id: "relationships", label: t("System", "Relationships"), count: 0 },
    { id: "files", label: t("System", "Files"), count: 0 },
  ];
  return typeHasDocument(typeId)
    ? [{ id: "document", label: t("System", "Document") }, ...base]
    : base;
}
