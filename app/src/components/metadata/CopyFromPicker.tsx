import { useEffect, useMemo, useRef, useState } from "react";
import { useAtomValue } from "jotai";
import { ArrowLeft, Ban } from "lucide-react";
import { cejilReadyAtom, entityCorpusPool } from "../../atoms/dataSource";
import { entitiesAtom } from "../../atoms/entities";
import { languageAtom, type Language } from "../../atoms/language";
import { getEntityType, type Entity } from "../../data/entities";
import {
  buildCopyIndex,
  countCopyMatchesFor,
  entityCopyFields,
  planCopyFrom,
  type CopyMatch,
  type CopyPlan,
  type CopySkipReason,
  type CopyUnit,
} from "../../utils/copyFrom";
import { Modal, MODAL_BUTTON } from "../shared/Modal";
import { BAR_GHOST } from "../shared/warmButton";
import { EntityPill } from "../shared/EntityPill";
import { CountBadge } from "../shared/CountBadge";
import { SegmentedControl } from "../shared/SegmentedControl";
import { ModalList, ModalListRow, ModalSearchRow, ModalStatus } from "../shared/ModalParts";
import { Checkbox } from "../shared/Checkbox";
import { SectionLabel } from "../shared/SectionLabel";
import { CopyFieldRow } from "./CopyFieldRow";

/** How many candidates are scored and listed. The badge costs one map lookup per
 *  source field (see `countCopyMatches`), but obtaining those fields builds a
 *  profile, so the corpus is not scored end to end for a picker nobody has
 *  scrolled. */
const LIMIT = 40;

/** Pick the entity to copy metadata FROM.
 *
 *  Two things here answer Uwazi directly (research §"Critical assessment"):
 *
 *  · It defaults to the target's OWN type. Theirs searches the whole library by
 *    title with no filter, so editors routinely pick a source sharing zero
 *    properties and only find out after selecting it (#2). Defaulting to the
 *    type that by construction shares a schema makes the common case the easy
 *    one — with "Any type" right there, because copying across types is a real
 *    thing to want and their version's one virtue.
 *
 *  · Every candidate is badged with how many fields it would actually bring
 *    across, before it is chosen (#6). A source with nothing to give says so in
 *    the list rather than after two clicks and an empty preview.
 *
 *  TWO STEPS IN ONE MODAL. Choosing a source turns the same panel into the
 *  property list: what copies (source value against current value, each
 *  deselectable), what doesn't and why, and "Copy N properties", which writes
 *  exactly the ticked set into the edit form. Nothing is saved; Save stays the
 *  user's. The selection used to happen in the entity overlay beside the form,
 *  through an atom holding the form's closures — the hazard CLAUDE.md records
 *  under click-to-fill. The panel keeps one size across both steps, so the
 *  switch moves nothing, and focus goes to the step's heading. */
