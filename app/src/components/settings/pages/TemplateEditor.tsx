import { useState } from "react";
import { useSetAtom } from "jotai";
import { Plus, GripVertical } from "lucide-react";
import { SettingsContent } from "../SettingsContent";
import { Button } from "../Button";
import { RowActions } from "../RowActions";
import { Field, TextInput } from "../Field";
import { Checkbox } from "../../shared/Checkbox";
import { Select } from "../../shared/Select";
import {
  templatePropertiesByTemplate,
  defaultTemplateProperties,
  propertyTypeLabels,
  seedThesauri,
  seedTemplates,
  seedRelationTypes,
  type SettingsTemplate,
  type TemplateProperty,
} from "../../../data/settings";
import { cejilTemplateProperties } from "../../../data/cejil/settingsAdapt";
import { entityTypes } from "../../../data/entities";
import { toastsAtom } from "../../../atoms/references";

const PALETTE = entityTypes.map((t) => t.color);

const TYPE_OPTIONS = Object.entries(propertyTypeLabels).map(([value, label]) => ({ value, label }));
const THESAURUS_OPTIONS = seedThesauri.map((t) => ({ value: t.name, label: t.name }));
const TEMPLATE_OPTIONS = seedTemplates.map((t) => ({ value: t.name, label: t.name }));
const RELATION_OPTIONS = seedRelationTypes.map((r) => ({ value: r.name, label: r.name }));

/** Per-property type-specific config, held locally (the shared TemplateProperty
 *  type stays scalar). Keyed by property id. */
interface PropConfig {
  content?: string;
  targetTemplate?: string;
  relationType?: string;
}

/** Template detail/editor — name, colour, and the property list. Opened from
 *  the Templates list (list → detail pattern). `onClose` returns to the list. */
