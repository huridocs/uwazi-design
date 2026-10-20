import { createContext, useContext } from "react";

/** Whether the view's drawer is drawn beside it. `SplitView` says so for the
 *  content it hosts; a phone (the drawer's sections open as sheets) and a
 *  Split pane too narrow for a drawer say no. A bar that would repeat the
 *  drawer's actions reads this, not the viewport. */
export const DrawerDrawnContext = createContext(false);

export const useDrawerDrawn = () => useContext(DrawerDrawnContext);
