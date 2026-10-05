import { useId, useState } from "react";
import { BAR_GHOST } from "./warmButton";
import { Modal, MODAL_BUTTON, MODAL_COMMIT, MODAL_COMMIT_DISABLED } from "./Modal";
import { MODAL_INPUT, MODAL_LABEL } from "./ModalParts";

/** Uwazi's current-password check before a change to an account (G15): title
 *  "Confirm", body "Confirm action", one password field, Cancel and Accept.
 *  Accept is off until something is typed. The prototype has no server, so any
 *  non-empty password is accepted: the caller decides what happens next. */
export function PasswordConfirmModal({
  open,
  onAccept,
  onCancel,
}: {
  open: boolean;
  /** Called with the typed password. */
  onAccept: (password: string) => void;
  onCancel: () => void;
}) {
  if (!open) return null;
  return <PasswordConfirmBody onAccept={onAccept} onCancel={onCancel} />;
}

function PasswordConfirmBody({ onAccept, onCancel }: { onAccept: (password: string) => void; onCancel: () => void }) {
  const [password, setPassword] = useState("");
  const inputId = useId();
  const bodyId = useId();
  const ready = password.length > 0;
  const accept = () => {
    if (ready) onAccept(password);
  };
  return (
    <Modal
      component="PasswordConfirmModal"
      size="md"
      dismissOnScrim={false}
      onClose={onCancel}
      title="Confirm"
      describedBy={bodyId}
      footer={
        <>
          <button type="button" data-part="cancel" onClick={onCancel} className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}>
            Cancel
          </button>
          <button
            type="button"
            data-part="confirm"
            onClick={accept}
            disabled={!ready}
            className={ready ? MODAL_COMMIT : MODAL_COMMIT_DISABLED}
          >
            Accept
          </button>
        </>
      }
    >
      <p id={bodyId} className="text-sm text-ink">
        Confirm action
      </p>
      <div className="mt-4 space-y-1">
        <label htmlFor={inputId} className={MODAL_LABEL}>
          Enter your current password to confirm
        </label>
        <input
          id={inputId}
          type="password"
          autoFocus
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              accept();
            }
          }}
          className={`${MODAL_INPUT} w-full`}
        />
      </div>
    </Modal>
  );
}
