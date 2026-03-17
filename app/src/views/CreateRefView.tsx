/** Placeholder for the full source→target reference creation flow.
 *  Currently the EntityPickerModal handles this inline.
 *  This view would be used for a dedicated multi-step creation page.
 */
export function CreateRefView() {
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-ink-muted text-sm">
        Create Reference flow — select text in the document to start
      </p>
    </div>
  );
}
