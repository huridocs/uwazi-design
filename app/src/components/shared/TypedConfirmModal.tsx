import { useId, useState, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { BAR_GHOST } from "./warmButton";
import { Modal, MODAL_BUTTON, MODAL_COMMIT_DISABLED, MODAL_DANGER } from "./Modal";
import { MODAL_INPUT, MODAL_LABEL } from "./ModalParts";

interface TypedConfirmProps {
  title?: string;
  warning?: string;
  message: ReactNode;
  /** One line per thing the action changes ("6 System strings are overwritten"). */
  impact?: string[];
  word?: string;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
}

/** Uwazi's type-the-word confirmation (`ConfirmationModal` with a warning and
 *  a confirm word), used by Languages' Reset and Uninstall: title "Are you
 *  sure?", a red-tinted warning band, the message, what the action touches,
 *  then "Please type in CONFIRM:". The accept button stays off until the word
 *  is typed exactly, case and spaces included. The field resets on each open. */
export function TypedConfirmModal({ open, ...props }: TypedConfirmProps & { open: boolean }) {
  if (!open) return null;
  return <TypedConfirmBody {...props} />;
}

function TypedConfirmBody({
  title = "Are you sure?",
  warning = "Other users will be affected by this action!",
  message,
  impact = [],
  word = "CONFIRM",
  confirmLabel,
  onConfirm,
  onCancel,
}: TypedConfirmProps) {
  const [typed, setTyped] = useState("");
  const inputId = useId();
  const bodyId = useId();
  const ready = typed === word;
  return (
    <Modal
      component="TypedConfirmModal"
      size="md"
      dismissOnScrim={false}
      onClose={onCancel}
      title={title}
      describedBy={bodyId}
      footer={
        <>
          <button type="button" data-part="cancel" onClick={onCancel} className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}>
            No, cancel
          </button>
          <button
            type="button"
            data-part="confirm"
            onClick={ready ? onConfirm : undefined}
            disabled={!ready}
            className={ready ? MODAL_DANGER : MODAL_COMMIT_DISABLED}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <div id={bodyId}>
        <p
          role="alert"
          data-part="warning"
          className="flex items-start gap-2 rounded-md bg-seal-tint px-3 py-2 text-sm font-medium text-seal-label"
        >
          <AlertTriangle size={15} aria-hidden className="mt-0.5 shrink-0" />
          {warning}
        </p>
        <p data-part="message" className="mt-3 text-sm text-ink">
          {message}
        </p>
        {impact.length > 0 && (
          <ul data-part="impact" className="mt-3 space-y-1.5">
            {impact.map((l) => (
              <li key={l} className="flex gap-2 text-sm text-ink-secondary">
                <span aria-hidden className="mt-[0.5rem] w-1 h-1 rounded-full bg-ink-muted shrink-0" />
                <span>{l}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="mt-4 space-y-1">
        <label htmlFor={inputId} className={MODAL_LABEL}>
          {`Please type in ${word}:`}
        </label>
        <input
          id={inputId}
          value={typed}
          autoFocus
          autoComplete="off"
          onChange={(e) => setTyped(e.target.value)}
          className={`${MODAL_INPUT} w-full`}
        />
      </div>
    </Modal>
  );
}
