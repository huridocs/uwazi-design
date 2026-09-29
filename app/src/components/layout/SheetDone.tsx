import { COMMIT_FILL } from "../shared/warmButton";

/** The footer commit of a phone settings sheet (Display, View): the changes
 *  already apply as they are made, so Done only closes. Full width, 44px. */
export function SheetDone({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" data-part="done" onClick={onClick} className={`w-full h-11 rounded-md text-sm font-medium ${COMMIT_FILL} transition-colors cursor-pointer`}>
      Done
    </button>
  );
}
