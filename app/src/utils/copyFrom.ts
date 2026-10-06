import type { Language } from "../atoms/language";
import type { AnyMetadataField, MetadataField, RelationshipMetadataField } from "../data/metadata";
import type { Entity } from "../data/entities";
import { getEntityProfile } from "../data/entityProfiles";

/**
 * Copy From matching: pure logic, no React or atoms. Mirrors Uwazi's
 * `sameProperty()`: a property copies only when both sides define the same
 * `field.id` (never the localised label), `type`, content pointer and inherit
 * spec. Only relationship fields have a content pointer (`relationType` +
 * `targetTypeId`); scalars have no thesaurus here. Every rejection carries a
 * `CopySkipReason` and a sentence, because Uwazi's boolean gives the user none.
 * Inheriting relationship fields copy their `connectedEntityIds`: the inherited
 * value is resolved at render and re-derives at the destination. `readOnly`
 * fields have no editable connection and are refused.
 */

/** Why a property did not come across. The first five mirror the questions a
 *  user actually asks; the last two are ours, and exist because our model can
 *  fail in ways Uwazi's `sameProperty()` has no vocabulary for. */
export type CopySkipReason =
  /** The target defines it, the source doesn't — nothing to copy from. */
  | "not-on-source-template"
  /** The source has it, the target doesn't. Reported so a picker can say why a
   *  populated source field is not on offer; the target's field list is the limit. */
  | "not-on-target-template"
  /** Same key, different `type` (e.g. `text` here, `date` there). */
  | "type-mismatch"
  /** Same key and type, different content pointer — relationship fields whose
   *  `relationType`/`targetTypeId` differ. Scalars have no content pointer, so
   *  this cannot arise for them. */
  | "different-thesaurus"
  /** Same key, type and pointer, different inheritance projection. Uwazi folds
   *  this into `sameProperty()`'s `inherit.property` check; it is reported
   *  separately so the user can see why the field did not copy. */
  | "different-inherit-spec"
  /** A type in `COPY_EXCLUDED_TYPES`. */
  | "excluded-type"
  /** A derived/graph projection with no writable connection (`readOnly`). */
  | "read-only-derived";

/** One property that would copy. */
export interface CopyMatch {
  /** `field.id` — the match key, not the localized label. */
  id: string;
  /** The target's label: the form the user is looking at is the target's. */
  label: string;
  type: AnyMetadataField["type"];
  /** Scalars carry a `value`; relationship fields carry a connection and derive
   *  their value from it (see header). A commit layer switches on this. */
  copies: "value" | "connection";
  sourceValue?: string;
  /** A multiselect's labels and value ids, as the SET — its display string
   *  joins them with ", ", which a label can itself contain. */
  sourceValues?: string[];
  sourceValueIds?: string[];
  /** The source's typed value where the type has one (link, place, date list,
   *  ranges): copied with `sourceValue`, so the target holds the same typed
   *  value and lists, never a stale copy of its own. */
  sourceTyped?: Partial<MetadataField>;
  sourceConnectedEntityIds?: string[];
  /** What the target holds right now, so a caller can show incoming-vs-current
   *  per row instead of overwriting silently. */
  targetValue?: string;
  targetConnectedEntityIds?: string[];
  /** The source's field is empty — copying would clear the target's value.
   *  Still a match (Uwazi copies it too); flagged so a UI can default it off. */
  emptyOnSource: boolean;
  /** Source and target already agree — copying is a no-op. */
  unchanged: boolean;
}

/** One property that would not, and why. */
export interface CopySkip {
  id: string;
  /** Whichever side defined it (the target's label when both do). */
  label: string;
  reason: CopySkipReason;
  /** One sentence, ready to render. Names both sides where both exist. */
  detail: string;
  /** Which side the field was found on — `both` when the key exists either side
   *  but the definitions disagree. */
  side: "target" | "source" | "both";
}