export function TemplateEditor({
  template,
  onClose,
}: {
  template: SettingsTemplate | "new";
  onClose: () => void;
}) {
  const setToasts = useSetAtom(toastsAtom);
  const isNew = template === "new";
  const base = isNew ? undefined : template;

  const [name, setName] = useState(base?.name ?? "");
  const [color, setColor] = useState(base?.color ?? PALETTE[0]);
  const [props, setProps] = useState<TemplateProperty[]>(
    isNew
      ? [...defaultTemplateProperties]
      : cejilTemplateProperties[base!.id] ?? templatePropertiesByTemplate[base!.id] ?? defaultTemplateProperties,
  );
  const [config, setConfig] = useState<Record<string, PropConfig>>({});

  const initialColor = base?.color ?? PALETTE[0];
  const initialProps = isNew
    ? defaultTemplateProperties
    : cejilTemplateProperties[base!.id] ?? templatePropertiesByTemplate[base!.id] ?? defaultTemplateProperties;
  const dirty =
    name !== (base?.name ?? "") ||
    color !== initialColor ||
    JSON.stringify(props) !== JSON.stringify(initialProps) ||
    Object.keys(config).length > 0;

  const patchProp = (id: string, patch: Partial<TemplateProperty>) =>
    setProps((prev) => prev.map((p) => (p.id === id ? { ...p, ...patch } : p)));

  const patchConfig = (id: string, patch: Partial<PropConfig>) =>
    setConfig((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }));

  const addProperty = () =>
    setProps((prev) => [
      ...prev,
      { id: `np-${prev.length}-${name.length}`, label: "New property", type: "text", required: false, filterable: false },
    ]);

  const deleteProperty = (id: string) => {
    setProps((prev) => prev.filter((x) => x.id !== id));
    setConfig((prev) => {
      const { [id]: _, ...rest } = prev;
      return rest;
    });
  };

  const save = () => {
    setToasts((p) => [
      ...p,
      { id: Date.now().toString(), message: isNew ? "Template created" : `${name || "Template"} saved`, type: "success" as const },
    ]);
    onClose();
  };

  return (
    <SettingsContent>
      <SettingsContent.Header path={["Templates"]} title={isNew ? "New template" : base!.name} onBack={onClose} />
      <SettingsContent.Body>
        <div className="flex flex-col gap-6">
          <section className="grid sm:grid-cols-2 gap-3">
            <Field label="Template name">
              <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Court Case" />
            </Field>
            <Field label="Colour">
              <div className="flex items-center gap-1.5 flex-wrap pt-1">
                {PALETTE.map((c) => (
                  <button
                    key={c}
                    onClick={() => setColor(c)}
                    aria-label={`Colour ${c}`}
                    className={`w-6 h-6 rounded-md transition-transform ${color === c ? "ring-2 ring-offset-1 ring-ink scale-105" : "hover:scale-105"}`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </Field>
          </section>

          <section className="pt-6" style={{ borderTop: "1px solid var(--border-soft)" }}>
            <div className="flex items-center justify-between gap-2 mb-3">
              <h3 className="text-sm font-semibold text-ink">Properties</h3>
              <Button variant="secondary" size="sm" icon={<Plus size={14} />} onClick={addProperty}>
                Add property
              </Button>
            </div>

            <div className="flex flex-col rounded-md overflow-hidden" style={{ border: "1px solid var(--border-soft)" }}>
              {/* Header row */}
              <div
                className="grid items-center gap-3 px-3 py-2 text-[11px] font-semibold uppercase tracking-wide text-ink-tertiary bg-warm"
                style={{ gridTemplateColumns: "1fr 9rem 6rem 5rem 4rem" }}
              >
                <span>Property</span>
                <span>Type</span>
                <span className="text-center">Required</span>
                <span className="text-center">Filter</span>
                <span />
              </div>

              {props.length === 0 ? (
                <div className="px-3 py-6 text-sm text-ink-muted text-center">No properties yet.</div>
              ) : (
                props.map((p) => {
                  const cfg = config[p.id] ?? {};
                  const needsThesaurus = p.type === "select";
                  const needsRelationship = p.type === "relationship";
                  return (
                    <div key={p.id} className="flex flex-col" style={{ borderTop: "1px solid var(--border-soft)" }}>
                      <div
                        className="grid items-center gap-3 px-3 py-2"
                        style={{ gridTemplateColumns: "1fr 9rem 6rem 5rem 4rem" }}
                      >
                        <div className="flex items-center gap-2 w-full min-w-0">
                          <GripVertical size={14} className="text-ink-muted shrink-0 cursor-grab" />
                          <input
                            value={p.label}
                            onChange={(e) => patchProp(p.id, { label: e.target.value })}
                            className="flex-1 min-w-0 bg-transparent text-sm font-medium text-ink focus:outline-none focus:bg-warm rounded px-1 py-0.5"
                            aria-label="Property label"
                          />
                        </div>
                        <Select
                          value={p.type}
                          options={TYPE_OPTIONS}
                          onChange={(value) => patchProp(p.id, { type: value as TemplateProperty["type"] })}
                          ariaLabel={`${p.label} type`}
                        />
                        <div className="flex justify-center">
                          <Checkbox checked={p.required} onChange={(e) => patchProp(p.id, { required: e.target.checked })} ariaLabel={`${p.label} required`} />
                        </div>
                        <div className="flex justify-center">
                          <Checkbox checked={p.filterable} onChange={(e) => patchProp(p.id, { filterable: e.target.checked })} ariaLabel={`${p.label} filterable`} />
                        </div>
                        <div className="flex justify-end">
                          <RowActions label={p.label} onDelete={() => deleteProperty(p.id)} />
                        </div>
                      </div>

                      {(needsThesaurus || needsRelationship) && (
                        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 px-3 pb-3 ps-8 bg-warm/40">
                          {needsThesaurus && (
                            <label className="flex items-center gap-2 text-xs text-ink-secondary">
                              <span className="font-medium">Thesaurus</span>
                              <Select
                                value={cfg.content ?? THESAURUS_OPTIONS[0].value}
                                options={THESAURUS_OPTIONS}
                                onChange={(value) => patchConfig(p.id, { content: value })}
                                ariaLabel={`${p.label} thesaurus`}
                              />
                            </label>
                          )}
                          {needsRelationship && (
                            <>
                              <label className="flex items-center gap-2 text-xs text-ink-secondary">
                                <span className="font-medium">Related template</span>
                                <Select
                                  value={cfg.targetTemplate ?? TEMPLATE_OPTIONS[0].value}
                                  options={TEMPLATE_OPTIONS}
                                  onChange={(value) => patchConfig(p.id, { targetTemplate: value })}
                                  ariaLabel={`${p.label} related template`}
                                />
                              </label>
                              <label className="flex items-center gap-2 text-xs text-ink-secondary">
                                <span className="font-medium">Relation type</span>
                                <Select
                                  value={cfg.relationType ?? RELATION_OPTIONS[0].value}
                                  options={RELATION_OPTIONS}
                                  onChange={(value) => patchConfig(p.id, { relationType: value })}
                                  ariaLabel={`${p.label} relation type`}
                                />
                              </label>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </section>
        </div>
      </SettingsContent.Body>
      <SettingsContent.Footer>
        <Button variant="ghost" size="sm" onClick={onClose}>
          Cancel
        </Button>
        <Button variant="success" size="sm" disabled={!dirty} onClick={save}>
          {isNew ? "Create template" : "Save"}
        </Button>
      </SettingsContent.Footer>
    </SettingsContent>
  );
}
