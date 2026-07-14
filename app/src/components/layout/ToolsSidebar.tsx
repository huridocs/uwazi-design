import { Fragment } from "react";
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
  Archive,
  ExternalLink,
} from "lucide-react";
import { useNotify } from "../../hooks/useNotify";
import { settingsDocumentation } from "../../atoms/settings";

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
  { id: "preserve", label: "Preserve", icon: Archive },
  { id: "import-csv", label: "Import CSV", icon: FileSpreadsheet },
  { id: "activity-log", label: "Activity Log", icon: Activity },
  { id: "global-css", label: "Global CSS", icon: Code2 },
  { id: "uploads", label: "Uploads", icon: Upload },
];

/** The Tools/Import-CSV rail. Presentation is kept identical to SettingsNav — same
 *  active state, same Documentation footer, same flex-column shell — because it's
 *  the same kind of navigation and the two used to read as different panels: this
 *  one had the OLD active style (bg-warm, indistinguishable from hover) and no
 *  Documentation footer. It carries its own item groups, but it wears the settings
 *  rail's clothes. */
export function ToolsSidebar({ activeItem = "import-csv" }: ToolsSidebarProps) {
  return (
    <aside
      aria-label="Tools navigation"
      className="h-full w-full md:w-[15.625rem] shrink-0 flex flex-col bg-paper"
      style={{ borderRight: "1px solid var(--border-primary)" }}
    >
      <div className="flex-1 min-h-0 overflow-y-auto py-4">
        <SidebarSection title="Metadata" items={metadataItems} activeItem={activeItem} />
        <SidebarSection title="Tools" items={toolsItems} activeItem={activeItem} />
      </div>

      {/* Documentation — the panel footer, exactly as in SettingsNav. */}
      <a
        href={settingsDocumentation.external}
        target="_blank"
        rel="noopener noreferrer"
        className="shrink-0 flex items-center gap-2.5 w-full px-5 h-12 text-[13px] font-medium text-left text-ink-secondary hover:bg-warm hover:text-ink transition-colors"
        style={{ borderTop: "1px solid var(--border-primary)" }}
      >
        <settingsDocumentation.icon size={15} className="text-ink-tertiary shrink-0" />
        <span className="truncate flex-1">{settingsDocumentation.label}</span>
        <ExternalLink size={12} className="text-ink-muted shrink-0" />
      </a>
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
  const notify = useNotify();
  return (
    <div className="mb-2">
      <h3 className="px-5 py-2 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
        {title}
      </h3>
      {items.map((item) => {
        const active = item.id === activeItem;
        const Icon = item.icon;
        return (
          <Fragment key={item.id}>
            <button
              onClick={() => notify(`Opening ${item.label}`)}
              // Same active treatment as SettingsNav: vellum + semibold, a real
              // state rather than the hover-coloured bg-warm it used to use.
              className={`flex items-center gap-2.5 w-full px-5 py-2 text-[13px] text-left transition-colors ${
                active
                  ? "bg-vellum text-ink font-semibold"
                  : "font-medium text-ink-secondary hover:bg-warm hover:text-ink"
              }`}
            >
              <Icon size={15} className="text-ink-tertiary shrink-0" />
              <span className="truncate flex-1">{item.label}</span>
            </button>
          </Fragment>
        );
      })}
    </div>
  );
}
