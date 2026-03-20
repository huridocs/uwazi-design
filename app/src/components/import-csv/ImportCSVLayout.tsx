import { ToolsSidebar } from "../layout/ToolsSidebar";

interface ImportCSVLayoutProps {
  children: React.ReactNode;
  actionBar?: React.ReactNode;
}

export function ImportCSVLayout({ children, actionBar }: ImportCSVLayoutProps) {
  return (
    <div className="flex flex-1 min-h-0">
      <ToolsSidebar activeItem="import-csv" />
      <div className="flex flex-col flex-1 min-h-0 bg-warm">
        <div className="flex flex-col flex-1 min-h-0">
          {children}
        </div>
        {actionBar}
      </div>
    </div>
  );
}
