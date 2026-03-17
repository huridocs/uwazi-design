import { useAtom } from "jotai";
import { toastsAtom } from "../atoms/references";
import { useEffect } from "react";
import { CheckCircle2, XCircle, Info, X } from "lucide-react";

export function ToastContainer() {
  const [toasts, setToasts] = useAtom(toastsAtom);

  // Auto-dismiss after 3s
  useEffect(() => {
    if (toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts((prev) => prev.slice(1));
    }, 3000);
    return () => clearTimeout(timer);
  }, [toasts, setToasts]);

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="flex items-center gap-2 px-4 py-2.5 bg-paper border border-border
            rounded-lg shadow-lg animate-slide-in-right min-w-[250px]"
        >
          {toast.type === "success" && (
            <CheckCircle2 size={16} className="text-success shrink-0" />
          )}
          {toast.type === "error" && (
            <XCircle size={16} className="text-seal shrink-0" />
          )}
          {toast.type === "info" && (
            <Info size={16} className="text-carbon shrink-0" />
          )}
          <span className="text-sm text-ink">{toast.message}</span>
          <button
            onClick={() => setToasts((prev) => prev.filter((t) => t.id !== toast.id))}
            className="ml-auto p-0.5 rounded hover:bg-parchment"
          >
            <X size={14} className="text-ink-muted" />
          </button>
        </div>
      ))}
    </div>
  );
}
