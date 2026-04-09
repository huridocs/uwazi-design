import { useState } from "react";
import { useAtom } from "jotai";
import { Download, Eye, Search, ChevronRight } from "lucide-react";
import { SplitView } from "../components/layout/SplitView";
import { AdaptiveSplitView } from "../components/layout/AdaptiveSplitView";
import { MainTabs } from "../components/layout/MainTabs";
import { DrawerTabs } from "../components/layout/DrawerTabs";
import { DocMeta } from "../components/layout/DocMeta";
import { MetadataCard, Property, PropertyRow } from "../components/metadata/MetadataCard";
import { TemplateStructure } from "../components/references/TemplateStructure";
import { metadataFieldsByLanguage, pdfMetadataByLanguage, MetadataField } from "../data/metadata";
import { documentsByLanguage } from "../data/document";
import { languageAtom, type Language } from "../atoms/language";

interface MetadataViewProps {
  tabs: { id: string; label: string; count?: number }[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function MetadataView({ tabs, activeTab, onTabChange }: MetadataViewProps) {
  const [editing, setEditing] = useState(false);
  const [language, setLanguage] = useAtom(languageAtom);

  return (
    <AdaptiveSplitView
      left={
        <div className="flex flex-col h-full min-h-0 bg-paper">
          <MainTabs
            tabs={tabs}
            activeId={activeTab}
            onChange={onTabChange}
            languages={["EN", "ES", "FR", "AR"]}
            availableLanguages={["EN", "ES", "FR", "AR"]}
            activeLanguage={language}
            onLanguageChange={(lang) => setLanguage(lang as Language)}
          />

          {editing ? (
            <MetadataEditBody onCancel={() => setEditing(false)} onSave={() => setEditing(false)} />
          ) : (
            <MetadataReadBody onEdit={() => setEditing(true)} />
          )}
        </div>
      }
      right={<MetadataDrawer />}
      defaultRightWidth={480}
      minRightWidth={380}
      maxRightWidth={600}
      mobileSections={[
        { id: "details", label: "Details", content: <MetadataDrawer /> },
      ]}
    />
  );
}

/* ── Read Mode ── */

function MetadataReadBody({ onEdit }: { onEdit: () => void }) {
  const language = useAtom(languageAtom)[0];
  const fields = metadataFieldsByLanguage[language];
  const pdf = pdfMetadataByLanguage[language];

  return (
    <>
      <DocMeta showPdfSelector={false} />

      {/* Scrollable metadata body — responsive grid */}
      <div className="flex-1 overflow-auto px-4 py-2 pb-8">
        <div className="grid gap-3 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
          <MetadataCard title="Document" className="md:col-span-2 xl:col-span-1 md:row-span-2">
            <div className="flex items-center justify-center bg-warm rounded-md overflow-hidden h-[200px]">
              <div className="bg-paper rounded shadow-sm w-[45%] h-[180px] flex items-center justify-center">
                <span className="text-xs text-ink-muted">PDF Preview</span>
              </div>
            </div>
          </MetadataCard>

          <MetadataCard title="PDF Metadata" className="md:col-span-2 xl:col-span-2 xl:row-span-2">
            <Property label="Name" value={pdf.name} />
            <PropertyRow>
              <div className="flex-1"><Property label="Type" value={pdf.type} /></div>
              <div className="flex-1"><Property label="Size" value={pdf.size} /></div>
              <div className="flex-1"><Property label="Last Edited" value={pdf.lastEdited} /></div>
              <div className="flex-1"><Property label="Added" value={pdf.added} /></div>
            </PropertyRow>
            <div className="flex items-center justify-between pt-2 mt-auto">
              <button className="px-3 py-1 text-xs font-medium text-ink rounded border border-border hover:bg-warm transition-colors flex items-center gap-1.5">
                <Eye size={12} /> View
              </button>
              <button className="px-3 py-1 text-xs font-medium text-ink rounded border border-border hover:bg-warm transition-colors flex items-center gap-1.5">
                <Download size={12} /> Download
              </button>
            </div>
          </MetadataCard>

          {fields.map((field) => {
            // Large fields span more columns
            const span =
              field.type === "multiline"
                ? "col-span-1 md:col-span-2 xl:col-span-3"
                : field.type === "file-list"
                  ? "col-span-1 md:col-span-2 xl:col-span-2"
                  : "col-span-1";

            return (
              <MetadataCard key={field.id} title={field.label} className={span}>
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
        </div>
      </div>

      {/* Action bar */}
      <div
        className="flex items-center gap-3 h-12 px-4 bg-paper shrink-0"
        style={{ borderTop: "1px solid var(--border-primary)" }}
      >
        <button
          onClick={onEdit}
          className="px-3 py-1.5 text-xs font-medium text-ink rounded-md border border-border hover:bg-warm transition-colors"
        >
          Edit
        </button>
        <button className="px-3 py-1.5 text-xs font-medium text-ink rounded-md border border-border hover:bg-warm transition-colors">
          Share
        </button>
        <div className="flex-1" />
        <button className="px-3 py-1.5 text-xs font-medium text-seal rounded-md border border-seal/30 hover:bg-seal-tint transition-colors">
          Delete
        </button>
      </div>
    </>
  );
}

/* ── Edit Mode ── */

function MetadataEditBody({ onCancel, onSave }: { onCancel: () => void; onSave: () => void }) {
  const language = useAtom(languageAtom)[0];
  const doc = documentsByLanguage[language];
  const initialFields = metadataFieldsByLanguage[language];
  const pdf = pdfMetadataByLanguage[language];
  const [title, setTitle] = useState(doc.title);
  const [fields, setFields] = useState<MetadataField[]>(initialFields);
  const [showPreview, setShowPreview] = useState(true);
  const [showFileSize, setShowFileSize] = useState(true);
  const [showLastEdit, setShowLastEdit] = useState(true);

  const updateField = (id: string, value: string) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, value } : f)));
  };

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
          <button className="w-full px-3 py-2 text-sm text-ink-muted bg-paper border border-border rounded-md text-left">
            Select icon...
          </button>
          <div className="flex items-center justify-between mt-2">
            <Checkbox checked={true} onChange={() => {}} label="Show icon" />
            <button className="text-xs text-ink-muted hover:text-ink-secondary">Clear</button>
          </div>
        </EditSection>

        {/* Document */}
        <EditSection label="Document*">
          <div className="flex items-center gap-2">
            <div className="flex-1 px-3 py-2 text-sm text-ink bg-paper border border-border rounded-md truncate">
              Choose file &nbsp; {pdf.name}
            </div>
            <button className="px-3 py-1.5 text-xs font-medium text-seal rounded-md hover:bg-seal-tint transition-colors">
              Remove file
            </button>
          </div>
          <div className="flex items-center gap-4 mt-2">
            <Checkbox checked={showPreview} onChange={setShowPreview} label="Show preview" />
            <Checkbox checked={true} onChange={() => {}} label="Extract file metadata" />
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

        {/* Editable fields */}
        {fields
          .filter((f) => !["description", "country", "other-files"].includes(f.id))
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
              ) : field.type === "link" ? (
                <input
                  type="text"
                  value={field.value}
                  onChange={(e) => updateField(field.id, e.target.value)}
                  className="w-full px-3 py-2 text-sm text-ink bg-paper border border-border rounded-md
                    focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40"
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

        {/* Other Files */}
        <EditSection label="Other Files">
          {fields
            .find((f) => f.id === "other-files")
            ?.items?.map((item, i) => (
              <div key={i} className="space-y-1">
                <span className="text-xs text-ink-tertiary">{item.label}</span>
                <input
                  type="text"
                  defaultValue={item.value}
                  className="w-full px-3 py-2 text-sm text-ink bg-paper border border-border rounded-md
                    focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40"
                />
              </div>
            ))}
        </EditSection>
      </div>

      {/* Edit action bar */}
      <div
        className="flex items-center justify-end gap-3 h-12 px-4 bg-paper shrink-0"
        style={{ borderTop: "1px solid var(--border-primary)" }}
      >
        <button
          onClick={onCancel}
          className="px-4 py-1.5 text-xs font-medium text-ink rounded-md border border-border hover:bg-warm transition-colors"
        >
          Cancel
        </button>
        <button
          onClick={onSave}
          className="px-4 py-1.5 text-xs font-medium text-white bg-success rounded-md hover:bg-success/90 transition-colors"
        >
          Save
        </button>
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

function EditInput({ label, value, placeholder }: { label: string; value: string; placeholder?: string }) {
  const [val, setVal] = useState(value);
  return (
    <div className="flex-1">
      {label && <span className="text-xs text-ink-tertiary">{label}</span>}
      <input
        type="text"
        value={val}
        onChange={(e) => setVal(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-1.5 text-sm text-ink bg-paper border border-border rounded-md
          focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40
          placeholder:text-ink-muted"
      />
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

const drawerTabs = [
  { id: "files", label: "Files", count: 4 },
  { id: "relationships", label: "Relationships", count: 14 },
  { id: "template", label: "Template" },
];

function MetadataDrawer() {
  const [activeDrawerTab, setActiveDrawerTab] = useState("files");
  const language = useAtom(languageAtom)[0];
  const doc = documentsByLanguage[language];
  const pdf = pdfMetadataByLanguage[language];

  return (
    <div className="flex flex-col h-full">
      <DrawerTabs tabs={drawerTabs} activeId={activeDrawerTab} onChange={setActiveDrawerTab} />

      {activeDrawerTab === "template" ? (
        <TemplateStructure />
      ) : activeDrawerTab === "files" ? (
        <>
          <div className="flex-1 overflow-auto px-3 py-3 pb-8 space-y-3">
            <DrawerFileRow
              title={doc.title}
              filename={pdf.name}
              type={pdf.type}
              size={pdf.size}
              starred
              thumbnail={
                <div className="w-20 h-full bg-warm flex items-center justify-center rounded-l-md shrink-0">
                  <div className="bg-paper rounded shadow-sm w-14 h-16 flex items-center justify-center">
                    <span className="text-[8px] text-ink-muted">PDF</span>
                  </div>
                </div>
              }
            />
            <DrawerFileRow
              title="Audiencia — Velásquez Rodríguez"
              filename="audiencia_velasquez_rodriguez_1987.wav"
              type="WAV"
              size="18.7 MB"
              thumbnail={
                <div className="w-20 h-full bg-warm flex items-center justify-center rounded-l-md shrink-0">
                  <div className="w-10 h-10 rounded-md bg-parchment flex items-center justify-center shadow-sm">
                    <div className="w-0 h-0 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent border-l-[9px] border-l-ink ml-0.5" />
                  </div>
                </div>
              }
            />
            <DrawerFileRow
              title="Video — Audiencia pública CorteIDH"
              filename="https://youtube.com/watch?v=iachr-velasquez"
              type="Link"
              size="—"
              thumbnail={
                <div className="w-20 h-full bg-seal flex items-center justify-center rounded-l-md shrink-0">
                  <span className="text-[9px] font-bold text-white">YouTube</span>
                </div>
              }
            />
          </div>

          <div
            className="flex items-center gap-3 h-12 px-3 bg-paper shrink-0"
            style={{ borderTop: "1px solid var(--border-primary)" }}
          >
            <button className="px-3 py-1.5 text-xs font-medium text-ink rounded-md border border-border hover:bg-warm transition-colors">
              Add file
            </button>
            <span className="text-xs text-ink-muted">
              Learn more about <span className="font-bold underline">files</span>
            </span>
          </div>
        </>
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-ink-muted capitalize">{activeDrawerTab} content</p>
        </div>
      )}
    </div>
  );
}

/* ── Drawer File Row ── */

interface DrawerFileRowProps {
  title: string;
  filename: string;
  type: string;
  size: string;
  starred?: boolean;
  thumbnail: React.ReactNode;
}

function DrawerFileRow({ title, filename, type, size, starred, thumbnail }: DrawerFileRowProps) {
  return (
    <div className="flex border border-border/50 rounded-md overflow-hidden bg-paper hover:bg-warm/50 transition-colors">
      {/* Thumbnail */}
      <div className="relative">
        {thumbnail}
        {starred && (
          <span className="absolute top-1.5 left-1.5 px-1 py-0.5 text-[8px] font-semibold uppercase tracking-wide rounded bg-warning-light text-warning leading-none">
            Default
          </span>
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 px-3 py-2.5 flex flex-col justify-center gap-1">
        <p className="text-sm font-bold text-ink truncate">{title}</p>
        <p className="text-xs text-ink-muted truncate">{filename}</p>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-ink-tertiary">Type</span>
            <span className="text-[11px] font-medium text-ink">{type}</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="text-[11px] text-ink-tertiary">Size</span>
            <span className="text-[11px] font-medium text-ink">{size}</span>
          </div>
        </div>
      </div>

      {/* View button */}
      <div className="flex items-center pr-3 shrink-0">
        <button className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-ink rounded border border-border hover:bg-parchment transition-colors">
          <ChevronRight size={12} /> View
        </button>
      </div>
    </div>
  );
}
