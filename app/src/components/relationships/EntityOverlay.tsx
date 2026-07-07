import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { activeAggregateIdAtom, overlayEntityIdAtom, referencesAtom } from "../../atoms/references";
import { languageAtom } from "../../atoms/language";
import { entityMetadataAtom, setEntityPropAtom } from "../../atoms/entityMetadata";
import { openEntityAtom } from "../../atoms/focusedEntity";
import { getEntity } from "../../data/entities";
import { relationshipFieldsByLanguage, type MetadataField } from "../../data/metadata";
import { getEntityProfile } from "../../data/entityProfiles";
import { EntityPill } from "../shared/EntityPill";
import { PageTag } from "../shared/PageTag";
import { FadeTruncate } from "../shared/FadeTruncate";
import { EditInput } from "../metadata/EditInput";
import { X, Link2, Calendar, Tag, Info } from "lucide-react";

/** ISO date (YYYY-MM-DD) → "June 30, 2024". Renders in UTC so the seeded date
 *  doesn't drift a day across timezones. Falls back to em-dash when absent. */
function formatCreated(iso: string | undefined): string {
  if (!iso) return "—";
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function EntityOverlay() {
  const [entityId, setEntityId] = useAtom(overlayEntityIdAtom);
  const [references] = useAtom(referencesAtom);
  const setActiveAggregateId = useSetAtom(activeAggregateIdAtom);
  const lang = useAtom(languageAtom)[0];
  const rtl = lang === "AR";
  const entityMetadata = useAtomValue(entityMetadataAtom);
  const setEntityProp = useSetAtom(setEntityPropAtom);
  const openEntity = useSetAtom(openEntityAtom);
  // One ref serves both the focus trap and the outside-click check.
  const panelRef = useFocusTrap<HTMLDivElement>(entityId !== null);
  // Inert while closed — the panel stays mounted off-pane and its controls
  // must not be tabbable (focusing one force-scrolls hidden overflow).
  useEffect(() => {
    panelRef.current?.toggleAttribute("inert", entityId === null);
  }, [entityId, panelRef]);
  // Properties are read-only on open (this is a preview); editing is opt-in.
  const [editingProps, setEditingProps] = useState(false);

  // Clear the per-aggregate selection highlight whenever the overlay closes.
  useEffect(() => {
    if (entityId === null) setActiveAggregateId(null);
  }, [entityId, setActiveAggregateId]);

  // Reset to read-only whenever a different entity is opened.
  useEffect(() => {
    setEditingProps(false);
  }, [entityId]);

  const entity = entityId ? getEntity(entityId) : undefined;

  // References that point to this entity
  const entityRefs = entityId
    ? references.filter((r) => r.targetEntityId === entityId)
    : [];

  // Editable native properties — the values other entities inherit from this
  // one. The list is the union of (a) props this entity already has and (b)
  // inheritable props any relationship field pulls from this entity's type, so a
  // *missing* value (e.g. e19) still shows an empty, fillable row. Editing a row
  // writes the atom and cascades into every inherited render.
  const editableProps =
    entityId && entity
      ? (() => {
          const live = entityMetadata[lang]?.[entityId] ?? {};
          const labels = new Map<string, string>();
          for (const f of relationshipFieldsByLanguage[lang]) {
            if (f.targetTypeId === entity.typeId && f.inheritProperty) {
              labels.set(f.inheritProperty, f.inheritLabel ?? f.inheritProperty);
            }
          }
          for (const k of Object.keys(live)) {
            if (!labels.has(k)) labels.set(k, k.charAt(0).toUpperCase() + k.slice(1));
          }
          return [...labels.entries()].map(([propId, label]) => ({
            propId,
            label,
            value: live[propId] ?? "",
          }));
        })()
      : [];

  // Entities outside the Sample metadata atom (CEJIL) still have real native
  // properties on their profile — surface them read-only so the overlay never
  // silently drops the Properties section. (CEJIL "inherited" values like a
  // judge's País are graph-derived, not scalar props, so there's nothing to
  // edit here — display is the right scope.)
  const readOnlyProps =
    entityId && editableProps.length === 0
      ? getEntityProfile(entityId)
          .metadata[lang].filter(
            (f): f is MetadataField => f.type !== "relationship"
          )
          .filter((f) => !!f.value?.trim())
          .map((f) => ({ propId: f.id, label: f.label, value: f.value! }))
      : [];

  const isOpen = entityId !== null && entity !== undefined;

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      const panel = panelRef.current;
      if (!panel) return;
      if (panel.contains(e.target as Node)) return;
      setEntityId(null);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setEntityId(null);
    };
    // Defer one tick so the click that opened the overlay doesn't immediately close it.
    const t = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown);
      document.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen, setEntityId]);

  return (
    <>
      {/* Backdrop */}
      <div
        className="absolute inset-0 transition-opacity duration-200"
        style={{
          backgroundColor: "color-mix(in srgb, var(--text-primary) 15%, transparent)",
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          zIndex: 20,
        }}
        onClick={() => setEntityId(null)}
      />

      {/* Panel — anchored to the inline end so it flips sides under RTL. */}
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={entity?.title ?? "Entity details"}
        className={`absolute top-0 bottom-0 flex flex-col bg-paper transition-transform duration-250 ease-out ${
          rtl ? "left-0" : "right-0"
        }`}
        style={{
          width: "calc(100% - 0.75rem)",
          zIndex: 21,
          transform: isOpen
            ? "translateX(0)"
            : rtl
              ? "translateX(-100%)"
              : "translateX(100%)",
          borderInlineStart: "1px solid var(--border-primary)",
          boxShadow: isOpen
            ? `${rtl ? "4px" : "-4px"} 0 16px rgba(0,0,0,0.08)`
            : "none",
        }}
      >
        {/* Header */}
        <div
          className="flex items-start justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: "1px solid var(--border-primary)" }}
        >
          {/* Type tag stacked above the title — the tag's dot carries the
              entity colour, so no separate dot. */}
          <div className="min-w-0 space-y-1">
            <div>
              <EntityPill typeId={entity?.typeId ?? ""} />
            </div>
            <div className="text-sm font-semibold text-ink truncate">
              {entity?.title}
            </div>
          </div>
          <button
            onClick={() => setEntityId(null)}
            aria-label="Close"
            className="p-1.5 rounded-md hover:bg-warm text-ink-muted hover:text-ink transition-colors shrink-0"
          >
            <X size={16} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-auto p-4 space-y-4">
          {/* Metadata section — Type/Title live in the header + EntityPill above,
              so this shows only the non-redundant facts: real creation date and
              how many references in this document point at the entity. */}
          <section className="rounded-lg p-3 space-y-3" style={{ backgroundColor: "var(--bg-warm)" }}>
            <h4 className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider">
              Metadata
            </h4>
            <div className="space-y-2.5">
              {/* Only when we actually have a date — a bare em-dash row reads as a
                  rendering gap (CEJIL entities carry no createdAt). */}
              {entity?.createdAt && (
                <MetaRow icon={Calendar} label="Created" value={formatCreated(entity.createdAt)} />
              )}
              <MetaRow icon={Link2} label="References" value={`${entityRefs.length} in this document`} />
            </div>
          </section>

          {/* Native properties — the values other entities inherit from this
              one. Read-only on open (preview); "Edit" reveals inputs, and each
              change cascades to every inherited render (all resolve through
              entityMetadataAtom). Profile-only entities (CEJIL) show their
              props read-only, no Edit toggle. */}
          {entityId && (editableProps.length > 0 || readOnlyProps.length > 0) && (
            <section className="rounded-lg p-3 space-y-3" style={{ backgroundColor: "var(--bg-warm)" }}>
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider">
                  Properties
                </h4>
                {editableProps.length > 0 && (
                  <button
                    onClick={() => setEditingProps((v) => !v)}
                    className="text-[11px] font-medium text-ink-secondary hover:text-ink transition-colors cursor-pointer"
                  >
                    {editingProps ? "Done" : "Edit"}
                  </button>
                )}
              </div>
              {editingProps && editableProps.length > 0 ? (
                <>
                  <div className="space-y-2.5">
                    {editableProps.map(({ propId, label, value }) => (
                      <div key={propId} className="space-y-1">
                        <span className="text-[10px] text-ink-tertiary leading-tight block">{label}</span>
                        <EditInput
                          value={value}
                          ariaLabel={label}
                          placeholder="Add a value…"
                          onChange={(v) => setEntityProp({ entityId, propId, lang, value: v })}
                        />
                      </div>
                    ))}
                  </div>
                  <p className="flex items-start gap-1.5 text-[11px] text-ink-tertiary">
                    <Info size={12} className="text-carbon shrink-0 mt-px" />
                    Editing the source updates inherited values.
                  </p>
                </>
              ) : (
                <div className="space-y-2.5">
                  {(editableProps.length > 0 ? editableProps : readOnlyProps).map(
                    ({ propId, label, value }) => (
                      <MetaRow key={propId} icon={Tag} label={label} value={value || "—"} />
                    )
                  )}
                </div>
              )}
            </section>
          )}

          {/* References to this entity */}
          {entityRefs.length > 0 && (
            <section className="space-y-2">
              <h4 className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider">
                References in document
              </h4>
              <div>
                {entityRefs.map((ref) => {
                  const sourceEntity = getEntity(ref.sourceEntityId);
                  return (
                    <div
                      key={ref.id}
                      className="px-3 py-2.5 border-b border-border/50"
                    >
                      {ref.sourceSelection ? (
                        <>
                          <div className="flex items-start justify-end gap-2 mb-1.5">
                            <PageTag page={ref.sourceSelection.page} />
                          </div>
                          <FadeTruncate
                            text={ref.sourceSelection.text}
                            maxLines={2}
                            className="text-xs text-ink-secondary leading-relaxed"
                          />
                        </>
                      ) : (
                        // Entity-level ref: no quote, so surface the source
                        // entity instead of an empty body. Tells the user
                        // who created this connection without leaning on an
                        // "Entity-level" placeholder label.
                        <div className="flex items-center gap-1.5 mb-1">
                          <span className="text-[10px] text-ink-tertiary">From</span>
                          <EntityPill
                            typeId={sourceEntity?.typeId ?? ""}
                            label={sourceEntity?.title}
                            size="sm"
                          />
                        </div>
                      )}
                      <div className="flex items-center mt-1">
                        <span className="text-[10px] text-ink-tertiary capitalize">
                          {ref.relationType.replace("_", " ")}
                        </span>
                      </div>
                    </div>
                  );
                })}
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
            className="px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
          >
            Close
          </button>
          <button
            onClick={() => {
              if (entityId) openEntity(entityId);
              setEntityId(null);
            }}
            className="px-3 py-1.5 text-xs font-medium text-white rounded-md transition-colors cursor-pointer"
            style={{ backgroundColor: "var(--text-primary)" }}
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
    <div className="flex items-center gap-2.5">
      <Icon size={14} className="text-ink-tertiary shrink-0" />
      <div className="min-w-0">
        <span className="text-[10px] text-ink-tertiary leading-tight block">{label}</span>
        <p className="text-xs text-ink-secondary leading-tight">{value}</p>
      </div>
    </div>
  );
}
