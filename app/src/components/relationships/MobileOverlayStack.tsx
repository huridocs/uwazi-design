import { useEffect, useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { overlayStackBase } from "../../atoms/rightPane";
import { closeAllOverlaysAtom, overlayEntityIdAtom } from "../../atoms/references";
import { openEntityAtom } from "../../atoms/focusedEntity";
import { breakpointAtom } from "../../atoms/viewport";
import { getEntity } from "../../data/entities";
import { MobileBottomSheet } from "../layout/MobileBottomSheet";
import { EntityDetailBody } from "../entity/EntityDetailBody";

/** The connection overlay on a phone: one bottom sheet per entity on the
 *  overlay stack (`overlayStackBase`), each on the shared sheet stack, so a
 *  connected entity opened from inside a preview lands on top of it and Back
 *  returns to it.
 *
 *  Mounted ONCE, in the app shell. On desktop `EntityOverlay` is a slide-over
 *  inside whichever pane mounts it (four do); on a phone those hosts render
 *  nothing and this draws the stack, so a sheet can't be drawn twice. */
export function MobileOverlayStack() {
  const mobile = useAtomValue(breakpointAtom) === "mobile";
  const stack = useAtomValue(overlayStackBase);
  const setOverlay = useSetAtom(overlayEntityIdAtom);
  const closeAll = useSetAtom(closeAllOverlaysAtom);
  const openEntity = useSetAtom(openEntityAtom);

  /* A popped layer stays mounted, closed, for its slide-out, so the sheet
     doesn't empty on its way down. */
  const [leaving, setLeaving] = useState<string[]>([]);
  const prev = useRef<string[]>(stack);
  useEffect(() => {
    const gone = prev.current.filter((id) => !stack.includes(id));
    prev.current = stack;
    if (gone.length === 0) return;
    setLeaving((l) => [...l, ...gone]);
    const t = window.setTimeout(() => setLeaving((l) => l.filter((id) => !gone.includes(id))), 260);
    return () => window.clearTimeout(t);
  }, [stack]);

  if (!mobile) return null;
  const layers = [...stack.map((id) => ({ id, open: true })), ...leaving.map((id) => ({ id, open: false }))];

  return (
    <>
      {layers.map(({ id, open }) => (
        <MobileBottomSheet
          key={id}
          open={open}
          bare
          ariaLabel={getEntity(id)?.title ?? "Entity details"}
          onClose={() => setOverlay(null)}
        >
          {(chrome) => (
            <EntityDetailBody
              entityId={id}
              identitySize="sm"
              // Back (layers above the first) pops one; × pops this sheet on the
              // first layer and closes the whole stack above it.
              leading={chrome.back}
              onClose={chrome.close}
              closeLabel={chrome.closeLabel}
              onOpen={() => {
                openEntity(id);
                closeAll();
              }}
              openLabel="Open entity"
            />
          )}
        </MobileBottomSheet>
      ))}
    </>
  );
}
