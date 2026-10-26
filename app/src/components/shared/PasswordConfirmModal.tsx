import { useId, useState } from "react";
import { useAtomValue } from "jotai";
import { passwordCheckAtom } from "../../atoms/auth";
import { signedInUserAtom } from "../../atoms/users";
import { FieldMessage } from "./FieldMessage";
import { BAR_GHOST } from "./warmButton";
import { Modal, MODAL_BUTTON, MODAL_COMMIT, MODAL_COMMIT_DISABLED } from "./Modal";
import { MODAL_INPUT, MODAL_LABEL } from "./ModalParts";

/** Uwazi's current-password check before a change to an account (G15): title
 *  "Confirm", body "Confirm action", one password field, Cancel and Accept.
 *  Accept is off until something is typed. The password is checked against the
 *  signed-in account's (`atoms/auth.ts`); a wrong one says so under the field
 *  and the dialog stays (Uwazi answers 403 "Password error"). */
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
  const [wrong, setWrong] = useState(false);
  const me = useAtomValue(signedInUserAtom);
  const matches = useAtomValue(passwordCheckAtom);
  const inputId = useId();
  const bodyId = useId();
  const errorId = useId();
  const ready = password.length > 0;
  const accept = () => {
    if (!ready) return;
    if (!matches(me?.id, password)) {
      setWrong(true);
      return;
    }
    onAccept(password);
  };
  const issue = wrong ? ({ severity: "error", message: "That isn’t your current password." } as const) : null;
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
          onChange={(e) => {
            setPassword(e.target.value);
            setWrong(false);
          }}
          aria-invalid={wrong || undefined}
          aria-describedby={errorId}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              accept();
            }
          }}
          className={`${MODAL_INPUT} w-full`}
        />
        <div role="alert">
          <FieldMessage id={errorId} reserve issue={issue} />
        </div>
      </div>
    </Modal>
  );
}
