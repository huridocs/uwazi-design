import { ToolsSidebar } from "../layout/ToolsSidebar";

interface ImportCSVLayoutProps {
  children: React.ReactNode;
  actionBar?: React.ReactNode;
}

export function ImportCSVLayout({ children, actionBar }: ImportCSVLayoutProps) {
  return (
    <div className="flex flex-1 min-h-0">
      <ToolsSidebar activeItem="import-csv" />
      <div className="flex flex-col flex-1 min-h-0">
        <div className="flex-1 overflow-auto bg-parchment">
          {children}
        </div>
        {actionBar}
      </div>
    </div>
  );
}
