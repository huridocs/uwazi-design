import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
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
import { CopyFieldRow, COPY_ROW_SLOT } from "../components/metadata/CopyFieldRow";
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
import { copyPreviewAtom } from "../atoms/copyFrom";
import { fillTargetAtom, fillRequestAtom } from "../atoms/fillTarget";
import { ListeningChip } from "../components/metadata/ListeningChip";
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
import { useRegisterDirtyForm } from "../hooks/useDirtyGuard";
import { ShareEntityModal } from "../components/share/ShareEntityModal";
import { fromDateInputValue, toDateInputValue } from "../utils/dateValue";

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
          className="px-3 py-1.5 text-xs font-medium text-seal-label bg-seal-tint/40 hover:bg-seal-tint rounded-md transition-colors cursor-pointer"
        >
          Delete
        </button>
        {menuSlot}
      </div>
    </>
  );
}

/* ── Edit Mode ── */

/** One thing a staged copy can actually do to THIS form: a scalar the form has a
 *  controlled editor for, or a whole connection. Built by `stagedUnits`, which
 *  is where the rule lives. */
interface StagedUnit {
  /** The field id for a value; the connection def key for a connection — so
   *  multi-inheritance siblings collapse into a single decision. */
  key: string;
  kind: "value" | "connection";
  /** The form's label for the thing being overwritten (a connection's title,
   *  not one of its inherited columns). */
  label: string;
  /** The match the row compares — for a grouped connection, the first sibling;
   *  they all carry the same `connectedEntityIds`, which is what copies. */
  row: CopyMatch;
  /** Every match folded into this unit. */
  matches: CopyMatch[];
}

export interface MetadataEditBodyProps {
  onCancel: () => void;
  onSave: () => void;
  menuSlot?: ReactNode;
  /** Identifies this edit SESSION, and must be distinct per mounted instance.
   *  Two are mountable at once — the full Metadata view and the Library drawer
   *  preview — and both singleton pieces of shared state key off it: the
   *  dirty-form registry (same id = the second registration overwrites the
   *  first, and one unmount unregisters both) and click-to-fill (same entity,
   *  so `fieldId` alone addresses a row in both forms). */
  sessionId?: string;
  /** What the discard-confirm calls these edits. Names the session the user is
   *  actually being asked about when both are open. */
  dirtyLabel?: string;
  /** Drawer flavour: tighter gutters and no side-by-side field pairs. A
   *  460px pane is one column wide. */
  compact?: boolean;
}

/** The metadata edit form. Exported because the Library's entity drawer renders
 *  THIS component rather than a drawer-sized copy of it — a second
 *  implementation of a form carrying validation, click-to-fill, Copy From and
 *  the dirty guard is how the type-label colour shipped wrong twice. */
