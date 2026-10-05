import { lazy } from "react";

/** `MediaItemCard` as its own chunk: only the Nepal collection's media items
 *  draw it, so the app bundle does not carry it. The Library fetches it when
 *  that collection loads (`preloadMediaItemCard`), so a record that needs it
 *  finds it there. */
const load = () => import("./MediaItemCard");

export const LazyMediaItemCard = lazy(() => load().then((m) => ({ default: m.MediaItemCard })));

export const preloadMediaItemCard = () => {
  void load();
};
