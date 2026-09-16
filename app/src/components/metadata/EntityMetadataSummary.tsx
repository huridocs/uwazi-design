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
    // A scroll lane: it reaches the panel edge (`bleed`) and puts the record back
    // on the host's gutter, so the cards share the tab selector's edge.
    <div data-component="EntityMetadataSummary" className="bleed h-full overflow-auto body-top pb-8">
      <MetadataRecord profile={profile} language={language} />
    </div>
  );
}
