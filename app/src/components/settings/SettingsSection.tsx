import { createContext, useContext, useId, type ReactNode } from "react";

/** The column a settings form sits in: sections stacked one rhythm step
 *  apart, capped at a readable 40rem. `wide` lifts the cap for a body that
 *  is a grid (a template's properties, a term table). */
export function SettingsForm({ wide = false, children }: { wide?: boolean; children: ReactNode }) {
  return (
    <div data-component="SettingsForm" className={`flex flex-col gap-6 min-w-0 ${wide ? "" : "max-w-[40rem]"}`}>
      {children}
    </div>
  );
}

/** Two fields side by side from `sm` up, stacked below. */
export function SettingsFieldRow({ children }: { children: ReactNode }) {
  return <div data-part="field-row" className="grid sm:grid-cols-2 gap-3">{children}</div>;
}

const HeadingId = createContext<string | undefined>(undefined);

/** The id of the enclosing section's heading, for a control group the
 *  heading names (`<fieldset aria-labelledby={useSectionHeadingId()}>`). */
export function useSectionHeadingId() {
  return useContext(HeadingId);
}

/** One block of a settings form: a heading, a one-line description, an
 *  optional action on the heading's line ("Add property"), then its content.
 *  Sections after the first are separated by a soft rule. A section with no
 *  title is a plain group of fields (the first block of an editor). */
export function SettingsSection({
  title,
  description,
  action,
  children,
}: {
  title?: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
  children: ReactNode;
}) {
  const headingId = useId();
  return (
    <section
      data-component="SettingsSection"
      aria-labelledby={title ? headingId : undefined}
      className="flex flex-col gap-3 min-w-0 pt-6 border-t border-border-soft first:pt-0 first:border-t-0"
    >
      {(title || action) && (
        <div data-part="heading" className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {title && (
              <h3 id={headingId} className="text-sm font-semibold text-ink">
                {title}
              </h3>
            )}
            {description && <p className="mt-1 text-xs text-ink-tertiary text-pretty">{description}</p>}
          </div>
          {action && <div className="shrink-0 flex items-center gap-2">{action}</div>}
        </div>
      )}
      <HeadingId.Provider value={title ? headingId : undefined}>{children}</HeadingId.Provider>
    </section>
  );
}
