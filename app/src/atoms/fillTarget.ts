import { atom } from "jotai";

/** Click-to-fill: the metadata input that is LISTENING for a value.
 *
 *  The whole feature turns on one fact — you have to LEAVE the input to go find
 *  the value. Selecting a passage in the document, or clicking a property in a
 *  source entity's preview, blurs the field you were typing in. So "armed" is
 *  not focus: focus arms it, and the arm is latched here until something ends
 *  it. What ends it: a fill, Escape, arming a different field, or the edit form
 *  unmounting (Save / Cancel).
 *
 *  That last one is not optional. `copyPreviewAtom` had the same shape — state
 *  outliving the form that owns it — and left a dead Copy From panel rendering
 *  over a read-mode pane. Anything that arms this must clear it on unmount. */
export interface FillTarget {
  /** WHICH edit session armed it. Two `MetadataEditBody`s can be mounted at
   *  once — the full Metadata view and the Library drawer preview — and they
   *  edit the SAME entity, so a bare `fieldId` names a field in both. Without
   *  this, one armed field meant two writes: the session nobody armed applied
   *  the value too, and its copy of the row flashed as if the user had asked. */
  sessionId: string;
  /** `MetadataField.id`, or `"title"` for the title box. */
  fieldId: string;
  /** What the field is called, for the "fill Description" wording on the
   *  source side. The source is usually a different pane; naming the field is
   *  the only thing that makes the action legible from over there. */
  label: string;
}

export const fillTargetAtom = atom<FillTarget | null>(null);

/** A pending fill, addressed to a field. `nonce` makes every request distinct,
 *  so filling the same field with the same text twice still fires — the same
 *  signal shape `pageJumpAtom` uses.
 *
 *  A VALUE, deliberately, never a callback. The form that applies it is
 *  shorter-lived than this atom, and an atom holding its closures is precisely
 *  how the Copy From panel came to call setState on an unmounted form. */
export interface FillRequest {
  /** Copied from the armed target, so the request is addressed to ONE session.
   *  A form that didn't arm the field ignores it. */
  sessionId: string;
  fieldId: string;
  value: string;
  nonce: number;
}

const fillRequestStateAtom = atom<FillRequest | null>(null);
let fillNonce = 0;

/** Write a string to fill the armed field, or `null` to clear a spent request.
 *  Filling DISARMS: the field asked for one value and got it, and staying armed
 *  would make the next stray selection overwrite the answer. */
export const fillRequestAtom = atom(
  (get) => get(fillRequestStateAtom),
  (get, set, value: string | null) => {
    if (value === null) {
      set(fillRequestStateAtom, null);
      return;
    }
    const target = get(fillTargetAtom);
    if (!target) return;
    set(fillRequestStateAtom, {
      sessionId: target.sessionId,
      fieldId: target.fieldId,
      value,
      nonce: ++fillNonce,
    });
    set(fillTargetAtom, null);
  },
);
