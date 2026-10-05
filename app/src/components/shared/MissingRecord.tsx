import { AlertBanner } from "./AlertBanner";

/** An editor whose record is gone: deleted elsewhere, or the demo data was
 *  reset while it was open. Save stays off, so it cannot re-create it. */
export function MissingRecord({ noun }: { noun: string }) {
  return (
    <AlertBanner variant="warning">
      This {noun} no longer exists. It was deleted, or the demo data was reset. Go back to the list.
    </AlertBanner>
  );
}
