import { useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { overlayStackBase } from "../../atoms/rightPane";
import { closeAllOverlaysAtom } from "../../atoms/references";
import { librarySelectedEntityIdAtom } from "../../atoms/library";
import { openEntityAtom, focusEntityForPreviewAtom } from "../../atoms/focusedEntity";
import { EntityDetailBody } from "../entity/EntityDetailBody";
import { EntityOverlay } from "../relationships/EntityOverlay";
import { useDirtyGuard } from "../../hooks/useDirtyGuard";

/** The right-drawer entity preview. Selecting a library entity focuses it (see
 *  {@link focusEntityForPreviewAtom}) and renders the shared entity detail body
 *  — the same main-tab navigation (Document / Metadata / Relationships / Files)
 *  as the full entity view, with the drawer-flavoured body for each tab, which
 *  the connection overlay renders too. "View entity" navigates into the
 *  full-screen entity; Close returns the drawer to Filters. */
export function EntityDrawerPreview({ entityId }: { entityId: string }) {
  const setSelected = useSetAtom(librarySelectedEntityIdAtom);
  const openEntity = useSetAtom(openEntityAtom);
  const focusForPreview = useSetAtom(focusEntityForPreviewAtom);
  const stackDepth = useAtomValue(overlayStackBase).length;
  const closeAll = useSetAtom(closeAllOverlaysAtom);

  // Safety net: keep the focused entity in sync with the previewed one even if
  // selection changed without going through LibraryView's handler. The focus is
  // what lets this flavour offer the Document, Files and edit surfaces.
  useEffect(() => {
    focusForPreview(entityId);
  }, [entityId, focusForPreview]);

  // Leaving the drawer while an edit is dirty is a navigation like any other, so
  // Close runs through the dirty guard and gets the discard-confirm instead of
  // dropping the edits on the floor.
  const guard = useDirtyGuard();
  const close = () => guard(() => setSelected(null));

  return (
    <EntityDetailBody
      entityId={entityId}
      focused
      onClose={close}
      closeLabel="Back to filters"
      onOpen={() => openEntity(entityId)}
      openLabel="View entity"
      overlay={<EntityOverlay />}
      covered={{ on: stackDepth > 0, onBack: closeAll }}
    />
  );
}
