/* The Sample seed's relationship fields and its inheritance graph (v4 §A.2).
 *
 * `sampleSeedV4.ts` is the data; this is where it meets the metadata model:
 * the fields each template owns (Victims, Signed by, Nationality, …), the derived
 * "Judges" / "Judges' nationality" pair on Court case, and the ChainGraph the
 * inheritance resolver walks for the second one. */
import type { Language } from "../atoms/language";
import type { RelationshipMetadataField } from "./metadata";
import type { ChainGraph, GraphEdge, ProvenanceStep } from "../utils/chainTraversal";
import { registerInheritanceGraph } from "../utils/inheritance";
import { references } from "./references";
import { getEntity } from "./entities";
import { getEntityProp } from "./entityMetadata";
import { V4_DERIVED, V4_FIELDS, hubMembers } from "./sampleSeedV4";

/* ── The Sample graph ───────────────────────────────────────────────────── */

let sampleGraph: ChainGraph | null = null;

/** Every Sample reference as a graph edge, both ways. Built from the SEED
 *  (like CEJIL's, which reads its export): a derived projection is a property of
 *  the corpus, not of this session's edits. */
function buildSampleGraph(): ChainGraph {
  const byEntity = new Map<string, GraphEdge[]>();
  const add = (id: string, edge: GraphEdge) => {
    const list = byEntity.get(id);
    if (list) list.push(edge);
    else byEntity.set(id, [edge]);
  };
  for (const r of references) {
    const out = (r.direction ?? "outgoing") === "outgoing";
    const from = out ? r.sourceEntityId : r.targetEntityId;
    const to = out ? r.targetEntityId : r.sourceEntityId;
    add(from, { neighborId: to, relationType: r.relationType, direction: "outgoing", hub: r.hubId });
    add(to, { neighborId: from, relationType: r.relationType, direction: "incoming", hub: r.hubId });
  }
  return {
    neighbors: (id) => byEntity.get(id) ?? [],
    // Only Sample ids answer, so the resolver never walks a CEJIL id here.
    templateOf: (id) => (byEntity.has(id) ? getEntity(id)?.typeId : undefined),
    titleOf: (id) => getEntity(id)?.title,
    propertyOf: (id, property) => {
      if (property === "title") {
        const t = getEntity(id)?.title;
        return t ? [t] : [];
      }
      const v = getEntityProp(id, property, "EN");
      return v ? [v] : [];
    },
  };
}

function sampleChainGraph(): ChainGraph {
  if (!sampleGraph) sampleGraph = buildSampleGraph();
  return sampleGraph;
}
registerInheritanceGraph(sampleChainGraph);

/* ── Fields ─────────────────────────────────────────────────────────────── */

/** The relationship fields an entity of this seed carries: its template's own
 *  fields that have members, then (Court case) the derived Judges table. */
export function v4RelationshipFields(entityId: string, typeId: string, lang: Language): RelationshipMetadataField[] {
  const out: RelationshipMetadataField[] = [];
  for (const f of V4_FIELDS[typeId] ?? []) {
    const members = hubMembers(entityId, f.relationType);
    if (!members.length) continue;
    out.push({
      id: f.id,
      label: f.label[lang],
      type: "relationship",
      relationType: f.relationType,
      targetTypeId: f.targetTypeId,
      connectedEntityIds: members,
    });
  }
  if (typeId === "court_case") {
    const d = V4_DERIVED.judges;
    const judges: string[] = [];
    const provenance: Record<string, ProvenanceStep[]> = {};
    for (const judgment of hubMembers(entityId, d.path[0])) {
      for (const judge of hubMembers(judgment, d.path[1])) {
        if (!judges.includes(judge)) judges.push(judge);
        const via = getEntity(judgment);
        provenance[judge] = [
          ...(provenance[judge] ?? []),
          { entityId: judgment, title: via?.title ?? judgment, typeId: via?.typeId, relationLabel: V4_FIELDS.court_case.find((f) => f.relationType === d.path[0])?.label[lang] },
        ];
      }
    }
    if (judges.length) {
      const shared = {
        type: "relationship" as const,
        relationType: d.path[1],
        targetTypeId: "person",
        connectedEntityIds: judges,
        connectionKey: "v4-judges",
        connectionProvenance: provenance,
        entityLabel: d.entityLabel[lang],
        readOnly: true,
      };
      out.push({ ...shared, id: d.id, label: d.label[lang] });
      out.push({
        ...shared,
        id: `${d.id}-nationality`,
        label: d.nationalityLabel[lang],
        inheritLabel: d.nationalityLabel[lang],
        inheritPath: [{ relationType: "nationality", direction: "outgoing", toTypeId: "country", label: V4_FIELDS.person[0].label[lang] }],
        inheritLeaf: "title",
        reduce: "distinct",
      });
    }
  }
  return out;
}
