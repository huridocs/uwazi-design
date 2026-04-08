import { Check } from "lucide-react";

interface Step {
  label: string;
  state: "completed" | "active" | "upcoming";
}

interface StepperProps {
  steps: Step[];
}

export function Stepper({ steps }: StepperProps) {
  return (
    <div className="flex items-center gap-0">
      {steps.map((step, i) => (
        <div key={step.label} className="flex items-center">
          <div className="flex items-center gap-2">
            <div
              className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-semibold shrink-0 ${
                step.state === "completed"
                  ? "bg-success text-white"
                  : step.state === "active"
                  ? "bg-carbon text-white"
                  : "bg-warm text-ink-muted border border-border"
              }`}
            >
              {step.state === "completed" ? <Check size={14} /> : i + 1}
            </div>
            <span
              className={`text-xs font-medium whitespace-nowrap ${
                step.state === "upcoming" ? "text-ink-muted" : "text-ink"
              }`}
            >
              {step.label}
            </span>
          </div>
          {i < steps.length - 1 && (
            <div
              className={`w-10 h-px mx-3 ${
                step.state === "completed" ? "bg-success" : "bg-border"
              }`}
            />
          )}
        </div>
      ))}
    </div>
  );
}
