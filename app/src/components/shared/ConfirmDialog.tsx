import { AlertTriangle } from "lucide-react";
import { BAR_GHOST } from "./warmButton";
import { Modal, MODAL_BUTTON, MODAL_COMMIT, MODAL_DANGER } from "./Modal";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  /** The safe way out. Defaults to "Cancel"; the dirty-form guard says
   *  "Keep editing". */
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "default";
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  variant = "default",
}: ConfirmDialogProps) {
  if (!open) return null;

  // The shared `Modal`: scrim, focus trap, Escape (cancels), header and the
  // footer ladder. A destructive confirm is the seal commit; the way out is a
  // ghost.
  return (
    <Modal
      component="ConfirmDialog"
      size="sm"
      // Never dismissed by a stray click: a confirm is answered with a button.
      dismissOnScrim={false}
      onClose={onCancel}
      title={title}
      titleId="confirm-dialog-title"
      describedBy="confirm-dialog-message"
      panelProps={{ "data-variant": variant }}
      leading={
        variant === "danger" ? (
          <div data-part="icon" aria-hidden className="shrink-0 w-8 h-8 rounded-md bg-seal-tint flex items-center justify-center">
            <AlertTriangle size={16} className="text-seal-label" />
          </div>
        ) : undefined
      }
      footer={
        <>
          <button type="button" data-part="cancel" onClick={onCancel} className={`${MODAL_BUTTON} ${BAR_GHOST} cursor-pointer`}>
            {cancelLabel}
          </button>
          <button
            type="button"
            data-part="confirm"
            onClick={onConfirm}
            className={variant === "danger" ? MODAL_DANGER : MODAL_COMMIT}
          >
            {confirmLabel}
          </button>
        </>
      }
    >
      <p id="confirm-dialog-message" data-part="message" className="text-sm text-ink-secondary">
        {message}
      </p>
    </Modal>
  );
}
