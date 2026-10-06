import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { Lock, Plus, Search, Trash2, X } from "lucide-react";
import { SettingsEditor } from "../SettingsEditor";
import { SettingsFieldRow, SettingsSection } from "../SettingsSection";
import { SettingsField, TextInput } from "../SettingsField";
import { SettingsButton } from "../SettingsButton";
import { SettingsEmptyState } from "../SettingsEmptyState";
import { TemplateCardPreview } from "../TemplateCardPreview";
import { MoveButtons, ReorderGrip, moveTo } from "../ReorderControls";
import { TYPE_ICONS } from "../propertyTypeIcons";
import { TemplatePropertyPanel } from "./TemplatePropertyPanel";
import { Checkbox } from "../../shared/Checkbox";
import { Hint } from "../../shared/Hint";
import { Modal } from "../../shared/Modal";
import { ModalField, MODAL_INPUT } from "../../shared/ModalParts";
import { FieldMessage } from "../../shared/FieldMessage";
import { ConfirmDelete } from "../../shared/ConfirmDelete";
import { LastSavedLine } from "../../shared/LastSavedLine";
import { SettingsBarContext } from "../SettingsButton";
import { useReorder } from "../../../hooks/useReorder";
import { useSettingsDraft } from "../../../hooks/useSettingsDraft";
import { useSettingsNotify } from "../../../hooks/useSettingsNotify";
import { useSettingsUndo } from "../../../hooks/useSettingsUndo";
import { dataSourceAtom, libraryEntitiesAtom } from "../../../atoms/dataSource";
import { templatesAtom } from "../../../atoms/templates";
import { saveTemplateAtom, templateEntityCountsAtom } from "../../../atoms/templateActions";
import { createThesaurusAtom, thesauriAtom } from "../../../atoms/thesauri";
import { relationTypesCorpus, relationTypesOfAtom, saveRelationTypeAtom } from "../../../atoms/relationTypes";
import { newSettingsId } from "../../../atoms/settingsCollection";
import { getEntity } from "../../../data/entities";
import { getEntityProfile } from "../../../data/entityProfiles";
import { commonPropertiesFor, type PropertyDef, type TemplateDef } from "../../../data/templates/types";
import { TEMPLATE_SEEDS } from "../../../data/templates/mirror";
import { entityPropertyValues } from "../../../utils/propertyValues";
import { count, foldName } from "../../../utils/settingsUsage";
import { blockingSummary } from "../../../utils/validation";
import {
  TYPE_LABELS,
  inheritedRefusal,
  inheritorsOf,
  newPropertyName,
  panelFields,
  templateNameIssue,
  withFilter,
} from "../../../utils/templateRules";
import type { Corpus } from "../../../data/entityOverlay";

/** A distinct, calm palette (no duplicates); a new template starts on one of
 *  them at random, as in Uwazi. */
