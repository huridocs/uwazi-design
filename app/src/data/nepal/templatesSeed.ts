// The Nepal templates as template definitions. The build script writes them
// in this shape already (data/templates/types.ts), so the seed is a copy, plus
// the relationship chains the Library filters by (`TemplateDef.chains`).
import type { ChainDecl, TemplateDef } from "../templates/types";
import { nepalTemplates } from "./schema";

/** Relationship chains, by root template. Every chain walks the references
 *  (graph.ts); `placeWithin` is a place with everything it is in. */
const NEPAL_CHAINS: Record<string, ChainDecl[]> = {
  nepal_event: [
    {
      id: "nepal-event-where",
      label: "Where",
      description: "Events by the place they happened at, or a place it is in",
      segments: [{ relationType: "occurred_at", direction: "outgoing", toTypeId: "nepal_location", label: "Place" }],
      facets: [{ segmentIndex: 1, label: "Place", property: "placeWithin" }],
    },
    {
      id: "nepal-event-who",
      label: "Who",
      description: "Events by a person or organisation involved in or organising them",
      segments: [{ relationType: ["involved", "organised_by"], direction: "outgoing", label: "Person or organisation" }],
      facets: [{ segmentIndex: 1, label: "Involved or organised by", property: "title" }],
    },
  ],
  nepal_claim: [
    {
      id: "nepal-claim-claimant",
      label: "Claimed by",
      description: "Claims by who made them",
      segments: [{ relationType: "claimed_by", direction: "outgoing", label: "Claimant" }],
      facets: [{ segmentIndex: 1, label: "Claimant", property: "title" }],
    },
    {
      id: "nepal-claim-support",
      label: "Supported by",
      description: "Claims by the sources that support them; both filters hold for one source",
      segments: [{ relationType: "supports", direction: "incoming", toTypeId: "nepal_source", label: "Supporting source" }],
      facets: [
        { segmentIndex: 1, label: "Publisher type", property: "publisher_type" },
        { segmentIndex: 1, label: "Publisher", property: "publisher" },
      ],
    },
    {
      id: "nepal-claim-concerns",
      label: "Concerns event",
      description: "Claims by the event they are about, its type and where it happened",
      segments: [
        { relationType: "concerns", direction: "outgoing", toTypeId: "nepal_event", label: "Event" },
        { relationType: "occurred_at", direction: "outgoing", toTypeId: "nepal_location", label: "Place" },
      ],
      facets: [
        { segmentIndex: 1, label: "Event type", property: "event_type" },
        { segmentIndex: 2, label: "Event place", property: "placeWithin" },
      ],
      partialPaths: true,
    },
  ],
  nepal_casualty: [
    {
      id: "nepal-casualty-treated",
      label: "Treated at",
      description: "Casualty records by where the person was treated",
      segments: [{ relationType: "treated_at", direction: "outgoing", toTypeId: "nepal_location", label: "Place" }],
      facets: [{ segmentIndex: 1, label: "Treated at", property: "placeWithin" }],
    },
    {
      id: "nepal-casualty-event",
      label: "Event",
      description: "Casualty records by the event they belong to",
      segments: [{ relationType: "casualty_of", direction: "outgoing", toTypeId: "nepal_event", label: "Event" }],
      facets: [{ segmentIndex: 1, label: "Event", property: "title" }],
    },
  ],
  nepal_media: [
    {
      id: "nepal-media-depicts",
      label: "Depicts",
      description: "Media items by what they show",
      segments: [{ relationType: "depicts", direction: "outgoing", label: "Depicted" }],
      facets: [{ segmentIndex: 1, label: "Depicts", property: "title" }],
    },
  ],
};

let built: TemplateDef[] | null = null;
/** Built on first read (see data/sample/templates.ts). */
export const nepalTemplateDefs = (): TemplateDef[] =>
  (built ??= nepalTemplates.map((t) => ({
    ...t,
    properties: t.properties.map((p) => ({ ...p })),
    ...(NEPAL_CHAINS[t.id] ? { chains: NEPAL_CHAINS[t.id] } : {}),
  })));
