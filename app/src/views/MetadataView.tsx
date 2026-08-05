import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useAtom, useAtomValue, useSetAtom } from "jotai";
import { Search, ClipboardCopy } from "lucide-react";
import { AdaptiveSplitView } from "../components/layout/AdaptiveSplitView";
import { MainTabs } from "../components/layout/MainTabs";
import { DrawerTabs } from "../components/layout/DrawerTabs";
import { DocMeta } from "../components/layout/DocMeta";
import { MetadataRecord } from "../components/metadata/MetadataRecord";
import { ConnectionGroupCard } from "../components/metadata/ConnectionGroupCard";
import { RelationshipFieldCard } from "../components/metadata/RelationshipFieldCard";
import { RelationshipCards } from "../components/metadata/RelationshipCards";
import { RelationshipFieldEditor } from "../components/metadata/RelationshipFieldEditor";
import { CopyFromPicker } from "../components/metadata/CopyFromPicker";
import { CopyFieldRow } from "../components/metadata/CopyFieldRow";
import { ProvenanceLine } from "../components/shared/ProvenanceLine";
import { EntityPill } from "../components/shared/EntityPill";
import { copyPreviewAtom } from "../atoms/copyFrom";
import { overlayEntityIdAtom } from "../atoms/references";
import { planCopyFrom, type CopyMatch } from "../utils/copyFrom";
import { TemplateStructure } from "../components/relationships/TemplateStructure";
import { EntityOverlay } from "../components/relationships/EntityOverlay";
import { groupConnections, relationLabel, specInherits } from "../utils/inheritance";
import {
  type MetadataField,
  type RelationshipMetadataField,
} from "../data/metadata";
import { focusedEntityIdAtom } from "../atoms/focusedEntity";
import { getEntity, type Entity } from "../data/entities";
import { getEntityProfile } from "../data/entityProfiles";
import { filesAtom } from "../atoms/files";
import { activeFilterCountAtom } from "../atoms/filters";
import { languageAtom, type Language } from "../atoms/language";
import { entityMetadataAtom, makeEntityPropReader } from "../atoms/entityMetadata";
import { DrawerFilesBody } from "../components/files/DrawerFilesBody";
import { EditInput } from "../components/metadata/EditInput";
import { scopedReferencesAtom } from "../atoms/references";
import { RelationshipsDrawerSection } from "../components/relationships/RelationshipsDrawerSection";
import { DocumentViewer } from "../components/viewer/DocumentViewer";
import { useNotify } from "../hooks/useNotify";
import { ShareEntityModal } from "../components/share/ShareEntityModal";

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
      mobileSections={[
        { id: "details", label: "Details", content: <MetadataDrawer /> },
      ]}
    />
  );
}

/* ── Read Mode ── */

