import type { Language } from "../atoms/language";
import type { AnyMetadataField, MetadataField, RelationshipMetadataField } from "../data/metadata";
import type { Entity } from "../data/entities";
import { getEntityProfile } from "../data/entityProfiles";

/**
 * "Copy From" — the MATCHING layer. Pure logic, no React, no atoms, no UI.
 *
 * Uwazi's version (`app/shared/commonProperties.js` + `CopyFromEntity.tsx`) lets
 * an editor pull metadata off any other entity in the library. A property is
 * eligible only when BOTH templates define one with the same `name`, `type`,
 * `content` (thesaurus id) and `inherit.property` — exact schema identity — and
 * three types are excluded outright (`generatedid`, `media`, `image`).
 *
 * We mirror that rule. What we add is the thing their implementation has no
 * place for: a REASON for every property that did NOT come across. Their
 * `sameProperty()` is a boolean, so two fields a human would call "the same"
 * (same label, different thesaurus) fail silently and the user is left staring
 * at a field that didn't fill in, with nothing to read (research §"Critical
 * assessment", weakness #5). Every rejection here carries a `CopySkipReason` and
 * a sentence explaining it.
 *
 * ── How Uwazi's model maps onto ours ────────────────────────────────────────
 *
 * They have templates as first-class records with a `properties[]` schema. We
 * don't: an entity's field list IS its schema, resolved per language through
 * `getEntityProfile(id).metadata[language]`. So "both templates define it"
 * becomes "both entities' field lists define it", which is the same test in
 * practice — profiles are derived from the entity's type — but it is a genuine
 * difference and the reason this module takes FIELD ARRAYS as its primitive and
 * offers entity-level wrappers on top, rather than pretending we have templates.
 *
 *   `name`     → `field.id`. Stable across languages; `label` is localized
 *                display text and must never be the match key (the same field is
 *                "Country"/"País"/"Pays" depending on the reading language).
 *   `type`     → `field.type`.
 *   `content`  → ONLY relationship fields have one: `relationType` +
 *                `targetTypeId`, which is exactly what Uwazi's `content` holds
 *                for a relationship property (the target template id). Our
 *                scalar fields have NO thesaurus concept — `items` is a file
 *                list on `file-list` fields, not an option set — so
 *                `different-thesaurus` can only ever be reported for a
 *                relationship field. Inventing a vocabulary for text/date/etc.
 *                would be modelling something we don't have.
 *   `inherit`  → `inheritProperty`, or `inheritPath` + `inheritLeaf` for the
 *                multi-hop form (see `RelationshipMetadataField`). Both fold
 *                into one comparable key.
 *
 * Excluded types: their `generatedid` / `media` / `image` are "values the target
 * must own, not inherit from a neighbour". Our single equivalent is
 * `file-list` — files belong to the entity that holds them, and copying one
 * entity's attachments onto another is never what a copy of *metadata* means. We
 * have no generatedid analogue at all (nothing in `MetadataField` is
 * server-minted), so the exclusion set is one entry rather than three.
 *
 * ── Are inheriting relationship fields copyable? YES, but what copies is the
 *    CONNECTION, not the value. ───────────────────────────────────────────────
 *
 * A relationship field's displayed value is DERIVED: `utils/inheritance.ts`
 * resolves it live from `connectedEntityIds` at render, and nothing stores it.
 * So there is no inherited value to copy, and writing one would be a lie that
 * the next render overwrites. What is real and writable is the connection —
 * `connectedEntityIds` — and copying that reproduces the inherited value for
 * free, correctly, because it re-derives at the destination.
 *
 * That makes an inheriting field MORE copyable than a scalar, not less: it is
 * the case where copying is guaranteed to stay consistent. Two conditions:
 *   - the inherit spec must match on both sides (a field inheriting `country`
 *     and one inheriting `role` are different columns over the same connection —
 *     see the `connectionKey` multi-inheritance tier — so copying across them
 *     would put the wrong projection under the wrong label);
 *   - `readOnly` fields are refused (`read-only-derived`). Those are graph
 *     projections (CEJIL chains) with no editable connection behind them; the
 *     edit view already renders them read-only, so "copyable" would be a
 *     promise the form can't keep.
 *
 * Callers get `copies: "value" | "connection"` per match so a commit layer never
 * has to re-derive that distinction.
 */