export function CopyFromPicker({
  target,
  resolveUnits,
  onCopy,
  onClose,
  initialSource,
}: {
  target: Entity;
  /** Open straight on step 2 for this source — for the catalog and stories,
   *  which have no list to pick from first. */
  initialSource?: Entity;
  /** What the host FORM can apply of a plan. The form owns that rule (a field
   *  with no controlled editor can't take a copy); the picker lists its answer,
   *  so the ticked rows are exactly what gets written. */
  resolveUnits: (plan: CopyPlan) => { units: CopyUnit[]; unstageable: CopyMatch[] };
  /** Write these units into the form. Called once, with the ticked set. */
  onCopy: (source: Entity, units: CopyUnit[]) => void;
  onClose: () => void;
}) {
  const mockEntities = useAtomValue(entitiesAtom);
  // Subscribe, so a picker opened while the CEJIL corpus is still arriving fills
  // in when it lands instead of staying on its loading line.
  const cejilReady = useAtomValue(cejilReadyAtom);
  const language = useAtomValue(languageAtom);
  const [scope, setScope] = useState<"type" | "any">("type");
  const [query, setQuery] = useState("");
  /** Step 2: the chosen source, its plan resolved against the form, and the
   *  ticked set. Null on step 1. */
  const [step, setStep] = useState<PropertyStepState | null>(() =>
    initialSource ? stepFor(target, initialSource, language, resolveUnits) : null,
  );
  /* Focus follows the step: to the step's heading, so a screen reader announces
     where it now is and Tab continues from the top of the new content. Not on
     the first render — step 1 opens on its search box. */
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const stepKey = step?.source.id ?? null;
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    headingRef.current?.focus();
  }, [stepKey]);

  const choose = (source: Entity) => setStep(stepFor(target, source, language, resolveUnits));
  const typeName = getEntityType(target.typeId)?.name ?? "this type";
  // The TARGET's own corpus, never the Library's current one — an entity's peers
  // are the corpus it came from (see `entityCorpusPool`).
  const { entities, loading } = useMemo(
    () => entityCorpusPool(target.id, mockEntities),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- cejilReady IS the subscription
    [target.id, mockEntities, cejilReady],
  );

  // Built once per target, then one lookup per candidate field — the whole
  // reason the matching layer exposes an index rather than only `planCopy`.
  const index = useMemo(
    () => buildCopyIndex(entityCopyFields(target, language)),
    [target, language],
  );
  /** The target defines nothing a copy could land in, so no source can help. A
   *  corpus whose entities carry their data outside the profile layer (artworks:
   *  `Entity.fields`/`descriptors`, which `entityCopyFields` doesn't read) hits
   *  this for every entity — and used to list 40 candidates, every one badged
   *  "no shared fields" and disabled, having built 40 profiles to compute 40
   *  zeros. Say it once, at the top, and score nothing. */
  const targetHasNoFields = index.byId.size === 0;

  const { candidates, total } = useMemo(() => {
    if (targetHasNoFields) return { candidates: [], total: 0 };
    const q = query.trim().toLowerCase();
    const pool = entities
      .filter((e) => e.id !== target.id)
      .filter((e) => (scope === "type" ? e.typeId === target.typeId : true))
      .filter((e) => (q ? e.title.toLowerCase().includes(q) : true));
    return {
      // Scoring builds a profile per candidate, so only the listed slice is
      // scored — but the FULL count comes back with it, because a list silently
      // cut at 40 is a list that lies about what it searched.
      candidates: pool
        .slice(0, LIMIT)
        .map((e) => ({ entity: e, matches: countCopyMatchesFor(index, e, language) })),
      total: pool.length,
    };
  }, [entities, target, scope, query, index, language, targetHasNoFields]);

  return (
    <Modal
      component="CopyFromPicker"
      // Fills the metadata pane, not the viewport: it sits over the form it
      // writes into. ONE size for both steps — a fixed height, capped by the
      // host — so choosing a source swaps the content and moves nothing.
      scope="pane"
      z="z-30"
      size="md"
      height="md:h-[min(34rem,100%)]"
      onClose={onClose}
      titleRef={headingRef}
      title={step ? "Choose properties to copy" : "Copy from"}
      subtitle={step ? "nothing is saved until you save" : "values are staged, not saved"}
      flush
    >
        {step ? (
          <PropertyStep
            step={step}
            onToggle={(key, v) =>
              setStep((st) => (st ? { ...st, checked: { ...st.checked, [key]: v } } : st))
            }
            onAll={(v) =>
              setStep((st) =>
                st ? { ...st, checked: Object.fromEntries(st.units.map((u) => [u.key, v])) } : st,
              )
            }
            onBack={() => setStep(null)}
            onCopy={() => onCopy(step.source, step.units.filter((u) => step.checked[u.key]))}
          />
        ) : (
          <>
        <ModalSearchRow
          value={query}
          onChange={setQuery}
          placeholder="Search by title"
          ariaLabel="Search entities"
          autoFocus
          trailing={
            /* The escape hatch, not the default. */
            <SegmentedControl
              size="sm"
              ariaLabel="Which entities to offer"
              value={scope}
              onChange={(v) => setScope(v as "type" | "any")}
              options={[
                { id: "type", label: typeName },
                { id: "any", label: "Any type" },
              ]}
            />
          }
        />

        <ModalList data-part="candidates">
          {candidates.length === 0 && (
            <ModalStatus as="li">
              {emptyMessage({
                targetHasNoFields,
                loading,
                query: query.trim(),
                scope,
                typeName,
              })}
            </ModalStatus>
          )}
          {candidates.map(({ entity, matches }) => (
            <ModalListRow
              key={entity.id}
              part="candidate"
              onClick={() => choose(entity)}
              disabled={matches === 0}
              title={entity.title}
              chip={<EntityPill typeId={entity.typeId} />}
              meta={
                /* The number Uwazi makes you click to find out. */
                matches === 0 ? (
                  <span>no shared fields</span>
                ) : (
                  <>
                    <CountBadge count={matches} />
                    <span>{matches === 1 ? "field" : "fields"}</span>
                  </>
                )
              }
            />
          ))}
        </ModalList>

        {/* Always mounted, contents toggling — the list is capped, and a footer
            that only appears once the cap bites would move the list under the
            user's cursor the moment they typed. */}
        <footer data-part="footer" className="bleed shrink-0 h-12 flex items-center border-t border-border text-meta text-ink-tertiary">
          {total > LIMIT
            ? `Showing the first ${LIMIT} of ${total.toLocaleString()} — search by title to reach the rest.`
            : total > 0
              ? `${total} ${total === 1 ? "candidate" : "candidates"}`
              : ""}
        </footer>
          </>
        )}
    </Modal>
  );
}

