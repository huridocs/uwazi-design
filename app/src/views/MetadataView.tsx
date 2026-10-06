import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useAtom, useAtomValue, useSetAtom, useStore } from "jotai";
import { Search, ClipboardCopy, ChevronDown, Pin } from "lucide-react";
import { AdaptiveSplitView } from "../components/layout/AdaptiveSplitView";
import { MainTabs } from "../components/layout/MainTabs";
import { DrawerTabs } from "../components/layout/DrawerTabs";
import { DocMeta } from "../components/layout/DocMeta";
import { MetadataRecord } from "../components/metadata/MetadataRecord";
import { ConnectionGroupCard } from "../components/metadata/ConnectionGroupCard";
import { RelationshipFieldCard } from "../components/metadata/RelationshipFieldCard";
import { RelationshipFieldEditor } from "../components/metadata/RelationshipFieldEditor";
import { CopyFromPicker } from "../components/metadata/CopyFromPicker";
import { ProvenanceLine } from "../components/shared/ProvenanceLine";
import { EntityPill } from "../components/shared/EntityPill";
import { FieldMessage, issueBorderClass } from "../components/shared/FieldMessage";
import { UwaziLoader } from "../components/shared/UwaziLoader";
import {
  validateValue,
  countBySeverity,
  blockingSummary,
  type ValidationIssue,
  type ValueKind,
} from "../utils/validation";
import { fillTargetAtom, fillRequestAtom } from "../atoms/fillTarget";
import { ListeningChip } from "../components/metadata/ListeningChip";
import { MultiLanguageField } from "../components/metadata/MultiLanguageField";
import type { CopyMatch, CopyPlan, CopyUnit } from "../utils/copyFrom";
import { templateFields, type EditResult } from "../utils/createEntity";
import { TemplateStructure } from "../components/relationships/TemplateStructure";
import { EntityPreviewSlideOver } from "../components/relationships/EntityPreviewSlideOver";
import { groupConnections, relationLabel, specInherits } from "../utils/inheritance";
import {
  chosenLabels,
  withLabels,
  type MetadataField,
  type RelationshipMetadataField,
} from "../data/metadata";
import { AddThesaurusValueModal, ThesaurusPicker } from "../components/metadata/ThesaurusPicker";
import { BulkEditBody } from "../components/metadata/BulkEditBody";
import {
  addThesaurusValueAtom,
  bindingKey,
  createThesaurusAtom,
  fieldKeys,
  foldLabel,
  labelsForKeys,
  localizeValues,
  pseudoKey,
  selectableLabels,
  thesauriAtom,
  thesaurusBindingsAtom,
} from "../atoms/thesauri";
import type { Corpus } from "../data/entityChanges";
import type { ThesaurusValue } from "../data/settings";
import { focusedEntityIdAtom } from "../atoms/focusedEntity";
import { breakpointAtom } from "../atoms/viewport";
import { draftEntityIdAtom, draftPinsAtom, draftTitlesAtom, pinKey, recentTemplatesAtom, retypeDraftAtom, saveEntityEditAtom } from "../atoms/entityChanges";
import { entityCorpusOf, getEntity, getEntityType, type Entity } from "../data/entities";
import { templateMirror } from "../data/templates/mirror";
import { corpusTypes } from "../atoms/dataSource";
import { entityTypesAtom } from "../atoms/entities";
import { typeLabelColor } from "../utils/typeColor";
import { getEntityProfile } from "../data/entityProfiles";
import { filesAtom } from "../atoms/files";
import { activeFilterCountAtom } from "../atoms/filters";
import { LANGUAGES, languageAtom, type Language } from "../atoms/language";
import { entityMetadataAtom, makeEntityPropReader } from "../atoms/entityMetadata";
import { DrawerFilesBody } from "../components/files/DrawerFilesBody";
import { EditInput } from "../components/metadata/EditInput";
import { scopedReferencesAtom } from "../atoms/references";
import { RelationshipsDrawerSection } from "../components/relationships/RelationshipsDrawerSection";
import { RelationshipsFiltersTab, useRelFiltersDock } from "../components/relationships/RelationshipsFiltersTab";
import { useNotify } from "../hooks/useNotify";
import { useRegisterDirtyForm } from "../hooks/useDirtyGuard";
import { EntityBarActions } from "../components/entity/EntityBarActions";
import { ModalHostProvider } from "../components/shared/Modal";
import { fromDateInputValue, toDateInputValue } from "../utils/dateValue";
import { DateInput } from "../components/shared/DateInput";
import { DRAWER_MIN_WIDTH } from "../hooks/useDrawerWidth";
import { BAR_DANGER, BAR_GHOST, BAR_LEAD } from "../components/shared/warmButton";
import { ConfirmDialog } from "../components/shared/ConfirmDialog";
import { TemplateSelect } from "../components/shared/TemplateSelect";
import { flashElement } from "../utils/flash";
import { MediaFieldEditor } from "../components/metadata/MediaFieldEditor";
import { TypedFieldEditor } from "../components/metadata/TypedFieldEditors";
import { armsOnFocus, withLink } from "../utils/typedValues";

interface MetadataViewProps {
  tabs: { id: string; label: string; count?: number }[];
  activeTab: string;
  onTabChange: (id: string) => void;
  onBack?: () => void;
}

export function MetadataView({ tabs, activeTab, onTabChange, onBack }: MetadataViewProps) {
  const [editing, setEditing] = useState(false);
  const [language, setLanguage] = useAtom(languageAtom);
  const focusedId = useAtomValue(focusedEntityIdAtom);
  const saveEdit = useSetAtom(saveEntityEditAtom);

  // The pane Copy From covers, tab strip included (see ModalHostProvider).
  const [paneEl, setPaneEl] = useState<HTMLDivElement | null>(null);

  const renderLeft = (menuTrigger?: ReactNode) => (
    // Narrow gutter host, like the other entity tabs: all four share one tab
    // strip, so a different gutter here would move the strip on tab switch.
    <ModalHostProvider host={paneEl}>
    <div ref={setPaneEl} data-gutter-host className="gutter-host relative flex flex-col h-full min-h-0 bg-paper">
      <MainTabs
        tabs={tabs}
        activeId={activeTab}
        onChange={onTabChange}
        onBack={onBack}
        languages={LANGUAGES}
        availableLanguages={LANGUAGES}
        activeLanguage={language}
        onLanguageChange={(lang) => setLanguage(lang as Language)}
        /* While editing, the picker selects the language being written: every
           field's editor and MultiLanguageField's `current` follow it, so
           MainTabs labels it as such. */
        languageEditing={editing}
      />

      {editing ? (
        <MetadataEditBody
          onCancel={() => setEditing(false)}
          onSave={(result) => {
            saveEdit({ id: focusedId, result, language });
            setEditing(false);
          }}
          menuSlot={menuTrigger}
        />
      ) : (
        <MetadataReadBody onEdit={() => setEditing(true)} onDeleted={onBack} menuSlot={menuTrigger} />
      )}
    </div>
    </ModalHostProvider>
  );

  return (
    <AdaptiveSplitView
      left={renderLeft()}
      mobileLeft={(menuTrigger) => renderLeft(menuTrigger)}
      right={<MetadataDrawer />}
      defaultRightWidth={560}
      minRightWidth={DRAWER_MIN_WIDTH}
      mobileSections={[
        { id: "details", label: "Details", content: <MetadataDrawer /> },
      ]}
    />
  );
}

/* ── Read Mode ── */

