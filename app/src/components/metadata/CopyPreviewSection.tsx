import { Check, Ban } from "lucide-react";
import type { CopyPlan, CopySkipReason } from "../../utils/copyFrom";

/** What this source would and would NOT bring across, shown before anything is
 *  staged.
 *
 *  The second half is the point. Uwazi's preview highlights the fields that
 *  matched and says nothing at all about the rest — a field that quietly failed
 *  `sameProperty()` (same label, different thesaurus; same name, different type)
 *  simply doesn't light up, and the user is left with a field that didn't fill
 *  in and nothing to read (research weakness #5). Every rejection here carries
 *  the sentence the matching layer wrote for it. */
export function CopyPreviewSection({
  plan,
  onUse,
  onBack,
}: {
  plan: CopyPlan;
  onUse: () => void;
  onBack: () => void;
}) {
  // Fields the target simply doesn't have are noise in a preview of what YOU
  // would receive — they are the source's own business. Everything else is a
  // near-miss worth explaining.
  const nearMisses = plan.skipped.filter((s) => s.reason !== "not-on-source-template");

  return (
    <section
      className="rounded-lg p-3 space-y-3"
      style={{ backgroundColor: "var(--bg-warm)" }}
      aria-label="Copy From preview"
    >
      <div className="flex items-center justify-between gap-2">
        <h4 className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider">
          Copy from this entity
        </h4>
        <span className="text-[11px] text-ink-tertiary">
          {plan.matchCount} {plan.matchCount === 1 ? "field matches" : "fields match"}
        </span>
      </div>

      {plan.matches.length > 0 ? (
        <ul className="space-y-1.5">
          {plan.matches.map((m) => (
            <li key={m.id} className="flex items-start gap-1.5 text-[11px]">
              <Check size={12} className="shrink-0 mt-px text-success" aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="text-ink font-medium">{m.label}</span>
                {m.copies === "connection" && (
                  <span className="text-ink-tertiary"> · copies the connection</span>
                )}
                {m.emptyOnSource && <span className="text-ink-secondary"> · empty here</span>}
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-[11px] text-ink-tertiary">
          Nothing on this entity lines up with the one you are editing.
        </p>
      )}

      {nearMisses.length > 0 && (
        <div className="space-y-1.5 pt-1" style={{ borderTop: "1px solid var(--border-soft)" }}>
          <h5 className="pt-2 text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider">
            Not copied
          </h5>
          <ul className="space-y-1.5">
            {nearMisses.map((s) => (
              // Greyed, not hidden: a field that vanishes teaches nothing.
              <li key={s.id} className="flex items-start gap-1.5 text-[11px] text-ink-tertiary">
                <Ban size={12} className="shrink-0 mt-px text-ink-muted" aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{s.label}</span>
                  <span className="text-ink-tertiary"> — {reasonLabel(s.reason)}</span>
                  <span className="mt-0.5 block text-ink-tertiary">{s.detail}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onUse}
          disabled={plan.matchCount === 0}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
            plan.matchCount === 0
              ? "bg-vellum text-ink-tertiary cursor-not-allowed"
              : "bg-ink text-paper hover:bg-ink/90 cursor-pointer"
          } focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30`}
        >
          Stage {plan.matchCount} {plan.matchCount === 1 ? "field" : "fields"}
        </button>
        <button
          type="button"
          onClick={onBack}
          className="px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment
            hover:text-ink rounded-md transition-colors cursor-pointer
            focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30"
        >
          Pick another
        </button>
      </div>
    </section>
  );
}

/** The short form; the matching layer's `detail` carries the sentence. */
function reasonLabel(reason: CopySkipReason): string {
  switch (reason) {
    case "not-on-source-template":
      return "not on this entity";
    case "not-on-target-template":
      return "not on the entity you are editing";
    case "type-mismatch":
      return "different field type";
    case "different-thesaurus":
      return "points somewhere else";
    case "different-inherit-spec":
      return "inherits a different value";
    case "excluded-type":
      return "files stay with their entity";
    case "read-only-derived":
      return "derived, not editable";
  }
}
