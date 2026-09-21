import { useMemo, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { FacetSection } from "../shared/FacetSection";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { WARM_BUTTON } from "../shared/warmButton";
import { foldLabel } from "../../atoms/thesauri";
import type { ThesaurusValue } from "../../data/settings";

/** The editor for a `select` / `multiselect` property: the thesaurus's values
 *  as an inline list — a search box, the rows, "N more" — the shape Uwazi's own
 *  form uses and the shape of the Library's facets, so it IS `FacetSection`
 *  (its `bare` flavour). Inline, so it needs no popover and cannot be clipped by
 *  the drawer.
 *
 *  A dumb list: the host holds the value and decides what a click means. A
 *  single edit adds or removes one label (`select` replaces it); the bulk form
 *  cycles a row through add-to-all / remove-from-all / untouched. So a row is
 *  just chosen, mixed or neither, with an optional coverage beside it.
 *
 *  Chosen values sort to the top, out of their group (the group rides in the
 *  label, "Americas › Central America"), so what the entity holds is never
 *  behind the "N more". A chosen label the thesaurus doesn't hold — free text
 *  from before the property was bound, a translated label — is listed anyway:
 *  a value on the record must never be invisible in its own editor. */
export interface ThesaurusPickerProps {
  /** The property's label — the group's accessible name. */
  label: string;
  /** The thesaurus's values; `null` when the property has no thesaurus. */
  values: ThesaurusValue[] | null;
  multiple: boolean;
  chosen: string[];
  /** Labels some of the edited entities hold and others don't (bulk). */
  mixed?: string[];
  /** Bulk coverage: how many of `of` entities hold each label. */
  coverage?: { counts: Record<string, number>; of: number };
  onToggle: (label: string) => void;
  /** Labels created in this edit, tagged "New". */
  fresh?: ReadonlySet<string>;
  /** The empty state's "Create thesaurus" — a property bound to nothing. Absent
   *  = no way to create one here. */
  onCreateThesaurus?: (name: string, labels: string[]) => void;
  /** Names the template the new thesaurus links to, for the readback line. */
  templateName?: string;
  /** Users who may not edit thesauri see the create controls disabled. The
   *  prototype has no roles; defaults to allowed. */
  canEditThesauri?: boolean;
}

const COLLAPSED = 8;

export function ThesaurusPicker({
  label,
  values,
  multiple,
  chosen,
  mixed = [],
  coverage,
  onToggle,
  fresh,
  onCreateThesaurus,
  templateName,
  canEditThesauri = true,
}: ThesaurusPickerProps) {
  const [creating, setCreating] = useState(false);

  // Rows keyed by LABEL: that is what the records store (see utils/thesauri).
  const { entries, groupOf, display } = useMemo(() => {
    const chosenSet = new Set([...chosen, ...mixed]);
    const parent = new Map<string, string>();
    const all: string[] = [];
    for (const v of values ?? []) {
      if (v.values) for (const c of v.values) {
        parent.set(c.label, v.label);
        all.push(c.label);
      }
      else all.push(v.label);
    }
    const known = new Set(all);
    const extra = [...chosenSet].filter((l) => !known.has(l));
    const top = [...extra, ...all.filter((l) => chosenSet.has(l))];
    const rest = all.filter((l) => !chosenSet.has(l));
    const entries = [...top, ...rest].map((l) => [l, coverage?.counts[l] ?? 0] as [string, number]);
    return {
      entries,
      // A chosen child floats to the top ungrouped, carrying its group in its label.
      groupOf: (l: string) => (chosenSet.has(l) ? undefined : parent.get(l)),
      display: (l: string) => (chosenSet.has(l) && parent.get(l) ? `${parent.get(l)} › ${l}` : l),
    };
  }, [values, chosen, mixed, coverage]);

  const selected = useMemo(() => Object.fromEntries(chosen.map((l) => [l, true])), [chosen]);
  const mixedMap = useMemo(
    () => (mixed.length || coverage ? Object.fromEntries(mixed.map((l) => [l, true])) : undefined),
    [mixed, coverage],
  );

  if (values === null && creating && onCreateThesaurus) {
    return (
      <NewThesaurusForm
        propertyLabel={label}
        templateName={templateName}
        onCancel={() => setCreating(false)}
        onCreate={(name, labels) => {
          onCreateThesaurus(name, labels);
          setCreating(false);
        }}
      />
    );
  }

  // No thesaurus: said ABOVE the list, not as its empty state — a value the
  // record already holds (free text from before a thesaurus existed) is still
  // listed, and must not hide the way to give the property a vocabulary.
  const noThesaurus: ReactNode =
    values === null ? (
      <div data-part="no-thesaurus" className="flex items-center gap-2 px-2 py-1.5">
        <span className="text-xs text-ink-tertiary">This property has no thesaurus yet</span>
        {onCreateThesaurus && (
          <button
            type="button"
            onClick={() => canEditThesauri && setCreating(true)}
            aria-disabled={!canEditThesauri || undefined}
            title={canEditThesauri ? undefined : "Only admins and editors can add values"}
            className={`ms-auto px-2.5 py-1 text-xs font-medium ${WARM_BUTTON} rounded-md transition-colors ${
              canEditThesauri ? "cursor-pointer" : "opacity-50 cursor-not-allowed"
            }`}
          >
            Create thesaurus
          </button>
        )}
      </div>
    ) : null;
  const emptyState: ReactNode =
    values === null ? null : <p className="px-2 py-2 text-xs text-ink-tertiary">This thesaurus has no values yet.</p>;

  return (
    <div
      data-component="ThesaurusPicker"
      className="rounded-md border border-border bg-paper px-1 py-1"
    >
      {noThesaurus}
      {(values !== null || entries.length > 0) && (
      <FacetSection
        bare
        title={label}
        total={entries.length}
        entries={entries}
        selected={selected}
        mixed={mixedMap}
        onToggle={onToggle}
        label={display}
        control={multiple ? "checkbox" : "radio"}
        searchable
        searchThreshold={COLLAPSED}
        collapsedCount={COLLAPSED}
        searchPlaceholder="Search values"
        groupOf={groupOf}
        emptyState={emptyState}
        renderCount={(l) => (coverage ? `${coverage.counts[l] ?? 0} of ${coverage.of}` : null)}
        ariaLabelOf={(l) =>
          coverage ? `${display(l)}, on ${coverage.counts[l] ?? 0} of ${coverage.of}` : display(l)
        }
        renderBadge={
          fresh?.size
            ? (l) =>
                fresh.has(l) ? (
                  <span className="ms-1.5 px-1.5 rounded-sm bg-carbon-tint text-meta font-medium text-carbon">New</span>
                ) : null
            : undefined
        }
      />
      )}
    </div>
  );
}

/** "Create thesaurus", in place of the list: a property bound to no thesaurus
 *  has nothing to pick from. Created on Create, not staged with the form —
 *  a template link half-made until Save is a state nobody can reason about. */
function NewThesaurusForm({
  propertyLabel,
  templateName,
  onCancel,
  onCreate,
}: {
  propertyLabel: string;
  templateName?: string;
  onCancel: () => void;
  onCreate: (name: string, labels: string[]) => void;
}) {
  const [name, setName] = useState(propertyLabel);
  const [lines, setLines] = useState("");
  const labels = lines.split("\n").map((l) => l.trim()).filter(Boolean);
  const ok = name.trim().length > 0;
  return (
    <div data-component="NewThesaurusForm" className="rounded-md border border-border bg-paper p-3 space-y-2">
      <label className="block space-y-1">
        <span className="text-xs font-medium text-ink-secondary">Thesaurus name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          autoFocus
          className="w-full px-3 py-2 text-sm text-ink bg-paper rounded-md border border-border
            focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40"
        />
      </label>
      <label className="block space-y-1">
        <span className="text-xs font-medium text-ink-secondary">Values, one per line</span>
        <textarea
          value={lines}
          onChange={(e) => setLines(e.target.value)}
          rows={4}
          className="w-full px-3 py-2 text-sm text-ink bg-paper rounded-md border border-border resize-y
            focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40"
        />
      </label>
      {/* This changes the TEMPLATE, not only this entity — which is why it is
          said before Create rather than discovered after. */}
      <p className="text-meta text-ink-tertiary">
        {/* Each sentence's first word is bound to the next (\u00a0), so a wrap
            never strands it after the full stop. */}
        {"Links\u00a0to"} “{propertyLabel}”{templateName ? ` on the ${templateName} template` : ""}.{" "}
        {templateName
          ? `Every\u00a0${templateName} will be able to use it.`
          : "Every\u00a0entity of the template will be able to use it."}
      </p>
      <div className="flex items-center justify-end gap-2">
        <button
          type="button"
          onClick={onCancel}
          className={`px-3 py-1.5 text-xs font-medium ${WARM_BUTTON} rounded-md transition-colors cursor-pointer`}
        >
          Cancel
        </button>
        <button
          type="button"
          onClick={() => ok && onCreate(name.trim(), labels)}
          aria-disabled={!ok || undefined}
          className={`px-3 py-1.5 text-xs font-medium rounded-md text-paper bg-ink transition-colors ${
            ok ? "hover:bg-ink/90 cursor-pointer" : "opacity-50 cursor-not-allowed"
          }`}
        >
          Create
        </button>
      </div>
    </div>
  );
}

/** "Add thesaurus value": one field, Cancel / Save. Portalled and fixed (the
 *  drawer is `overflow-hidden`), traps focus, closes on Escape or the scrim.
 *
 *  A label that folds to an existing value (case and accents ignored) is named
 *  under the field before Save, so a duplicate is a deliberate act — and Save
 *  then ticks the existing value rather than adding a second. */
export function AddThesaurusValueModal({
  thesaurusName,
  existing,
  onSave,
  onClose,
}: {
  thesaurusName: string;
  /** Every selectable label the thesaurus holds. */
  existing: string[];
  onSave: (label: string) => void;
  onClose: () => void;
}) {
  const panelRef = useFocusTrap<HTMLDivElement>(true);
  const [value, setValue] = useState("");
  const clean = value.trim();
  const match = clean ? existing.find((l) => foldLabel(l) === foldLabel(clean)) : undefined;
  const save = () => {
    if (clean) onSave(clean);
  };

  return createPortal(
    <div
      data-component="AddThesaurusValueModal"
      data-part="scrim"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/20 p-4"
      onClick={onClose}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-thesaurus-value-title"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            onClose();
          }
        }}
        className="w-full max-w-[24rem] flex flex-col bg-paper rounded-lg border border-border shadow-lg overflow-hidden"
      >
        <header className="shrink-0 flex items-center gap-2 h-11 px-4 border-b border-border">
          <h2 id="add-thesaurus-value-title" className="text-xs font-semibold text-ink">
            Add thesaurus value
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="ms-auto p-1 rounded-md text-ink-muted hover:bg-warm hover:text-ink cursor-pointer
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30"
          >
            <X size={14} />
          </button>
        </header>
        <form
          className="p-4 space-y-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            save();
          }}
        >
          <label htmlFor="add-thesaurus-value" className="text-xs font-medium text-ink-secondary">
            New value in {thesaurusName}
          </label>
          <input
            id="add-thesaurus-value"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            autoFocus
            aria-describedby="add-thesaurus-value-note"
            className="w-full px-3 py-2 text-sm text-ink bg-paper rounded-md border border-border
              focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40"
          />
          {/* Always mounted: a note that appears on the first matching keystroke
              must not push the buttons down. */}
          <p id="add-thesaurus-value-note" className="min-h-4 text-meta text-ink-tertiary">
            {match ? `“${match}” already exists. Save selects it.` : "Added at the top level of the thesaurus."}
          </p>
        </form>
        <footer className="flex items-center justify-end gap-2 h-12 px-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className={`px-3 py-1.5 text-xs font-medium ${WARM_BUTTON} rounded-md transition-colors cursor-pointer`}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={save}
            aria-disabled={!clean || undefined}
            className={`px-3 py-1.5 text-xs font-medium rounded-md text-white bg-success transition-colors ${
              clean ? "hover:bg-success/90 cursor-pointer" : "opacity-50 cursor-not-allowed"
            }`}
          >
            Save
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