export interface CopyPlan {
  matches: CopyMatch[];
  skipped: CopySkip[];
  /** `matches.length`, for callers that only badge. */
  matchCount: number;
}

/** One thing a copy can actually do to a form: a scalar the form has a
 *  controlled editor for, or a whole connection. What a form can apply is the
 *  form's rule (see `MetadataEditBody`'s `copyUnitsFor`); this is the shape it
 *  hands the picker, so the list the user ticks is exactly what will be written. */
export interface CopyUnit {
  /** The field id for a value; the connection def key for a connection — so
   *  multi-inheritance siblings collapse into a single decision. */
  key: string;
  kind: "value" | "connection";
  /** The form's label for the thing being overwritten (a connection's title,
   *  not one of its inherited columns). */
  label: string;
  /** The match the row compares — for a grouped connection, the first sibling;
   *  they all carry the same `connectedEntityIds`, which is what copies. */
  row: CopyMatch;
  /** Every match folded into this unit. */
  matches: CopyMatch[];
}

/** A plan's matches as units one-to-one — for a host with no form rules of its
 *  own (the catalog demo, stories). */
export function copyUnitsOneToOne(plan: CopyPlan): { units: CopyUnit[]; unstageable: CopyMatch[] } {
  return {
    units: plan.matches.map((m) => ({ key: m.id, kind: m.copies, label: m.label, row: m, matches: [m] })),
    unstageable: [],
  };
}

/** Uwazi excludes `media`/`image`: values an entity owns rather than shares.
 *  Here that is `file-list` and `media`; another entity's files or recording are
 *  never this entity's. Exported so a UI can explain the exclusion without
 *  repeating the list. */
export const COPY_EXCLUDED_TYPES: ReadonlySet<AnyMetadataField["type"]> = new Set(["file-list", "media"]);
/** The same rule by template type (Uwazi's own list): media, image, preview,
 *  nested. */
const COPY_EXCLUDED_PROPERTY_TYPES = new Set(["media", "image", "preview", "nested"]);
const excluded = (f: AnyMetadataField) =>
  COPY_EXCLUDED_TYPES.has(f.type) || (f.type !== "relationship" && COPY_EXCLUDED_PROPERTY_TYPES.has(f.propertyType ?? ""));

const isRelationship = (f: AnyMetadataField): f is RelationshipMetadataField =>
  f.type === "relationship";
const isScalar = (f: AnyMetadataField): f is MetadataField => f.type !== "relationship";

/** Uwazi's `content` for our model: the connection a relationship field points
 *  at. Empty for scalars, which have no vocabulary to differ on. */
function contentKey(f: AnyMetadataField): string {
  return isRelationship(f) ? `${f.relationType}→${f.targetTypeId}` : "";
}

/** The inherit spec, single- and multi-hop folded into one comparable string.
 *  Empty for a link-only relationship and for every scalar. */
function inheritKey(f: AnyMetadataField): string {
  if (!isRelationship(f)) return "";
  if (f.inheritPath?.length) {
    const path = f.inheritPath.map((s) => JSON.stringify(s)).join(">");
    return `path:${path}:${f.inheritLeaf ?? "title"}`;
  }
  return f.inheritProperty ? `prop:${f.inheritProperty}` : "";
}

/** A scalar's typed value, every key present so a copy also clears what the
 *  target held. */
const typedPart = (f: MetadataField): Partial<MetadataField> => ({
  link: f.link,
  geo: f.geo,
  dates: f.dates,
  ranges: f.ranges,
  displayValues: f.displayValues,
});

/** A field's own value, as a copy would carry it. */
const valueOf = (f: AnyMetadataField): string | undefined => (isScalar(f) ? f.value : undefined);
const idsOf = (f: AnyMetadataField): string[] | undefined =>
  isRelationship(f) ? f.connectedEntityIds : undefined;

