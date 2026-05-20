import { useMemo, useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import { useAtom, useSetAtom } from "jotai";
import {
  manageRelationTypesOpenAtom,
  referencesAtom,
  relationTypesAtom,
  toastsAtom,
} from "../../atoms/references";
import {
  NO_LABEL_RELATION_TYPE,
  relationTypes as seedRelationTypes,
} from "../../data/references";
import { t } from "../../utils/i18n";

/** CRUD for the relation-type registry. Add: label input → derived snake_case
 *  id; duplicates are blocked. Delete: orphaned references are reassigned to
 *  `no_label` so the prototype stays usable (no dangling typeIds). The
 *  `no_label` type itself is non-deletable since it's the fallback target. */
export function ManageRelationTypesModal() {
  const [open, setOpen] = useAtom(manageRelationTypesOpenAtom);
  const [types, setTypes] = useAtom(relationTypesAtom);
  const [references, setReferences] = useAtom(referencesAtom);
  const setToasts = useSetAtom(toastsAtom);
  const [draftLabel, setDraftLabel] = useState("");
  const [pendingDelete, setPendingDelete] = useState<string | null>(null);

  const refCountByType = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of references) {
      counts.set(r.relationType, (counts.get(r.relationType) ?? 0) + 1);
    }
    return counts;
  }, [references]);

  const handleClose = () => {
    setOpen(false);
    setDraftLabel("");
    setPendingDelete(null);
  };

  const slugify = (label: string) =>
    label
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "_")
      .replace(/^_+|_+$/g, "");

  const handleAdd = () => {
    const label = draftLabel.trim();
    if (!label) return;
    const id = slugify(label);
    if (!id) return;
    if (types.some((tdef) => tdef.id === id)) {
      setToasts((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          message: `Type "${label}" already exists`,
          type: "error" as const,
        },
      ]);
      return;
    }
    const def = { id, label };
    // Mirror to the seed array so utils that read `relationTypes` statically
    // (e.g. connectionGrouping.getGroupLabel) resolve the new label too.
    seedRelationTypes.push(def);
    setTypes((prev) => [...prev, def]);
    setDraftLabel("");
    setToasts((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        message: `Added relation type "${label}"`,
        type: "success" as const,
      },
    ]);
  };

  const handleDelete = (id: string) => {
    const def = types.find((tdef) => tdef.id === id);
    if (!def) return;
    const usage = refCountByType.get(id) ?? 0;
    if (usage > 0) {
      setReferences((prev) =>
        prev.map((r) =>
          r.relationType === id
            ? { ...r, relationType: NO_LABEL_RELATION_TYPE }
            : r,
        ),
      );
    }
    setTypes((prev) => prev.filter((tdef) => tdef.id !== id));
    const seedIdx = seedRelationTypes.findIndex((tdef) => tdef.id === id);
    if (seedIdx >= 0) seedRelationTypes.splice(seedIdx, 1);
    setPendingDelete(null);
    setToasts((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        message:
          usage > 0
            ? `Deleted "${def.label}" — ${usage} reference${usage === 1 ? "" : "s"} reassigned to "No label"`
            : `Deleted "${def.label}"`,
        type: "success" as const,
      },
    ]);
  };

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex md:items-center md:justify-center md:p-4 bg-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={t("System", "Manage relationship types")}
    >
      <div className="bg-paper shadow-xl w-full md:max-w-lg md:rounded-lg md:max-h-[80vh] h-full md:h-auto flex flex-col md:animate-fade-in-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border">
          <div>
            <h3 className="text-base font-semibold text-ink">
              {t("System", "Manage relationship types")}
            </h3>
            <p className="text-xs text-ink-muted mt-0.5">
              {t(
                "System",
                "Add or remove the relation labels available across this entity.",
              )}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 rounded-md hover:bg-parchment transition-colors cursor-pointer"
            aria-label={t("System", "Close")}
          >
            <X size={18} className="text-ink-muted" />
          </button>
        </div>

        <div className="flex-1 overflow-auto px-5 py-3 space-y-1">
          {types.map((tdef) => {
            const usage = refCountByType.get(tdef.id) ?? 0;
            const isNoLabel = tdef.id === NO_LABEL_RELATION_TYPE;
            const confirming = pendingDelete === tdef.id;
            return (
              <div
                key={tdef.id}
                className="flex items-center gap-2 px-3 py-2 rounded-md hover:bg-warm transition-colors"
              >
                <span className="text-sm text-ink flex-1 truncate">
                  {tdef.label}
                </span>
                <span className="text-[11px] text-ink-tertiary tabular-nums shrink-0">
                  {usage} {usage === 1 ? "ref" : "refs"}
                </span>
                {isNoLabel ? (
                  <span
                    className="text-[10px] uppercase tracking-wide text-ink-tertiary px-1.5 py-0.5 bg-vellum rounded shrink-0"
                    title={t(
                      "System",
                      "Fallback type — orphaned references land here",
                    )}
                  >
                    {t("System", "Fallback")}
                  </span>
                ) : confirming ? (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => handleDelete(tdef.id)}
                      className="px-2 py-1 text-[11px] font-medium text-white bg-seal rounded-md hover:bg-seal/90 transition-colors cursor-pointer"
                    >
                      {usage > 0
                        ? t("System", "Delete & reassign")
                        : t("System", "Delete")}
                    </button>
                    <button
                      onClick={() => setPendingDelete(null)}
                      className="px-2 py-1 text-[11px] font-medium text-ink-secondary hover:text-ink transition-colors cursor-pointer"
                    >
                      {t("System", "Cancel")}
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setPendingDelete(tdef.id)}
                    aria-label={`Delete ${tdef.label}`}
                    className="p-1 rounded text-ink-tertiary hover:bg-seal-tint hover:text-seal transition-colors cursor-pointer shrink-0"
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-5 py-4 border-t border-border flex items-center gap-2">
          <input
            type="text"
            value={draftLabel}
            onChange={(e) => setDraftLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            placeholder={t("System", "New relation type label…")}
            className="flex-1 px-3 py-2 text-sm bg-warm border border-border rounded-md
              placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-carbon/20"
          />
          <button
            onClick={handleAdd}
            disabled={!draftLabel.trim()}
            className="flex items-center gap-1 px-3 py-2 text-xs font-medium rounded-md bg-ink text-parchment
              hover:bg-ink/90 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={12} /> {t("System", "Add")}
          </button>
        </div>
      </div>
    </div>
  );
}
