// The Vegas record in depth: every template property the entity holds, in
// template order, as the record and the edit form read it. The corpus is
// English, so the four reading languages share one field list. A recording
// leads with its media card: covered, linked, never stored.
import type { Language } from "../../atoms/language";
import type { AnyMetadataField } from "../metadata";
import type { EntityProfile, MediaItemView } from "../entityProfiles";
import type { Reference } from "../references";
import { registerEntityPropReader } from "../entityMetadata";
import { registerEvidenceProvider } from "../fieldEvidence";
import { recordFieldsFor, type RecordContext } from "../../utils/templateProjection";
import { templateMirror } from "../templates/mirror";
import { vegasRelTypeName, vegasTemplateById } from "./schema";
import { loadVegasEvidence, vegasEntity, vegasEvidence, vegasRefsByEntity } from "./load";
import { displayValues, vegasTimedProp } from "./adapt";
import { vegasLinkAt } from "./links";
import type { VegasEntity } from "./types";

export { isVegasEntity } from "./load";

const LANGS: Language[] = ["EN", "ES", "FR", "AR"];

const ctx: RecordContext = {
  corpus: "vegas",
  relationTypeName: (id) => vegasRelTypeName.get(id ?? "") ?? "",
  template: (id) => templateMirror("vegas", id),
  timed: vegasTimedProp,
};

const first = (e: VegasEntity, prop: string) => e.metadata[prop]?.[0];
const str = (e: VegasEntity, prop: string) => {
  const v = first(e, prop)?.value;
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
};
const linkOf = (e: VegasEntity, prop: string) => {
  const v = first(e, prop)?.value as { url?: string; label?: string } | undefined;
  return v?.url ? { url: v.url, label: v.label || v.url } : undefined;
};

/** The properties the media card draws. The rest stay in the field list. */
const MEDIA_COVERS = ["embed", "audio_url", "content_warning"];

/** A recording as the record's media card: the YouTube player (or the link to
 *  a host that has none), covered by its warning. A 911 call's audio file on
 *  the Internet Archive is its page; a call segment starts at its offset in
 *  the compilation. */
function mediaItemOf(e: VegasEntity): MediaItemView {
  const kind = e.metadata.media_kind?.[0]?.value;
  const audio = kind === "911-call" || kind === "911-compilation";
  const w = first(e, "content_warning");
  const offset = first(e, "compilation_offset_seconds")?.value;
  const audioFile = linkOf(e, "audio_url");
  const embed = str(e, "embed");
  return {
    kind: audio ? "audio" : "video",
    ...(embed ? { embed } : {}),
    ...(typeof offset === "number" ? { segment: { start: offset } } : {}),
    ...(audioFile
      ? { page: { url: audioFile.url, label: "Audio file on the Internet Archive" } }
      : embed
        ? { page: { url: embed, label: embed } }
        : {}),
    ...(first(e, "platform")?.label ? { platform: first(e, "platform")!.label } : {}),
    ...(w && (w.value === "graphic" || w.value === "distressing")
      ? { contentWarning: { value: w.value, label: w.label ?? w.value } }
      : {}),
    ...(first(e, "verification")?.label
      ? { verification: { value: String(first(e, "verification")!.value), label: first(e, "verification")!.label! } }
      : {}),
    factChecks: [],
    covers: MEDIA_COVERS,
  };
}

export function buildVegasProfile(id: string): EntityProfile {
  const e = vegasEntity(id)!;
  const fields = recordFieldsFor(templateMirror("vegas", e.template), e.metadata, ctx);
  const metadata = LANGS.reduce((acc, l) => ((acc[l] = fields), acc), {} as Record<Language, AnyMetadataField[]>);
  const mediaItem = e.template === "vegas_recording" ? mediaItemOf(e) : undefined;
  return {
    id,
    typeId: e.template,
    hasDocument: false,
    metadata,
    documentGroups: [],
    files: [],
    ...(mediaItem ? { mediaItem } : {}),
    relationships: { kind: "references" },
  };
}

/** An inherited column's value: one native property of a Vegas record, as
 *  display text (see the Nepal profile). */
registerEntityPropReader((entityId, propName) => {
  const e = vegasEntity(entityId);
  if (!e) return undefined;
  const p = vegasTemplateById.get(e.template)?.properties.find((x) => x.name === propName);
  if (!p) return undefined;
  const values = displayValues(p, e);
  return values.length ? values.join(", ") : undefined;
});

registerEvidenceProvider({
  covers: (id) => !!vegasEntity(id),
  rows: vegasEvidence,
  load: loadVegasEvidence,
});

const refCache = new Map<string, Reference[]>();

/** This record's references — both directions — as the Relationships tab's
 *  rows. A reference that rests on a time in a recording carries it as a
 *  media anchor, with the recording's link at that time. Read-only. */
export function vegasReferencesFor(id: string): Reference[] {
  const hit = refCache.get(id);
  if (hit) return hit;
  const out = (vegasRefsByEntity().get(id) ?? []).map((r): Reference => {
    const outgoing = r.from === id;
    const m = r.media;
    const url = m ? vegasLinkAt(m.recording, m.offset) : undefined;
    return {
      id: `vg-${r.id}`,
      sourceEntityId: id,
      targetEntityId: outgoing ? r.to : r.from,
      // The dump name: `relationLabel` resolves it through the registry, so a
      // rename in Settings reaches it.
      relationType: vegasRelTypeName.get(r.type) ?? r.type,
      direction: outgoing ? "outgoing" : "incoming",
      verification: r.verification,
      ...(r.date ? { period: r.date } : {}),
      ...(m
        ? {
            mediaAnchor: {
              recordingId: m.recording,
              offset: m.offset,
              ...(m.end !== undefined ? { end: m.end } : {}),
              ...(m.clock !== undefined ? { clock: m.clock * 1000 } : {}),
              ...(m.label ? { label: m.label } : {}),
              ...(m.qualifier ? { qualifier: m.qualifier } : {}),
              ...(url ? { url } : {}),
            },
          }
        : {}),
      createdAt: "",
    };
  });
  refCache.set(id, out);
  return out;
}
