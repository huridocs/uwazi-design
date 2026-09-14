import type { CSSProperties } from "react";

/** The frame and tab padding shared by `MainTabs` and `DrawerTabs`.
 *
 *  The two strips sit side by side in the entity view (MainTabs in the left
 *  pane, DrawerTabs in the right). When each carried its own copy, MainTabs had
 *  a drop shadow and 10px tab padding below 768px, and DrawerTabs had neither,
 *  so the left strip read about 1px taller and lower than the right one. One
 *  definition keeps them the same height and treatment.
 *
 *  The strip's top offset is not here: the host sets it (`tabstrip-slot`,
 *  `--tabstrip-top` in `index.css`). Focus uses the browser outline, which is
 *  drawn outside the box and does not change the strip's size. */
export const TAB_STRIP_FRAME: CSSProperties = {
  border: "1px solid var(--border-primary)",
  boxShadow: "0 1px 2px rgba(0,0,0,0.08)",
};

export const TAB_BUTTON =
  "relative flex items-center justify-center gap-1 px-3 py-1.5 text-tab font-medium transition-colors";
