import { useAtom } from "jotai";
import { SettingsNav } from "../settings/SettingsNav";
import { breakpointAtom } from "../../atoms/viewport";
import type { AppView } from "../../atoms/navigation";

interface ImportCSVLayoutProps {
  children: React.ReactNode;
  actionBar?: React.ReactNode;
  onNavigate?: (view: AppView) => void;
}

/** Import CSV is a Tools destination, so its rail is the Tools rail — the same
 *  `SettingsNav`, driven by the same `settingsGroups`, rather than a second list
 *  kept in step by hand. The old `ToolsSidebar` wore this one's clothes and had
 *  none of its behaviour: every item raised a toast and went nowhere. */
export function ImportCSVLayout({ children, actionBar, onNavigate }: ImportCSVLayoutProps) {
  const [breakpoint] = useAtom(breakpointAtom);
  const isMobile = breakpoint === "mobile";

  return (
    <div className="flex flex-1 min-h-0">
      {!isMobile && <SettingsNav onNavigate={onNavigate} activeId="import-csv" />}
      <div className="flex flex-col flex-1 min-h-0 bg-warm">
        <div className="flex flex-col flex-1 min-h-0">
          {children}
        </div>
        {actionBar}
      </div>
    </div>
  );
}
