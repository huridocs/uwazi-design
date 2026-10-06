import { useEffect, useRef } from "react";
import { useAtom, useAtomValue } from "jotai";
import { SettingsNav } from "../settings/SettingsNav";
import { breakpointAtom } from "../../atoms/viewport";
import { settingsMobileDrilledAtom } from "../../atoms/settings";
import type { AppView } from "../../atoms/navigation";

interface ImportCSVLayoutProps {
  children: React.ReactNode;
  onNavigate?: (view: AppView) => void;
}

/** Import CSV is a Tools destination, so its rail is the Tools rail: the same
 *  `SettingsNav`, driven by the same `settingsGroups`. The page beside it is a
 *  Settings shell (`SettingsContent`), which is its own gutter host. */
export function ImportCSVLayout({ children, onNavigate }: ImportCSVLayoutProps) {
  const isMobile = useAtomValue(breakpointAtom) === "mobile";
  // Phones: the page header's back chevron drills out to the Settings rail,
  // which lives in the Settings view.
  const [drilled, setDrilled] = useAtom(settingsMobileDrilledAtom);
  const prev = useRef(drilled);
  // Arriving here counts as drilled in, so the chevron has somewhere to go.
  useEffect(() => {
    if (isMobile) setDrilled(true);
  }, [isMobile, setDrilled]);
  useEffect(() => {
    if (isMobile && prev.current && !drilled) onNavigate?.("settings");
    prev.current = drilled;
  }, [drilled, isMobile, onNavigate]);

  return (
    <div data-component="ImportCSVLayout" className="flex flex-1 min-h-0">
      {!isMobile && <SettingsNav onNavigate={onNavigate} activeId="import-csv" />}
      {/* `min-w-0`: as a flex item it otherwise refuses to shrink below its
          widest child, which on a phone pushed rows off the screen's edge. */}
      <div data-part="content" className="flex flex-col flex-1 min-w-0 min-h-0">
        {children}
      </div>
    </div>
  );
}
