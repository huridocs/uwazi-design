import { useId, useState, type ReactNode } from "react";
import { AlertTriangle, Ban } from "lucide-react";
import { BAR_GHOST } from "./warmButton";
import { Modal, MODAL_BUTTON, MODAL_COMMIT, MODAL_COMMIT_DISABLED, MODAL_DANGER } from "./Modal";
import { MODAL_INPUT } from "./ModalParts";

/** What a delete would touch and whether it is refused — the shape the usage
 *  selectors return (`atoms/settingsUsage.ts`). */
export interface DeleteImpact {
  lines: string[];
  block: string | null;
}

/** The one delete confirmation for Settings. It states what the delete
 *  touches ("Used by 412 entities in 3 templates") before asking, and where
 *  Uwazi refuses the delete it says which rule applies and offers only OK.
 *
 *  - `message` is the question; keep it to what the code does.
 *  - `children` sits between the facts and the footer: the relationship type
 *    dialog puts its "Move references to" picker there.
 *  - `confirmWord`: the confirm stays off until that word is typed (Uwazi's
 *    language uninstall asks for "CONFIRM").
 *  - `confirmDisabled`: the caller's own condition (no reassign target yet). */
export function ConfirmDelete({
  open,
  title,
  message,
  impact,
  confirmLabel = "Delete",
  onConfirm,
  onCancel,
  children,
  confirmWord,
  confirmDisabled = false,
}: {
  open: boolean;
  title: string;
  message: ReactNode;
  impact: DeleteImpact | null;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
  confirmWord?: string;
  confirmDisabled?: boolean;
}) {
  if (!open) return null;
  return (
    <ConfirmDeleteBody
      title={title}
      message={message}
      impact={impact}
      confirmLabel={confirmLabel}
      onConfirm={onConfirm}
      onCancel={onCancel}
      confirmWord={confirmWord}
      confirmDisabled={confirmDisabled}
    >
      {children}
    </ConfirmDeleteBody>
  );
}

function ConfirmDeleteBody({
  title,
  message,
  impact,
  confirmLabel,
  onConfirm,
  onCancel,
  children,
  confirmWord,
  confirmDisabled,
}: {
  title: string;
  message: ReactNode;
  impact: DeleteImpact | null;
  confirmLabel: string;
  onConfirm: () => void;
  onCancel: () => void;
  children?: ReactNode;
  confirmWord?: string;
  confirmDisabled: boolean;
}) {
  const [typed, setTyped] = useState("");
  const wordId = useId();
  const messageId = useId();
  const blocked = impact?.block ?? null;
  const lines = impact?.lines ?? [];
  const ready = !confirmDisabled && (!confirmWord || typed.trim() === confirmWord);

  return (
    <Modal
      component="ConfirmDelete"
      size="sm"
      dismissOnScrim={false}
      onClose={onCancel}
      title={title}
      describedBy={messageId}
      panelProps={{ "data-state": blocked ? "blocked" : "confirm" }}
      leading={
        <div data-part="icon" aria-hidden className="shrink-0 w-8 h-8 rounded-md bg-seal-tint flex items-center justify-center">
          {blocked ? <Ban size={16} className="text-seal-label" /> : <AlertTriangle size={16} className="text-seal-label" />}
        </div>
      }
      footer={
        blocked ? (
          <button type="button" data-part="confirm" onClick={onCancel} className={MODAL_COMMIT}>
            OK
          </button>
        ) : (
          <>
            <button type="button" data-part="cancel" onClick={onCancel} className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}>
              Cancel
            </button>
            <button
              type="button"
              data-part="confirm"
              onClick={ready ? onConfirm : undefined}
              aria-disabled={!ready || undefined}
              className={ready ? MODAL_DANGER : MODAL_COMMIT_DISABLED}
            >
              {confirmLabel}
            </button>
          </>
        )
      }
    >
      <div id={messageId}>
        <p data-part="message" className="text-sm text-ink">
          {blocked ?? message}
        </p>
        {lines.length > 0 && (
          <ul data-part="impact" className="mt-3 space-y-1.5">
            {lines.map((l) => (
              <li key={l} className="flex gap-2 text-sm text-ink-secondary">
                <span aria-hidden className="mt-[0.5rem] w-1 h-1 rounded-full bg-ink-muted shrink-0" />
                <span>{l}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
      {!blocked && children && <div className="mt-4">{children}</div>}
      {!blocked && confirmWord && (
        <div className="mt-4 space-y-1">
          <label htmlFor={wordId} className="block text-xs font-medium text-ink-secondary">
            Type {confirmWord} to continue
          </label>
          <input
            id={wordId}
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            autoComplete="off"
            className={`${MODAL_INPUT} w-full`}
          />
        </div>
      )}
    </Modal>
  );
}
