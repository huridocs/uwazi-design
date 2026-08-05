import { atom } from "jotai";
import type { CopyPlan } from "../utils/copyFrom";

/** "Copy From" — the STAGING state, and nothing else.
 *
 *  Like Uwazi's, this flow never saves: it writes into the edit form the user is
 *  already in, and they still press Save. Unlike Uwazi's, nothing is written at
 *  the moment a source is picked either — picking opens a preview, and the copy
 *  lands only when the user commits a set of fields they have seen and can
 *  deselect. So there are two staged steps here, both abandonable, and neither
 *  touches the entity.
 *
 *  Only the PREVIEW lives in an atom. Everything downstream of the commit — the
 *  checked set, the copied values, which field came from where — is local to the
 *  edit form, because that is exactly the lifetime it has: cancelling the edit
 *  discards it with everything else, which is the behaviour we want and get for
 *  free. The preview is the one piece that has to cross a component boundary,
 *  since `EntityOverlay` is mounted by the view and driven by atoms. */
export interface CopyPreview {
  /** The entity being previewed as a copy source. */
  sourceId: string;
  /** Computed once when the source is picked — the overlay marks its fields
   *  from this rather than recomputing per render. */
  plan: CopyPlan;
  /** Stage the matched set into the edit form. The two callbacks ride the atom
   *  because the overlay is mounted by the view and takes no props; they are
   *  closures owned by the edit form, which is where the staged state lives and
   *  where it has to die when the edit is cancelled. */
  onUse: () => void;
  /** Back to the picker, staging nothing. */
  onBack: () => void;
}

/** Set while a source is being previewed in `EntityOverlay`; null otherwise.
 *  The overlay renders its Copy From section only when this names the entity it
 *  is showing, so opening the same entity from anywhere else is unaffected. */
export const copyPreviewAtom = atom<CopyPreview | null>(null);
