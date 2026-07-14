import { useAtomValue } from "jotai";
import { languageAtom } from "../../atoms/language";
import { getEntityProfile } from "../../data/entityProfiles";
import { MetadataRecord } from "./MetadataRecord";

/** The metadata body for every drawer/preview context (library preview drawer,
 *  entity-view metadata drawer). It is the SAME record the main Metadata view
 *  renders — same component, same profile — so the two surfaces are one view at
 *  two widths and cannot drift apart. */
export function EntityMetadataSummary({ entityId }: { entityId: string }) {
  const language = useAtomValue(languageAtom);
  const profile = getEntityProfile(entityId);

  return (
    <div className="h-full overflow-auto p-4">
      <MetadataRecord profile={profile} language={language} />
    </div>
  );
}
