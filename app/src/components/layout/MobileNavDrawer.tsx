import { ReactNode } from "react";
import { MobileBottomSheet } from "./MobileBottomSheet";

interface MobileNavDrawerProps {
  open: boolean;
  onClose: () => void;
  children: ReactNode;
}

/** Wrapper around MobileBottomSheet for navigation menus.
 *  Exists as a named alias so per-feature usage stays semantic. */
export function MobileNavDrawer({ open, onClose, children }: MobileNavDrawerProps) {
  return (
    <MobileBottomSheet open={open} onClose={onClose} title="Menu" defaultSnap="half">
      {children}
    </MobileBottomSheet>
  );
}
