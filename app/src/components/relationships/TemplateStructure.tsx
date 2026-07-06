import { CaseSensitive, Image, FileVideo, ScrollText, MapPin, CalendarDays, Type, Link2, ListOrdered, HelpCircle } from "lucide-react";
import { ReactNode, useMemo } from "react";
import { useAtomValue } from "jotai";
import { focusedEntityIdAtom } from "../../atoms/focusedEntity";
import { languageAtom } from "../../atoms/language";
import { getEntityProfile } from "../../data/entityProfiles";
import { useNotify } from "../../hooks/useNotify";

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

function PropertyItem({ prop }: { prop: TemplateProperty }) {
  const notify = useNotify();
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
        onClick={() =>
          prop.inherited
            ? notify("Inherited property — edit at its source")
            : notify(`Editing “${prop.name}”`)
        }
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
  // Carbon is the inheritance accent (Seal is reserved for danger). The
  // Inherited group gets a faint carbon tint so it reads as derived, not
  // dangerous.
  const variantClass =
    variant === "inherited"
      ? "border-carbon/40 bg-carbon-tint/40"
      : "border-carbon/30";

  return (
    <div className={`border border-dashed ${variantClass} rounded-lg p-3 flex flex-col gap-2`}>
      <span className="text-xs font-medium text-ink-secondary text-center">{label}</span>
      {children}
    </div>
  );
}

export function TemplateStructure() {
  const notify = useNotify();
  // Derive the structure from the FOCUSED entity's real template (profile
  // metadata is CEJIL-aware), not a hardcoded Sample schema — the Template tab
  // must describe whatever entity is open.
  const focusedId = useAtomValue(focusedEntityIdAtom);
  const lang = useAtomValue(languageAtom);
  const { headerProperties, directFields, inheritedFields } = useMemo(() => {
    const profile = getEntityProfile(focusedId);
    const header: TemplateProperty[] = [
      { icon: <CaseSensitive size={18} />, name: "Title", required: true, type: "text" },
      ...(profile.hasDocument
        ? [
            { icon: <Image size={18} />, name: "Document", required: true, type: "media" },
            { icon: <FileVideo size={18} />, name: "Document metadata", required: true, type: "generated" },
          ]
        : []),
    ];
    const direct: TemplateProperty[] = [];
    const inherited: TemplateProperty[] = [];
    for (const f of profile.metadata[lang] ?? []) {
      if (f.type === "relationship") {
        // Inheriting relationship fields (single- or multi-hop) group under
        // "Inherited"; link-only ones sit in the body as plain relationships.
        const inherits = !!(f.inheritProperty || f.inheritPath?.length || f.inheritLeaf);
        const inheritLabel = f.inheritLabel ?? f.inheritLeaf ?? f.inheritProperty;
        const prop: TemplateProperty = {
          icon: <Link2 size={18} />,
          name: f.label,
          type: inherits ? `relationship · inherits ${inheritLabel}` : "relationship",
          inherited: inherits,
        };
        (inherits ? inherited : direct).push(prop);
      } else {
        direct.push({
          icon: typeIcons[f.type] || <Type size={18} />,
          name: f.label,
          type: f.type,
        });
      }
    }
    return { headerProperties: header, directFields: direct, inheritedFields: inherited };
  }, [focusedId, lang]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto px-4 py-3 pb-8">
        <div className="flex flex-col gap-2">
          {/* Header group */}
          <PropertyGroup label="Header" variant="header">
            {headerProperties.map((p, i) => (
              <PropertyItem key={`${p.name}-${i}`} prop={p} />
            ))}
          </PropertyGroup>

          {/* Body group */}
          <PropertyGroup label="Body" variant="body">
            {directFields.map((p, i) => (
              <PropertyItem key={`${p.name}-${i}`} prop={p} />
            ))}

            {/* Inherited nested group */}
            {inheritedFields.length > 0 && (
              <PropertyGroup label="Inherited" variant="inherited">
                {inheritedFields.map((p, i) => (
                  <PropertyItem key={`${p.name}-${i}`} prop={p} />
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
          Learn more about{" "}
          <button
            type="button"
            onClick={() => notify("Opening entities guide")}
            className="font-bold text-ink-secondary underline cursor-pointer"
          >
            entities
          </button>
        </span>
        <button type="button" onClick={() => notify("Opening entities guide")} aria-label="Help">
          <HelpCircle size={18} className="text-ink-muted" />
        </button>
      </div>
    </div>
  );
}
