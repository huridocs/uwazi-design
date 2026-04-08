import { useAtom } from "jotai";
import { overlayEntityIdAtom, referencesAtom } from "../../atoms/references";
import { getEntity, getEntityType } from "../../data/entities";
import { EntityPill } from "../shared/EntityPill";
import { PageTag } from "../shared/PageTag";
import { FadeTruncate } from "../shared/FadeTruncate";
import { X, FileText, Link2, Calendar, Tag } from "lucide-react";

export function EntityOverlay() {
  const [entityId, setEntityId] = useAtom(overlayEntityIdAtom);
  const [references] = useAtom(referencesAtom);

  const entity = entityId ? getEntity(entityId) : undefined;
  const entityType = entity ? getEntityType(entity.typeId) : undefined;

  // References that point to this entity
  const entityRefs = entityId
    ? references.filter((r) => r.targetEntityId === entityId)
    : [];

  const isOpen = entityId !== null && entity !== undefined;

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 transition-opacity duration-200"
        style={{
          backgroundColor: "color-mix(in srgb, var(--ink, #1a1a1a) 15%, transparent)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          zIndex: 20,
        }}
        onClick={() => setEntityId(null)}
      />

      {/* Panel */}
      <div
        className="absolute top-0 right-0 bottom-0 flex flex-col bg-paper transition-transform duration-250 ease-out"
        style={{
          width: "calc(100% - 12px)",
          zIndex: 21,
          transform: isOpen ? "translateX(0)" : "translateX(100%)",
          borderLeft: "1px solid var(--border-primary)",
          boxShadow: isOpen ? "-4px 0 16px rgba(0,0,0,0.08)" : "none",
        }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--border-primary)" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <div
              className="w-2 h-2 rounded-[2px] shrink-0"
              style={{ backgroundColor: entityType?.color ?? "#6B7280" }}
            />
            <span className="text-sm font-semibold text-ink truncate">
              {entity?.title}
            </span>
          </div>
          <button
            onClick={() => setEntityId(null)}
            className="p-1.5 rounded-md hover:bg-warm text-ink-muted hover:text-ink transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Entity type badge */}
          <div>
            <EntityPill typeId={entity?.typeId ?? ""} size="md" />
          </div>

          {/* Metadata section */}
          <section className="rounded-lg p-3 space-y-3" style={{ backgroundColor: "var(--bg-warm)" }}>
            <h4 className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider">
              Metadata
            </h4>
            <div className="space-y-2.5">
              <MetaRow icon={Tag} label="Type" value={entityType?.name ?? "Unknown"} />
              <MetaRow icon={FileText} label="Title" value={entity?.title ?? ""} />
              <MetaRow icon={Calendar} label="Created" value="June 15, 2024" />
              <MetaRow icon={Link2} label="References" value={`${entityRefs.length} in this document`} />
            </div>
          </section>

          {/* References to this entity */}
          {entityRefs.length > 0 && (
            <section className="space-y-2">
              <h4 className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider">
                References in document
              </h4>
              <div>
                {entityRefs.map((ref) => (
                  <div
                    key={ref.id}
                    className="px-3 py-2.5 border-b border-border/50"
                  >
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <EntityPill typeId={entity?.typeId ?? ""} label={entity?.title} />
                      <PageTag page={ref.sourceSelection.page} />
                    </div>
                    <FadeTruncate
                      text={ref.sourceSelection.text}
                      maxLines={2}
                      className="text-xs text-ink-secondary leading-relaxed"
                    />
                    <div className="flex items-center mt-1">
                      <span className="text-[10px] text-ink-tertiary capitalize">
                        {ref.relationType.replace("_", " ")}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Placeholder sections */}
          <section className="space-y-2">
            <h4 className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider">
              Connections
            </h4>
            <div
              className="flex items-center justify-center py-6 rounded-md text-xs text-ink-tertiary"
              style={{ border: "1.5px dashed var(--border-soft)" }}
            >
              View all connections for this entity
            </div>
          </section>
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between h-12 px-3 shrink-0"
          style={{ borderTop: "1px solid var(--border-primary)" }}
        >
          <button
            onClick={() => setEntityId(null)}
            className="px-3 py-1.5 text-xs font-medium text-ink-secondary rounded-md border border-border hover:bg-warm transition-colors"
          >
            Close
          </button>
          <button className="px-3 py-1.5 text-xs font-medium text-white rounded-md transition-colors"
            style={{ backgroundColor: "var(--ink)" }}
          >
            Open entity
          </button>
        </div>
      </div>
    </>
  );
}

function MetaRow({ icon: Icon, label, value }: { icon: typeof Tag; label: string; value: string }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={12} className="text-ink-tertiary mt-0.5 shrink-0" />
      <div className="min-w-0">
        <span className="text-[10px] text-ink-tertiary">{label}</span>
        <p className="text-xs text-ink-secondary">{value}</p>
      </div>
    </div>
  );
}