/** Why the list is empty — four different facts that used to share one sentence.
 *  "Nothing else of this type to copy from" was printed for a corpus still
 *  loading, for a scope that isn't a type at all ("Any type"), and for a target
 *  that can't receive a copy from anywhere. */
function emptyMessage({
  targetHasNoFields,
  loading,
  query,
  scope,
  typeName,
}: {
  targetHasNoFields: boolean;
  loading: boolean;
  query: string;
  scope: "type" | "any";
  typeName: string;
}): string {
  if (targetHasNoFields)
    return "This entity's type defines no copyable properties, so there is nothing another entity could fill in.";
  if (loading) return "Loading this entity's collection…";
  if (query)
    return scope === "type"
      ? `No other ${typeName} matches that title.`
      : "No other entity matches that title.";
  return scope === "type"
    ? "Nothing else of this type to copy from."
    : "There is no other entity to copy from.";
}

interface PropertyStepState {
  source: Entity;
  plan: CopyPlan;
  units: CopyUnit[];
  unstageable: CopyMatch[];
  checked: Record<string, boolean>;
}

/** Step 2's state for a chosen source: the plan, resolved against the form. */
function stepFor(
  target: Entity,
  source: Entity,
  language: Language,
  resolveUnits: (plan: CopyPlan) => { units: CopyUnit[]; unstageable: CopyMatch[] },
): PropertyStepState {
  const plan = planCopyFrom(target, source, language);
  const { units, unstageable } = resolveUnits(plan);
  return {
    source,
    plan,
    units,
    unstageable,
    // Defaulted to the matched set — except the ones that would CLEAR a value,
    // which is a destructive default nobody expects from "copy".
    checked: Object.fromEntries(units.map((u) => [u.key, !u.row.emptyOnSource])),
  };
}

/** Step 2 — the chosen source's properties. The same three bands as step 1
 *  (identity/back row, scrolling list, h-12 footer), so the panel doesn't
 *  change shape between them. */
