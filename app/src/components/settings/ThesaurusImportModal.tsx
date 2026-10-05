import { useState } from "react";
import { CornerDownRight, FolderOpen } from "lucide-react";
import { Modal, MODAL_BUTTON, MODAL_COMMIT, MODAL_COMMIT_DISABLED } from "../shared/Modal";
import { ModalList, ModalListRow, ModalStatus } from "../shared/ModalParts";
import { BAR_GHOST } from "../shared/warmButton";
import { Stepper } from "../shared/Stepper";
import { Dropzone } from "../shared/Dropzone";
import { parseThesaurusCsv, planImport, type ImportPlan } from "../../utils/thesaurusCsv";
import type { TreeItem } from "../../utils/thesaurusTree";
import { seedLanguages } from "../../data/settings";

const SHOWN = 400;
const plural = (n: number, one: string, many: string) => `${n.toLocaleString()} ${n === 1 ? one : many}`;

/** Thesaurus CSV import (UX3), in two steps on the Import CSV stepper:
 *
 *  1. Choose file: the Dropzone, and the format in one example.
 *  2. Preview: every row of the file, marked new, already there or merging
 *     into a group, with a one-line summary. Apply adds the new rows to the
 *     editor's draft; the thesaurus is saved with the editor's Save.
 *
 *  Nothing is written before Apply, and a file that does not parse says
 *  which row and why, on step 1. */
export function ThesaurusImportModal({
  items,
  newId,
  onApply,
  onClose,
}: {
  items: TreeItem[];
  newId: () => string;
  onApply: (plan: ImportPlan, file: string) => void;
  onClose: () => void;
}) {
  const [file, setFile] = useState<{ name: string; plan: ImportPlan; note: string } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(1);
  const defaultLang = seedLanguages.find((l) => l.default)?.label ?? "English";

  const read = async (f: File) => {
    setError(null);
    const text = await f.text();
    const parsed = parseThesaurusCsv(text, seedLanguages);
    if (!parsed.ok) {
      setFile(null);
      setError(parsed.error);
      return;
    }
    const plan = planImport(items, parsed.values, newId);
    const notes = [
      `Labels from the ${parsed.labelColumn} column.`,
      parsed.translationColumns.length
        ? `${parsed.translationColumns.join(", ")} not imported: this prototype keeps one label per value.`
        : "",
      parsed.ignoredColumns.length ? `Ignored: ${parsed.ignoredColumns.join(", ")} (not an installed language).` : "",
    ];
    setFile({ name: f.name, plan, note: notes.filter(Boolean).join(" ") });
    setStep(2);
  };

  const plan = file?.plan;
  const can = step === 2 && !!plan && plan.added + plan.groupsAdded > 0;
  const summary = plan
    ? plan.added + plan.groupsAdded === 0
      ? `Nothing to add: all ${plural(plan.skipped, "value is", "values are")} already in the thesaurus.`
      : [
          `Adds ${plural(plan.added, "value", "values")}${plan.groupsAdded ? ` and ${plural(plan.groupsAdded, "group", "groups")}` : ""}.`,
          plan.skipped ? `Skips ${plural(plan.skipped, "value", "values")} already there.` : "",
        ]
          .filter(Boolean)
          .join(" ")
    : "";

  return (
    <Modal
      component="ThesaurusImportModal"
      size="lg"
      title="Import values from CSV"
      onClose={onClose}
      dismissOnScrim={false}
      height="md:h-[min(36rem,100%)]"
      bodyClassName="flex flex-col min-h-0 py-0"
      footer={
        <>
          {step === 2 && (
            <button type="button" onClick={() => setStep(1)} className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer me-auto`}>
              Back
            </button>
          )}
          <button type="button" onClick={onClose} className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}>
            Cancel
          </button>
          <button
            type="button"
            data-part="submit"
            disabled={!can}
            onClick={() => can && onApply(plan!, file!.name)}
            className={can ? MODAL_COMMIT : MODAL_COMMIT_DISABLED}
          >
            {plan && can ? `Add ${plural(plan.added + plan.groupsAdded, "row", "rows")}` : "Add values"}
          </button>
        </>
      }
    >
      <div className="bleed shrink-0 py-3 border-b border-border-soft overflow-x-auto">
        <Stepper
          steps={[
            { label: "Choose file", state: step === 1 ? "active" : "completed" },
            { label: "Preview", state: step === 2 ? "active" : "upcoming" },
          ]}
        />
      </div>
      {step === 1 ? (
        <div className="flex flex-col gap-4 py-4 overflow-auto">
          <Dropzone
            onFile={read}
            file={file ? { name: file.name, detail: summary } : null}
            onRemove={() => setFile(null)}
          />
          <p role="alert" className="min-h-4 text-xs text-seal-label text-pretty">
            {error}
          </p>
          <div className="flex flex-col gap-1.5">
            <p className="text-xs text-ink-secondary text-pretty">
              The first row names the languages. A value whose label starts with “-” goes into the group above it. Values
              already in the thesaurus are skipped; groups with the same name merge.
            </p>
            <pre className="text-xs font-mono text-ink-secondary bg-vellum rounded-md px-3 py-2 w-fit" dir="ltr">
              {`${defaultLang},Spanish\nFruit,Fruta\n- Apple,Manzana\n- Banana,Banano\nDog,Perro`}
            </pre>
          </div>
        </div>
      ) : (
        plan && (
          <>
            <div className="shrink-0 flex flex-col gap-0.5 py-3">
              <p role="status" className="text-sm text-ink">
                {summary}
              </p>
              <p className="text-xs text-ink-tertiary text-pretty">
                {file!.name}. {file!.note}
              </p>
            </div>
            <ModalList aria-label="Rows in the file" className="border-t border-border-soft">
              {plan.rows.length === 0 ? (
                <ModalStatus as="li">The file has no values.</ModalStatus>
              ) : (
                plan.rows.slice(0, SHOWN).map((r, i) => (
                  <ModalListRow
                    key={i}
                    leading={
                      r.kind === "group" ? (
                        <FolderOpen size={13} className="text-ink-tertiary shrink-0" aria-hidden />
                      ) : r.group ? (
                        <CornerDownRight size={13} className="text-ink-muted shrink-0 ms-3" aria-hidden />
                      ) : (
                        <span aria-hidden className="w-[13px] shrink-0" />
                      )
                    }
                    title={r.label}
                    titleClassName={r.status === "duplicate" ? "text-ink-tertiary" : r.kind === "group" ? "text-ink font-semibold" : "text-ink"}
                    meta={
                      r.status === "new" ? (
                        <span className="text-meta font-semibold text-ink">New</span>
                      ) : r.status === "merge" ? (
                        <span>Existing group</span>
                      ) : (
                        <span>Already there</span>
                      )
                    }
                  />
                ))
              )}
              {plan.rows.length > SHOWN && (
                <ModalStatus as="li">And {(plan.rows.length - SHOWN).toLocaleString()} more rows.</ModalStatus>
              )}
            </ModalList>
          </>
        )
      )}
    </Modal>
  );
}
