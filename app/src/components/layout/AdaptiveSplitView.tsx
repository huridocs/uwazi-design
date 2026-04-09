import { ReactNode, useState } from "react";
import { useAtom } from "jotai";
import { breakpointAtom } from "../../atoms/viewport";
import { SplitView } from "./SplitView";
import { MobileBottomSheet } from "./MobileBottomSheet";

interface AdaptiveSplitViewProps {
  left: ReactNode;
  right: ReactNode;
  defaultRightWidth?: number;
  minRightWidth?: number;
  maxRightWidth?: number;
  /** Title shown in the mobile bottom sheet */
  mobileSheetTitle?: string;
  /** Render-prop that receives the open function so callers can place a trigger inside `left` */
  mobileLeft?: (open: () => void) => ReactNode;
}

export function AdaptiveSplitView({
  left,
  right,
  defaultRightWidth,
  minRightWidth,
  maxRightWidth,
  mobileSheetTitle,
  mobileLeft,
}: AdaptiveSplitViewProps) {
  const [breakpoint] = useAtom(breakpointAtom);
  const [sheetOpen, setSheetOpen] = useState(false);

  if (breakpoint === "mobile") {
    return (
      <>
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            {mobileLeft ? mobileLeft(() => setSheetOpen(true)) : left}
          </div>
        </div>
        <MobileBottomSheet
          open={sheetOpen}
          onClose={() => setSheetOpen(false)}
          title={mobileSheetTitle}
        >
          {right}
        </MobileBottomSheet>
      </>
    );
  }

  return (
    <SplitView
      left={left}
      right={right}
      defaultRightWidth={defaultRightWidth}
      minRightWidth={minRightWidth}
      maxRightWidth={maxRightWidth}
    />
  );
}
