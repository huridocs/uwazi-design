import { useEffect, useState, type ReactNode } from "react";
import { useAtom, useAtomValue } from "jotai";
import { Download, Search } from "lucide-react";
import { AdaptiveSplitView } from "../components/layout/AdaptiveSplitView";
import { MainTabs } from "../components/layout/MainTabs";
import { DrawerTabs } from "../components/layout/DrawerTabs";
import { DocMeta } from "../components/layout/DocMeta";
import { MetadataCard, Property, PropertyRow } from "../components/metadata/MetadataCard";
import { spanClass, fieldSpan } from "../components/metadata/cardSpan";
import { ConnectionGroupCard } from "../components/metadata/ConnectionGroupCard";
import { RelationshipFieldCard } from "../components/metadata/RelationshipFieldCard";
import { RelationshipFieldEditor } from "../components/metadata/RelationshipFieldEditor";
import { TemplateStructure } from "../components/relationships/TemplateStructure";
import { EntityOverlay } from "../components/relationships/EntityOverlay";
import { groupConnections, relationLabel } from "../utils/inheritance";
import {
  type MetadataField,
  type RelationshipMetadataField,
} from "../data/metadata";
import { focusedEntityIdAtom } from "../atoms/focusedEntity";
import { getEntity } from "../data/entities";
import { getEntityProfile } from "../data/entityProfiles";
import { filesAtom } from "../atoms/files";
import { languageAtom, type Language } from "../atoms/language";
import { entityMetadataAtom, makeEntityPropReader } from "../atoms/entityMetadata";
import { DrawerFilesBody } from "../components/files/DrawerFilesBody";
import { ViewButton } from "../components/shared/ViewButton";
import { EditInput } from "../components/metadata/EditInput";
import { scopedReferencesAtom } from "../atoms/references";
import { RelationshipsDrawerSection } from "../components/relationships/RelationshipsDrawerSection";
import { DocumentViewer } from "../components/viewer/DocumentViewer";
import { useNotify } from "../hooks/useNotify";

