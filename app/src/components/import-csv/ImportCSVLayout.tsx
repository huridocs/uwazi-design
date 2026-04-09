import { useAtom } from "jotai";
import { ToolsSidebar } from "../layout/ToolsSidebar";
import { breakpointAtom } from "../../atoms/viewport";

interface ImportCSVLayoutProps {
  children: React.ReactNode;
  actionBar?: React.ReactNode;
}

export function ImportCSVLayout({ children, actionBar }: ImportCSVLayoutProps) {
  const [breakpoint] = useAtom(breakpointAtom);
  const isMobile = breakpoint === "mobile";

  return (
    <div className="flex flex-1 min-h-0">
      {!isMobile && <ToolsSidebar activeItem="import-csv" />}
      <div className="flex flex-col flex-1 min-h-0 bg-warm">
        <div className="flex flex-col flex-1 min-h-0">
          {children}
        </div>
        {actionBar}
      </div>
    </div>
  );
}
