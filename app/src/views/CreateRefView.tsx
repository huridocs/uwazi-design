/** Placeholder for the full source→target relationship creation flow.
 *  CreateRelationshipModal currently handles this inline; this view exists
 *  for a future dedicated multi-step creation page. */
export function CreateRefView() {
  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-ink-muted text-sm">
        Create relationship — select text in the document to start
      </p>
    </div>
  );
}