interface MetadataViewProps {
  tabs: { id: string; label: string; count?: number }[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onBack?: () => void;
}

export function MetadataView({ tabs, activeTab, onTabChange, onBack }: MetadataViewProps) {
  const [editing, setEditing] = useState(false);
  const [language, setLanguage] = useAtom(languageAtom);

  const renderLeft = (menuTrigger?: ReactNode) => (
    <div className="flex flex-col h-full min-h-0 bg-paper">
      <MainTabs
        tabs={tabs}
        activeId={activeTab}
        onChange={onTabChange}
        onBack={onBack}
        languages={["EN", "ES", "FR", "AR"]}
        availableLanguages={["EN", "ES", "FR", "AR"]}
        activeLanguage={language}
        onLanguageChange={(lang) => setLanguage(lang as Language)}
      />

      {editing ? (
        <MetadataEditBody
          onCancel={() => setEditing(false)}
          onSave={() => setEditing(false)}
          menuSlot={menuTrigger}
        />
      ) : (
        <MetadataReadBody onEdit={() => setEditing(true)} menuSlot={menuTrigger} />
      )}
    </div>
  );

  return (
    <AdaptiveSplitView
      left={renderLeft()}
      mobileLeft={(menuTrigger) => renderLeft(menuTrigger)}
      right={<MetadataDrawer />}
      defaultRightWidth={560}
      minRightWidth={460}
      maxRightWidth={720}
      mobileSections={[
        { id: "details", label: "Details", content: <MetadataDrawer /> },
      ]}
    />
  );
}

/* ── Read Mode ── */

function MetadataReadBody({ onEdit, menuSlot }: { onEdit: () => void; menuSlot?: ReactNode }) {
  const language = useAtom(languageAtom)[0];
  const getProp = makeEntityPropReader(useAtomValue(entityMetadataAtom));
  const profile = getEntityProfile(useAtomValue(focusedEntityIdAtom));
  const allFields = profile.metadata[language];
  const fields = allFields.filter((f): f is MetadataField => f.type !== "relationship");
  const relFields = allFields.filter((f): f is RelationshipMetadataField => f.type === "relationship");
  const { groups, singles } = groupConnections(relFields, language, getProp);
  const pdf = profile.pdfMetadata?.[language];
  const notify = useNotify();

  return (
    <>
      <DocMeta showPdfSelector={false} />

      {/* Scrollable metadata body — responsive grid */}
      <div className="flex-1 overflow-auto px-4 py-2 pb-8">
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          {profile.hasDocument && (
            <MetadataCard title="Document" className="hidden md:block md:col-span-2 xl:col-span-1 md:row-span-2">
              <div className="flex items-center justify-center bg-warm rounded-md overflow-hidden h-[200px]">
                <div className="bg-paper rounded shadow-sm w-[45%] h-[180px] flex items-center justify-center">
                  <span className="text-xs text-ink-muted">PDF Preview</span>
                </div>
              </div>
            </MetadataCard>
          )}

          {pdf && (
            <MetadataCard title="PDF Metadata" className="md:col-span-2 xl:col-span-2 xl:row-span-2">
              <Property label="Name" value={pdf.name} ltr />
              <PropertyRow>
                <div className="flex-1"><Property label="Type" value={pdf.type} /></div>
                <div className="flex-1"><Property label="Size" value={pdf.size} ltr /></div>
                <div className="flex-1"><Property label="Last Edited" value={pdf.lastEdited} ltr /></div>
                <div className="flex-1"><Property label="Added" value={pdf.added} ltr /></div>
              </PropertyRow>
              <div className="flex items-center justify-between pt-2 mt-auto">
                <ViewButton size="md" />
                <button
                  onClick={() => notify("Download started", "success")}
                  className="px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Download size={12} className="text-ink-tertiary" /> Download
                </button>
              </div>
            </MetadataCard>
          )}

          {fields.map((field) => {
            return (
              <MetadataCard key={field.id} title={field.label} className={spanClass(fieldSpan(field))}>
                {field.type === "multiline" ? (
                  <p className="text-sm font-medium text-ink leading-relaxed">{field.value}</p>
                ) : field.type === "country" ? (
                  <div className="flex items-center gap-2">
                    <span className="text-[22px] leading-none">{field.flag}</span>
                    <span className="text-sm font-medium text-ink">{field.value}</span>
                  </div>
                ) : field.type === "link" ? (
                  <Property value={field.value} linked />
                ) : field.type === "file-list" ? (
                  <div className="space-y-2">
                    {field.items?.map((item, i) => (
                      <Property key={i} label={item.label} value={item.value} linked />
                    ))}
                  </div>
                ) : (
                  <Property value={field.value} />
                )}
              </MetadataCard>
            );
          })}

          {/* Relationship / inherited fields. Shared connections (multi-
              inheritance) render as one grouped table; standalone relationship
              fields get their own card. A plain band separates them from the
              scalar fields above — no border/colour accent. */}
          {(groups.length > 0 || singles.length > 0) && (
            <div className={`${spanClass("full")} mt-2 flex items-center`}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-tertiary">
                Relationships
              </h3>
            </div>
          )}
          {groups.map((group) => (
            <ConnectionGroupCard key={group.connectionKey} group={group} />
          ))}
          {singles.map((field) => (
            <RelationshipFieldCard key={field.id} field={field} />
          ))}
        </div>
      </div>

      {/* Action bar */}
      <div
        className="flex items-center gap-3 h-12 px-4 bg-paper shrink-0"
        style={{ borderTop: "1px solid var(--border-primary)" }}
      >
        <button
          onClick={onEdit}
          className="px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
        >
          Edit
        </button>
        <button
          onClick={() => notify("Link copied")}
          className="px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
        >
          Share
        </button>
        <div className="flex-1" />
        <button
          onClick={() => notify("Entity deleted", "success")}
          className="px-3 py-1.5 text-xs font-medium text-seal bg-seal-tint/40 hover:bg-seal-tint rounded-md transition-colors cursor-pointer"
        >
          Delete
        </button>
        {menuSlot}
      </div>
    </>
  );
}

/* ── Edit Mode ── */

function MetadataEditBody({ onCancel, onSave, menuSlot }: { onCancel: () => void; onSave: () => void; menuSlot?: ReactNode }) {
  const language = useAtom(languageAtom)[0];
  const focusedId = useAtomValue(focusedEntityIdAtom);
  const profile = getEntityProfile(focusedId);
  const docTitle = profile.document?.[language]?.title ?? getEntity(focusedId)?.title ?? "";
  // Scalar fields edit inline here; relationship fields are edited via the
  // connection editor.
  const initialFields = profile.metadata[language].filter(
    (f): f is MetadataField => f.type !== "relationship",
  );
  const pdf = profile.pdfMetadata?.[language];
  const [title, setTitle] = useState(docTitle);
  const [fields, setFields] = useState<MetadataField[]>(initialFields);
  const [showPreview, setShowPreview] = useState(true);
  const [showFileSize, setShowFileSize] = useState(true);
  const [showLastEdit, setShowLastEdit] = useState(true);
  const [showIcon, setShowIcon] = useState(true);
  const [extractMeta, setExtractMeta] = useState(true);
  const notify = useNotify();

  const updateField = (id: string, value: string) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, value } : f)));
  };

  // Relationship fields → one editor per connection. The connection (entity
  // set) is the source of truth, keyed so multi-inheritance siblings sync.
  const relFields = profile.metadata[language].filter(
    (f): f is RelationshipMetadataField => f.type === "relationship",
  );
  const { groups, singles } = groupConnections(relFields, language);
  const connectionDefs = [
    ...groups.map((g) => ({
      key: g.connectionKey,
      title: g.label,
      relationLabel: g.relationLabel,
      targetTypeId: g.targetTypeId,
      columns: g.columns,
      entityIds: g.rows.map((r) => r.entityId),
    })),
    ...singles.map((f) => ({
      key: f.id,
      title: f.label,
      relationLabel: relationLabel(f.relationType),
      targetTypeId: f.targetTypeId,
      columns: f.inheritProperty
        ? [{ fieldId: f.id, label: f.inheritLabel ?? f.label, inheritProperty: f.inheritProperty }]
        : [],
      entityIds: f.connectedEntityIds,
    })),
  ];
  const [connections, setConnections] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(connectionDefs.map((d) => [d.key, d.entityIds])),
  );

  return (
    <>
      <div className="flex-1 overflow-auto px-4 py-3 pb-8 space-y-3">
        {/* Title */}
        <EditSection label="Title*">
          <textarea
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            rows={2}
            className="w-full px-3 py-2 text-sm text-ink bg-paper border border-border rounded-md
              focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40 resize-none"
          />
        </EditSection>

        {/* Select icon */}
        <EditSection label="Icon">
          <button
            onClick={() => notify("Icon picker isn't available in the prototype")}
            className="w-full px-3 py-2 text-sm text-ink-muted bg-paper border border-border rounded-md text-left"
          >
            Select icon...
          </button>
          <div className="flex items-center justify-between mt-2">
            <Checkbox checked={showIcon} onChange={setShowIcon} label="Show icon" />
            <button
              onClick={() => setShowIcon(false)}
              className="text-xs text-ink-muted hover:text-ink-secondary cursor-pointer"
            >
              Clear
            </button>
          </div>
        </EditSection>

        {/* Document — only for document-bearing entities. */}
        {profile.hasDocument && pdf && (
          <EditSection label="Document*">
            <div className="flex items-center gap-2">
              <div className="flex-1 px-3 py-2 text-sm text-ink bg-paper border border-border rounded-md truncate">
                Choose file &nbsp; {pdf.name}
              </div>
              <button
                onClick={() => notify("File removed")}
                className="px-3 py-1.5 text-xs font-medium text-seal rounded-md hover:bg-seal-tint transition-colors cursor-pointer"
              >
                Remove file
              </button>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <Checkbox checked={showPreview} onChange={setShowPreview} label="Show preview" />
              <Checkbox checked={extractMeta} onChange={setExtractMeta} label="Extract file metadata" />
            </div>

            {/* Inline PDF metadata */}
            <div className="mt-3 space-y-2">
              <EditInput label="Name" value={pdf.name} />
              <EditInput label="Type" value={pdf.type} />
              <div className="flex items-center gap-4 mt-2">
                <Checkbox checked={showFileSize} onChange={setShowFileSize} label="Show file size" />
                <Checkbox checked={showLastEdit} onChange={setShowLastEdit} label="Show last edit" />
              </div>
            </div>
          </EditSection>
        )}

        {/* Description */}
        <EditSection label="Description*">
          <textarea
            value={fields.find((f) => f.id === "description")?.value ?? ""}
            onChange={(e) => updateField("description", e.target.value)}
            rows={6}
            className="w-full px-3 py-2 text-sm text-ink bg-paper border border-border rounded-md
              focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40 resize-y"
          />
        </EditSection>

        {/* Geolocation */}
        <EditSection label="Geolocation">
          <div className="h-[160px] bg-warm rounded-md flex items-center justify-center overflow-hidden">
            <span className="text-xs text-ink-muted">Map Preview</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <EditInput label="Latitude" value="" placeholder="Value" />
            <EditInput label="Longitude" value="" placeholder="Value" />
          </div>
        </EditSection>

        {/* Country with search */}
        <EditSection label="Country">
          <CountryPicker />
        </EditSection>

        {/* Editable scalar fields (date / link / text / multiline). file-list
            fields render below as item editors; description/country handled
            above with their own controls. */}
        {fields
          .filter(
            (f) =>
              !["description", "country"].includes(f.id) && f.type !== "file-list",
          )
          .map((field) => (
            <EditSection key={field.id} label={field.label}>
              {field.type === "date" ? (
                <input
                  type="date"
                  value={field.value}
                  onChange={(e) => updateField(field.id, e.target.value)}
                  className="w-full px-3 py-2 text-sm text-ink bg-paper border border-border rounded-md
                    focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40"
                />
              ) : field.type === "multiline" ? (
                <textarea
                  value={field.value}
                  onChange={(e) => updateField(field.id, e.target.value)}
                  rows={4}
                  className="w-full px-3 py-2 text-sm text-ink bg-paper border border-border rounded-md
                    focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40 resize-y"
                />
              ) : (
                <input
                  type="text"
                  value={field.value}
                  onChange={(e) => updateField(field.id, e.target.value)}
                  className="w-full px-3 py-2 text-sm text-ink bg-paper border border-border rounded-md
                    focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40"
                />
              )}
            </EditSection>
          ))}

        {/* file-list fields (Bench, Other Files) — one section per field with
            an inline editor for each item's value. */}
        {fields
          .filter((f) => f.type === "file-list")
          .map((field) => (
            <EditSection key={field.id} label={field.label}>
              {field.items?.map((item, i) => (
                <div key={i} className="space-y-1">
                  {item.label && (
                    <span className="text-xs text-ink-tertiary">{item.label}</span>
                  )}
                  <input
                    type="text"
                    defaultValue={item.value}
                    className="w-full px-3 py-2 text-sm text-ink bg-paper border border-border rounded-md
                      focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40"
                  />
                </div>
              ))}
            </EditSection>
          ))}

        {/* Relationship fields — edit the connection; inherited values shown
            read-only. One editor per connection (siblings sync). The band
            mirrors the read-mode "Relationships" separator. */}
        {connectionDefs.length > 0 && (
          <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-tertiary pt-2">
            Relationships
          </h3>
        )}
        {connectionDefs.map((d) => (
          <RelationshipFieldEditor
            key={d.key}
            title={d.title}
            relationLabel={d.relationLabel}
            targetTypeId={d.targetTypeId}
            columns={d.columns}
            entityIds={connections[d.key] ?? d.entityIds}
            onChange={(ids) => setConnections((prev) => ({ ...prev, [d.key]: ids }))}
          />
        ))}
      </div>

      {/* Edit action bar */}
      <div
        className="flex items-center justify-end gap-3 h-12 px-4 bg-paper shrink-0"
        style={{ borderTop: "1px solid var(--border-primary)" }}
      >
        <button
          onClick={onCancel}
          className="px-4 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          className="px-4 py-1.5 text-xs font-medium text-white bg-success rounded-md hover:bg-success/90 transition-colors cursor-pointer"
        >
          Save
        </button>
        {menuSlot}
      </div>
    </>
  );
}