function PropertyStep({
  step,
  onToggle,
  onAll,
  onBack,
  onCopy,
}: {
  step: PropertyStepState;
  onToggle: (key: string, checked: boolean) => void;
  onAll: (checked: boolean) => void;
  onBack: () => void;
  onCopy: () => void;
}) {
  const { source, plan, units, unstageable, checked } = step;
  const n = units.filter((u) => checked[u.key]).length;
  const all = units.length > 0 && n === units.length;
  // A field the target simply doesn't have is the source's own business. What
  // is listed is every near miss, plus the matches this form has no editor for.
  const nearMisses = plan.skipped.filter((sk) => sk.reason !== "not-on-source-template");
  const notCopied: { id: string; label: string; reason: string; detail?: string }[] = [
    ...unstageable.map((m) => ({
      id: `u:${m.id}`,
      label: m.label,
      reason: "no editor for it in this form",
    })),
    ...nearMisses.map((sk) => ({
      id: `s:${sk.id}`,
      label: sk.label,
      reason: reasonLabel(sk.reason),
      detail: sk.detail,
    })),
  ];

  return (
    <>
      <div data-part="source" className="bleed shrink-0 flex items-center gap-2 py-2 border-b border-border">
        <button
          type="button"
          onClick={onBack}
          data-part="back"
          data-gutter-align="box"
          className={`shrink-0 inline-flex items-center gap-1 h-8 px-2 text-xs font-medium ${BAR_GHOST} rounded-md transition-colors cursor-pointer
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30`}
        >
          <ArrowLeft size={13} aria-hidden /> Back
        </button>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-xs font-medium text-ink">{source.title}</span>
          <span className="mt-0.5 block">
            <EntityPill typeId={source.typeId} />
          </span>
        </span>
      </div>

      <div data-part="properties" className="bleed flex-1 overflow-auto py-2">
        {units.length > 0 ? (
          <>
            <label data-part="all" data-gutter-align="box" className="flex items-center gap-2 h-6 px-2 text-meta text-ink-secondary cursor-pointer">
              <Checkbox
                checked={all}
                onChange={(e) => onAll(e.target.checked)}
                ariaLabel={all ? "Select none" : "Select all"}
              />
              {all ? "Select none" : "Select all"}
              <span className="text-ink-tertiary">
                · {units.length} {units.length === 1 ? "property" : "properties"} match
              </span>
            </label>
            <ul data-part="matches">
              {units.map((u) => (
                <li key={u.key}>
                  <CopyFieldRow
                    match={u.row}
                    label={u.label}
                    checked={!!checked[u.key]}
                    onChange={(v) => onToggle(u.key, v)}
                  />
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p data-part="empty" className="py-4 text-center text-xs text-ink-muted">
            Nothing on this entity lines up with the one you are editing.
          </p>
        )}

        {notCopied.length > 0 && (
          <section data-part="not-copied" className="mt-3 pt-2" style={{ borderTop: "1px solid var(--border-soft)" }}>
            <SectionLabel as="h3" className="px-2">
              Not copied
            </SectionLabel>
            <ul className="mt-1 space-y-1">
              {notCopied.map((row) => (
                // Listed, disabled, with the reason: a field that vanishes
                // teaches nothing.
                <li
                  key={row.id}
                  aria-disabled="true"
                  data-gutter-align="box"
                  className="flex items-start gap-2 px-2 py-1 text-meta text-ink-tertiary"
                >
                  <Ban size={12} className="shrink-0 mt-px text-ink-muted" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="font-medium">{row.label}</span> — {row.reason}
                    {row.detail && <span className="mt-0.5 block">{row.detail}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <footer data-part="footer" className="bleed shrink-0 h-12 flex items-center gap-2 border-t border-border">
        <span className="me-auto text-meta text-ink-tertiary">
          {n} of {units.length} selected
        </span>
        <button
          type="button"
          onClick={onCopy}
          disabled={n === 0}
          data-part="copy"
          className={`${MODAL_BUTTON} ${
            n === 0
              ? "bg-vellum text-ink-muted cursor-not-allowed"
              : "bg-ink text-paper hover:bg-ink/90 cursor-pointer"
          } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30`}
        >
          Copy {n} {n === 1 ? "property" : "properties"}
        </button>
      </footer>
    </>
  );
}

/** The short form of a skip; the matching layer's `detail` carries the sentence. */
function reasonLabel(reason: CopySkipReason): string {
  switch (reason) {
    case "not-on-source-template":
      return "not on this entity";
    case "not-on-target-template":
      return "not on the entity you are editing";
    case "type-mismatch":
      return "different field type";
    case "different-thesaurus":
      return "points somewhere else";
    case "different-inherit-spec":
      return "inherits a different value";
    case "excluded-type":
      return "files stay with their entity";
    case "read-only-derived":
      return "derived, not editable";
  }
}
