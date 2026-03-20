import {
  FileSpreadsheet,
  Activity,
  Code2,
  Upload,
  Cog,
  Layers,
  BrainCircuit,
  BookOpen,
  GitFork,
} from "lucide-react";

interface ToolsSidebarProps {
  activeItem?: string;
}

const metadataItems = [
  { id: "templates", label: "Templates", icon: Layers },
  { id: "metadata-extraction", label: "Metadata Extraction", icon: BrainCircuit },
  { id: "thesauri", label: "Thesauri", icon: BookOpen },
  { id: "relationship-types", label: "Relationship Types", icon: GitFork },
];

const toolsItems = [
  { id: "processes", label: "Processes", icon: Cog },
  { id: "import-csv", label: "Import CSV", icon: FileSpreadsheet },
  { id: "activity-log", label: "Activity Log", icon: Activity },
  { id: "global-css", label: "Global CSS", icon: Code2 },
  { id: "uploads", label: "Uploads", icon: Upload },
];

export function ToolsSidebar({ activeItem = "import-csv" }: ToolsSidebarProps) {
  return (
    <aside
      className="w-[15.625rem] h-full shrink-0 bg-paper overflow-y-auto"
      style={{ borderRight: "1px solid var(--border-primary)" }}
    >
      <div className="py-4">
        <SidebarSection title="Metadata" items={metadataItems} activeItem={activeItem} />
        <SidebarSection title="Tools" items={toolsItems} activeItem={activeItem} />
      </div>
    </aside>
  );
}

function SidebarSection({
  title,
  items,
  activeItem,
}: {
  title: string;
  items: { id: string; label: string; icon: typeof Cog }[];
  activeItem: string;
}) {
  return (
    <div className="mb-2">
      <h3 className="px-5 py-2 text-[10px] font-semibold text-ink-muted uppercase tracking-wider">
        {title}
      </h3>
      {items.map((item) => {
        const isActive = item.id === activeItem;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            className={`flex items-center gap-2.5 w-full px-5 py-2 text-[13px] font-medium transition-colors ${
              isActive
                ? "bg-warm text-ink"
                : "text-ink-secondary hover:bg-warm"
            }`}
          >
            <Icon size={15} className="text-ink-tertiary" />
            {item.label}
          </button>
        );
      })}
    </div>
  );
}
