import { CaseSensitive, Image, FileVideo, ScrollText, MapPin, CalendarDays, Type, Link2, ListOrdered, HelpCircle } from "lucide-react";
import { ReactNode } from "react";
import { metadataFields } from "../../data/metadata";

interface TemplateProperty {
  icon: ReactNode;
  name: string;
  required?: boolean;
  inherited?: boolean;
  type: string;
}

const typeIcons: Record<string, ReactNode> = {
  multiline: <ScrollText size={18} />,
  country: <MapPin size={18} />,
  date: <CalendarDays size={18} />,
  text: <Type size={18} />,
  link: <Link2 size={18} />,
  "file-list": <ListOrdered size={18} />,
};

// Header properties (always present on any entity)
const headerProperties: TemplateProperty[] = [
  { icon: <CaseSensitive size={18} />, name: "Title", required: true, type: "text" },
  { icon: <Image size={18} />, name: "Document", required: true, type: "media" },
  { icon: <FileVideo size={18} />, name: "Document metadata", required: true, type: "generated" },
];

// Derive body properties from actual metadata fields
const bodyProperties: TemplateProperty[] = metadataFields.map((field) => ({
  icon: typeIcons[field.type] || <Type size={18} />,
  name: field.label,
  type: field.type,
  inherited: field.id === "mechanism" || field.id === "signatories",
}));

const inheritedFields = bodyProperties.filter((p) => p.inherited);
const directFields = bodyProperties.filter((p) => !p.inherited);

function PropertyItem({ prop }: { prop: TemplateProperty }) {
  return (
    <div className="flex items-center gap-3 p-3 bg-warm rounded-md shadow-sm">
      <span className="text-ink-tertiary shrink-0">{prop.icon}</span>
      <span className="flex-1 text-sm font-medium text-ink">
        {prop.name}
        {prop.required && (
          <span className="text-xs font-medium text-ink-muted ml-1.5">*Required</span>
        )}
      </span>
      <span className="text-[10px] text-ink-muted shrink-0 capitalize">{prop.type}</span>
      <button
        className={`px-2.5 py-0.5 text-xs font-medium rounded-md transition-colors shrink-0 ${
          prop.inherited
            ? "bg-carbon-tint/50 text-carbon/50"
            : "bg-carbon-tint text-carbon hover:bg-carbon-tint/80"
        }`}
      >
        Edit
      </button>
    </div>
  );
}

function PropertyGroup({
  label,
  variant,
  children,
}: {
  label: string;
  variant: "header" | "body" | "inherited";
  children: ReactNode;
}) {
  const borderColor =
    variant === "inherited"
      ? "border-seal/40"
      : "border-carbon/30";

  return (
    <div className={`border border-dashed ${borderColor} rounded-lg p-3 flex flex-col gap-2`}>
      <span className="text-xs font-medium text-ink-secondary text-center">{label}</span>
      {children}
    </div>
  );
}

export function TemplateStructure() {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto px-4 py-3">
        <div className="flex flex-col gap-2">
          {/* Header group */}
          <PropertyGroup label="Header" variant="header">
            {headerProperties.map((p) => (
              <PropertyItem key={p.name} prop={p} />
            ))}
          </PropertyGroup>

          {/* Body group */}
          <PropertyGroup label="Body" variant="body">
            {directFields.map((p) => (
              <PropertyItem key={p.name} prop={p} />
            ))}

            {/* Inherited nested group */}
            {inheritedFields.length > 0 && (
              <PropertyGroup label="Inherited" variant="inherited">
                {inheritedFields.map((p) => (
                  <PropertyItem key={p.name} prop={p} />
                ))}
              </PropertyGroup>
            )}
          </PropertyGroup>
        </div>
      </div>

      {/* Action bar */}
      <div
        className="flex items-center justify-between h-12 px-4 shrink-0"
        style={{ borderTop: "1px solid var(--border-primary)" }}
      >
        <span className="text-xs text-ink-tertiary">
          Learn more about <span className="font-bold text-ink-secondary underline cursor-pointer">entities</span>
        </span>
        <HelpCircle size={18} className="text-ink-muted" />
      </div>
    </div>
  );
}
