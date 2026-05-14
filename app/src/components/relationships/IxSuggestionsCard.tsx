import { useState } from "react";
import { useAtom, useSetAtom } from "jotai";
import { ChevronDown, Check, X, Sparkles } from "lucide-react";
import { suggestionsAtom, pendingSuggestionsAtom } from "../../atoms/suggestions";
import { referencesAtom, toastsAtom } from "../../atoms/references";
import { IxSuggestion } from "../../data/suggestions";
import { relationTypes } from "../../data/references";
import { getEntity } from "../../data/entities";
import { EntityPill } from "../shared/EntityPill";
import { FadeTruncate } from "../shared/FadeTruncate";
import { PageTag } from "../shared/PageTag";
import { t } from "../../utils/i18n";

/** Top-of-panel review card for AI-proposed references (Uwazi's IX feature).
 *  Collapsed by default; expand to triage. Accepting promotes a suggestion
 *  into a real Reference; rejecting hides it. */
export function IxSuggestionsCard() {
  const [expanded, setExpanded] = useState(false);
  const [pending] = useAtom(pendingSuggestionsAtom);
  const setSuggestions = useSetAtom(suggestionsAtom);
  const setReferences = useSetAtom(referencesAtom);
  const setToasts = useSetAtom(toastsAtom);

  if (pending.length === 0) return null;

  const accept = (s: IxSuggestion) => {
    setReferences((refs) => [
      ...refs,
      {
        id: `ref-from-sug-${s.id}`,
        sourceEntityId: "e3",
        targetEntityId: s.proposedTargetEntityId,
        relationType: s.proposedRelType,
        sourceSelection: s.sourceSelection,
        createdAt: new Date().toISOString().split("T")[0],
      },
    ]);
    setSuggestions((all) =>
      all.map((x) => (x.id === s.id ? { ...x, status: "accepted" as const } : x)),
    );
    setToasts((prev) => [
      ...prev,
      {
        id: `t-${Date.now()}`,
        message: t("System", "Suggestion accepted"),
        type: "success" as const,
      },
    ]);
  };

  const reject = (s: IxSuggestion) => {
    setSuggestions((all) =>
      all.map((x) => (x.id === s.id ? { ...x, status: "rejected" as const } : x)),
    );
  };

  return (
    <div className="mx-3 mt-3 mb-1 border border-border/60 rounded-md bg-paper overflow-hidden">
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-warm transition-colors cursor-pointer"
      >
        <Sparkles size={14} className="text-carbon shrink-0" />
        <span className="text-xs font-semibold text-ink">
          {t("System", "AI suggestions")}
        </span>
        <span className="text-[10px] tabular-nums text-ink-tertiary bg-warm px-1.5 rounded">
          {pending.length}
        </span>
        <span className="ml-auto text-[11px] text-ink-tertiary">
          {expanded ? t("System", "Hide") : t("System", "Review")}
        </span>
        <ChevronDown
          size={12}
          className={`text-ink-tertiary transition-transform ${expanded ? "" : "-rotate-90"}`}
        />
      </button>

      {expanded && (
        <ul className="border-t border-border/50 divide-y divide-border/40">
          {pending.map((s) => {
            const entity = getEntity(s.proposedTargetEntityId);
            const relLabel =
              relationTypes.find((r) => r.id === s.proposedRelType)?.label ??
              s.proposedRelType;
            return (
              <li key={s.id} className="px-3 py-2.5">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <EntityPill typeId={entity?.typeId ?? ""} label={entity?.title} />
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-ink-tertiary tabular-nums">
                      {Math.round(s.confidence * 100)}%
                    </span>
                    <PageTag page={s.sourceSelection.page} />
                  </div>
                </div>
                <FadeTruncate
                  text={s.sourceSelection.text}
                  maxLines={2}
                  expandable
                  className="text-xs text-ink-secondary leading-relaxed"
                />
                <div className="flex items-center justify-between mt-1.5">
                  <span className="text-[10px] text-ink-tertiary capitalize">
                    {relLabel}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => reject(s)}
                      aria-label={t("System", "Reject suggestion")}
                      className="p-1 rounded hover:bg-seal-tint text-ink-muted hover:text-seal transition-colors cursor-pointer"
                    >
                      <X size={12} />
                    </button>
                    <button
                      type="button"
                      onClick={() => accept(s)}
                      aria-label={t("System", "Accept suggestion")}
                      className="flex items-center gap-1 px-2 h-6 rounded text-[11px] font-medium bg-ink text-parchment hover:bg-ink/90 transition-colors cursor-pointer"
                    >
                      <Check size={11} />
                      {t("System", "Accept")}
                    </button>
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