/* ── Edit helpers ── */

function EditSection({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <div className="flex items-center gap-1.5">
          {icon}
          <label className="text-sm font-bold text-ink">{label}</label>
        </div>
      )}
      {children}
    </div>
  );
}

function Checkbox({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className="flex items-center gap-1.5 text-xs text-ink-secondary cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="w-3.5 h-3.5 rounded accent-ink cursor-pointer"
      />
      {label}
    </label>
  );
}

const countries = [
  { flag: "🇦🇷", name: "Argentina" },
  { flag: "🇧🇷", name: "Brasil" },
  { flag: "🇧🇴", name: "Bolivia" },
  { flag: "🇨🇱", name: "Chile" },
  { flag: "🇨🇴", name: "Colombia" },
  { flag: "🇪🇨", name: "Ecuador" },
  { flag: "🇬🇾", name: "Guyana" },
  { flag: "🇵🇾", name: "Paraguay" },
  { flag: "🇵🇪", name: "Perú" },
  { flag: "🇺🇾", name: "Uruguay" },
  { flag: "🇸🇷", name: "Suriname" },
  { flag: "🇻🇪", name: "Venezuela" },
];

function CountryPicker() {
  const [query, setQuery] = useState("");
  const filtered = countries.filter((c) =>
    c.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-2">
      <div className="relative">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search"
          className="w-full h-8 pl-3 pr-8 text-xs font-medium bg-paper border border-border rounded-md
            placeholder:text-ink-muted focus:outline-none focus:ring-2 focus:ring-carbon/20"
        />
        <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-ink-muted pointer-events-none" />
      </div>
      <div className="border border-border rounded-md max-h-[240px] overflow-auto">
        {/* Selected */}
        <div className="flex items-center gap-2 px-3 py-2 bg-carbon-tint">
          <span className="text-lg leading-none">🇦🇷</span>
          <span className="text-sm font-medium text-ink">Argentina</span>
        </div>
        {/* List */}
        {filtered
          .filter((c) => c.name !== "Argentina")
          .map((c) => (
            <div
              key={c.name}
              className="flex items-center gap-2 px-3 py-2 hover:bg-warm cursor-pointer transition-colors"
            >
              <span className="text-lg leading-none">{c.flag}</span>
              <span className="text-sm text-ink">{c.name}</span>
            </div>
          ))}
      </div>
    </div>
  );
}