function MetadataReadBody({
  onEdit,
  onDeleted,
  menuSlot,
}: {
  onEdit: () => void;
  /** After Delete: the entity is gone, so the view leaves it. */
  onDeleted?: () => void;
  menuSlot?: ReactNode;
}) {
  const language = useAtom(languageAtom)[0];
  const focusedId = useAtomValue(focusedEntityIdAtom);
  const profile = getEntityProfile(focusedId);
  const allFields = profile.metadata[language];
  const fields = allFields.filter((f): f is MetadataField => f.type !== "relationship");
  const mobile = useAtomValue(breakpointAtom) === "mobile";

  return (
    <>
      <DocMeta showPdfSelector={false} />

      <div className="bleed flex-1 overflow-auto body-top pb-8">
        {/* Full width, no max-width cap: the label column sizes to the labels,
            so a wide pane only gives the values more room. */}
        <div className="w-full space-y-3">
          {/* The same component the drawer renders. */}
          <MetadataRecord profile={profile} language={language} />
        </div>
      </div>

      
      {/* Action bar */}
      <div
        className="bleed flex items-center gap-3 h-12 bg-paper shrink-0"
        style={{ borderTop: "1px solid var(--border-primary)" }}
      >
        <button
          onClick={onEdit}
          data-gutter-align="box"
          className={`px-3 py-1.5 text-xs font-medium ${BAR_LEAD} rounded-md transition-colors cursor-pointer`}
        >
          Edit
        </button>
        {/* Share, Permissions | Delete for this entity. Icon-only below 768px:
            with labels the bar overflows phone widths and pushes the sheet menu
            off screen. */}
        <EntityBarActions entityId={focusedId} onDeleted={onDeleted} compact={mobile} />
        <div className="flex-1" />
        {menuSlot}
      </div>
    </>
  );
}

/* ── Edit Mode ── */

export interface MetadataEditBodyProps {
  onCancel: () => void;
  /** Called after the mocked save succeeds, with every language's title and
   *  scalar fields. Creating an entity reads it; other hosts only close. */
  onSave: (result: EditResult) => void;
  menuSlot?: ReactNode;
  /** Must be distinct per mounted instance: the Metadata view and the Library
   *  drawer can both mount this form, and the dirty-form registry and
   *  click-to-fill key off the session id (a shared id would collide). */
  sessionId?: string;
  /** Label for these edits in the discard confirm. */
  dirtyLabel?: string;
  /** Drawer flavour: tighter gutters and no side-by-side field pairs. */
  compact?: boolean;
  /** The focused entity (default), or a bulk set edited by `BulkEditBody`. */
  subject?: { kind: "entity" } | { kind: "bulk"; ids: string[] };
  /** Creating an entity: Template leads the form, properties take pins, and
   *  the bar offers "Save and create another". */
  draft?: { onSaveAndNew: (result: EditResult, pinned: ReadonlySet<string>) => void };
}

/** The metadata edit form. Exported so the Library's entity drawer renders this
 *  component instead of a copy; a second copy of validation, click-to-fill,
 *  Copy From and the dirty guard would drift.
 *
 *  A bulk subject renders `BulkEditBody`, whose fields show whether the
 *  entities agree. Split here so neither form's hooks run for the other. */
export function MetadataEditBody(props: MetadataEditBodyProps) {
  const subject = props.subject;
  if (subject?.kind === "bulk")
    return <BulkEditBody ids={subject.ids} onCancel={props.onCancel} onApplied={() => props.onCancel()} />;
  return <EntityEditBody {...props} />;
}

