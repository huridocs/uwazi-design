import { useId, useMemo, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { ArrowRight, ChevronDown } from "lucide-react";
import { Modal, MODAL_BUTTON, MODAL_COMMIT, MODAL_COMMIT_DISABLED } from "../../../shared/Modal";
import { MODAL_INPUT, ModalField, ModalSearchField } from "../../../shared/ModalParts";
import { BAR_GHOST } from "../../../shared/warmButton";
import { Checkbox } from "../../../shared/Checkbox";
import { RadioGroup } from "../../../shared/RadioGroup";
import { FieldMessage } from "../../../shared/FieldMessage";
import { TYPE_ICONS } from "../../propertyTypeIcons";
import { dataSourceAtom } from "../../../../atoms/dataSource";
import { templatesAtom } from "../../../../atoms/templates";
import { extractableProperties, ixExtractors, ixSuggestionsAtom } from "../../../../atoms/extraction";
import { consumeFailureAtom } from "../../../../atoms/devSwitches";
import { useSettingsDraft } from "../../../../hooks/useSettingsDraft";
import { useDirtyGuard } from "../../../../hooks/useDirtyGuard";
import { useSettingsNotify } from "../../../../hooks/useSettingsNotify";
import type { IxExtractor } from "../../../../data/extraction";
import type { PropertyType } from "../../../../data/templates/types";

interface Draft {
  name: string;
  /** `${templateId}|${propertyName}` per pick. */
  picks: string[];
  source: string;
}

const pickOf = (templateId: string, property: string) => `${templateId}|${property}`;
const splitPick = (p: string) => p.split("|") as [string, string];

/** Uwazi's `ExtractorModal`: two steps, "Add Extractor" or "Edit Extractor".
 *  Step 1 names the extractor and picks one property, by template; picking
 *  narrows the list to the same-named property in other templates. Step 2
 *  shows the input, the selected templates and the common sources. Editing
 *  says how many suggestions a change discards. */
export function ExtractorModal({ extractor, onClose }: { extractor: IxExtractor | null; onClose: () => void }) {
  const corpus = useAtomValue(dataSourceAtom);
  const templates = useAtomValue(templatesAtom(corpus));
  const extractors = useAtomValue(ixExtractors.listAtom);
  const create = useSetAtom(ixExtractors.createAtom);
  const patch = useSetAtom(ixExtractors.patchAtom);
  const consumeFailure = useSetAtom(consumeFailureAtom);
  const rows = useAtomValue(ixSuggestionsAtom(`${corpus}|${extractor?.id ?? ""}`));
  const { record, fail } = useSettingsNotify();
  const guard = useDirtyGuard();
  const nameId = useId();

  const saved: Draft = useMemo(
    () => ({
      name: extractor?.name ?? "",
      picks: extractor ? extractor.templates.map((t) => pickOf(t, extractor.property)) : [],
      source: extractor?.source ?? "pdf",
    }),
    [extractor],
  );
  const { draft, update } = useSettingsDraft<Draft>({ id: "extractor-modal", label: extractor ? "Edit Extractor" : "Add Extractor", saved });
  const [step, setStep] = useState<1 | 2>(1);
  const [attempted, setAttempted] = useState(false);
  const [search, setSearch] = useState("");
  const [folded, setFolded] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);

  const property = draft.picks[0] ? splitPick(draft.picks[0])[1] : null;
  const chosenTemplates = draft.picks.map((p) => splitPick(p)[0]);

  const name = draft.name.trim();
  const nameIssue = !name
    ? "This field is required"
    : extractors.some((x) => x.id !== extractor?.id && x.name.trim().toLowerCase() === name.toLowerCase())
      ? "An extractor with this name already exists"
      : null;

  // Step 1's list: every template's extractable properties, narrowed to the
  // picked property's name once one is picked.
  const q = search.trim().toLowerCase();
  const groups = templates
    .map((t) => ({
      t,
      props: extractableProperties(t).filter(
        (p) => (!property || p.name === property) && (!q || p.label.toLowerCase().includes(q) || t.name.toLowerCase().includes(q)),
      ),
    }))
    .filter((g) => g.props.length > 0);

  const toggle = (templateId: string, prop: string) => {
    const k = pickOf(templateId, prop);
    update({ picks: draft.picks.includes(k) ? draft.picks.filter((p) => p !== k) : [...draft.picks, k] });
  };

  // Step 2: PDF, Title, and the text or markdown properties every selected
  // template has, less the target. A saved source no longer offered falls
  // back to PDF.
  const sources = useMemo(() => {
    const common = chosenTemplates
      .map((id) => templates.find((t) => t.id === id))
      .map((t) => (t?.properties ?? []).filter((p) => p.type === "text" || p.type === "markdown"))
      .reduce<{ name: string; label: string }[] | null>(
        (acc, ps) => (acc === null ? ps : acc.filter((a) => ps.some((p) => p.name === a.name))),
        null,
      ) ?? [];
    return [
      { id: "pdf", label: "PDF" },
      { id: "title", label: "Title" },
      ...common.map((p) => ({ id: p.name, label: p.label })),
    ].filter((o) => o.id !== property);
  }, [chosenTemplates, templates, property]);
  const source = sources.some((s) => s.id === draft.source) ? draft.source : "pdf";

  // What an edit discards (Uwazi's `Extractors.update`): a property change
  // discards every suggestion; a removed template its own; a rename none.
  const discards = !extractor
    ? 0
    : property !== extractor.property
      ? rows.length
      : rows.filter((r) => !chosenTemplates.includes(r.templateId)).length;

  const close = () => guard(onClose);

  const commit = () => {
    if (saving) return;
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      const failure = consumeFailure("save");
      if (failure) return fail(undefined, failure); // the modal stays, with its input
      const value = { name, property: property!, templates: chosenTemplates, source };
      if (extractor) {
        const epochs = { ...(extractor.epochs ?? {}) };
        for (const t of new Set([...extractor.templates, ...chosenTemplates])) {
          const removed = !chosenTemplates.includes(t);
          const added = !extractor.templates.includes(t);
          if (property !== extractor.property || removed || added) epochs[t] = (epochs[t] ?? 0) + 1;
        }
        patch({ id: extractor.id, patch: { ...value, epochs } });
        record({ method: "UPDATE", domain: "extractor", noun: "extractor", id: extractor.id, name, message: "Saved successfully." });
      } else {
        // A new extractor's suggestions are blank until a run finds them.
        const epochs = Object.fromEntries(chosenTemplates.map((t) => [t, 1]));
        const id = create({ value: { ...value, status: "ready", epochs } });
        record({ method: "CREATE", domain: "extractor", noun: "extractor", id, name, message: "Saved successfully." });
      }
      onClose();
    }, 400);
  };

  const next = () => {
    if (nameIssue) return setAttempted(true);
    setStep(2);
  };

  const inputProp = draft.picks[0]
    ? (() => {
        const [tid, pname] = splitPick(draft.picks[0]);
        const t = templates.find((tt) => tt.id === tid);
        return t ? extractableProperties(t).find((p) => p.name === pname) : undefined;
      })()
    : undefined;

  return (
    <Modal
      component="ExtractorModal"
      size="xl"
      height="38rem"
      dismissOnScrim={false}
      onClose={close}
      title={extractor ? "Edit Extractor" : "Add Extractor"}
      subtitle={`Step ${step} of 2`}
      footer={
        step === 1 ? (
          <>
            <button type="button" onClick={close} className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}>
              Cancel
            </button>
            <button
              type="button"
              onClick={next}
              disabled={draft.picks.length === 0}
              className={`${draft.picks.length ? MODAL_COMMIT : MODAL_COMMIT_DISABLED} inline-flex items-center gap-1.5`}
            >
              Next <ArrowRight size={13} aria-hidden />
            </button>
          </>
        ) : (
          <>
            <button type="button" onClick={() => setStep(1)} disabled={saving} className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}>
              Back
            </button>
            <button type="button" onClick={commit} aria-busy={saving || undefined} className={MODAL_COMMIT}>
              {extractor ? "Update" : "Create"}
            </button>
          </>
        )
      }
      bodyClassName="py-4 flex flex-col gap-4 min-h-0"
    >
      {step === 1 ? (
        <>
          <ModalField label="Extractor name" htmlFor={nameId}>
            <input
              id={nameId}
              value={draft.name}
              onChange={(e) => update({ name: e.target.value })}
              placeholder="Extractor name"
              aria-invalid={(attempted && !!nameIssue) || undefined}
              aria-describedby={`${nameId}-msg`}
              className={MODAL_INPUT}
              autoFocus
            />
            <FieldMessage id={`${nameId}-msg`} issue={attempted && nameIssue ? { severity: "error", message: nameIssue } : null} />
          </ModalField>
          <div role="group" aria-labelledby={`${nameId}-props`} className="flex flex-col gap-2 min-h-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span id={`${nameId}-props`} className="text-xs font-medium text-ink-secondary">
                Properties by template
              </span>
              {draft.picks.length > 0 && (
                <span className="text-meta text-ink-tertiary" role="status">
                  {draft.picks.length} selected
                </span>
              )}
            </div>
            {/* A row, so the field's `flex-1` widens it instead of growing it
                down the column. */}
            <div className="flex shrink-0">
              <ModalSearchField value={search} onChange={setSearch} ariaLabel="Search properties" placeholder="Search properties or templates…" />
            </div>
            <div className="flex-1 min-h-[10rem] overflow-y-auto rounded-lg border border-border">
              {groups.length === 0 ? (
                <p className="px-3 py-6 text-center text-xs text-ink-tertiary">No property matches “{search.trim()}”</p>
              ) : (
                groups.map(({ t, props }) => {
                  const open = !folded.has(t.id);
                  return (
                    <div key={t.id} className="border-b border-border-soft last:border-b-0">
                      <button
                        type="button"
                        aria-expanded={open}
                        onClick={() => setFolded((f) => { const n = new Set(f); if (n.has(t.id)) n.delete(t.id); else n.add(t.id); return n; })}
                        className="flex items-center gap-2 w-full px-3 h-8 text-xs font-semibold text-ink bg-warm cursor-pointer"
                      >
                        <ChevronDown size={13} aria-hidden className={`text-ink-tertiary transition-transform ${open ? "" : "-rotate-90"}`} />
                        {t.name}
                      </button>
                      {open && (
                        <ul>
                          {props.map((p) => {
                            const Icon = TYPE_ICONS[p.type as PropertyType] ?? TYPE_ICONS.text;
                            const k = pickOf(t.id, p.name);
                            return (
                              <li key={k}>
                                <label className="flex items-center gap-2.5 px-3 h-9 text-xs text-ink cursor-pointer hover:bg-parchment">
                                  <Checkbox checked={draft.picks.includes(k)} onChange={() => toggle(t.id, p.name)} ariaLabel={`${p.label} in ${t.name}`} />
                                  <Icon size={13} aria-hidden className="text-ink-tertiary shrink-0" />
                                  <span className="truncate">{p.label}</span>
                                  <span className="text-ink-secondary">({p.type})</span>
                                </label>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      ) : (
        <>
          <ModalField label="Input" labelId={`${nameId}-input`}>
            <p aria-labelledby={`${nameId}-input`} className="flex items-center gap-2 text-xs text-ink">
              {inputProp && (() => { const Icon = TYPE_ICONS[inputProp.type as PropertyType] ?? TYPE_ICONS.text; return <Icon size={13} aria-hidden className="text-ink-tertiary" />; })()}
              <span className="font-medium">{inputProp?.label}</span>
              <span className="text-ink-secondary">({inputProp?.type})</span>
            </p>
          </ModalField>
          <ModalField label="Selected templates" labelId={`${nameId}-tpls`}>
            <ul aria-labelledby={`${nameId}-tpls`} className="flex flex-wrap gap-1.5">
              {chosenTemplates.map((id) => (
                <li key={id} className="w-fit px-2 py-0.5 rounded-md bg-vellum text-meta font-medium text-ink-secondary">
                  {templates.find((t) => t.id === id)?.name ?? id}
                </li>
              ))}
            </ul>
          </ModalField>
          <ModalField label="Common sources" labelId={`${nameId}-src`}>
            <RadioGroup name="ix-source" ariaLabel="Common sources" value={source} options={sources} onChange={(v) => update({ source: v })} />
          </ModalField>
          {extractor && (
            <p role="status" className="text-xs text-ink-secondary text-pretty">
              {discards === 0
                ? "No suggestions are discarded by this change."
                : `${discards.toLocaleString()} suggestion${discards === 1 ? " is" : "s are"} discarded by this change and start again unprocessed. Values already accepted stay on the entities.`}
            </p>
          )}
        </>
      )}
    </Modal>
  );
}