export function MetadataEditBody({
  onCancel,
  onSave,
  menuSlot,
  sessionId = "metadata-edit",
  dirtyLabel = "Metadata edits",
  compact = false,
}: MetadataEditBodyProps) {
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

  /* ── Validation ──────────────────────────────────────────────────────────
     Errors block save (required missing, unparseable date, malformed link);
     warnings surface but allow it (utils/validation.ts is the rule set).
     Relationship / derived fields are exempt by construction — `fields` is
     already the scalar subset (`type !== "relationship"`). Evaluated on blur
     and on save attempt; a field that has flagged once re-checks live so
     fixing it clears the message without another blur. */
  const kindOf = (t: MetadataField["type"]): ValueKind =>
    t === "date" ? "date" : t === "link" ? "link" : t === "multiline" ? "multiline" : "text";
  const scalarEditable = fields.filter(
    (f) => !["description", "country"].includes(f.id) && f.type !== "file-list",
  );
  const issueFor = (id: string, value: string): ValidationIssue | null => {
    if (id === "title") return validateValue("text", value, { required: true, label: "Title" });
    if (id === "description")
      return validateValue("multiline", value, { required: true, label: "Description" });
    const f = fields.find((x) => x.id === id);
    return f ? validateValue(kindOf(f.type), value, { label: f.label }) : null;
  };
  const [issues, setIssues] = useState<Record<string, ValidationIssue | null>>({});
  const [saveAttempted, setSaveAttempted] = useState(false);
  const flag = (id: string, value: string) =>
    setIssues((prev) => ({ ...prev, [id]: issueFor(id, value) }));
  /** Live re-check, but only for fields already carrying a message. */
  const reflag = (id: string, value: string) =>
    setIssues((prev) => (prev[id] ? { ...prev, [id]: issueFor(id, value) } : prev));
  const { errors: errorCount, warnings: warningCount } = countBySeverity(Object.values(issues));
  // `field-${id}` is ALSO what EditSection's htmlFor and the fill machinery's
  // data-fill-id use — three consumers, one scheme, keep them aligned.
  const inputId = (id: string) => `field-${id}`;
  const msgId = (id: string) => `field-${id}-msg`;
  const fieldAria = (id: string) => ({
    "aria-invalid": issues[id]?.severity === "error" || undefined,
    "aria-describedby": issues[id] ? msgId(id) : undefined,
  });

  /* ── Save lifecycle ── idle → saving → failed → retry. The save itself is
     mocked (~800ms). MOCK FAILURE TRIGGER: a title containing "[fail]" always
     fails, so the failed state is demonstrable on demand. Success closes the
     edit via onSave() — the session unmounts and the dirty-form registration
     tears down with it, so the dirty guard never sees the programmatic close.
     Failure keeps the session mounted and puts the state ON the button;
     clicking again retries (re-validates first, like any save). */
  const [saveState, setSaveState] = useState<"idle" | "saving" | "failed">("idle");
  const saving = saveState === "saving";
  const aliveRef = useRef(true);
  // RE-ARM on mount, don't just disarm on unmount: StrictMode mounts, runs the
  // cleanup, and mounts again, so a cleanup-only guard latches false before the
  // first render the user sees — and every save then returned early below and
  // sat on "Saving…" forever.
  useEffect(() => {
    aliveRef.current = true;
    return () => { aliveRef.current = false; };
  }, []);

  const handleSave = () => {
    if (saving) return; // aria-disabled — the working state explains the held click
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
      else onSave();
    }, 800);
  };
  const saveBlocked = saveAttempted && errorCount > 0;

  const updateField = (id: string, value: string) => {
    setFields((prev) =>
      // Description and Country render from FIXED boxes above, whatever the
      // template holds — so on an entity whose profile carries no `description`
      // field there was nothing for this to map onto and every keystroke went
      // into the void, textarea included. Click-to-fill made that visible rather
      // than causing it: a button labelled "Fill Description" that silently does
      // nothing is a promise broken in public. A missing field is created on
      // first write instead.
      prev.some((f) => f.id === id)
        ? prev.map((f) => (f.id === id ? { ...f, value } : f))
        : [...prev, { id, label: id === "description" ? "Description" : id, type: "multiline", value }],
    );
    reflag(id, value);
  };

  /* ── Click-to-fill ────────────────────────────────────────────────────────
     Focus arms a field; the arm is LATCHED (see atoms/fillTarget) because
     finding the value means leaving the field. The document viewer and the
     source-entity preview both write a request here, addressed by field id. */
  const [rawFillTarget, setFillTarget] = useAtom(fillTargetAtom);
  const [fillRequest, sendFill] = useAtom(fillRequestAtom);
  const bodyRef = useRef<HTMLDivElement>(null);
  /** The arm, but only if THIS session owns it. Everything below reads this,
   *  never the atom: the other mounted form is editing the same entity, so its
   *  arm would light up an identically-named row over here. */
  const fillTarget = rawFillTarget?.sessionId === sessionId ? rawFillTarget : null;

  // Disarm when the form goes away. Save and Cancel both unmount this body, and
  // an arm that outlives it would leave the next edit session listening for a
  // field nobody focused — the Copy From leak, rebuilt. Only OUR arm, though —
  // closing the drawer must not disarm the field the main view is waiting on.
  useEffect(
    () => () => setFillTarget((prev) => (prev?.sessionId === sessionId ? null : prev)),
    [setFillTarget, sessionId],
  );

  // Escape disarms. On the WINDOW, because by the time a user gives up on a fill
  // the focus is in another pane — but NOT while focus sits inside a modal: the
  // source preview is itself opened and closed with Escape, and one keypress
  // that both closes the preview and forgets which field you were filling costs
  // the user the whole trip. Bound only while armed, so it is not competing for
  // Escape the rest of the time.
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

  // Apply a request, then spend it. The field is usually scrolled out of sight —
  // the user has been reading the document — so it comes back into view and
  // flashes: without that, a fill from the far pane is a silent write to
  // somewhere you can't see.
  useEffect(() => {
    // Addressed to a SESSION, not just a field. Both mounted forms see this
    // atom and both have a row with this id; only the one that armed it writes.
    if (!fillRequest || fillRequest.sessionId !== sessionId) return;
    const { fieldId, value } = fillRequest;
    if (fieldId === "title") setTitle(value);
    else updateField(fieldId, value);
    sendFill(null);
    const el = bodyRef.current?.querySelector<HTMLElement>(`[data-fill-id="${CSS.escape(fieldId)}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("flash-highlight");
    const t = setTimeout(() => el.classList.remove("flash-highlight"), 1100);
    return () => clearTimeout(t);
    // `fillRequest.nonce` is the signal — filling one field twice with the same
    // text has to fire twice, so the object identity is what we watch.
  }, [fillRequest, sendFill, sessionId]);

  /** The one input skin. An ARMED field keeps the focus treatment while blurred:
   *  you left it on purpose, to go and fetch the value, and a form that drops
   *  every trace of where you were is a form you have to re-find your place in.
   *  It is the focus ring, latched — no second selected-state colour. */
  const fieldClass = (fieldId: string, extra = "") =>
    `w-full px-3 py-2 text-sm text-ink bg-paper rounded-md border transition-shadow
     focus:outline-none focus:ring-2 focus:ring-carbon/20 focus:border-carbon/40 ${
       fillTarget?.fieldId === fieldId
         ? "ring-2 ring-carbon/20 border-carbon/40"
         : issueBorderClass(issues[fieldId])
     } ${extra}`;

  /** Focus arms; nothing on blur. Bound to CLICK as well as focus: Escape
   *  disarms a field that still holds the caret, and without a click path the
   *  only way back into the mode would be to tab away and return. */
  const arm = (fieldId: string, label: string) => () =>
    setFillTarget({ sessionId, fieldId, label });
  const armProps = (fieldId: string, label: string) => ({
    onFocus: arm(fieldId, label),
    onClick: arm(fieldId, label),
  });

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
    units: StagedUnit[];
    /** Matches this FORM can't apply — see `stagedUnits`. Carried so the footer
     *  can say they exist rather than the count quietly disagreeing with the
     *  preview the user just read. */
    unstageable: CopyMatch[];
    checked: Record<string, boolean>;
  } | null>(null);
  /** unit key → the entity it was copied from. Survives until the edit ends. */
  const [copiedFrom, setCopiedFrom] = useState<Record<string, string>>({});
  /** Every unit key that has had a row during this edit. Only grows: the slot a
   *  row occupied stays reserved after commit, so swapping the row for its
   *  provenance line doesn't shorten the form (PATTERNS §3). */
  const [rowReserved, setRowReserved] = useState<ReadonlySet<string>>(new Set());
  const target = getEntity(focusedId);

  /** The plan's matches, resolved into what THIS FORM can stage and show.
   *
   *  `plan.matches` is a schema-level answer — these two entities define the
   *  same property, so it would copy. Whether the form can APPLY it is a
   *  different question, and seeding the checkbox set from the plan wholesale
   *  answered the wrong one: a connection match had no row anywhere, so "Copy 3
   *  fields" replaced the entity's connection set with no comparison ever shown
   *  — the precise overwrite-without-warning `CopyFieldRow` exists to prevent —
   *  and a `country` match was written into state that `CountryPicker` doesn't
   *  read, counted in the footer and visible nowhere.
   *
   *  So a unit is what the form can both apply and render:
   *   · a scalar with a controlled editor (everything but `country`, whose
   *     picker isn't bound to this state, and `file-list`, whose item inputs are
   *     uncontrolled);
   *   · a CONNECTION, keyed by its def — which is also the multi-inheritance
   *     fix: sibling columns over one `connectionKey` are ONE connection, and
   *     counting them separately made "1 of 3" out of a single copy.
   *  Anything left over is `unstageable` and says so. */
  const stagedUnits = (matches: CopyMatch[]) => {
    const units: StagedUnit[] = [];
    const byKey = new Map<string, StagedUnit>();
    const unstageable: CopyMatch[] = [];
    for (const m of matches) {
      if (m.copies === "connection") {
        // Singles are keyed by field id; grouped connections by their shared
        // key, so find whichever def actually owns this field.
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
        const unit: StagedUnit = {
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
      if (!field || field.id === "country" || field.type === "file-list") {
        unstageable.push(m);
        continue;
      }
      const unit: StagedUnit = { key: m.id, kind: "value", label: m.label, row: m, matches: [m] };
      byKey.set(m.id, unit);
      units.push(unit);
    }
    return { units, unstageable };
  };

  const preview = (source: Entity) => {
    if (!target) return;
    const plan = planCopyFrom(target, source, language);
    setPickerOpen(false);
    setPreview({
      sourceId: source.id,
      plan,
      onUse: () => {
        const { units, unstageable } = stagedUnits(plan.matches);
        setStage({
          source,
          units,
          unstageable,
          // Defaulted to the matched set, as asked — except the ones that would
          // CLEAR a value, which is a destructive default nobody expects from a
          // button labelled "copy".
          checked: Object.fromEntries(units.map((u) => [u.key, !u.row.emptyOnSource])),
        });
        setRowReserved((prev) => new Set([...prev, ...units.map((u) => u.key)]));
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

  /** Commit: write ONLY the checked units into this form's state, and remember
   *  where each came from. Still nothing saved. */
  const commitCopy = () => {
    if (!stage) return;
    const taking = stage.units.filter((u) => stage.checked[u.key]);
    setFields((prev) =>
      prev.map((f) => {
        const u = taking.find((x) => x.kind === "value" && x.key === f.id);
        return u ? { ...f, value: u.row.sourceValue ?? "" } : f;
      }),
    );
    setConnections((prev) => {
      const next = { ...prev };
      for (const u of taking) {
        if (u.kind === "connection") next[u.key] = u.row.sourceConnectedEntityIds ?? [];
      }
      return next;
    });
    setCopiedFrom((prev) => ({
      ...prev,
      ...Object.fromEntries(taking.map((u) => [u.key, stage.source.id])),
    }));
    setStage(null);
  };

  const cancelCopy = () => {
    setStage(null);
    setPreview(null);
    setOverlayEntity(null);
    setPickerOpen(false);
  };

  /* The preview atom outlives this form — Cancel and Save both unmount it — and
     what it holds are THIS form's closures. Clearing it here is the other half
     of the rule `copyPreviewAtom` documents; without it the overlay went on
     offering "Stage N fields" against a form that no longer existed. */
  useEffect(() => () => setPreview(null), [setPreview]);

  const stagedByKey = useMemo(
    () => new Map((stage?.units ?? []).map((u) => [u.key, u])),
    [stage],
  );
  const checkedCount = stage
    ? stage.units.filter((u) => stage.checked[u.key]).length
    : 0;
  /** Tick one unit. Grouped connection siblings share a key, so this is one
   *  decision per connection, not per inherited column. */
  const setChecked = (key: string, v: boolean) =>
    setStage((prev) => (prev ? { ...prev, checked: { ...prev.checked, [key]: v } } : prev));
  /* Once a copy is in play, EVERY field reserves its provenance slot, so the
     line landing on commit cannot shove the fields below it (PATTERNS §3). */
  const copyActive = stage !== null || Object.keys(copiedFrom).length > 0;

  /* ── Dirty guard ── the edit session registers itself while mounted, so the
     navigation choke points (view switch, tab strip, focal hops, settings)
     hold a leave behind a confirm while anything below differs from what the
     session opened with. Unregisters on unmount — Save and Cancel both close
     the session, so neither needs explicit teardown. */
  const dirty =
    title !== docTitle ||
    fields.some((f) => f.value !== initialFields.find((i) => i.id === f.id)?.value) ||
    connectionDefs.some((d) => {
      const ids = connections[d.key];
      return ids !== undefined && ids.join("|") !== d.entityIds.join("|");
    }) ||
    copyActive;
  useRegisterDirtyForm(sessionId, dirtyLabel, dirty);

  return (
    <>
      {pickerOpen && target && (
        <CopyFromPicker target={target} onPreview={preview} onClose={() => setPickerOpen(false)} />
      )}
      <div
        ref={bodyRef}
        className={`flex-1 overflow-auto py-3 pb-8 space-y-3 ${compact ? "px-3" : "px-4"}`}
      >
        {/* Title */}
        <EditSection
          label="Title*"
          htmlFor="field-title"
          listening={fillTarget?.fieldId === "title"}
          onStopListening={() => setFillTarget(null)}
        >
          <textarea
            id={inputId("title")}
            data-fill-id="title"
            value={title}
            {...armProps("title", "Title")}
            onChange={(e) => {
              setTitle(e.target.value);
              reflag("title", e.target.value);
            }}
            onBlur={(e) => flag("title", e.currentTarget.value)}
            {...fieldAria("title")}
            rows={2}
            className={fieldClass("title", "resize-none")}
          />
          <FieldMessage id={msgId("title")} issue={issues.title} reserve />
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
                className="px-3 py-1.5 text-xs font-medium text-seal-label rounded-md hover:bg-seal-tint transition-colors cursor-pointer"
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
          <FieldMessage id={msgId("description")} issue={issues.description} reserve />
          {/* Rendered here too: the description is a controlled editor like any
              other scalar, so a copy into it is applyable — it was simply the
              one field the staged-row loop below never reached. */}
          <CopyFieldSlot
            active={copyActive}
            reserved={rowReserved.has("description")}
            unit={stagedByKey.get("description")}
            checked={!!stage?.checked["description"]}
            onChange={(v) => setChecked("description", v)}
            sourceId={copiedFrom["description"]}
          />
        </EditSection>

        {/* Geolocation */}
        <EditSection label="Geolocation">
          <div className="h-40 bg-warm rounded-md flex items-center justify-center overflow-hidden">
            <span className="text-xs text-ink-muted">Map Preview</span>
          </div>
          {/* The only side-by-side pair in the form. In the drawer it stacks:
              two number boxes across 460px leaves each of them narrower than
              the value it holds. */}
          <div className={`gap-2 mt-2 ${compact ? "flex flex-col" : "flex items-center"}`}>
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
        {scalarEditable
          .map((field) => (
            <EditSection
              key={field.id}
              label={field.label}
              htmlFor={`field-${field.id}`}
              listening={fillTarget?.fieldId === field.id}
              onStopListening={() => setFillTarget(null)}
            >
              {field.type === "date" ? (
                // A date input takes `yyyy-mm-dd` and nothing else, so it is not
                // armed: a passage of prose is not a date, and quietly dropping
                // the fill would be worse than never offering it.
                //
                // …and for the same reason the stored value is CONVERTED on the
                // way in and back out (utils/dateValue): the seed writes
                // `dd/mm/yyyy` (CEJIL) or prose (the curated entity), and bound
                // straight to `value` the browser blanked the control, leaving a
                // seeded date looking empty and saving as empty.
                <input
                  id={inputId(field.id)}
                  type="date"
                  value={toDateInputValue(field.value)}
                  onChange={(e) =>
                    updateField(field.id, fromDateInputValue(e.target.value, field.value))
                  }
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
              )}
              <FieldMessage id={msgId(field.id)} issue={issues[field.id]} reserve />
              <CopyFieldSlot
                active={copyActive}
                reserved={rowReserved.has(field.id)}
                unit={stagedByKey.get(field.id)}
                checked={!!stage?.checked[field.id]}
                onChange={(v) => setChecked(field.id, v)}
                sourceId={copiedFrom[field.id]}
              />
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
          <div key={d.key} className="space-y-1.5">
            <RelationshipFieldEditor
              title={d.title}
              relationLabel={d.relationLabel}
              targetTypeId={d.targetTypeId}
              columns={d.columns}
              entityIds={connections[d.key] ?? d.entityIds}
              onChange={(ids) => setConnections((prev) => ({ ...prev, [d.key]: ids }))}
            />
            {/* A connection copies too — and REPLACES the set above it, which is
                exactly the kind of overwrite that has to be read before it
                happens. One row per connection, not per inherited column. */}
            <CopyFieldSlot
              active={copyActive}
              reserved={rowReserved.has(d.key)}
              unit={stagedByKey.get(d.key)}
              checked={!!stage?.checked[d.key]}
              onChange={(v) => setChecked(d.key, v)}
              sourceId={copiedFrom[d.key]}
            />
          </div>
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

      {/* Save-attempt summary — a RESERVED line above the action bar, mounted
          at a fixed height with only its contents toggling, so a failed save
          cannot shove the footer (never-shift rule). role="alert" fires only
          on the save attempt, never per keystroke. */}
      <div className="flex items-center justify-end h-6 px-4 bg-paper shrink-0">
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

      {/* Edit action bar */}
      <div
        className={`flex items-center justify-end gap-3 h-12 bg-paper shrink-0 ${
          compact ? "px-3 gap-2" : "px-4"
        }`}
        style={{ borderTop: "1px solid var(--border-primary)" }}
      >
        {/* EDIT MODE ONLY — this whole bar exists only while editing, which is
            the same rule Uwazi's `.copy-from-btn` follows. */}
        {stage ? (
          <>
            <span className="me-auto text-meta text-ink-tertiary">
              {checkedCount} of {stage.units.length} staged from
              <span className="ms-1 align-middle">
                <EntityPill typeId={stage.source.typeId} label={stage.source.title} />
              </span>
              {/* The plan can match a property this form has no editor for
                  (`country`'s picker isn't bound to the field state). Those used
                  to be counted here and applied invisibly; now they're named
                  here and applied nowhere. */}
              {stage.unstageable.length > 0 && (
                <span
                  className="ms-1"
                  title={stage.unstageable.map((m) => m.label).join(", ")}
                >
                  · {stage.unstageable.length} not editable here
                </span>
              )}
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
          onClick={() => {
            if (!saving) onCancel();
          }}
          aria-disabled={saving || undefined}
          className={`px-4 py-1.5 text-xs font-medium text-ink-secondary bg-warm rounded-md transition-colors ${
            saving
              ? "opacity-50 cursor-not-allowed"
              : "hover:bg-parchment hover:text-ink cursor-pointer"
          }`}
        >
          Cancel
        </button>
        {/* NOT `disabled`: a blocked save stays clickable so it can explain
            itself — re-validate, alert via the summary line, focus the first
            invalid field. aria-disabled + the alert carry the state. While
            saving, the label goes transparent under a centred loader so the
            button keeps its width (never-shift rule); the border is always
            painted (transparent until failure) for the same reason. Failure
            is danger-family, so it wears seal — border/text on tint, not a
            new red. */}
        <button
          onClick={handleSave}
          aria-disabled={saving || saveBlocked || undefined}
          className={`relative px-4 py-1.5 text-xs font-medium rounded-md border transition-colors cursor-pointer ${
            saveState === "failed"
              ? "bg-seal-tint text-seal-label border-seal/40 hover:bg-seal-tint/70"
              : saveBlocked
                ? "bg-success/50 text-white border-transparent"
                : "bg-success hover:bg-success/90 text-white border-transparent"
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

function EditSection({
  label,
  icon,
  children,
  htmlFor,
  listening,
  onStopListening,
}: {
  label: string;
  icon?: React.ReactNode;
  children: React.ReactNode;
  /** The id of the control this label names. Without it the label is a bare
   *  `<label>` pointing at nothing: screen readers announce the input as
   *  unlabelled, and clicking the word doesn't focus the field — which for a
   *  form whose fields are ARMED by focus is a lost way in. */
  htmlFor?: string;
  /** This field is armed for click-to-fill. */
  listening?: boolean;
  onStopListening?: () => void;
}) {
  return (
    <div className="space-y-1.5">
      {label && (
        // `text-xs font-medium text-ink-secondary` — the form-label recipe, the
        // one `settings/Field.tsx` already gives every Settings page and both
        // modals. This row used to carry `text-sm font-bold text-ink`, which is
        // the CARD-TITLE recipe: 14px/700 naming an input, two full steps above
        // every other field label in the app, on the form a reader meets most.
        //
        // The listening chip rides THIS row and the row is always mounted, so
        // arming a field must move nothing below it. The old label held the row
        // open at its own 20px line box; a 12px label's is 16px, exactly the
        // chip's `h-4` — true, and too tight to leave implied, so `min-h-4`
        // states it. The chip can now grow the row only by growing itself, and
        // it would have to say so here.
        <div className="flex items-center gap-2 min-h-4">
          {icon}
          <label htmlFor={htmlFor} className="text-xs font-medium text-ink-secondary">
            {label}
          </label>
          {listening && onStopListening && (
            <ListeningChip label={label.replace(/\*$/, "")} onStop={onStopListening} />
          )}
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
/** The one slot under a field that a copy ever writes into: the staged
 *  comparison row while a copy is in play, its "copied from" line afterwards.
 *
 *  ONE box, because they are the same space. Mounted for every field the moment
 *  any copy starts (`active`), so the provenance line can't shove the fields
 *  below it when it lands; and once a field has carried a row, the box keeps the
 *  row's full height for the rest of the edit (`reserved`) — otherwise
 *  committing unmounted every row at once and the form jumped upward by a row
 *  per copied field, which is the same rule read the other way round. */
function CopyFieldSlot({
  active,
  reserved,
  unit,
  checked,
  onChange,
  sourceId,
}: {
  active: boolean;
  reserved: boolean;
  unit?: StagedUnit;
  checked: boolean;
  onChange: (checked: boolean) => void;
  sourceId?: string;
}) {
  if (!active) return null;
  const source = sourceId ? getEntity(sourceId) : undefined;
  return (
    <div
      className={reserved ? "flex flex-col justify-center" : "h-5 flex items-center"}
      style={reserved ? { minHeight: COPY_ROW_SLOT } : undefined}
    >
      {unit ? (
        <CopyFieldRow
          match={unit.row}
          label={unit.label}
          checked={checked}
          onChange={onChange}
        />
      ) : (
        source && (
          <ProvenanceLine label="copied from">
            <EntityPill typeId={source.typeId} label={source.title} />
          </ProvenanceLine>
        )
      )}
    </div>
  );
}