function MetadataReadBody({ onEdit, menuSlot }: { onEdit: () => void; menuSlot?: ReactNode }) {
  const language = useAtom(languageAtom)[0];
  const profile = getEntityProfile(useAtomValue(focusedEntityIdAtom));
  const allFields = profile.metadata[language];
  const fields = allFields.filter((f): f is MetadataField => f.type !== "relationship");
  const notify = useNotify();
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <>
      <DocMeta showPdfSelector={false} />
      <ShareEntityModal open={shareOpen} onClose={() => setShareOpen(false)} />

      <div className="flex-1 overflow-auto px-4 py-3 pb-8">
        {/* Full width — no 56rem cap. The label|value table sizes its label column
            to the labels and lets values run in one column, so a wide pane just
            gives the values more room rather than stretching a line of prose. */}
        <div className="w-full space-y-3">
          {/* The record itself — the SAME component the drawer renders. */}
          <MetadataRecord profile={profile} language={language} />
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
          onClick={() => setShareOpen(true)}
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
  const getProp = makeEntityPropReader(useAtomValue(entityMetadataAtom));
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
  // Read-only fields (CEJIL projections, chain-traversed inheritance) are NOT
  // editable inline — they render as read cards below (design doc Q6).
  const allRelFields = profile.metadata[language].filter(
    (f): f is RelationshipMetadataField => f.type === "relationship",
  );
  const relFields = allRelFields.filter((f) => !f.readOnly);
  const readOnlyRel = groupConnections(allRelFields.filter((f) => f.readOnly), language, getProp);
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
      columns: specInherits(f)
        ? [{
            fieldId: f.id,
            label: f.inheritLabel ?? f.label,
            inheritProperty: f.inheritProperty,
            inheritPath: f.inheritPath,
            inheritLeaf: f.inheritLeaf,
          }]
        : [],
      entityIds: f.connectedEntityIds,
    })),
  ];
  const [connections, setConnections] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(connectionDefs.map((d) => [d.key, d.entityIds])),
  );

  /* ── Copy From ────────────────────────────────────────────────────────────
     Staged in two steps, and NEITHER writes the entity: picking a source opens
     a preview, staging fills this form's local state, and the user still presses
     Save. Cancelling the edit throws all of it away with everything else, which
     is why none of it lives in an atom except the preview the overlay reads. */
  const [pickerOpen, setPickerOpen] = useState(false);
  const setPreview = useSetAtom(copyPreviewAtom);
  const setOverlayEntity = useSetAtom(overlayEntityIdAtom);
  /** The staged set: what would copy, and which of it the user still wants. */
  const [stage, setStage] = useState<{
    source: Entity;
    matches: CopyMatch[];
    checked: Record<string, boolean>;
  } | null>(null);
  /** fieldId → the entity it was copied from. Survives until the edit ends. */
  const [copiedFrom, setCopiedFrom] = useState<Record<string, string>>({});
  const target = getEntity(focusedId);

  const preview = (source: Entity) => {
    if (!target) return;
    const plan = planCopyFrom(target, source, language);
    setPickerOpen(false);
    setPreview({
      sourceId: source.id,
      plan,
      onUse: () => {
        setStage({
          source,
          matches: plan.matches,
          // Defaulted to the matched set, as asked — except the ones that would
          // CLEAR a value, which is a destructive default nobody expects from a
          // button labelled "copy".
          checked: Object.fromEntries(plan.matches.map((m) => [m.id, !m.emptyOnSource])),
        });
        setPreview(null);
        setOverlayEntity(null);
      },
      onBack: () => {
        setPreview(null);
        setOverlayEntity(null);
        setPickerOpen(true);
      },
    });
    setOverlayEntity(source.id);
  };

  /** Commit: write ONLY the checked fields into this form's state, and remember
   *  where each came from. Still nothing saved. */
  const commitCopy = () => {
    if (!stage) return;
    const taking = stage.matches.filter((m) => stage.checked[m.id]);
    setFields((prev) =>
      prev.map((f) => {
        const m = taking.find((x) => x.id === f.id && x.copies === "value");
        return m ? { ...f, value: m.sourceValue ?? "" } : f;
      }),
    );
    setConnections((prev) => {
      const next = { ...prev };
      for (const m of taking) {
        if (m.copies !== "connection") continue;
        // Singles are keyed by field id; grouped connections by their shared
        // key, so find whichever def actually owns this field.
        const def =
          connectionDefs.find((d) => d.key === m.id) ??
          connectionDefs.find((d) => d.columns.some((c) => c.fieldId === m.id));
        if (def) next[def.key] = m.sourceConnectedEntityIds ?? [];
      }
      return next;
    });
    setCopiedFrom((prev) => ({
      ...prev,
      ...Object.fromEntries(taking.map((m) => [m.id, stage.source.id])),
    }));
    setStage(null);
  };

  const cancelCopy = () => {
    setStage(null);
    setPreview(null);
    setOverlayEntity(null);
    setPickerOpen(false);
  };

  const stagedById = useMemo(
    () => new Map((stage?.matches ?? []).map((m) => [m.id, m])),
    [stage],
  );
  const checkedCount = stage
    ? stage.matches.filter((m) => stage.checked[m.id]).length
    : 0;
  /* Once a copy is in play, EVERY field reserves its provenance slot, so the
     line landing on commit cannot shove the fields below it (PATTERNS §3). */
  const copyActive = stage !== null || Object.keys(copiedFrom).length > 0;

  return (
    <>
      {pickerOpen && target && (
        <CopyFromPicker target={target} onPreview={preview} onClose={() => setPickerOpen(false)} />
      )}
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
          <div className="h-40 bg-warm rounded-md flex items-center justify-center overflow-hidden">
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
              {stagedById.get(field.id) && stage && (
                <CopyFieldRow
                  match={stagedById.get(field.id)!}
                  checked={!!stage.checked[field.id]}
                  onChange={(v) =>
                    setStage((prev) =>
                      prev ? { ...prev, checked: { ...prev.checked, [field.id]: v } } : prev,
                    )
                  }
                />
              )}
              <CopyProvenanceSlot active={copyActive} sourceId={copiedFrom[field.id]} />
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

        {/* Derived / chain-traversed relationships — shown read-only here; they
            aren't edited inline (managed via the relationship graph). */}
        {(readOnlyRel.groups.length > 0 || readOnlyRel.singles.length > 0) && (
          <>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-ink-tertiary pt-2">
              Derived relationships · read-only
            </h3>
            <div className="grid gap-3 grid-cols-1">
              {readOnlyRel.groups.map((group) => (
                <ConnectionGroupCard key={group.connectionKey} group={group} />
              ))}
              {readOnlyRel.singles.map((field) => (
                <RelationshipFieldCard key={field.id} field={field} span="full" />
              ))}
            </div>
          </>
        )}
      </div>

      {/* Edit action bar */}
      <div
        className="flex items-center justify-end gap-3 h-12 px-4 bg-paper shrink-0"
        style={{ borderTop: "1px solid var(--border-primary)" }}
      >
        {/* EDIT MODE ONLY — this whole bar exists only while editing, which is
            the same rule Uwazi's `.copy-from-btn` follows. */}
        {stage ? (
          <>
            <span className="me-auto text-[11px] text-ink-tertiary">
              {checkedCount} of {stage.matches.length} staged from
              <span className="ms-1 align-middle">
                <EntityPill typeId={stage.source.typeId} label={stage.source.title} />
              </span>
            </span>
            <button
              onClick={cancelCopy}
              className="px-3 py-1.5 text-xs font-medium text-ink-secondary bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer"
            >
              Discard copy
            </button>
            <button
              onClick={commitCopy}
              disabled={checkedCount === 0}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                checkedCount === 0
                  ? "bg-vellum text-ink-muted cursor-not-allowed"
                  : "bg-ink text-paper hover:bg-ink/90 cursor-pointer"
              }`}
            >
              Copy {checkedCount} {checkedCount === 1 ? "field" : "fields"}
            </button>
          </>
        ) : (
          <button
            onClick={() => setPickerOpen(true)}
            className="me-auto inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-ink-secondary
              bg-warm hover:bg-parchment hover:text-ink rounded-md transition-colors cursor-pointer
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30"
          >
            <ClipboardCopy size={13} className="text-ink-tertiary" />
            Copy from…
          </button>
        )}
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
      <div className="border border-border rounded-md max-h-60 overflow-auto">
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
  const relFilterCount = useAtomValue(activeFilterCountAtom);
  const drawerTabs = [
    ...(profile.hasDocument ? [{ id: "document", label: "Document" }] : []),
    {
      id: "connections",
      label: "Relationships",
      count: references.length,
      dot: relFilterCount > 0,
    },
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

/** The "↳ copied from …" stamp, in a slot that is reserved the moment a copy is
 *  in play rather than created when the line lands — otherwise committing a copy
 *  would push every field below it down (PATTERNS §3).
 *
 *  This is the undo-adjacent affordance Uwazi has no answer for (research
 *  weakness #4): their copy is irreversible except by discarding the entire edit
 *  session, because after the values land nothing records which fields moved or
 *  where they came from. Naming the source per field means a user can put one
 *  back by hand, and knows what to put back. */
function CopyProvenanceSlot({ active, sourceId }: { active: boolean; sourceId?: string }) {
  if (!active) return null;
  const source = sourceId ? getEntity(sourceId) : undefined;
  return (
    <div className="h-5 flex items-center">
      {source && (
        <ProvenanceLine label="copied from">
          <EntityPill typeId={source.typeId} label={source.title} />
        </ProvenanceLine>
      )}
    </div>
  );
}
