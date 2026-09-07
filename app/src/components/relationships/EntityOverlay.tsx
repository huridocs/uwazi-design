import { useAtom, useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { copyPreviewAtom } from "../../atoms/copyFrom";
import { CopyPreviewSection } from "../metadata/CopyPreviewSection";
import { activeAggregateIdAtom, overlayEntityIdAtom } from "../../atoms/references";
import { languageAtom } from "../../atoms/language";
import { openEntityAtom } from "../../atoms/focusedEntity";
import { getEntity } from "../../data/entities";
import { EntityDetailBody } from "../entity/EntityDetailBody";

/** The connected-entity preview: a slide-over inside whichever pane mounts it,
 *  opened by any row, pill or graph node that points at another entity.
 *
 *  Its body is the SHARED {@link EntityDetailBody} — the same tabs, bodies and
 *  footer the Library's drawer preview renders — so the app has one answer to
 *  "show me this entity beside what I'm reading". The difference is scope: this
 *  panel sits on top of a view focused on a DIFFERENT entity, so it must not
 *  move that focus. It passes `focused={false}` and the body scopes its
 *  connection surfaces by context instead (see `EntityScopeProvider`), which is
 *  also why the Document and Files tabs — which read the globally seeded file
 *  atoms — aren't offered here; "Open entity" is the route to those. */
export function EntityOverlay() {
  const [entityId, setEntityId] = useAtom(overlayEntityIdAtom);
  const [copyPreview, setCopyPreview] = useAtom(copyPreviewAtom);
  const setActiveAggregateId = useSetAtom(activeAggregateIdAtom);
  const lang = useAtom(languageAtom)[0];
  const rtl = lang === "AR";
  const openEntity = useSetAtom(openEntityAtom);
  /* The body is mounted only while there is an entity to show — it carries a
     whole relationships surface, and four hosts mount this overlay. It lags the
     close by the slide-out so the panel doesn't empty on its way off-pane. */
  const [bodyId, setBodyId] = useState<string | null>(entityId);
  useEffect(() => {
    if (entityId !== null) {
      setBodyId(entityId);
      return;
    }
    const t = window.setTimeout(() => setBodyId(null), 250);
    return () => window.clearTimeout(t);
  }, [entityId]);

  // One ref serves both the focus trap and the outside-click check. The trap
  // takes `bodyId` as its content key: the body mounts a tick after the panel
  // opens, so on the opening tick there is nothing inside to focus, and initial
  // focus has to run again once it lands.
  const panelRef = useFocusTrap<HTMLDivElement>(entityId !== null, bodyId);
  // Inert while closed — the panel stays mounted off-pane and its controls
  // must not be tabbable (focusing one force-scrolls hidden overflow).
  useEffect(() => {
    panelRef.current?.toggleAttribute("inert", entityId === null);
  }, [entityId, panelRef]);

  // Clear the per-aggregate selection highlight whenever the overlay closes.
  useEffect(() => {
    if (entityId === null) setActiveAggregateId(null);
  }, [entityId, setActiveAggregateId]);

  // And the Copy From preview with it. This panel is the ONLY thing that renders
  // a preview, so closing it — by any of the four exits, not just the two
  // buttons inside the block — ends that preview. Left set, it reappeared the
  // next time this entity was opened from anywhere, wired to an edit form that
  // had since been cancelled (see `copyPreviewAtom`).
  useEffect(() => {
    if (entityId === null) setCopyPreview(null);
  }, [entityId, setCopyPreview]);

  const entity = entityId ? getEntity(entityId) : undefined;
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
        // Focusable as a fallback target: the panel takes focus on the opening
        // tick, before its body exists, and hands it to the first control once
        // it does.
        tabIndex={-1}
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
        {bodyId && (
          <EntityDetailBody
            entityId={bodyId}
            identitySize="sm"
            onClose={() => setEntityId(null)}
            onOpen={() => {
              openEntity(bodyId);
              setEntityId(null);
            }}
            openLabel="Open entity"
            /* Copy From stages its source through this panel — the preview only
               belongs to the entity that was actually staged, so opening the
               same entity from anywhere else is unaffected. */
            banner={
              copyPreview && copyPreview.sourceId === bodyId ? (
                <CopyPreviewSection
                  plan={copyPreview.plan}
                  onUse={() => copyPreview.onUse()}
                  onBack={() => copyPreview.onBack()}
                />
              ) : undefined
            }
          />
        )}
      </div>
    </>
  );
}
