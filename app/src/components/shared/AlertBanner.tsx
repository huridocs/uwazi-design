import { AlertTriangle, AlertCircle, CheckCircle2, X } from "lucide-react";

interface AlertBannerProps {
  variant: "warning" | "error" | "success";
  children: React.ReactNode;
  /** Draws a × that hides the banner. */
  onDismiss?: () => void;
}

const VARIANT = {
  warning: { Icon: AlertTriangle, tone: "bg-warning-light text-warning-label" },
  error: { Icon: AlertCircle, tone: "bg-seal-tint text-seal-label" },
  success: { Icon: CheckCircle2, tone: "bg-success-light text-success-label" },
} as const;

/** A message in the page, where the action was taken. `success` confirms an
 *  action the user must not miss (a password reset sent): the Beacon keeps a
 *  copy, but the confirmation is here (huridocs/uwazi issue 9748). */
export function AlertBanner({ variant, children, onDismiss }: AlertBannerProps) {
  const { Icon, tone } = VARIANT[variant];
  return (
    <div
      data-component="AlertBanner"
      data-variant={variant}
      className={`flex items-start gap-3 px-4 py-3 rounded-lg text-sm ${tone}`}
      // A success is news, not an interruption.
      role={variant === "success" ? "status" : "alert"}
    >
      <Icon size={16} data-part="icon" className="shrink-0 mt-0.5" aria-hidden />
      <div data-part="message" className="flex-1">{children}</div>
      {onDismiss && (
        <button
          type="button"
          data-part="dismiss"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="shrink-0 -my-0.5 -me-1 p-0.5 rounded opacity-70 hover:opacity-100 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-current"
        >
          <X size={14} aria-hidden />
        </button>
      )}
    </div>
  );
}