/* ── Drawer ── */

function MetadataDrawer() {
  const focusedId = useAtomValue(focusedEntityIdAtom);
  const profile = getEntityProfile(focusedId);
  const [references] = useAtom(scopedReferencesAtom);
  const [files] = useAtom(filesAtom);

  // The Document tab only exists for document-bearing entities — otherwise the
  // viewer would fall back to the bundled sample PDF and show a phantom doc on
  // entities that have none (e.g. an Audiencia with Files 0).
  const drawerTabs = [
    ...(profile.hasDocument ? [{ id: "document", label: "Document" }] : []),
    { id: "connections", label: "Relationships", count: references.length },
    { id: "files", label: "Files", count: files.length },
    { id: "template", label: "Template" },
  ];

  const [activeDrawerTab, setActiveDrawerTab] = useState(
    profile.hasDocument ? "document" : "connections",
  );
  // Re-pick the default tab when the focal entity changes (the drawer stays
  // mounted across navigation), so a no-document entity never lands on a
  // phantom Document tab carried over from the previous one.
  useEffect(() => {
    setActiveDrawerTab(profile.hasDocument ? "document" : "connections");
  }, [focusedId, profile.hasDocument]);

  return (
    <div className="relative flex flex-col h-full overflow-hidden">
      {/* Clicking a connected entity in a metadata relationship field opens its
          source preview here in the drawer (not as a slide-over on the left). */}
      <EntityOverlay />
      <DrawerTabs tabs={drawerTabs} activeId={activeDrawerTab} onChange={setActiveDrawerTab} />

      {activeDrawerTab === "document" && profile.hasDocument ? (
        <DocumentViewer showMinimap={false} />
      ) : activeDrawerTab === "template" ? (
        <TemplateStructure />
      ) : activeDrawerTab === "files" ? (
        <DrawerFilesBody />
      ) : activeDrawerTab === "connections" ? (
        <RelationshipsDrawerSection />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-ink-muted capitalize">{activeDrawerTab} content</p>
        </div>
      )}
    </div>
  );
}

