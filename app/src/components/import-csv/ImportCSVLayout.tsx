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
    <div data-component="ImportCSVLayout" className="flex flex-1 min-h-0">
      {!isMobile && <SettingsNav onNavigate={onNavigate} activeId="import-csv" />}
      {/* The main-tier gutter host (16px): the list and detail views and the
          action bar take their side inset from it. */}
      <div data-gutter-host data-part="content" className="gutter-host-main flex flex-col flex-1 min-h-0 bg-warm">
        <div data-part="body" className="flex flex-col flex-1 min-h-0">
          {children}
        </div>
        {actionBar}
      </div>
    </div>
  );
}
