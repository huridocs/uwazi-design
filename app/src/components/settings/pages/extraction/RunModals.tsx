import { useId, useState } from "react";
import { Info } from "lucide-react";
import { Modal, MODAL_BUTTON, MODAL_COMMIT, MODAL_COMMIT_DISABLED } from "../../../shared/Modal";
import { MODAL_INPUT, ModalField } from "../../../shared/ModalParts";
import { BAR_GHOST } from "../../../shared/warmButton";
import { Checkbox } from "../../../shared/Checkbox";
import { RadioGroup } from "../../../shared/RadioGroup";
import type { IxRun } from "../../../../data/extraction";

function Footer({ onClose, submit, label, disabled = false }: { onClose: () => void; submit: () => void; label: string; disabled?: boolean }) {
  return (
    <>
      <button type="button" onClick={onClose} className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}>
        Cancel
      </button>
      <button type="button" onClick={submit} disabled={disabled} className={disabled ? MODAL_COMMIT_DISABLED : MODAL_COMMIT}>
        {label}
      </button>
    </>
  );
}

function CheckRow({ checked, onChange, label, disabled = false }: { checked: boolean; onChange: () => void; label: string; disabled?: boolean }) {
  return (
    <label className={`flex items-center gap-2 text-xs ${disabled ? "text-ink-muted cursor-not-allowed" : "text-ink cursor-pointer"}`}>
      <Checkbox checked={checked} onChange={onChange} ariaLabel={label} disabled={disabled} />
      {label}
    </label>
  );
}

/** Uwazi's `TrainModelModal`. */
export function TrainModelModal({ onClose, onTrain }: { onClose: () => void; onTrain: (run: IxRun) => void }) {
  const amountId = useId();
  const [policy, setPolicy] = useState<"only_marked" | "marked_plus_labeled">("only_marked");
  const [find, setFind] = useState(false);
  const [amount, setAmount] = useState(1000);
  return (
    <Modal
      component="TrainModelModal"
      size="md"
      onClose={onClose}
      title="Train model"
      footer={<Footer onClose={onClose} label="Train" submit={() => onTrain({ kind: "train", samplePolicy: policy, find: find && amount > 0 ? amount : 0 })} />}
      bodyClassName="py-4 flex flex-col gap-4"
    >
      <p className="flex gap-2 rounded-lg bg-vellum px-3 py-2 text-xs text-ink-secondary text-pretty">
        <Info size={14} aria-hidden className="shrink-0 mt-0.5" />
        Training machine learning models may take from minutes up to a couple of hours depending on the amount of labeled data and the difficulty of the task.
      </p>
      <ModalField
        label="Training sample :"
        labelId={`${amountId}-policy`}
        hint={
          <>
            Marked for training only: uses only entries you marked as “Use for training”, including those with empty values. Marked for training + all
            labeled entries: includes entries marked for training plus any other entries that have values.
          </>
        }
      >
        <RadioGroup
          name="ix-policy"
          ariaLabel="Training sample"
          value={policy}
          onChange={(v) => setPolicy(v as typeof policy)}
          options={[
            { id: "only_marked", label: "Marked for training only" },
            { id: "marked_plus_labeled", label: "Marked for training + all labeled entries" },
          ]}
        />
      </ModalField>
      <CheckRow checked={find} onChange={() => setFind((f) => !f)} label="Find suggestions after training" />
      <ModalField label="Amount :" htmlFor={amountId}>
        <input
          id={amountId}
          type="number"
          min={0}
          value={amount}
          disabled={!find}
          onChange={(e) => setAmount(Number(e.target.value))}
          className={`${MODAL_INPUT} w-32 disabled:opacity-50`}
        />
      </ModalField>
    </Modal>
  );
}

/** Uwazi's `ProcessExtractorModal`: find suggestions for the filtered rows
 *  (or the ticked ones), then optionally accept them. */
