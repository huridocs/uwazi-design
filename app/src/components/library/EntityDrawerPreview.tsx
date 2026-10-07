import { useEffect } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { overlayStackBase } from "../../atoms/rightPane";
import { closeAllOverlaysAtom } from "../../atoms/entityPreview";
import { libraryOpenEntityIdAtom } from "../../atoms/library";
import { openEntityAtom, focusEntityForPreviewAtom } from "../../atoms/focusedEntity";
import { EntityDetailBody } from "../entity/EntityDetailBody";
import { EntityPreviewSlideOver } from "../relationships/EntityPreviewSlideOver";
import { useDirtyGuard } from "../../hooks/useDirtyGuard";
import { draftEntityIdAtom } from "../../atoms/entityChanges";
import { useLibraryPane } from "./libraryPane";

/** The right-drawer entity preview. Selecting a library entity focuses it (see
 *  {@link focusEntityForPreviewAtom}) and renders the shared entity detail body
 *  — the same main-tab navigation (Document / Metadata / Relationships / Files)
 *  as the full entity view, with the drawer-flavoured body for each tab, which
 *  the connection overlay renders too. "View entity" navigates into the
 *  full-screen entity; Close returns the drawer to Filters. */
export function EntityDrawerPreview({ entityId }: { entityId: string }) {
  const setSelected = useSetAtom(libraryOpenEntityIdAtom);
  const openEntity = useSetAtom(openEntityAtom);
  const focusForPreview = useSetAtom(focusEntityForPreviewAtom);
  const stackDepth = useAtomValue(overlayStackBase).length;
  const closeAll = useSetAtom(closeAllOverlaysAtom);
  /* In a Split pane the preview takes the slide-over's flavour: Metadata and
     Relationships, and "View entity" for the rest. Two panes would fight over
     the global focus, which the Document, Files and edit surfaces read. A new
     record (Create entity) is the exception: it is only a form, and the form
     waits for the focus. */
  const inPane = !!useLibraryPane();
  const isDraft = useAtomValue(draftEntityIdAtom) === entityId;
  const focuses = !inPane || isDraft;

  // Safety net: keep the focused entity in sync with the previewed one even if
  // selection changed without going through LibraryView's handler. The focus is
  // what lets this flavour offer the Document, Files and edit surfaces.
  useEffect(() => {
    if (focuses) focusForPreview(entityId);
  }, [entityId, focusForPreview, focuses]);

  // Leaving the drawer while an edit is dirty is a navigation like any other, so
  // Close runs through the dirty guard and gets the discard-confirm instead of
  // dropping the edits on the floor.
  const guard = useDirtyGuard();
  const close = () => guard(() => setSelected(null));

  return (
    <EntityDetailBody
      entityId={entityId}
      focused={focuses}
      onClose={close}
      closeLabel="Back to filters"
      onOpen={() => openEntity(entityId)}
      openLabel="View entity"
      overlay={<EntityPreviewSlideOver />}
      covered={{ on: stackDepth > 0, onBack: closeAll }}
    />
  );
}
