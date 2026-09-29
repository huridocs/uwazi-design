/* Messages between the builder and its preview frame. Same origin only; both
 * sides check it. Nothing reaches the public site until Publish. */
import type { SiteConfig } from "../model/config";
import type { Route } from "../render/context";

export type ToFrame = { type: "sites:config"; config: SiteConfig; route: Route; selected?: string };
export type FromFrame =
  | { type: "sites:ready" }
  | { type: "sites:select"; id: string }
  | { type: "sites:navigate"; route: Route };

export const isFromFrame = (d: unknown): d is FromFrame => !!d && typeof d === "object" && String((d as { type?: string }).type).startsWith("sites:");