export function ProcessExtractorModal({
  selected,
  onClose,
  onProcess,
}: {
  /** Entity ids ticked, or null for the whole extractor. */
  selected: string[] | null;
  onClose: () => void;
  onProcess: (run: IxRun) => void;
}) {
  const amountId = useId();
  const [find, setFind] = useState(true);
  const [amount, setAmount] = useState(1000);
  const [filters, setFilters] = useState({ nonProcessed: true, obsolete: true, error: true });
  const [autoAccept, setAutoAccept] = useState(false);
  const [acceptFrom, setAcceptFrom] = useState<"previous" | "all">("previous");
  const [overwrite, setOverwrite] = useState<"blank_only" | "all">("blank_only");
  const anyFilter = filters.nonProcessed || filters.obsolete || filters.error;
  // Find turns itself off when no filter is ticked (Uwazi does the same).
  const finding = selected ? true : find && anyFilter;
  const amountOk = !finding || amount >= 1;
  const disabled = (!finding && !autoAccept) || !amountOk;
  const toggle = (k: keyof typeof filters) => setFilters((f) => ({ ...f, [k]: !f[k] }));

  return (
    <Modal
      component="ProcessExtractorModal"
      size="md"
      onClose={onClose}
      title={selected ? "Process selected" : "Process extractor"}
      footer={
        <Footer
          onClose={onClose}
          label="Process"
          disabled={disabled}
          submit={() =>
            onProcess({
              kind: "process",
              find: finding ? amount : 0,
              filters: selected ? undefined : filters,
              autoAccept,
              acceptFrom: selected ? "previous" : acceptFrom,
              overwrite,
              only: selected ?? undefined,
            })
          }
        />
      }
      bodyClassName="py-4 flex flex-col gap-4"
    >
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Find suggestions</legend>
        <CheckRow
          checked={finding}
          onChange={() => setFind((f) => !f)}
          disabled={!!selected}
          label={selected ? "Find suggestions for selected" : "Find suggestions for"}
        />
        <div className="flex flex-col gap-2 ps-6">
          <ModalField label="Amount :" htmlFor={amountId}>
            <input
              id={amountId}
              type="number"
              min={1}
              value={amount}
              disabled={!finding}
              aria-invalid={!amountOk || undefined}
              onChange={(e) => setAmount(Number(e.target.value))}
              className={`${MODAL_INPUT} w-32 disabled:opacity-50`}
            />
          </ModalField>
          {!selected && (
            <div className="flex flex-wrap gap-x-4 gap-y-2">
              <CheckRow checked={filters.nonProcessed} onChange={() => toggle("nonProcessed")} label="Non processed" disabled={!find} />
              <CheckRow checked={filters.obsolete} onChange={() => toggle("obsolete")} label="Obsolete" disabled={!find} />
              <CheckRow checked={filters.error} onChange={() => toggle("error")} label="Error" disabled={!find} />
            </div>
          )}
        </div>
      </fieldset>
      <fieldset className="flex flex-col gap-2">
        <legend className="sr-only">Auto-accept</legend>
        <CheckRow checked={autoAccept} onChange={() => setAutoAccept((a) => !a)} label="Auto-accept suggestions" />
        <div className="flex flex-col gap-3 ps-6">
          <RadioGroup
            name="ix-accept-from"
            ariaLabel="Accept suggestions from"
            value={acceptFrom}
            onChange={(v) => setAcceptFrom(v as typeof acceptFrom)}
            options={[
              { id: "previous", label: "From previous step", disabled: !(finding && autoAccept && amount >= 1) },
              ...(selected ? [] : [{ id: "all", label: "From all suggestions", disabled: !autoAccept }]),
            ]}
          />
          <RadioGroup
            name="ix-overwrite"
            ariaLabel="Overwrite"
            value={overwrite}
            onChange={(v) => setOverwrite(v as typeof overwrite)}
            options={[
              { id: "blank_only", label: "For entities with blank values", disabled: !autoAccept },
              { id: "all", label: "For all entities", disabled: !autoAccept },
            ]}
          />
          {autoAccept && overwrite === "all" && (
            <p role="alert" className="text-xs font-medium text-warning-label text-pretty">
              Accepted suggestions replace the values already on these entities.
            </p>
          )}
        </div>
      </fieldset>
    </Modal>
  );
}
