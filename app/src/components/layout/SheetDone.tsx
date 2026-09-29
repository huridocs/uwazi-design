/** The footer commit of a phone settings sheet (Display, View): the changes
 *  already apply as they are made, so Done only closes. Full width, 44px,
 *  solid ink (the commit rung of the bar ladder in warmButton.ts). */
export function SheetDone({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" data-part="done" onClick={onClick} className="w-full h-11 rounded-md text-sm font-medium bg-ink text-paper hover:bg-ink/90 transition-colors cursor-pointer">
      Done
    </button>
  );
}
