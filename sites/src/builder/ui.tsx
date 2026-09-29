/* The builder's controls, in the prototype's look: ink primary, warm
 * secondary, parchment selected, tokens only. */
import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { X } from "lucide-react";

type Variant = "primary" | "secondary" | "ghost" | "danger";
const VARIANT: Record<Variant, string> = {
  primary: "bg-ink text-paper hover:opacity-90 disabled:opacity-40",
  secondary: "bg-warm text-ink shadow-[inset_0_0_0_1px_var(--border-soft)] hover:bg-vellum disabled:opacity-50",
  ghost: "text-ink-secondary hover:text-ink hover:bg-warm disabled:opacity-40",
  danger: "text-seal-label hover:bg-seal-tint disabled:opacity-40",
};

export function Button({ variant = "secondary", size = "md", icon, className = "", children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: "sm" | "md"; icon?: ReactNode }) {
  return (
    <button
      type="button"
      {...rest}
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-medium whitespace-nowrap transition-colors disabled:cursor-default ${size === "sm" ? "h-7 px-2.5 text-xs" : "h-8 px-3 text-sm"} ${VARIANT[variant]} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}

export function IconButton({ label, children, className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button type="button" aria-label={label} title={label} {...rest} className={`inline-grid place-items-center w-7 h-7 rounded-md text-ink-tertiary hover:text-ink hover:bg-warm disabled:opacity-35 disabled:hover:bg-transparent ${className}`}>
      {children}
    </button>
  );
}

export function Label({ htmlFor, children, aside }: { htmlFor?: string; children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="flex items-center gap-2 min-h-5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-ink-secondary">
        {children}
      </label>
      {aside ? <span className="ms-auto flex items-center gap-1">{aside}</span> : null}
    </div>
  );
}

export const inputCls =
  "w-full h-8 px-2.5 rounded-md border border-border-soft bg-paper text-sm text-ink placeholder:text-ink-muted focus:outline-none focus:border-ink/40 focus:ring-2 focus:ring-carbon/20";

export function Select({ id, value, onChange, options, className = "" }: { id?: string; value: string; onChange: (v: string) => void; options: { value: string; label: string }[]; className?: string }) {
  return (
    <select id={id} value={value} onChange={(e) => onChange(e.target.value)} className={`${inputCls} pe-7 ${className}`}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

export function Toggle({ checked, onChange, label, id }: { checked: boolean; onChange: (v: boolean) => void; label: string; id?: string }) {
  const auto = useId();
  const i = id ?? auto;
  return (
    <label htmlFor={i} className="flex items-center gap-2.5 text-sm text-ink cursor-pointer min-h-7">
      <button
        id={i}
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative w-8 h-[1.125rem] rounded-full transition-colors shrink-0 ${checked ? "bg-ink" : "bg-border-soft"}`}
      >
        <span className={`absolute top-[2px] w-[0.875rem] h-[0.875rem] rounded-full bg-paper shadow-sm transition-all ${checked ? "start-[1rem]" : "start-[2px]"}`} />
      </button>
      {label}
    </label>
  );
}

export function Segmented<T extends string>({ value, onChange, options, label }: { value: T; onChange: (v: T) => void; options: { value: T; label: ReactNode; title?: string }[]; label: string }) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className="inline-flex rounded-md bg-warm p-0.5 shadow-[inset_0_0_0_1px_var(--border-primary)]"
      onKeyDown={(e) => {
        const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
        if (!step) return;
        e.preventDefault();
        const rtl = getComputedStyle(e.currentTarget).direction === "rtl" && (e.key === "ArrowLeft" || e.key === "ArrowRight");
        const i = options.findIndex((o) => o.value === value);
        const next = options[(i + (rtl ? -step : step) + options.length) % options.length];
        onChange(next.value);
        (e.currentTarget.querySelector(`[data-v="${next.value}"]`) as HTMLElement | null)?.focus();
      }}
    >
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          data-v={o.value}
          aria-checked={value === o.value}
          tabIndex={value === o.value ? 0 : -1}
          title={o.title}
          onClick={() => onChange(o.value)}
          className={`h-7 px-2.5 inline-flex items-center gap-1.5 rounded-[5px] text-xs font-medium transition-colors ${value === o.value ? "bg-paper text-ink shadow-[var(--shadow-sm)]" : "text-ink-tertiary hover:text-ink"}`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Focus trap + Escape + restore focus. Every overlay in the builder uses it. */
export function useDialog(open: boolean, onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const prev = document.activeElement as HTMLElement | null;
    const el = ref.current;
    const focusables = () => [...(el?.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input:not([disabled]),select,textarea,[tabindex]:not([tabindex="-1"])') ?? [])];
    (el?.querySelector<HTMLElement>("[data-autofocus]") ?? focusables()[0])?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
      if (e.key !== "Tab") return;
      const f = focusables();
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) {
        e.preventDefault();
        f[f.length - 1].focus();
      } else if (!e.shiftKey && document.activeElement === f[f.length - 1]) {
        e.preventDefault();
        f[0].focus();
      }
    };
    document.addEventListener("keydown", onKey, true);
    return () => {
      document.removeEventListener("keydown", onKey, true);
      prev?.focus();
    };
  }, [open, onClose]);
  return ref;
}

export function Modal({ title, subtitle, onClose, children, footer, size = "md" }: { title: string; subtitle?: string; onClose: () => void; children: ReactNode; footer?: ReactNode; size?: "sm" | "md" | "lg" | "xl" }) {
  const ref = useDialog(true, onClose);
  const w = { sm: "max-w-[26rem]", md: "max-w-[34rem]", lg: "max-w-[48rem]", xl: "max-w-[64rem]" }[size];
  const titleId = useId();
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6">
      <div className="absolute inset-0 bg-overlay" onClick={onClose} />
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} className={`relative w-full ${w} max-h-[92vh] flex flex-col bg-paper rounded-t-xl sm:rounded-xl shadow-[var(--shadow-xl)] overflow-hidden`}>
        <header className="flex items-start gap-3 px-5 pt-4 pb-3 border-b border-border">
          <div className="flex-1 min-w-0">
            <h2 id={titleId} className="text-base font-semibold text-ink">
              {title}
            </h2>
            {subtitle ? <p className="text-xs text-ink-tertiary mt-0.5">{subtitle}</p> : null}
          </div>
          <IconButton label="Close" onClick={onClose}>
            <X size={16} />
          </IconButton>
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto px-5 py-4">{children}</div>
        {footer ? <footer className="flex items-center justify-end gap-2 px-5 py-3 border-t border-border bg-warm">{footer}</footer> : null}
      </div>
    </div>
  );
}

/** A disclosure section in a side panel. */
export function Disclosure({ title, open, onToggle, children, aside }: { title: string; open: boolean; onToggle: () => void; children: ReactNode; aside?: ReactNode }) {
  const id = useId();
  return (
    <section className="border-b border-border">
      <h3>
        <button type="button" aria-expanded={open} aria-controls={id} onClick={onToggle} className="w-full flex items-center gap-2 h-11 text-sm font-medium text-ink hover:text-ink">
          <span aria-hidden className={`text-ink-muted transition-transform ${open ? "rotate-90" : "rtl:rotate-180"}`}>
            ›
          </span>
          {title}
          {aside ? <span className="ms-auto text-xs font-normal text-ink-tertiary">{aside}</span> : null}
        </button>
      </h3>
      <div id={id} hidden={!open} className="pb-4 flex flex-col gap-3">
        {children}
      </div>
    </section>
  );
}
