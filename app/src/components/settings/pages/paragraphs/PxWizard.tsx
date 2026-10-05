import { useId, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Modal, MODAL_BUTTON, MODAL_COMMIT, MODAL_COMMIT_DISABLED } from "../../../shared/Modal";
import { ModalField, ModalSearchField } from "../../../shared/ModalParts";
import { BAR_GHOST } from "../../../shared/warmButton";
import { Select } from "../../../shared/Select";
import { dataSourceAtom } from "../../../../atoms/dataSource";
import { templatesAtom } from "../../../../atoms/templates";
import { relationTypesCorpus, relationTypesOfAtom } from "../../../../atoms/relationTypes";
import { consumeFailureAtom } from "../../../../atoms/devSwitches";
import { pxExtractors } from "../../../../atoms/paragraphExtraction";
import { useSettingsNotify } from "../../../../hooks/useSettingsNotify";
import type { TemplateDef } from "../../../../data/templates/types";

/** A target template holds at least one rich text and one numeric property. */
export const qualifiesAsTarget = (t: TemplateDef) =>
  t.properties.some((p) => p.type === "markdown") && t.properties.some((p) => p.type === "numeric");

const STEPS = [
  { title: "Target template", description: "Select the template to store the extracted paragraphs." },
  { title: "Source template", description: "Select the template with the source documents." },
  { title: "Extraction configuration", description: "" },
];

/** Uwazi's create dialog: three steps, then Create. There is no edit; an
 *  extractor is deleted and made again. */