/** Why a property did not come across. The first five mirror the questions a
 *  user actually asks; the last two are ours, and exist because our model can
 *  fail in ways Uwazi's `sameProperty()` has no vocabulary for. */
export type CopySkipReason =
  /** The target defines it, the source doesn't — nothing to copy from. */
  | "not-on-source-template"
  /** The source has it, the target doesn't. Uwazi never even considers these;
   *  we report them so a picker can say why a visibly-populated source field is
   *  not on offer. The target's field list is the hard boundary either way. */
  | "not-on-target-template"
  /** Same key, different `type` (e.g. `text` here, `date` there). */
  | "type-mismatch"
  /** Same key and type, different content pointer — relationship fields whose
   *  `relationType`/`targetTypeId` differ. See the header note on why this
   *  cannot arise for scalars in our model. */
  | "different-thesaurus"
  /** Same key, type and pointer, different inheritance projection. Uwazi folds
   *  this into `sameProperty()`'s `inherit.property` check; naming it separately
   *  is the whole point of this module. */
  | "different-inherit-spec"
  /** `file-list` — our `media`/`image` equivalent (see header). */
  | "excluded-type"
  /** A derived/graph projection with no writable connection (`readOnly`). */
  | "read-only-derived";

/** One property that WOULD copy. */
export interface CopyMatch {
  /** `field.id` — the match key, not the localized label. */
  id: string;
  /** The TARGET's label: the form the user is looking at is the target's. */
  label: string;
  type: AnyMetadataField["type"];
  /** Scalars carry a `value`; relationship fields carry a connection and derive
   *  their value from it (see header). A commit layer switches on this. */
  copies: "value" | "connection";
  sourceValue?: string;
  sourceConnectedEntityIds?: string[];
  /** What the target holds right now, so a caller can show incoming-vs-current
   *  per row instead of overwriting silently (weakness #3). */
  targetValue?: string;
  targetConnectedEntityIds?: string[];
  /** The source's field is empty — copying would CLEAR the target's value.
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

/** Our `media`/`image` equivalent — see the header. Exported so a UI can explain
 *  the exclusion without hardcoding the same list a second time. */
export const COPY_EXCLUDED_TYPES: ReadonlySet<AnyMetadataField["type"]> = new Set(["file-list"]);

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

/** A field's own value, as a copy would carry it. */
const valueOf = (f: AnyMetadataField): string | undefined => (isScalar(f) ? f.value : undefined);
const idsOf = (f: AnyMetadataField): string[] | undefined =>
  isRelationship(f) ? f.connectedEntityIds : undefined;

const sameIds = (a?: string[], b?: string[]): boolean =>
  !!a && !!b && a.length === b.length && a.every((v, i) => v === b[i]);

/**
 * The target side, pre-computed once so a candidate list costs one map lookup
 * per field rather than a rebuild per row (weakness #6: Uwazi makes you SELECT a
 * result before you learn whether it overlaps at all).
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
  `${f.type}|${contentKey(f)}|${inheritKey(f)}`;

/** Why this target field can never receive a copy, or null if it can. */
function unusableReason(f: AnyMetadataField): CopySkipReason | null {
  if (COPY_EXCLUDED_TYPES.has(f.type)) return "excluded-type";
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
 * badges each candidate with, BEFORE the user commits to one.
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
    if (COPY_EXCLUDED_TYPES.has(s.type)) continue;
    if (isRelationship(s) && s.readOnly) continue;
    if (index.signature.get(s.id) === signatureOf(s)) n++;
  }
  return n;
}

/**
 * The full plan: what copies, and a reason for everything that doesn't.
 *
 * Checks run in the order a person would ask them, and the FIRST difference is
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

    if (t.type !== s.type) {
      skipped.push({
        id: s.id,
        label: t.label,
        reason: "type-mismatch",
        detail: `“${t.label}” is ${t.type} here and ${s.type} on the source.`,
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