const PALETTE = [
  "#C03B22", "#D97706", "#CA8A04", "#65A30D", "#059669",
  "#0D9488", "#0891B2", "#2563EB", "#7C3AED", "#DB2777", "#6B7280",
];
const HEX = /^#[0-9a-fA-F]{6}$/;
/** "a, b and c". */
const andList = (xs: string[]) => (xs.length < 2 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs[xs.length - 1]}`);

/** The property table's tracks, header and rows alike: grip · select ·
 *  property · type · options · required · filter · cards · move. From `md`
 *  up; on a phone a row wraps (name, then type and flags). */
const COLUMNS = "1.25rem 1.25rem minmax(0,1.1fr) 8.5rem minmax(0,1.4fr) 4.25rem 3.5rem 3.5rem 4.5rem";

/** Read-only option pills, only those that apply, in Uwazi's order. */
function optionPills(
  p: PropertyDef,
  names: { relation: (id?: string) => string; thesaurus: (id?: string) => string; template: (id?: string) => string },
): string[] {
  const out: string[] = [];
  if (p.showInCard) out.push("Show in cards");
  if (p.noLabel) out.push("No label");
  if (p.filter) out.push("Use as filter");
  if (p.prioritySorting) out.push("Priority sorting");
  if (p.required) out.push("Required");
  if (p.defaultfilter) out.push("Default filter");
  if (p.generatedId) out.push("Generated ID");
  if (p.fullWidth) out.push("Full width");
  if (p.style) out.push(p.style === "contain" ? "Fit" : "Fill");
  if (p.type === "relationship") {
    if (p.relationType) out.push(names.relation(p.relationType));
    out.push(names.template(p.content));
  }
  if ((p.type === "select" || p.type === "multiselect") && p.content) out.push(names.thesaurus(p.content));
  return out;
}

/** Settings › Templates › one template (spec M8): name and colour, the three
 *  common properties and the template's own, each opened in the property
 *  panel, reordered, flagged inline, or removed with an Undo. Save writes the
 *  template store, after saying what the change does to the entities that
 *  hold values (UX4). */
export function TemplateEditor({ templateId, onClose }: { templateId: string | "new"; onClose: (savedId?: string) => void }) {
  const corpus = useAtomValue(dataSourceAtom) as Corpus;
  const templates = useAtomValue(templatesAtom(corpus));
  const base = templateId === "new" ? undefined : templates.find((t) => t.id === templateId);
  if (templateId !== "new" && !base)
    return (
      <SettingsEditor component="TemplateEditor" path={["Templates"]} title="Template not found" onBack={() => onClose()} dirty={false} onSave={() => {}}>
        <SettingsEmptyState title="Template not found" hint="It may have been deleted. Go back to the list." />
      </SettingsEditor>
    );
  return <TemplateEditorBody key={templateId} base={base} corpus={corpus} templates={templates} onClose={onClose} />;
}

function TemplateEditorBody({
  base,
  corpus,
  templates,
  onClose,
}: {
  base: TemplateDef | undefined;
  corpus: Corpus;
  templates: TemplateDef[];
  onClose: (savedId?: string) => void;
}) {
  const isNew = !base;
  const [fresh] = useState<TemplateDef>(() => {
    const id = newSettingsId("tpl");
    return {
      id,
      name: "",
      color: PALETTE[Math.floor(Math.random() * PALETTE.length)],
      isDefault: false,
      commonProperties: commonPropertiesFor(id),
      properties: [],
    };
  });
  const { draft, setDraft, setField, dirty } = useSettingsDraft<TemplateDef>({
    id: `template:${base?.id ?? "new"}`,
    label: "Template edits",
    saved: base ?? fresh,
  });
  const setProps = setField("properties");
  const setCommon = setField("commonProperties");
  const saveTemplate = useSetAtom(saveTemplateAtom);
  const { record } = useSettingsNotify();
  const entities = useAtomValue(libraryEntitiesAtom);
  const counts = useAtomValue(templateEntityCountsAtom);
  const thesauri = useAtomValue(thesauriAtom(corpus));
  const relationTypes = useAtomValue(relationTypesOfAtom(relationTypesCorpus(corpus)));

  const names = useMemo(
    () => ({
      relation: (id?: string) => relationTypes.find((t) => t.id === id)?.label ?? "No type",
      thesaurus: (id?: string) => thesauri.find((t) => t.id === id)?.name ?? "No type",
      template: (id?: string) => (id ? (templates.find((t) => t.id === id)?.name ?? id) : "Any entity"),
    }),
    [relationTypes, thesauri, templates],
  );
  const valuesOf = useCallback((id: string) => thesauri.find((t) => t.id === id)?.values, [thesauri]);

  /* ── Name ── */
  const nameIssue = templateNameIssue(templates, base?.id ?? null, draft.name);
  const [nameShown, setNameShown] = useState(false);
  const [attempted, setAttempted] = useState(false);
  const saveBlocked = attempted && !!nameIssue;

  /* ── Panel, search, selection, hover ── */
  const [panel, setPanel] = useState<{ prop: PropertyDef | null; common: boolean } | null>(null);
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [hovered, setHovered] = useState<string | null>(null);
  const [refused, setRefused] = useState<string | null>(null);
  const [impact, setImpact] = useState<string[] | null>(null);
  const [addThesaurus, setAddThesaurus] = useState(false);
  const [addRelationType, setAddRelationType] = useState(false);
  const { dragIdx, rowProps, gripProps } = useReorder(setProps);

  // A ticked row that left the list is no longer ticked.
  useEffect(() => {
    setSelected((prev) => {
      const ids = new Set(draft.properties.map((p) => p.id));
      const next = new Set([...prev].filter((id) => ids.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [draft.properties]);

  const q = query.trim().toLowerCase();
  const matches = (p: PropertyDef) => !q || p.label.toLowerCase().includes(q);

  /* ── Removal, with Undo (UX5) and the inherit guard ── */
  const offerUndo = useSettingsUndo<{ removed: { prop: PropertyDef; index: number }[] }>(({ removed }) => {
    setProps((prev) => {
      const next = [...prev];
      for (const { prop, index } of [...removed].sort((a, b) => a.index - b.index))
        if (!next.some((p) => p.id === prop.id)) next.splice(Math.min(index, next.length), 0, prop);
      return next;
    });
  });
  const removeSelected = () => {
    const removed = draft.properties.map((prop, index) => ({ prop, index })).filter(({ prop }) => selected.has(prop.id));
    // Another template inheriting a property refuses its removal (Uwazi's
    // server does, by name only): say which templates and properties.
    const blocked = removed.flatMap(({ prop }) => {
      const by = inheritorsOf(templates, draft.id, prop);
      return by.length ? [{ prop, by }] : [];
    });
    if (blocked.length) {
      setRefused(
        `${blocked
          .map(({ prop, by }) => `“${prop.label}” is inherited by ${by.map((b) => `${b.templateName} › ${b.label}`).join(", ")}.`)
          .join(" ")} Remove the inheritance there first. ${inheritedRefusal(blocked.map((b) => b.prop.name))}`,
      );
      return;
    }
    setProps((prev) => prev.filter((p) => !selected.has(p.id)));
    setSelected(new Set());
    offerUndo(
      { removed },
      removed.length === 1 ? `${removed[0].prop.label} removed` : `${removed.length} properties removed`,
      "Nothing is saved until you save the template.",
    );
  };

  /* ── Panel submit ── */
  const submitProperty = (p: PropertyDef) => {
    if (panel?.common) {
      setCommon((prev) => prev.map((x) => (x.id === p.id ? p : x)));
    } else if (panel?.prop) {
      // An unchanged panel writes nothing, so the page stays clean.
      setProps((prev) => prev.map((x) => (x.id === p.id ? p : x)));
    } else {
      const others = templates.filter((t) => t.id !== draft.id);
      // Properties this template has had and no longer has: as saved, and as
      // seeded (a removal saved earlier in the session).
      const inDraft = new Set(draft.properties.map((x) => x.id));
      const seed = TEMPLATE_SEEDS[corpus]?.().find((t) => t.id === draft.id);
      const removed = [...(base?.properties ?? []), ...(seed?.properties ?? [])].filter((x) => !inDraft.has(x.id));
      const name = newPropertyName(p.label, p.type, draft, others, removed);
      setProps((prev) => [...prev, { ...p, id: newSettingsId("prop"), name }]);
    }
    setPanel(null);
  };
  const patchProp = (id: string, patch: (p: PropertyDef) => PropertyDef) =>
    setProps((prev) => prev.map((p) => (p.id === id ? patch(p) : p)));

  /* ── Save, with impact (UX4) ── */
  const impactLines = (): string[] => {
    if (!base) return [];
    // Until the collection's records are in, nothing can be counted, and
    // "nothing is lost" would be a guess: name each change and say so.
    if (!counts.known) {
      const now = new Set(draft.properties.map((p) => p.id));
      const removed = base.properties.filter((p) => !now.has(p.id));
      const retargeted = draft.properties.filter((p) => {
        const old = base.properties.find((x) => x.id === p.id);
        return !!old && (old.content !== p.content || (p.required && !old.required));
      });
      const changed = [...removed, ...retargeted];
      return changed.length
        ? [
            `${changed.map((p) => `“${p.label}”`).join(", ")}: the entities holding values can't be counted until the collection's records have loaded.`,
          ]
        : [];
    }
    const own = entities.filter((e) => e.typeId === base.id);
    const lines: string[] = [];
    const now = new Map(draft.properties.map((p) => [p.id, p]));
    for (const old of base.properties) {
      const next = now.get(old.id);
      if (!next) {
        let holders = 0;
        let values = 0;
        for (const e of own) {
          const v = entityPropertyValues(e, old.name, "EN").length;
          if (v) {
            holders++;
            values += v;
          }
        }
        const uses = [old.filter && "a filter", old.showInCard && "shown on cards", "a list column choice"].filter(Boolean);
        lines.push(
          holders
            ? `Removes “${old.label}” from ${count(holders, "entity", "entities")} (${count(values, "value")}). It is also ${andList(uses as string[])}.`
            : `Removes “${old.label}”. No entity holds a value for it, so nothing is lost.`,
        );
        continue;
      }
      if ((next.type === "select" || next.type === "multiselect") && next.content && next.content !== old.content) {
        const labels = new Set((thesauri.find((t) => t.id === next.content)?.values ?? []).flatMap((v) => [v.label, ...(v.values ?? []).map((c) => c.label)]).map(foldName));
        let values = 0;
        let holders = 0;
        for (const e of own) {
          const miss = entityPropertyValues(e, old.name, "EN").filter((l) => !labels.has(foldName(l))).length;
          if (miss) {
            values += miss;
            holders++;
          }
        }
        if (values)
          lines.push(`${count(values, "value")} of ${count(holders, "entity", "entities")} have no match in ${names.thesaurus(next.content)} and will show as free text.`);
      }
      if (next.type === "relationship" && next.content && next.content !== old.content) {
        let off = 0;
        for (const e of own) {
          const f = (getEntityProfile(e.id).metadata.EN ?? []).find((x) => x.id === old.name);
          if (f?.type === "relationship")
            off += f.connectedEntityIds.filter((id) => getEntity(id)?.typeId !== next.content).length;
        }
        if (off) lines.push(`${count(off, "connection points", "connections point")} to entities that are not ${names.template(next.content)}.`);
      }
    }
    for (const p of draft.properties) {
      const old = base.properties.find((x) => x.id === p.id);
      if (p.required && !old?.required) {
        const without = own.filter((e) => entityPropertyValues(e, p.name, "EN").length === 0).length;
        if (without) lines.push(`${count(without, "entity", "entities")} will need a value for “${p.label}” the next time they are edited.`);
      }
    }
    return lines;
  };

  const trySave = () => {
    if (nameIssue) {
      setAttempted(true);
      setNameShown(true);
      document.getElementById("template-name-input")?.focus();
      return;
    }
    const lines = impactLines();
    if (lines.length) setImpact(lines);
    else commit();
  };
  const commit = () => {
    const template = { ...draft, name: draft.name.trim() };
    const id = saveTemplate({ corpus, template, isNew });
    offerUndo.end();
    record({
      method: isNew ? "CREATE" : "UPDATE",
      domain: "template",
      noun: "template",
      id,
      name: template.name,
      notice: "templateSaved",
    });
    setImpact(null);
    onClose(id);
  };

  /* ── Rows ── */
  const custom = draft.properties;
  const shownCustom = custom.map((p, index) => ({ p, index })).filter(({ p }) => matches(p));
  const shownCommon = draft.commonProperties.filter(matches);
  const ticked = custom.filter((p) => selected.has(p.id));

  const rowHover = (id: string) => ({
    onMouseEnter: () => setHovered(id),
    onMouseLeave: () => setHovered((h) => (h === id ? null : h)),
    onFocus: () => setHovered(id),
    onBlur: () => setHovered((h) => (h === id ? null : h)),
  });

  return (
    <SettingsEditor
      component="TemplateEditor"
      path={["Templates"]}
      title={draft.name.trim() || (isNew ? "New template" : base!.name)}
      onBack={() => onClose()}
      isNew={isNew}
      createLabel="Create template"
      dirty={dirty}
      saveBlocked={saveBlocked}
      onSave={trySave}
      wide
      selection={{
        count: ticked.length,
        total: custom.length,
        onClear: () => setSelected(new Set()),
        actions: [{ id: "remove", label: "Remove", icon: <Trash2 size={13} />, danger: true, onClick: removeSelected }],
      }}
      footerStatus={
        saveBlocked ? (
          <span role="alert" className="text-meta font-medium text-seal-label">
            {blockingSummary(1, 0)}: {nameIssue}
          </span>
        ) : (
          <LastSavedLine domain="template" id={base?.id} />
        )
      }
      overlays={
        <>
          <ConfirmDelete
            open={refused !== null}
            title="Remove properties"
            message=""
            impact={refused ? { lines: [], block: refused } : null}
            onConfirm={() => setRefused(null)}
            onCancel={() => setRefused(null)}
          />
          <ConfirmDelete
            open={impact !== null}
            title="Save template"
            message="This change reaches the entities of this template:"
            impact={impact ? { lines: impact, block: null } : null}
            confirmLabel="Save"
            onConfirm={commit}
            onCancel={() => setImpact(null)}
          />
          {panel && (
            <TemplatePropertyPanel
              property={panel.prop}
              isCommon={panel.common}
              draft={draft}
              saved={templates}
              corpus={corpus}
              onCancel={() => setPanel(null)}
              onSubmit={submitProperty}
            />
          )}
          {addThesaurus && <AddThesaurusModal corpus={corpus} onClose={() => setAddThesaurus(false)} />}
          {addRelationType && <AddRelationTypeModal corpus={corpus} onClose={() => setAddRelationType(false)} />}
        </>
      }
    >
      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex flex-col gap-6 flex-1 min-w-0">
          <SettingsSection>
            <SettingsFieldRow>
              <SettingsField label="Template name" issue={nameShown && nameIssue ? { severity: "error", message: nameIssue } : null}>
                <TextInput
                  id="template-name-input"
                  value={draft.name}
                  issue={nameShown && nameIssue ? { severity: "error", message: nameIssue } : null}
                  onChange={(e) => {
                    setField("name")(e.target.value);
                    // The message goes as soon as the name is valid.
                    if (attempted && !templateNameIssue(templates, base?.id ?? null, e.target.value)) setAttempted(false);
                  }}
                  onBlur={() => setNameShown(true)}
                  placeholder="Template name"
                />
              </SettingsField>
              <SettingsField label="Colour" group>
                <ColorPicker color={draft.color} onChange={setField("color")} />
              </SettingsField>
            </SettingsFieldRow>
          </SettingsSection>

          <SettingsSection
            title="Properties"
            action={
              <SettingsButton variant="secondary" size="sm" icon={<Plus size={14} />} onClick={() => setPanel({ prop: null, common: false })}>
                Add property
              </SettingsButton>
            }
          >
            <div data-part="property-search" role="search" className="flex items-center gap-1.5 h-8 px-2 max-w-md bg-warm rounded-md focus-within:ring-2 focus-within:ring-carbon/20">
              <Search size={14} aria-hidden className="text-ink-muted shrink-0" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                aria-label="Search properties"
                placeholder="Search properties…"
                className="flex-1 min-w-0 bg-transparent text-xs font-medium placeholder:text-ink-muted focus:outline-none"
              />
              {query && (
                <button type="button" aria-label="Clear search" onClick={() => setQuery("")} className="text-ink-muted hover:text-ink cursor-pointer">
                  <X size={14} />
                </button>
              )}
            </div>

            {/* A real table, re-displayed as grid rows like the shared DataTable.
                WebKit drops table semantics from re-displayed table elements, so
                the implicit roles are stated too. */}
            <table role="table" aria-label="Properties" data-part="properties" className="flex flex-col rounded-md overflow-hidden border border-border-soft">
              <thead role="rowgroup" className="block">
                <tr
                  role="row"
                  className="sr-only md:not-sr-only md:grid items-center gap-2 md:px-3 md:py-2 text-meta font-semibold uppercase tracking-wider text-ink-tertiary bg-warm"
                  style={{ gridTemplateColumns: COLUMNS }}
                >
                  <th role="columnheader" scope="col"><span className="sr-only">Drag</span></th>
                  <th role="columnheader" scope="col"><span className="sr-only">Select</span></th>
                  <th role="columnheader" scope="col" className="text-start">Property</th>
                  <th role="columnheader" scope="col" className="text-start">Type</th>
                  <th role="columnheader" scope="col" className="text-start">Options</th>
                  <th role="columnheader" scope="col" className="text-center">Required</th>
                  <th role="columnheader" scope="col" className="text-center">Filter</th>
                  <th role="columnheader" scope="col" className="text-center">Cards</th>
                  <th role="columnheader" scope="col"><span className="sr-only">Order</span></th>
                </tr>
              </thead>
              <tbody role="rowgroup" className="block">
                {shownCommon.map((p) => (
                  <PropertyRow
                    key={p.id}
                    p={p}
                    common
                    pills={optionPills(p, names)}
                    highlight={hovered === p.id}
                    onOpen={() => setPanel({ prop: p, common: true })}
                    hover={rowHover(p.id)}
                  />
                ))}
                {shownCustom.map(({ p, index }) => {
                  const f = panelFields(p.type, null, !!p.filter);
                  return (
                    <PropertyRow
                      key={p.id}
                      p={p}
                      pills={optionPills(p, names)}
                      highlight={hovered === p.id}
                      dragging={dragIdx === index}
                      rowProps={rowProps(index)}
                      hover={rowHover(p.id)}
                      onOpen={() => setPanel({ prop: p, common: false })}
                      grip={
                        <ReorderGrip
                          {...gripProps(index)}
                          label={p.label}
                          index={index}
                          count={custom.length}
                          onMove={(to) => setProps((prev) => moveTo(prev, index, to))}
                        />
                      }
                      move={<MoveButtons label={p.label} index={index} count={custom.length} onMove={(to) => setProps((prev) => moveTo(prev, index, to))} />}
                      select={
                        <Checkbox
                          checked={selected.has(p.id)}
                          onChange={() =>
                            setSelected((prev) => {
                              const next = new Set(prev);
                              if (next.has(p.id)) next.delete(p.id);
                              else next.add(p.id);
                              return next;
                            })
                          }
                          ariaLabel={`Select ${p.label}`}
                        />
                      }
                      flags={{
                        required: <Checkbox checked={!!p.required} onChange={(e) => patchProp(p.id, (x) => ({ ...x, required: e.target.checked || undefined }))} ariaLabel={`${p.label} required`} />,
                        filter: f.filter ? (
                          <Checkbox checked={!!p.filter} onChange={(e) => patchProp(p.id, (x) => withFilter(x, e.target.checked))} ariaLabel={`${p.label} use as filter`} />
                        ) : null,
                        cards: <Checkbox checked={!!p.showInCard} onChange={(e) => patchProp(p.id, (x) => ({ ...x, showInCard: e.target.checked || undefined }))} ariaLabel={`${p.label} show in cards`} />,
                      }}
                    />
                  );
                })}
                {shownCommon.length + shownCustom.length === 0 && (
                  <tr role="row" className="block">
                    <td role="cell" className="block px-3 py-6 border-t border-border-soft text-center text-xs text-ink-tertiary">
                      No property matches “{query}”.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
            <div data-part="table-foot" className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {custom.length > 0 && (
              <label className="flex items-center gap-2 text-xs text-ink-secondary cursor-pointer w-fit">
                <Checkbox
                  checked={ticked.length === custom.length}
                  indeterminate={ticked.length > 0 && ticked.length < custom.length}
                  onChange={() => setSelected(ticked.length === custom.length ? new Set() : new Set(custom.map((p) => p.id)))}
                  ariaLabel="Select all properties"
                />
                Select all properties
              </label>
            )}
              {/* What a property panel picks from, created here (Uwazi puts
                  these two on the editor's footer). */}
              <span className="ms-auto flex flex-wrap items-center gap-1">
                <SettingsButton variant="ghost" size="sm" icon={<Plus size={13} />} onClick={() => setAddThesaurus(true)}>
                  Add thesaurus
                </SettingsButton>
                <SettingsButton variant="ghost" size="sm" icon={<Plus size={13} />} onClick={() => setAddRelationType(true)}>
                  Add relationship type
                </SettingsButton>
              </span>
            </div>
          </SettingsSection>
        </div>

        {/* Live card preview — beside the property list on wide screens,
            stacked below it on narrow ones. */}
        <aside className="lg:w-[17rem] shrink-0 pt-6 lg:pt-0 border-t border-border-soft lg:border-t-0">
          <div className="lg:sticky lg:top-0">
            <TemplateCardPreview name={draft.name} color={draft.color} properties={draft.properties} valuesOf={valuesOf} highlight={hovered} />
          </div>
        </aside>
      </div>
    </SettingsEditor>
  );
}

/** One property row. Common rows carry a lock and no grip, checkbox or flags. */
function PropertyRow({
  p,
  common = false,
  pills,
  highlight,
  dragging = false,
  rowProps,
  hover,
  onOpen,
  grip,
  select,
  move,
  flags,
}: {
  p: PropertyDef;
  common?: boolean;
  pills: string[];
  highlight: boolean;
  dragging?: boolean;
  rowProps?: ReturnType<ReturnType<typeof useReorder>["rowProps"]>;
  hover: Record<string, () => void>;
  onOpen: () => void;
  grip?: React.ReactNode;
  select?: React.ReactNode;
  move?: React.ReactNode;
  flags?: { required: React.ReactNode; filter: React.ReactNode; cards: React.ReactNode };
}) {
  const Icon = TYPE_ICONS[p.type];
  const flag = (node: React.ReactNode, label: string) => (
    <td role="cell" className="flex md:justify-center">
      {node ? (
        <label className="flex items-center gap-1.5 cursor-pointer">
          {node}
          <span aria-hidden className="md:hidden text-meta text-ink-tertiary">{label}</span>
        </label>
      ) : null}
    </td>
  );
  return (
    <tr
      {...rowProps}
      {...hover}
      role="row"
      data-part="property"
      data-common={common || undefined}
      className={`group flex flex-wrap md:grid items-center gap-x-2 gap-y-1.5 px-3 py-2 border-t border-border-soft transition-colors ${
        highlight ? "bg-warm" : ""
      } ${dragging ? "opacity-40" : ""}`}
      style={{ gridTemplateColumns: COLUMNS }}
    >
      <td role="cell" className="flex items-center w-5 md:w-auto">{grip}</td>
      <td role="cell" className="flex items-center w-5 md:w-auto">
        {common ? (
          <Hint text="This property can not be deleted">
            {(hint) => (
              <input
                {...hint}
                type="checkbox"
                checked={false}
                aria-disabled="true"
                aria-label={`Select ${p.label}`}
                onChange={() => {}}
                onClick={(e) => e.preventDefault()}
                className="w-3.5 h-3.5 rounded shrink-0 accent-ink opacity-40 cursor-not-allowed"
              />
            )}
          </Hint>
        ) : (
          select
        )}
      </td>
      <td role="cell" className="flex items-center gap-1.5 min-w-0 flex-1 md:flex-none basis-[calc(100%-3.5rem)] md:basis-auto">
        {common && <Lock size={12} aria-hidden className="shrink-0 text-ink-muted" />}
        <button
          type="button"
          onClick={onOpen}
          aria-label={`Edit ${p.label}`}
          className="min-w-0 truncate text-sm font-medium text-ink text-start hover:underline underline-offset-2 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-carbon/30 rounded-sm"
        >
          {p.label}
        </button>
      </td>
      <td role="cell">
        <span className="inline-flex items-center gap-1.5 text-meta font-semibold text-ink-secondary bg-vellum px-2 py-0.5 rounded-md w-fit">
          <Icon size={12} aria-hidden />
          {TYPE_LABELS[p.type]}
        </span>
      </td>
      <td role="cell" className="flex flex-wrap gap-1 min-w-0 basis-full md:basis-auto">
        {/* A relationship's type and target can share a name (CEJIL's País). */}
        {pills.map((label, i) => (
          <span key={`${i}:${label}`} className="text-meta text-ink-secondary bg-warm px-1.5 py-px rounded-md w-fit truncate max-w-full">
            {label}
          </span>
        ))}
      </td>
      {common ? (
        <>
          <td role="cell" />
          <td role="cell" />
          <td role="cell" />
          <td role="cell" />
        </>
      ) : (
        <>
          {flag(flags?.required, "Required")}
          {flag(flags?.filter, "Filter")}
          {flag(flags?.cards, "Cards")}
          <td role="cell" className="ms-auto md:ms-0 flex justify-end">{move}</td>
        </>
      )}
    </tr>
  );
}

/** The swatch button and its popover: the palette and a hex field. A hex is
 *  applied once it is complete; an incomplete one says so and is kept. */
function ColorPicker({ color, onChange }: { color: string; onChange: (c: string) => void }) {
  const [open, setOpen] = useState(false);
  const [hex, setHex] = useState(color);
  const ref = useRef<HTMLDivElement | null>(null);
  const hexId = useId();
  useEffect(() => setHex(color), [color]);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      e.preventDefault();
      setOpen(false);
    };
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc, true);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc, true);
    };
  }, [open]);
  const invalid = hex !== "" && !HEX.test(hex);
  return (
    <div ref={ref} className="relative pt-1">
      <button
        type="button"
        aria-label="Template color"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 h-8 px-2 rounded-md border border-border bg-paper hover:bg-warm cursor-pointer"
      >
        <span className="w-5 h-5 rounded-md border border-ink/20" style={{ backgroundColor: color }} />
        <span className="text-xs font-mono text-ink-secondary">{color.toUpperCase()}</span>
      </button>
      {open && (
        <div role="dialog" aria-label="Template color" className="absolute z-30 mt-1 w-56 p-2 bg-paper border border-border rounded-md shadow-lg flex flex-col gap-2">
          <div className="grid grid-cols-6 gap-1.5">
            {PALETTE.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Colour ${c}`}
                aria-pressed={color.toLowerCase() === c.toLowerCase()}
                onClick={() => onChange(c)}
                className={`w-7 h-7 rounded-md border border-ink/20 cursor-pointer ${color.toLowerCase() === c.toLowerCase() ? "ring-2 ring-offset-1 ring-ink" : ""}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
          <label htmlFor={hexId} className="text-xs font-medium text-ink-secondary">
            Manually set a color
          </label>
          <input
            id={hexId}
            type="text"
            value={hex}
            aria-invalid={invalid || undefined}
            onChange={(e) => {
              const v = e.target.value.trim();
              setHex(v);
              if (HEX.test(v)) onChange(v);
            }}
            placeholder="#2B8A3E"
            className={`${MODAL_INPUT} font-mono ${invalid ? "border-seal-label" : ""}`}
          />
          <p className="min-h-4 text-meta leading-4 text-seal-label">{invalid ? "A colour is # and six hex digits." : ""}</p>
        </div>
      )}
    </div>
  );
}

/** Uwazi's Add thesaurus modal: a name, unique whatever its case. Creates an
 *  empty thesaurus the property panel can bind. */
function AddThesaurusModal({ corpus, onClose }: { corpus: Corpus; onClose: () => void }) {
  const thesauri = useAtomValue(thesauriAtom(corpus));
  const create = useSetAtom(createThesaurusAtom);
  const { record } = useSettingsNotify();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const clean = name.replace(/\s+/g, " ").trim();
  const save = () => {
    if (thesauri.some((t) => t.name.trim().toLowerCase() === clean.toLowerCase())) return setError("Thesaurus name already exists");
    const created = create({ corpus, name: clean });
    record({ method: "CREATE", domain: "thesaurus", noun: "thesaurus", id: created, name: clean, notice: "thesaurusCreatedInline" });
    onClose();
  };
  return (
    <NameModal title="Add thesaurus" placeholder="Thesaurus name" id={id} name={name} error={error} disabled={!clean} onName={(v) => { setName(v); setError(null); }} onSave={save} onClose={onClose} />
  );
}

/** Uwazi's Add relationship type modal, on the collection's one registry. */
function AddRelationTypeModal({ corpus, onClose }: { corpus: Corpus; onClose: () => void }) {
  const types = useAtomValue(relationTypesOfAtom(relationTypesCorpus(corpus)));
  const save = useSetAtom(saveRelationTypeAtom);
  const { record } = useSettingsNotify();
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const id = useId();
  const clean = name.trim();
  const submit = () => {
    if (types.some((t) => t.label.trim().toLowerCase() === clean.toLowerCase())) return setError("Relationship type name already exists");
    const created = save({ id: null, name: clean, corpus: relationTypesCorpus(corpus) });
    if (!created) return setError("Relationship type name already exists");
    record({ method: "CREATE", domain: "relationType", noun: "relationship type", id: created, name: clean, notice: "relationTypeCreatedInline" });
    onClose();
  };
  return (
    <NameModal title="Add relationship type" placeholder="Relationship type name" id={id} name={name} error={error} disabled={!clean} onName={(v) => { setName(v); setError(null); }} onSave={submit} onClose={onClose} />
  );
}

function NameModal({
  title,
  placeholder,
  id,
  name,
  error,
  disabled,
  onName,
  onSave,
  onClose,
}: {
  title: string;
  placeholder: string;
  id: string;
  name: string;
  error: string | null;
  disabled: boolean;
  onName: (v: string) => void;
  onSave: () => void;
  onClose: () => void;
}) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      size="sm"
      dismissOnScrim={!name}
      footer={
        <SettingsBarContext.Provider value={true}>
          <SettingsButton variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </SettingsButton>
          <SettingsButton variant="commit" size="sm" disabled={disabled} onClick={onSave}>
            Save
          </SettingsButton>
        </SettingsBarContext.Provider>
      }
    >
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (!disabled) onSave();
        }}
      >
        <ModalField label="Name" htmlFor={id}>
          <input
            id={id}
            type="text"
            value={name}
            autoFocus
            placeholder={placeholder}
            aria-invalid={!!error || undefined}
            onChange={(e) => onName(e.target.value)}
            className={MODAL_INPUT}
          />
          <FieldMessage issue={error ? { severity: "error", message: error } : null} reserve />
        </ModalField>
      </form>
    </Modal>
  );
}