export function PxWizard({ onClose }: { onClose: () => void }) {
  const corpus = useAtomValue(dataSourceAtom);
  const templates = useAtomValue(templatesAtom(corpus));
  const extractors = useAtomValue(pxExtractors.listAtom);
  const relTypes = useAtomValue(relationTypesOfAtom(relationTypesCorpus(corpus))).filter((r) => r.id !== "no_label");
  const create = useSetAtom(pxExtractors.createAtom);
  const consumeFailure = useSetAtom(consumeFailureAtom);
  const { record, fail } = useSettingsNotify();
  const uid = useId();
  const [step, setStep] = useState(0);
  const [target, setTarget] = useState("");
  const [source, setSource] = useState("");
  const [paragraphProperty, setParagraph] = useState("");
  const [numberProperty, setNumber] = useState("");
  const [targetRel, setTargetRel] = useState("");
  const [sourceRel, setSourceRel] = useState("");
  const [search, setSearch] = useState("");

  const used = new Set(extractors.map((x) => x.sourceTemplateId));
  const targets = templates.filter(qualifiesAsTarget);
  const sources = templates.filter((t) => t.id !== target && !used.has(t.id));
  const list = (step === 0 ? targets : sources).filter((t) => t.name.toLowerCase().includes(search.trim().toLowerCase()));
  const targetTpl = templates.find((t) => t.id === target);
  const textProps = targetTpl?.properties.filter((p) => p.type === "markdown") ?? [];
  const numberProps = targetTpl?.properties.filter((p) => p.type === "numeric") ?? [];
  const ready = !!(target && source && paragraphProperty && numberProperty && targetRel && sourceRel);

  // The server's 422s, said before Create: both relationship types the same,
  // or the source already has an extractor (a list made elsewhere meanwhile).
  const issue =
    targetRel && sourceRel && targetRel === sourceRel
      ? "The source and target relationship types must be different."
      : source && used.has(source)
        ? "Cannot create an Extractor with a source template that already has an Extractor."
        : null;

  const go = (n: number) => {
    setSearch("");
    setStep(n);
  };

  const commit = () => {
    if (!ready || issue) return;
    const failure = consumeFailure("save");
    if (failure) return fail(undefined, failure);
    const id = create({
      value: { sourceTemplateId: source, targetTemplateId: target, paragraphProperty, numberProperty, targetRelationType: targetRel, sourceRelationType: sourceRel, created: Date.now() },
    });
    const name = templates.find((t) => t.id === source)?.name ?? source;
    record({ method: "CREATE", domain: "paragraph-extractor", noun: "paragraph extractor for", id, name, message: "Paragraph Extractor added" });
    onClose();
  };

  const options = (ps: { name: string; label: string }[]) => [{ value: "", label: "Select..." }, ...ps.map((p) => ({ value: p.name, label: p.label }))];
  const relOptions = (exclude: string) => [
    { value: "", label: "Select..." },
    ...relTypes.filter((r) => r.id !== exclude).map((r) => ({ value: r.id, label: r.label })),
  ];

  const nextDisabled = step === 0 ? !target : !source;

  return (
    <Modal
      component="PxWizard"
      size="xl"
      height="34rem"
      dismissOnScrim={false}
      onClose={onClose}
      title={STEPS[step].title}
      subtitle={
        <span className="inline-flex items-center gap-1.5" aria-label={`Step ${step + 1} of 3`}>
          {STEPS.map((_, i) => (
            <span key={i} aria-hidden className={`w-1.5 h-1.5 rounded-full ${i === step ? "bg-ink" : "bg-ink-muted/40"}`} />
          ))}
        </span>
      }
      footer={
        <>
          <button type="button" onClick={step === 0 ? onClose : () => go(step - 1)} className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}>
            {step === 0 ? "Cancel" : "Back"}
          </button>
          {step < 2 ? (
            <button type="button" disabled={nextDisabled} onClick={() => go(step + 1)} className={nextDisabled ? MODAL_COMMIT_DISABLED : MODAL_COMMIT}>
              Next
            </button>
          ) : (
            <button type="button" disabled={!ready || !!issue} onClick={commit} className={!ready || issue ? MODAL_COMMIT_DISABLED : MODAL_COMMIT}>
              Create
            </button>
          )}
        </>
      }
      bodyClassName="py-4 flex flex-col gap-3 min-h-0"
    >
      {STEPS[step].description && <p className="text-xs text-ink-secondary">{STEPS[step].description}</p>}
      {step < 2 ? (
        <>
          {step === 0 && (
            <p className="text-xs text-ink-secondary text-pretty">
              Only templates with at least one rich text property and one numeric property are available for selection.
            </p>
          )}
          {step === 1 && (
            <p className="text-xs text-ink-secondary text-pretty">
              Only templates that are not used as source in any other extractor and are not selected as target in this extractor are available for selection.
            </p>
          )}
          {step === 0 && targets.length === 0 ? (
            <div role="status" className="rounded-lg bg-vellum px-4 py-3 text-xs text-ink-secondary flex flex-col gap-1.5">
              <p className="text-sm font-medium text-ink">No valid target template available</p>
              <p>A target template needs to have the following properties:</p>
              <ul className="list-disc ps-5">
                <li>1 Rich text</li>
                <li>1 Numeric</li>
              </ul>
              <p>Add them to a template in Settings › Templates.</p>
            </div>
          ) : (
            <>
              <ModalSearchField value={search} onChange={setSearch} ariaLabel="Search templates" placeholder="Search templates…" />
              <div role="radiogroup" aria-label={STEPS[step].title} className="flex-1 min-h-[8rem] overflow-y-auto rounded-lg border border-border">
                {list.length === 0 ? (
                  <p className="px-3 py-6 text-center text-xs text-ink-secondary">No templates available</p>
                ) : (
                  list.map((t) => {
                    const checked = (step === 0 ? target : source) === t.id;
                    return (
                      <label key={t.id} className={`flex items-center gap-2.5 px-3 h-9 text-xs text-ink cursor-pointer border-b border-border-soft last:border-b-0 ${checked ? "bg-parchment" : "hover:bg-warm"}`}>
                        <input
                          type="radio"
                          name={`${uid}-step${step}`}
                          checked={checked}
                          onChange={() => {
                            if (step === 0) {
                              setTarget(t.id);
                              setParagraph("");
                              setNumber("");
                              if (source === t.id) setSource("");
                            } else setSource(t.id);
                          }}
                          className="accent-ink"
                        />
                        <span aria-hidden className="w-2 h-2 rounded-[2px] shrink-0" style={{ background: t.color }} />
                        {t.name}
                      </label>
                    );
                  })
                )}
              </div>
            </>
          )}
        </>
      ) : (
        <div className="flex flex-col gap-4">
          <ModalField label="Paragraph text extraction property (rich text)" labelId={`${uid}-p`}>
            <Select value={paragraphProperty} onChange={setParagraph} options={options(textProps)} ariaLabel="Paragraph text extraction property (rich text)" />
          </ModalField>
          <ModalField label="Paragraph number extraction property (numeric)" labelId={`${uid}-n`}>
            <Select value={numberProperty} onChange={setNumber} options={options(numberProps)} ariaLabel="Paragraph number extraction property (numeric)" />
          </ModalField>
          <ModalField label="Target relationship type" labelId={`${uid}-t`} hint="Target's role in the relationship Source-Target.">
            <Select value={targetRel} onChange={setTargetRel} options={relOptions(sourceRel)} ariaLabel="Target relationship type" />
          </ModalField>
          <ModalField label="Source relationship type" labelId={`${uid}-s`} hint="Source's role in the relationship Source-Target.">
            <Select value={sourceRel} onChange={setSourceRel} options={relOptions(targetRel)} ariaLabel="Source relationship type" />
          </ModalField>
          {issue && (
            <p role="alert" className="text-xs font-medium text-seal-label">
              {issue}
            </p>
          )}
        </div>
      )}
    </Modal>
  );
}