function EntityEditBody({
  onCancel,
  onSave,
  draft,
  menuSlot,
  sessionId = "metadata-edit",
  dirtyLabel = "Metadata edits",
  compact = false,
}: MetadataEditBodyProps) {
  const language = useAtom(languageAtom)[0];
  const focusedId = useAtomValue(focusedEntityIdAtom);
  const getProp = makeEntityPropReader(useAtomValue(entityMetadataAtom));
  const profile = getEntityProfile(focusedId);
  /* ── Title, per language ─────────────────────────────────────────────────
     Uwazi stores a title per language, so the form holds all of them.
     `titles` is the whole record; `title` is the current language's slice,
     which validation, click-to-fill, the dirty guard and the save read. */
  const authoredTitles = useMemo<Partial<Record<Language, string>>>(
    () => Object.fromEntries(
      LANGUAGES.map((l) => [l, profile.document?.[l]?.title]).filter(([, v]) => v),
    ),
    [profile],
  );
  // A retyped draft's form remounts with the titles it held, per language.
  const draftTitles = useAtomValue(draftTitlesAtom);
  const initialTitles = useMemo(() => {
    if (draftTitles?.id === focusedId) return draftTitles.titles;
    const fallback = getEntity(focusedId)?.title ?? "";
    return Object.fromEntries(
      LANGUAGES.map((l) => [l, profile.document?.[l]?.title ?? fallback]),
    ) as Record<Language, string>;
    // eslint-disable-next-line react-hooks/exhaustive-deps -- read once, at mount
  }, [profile, focusedId]);
  /* Scalar fields are held per language, like the title: Uwazi stores text
     values per language, and one shared array would save one language's text
     into another's record. `fields` / `setFields` address the current slice. */
  const initialFieldsByLang = useMemo(
    () =>
      Object.fromEntries(
        LANGUAGES.map((l) => [
          l,
          profile.metadata[l].filter((f): f is MetadataField => f.type !== "relationship"),
        ]),
      ) as Record<Language, MetadataField[]>,
    [profile],
  );
  const initialFields = initialFieldsByLang[language];
  const [titles, setTitles] = useState<Record<Language, string>>(initialTitles);
  /** Languages holding a machine-written value no human has touched yet. */
  const [machineTitles, setMachineTitles] = useState<Partial<Record<Language, boolean>>>({});
  const title = titles[language];
  const setTitle = (v: string) => setTitleFor(language, v);
  const setTitleFor = (lang: Language, v: string, machine = false) => {
    setTitles((prev) => ({ ...prev, [lang]: v }));
    setMachineTitles((prev) => (prev[lang] === machine ? prev : { ...prev, [lang]: machine }));
  };
  const [fieldsByLang, setFieldsByLang] =
    useState<Record<Language, MetadataField[]>>(initialFieldsByLang);
  const fields = fieldsByLang[language];
  const setFields = (updater: (prev: MetadataField[]) => MetadataField[]) =>
    setFieldsByLang((prev) => ({ ...prev, [language]: updater(prev[language]) }));
  /** Machine-written values, by field id then language. Cleared per cell the
   *  moment a person types in it. */
  const [machineFields, setMachineFields] =
    useState<Record<string, Partial<Record<Language, boolean>>>>({});
  const [showIcon, setShowIcon] = useState(true);
  /* The icon section stays closed until "Add icon" in the Title row opens it,
     since most entities have none. An entity with an icon shows it open: a set
     value is never hidden behind a disclosure. */
  const [icon, setIcon] = useState<string | null>(null);
  const [iconOpen, setIconOpen] = useState(false);
  const iconShown = iconOpen || icon !== null;
  /** On a draft, changing it retypes the draft (`retypeDraftAtom`): values
      whose key and type the new template shares carry over, the rest drop, and
      the form remounts. On a saved entity it is presentational only. */
  const [templateId, setTemplateId] = useState(profile.typeId);
  // The template's own name for its title (Settings › Templates may rename it).
  const titleLabel =
    templateMirror(entityCorpusOf(focusedId), templateId)?.commonProperties.find((p) => p.name === "title")?.label || "Title";
  const draftId = useAtomValue(draftEntityIdAtom);
  const retypeDraft = useSetAtom(retypeDraftAtom);
  /** A template change that would drop values asks first, naming them. */
  const [pendingTemplate, setPendingTemplate] = useState<{ typeId: string; labels: string[] } | null>(null);
  const requestTemplate = (typeId: string) => {
    if (draftId !== focusedId || typeId === profile.typeId) return changeTemplate(typeId);
    const next = templateFields(typeId, entityCorpusOf(focusedId));
    const labels = new Set<string>();
    for (const l of LANGUAGES) {
      const keep = new Map(next[l].map((f) => [f.id, f.type]));
      for (const f of fieldsByLang[l]) {
        if (f.id === "description") continue;
        const filled = !!(f.value?.trim() || f.values?.length);
        if (filled && keep.get(f.id) !== f.type) labels.add(f.label);
      }
    }
    if (labels.size) setPendingTemplate({ typeId, labels: [...labels] });
    else changeTemplate(typeId);
  };
  const changeTemplate = (typeId: string) => {
    setTemplateId(typeId);
    if (draftId !== focusedId || typeId === profile.typeId) return;
    const next = templateFields(typeId, entityCorpusOf(focusedId));
    const carried = Object.fromEntries(
      LANGUAGES.map((l) => {
        const had = new Map(fieldsByLang[l].map((f) => [f.id, f]));
        const out: MetadataField[] = next[l].map((f) => {
          const h = had.get(f.id);
          if (!h || h.type !== f.type) return f;
          return {
            ...f,
            value: h.value,
            ...(h.values ? { values: h.values } : {}),
            ...(h.valueIds ? { valueIds: h.valueIds } : {}),
          };
        });
        // Description is the form's own box, not a template property.
        const desc = had.get("description");
        if (desc && !out.some((f) => f.id === "description")) out.push(desc);
        return [l, out];
      }),
    ) as Record<Language, MetadataField[]>;
    retypeDraft({ id: focusedId, typeId, fieldsByLang: carried, title: titles[language] ?? "", titles });
  };
  const notify = useNotify();

  /* ── Pins (drafts only) ── A pinned value carries into the next draft on
     "Save and create another", per corpus and template (`draftPinsAtom`).
     Title, Description, files and connections never pin: they identify the record. */
  const [pinsByKey, setPinsByKey] = useAtom(draftPinsAtom);
  const pinK = pinKey(entityCorpusOf(focusedId), profile.typeId);
  const pinned = useMemo(() => new Set(pinsByKey[pinK] ?? []), [pinsByKey, pinK]);
  const togglePin = (id: string) =>
    setPinsByKey((prev) => {
      const cur = new Set(prev[pinK] ?? []);
      if (cur.has(id)) cur.delete(id);
      else cur.add(id);
      return { ...prev, [pinK]: [...cur] };
    });
  const pinFor = (id: string, label: string) =>
    draft ? <PinToggle pinned={pinned.has(id)} label={label} onToggle={() => togglePin(id)} /> : undefined;

  /* ── Validation ──────────────────────────────────────────────────────────
     Errors block save; warnings allow it (rules in utils/validation.ts).
     `fields` is the scalar subset, so relationship fields are exempt. Checked
     on blur and save; a flagged field re-checks live so a fix clears it. */
  const kindOf = (t: MetadataField["type"]): ValueKind =>
    t === "date" ? "date" : t === "link" ? "link" : t === "multiline" ? "multiline" : "text";
  const scalarEditable = fields.filter(
    (f) => f.id !== "description" && f.type !== "country" && f.type !== "file-list",
  );
  /** The media editor validates its own value and reports here. A ref, so a
   *  save reads the result of the same keystroke, not the last render. Unset
   *  for an untouched value: stored data does not block a save. */
  const mediaIssues = useRef<Record<string, ValidationIssue | null>>({});
  const issueFor = (id: string, value: string): ValidationIssue | null => {
    if (id === "title") return validateValue("text", value, { required: true, label: titleLabel });
    if (id === "description")
      return validateValue("multiline", value, { required: true, label: "Description" });
    const f = fields.find((x) => x.id === id);
    if (f?.type === "media") return mediaIssues.current[id] ?? null;
    return f ? validateValue(kindOf(f.type), value, { label: f.label }) : null;
  };
  const [issues, setIssues] = useState<Record<string, ValidationIssue | null>>({});
  const [saveAttempted, setSaveAttempted] = useState(false);
  /* A language switch changes the Title value on screen, so clear its message;
     it re-flags on blur or save. */
  useEffect(() => {
    setIssues((prev) => (prev.title ? { ...prev, title: null } : prev));
  }, [language]);
  const flag = (id: string, value: string) =>
    setIssues((prev) => ({ ...prev, [id]: issueFor(id, value) }));
  /** Live re-check, but only for fields already carrying a message. */
  const reflag = (id: string, value: string) =>
    setIssues((prev) => (prev[id] ? { ...prev, [id]: issueFor(id, value) } : prev));
  const { errors: errorCount, warnings: warningCount } = countBySeverity(Object.values(issues));
  // EditSection's htmlFor uses the same `field-${id}` scheme; keep them aligned.
  const inputId = (id: string) => `field-${id}`;
  const msgId = (id: string) => `field-${id}-msg`;
  const fieldAria = (id: string) => ({
    "aria-invalid": issues[id]?.severity === "error" || undefined,
    "aria-describedby": issues[id] ? msgId(id) : undefined,
  });

  /* ── Save lifecycle ── idle → saving → failed → retry, mocked at 800ms. A
     title containing "[fail]" always fails, to demo the failed state. Success
     unmounts the session (and its dirty registration) via onSave(); failure
     stays mounted and shows on the button, and a click re-validates and retries. */
  const [saveState, setSaveState] = useState<"idle" | "saving" | "failed">("idle");
  const saving = saveState === "saving";
  const aliveRef = useRef(true);
  // Set true on mount, not only false on unmount: StrictMode runs the cleanup
  // once before the real mount, and a cleanup-only guard leaves saves stuck.
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  const handleSave = (then: "close" | "another" = "close") => {
    if (saving) return; // aria-disabled; the loader explains the ignored click
    const next: Record<string, ValidationIssue | null> = {
      title: issueFor("title", title),
      description: issueFor("description", fields.find((f) => f.id === "description")?.value ?? ""),
    };
    for (const f of scalarEditable) next[f.id] = issueFor(f.id, f.value);
    setIssues(next);
    const firstError = ["title", "description", ...scalarEditable.map((f) => f.id)].find(
      (id) => next[id]?.severity === "error",
    );
    if (firstError) {
      setSaveAttempted(true);
      document.getElementById(inputId(firstError))?.focus();
      return;
    }
    setSaveState("saving");
    window.setTimeout(() => {
      if (!aliveRef.current) return;
      if (title.includes("[fail]")) setSaveState("failed");
      else if (then === "another" && draft) draft.onSaveAndNew({ titles, fieldsByLang }, pinned);
      else onSave({ titles, fieldsByLang });
    }, 800);
  };
  const templateSection = (
    <EditSection label="Template*">
      <TemplatePicker value={templateId} onChange={requestTemplate} />
      {draft && (
        <p className="text-meta text-ink-tertiary">
          Changing it keeps the values both templates share.
        </p>
      )}
      <ConfirmDialog
        open={!!pendingTemplate}
        title={`Change to ${getEntityType(pendingTemplate?.typeId ?? "")?.name ?? "this template"}?`}
        message={`${getEntityType(pendingTemplate?.typeId ?? "")?.name ?? "It"} has no ${
          pendingTemplate && pendingTemplate.labels.length === 1 ? "property" : "properties"
        } for ${pendingTemplate?.labels.join(", ")}, so ${
          pendingTemplate && pendingTemplate.labels.length === 1 ? "that value is" : "those values are"
        } dropped. The values both templates share are kept.`}
        confirmLabel="Change template"
        cancelLabel="Keep this template"
        onConfirm={() => {
          const t = pendingTemplate!.typeId;
          setPendingTemplate(null);
          changeTemplate(t);
        }}
        onCancel={() => setPendingTemplate(null)}
      />
    </EditSection>
  );
  const saveBlocked = saveAttempted && errorCount > 0;

  const updateField = (id: string, value: string) => {
    setFields((prev) =>
      // Description and Country render from fixed boxes whatever the template
      // holds, so a missing field is created on first write; mapping only
      // would silently drop every keystroke and every fill.
      prev.some((f) => f.id === id)
        ? prev.map((f) =>
            f.id !== id
              ? f
              : f.propertyType === "link"
                ? { ...f, ...withLink({ label: f.link?.label ?? "", url: value }) }
                : // A plain write over a list would leave its listed values
                  // stale: they go, and the record prints the new text.
                  { ...f, value, ...(f.displayValues ? { displayValues: undefined } : {}) },
          )
        : [...prev, { id, label: id === "description" ? "Description" : id, type: "multiline", value }],
    );
    reflag(id, value);
  };

  /** Write one field in one language (the translation rows). Creates the field
   *  if that language's seed lacks it, like `updateField`. */
  const updateFieldFor = (id: string, lang: Language, value: string, machine = false) => {
    setFieldsByLang((prev) => {
      const list = prev[lang];
      const label = fields.find((f) => f.id === id)?.label ?? id;
      const type = fields.find((f) => f.id === id)?.type ?? "text";
      return {
        ...prev,
        [lang]: list.some((f) => f.id === id)
          ? list.map((f) => (f.id === id ? { ...f, value } : f))
          : [...list, { id, label, type, value }],
      };
    });
    setMachineFields((prev) =>
      prev[id]?.[lang] === machine ? prev : { ...prev, [id]: { ...prev[id], [lang]: machine } },
    );
    if (lang === language) reflag(id, value);
  };
  /** A select / multiselect holds labels from a thesaurus, which are the same
   *  in every language (Uwazi stores the value's id and translates it at
   *  display), so a choice is written into every language's copy at once. */
  const setLabels = (id: string, byLang: Record<Language, string[]>, ids: (string | null)[]) =>
    setFieldsByLang(
      (prev) =>
        Object.fromEntries(
          LANGUAGES.map((l) => [l, prev[l].map((f) => (f.id === id ? withLabels(f, byLang[l], ids) : f))]),
        ) as Record<Language, MetadataField[]>,
    );
  /** Labels created from this form, tagged "New" in their list until it closes. */
  const [freshLabels, setFreshLabels] = useState<ReadonlySet<string>>(new Set());
  const corpus = entityCorpusOf(focusedId);

  /** Every language's value for one field — what the translation rows show. */
  const valuesFor = (id: string) =>
    Object.fromEntries(
      LANGUAGES.map((l) => [l, fieldsByLang[l].find((f) => f.id === id)?.value ?? ""]),
    ) as Record<Language, string>;
  /** The seed's per-language values, so a mocked translation can return the
   *  real one. Not `valuesFor`, which holds what the user typed. */
  const authoredFor = (id: string) =>
    Object.fromEntries(
      LANGUAGES.map((l) => [l, initialFieldsByLang[l].find((f) => f.id === id)?.value]).filter(
        ([, v]) => v,
      ),
    ) as Partial<Record<Language, string>>;

  /* ── Click-to-fill ────────────────────────────────────────────────────────
     Focus arms a field; the arm is latched (atoms/fillTarget) because finding
     the value means leaving the field. The document viewer and the entity
     preview send requests addressed by field id. */
  const [rawFillTarget, setFillTarget] = useAtom(fillTargetAtom);
  const [fillRequest, sendFill] = useAtom(fillRequestAtom);
  const bodyRef = useRef<HTMLDivElement>(null);
  /** The arm, only if this session owns it. Read this, never the atom: the
   *  other mounted form edits the same entity and has rows with the same ids. */
  const fillTarget = rawFillTarget?.sessionId === sessionId ? rawFillTarget : null;

  // Disarm on unmount, or the next session would listen for a field nobody
  // focused. Only this session's arm: closing the drawer must not disarm the main view.
  useEffect(
    () => () => setFillTarget((prev) => (prev?.sessionId === sessionId ? null : prev)),
    [setFillTarget, sessionId],
  );

  // Escape disarms, on the window since focus is usually in another pane. Skipped
  // inside a dialog, so closing the source preview doesn't also disarm. Bound only
  // while armed.
  useEffect(() => {
    if (!fillTarget) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (document.activeElement?.closest('[role="dialog"]')) return;
      setFillTarget(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [fillTarget, setFillTarget]);

  // Apply a request, then clear it. The field is usually out of view, so it
  // scrolls into view and flashes to show where the value landed.
  useEffect(() => {
    // Only the session that armed the field writes; both forms see the atom.
    if (!fillRequest || fillRequest.sessionId !== sessionId) return;
    const { fieldId, value } = fillRequest;
    if (fieldId === "title") setTitle(value);
    else updateField(fieldId, value);
    sendFill(null);
    const el = bodyRef.current?.querySelector<HTMLElement>(`[data-fill-id="${CSS.escape(fieldId)}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    // The flash ends itself: `sendFill(null)` re-runs this effect, which would
    // cancel a timeout returned from here.
    flashElement(el);
    // Watch object identity (`nonce`), so the same text filled twice fires twice.
  }, [fillRequest, sendFill, sessionId]);

  /** The input skin. An armed field keeps the focus ring while blurred, so the
   *  user can see which field is waiting for a value. No new selected colour. */
  const fieldClass = (fieldId: string, extra = "") =>
    `w-full px-3 py-2 text-sm text-ink bg-paper rounded-md border transition-shadow
     focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40 ${
       fillTarget?.fieldId === fieldId
         ? "ring-2 ring-carbon/20 border-carbon/40"
         : issueBorderClass(issues[fieldId])
     } ${extra}`;

  /** Focus arms; blur does nothing. Click arms too: after Escape the field
   *  still has focus, and a click is the way to re-arm it. */
  const arm = (fieldId: string, label: string) => () =>
    setFillTarget({ sessionId, fieldId, label });
  const armProps = (fieldId: string, label: string) => ({
    onFocus: arm(fieldId, label),
    onClick: arm(fieldId, label),
  });

  /* ── Typed editors (step M4) ── A property type with its own value shape
     (numeric, date lists and ranges, link, place, generated id, image) gets
     its editor from TypedFieldEditors. Its value is the same in every
     language, so a change is written into each language's copy, as a
     thesaurus choice is. */
  const isTyped = (f: MetadataField) =>
    !!f.propertyType &&
    ["numeric", "generatedid", "multidate", "daterange", "multidaterange", "link", "geolocation", "image"].includes(
      f.propertyType,
    );
  const updateTyped = (id: string, patch: Partial<MetadataField>) => {
    setFieldsByLang(
      (prev) =>
        Object.fromEntries(
          LANGUAGES.map((l) => [
            l,
            prev[l].some((f) => f.id === id)
              ? prev[l].map((f) => (f.id === id ? { ...f, ...patch } : f))
              : [...prev[l], { ...(fields.find((f) => f.id === id) as MetadataField), ...patch }],
          ]),
        ) as Record<Language, MetadataField[]>,
    );
    if (patch.value !== undefined) reflag(id, patch.value);
  };
  const imageFiles = (profile.files ?? [])
    .filter((f) => f.type === "image" && f.url)
    .map((f) => ({ id: f.id, name: f.name, url: f.url! }));
  const typedEditor = (field: MetadataField) =>
    isTyped(field) ? (
      <TypedFieldEditor
        field={field}
        inputId={inputId(field.id)}
        onPatch={(patch) => updateTyped(field.id, patch)}
        inputClass={fieldClass(field.id)}
        armProps={armsOnFocus(field) ? armProps(field.id, field.label) : undefined}
        aria={fieldAria(field.id)}
        onBlur={(v) => flag(field.id, v)}
        images={imageFiles}
      />
    ) : null;

  // One editor per connection, keyed so multi-inheritance siblings sync.
  // Read-only fields (CEJIL projections, chain inheritance) render as read
  // cards at their template position (see `editUnits`).
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

  /* Fields below Description in template order, as the read record uses, so
     edit mode does not reorder them. Title, Template and Description keep fixed
     controls above. Controls the template doesn't declare go last (Geolocation
     always; Country when there is no `country` field). A multi-inheritance group
     renders once, at its first member's position. */
  type EditUnit =
    | { kind: "country" }
    | { kind: "geolocation" }
    | { kind: "scalar"; field: MetadataField }
    | { kind: "files"; field: MetadataField }
    | { kind: "connection"; def: (typeof connectionDefs)[number] }
    | { kind: "derived-group"; group: (typeof readOnlyRel.groups)[number] }
    | { kind: "derived-single"; field: RelationshipMetadataField };
  const editableGroupKeys = new Set(groups.map((g) => g.connectionKey));
  const derivedGroupByKey = new Map(readOnlyRel.groups.map((g) => [g.connectionKey, g]));
  const placedUnits = new Set<string>();
  const editUnits: EditUnit[] = [];
  for (const f of profile.metadata[language]) {
    if (f.type === "relationship") {
      if (f.readOnly) {
        const group = f.connectionKey ? derivedGroupByKey.get(f.connectionKey) : undefined;
        const key = group ? `derived:${group.connectionKey}` : f.id;
        if (placedUnits.has(key)) continue;
        placedUnits.add(key);
        editUnits.push(group ? { kind: "derived-group", group } : { kind: "derived-single", field: f });
      } else {
        const key = f.connectionKey && editableGroupKeys.has(f.connectionKey) ? f.connectionKey : f.id;
        const def = connectionDefs.find((d) => d.key === key);
        if (!def || placedUnits.has(key)) continue;
        placedUnits.add(key);
        editUnits.push({ kind: "connection", def });
      }
      continue;
    }
    if (f.id === "description") continue;
    // A legacy `country` field (name and flag) keeps its picker; a template's
    // country property is a select on the Countries thesaurus (decision S3) and
    // is edited like any select.
    if (f.type === "country") {
      editUnits.push({ kind: "country" });
      continue;
    }
    // The form's own copy of the field: it holds the edited value.
    const field = fields.find((x) => x.id === f.id);
    if (!field) continue;
    editUnits.push({ kind: field.type === "file-list" ? "files" : "scalar", field });
  }
  if (!editUnits.some((u) => u.kind === "country") && !fields.some((f) => f.id === "country"))
    editUnits.push({ kind: "country" });
  // The fixed place box stands in only where the template declares no place.
  if (!fields.some((f) => f.propertyType === "geolocation")) editUnits.push({ kind: "geolocation" });

  /* ── Copy From ────────────────────────────────────────────────────────────
     The picker chooses the source and properties; the ticked set lands in this
     form's state. Nothing is saved until Save; Cancel discards it. Kept out of
     atoms so no closure outlives the form. */
  const [pickerOpen, setPickerOpen] = useState(false);
  /** unit key → the entity it was copied from. Survives until the edit ends. */
  const [copiedFrom, setCopiedFrom] = useState<Record<string, string>>({});
  const target = getEntity(focusedId);

  /** The plan's matches, reduced to what this form can apply and show.
   *  `plan.matches` is schema-level; a unit here is either a scalar with a
   *  controlled editor (not `country`, whose picker isn't bound to this state,
   *  nor `file-list`, whose inputs are uncontrolled) or a connection keyed by
   *  its def, so sibling columns over one `connectionKey` count as one.
   *  Everything else is returned as `unstageable`. */
  const copyUnitsFor = (plan: CopyPlan) => {
    const matches = plan.matches;
    const units: CopyUnit[] = [];
    const byKey = new Map<string, CopyUnit>();
    const unstageable: CopyMatch[] = [];
    for (const m of matches) {
      if (m.copies === "connection") {
        // Singles are keyed by field id, groups by their shared key.
        const def =
          connectionDefs.find((d) => d.key === m.id) ??
          connectionDefs.find((d) => d.columns.some((c) => c.fieldId === m.id));
        if (!def) {
          unstageable.push(m);
          continue;
        }
        const open = byKey.get(def.key);
        if (open) {
          open.matches.push(m);
          continue;
        }
        const unit: CopyUnit = {
          key: def.key,
          kind: "connection",
          label: def.title,
          row: m,
          matches: [m],
        };
        byKey.set(def.key, unit);
        units.push(unit);
        continue;
      }
      const field = fields.find((f) => f.id === m.id);
      if (!field || field.type === "country" || field.type === "file-list") {
        unstageable.push(m);
        continue;
      }
      const unit: CopyUnit = { key: m.id, kind: "value", label: m.label, row: m, matches: [m] };
      byKey.set(m.id, unit);
      units.push(unit);
    }
    return { units, unstageable };
  };

  /** Write the ticked units into form state and record each one's source. */
  const applyCopy = (source: Entity, taking: CopyUnit[]) => {
    setFields((prev) =>
      prev.map((f) => {
        const u = taking.find((x) => x.kind === "value" && x.key === f.id);
        if (!u) return f;
        // A multiselect copies its set (labels and ids); splitting the display
        // string on ", " would break a label that contains one.
        return f.type === "multiselect"
          ? withLabels(f, u.row.sourceValues ?? [], u.row.sourceValueIds)
          : { ...f, ...u.row.sourceTyped, value: u.row.sourceValue ?? "" };
      }),
    );
    // A typed value is the same in every language: it lands in each copy.
    for (const u of taking)
      if (u.kind === "value" && isTyped(fields.find((f) => f.id === u.key) ?? ({} as MetadataField)))
        updateTyped(u.key, { ...u.row.sourceTyped, value: u.row.sourceValue ?? "" });
    setConnections((prev) => {
      const next = { ...prev };
      for (const u of taking) {
        if (u.kind === "connection") next[u.key] = u.row.sourceConnectedEntityIds ?? [];
      }
      return next;
    });
    setCopiedFrom((prev) => ({
      ...prev,
      ...Object.fromEntries(taking.map((u) => [u.key, source.id])),
    }));
    setPickerOpen(false);
  };

  /* After the first copy every field mounts its provenance slot, so later
     copies don't shift the form (PATTERNS §3). */
  const copyActive = Object.keys(copiedFrom).length > 0;

  /* ── Dirty guard ── registered while mounted, so navigation asks to confirm
     while anything differs from the opening values. Save and Cancel unmount
     the session, which unregisters it. */
  const dirty =
    LANGUAGES.some((l) => titles[l] !== initialTitles[l]) ||
    LANGUAGES.some((l) =>
      fieldsByLang[l].some(
        (f) => f.value !== initialFieldsByLang[l].find((i) => i.id === f.id)?.value,
      ),
    ) ||
    connectionDefs.some((d) => {
      const ids = connections[d.key];
      return ids !== undefined && ids.join("|") !== d.entityIds.join("|");
    }) ||
    copyActive;
  useRegisterDirtyForm(sessionId, dirtyLabel, dirty);

  return (
    <>
      {pickerOpen && target && (
        <CopyFromPicker
          target={target}
          resolveUnits={copyUnitsFor}
          onCopy={applyCopy}
          onClose={() => setPickerOpen(false)}
        />
      )}
      <div
        ref={bodyRef}
        /* A `bleed` scroll lane; the fields sit on the host's gutter. */
        className={`bleed flex-1 overflow-auto body-top pb-8 space-y-3`}
      >
        {/* A draft asks for its template first: it decides the fields. */}
        {draft && templateSection}

        {/* Title */}
        <EditSection
          label={`${titleLabel}*`}
          htmlFor="field-title"
          listening={fillTarget?.fieldId === "title"}
          onStopListening={() => setFillTarget(null)}
          action={
            !iconShown && (
              <button
                onClick={() => setIconOpen(true)}
                className="text-meta font-medium text-ink-tertiary hover:text-ink-secondary transition-colors cursor-pointer"
              >
                Add icon
              </button>
            )
          }
        >
          <textarea
            id={inputId("title")}
            data-fill-id="title"
            value={title}
            {...armProps("title", titleLabel)}
            onChange={(e) => {
              setTitle(e.target.value);
              reflag("title", e.target.value);
            }}
            onBlur={(e) => flag("title", e.currentTarget.value)}
            {...fieldAria("title")}
            rows={2}
            className={fieldClass("title", "resize-none")}
          />
          {/* The other languages. Always mounted, so only opening it moves the
              section below. It also holds the validation line (`messageSlot`),
              so the field reserves one line, not two. */}
          <MultiLanguageField
            messageSlot={<FieldMessage id={msgId("title")} issue={issues.title} />}
            label={titleLabel}
            idPrefix={inputId("title")}
            languages={LANGUAGES}
            current={language}
            values={titles}
            machine={machineTitles}
            onChange={setTitleFor}
            authored={authoredTitles}
          />
        </EditSection>

        {/* Shown on demand (`iconShown`). Clear removes the icon and closes the
            section, so no empty picker stays open. */}
        {iconShown && (
          <EditSection label="Icon">
            <button
              onClick={() => notify("Icon picker isn't available in the prototype")}
              className={`w-full px-3 py-2 text-sm ${icon ? "text-ink" : "text-ink-muted"} bg-paper border border-border rounded-md text-left`}
            >
              {icon ?? "Select icon…"}
            </button>
            <div className="flex items-center justify-between mt-2">
              <Checkbox checked={showIcon} onChange={setShowIcon} label="Show icon" />
              <button
                onClick={() => {
                  setIcon(null);
                  setIconOpen(false);
                }}
                className="text-xs text-ink-tertiary hover:text-ink-secondary cursor-pointer"
              >
                Clear
              </button>
            </div>
          </EditSection>
        )}

        {/* Template: drawn like every other type label (square dot, name in
            `typeLabelColor`, not the raw colour, to clear AA in dark). */}
        {!draft && templateSection}

        {/* Description */}
        <EditSection
          label="Description*"
          htmlFor="field-description"
          listening={fillTarget?.fieldId === "description"}
          onStopListening={() => setFillTarget(null)}
        >
          <textarea
            id={inputId("description")}
            data-fill-id="description"
            value={fields.find((f) => f.id === "description")?.value ?? ""}
            {...armProps("description", "Description")}
            onChange={(e) => updateField("description", e.target.value)}
            onBlur={(e) => flag("description", e.currentTarget.value)}
            {...fieldAria("description")}
            rows={6}
            className={fieldClass("description", "resize-y")}
          />
          <MultiLanguageField
            messageSlot={<FieldMessage id={msgId("description")} issue={issues.description} />}
            label="Description"
            idPrefix={inputId("description")}
            languages={LANGUAGES}
            current={language}
            values={valuesFor("description")}
            machine={machineFields["description"] ?? {}}
            onChange={(lang, value, machine) => updateFieldFor("description", lang, value, machine)}
            authored={authoredFor("description")}
            multiline
          />
          {/* Description is outside the `editUnits` loop, so it renders its own slot. */}
          <CopyFieldSlot
            active={copyActive}
            sourceId={copiedFrom["description"]}
          />
        </EditSection>

        {/* Every other field in template order (see `editUnits`): scalar
            editors (date / link / text / multiline), file-list item editors,
            connection editors, and derived connections as read-only cards. */}
        {editUnits.map((unit) => {
          if (unit.kind === "country") {
            return (
              <EditSection key="control:country" label="Country">
                <CountryPicker />
              </EditSection>
            );
          }
          if (unit.kind === "geolocation") {
            return (
              <EditSection key="control:geolocation" label="Geolocation">
                <div className="h-40 bg-warm rounded-md flex items-center justify-center overflow-hidden">
                  <span className="text-xs text-ink-tertiary">Map preview</span>
                </div>
                {/* Stacks in the drawer: side by side, each box is narrower than its value. */}
                <div className={`gap-2 mt-2 ${compact ? "flex flex-col" : "flex items-center"}`}>
                  <EditInput label="Latitude" value="" placeholder="Value" />
                  <EditInput label="Longitude" value="" placeholder="Value" />
                </div>
              </EditSection>
            );
          }
          if (unit.kind === "connection") {
            const d = unit.def;
            return (
              <div key={`connection:${d.key}`} className="space-y-1.5">
                <RelationshipFieldEditor
                  title={d.title}
                  relationLabel={d.relationLabel}
                  targetTypeId={d.targetTypeId}
                  columns={d.columns}
                  entityIds={connections[d.key] ?? d.entityIds}
                  onChange={(ids) => setConnections((prev) => ({ ...prev, [d.key]: ids }))}
                />
                {/* A copy replaces the connection set, so it shows its source.
                    One row per connection, not per inherited column. */}
                <CopyFieldSlot
                  active={copyActive}
                  sourceId={copiedFrom[d.key]}
                />
              </div>
            );
          }
          // Derived / chain-traversed connections are not edited inline (managed
          // via the relationship graph), so they keep their read cards here.
          if (unit.kind === "derived-group") {
            return <ConnectionGroupCard key={`derived:${unit.group.connectionKey}`} group={unit.group} />;
          }
          if (unit.kind === "derived-single") {
            return <RelationshipFieldCard key={unit.field.id} field={unit.field} span="full" />;
          }
          if (unit.kind === "files") {
            const field = unit.field;
            return (
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
            );
          }
          const field = unit.field;
          if (field.type === "select" || field.type === "multiselect") {
            return (
              <ThesaurusFieldEditor
                key={field.id}
                field={field}
                corpus={corpus}
                typeId={profile.typeId}
                language={language}
                fresh={freshLabels}
                onChange={(byLang, ids) => setLabels(field.id, byLang, ids)}
                onFresh={(labels) => setFreshLabels((prev) => new Set([...prev, ...labels]))}
                copySlot={<CopyFieldSlot active={copyActive} sourceId={copiedFrom[field.id]} />}
                pinSlot={pinFor(field.id, field.label)}
              />
            );
          }
          return (
            <EditSection
              key={field.id}
              label={field.label}
              htmlFor={`field-${field.id}`}
              listening={fillTarget?.fieldId === field.id}
              onStopListening={() => setFillTarget(null)}
              action={pinFor(field.id, field.label)}
            >
              {typedEditor(field) ?? (field.type === "media" ? (
                // Keyed per language: chapter titles are translated and the
                // editor seeds its rows at mount. Not armed for click-to-fill.
                <MediaFieldEditor
                  key={`${language}:${field.id}`}
                  inputId={inputId(field.id)}
                  label={field.label}
                  value={field.value}
                  onChange={(raw) => updateField(field.id, raw)}
                  describedBy={issues[field.id] ? msgId(field.id) : undefined}
                  onIssue={(issue) => {
                    mediaIssues.current[field.id] = issue;
                    setIssues((prev) => ({ ...prev, [field.id]: issue }));
                  }}
                />
              ) : field.type === "date" ? (
                // Not armed: a date input only takes `yyyy-mm-dd`, and a prose
                // passage would be dropped. The value is converted both ways
                // (utils/dateValue) because seeds hold `dd/mm/yyyy` or prose,
                // which the browser would blank.
                <DateInput
                  id={inputId(field.id)}
                  value={toDateInputValue(field.value)}
                  onChange={(iso) => updateField(field.id, fromDateInputValue(iso, field.value))}
                  onBlur={() => flag(field.id, field.value)}
                  {...fieldAria(field.id)}
                  className={fieldClass(field.id)}
                />
              ) : field.type === "multiline" ? (
                <textarea
                  id={inputId(field.id)}
                  data-fill-id={field.id}
                  value={field.value}
                  {...armProps(field.id, field.label)}
                  onChange={(e) => updateField(field.id, e.target.value)}
                  onBlur={(e) => flag(field.id, e.currentTarget.value)}
                  {...fieldAria(field.id)}
                  rows={4}
                  className={fieldClass(field.id, "resize-y")}
                />
              ) : (
                <input
                  id={inputId(field.id)}
                  data-fill-id={field.id}
                  type="text"
                  value={field.value}
                  {...armProps(field.id, field.label)}
                  onChange={(e) => updateField(field.id, e.target.value)}
                  onBlur={(e) => flag(field.id, e.currentTarget.value)}
                  {...fieldAria(field.id)}
                  className={fieldClass(field.id)}
                />
              ))}
              {/* Only text and multiline are translated; other types are the same
                  in every language, so they reserve their own message line. */}
              {(isTyped(field) || (field.type !== "text" && field.type !== "multiline")) && (
                <FieldMessage id={msgId(field.id)} issue={issues[field.id]} reserve />
              )}
              {!isTyped(field) && (field.type === "text" || field.type === "multiline") && (
                <MultiLanguageField
                  messageSlot={<FieldMessage id={msgId(field.id)} issue={issues[field.id]} />}
                  label={field.label}
                  idPrefix={inputId(field.id)}
                  languages={LANGUAGES}
                  current={language}
                  values={valuesFor(field.id)}
                  machine={machineFields[field.id] ?? {}}
                  onChange={(lang, value, machine) => updateFieldFor(field.id, lang, value, machine)}
                  authored={authoredFor(field.id)}
                />
              )}
              <CopyFieldSlot
                active={copyActive}
                sourceId={copiedFrom[field.id]}
              />
            </EditSection>
          );
        })}
      </div>

      {/* Save summary: a fixed-height line, always mounted, so a failed save
          does not shift the footer. role="alert" fires on save, not per keystroke. */}
      <div className="bleed flex items-center justify-end h-6 bg-paper shrink-0">
        {saveState === "failed" ? (
          <span role="alert" className="text-meta font-medium text-seal-label">
            Save failed: the server rejected the update.
          </span>
        ) : saveBlocked ? (
          <span role="alert" className="text-meta font-medium text-seal-label">
            {blockingSummary(errorCount, warningCount)} — fix the highlighted fields.
          </span>
        ) : warningCount > 0 ? (
          <span className="text-meta text-warning">
            {warningCount} warning{warningCount === 1 ? "" : "s"} — saving is still allowed.
          </span>
        ) : null}
      </div>

      {/* A container: a draft's four buttons need ~440px and the drawer's
          minimum is 360px, so below 27rem the labels shorten. */}
      <div
        className={`@container flex items-center justify-end gap-3 h-12 bg-paper shrink-0 ${
          compact ? "bleed gap-2" : "bleed"
        }`}
        style={{ borderTop: "1px solid var(--border-primary)" }}
      >
        {/* Edit mode only, as in Uwazi. */}
          <button
            onClick={() => setPickerOpen(true)}
            data-gutter-align="box"
            aria-label="Copy from…"
            title="Copy from…"
            className={`me-auto shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium whitespace-nowrap
              ${BAR_GHOST} rounded-md transition-colors cursor-pointer
              focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30`}
          >
            <ClipboardCopy size={13} className="text-ink-tertiary" aria-hidden />
            <span className="hidden @[27rem]:inline">Copy from…</span>
          </button>

        <button
          onClick={() => {
            if (!saving) onCancel();
          }}
          aria-disabled={saving || undefined}
          className={`${draft && compact ? "px-3" : "px-4"} py-1.5 text-xs font-medium whitespace-nowrap text-ink-secondary rounded-md transition-colors ${
            saving ? "opacity-50 cursor-not-allowed" : "hover:bg-warm hover:text-ink cursor-pointer"
          }`}
        >
          Cancel
        </button>
        {/* Save uses aria-disabled, not `disabled`: a blocked save stays
            clickable to re-validate and focus the first invalid field. While
            saving, the label hides under a loader so the width holds. Failure
            is seal text on the seal tint; no border in any state. */}
        {draft && (
          /* Saves, then opens the next draft with the pinned values. Styled as
             the lead so Save stays the one filled button. */
          <button
            type="button"
            data-part="save-another"
            onClick={() => handleSave("another")}
            aria-disabled={saving || saveBlocked || undefined}
            className={`shrink-0 px-3 py-1.5 text-xs font-medium whitespace-nowrap ${BAR_LEAD} rounded-md transition-colors ${
              saving ? "opacity-50 cursor-not-allowed" : "cursor-pointer"
            }`}
          >
            {/* The hidden label is out of the accessibility tree, so the name matches what is seen. */}
            <span className="hidden @[27rem]:inline">Save and create another</span>
            <span className="@[27rem]:hidden">Save &amp; new</span>
          </button>
        )}
        <button
          onClick={() => handleSave()}
          aria-disabled={saving || saveBlocked || undefined}
          className={`relative px-4 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
            saveState === "failed"
              ? "bg-seal-tint text-seal-label hover:bg-seal-tint/70"
              : saveBlocked
                ? "bg-success/50 text-white"
                : "bg-success hover:bg-success/90 text-white"
          }`}
        >
          <span className={saving ? "opacity-0" : undefined}>
            {saveState === "failed" ? "Save failed — retry" : "Save"}
          </span>
          {saving && (
            <span className="absolute inset-0 flex items-center justify-center">
              <UwaziLoader size="xs" color="white" />
            </span>
          )}
        </button>
        {menuSlot}
      </div>
    </>
  );
}

/* ── Edit helpers ── */

/** A property's pin. Revealed on the field's hover or focus (`.pin-host` /
 *  `.pin-toggle` in index.css); always shown once pinned. */
function PinToggle({ pinned, label, onToggle }: { pinned: boolean; label: string; onToggle: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={pinned}
      aria-label={pinned ? `Unpin ${label}` : `Pin ${label} for the next entity`}
      title={pinned ? "Pinned: this value carries into the next entity" : "Pin: carry this value into the next entity"}
      onClick={onToggle}
      data-part="pin"
      className={`pin-toggle inline-flex items-center gap-1 h-4 px-1.5 rounded-sm text-meta font-medium transition-colors cursor-pointer
        focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30 ${
          pinned ? "bg-carbon-tint text-carbon-label" : "text-ink-tertiary hover:text-ink-secondary"
        }`}
    >
      <Pin size={10} aria-hidden className={pinned ? "fill-current" : ""} />
      {pinned ? "Pinned" : "Pin"}
    </button>
  );
}

function EditSection({
  label,
  icon,
  action,
  children,
  htmlFor,
  listening,
  onStopListening,
}: {
  label: string;
  icon?: React.ReactNode;
  /** A quiet control at the end of the label row (e.g. "Add icon"). The row is
   *  always mounted, so it costs no layout. */
  action?: React.ReactNode;
  children: React.ReactNode;
  /** The labelled control's id. Needed so screen readers name the input and a
   *  label click focuses (and so arms) the field. */
  htmlFor?: string;
  /** This field is armed for click-to-fill. */
  listening?: boolean;
  onStopListening?: () => void;
}) {
  return (
    <div className="pin-host space-y-1.5">
      {label && (
        // The form-label recipe, as in `settings/SettingsField.tsx`. `min-h-4`
        // matches the listening chip's `h-4`, so arming a field shifts nothing.
        <div className="flex items-center gap-2 min-h-4">
          {icon}
          <label htmlFor={htmlFor} className="text-xs font-medium text-ink-secondary">
            {label}
          </label>
          {listening && onStopListening && (
            <ListeningChip label={label.replace(/\*$/, "")} onStop={onStopListening} />
          )}
          {action && <span className="ms-auto">{action}</span>}
        </div>
      )}
      {children}
    </div>
  );
}

/** A select / multiselect editor: the thesaurus picker, with "Add value" and,
 *  for a select with a value, "Clear" (a radio group can't be emptied by click).
 *  Values come from the corpus's thesauri store. An added value is written to
 *  the store on the modal's Save; the choice is saved or discarded with the form. */
function ThesaurusFieldEditor({
  field,
  corpus,
  typeId,
  language,
  fresh,
  onChange: onChoice,
  onFresh,
  copySlot,
  pinSlot,
}: {
  field: MetadataField;
  corpus: Corpus;
  typeId: string;
  language: Language;
  fresh: ReadonlySet<string>;
  /** The choice as labels in every language, and the value ids behind them. */
  onChange: (byLang: Record<Language, string[]>, ids: (string | null)[]) => void;
  onFresh: (labels: string[]) => void;
  copySlot?: ReactNode;
  /** The draft form's pin toggle, on the label row with Clear / Add value. */
  pinSlot?: ReactNode;
}) {
  const thesauri = useAtomValue(thesauriAtom(corpus));
  const bindings = useAtomValue(thesaurusBindingsAtom(corpus));
  const addValue = useSetAtom(addThesaurusValueAtom);
  const store = useStore();
  const createThesaurus = useSetAtom(createThesaurusAtom);
  const [adding, setAdding] = useState(false);
  const thesaurusId = bindings[bindingKey(typeId, field.id)] ?? field.thesaurus;
  const thesaurus = thesauri.find((t) => t.id === thesaurusId) ?? null;
  const multiple = field.type === "multiselect";
  // Localised because CEJIL records hold translated labels but its thesauri
  // hold Spanish. A choice is its value ids (`fieldKeys`), labelled per language.
  const shown = useMemo(
    () => (thesaurus ? localizeValues(thesaurus.values, corpus, language) : null),
    [thesaurus, corpus, language],
  );
  const chosen = fieldKeys(field, thesaurus?.values ?? null, corpus, language);
  const onChange = (keys: string[], values: ThesaurusValue[] | null = thesaurus?.values ?? null) => {
    const { byLang, ids } = labelsForKeys(keys, values, corpus);
    onChoice(byLang, ids);
  };
  const choose = (key: string) =>
    onChange(multiple ? (chosen.includes(key) ? chosen.filter((k) => k !== key) : [...chosen, key]) : [key]);

  const quiet =
    "text-meta font-medium text-ink-tertiary hover:text-ink-secondary transition-colors cursor-pointer";
  return (
    <EditSection
      label={field.label}
      action={
        <span className="inline-flex items-center gap-3">
          {!multiple && chosen.length > 0 && (
            <button type="button" onClick={() => onChange([])} className={quiet}>
              Clear
            </button>
          )}
          {thesaurus && (
            <button type="button" onClick={() => setAdding(true)} className={quiet}>
              Add value
            </button>
          )}
          {pinSlot}
        </span>
      }
    >
      <ThesaurusPicker
        label={field.label}
        values={shown}
        multiple={multiple}
        chosen={chosen}
        onToggle={choose}
        fresh={fresh}
        templateName={getEntityType(typeId)?.name}
        onCreateThesaurus={(name, labels) => {
          const id = createThesaurus({ corpus, name, labels, bind: { typeId, propertyId: field.id } });
          // The new values' ids, read back from the store it was written to.
          const values = store.get(thesauriAtom(corpus)).find((t) => t.id === id)?.values ?? [];
          const keys = values.map((v) => v.id);
          if (keys.length) {
            onChange(multiple ? keys : [keys[0]], values);
            onFresh(keys);
          }
        }}
      />
      {copySlot}
      {adding && thesaurus && (
        <AddThesaurusValueModal
          thesaurusName={thesaurus.name}
          existing={selectableLabels(shown ?? [])}
          onClose={() => setAdding(false)}
          onSave={(label) => {
            // A label the reader's language already shows IS that value.
            let key = fieldKeys(
              { type: "select", value: selectableLabels(shown ?? []).find((l) => foldLabel(l) === foldLabel(label)) ?? "" },
              thesaurus.values,
              corpus,
              language,
            )[0];
            let values = thesaurus.values;
            if (!key) {
              const saved = addValue({ corpus, thesaurusId: thesaurus.id, label });
              key = saved.id ?? pseudoKey(saved.label);
              values = store.get(thesauriAtom(corpus)).find((t) => t.id === thesaurus.id)?.values ?? values;
              if (!thesaurus.values.some((v) => v.id === saved.id || v.values?.some((c) => c.id === saved.id)))
                onFresh([key]);
            }
            if (!chosen.includes(key)) onChange(multiple ? [...chosen, key] : [key], values);
            setAdding(false);
          }}
        />
      )}
    </EditSection>
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

/** The form's Template field: `TemplateSelect` over the edited entity's
 *  corpus, with the templates this session created in listed first. */
function TemplatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (id: string) => void;
}) {
  // The edited entity's corpus: a CEJIL record's template is a CEJIL template.
  const focusedId = useAtomValue(focusedEntityIdAtom);
  const corpus = entityCorpusOf(focusedId);
  const types = corpusTypes(corpus, useAtomValue(entityTypesAtom));
  const recent = useAtomValue(recentTemplatesAtom)[corpus] ?? [];
  return <TemplateSelect value={value} onChange={onChange} types={types} recent={recent} />;
}

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
  const [references] = useAtom(scopedReferencesAtom);
  const [files] = useAtom(filesAtom);

  const relFilterCount = useAtomValue(activeFilterCountAtom);
  // The filters are a tab of their own: the dot marks filters set while the
  // reader is on another tab.
  const drawerTabs = [
    { id: "relationships", label: "Relationships", count: references.length },
    { id: "files", label: "Files", count: files.length },
    { id: "template", label: "Template" },
    { id: "filters", label: "Filters", dot: relFilterCount > 0 },
  ];

  const [activeDrawerTab, setActiveDrawerTab] = useState("relationships");
  useRelFiltersDock(() => setActiveDrawerTab("filters"));

  return (
    // The gutter host (see `gutter-host`): tabs and tab bodies carry no side padding.
    <div data-gutter-host className="gutter-host relative flex flex-col h-full overflow-clip">
      {/* A connected entity in a relationship field opens its preview in this drawer. */}
      <EntityPreviewSlideOver />
      <DrawerTabs
        tabs={drawerTabs}
        activeId={activeDrawerTab}
        onChange={setActiveDrawerTab}
      />

      {activeDrawerTab === "template" ? (
        <TemplateStructure />
      ) : activeDrawerTab === "files" ? (
        <DrawerFilesBody />
      ) : activeDrawerTab === "relationships" ? (
        <RelationshipsDrawerSection />
      ) : activeDrawerTab === "filters" ? (
        <RelationshipsFiltersTab />
      ) : (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-sm text-ink-tertiary capitalize">{activeDrawerTab} content</p>
        </div>
      )}
    </div>
  );
}

/** The "↳ copied from …" line under a field. Mounted for every field once any
 *  copy has landed (`active`), so a later copy doesn't shift the form
 *  (PATTERNS §3). Naming the source per field lets a user revert one by hand,
 *  which Uwazi's copy does not allow. */
function CopyFieldSlot({ active, sourceId }: { active: boolean; sourceId?: string }) {
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
