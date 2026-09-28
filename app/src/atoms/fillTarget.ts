import { atom } from "jotai";

/** Click-to-fill: the metadata input that is listening for a value.
 *
 *  Finding the value (selecting a passage, clicking a property in a source
 *  preview) blurs the input, so "armed" is latched here rather than read from
 *  focus. It ends on a fill, Escape, arming a different field, or the edit form
 *  unmounting (Save / Cancel). Anything that arms this must clear it on unmount,
 *  or the armed state outlives the form that owns it. */
export interface FillTarget {
  /** Which edit session armed it. Two `MetadataEditBody`s can be mounted at
   *  once (Metadata view and Library drawer preview) on the same entity, so a
   *  bare `fieldId` would make both sessions apply the value. */
  sessionId: string;
  /** `MetadataField.id`, or `"title"` for the title box. */
  fieldId: string;
  /** What the field is called, for the "fill Description" wording on the
   *  source side, which is usually a different pane. */
  label: string;
}

export const fillTargetAtom = atom<FillTarget | null>(null);

/** A pending fill, addressed to a field. `nonce` makes every request distinct,
 *  so filling the same field with the same text twice still fires; the same
 *  value-plus-nonce shape as `scrollToPageAtom`. It is a value, not a callback:
 *  the form that applies it is shorter-lived than this atom, and a stored
 *  closure could call setState on an unmounted form. */
export interface FillRequest {
  /** Copied from the armed target, so the request is addressed to one session.
   *  A form that didn't arm the field ignores it. */
  sessionId: string;
  fieldId: string;
  value: string;
  nonce: number;
}

const fillRequestStateAtom = atom<FillRequest | null>(null);
let fillNonce = 0;

/** Write a string to fill the armed field, or `null` to clear a spent request.
 *  Filling disarms, so a later text selection cannot overwrite the value. */
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
