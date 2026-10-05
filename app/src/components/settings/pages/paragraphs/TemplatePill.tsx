import type { TemplateDef } from "../../../../data/templates/types";

/** A template's name in its colour's dot, as Uwazi's coloured pills read. A
 *  template that no longer exists shows its raw id. */
export function TemplatePill({ template, id }: { template: TemplateDef | undefined; id: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 w-fit max-w-full px-2 py-0.5 rounded-md bg-vellum text-meta font-medium text-ink-secondary">
      <span aria-hidden className="w-2 h-2 rounded-[2px] shrink-0" style={{ background: template?.color ?? "var(--text-muted)" }} />
      <span className="truncate">{template?.name ?? id}</span>
    </span>
  );
}
