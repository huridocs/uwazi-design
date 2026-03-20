import { AlertTriangle, AlertCircle } from "lucide-react";

interface AlertBannerProps {
  variant: "warning" | "error";
  children: React.ReactNode;
}

export function AlertBanner({ variant, children }: AlertBannerProps) {
  const isWarning = variant === "warning";
  const Icon = isWarning ? AlertTriangle : AlertCircle;

  return (
    <div
      className={`flex items-start gap-3 px-4 py-3 rounded-lg text-sm ${
        isWarning
          ? "bg-warning-light text-warning"
          : "bg-seal-tint text-seal"
      }`}
      role="alert"
    >
      <Icon size={16} className="shrink-0 mt-0.5" />
      <div className="flex-1">{children}</div>
    </div>
  );
}
