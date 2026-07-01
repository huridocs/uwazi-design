import { useAtomValue } from "jotai";
import { focusedEntityIdAtom } from "../../atoms/focusedEntity";
import { EntityMetadataSummary } from "../metadata/EntityMetadataSummary";

/** The entity-view drawer's Metadata tab. Delegates to the shared
 *  {@link EntityMetadataSummary} bound to the focused entity, so it shows the SAME
 *  metadata as the main Metadata view and the library preview drawer — not the
 *  old hardcoded mock fields, which ignored the focused entity entirely. */
export function MetadataDrawerContent() {
  const focusedId = useAtomValue(focusedEntityIdAtom);
  return <EntityMetadataSummary entityId={focusedId} />;
}
