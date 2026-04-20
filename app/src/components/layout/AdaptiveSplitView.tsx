import { ReactNode, useState } from "react";
import { useAtom } from "jotai";
import { breakpointAtom } from "../../atoms/viewport";
import { SplitView } from "./SplitView";
import { MobileBottomSheet } from "./MobileBottomSheet";
import { MobileActionMenu, type MobileMenuItem } from "./MobileActionMenu";

export interface MobileSection {
  id: string;
  label: string;
  count?: number;
  icon?: ReactNode;
  content: ReactNode;
}

interface AdaptiveSplitViewProps {
  left: ReactNode;
  right: ReactNode;
  defaultRightWidth?: number;
  minRightWidth?: number;
  maxRightWidth?: number;
  /** Mobile-only: each section opens in its own bottom sheet via the action menu */
  mobileSections?: MobileSection[];
  /** Render-prop: receives a node containing the action menu trigger to embed inside `left` */
  mobileLeft?: (menuTrigger: ReactNode) => ReactNode;
}

export function AdaptiveSplitView({
  left,
  right,
  defaultRightWidth,
  minRightWidth,
  maxRightWidth,
  mobileSections,
  mobileLeft,
}: AdaptiveSplitViewProps) {
  const [breakpoint] = useAtom(breakpointAtom);
  const [openSectionId, setOpenSectionId] = useState<string | null>(null);

  if (breakpoint === "mobile") {
    const sections = mobileSections ?? [
      { id: "right", label: "Details", content: right },
    ];

    const menuItems: MobileMenuItem[] = sections.map((s) => ({
      id: s.id,
      label: s.label,
      icon: s.icon,
      count: s.count,
      onSelect: () => setOpenSectionId(s.id),
    }));

    const activeSection = sections.find((s) => s.id === openSectionId);

    return (
      <>
        <div className="flex flex-1 overflow-hidden">
          <div className="flex-1 overflow-hidden">
            {mobileLeft ? mobileLeft(<MobileActionMenu items={menuItems} />) : left}
          </div>
        </div>
        {/* Floating menu trigger when no embedded slot — sits above any action bar */}
        {!mobileLeft && (
          <div
            className="fixed"
            style={{
              right: 12,
              bottom: `calc(60px + env(safe-area-inset-bottom, 0))`,
              zIndex: 60,
            }}
          >
            <MobileActionMenu items={menuItems} />
          </div>
        )}
        <MobileBottomSheet
          open={activeSection !== undefined}
          onClose={() => setOpenSectionId(null)}
          title={activeSection?.label}
        >
          {activeSection?.content}
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
