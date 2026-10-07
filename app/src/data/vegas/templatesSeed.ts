// The Vegas templates as template definitions. The build script writes them
// in this shape already (data/templates/types.ts), so the seed is a copy, plus
// the relationship chains the Library filters by (`TemplateDef.chains`).
import type { ChainDecl, TemplateDef } from "../templates/types";
import { vegasTemplates } from "./schema";

/** Relationship chains, by root template. Every chain walks the references
 *  (graph.ts). */
const VEGAS_CHAINS: Record<string, ChainDecl[]> = {
  vegas_recording: [
    {
      id: "vegas-recording-captures",
      label: "Captures",
      description: "Recordings by the moment they capture",
      segments: [{ relationType: "captures", direction: "outgoing", toTypeId: "vegas_moment", label: "Moment" }],
      facets: [
        { segmentIndex: 1, label: "Moment", property: "title" },
        { segmentIndex: 1, label: "Moment type", property: "moment_type" },
      ],
    },
    {
      id: "vegas-recording-place",
      label: "Recorded at",
      description: "Recordings by the place the camera was in",
      segments: [{ relationType: "recorded_at", direction: "outgoing", toTypeId: "vegas_place", label: "Place" }],
      facets: [{ segmentIndex: 1, label: "Recorded at", property: "title" }],
    },
  ],
  vegas_claim: [
    {
      id: "vegas-claim-support",
      label: "Supported by",
      description: "Claims by the sources that support them",
      segments: [{ relationType: "supports", direction: "incoming", toTypeId: "vegas_source", label: "Supporting source" }],
      facets: [
        { segmentIndex: 1, label: "Publisher type", property: "publisher_type" },
        { segmentIndex: 1, label: "Publisher", property: "publisher" },
      ],
    },
  ],
};

let built: TemplateDef[] | null = null;
/** Built on first read (see data/sample/templates.ts). */
export const vegasTemplateDefs = (): TemplateDef[] =>
  (built ??= vegasTemplates.map((t) => ({
    ...t,
    properties: t.properties.map((p) => ({ ...p })),
    ...(VEGAS_CHAINS[t.id] ? { chains: VEGAS_CHAINS[t.id] } : {}),
  })));
