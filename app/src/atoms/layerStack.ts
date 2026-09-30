import { atom } from "jotai";

/** Every overlay layer that is open, bottom first, on any breakpoint: the
 *  entity slide-over's layers (`EntityOverlay`), `Modal`, `AgentModal`.
 *
 *  The desktop counterpart of `sheetStackAtom`. Overlays that close on an
 *  outside press or on Escape listen on the document, and a layer drawn on top
 *  of them (a dialog or Bert portalled to `<body>`) is "outside" by DOM position
 *  even though it covers them. One rule instead of per-component guards: a
 *  document handler acts only when its layer is the top of this stack. Register
 *  with `useOverlayLayer`. */
export const layerStackAtom = atom<string[]>([]);
