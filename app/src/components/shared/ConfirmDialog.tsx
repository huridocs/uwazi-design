import { AlertTriangle, X } from "lucide-react";

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  variant?: "danger" | "default";
}

export function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  onConfirm,
  onCancel,
  variant = "default",
}: ConfirmDialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-overlay" role="dialog" aria-modal="true" aria-labelledby="confirm-dialog-title">
      <div className="bg-paper rounded-lg shadow-xl w-full max-w-md p-6 animate-fade-in-up">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            {variant === "danger" && (
              <div className="w-10 h-10 rounded-md bg-seal-tint flex items-center justify-center">
                <AlertTriangle size={20} className="text-seal" />
              </div>
            )}
            <h3 id="confirm-dialog-title" className="text-lg font-semibold text-ink">{title}</h3>
          </div>
          <button
            onClick={onCancel}
            className="p-1 rounded-md hover:bg-parchment transition-colors"
          >
            <X size={18} className="text-ink-muted" />
          </button>
        </div>
        <p className="text-sm text-ink-secondary mb-6">{message}</p>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCancel}
            className="px-4 py-2 text-sm font-medium rounded-md border border-border
              text-ink-secondary hover:bg-parchment transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              variant === "danger"
                ? "bg-seal text-white hover:bg-seal/90"
                : "bg-ink text-parchment hover:bg-ink/90"
            }`}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
