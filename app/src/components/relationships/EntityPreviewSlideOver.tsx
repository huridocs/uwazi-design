import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { breakpointAtom } from "../../atoms/viewport";
import { useEffect, useState } from "react";
import { useFocusTrap } from "../../hooks/useFocusTrap";
import { useOverlayLayer } from "../../hooks/useOverlayLayer";
import { useHostDrawerWidth } from "../../hooks/useDrawerWidth";
import { activeAggregateIdAtom } from "../../atoms/references";
import { languageAtom } from "../../atoms/language";
import { openEntityAtom } from "../../atoms/focusedEntity";
import { getEntity } from "../../data/entities";
import { EntityDetailBody } from "../entity/EntityDetailBody";
import { closeAllOverlaysAtom, previewEntityIdAtom } from "../../atoms/entityPreview";
import { overlayEntityBase, overlayStackBase } from "../../atoms/rightPane";

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
export function EntityPreviewSlideOver() {
  // On a phone the overlay is a bottom sheet on the shared stack, drawn once by
  // `MobileOverlayStack` in the app shell; the hosts that mount this draw nothing.
  const mobile = useAtomValue(breakpointAtom) === "mobile";
  return mobile ? null : <PaneEntityOverlay />;
}

function PaneEntityOverlay() {
  return <OverlayLayer depth={0} />;
}

/** Layers narrow by this much per level from the start edge, so the layers
 *  beneath show as edges; deeper than MAX_STEP levels they stop narrowing. */
const STEP_REM = 1;
const MAX_STEP = 3;

/** One layer of the desktop preview stack (`overlayStackBase`, the model the
 *  phone's sheets use). Layer 0 covers its host; each deeper layer is mounted
 *  in the layer below's `overlay` slot, so it starts under that layer's title
 *  row (the titles read as a hierarchy, top to bottom) and runs to the bottom
 *  edge, 1rem narrower from the start edge. A pill inside a layer pushes the
 *  next one; Back, × and Escape pop one; "Close all" appears from the second
 *  layer; a click on a covered title returns to that layer. */
function OverlayLayer({ depth }: { depth: number }) {
  const stack = useAtomValue(overlayStackBase);
  const setPreview = useSetAtom(previewEntityIdAtom);
  const setStack = useSetAtom(overlayStackBase);
  const setTop = useSetAtom(overlayEntityBase);
  const closeAll = useSetAtom(closeAllOverlaysAtom);
  const setActiveAggregateId = useSetAtom(activeAggregateIdAtom);
  const lang = useAtom(languageAtom)[0];
  const rtl = lang === "AR";
  const openEntity = useSetAtom(openEntityAtom);
  const drawerWidth = useHostDrawerWidth();
  const entityId = stack[depth] ?? null;
  const isTop = entityId !== null && depth === stack.length - 1;
  const pop = () => setPreview(null);
  // Back to this layer: drop every layer above it.
  const backHere = () => {
    const next = stack.slice(0, depth + 1);
    setStack(next);
    setTop(next[next.length - 1] ?? null);
  };

  /* The body is mounted only while there is an entity to show — it carries a
     whole relationships surface. It lags the close by the slide-out so the
     panel doesn't empty on its way off-pane. */
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

  // Clear the per-aggregate selection highlight whenever the stack empties.
  useEffect(() => {
    if (depth === 0 && entityId === null) setActiveAggregateId(null);
  }, [depth, entityId, setActiveAggregateId]);

  const entity = entityId ? getEntity(entityId) : undefined;
  const isOpen = entityId !== null && entity !== undefined;

  // Only the top layer answers Escape and outside clicks: one press, one layer.
  // A click outside every layer (outside layer 0) closes them all. "Top" is
  // the app's layer stack, not this preview stack: while a lightbox or a dialog
  // sits above this layer, a press on it is that layer's, even though it lands
  // outside this panel in the DOM.
  const layer = useOverlayLayer(isOpen);
  useEffect(() => {
    if (!isTop) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!layer.isTopNow()) return;
      const panel = panelRef.current;
      if (!panel || panel.contains(e.target as Node)) return;
      const root = panel.closest("[data-overlay-root]");
      if (root && root.contains(e.target as Node)) pop();
      else closeAll();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !e.defaultPrevented && layer.isTopNow()) pop();
    };
    // Defer one tick so the click that opened the layer doesn't close it.
    const t = window.setTimeout(() => {
      document.addEventListener("pointerdown", onPointerDown);
      document.addEventListener("keydown", onKey);
    }, 0);
    return () => {
      window.clearTimeout(t);
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  });

  const step = Math.min(depth, MAX_STEP);
  const width =
    depth === 0
      ? drawerWidth === null
        ? "calc(100% - 0.75rem)"
        : `calc(${drawerWidth}px - 0.75rem)`
      : `calc(100% - ${step > 0 && depth <= MAX_STEP ? STEP_REM : 0}rem)`;

  return (
    <>
      {/* Backdrop: layer 0 dims the host; deeper layers dim the layer below. */}
      <div
        data-component="EntityPreviewSlideOver"
        data-part="scrim"
        className="absolute inset-0 transition-opacity duration-200"
        style={{
          backgroundColor: `color-mix(in srgb, var(--text-primary) ${depth === 0 ? 15 : 8}%, transparent)`,
          opacity: isOpen ? 1 : 0,
          pointerEvents: isOpen ? "auto" : "none",
          zIndex: 20,
        }}
        onClick={() => (depth === 0 ? closeAll() : pop())}
      />

      {/* Panel — anchored to the inline end so it flips sides under RTL. */}
      <div
        ref={panelRef}
        role="dialog"
        data-component="EntityPreviewSlideOver"
        data-layer={depth}
        {...(depth === 0 ? { "data-overlay-root": "" } : {})}
        tabIndex={-1}
        aria-modal="true"
        aria-label={entity?.title ?? "Entity details"}
        className={`absolute top-0 bottom-0 flex flex-col bg-paper transition-transform duration-250 ease-out ${
          rtl ? "left-0" : "right-0"
        }`}
        style={{
          /* Layer 0: the remembered drawer width, less the 0.75rem strip that
             shows the panel is stacked on something. Deeper layers: 1rem
             narrower than the layer below, from the start edge, capped. */
          width,
          maxWidth: depth === 0 ? "calc(100% - 0.75rem)" : undefined,
          zIndex: 21,
          transform: isOpen ? "translateX(0)" : rtl ? "translateX(-100%)" : "translateX(100%)",
          borderInlineStart: "1px solid var(--border-primary)",
          boxShadow: isOpen ? `${rtl ? "4px" : "-4px"} 0 16px rgba(0,0,0,0.08)` : "none",
        }}
      >
        {bodyId && (
          <EntityDetailBody
            entityId={bodyId}
            identitySize="sm"
            // From the second layer: the header's close is "Close all" and the
            // footer's is Back, as on the phone's sheet stack.
            onClose={depth > 0 ? closeAll : pop}
            stackedBack={depth > 0 ? { onBack: pop, label: stack[depth - 1] ? getEntity(stack[depth - 1])?.title : undefined } : undefined}
            onOpen={() => {
              openEntity(bodyId);
              closeAll();
            }}
            openLabel="Open entity"
            overlay={<OverlayLayer depth={depth + 1} />}
            covered={{ on: stack.length > depth + 1, onBack: backHere }}
          />
        )}
      </div>
    </>
  );
}