const sameIds = (a?: string[], b?: string[]): boolean =>
  !!a && !!b && a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * The target side, pre-computed once so a candidate list costs one map lookup
 * per field rather than a rebuild per row, so a picker can badge every candidate
 * before the user selects one.
 */
export interface CopyIndex {
  byId: Map<string, AnyMetadataField>;
  /** Signature per id: `type|content|inherit`. Compared as one string. */
  signature: Map<string, string>;
  /** Ids the target defines but can never receive, with the reason. Held so
   *  `planCopy` doesn't recompute them per candidate. */
  unusable: Map<string, CopySkipReason>;
}

const signatureOf = (f: AnyMetadataField): string =>
  `${typeOf(f)}|${contentKey(f)}|${inheritKey(f)}`;

/** The template's type where the field has one, else the legacy type: two
 *  date lists match each other, never a date list and a text field. */
const typeOf = (f: AnyMetadataField): string => (f.type !== "relationship" && f.propertyType) || f.type;

/** Why this target field can never receive a copy, or null if it can. */
function unusableReason(f: AnyMetadataField): CopySkipReason | null {
  if (excluded(f)) return "excluded-type";
  if (isRelationship(f) && f.readOnly) return "read-only-derived";
  return null;
}

export function buildCopyIndex(targetFields: readonly AnyMetadataField[]): CopyIndex {
  const byId = new Map<string, AnyMetadataField>();
  const signature = new Map<string, string>();
  const unusable = new Map<string, CopySkipReason>();
  for (const f of targetFields) {
    byId.set(f.id, f);
    signature.set(f.id, signatureOf(f));
    const bad = unusableReason(f);
    if (bad) unusable.set(f.id, bad);
  }
  return { byId, signature, unusable };
}

/**
 * How many properties this source would bring across — the number a picker
 * badges each candidate with, before the user commits to one.
 *
 * Deliberately does no allocation beyond the loop: one map lookup and one string
 * compare per source field, against an index built once for the whole list. The
 * expensive part of scoring a candidate is not this function but obtaining its
 * fields (`entityCopyFields` → `getEntityProfile`, which for a CEJIL entity
 * builds a profile and walks its relationships on first call, then memoises).
 * Callers scoring a long list should hoist that, which is why this takes fields
 * rather than an entity.
 */
export function countCopyMatches(
  index: CopyIndex,
  sourceFields: readonly AnyMetadataField[],
): number {
  let n = 0;
  for (const s of sourceFields) {
    if (index.unusable.has(s.id)) continue;
    if (excluded(s)) continue;
    if (isRelationship(s) && s.readOnly) continue;
    if (index.signature.get(s.id) === signatureOf(s)) n++;
  }
  return n;
}

/**
 * The full plan: what copies, and a reason for everything that doesn't.
 *
 * Checks run in the order a person would ask them, and the first difference is
 * the reason reported — matching how `sameProperty()` short-circuits, so we
 * never report "different thesaurus" for two fields that aren't even the same
 * type.
 */
export function planCopy(
  targetFields: readonly AnyMetadataField[],
  sourceFields: readonly AnyMetadataField[],
): CopyPlan {
  const index = buildCopyIndex(targetFields);
  const matches: CopyMatch[] = [];
  const skipped: CopySkip[] = [];
  const seen = new Set<string>();

  for (const s of sourceFields) {
    seen.add(s.id);
    const t = index.byId.get(s.id);

    if (!t) {
      skipped.push({
        id: s.id,
        label: s.label,
        reason: "not-on-target-template",
        detail: `“${s.label}” exists on the source but this entity's type doesn't define it, so there is nowhere to put it.`,
        side: "source",
      });
      continue;
    }

    // Unusable on either side, target first — that is the one the user is
    // editing and the one whose refusal they need explained.
    const bad = index.unusable.get(s.id) ?? unusableReason(s);
    if (bad) {
      skipped.push({
        id: s.id,
        label: t.label,
        reason: bad,
        detail:
          bad === "excluded-type"
            ? `“${t.label}” holds files, which belong to the entity that owns them and are never copied.`
            : `“${t.label}” is derived from the relationship graph, so there is no editable value to copy into.`,
        side: "both",
      });
      continue;
    }

    if (typeOf(t) !== typeOf(s)) {
      skipped.push({
        id: s.id,
        label: t.label,
        reason: "type-mismatch",
        detail: `“${t.label}” is ${typeOf(t)} here and ${typeOf(s)} on the source.`,
        side: "both",
      });
      continue;
    }

    if (contentKey(t) !== contentKey(s)) {
      skipped.push({
        id: s.id,
        label: t.label,
        reason: "different-thesaurus",
        detail: `“${t.label}” points at ${contentKey(t)} here and ${contentKey(s)} on the source — the same name over a different set of entities.`,
        side: "both",
      });
      continue;
    }

    if (inheritKey(t) !== inheritKey(s)) {
      const describe = (f: AnyMetadataField) => inheritKey(f) || "no inherited value";
      skipped.push({
        id: s.id,
        label: t.label,
        reason: "different-inherit-spec",
        detail: `“${t.label}” inherits ${describe(t)} here and ${describe(s)} on the source, so the copied connection would surface a different property.`,
        side: "both",
      });
      continue;
    }

    const relationship = isRelationship(t);
    const sourceValue = valueOf(s);
    const targetValue = valueOf(t);
    const sourceIds = idsOf(s);
    const targetIds = idsOf(t);
    matches.push({
      id: t.id,
      label: t.label,
      type: t.type,
      copies: relationship ? "connection" : "value",
      sourceValue,
      ...(s.type === "multiselect"
        ? { sourceValues: s.values ?? (s.value ? [s.value] : []), sourceValueIds: s.valueIds }
        : {}),
      ...(isScalar(s) ? { sourceTyped: typedPart(s) } : {}),
      sourceConnectedEntityIds: sourceIds,
      targetValue,
      targetConnectedEntityIds: targetIds,
      emptyOnSource: relationship ? !sourceIds?.length : !sourceValue,
      unchanged: relationship ? sameIds(sourceIds, targetIds) : sourceValue === targetValue,
    });
  }

  // Target-only fields. Reported last and separately: they are the fields the
  // user will still have to fill in by hand, which is worth saying out loud.
  for (const t of targetFields) {
    if (seen.has(t.id)) continue;
    const bad = unusableReason(t);
    skipped.push({
      id: t.id,
      label: t.label,
      reason: bad ?? "not-on-source-template",
      detail: bad
        ? bad === "excluded-type"
          ? `“${t.label}” holds files, which are never copied.`
          : `“${t.label}” is derived from the relationship graph and can't be written.`
        : `The source has no “${t.label}”, so this one is left as it is.`,
      side: "target",
    });
  }

  return { matches, skipped, matchCount: matches.length };
}

/* ── entity-level convenience ───────────────────────────────────────────────
 * Thin wrappers. The core above stays pure over field arrays so it can be
 * reasoned about (and tested) without the data layer; these reach into
 * `getEntityProfile`, which is where an entity's per-language schema lives.
 */

/** An entity's copyable field list for a reading language. */
export function entityCopyFields(entity: Entity, language: Language): AnyMetadataField[] {
  return getEntityProfile(entity.id).metadata[language] ?? [];
}

/** `planCopy` for two entities. */
export function planCopyFrom(target: Entity, source: Entity, language: Language): CopyPlan {
  return planCopy(entityCopyFields(target, language), entityCopyFields(source, language));
}

/** `countCopyMatches` for a candidate entity, against a pre-built target index. */
export function countCopyMatchesFor(
  index: CopyIndex,
  candidate: Entity,
  language: Language,
): number {
  return countCopyMatches(index, entityCopyFields(candidate, language));
}
